import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';
import { isImageType } from '@/lib/ai/document-processor';
import { downloadBlob } from '@/lib/storage/azure-blob';

// Image types for Claude Vision
const IMAGE_MEDIA_TYPES: Record<string, 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'> = {
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'image/png': 'image/png',
  'image/jpeg': 'image/jpeg',
  'image/gif': 'image/gif',
  'image/webp': 'image/webp',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      auditId,
      questionId,
      questionText,
      organizationId,
      additionalContext,
      specificDocumentIds
    } = body;

    if (!auditId || !questionId || !questionText) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get API key from settings
    const apiKeySetting = await prisma.settings.findUnique({
      where: { key: 'anthropic_api_key' },
    });

    if (!apiKeySetting?.value) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured. Please add it in Settings.' },
        { status: 400 }
      );
    }

    // Get documents for this organization
    const documents = await prisma.document.findMany({
      where: {
        organizationId,
        status: 'COMPLETED',
        ...(specificDocumentIds && specificDocumentIds.length > 0
          ? { id: { in: specificDocumentIds } }
          : {}),
      },
      include: {
        chunks: {
          take: 30, // More chunks for better context
          orderBy: { chunkIndex: 'asc' },
        },
      },
    });

    // Get evidence files for this specific question in this audit
    const existingResponse = await prisma.response.findFirst({
      where: {
        auditId,
        questionId,
      },
      include: {
        evidences: true,
      },
    });

    // Separate text documents from image documents
    const textDocuments = documents.filter(doc => !isImageType(doc.fileType));
    const imageDocuments = documents.filter(doc => isImageType(doc.fileType));

    // Combine text document chunks
    let documentContext = '';

    if (textDocuments.length > 0) {
      documentContext = textDocuments
        .flatMap((doc) =>
          doc.chunks.map((chunk) => `[From ${doc.originalName || doc.name}]:\n${chunk.content}`)
        )
        .join('\n\n---\n\n');
    }

    // Add evidence descriptions if available
    if (existingResponse?.evidences?.length) {
      documentContext += '\n\n--- Evidence Files ---\n';
      existingResponse.evidences.forEach((ev) => {
        documentContext += `- ${ev.fileName}\n`;
      });
    }

    // Check if we have any content (text or images)
    if (!documentContext && imageDocuments.length === 0) {
      return NextResponse.json({
        suggestion: 'INSUFFICIENT_INFO',
        confidence: 0,
        reasoning: 'No documents have been uploaded for this organization. Please upload relevant documents to enable AI analysis.',
        sources: [],
      });
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: apiKeySetting.value,
    });

    // Create the prompt with additional context if provided
    const contextSection = additionalContext
      ? `\n\nAdditional context from the auditor (use this to guide your analysis):\n${additionalContext}`
      : '';

    const systemPrompt = `You are a DORA (Digital Operational Resilience Act) compliance expert.
Your task is to analyze documents (including images) and determine if they provide evidence for compliance with specific DORA requirements.

Based on the provided documents and images, you must:
1. Determine if the organization complies with the requirement (YES, NO, PARTIAL, or INSUFFICIENT_INFO)
2. Provide a confidence score (0.0 to 1.0)
3. Explain your reasoning with specific references to the documents
4. Suggest what evidence description the auditor should write
5. List the specific documents that support your analysis

For images, analyze any visible text, diagrams, charts, policies, or relevant visual information.

Respond in JSON format:
{
  "suggestion": "YES" | "NO" | "PARTIAL" | "INSUFFICIENT_INFO",
  "confidence": 0.0-1.0,
  "reasoning": "Your detailed explanation with document references",
  "evidenceDescription": "Suggested description for the evidence field",
  "sources": [
    {
      "documentName": "name of document",
      "documentId": "id if available",
      "relevanceScore": 0.0-1.0,
      "excerpt": "relevant excerpt (max 200 chars)"
    }
  ]
}`;

    // Build the message content with text and images
    const messageContent: Anthropic.MessageCreateParams['messages'][0]['content'] = [];

    // Add text content first
    let textPrompt = `DORA Compliance Question:\n${questionText}${contextSection}\n\n`;

    if (documentContext) {
      textPrompt += `Available Text Documents:\n${documentContext.substring(0, 50000)}\n\n`;
    }

    if (imageDocuments.length > 0) {
      textPrompt += `The following ${imageDocuments.length} image(s) are also provided for analysis:\n`;
      imageDocuments.forEach((doc, idx) => {
        textPrompt += `- Image ${idx + 1}: ${doc.originalName || doc.name}\n`;
      });
      textPrompt += '\n';
    }

    textPrompt += 'Analyze all provided documents and images to determine compliance with the question above.';

    messageContent.push({ type: 'text', text: textPrompt });

    // Add images (limit to 5 images to avoid token limits)
    const imagesToProcess = imageDocuments.slice(0, 5);
    for (const imageDoc of imagesToProcess) {
      try {
        // Download image from blob storage
        const blobName = imageDoc.fileUrl.split('/').slice(-2).join('/');
        const imageBuffer = await downloadBlob(blobName);
        const base64Image = imageBuffer.toString('base64');

        // Determine media type
        const mediaType = IMAGE_MEDIA_TYPES[imageDoc.fileType.toLowerCase()] || 'image/jpeg';

        messageContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64Image,
          },
        });

        messageContent.push({
          type: 'text',
          text: `[Above image: ${imageDoc.originalName || imageDoc.name}]`,
        });
      } catch (error) {
        console.error(`Error loading image ${imageDoc.id}:`, error);
        // Continue with other images if one fails
      }
    }

    const aiResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: messageContent,
        },
      ],
      system: systemPrompt,
    });

    // Parse the response
    const responseText = aiResponse.content[0].type === 'text'
      ? aiResponse.content[0].text
      : '';

    // Try to parse JSON from response
    let parsedResponse;
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch {
      // If parsing fails, create a structured response from the text
      parsedResponse = {
        suggestion: 'INSUFFICIENT_INFO',
        confidence: 0.5,
        reasoning: responseText,
        evidenceDescription: '',
        sources: [],
      };
    }

    // Ensure sources is an array with document info
    const sources = parsedResponse.sources || documents.map((d) => ({
      documentName: d.originalName || d.name,
      documentId: d.id,
      relevanceScore: 0.7,
    }));

    // Save suggestion to database
    await prisma.aISuggestion.upsert({
      where: {
        auditId_questionId: {
          auditId,
          questionId,
        },
      },
      update: {
        suggestion: parsedResponse.suggestion,
        confidence: parsedResponse.confidence,
        reasoning: parsedResponse.reasoning,
        sources: sources,
        status: 'PENDING',
        reviewedAt: null,
      },
      create: {
        auditId,
        questionId,
        suggestion: parsedResponse.suggestion,
        confidence: parsedResponse.confidence,
        reasoning: parsedResponse.reasoning,
        sources: sources,
      },
    });

    // Log the analysis
    await prisma.auditLog.create({
      data: {
        action: 'AI_ANALYZE_QUESTION',
        resource: 'Question',
        resourceId: questionId,
        details: {
          auditId,
          additionalContext: additionalContext || null,
          specificDocumentIds: specificDocumentIds || null,
          suggestion: parsedResponse.suggestion,
          confidence: parsedResponse.confidence,
        },
      },
    });

    return NextResponse.json({
      suggestion: parsedResponse.suggestion,
      confidence: parsedResponse.confidence,
      reasoning: parsedResponse.reasoning,
      evidenceDescription: parsedResponse.evidenceDescription || '',
      sources: sources,
    });
  } catch (error) {
    console.error('Error analyzing question:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze question' },
      { status: 500 }
    );
  }
}
