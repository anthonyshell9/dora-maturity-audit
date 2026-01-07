import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';

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

    // Build document query
    interface DocumentWhereInput {
      organizationId: string;
      status: string;
      id?: { in: string[] };
    }

    const documentWhere: DocumentWhereInput = {
      organizationId,
      status: 'COMPLETED',
    };

    // If specific documents are provided, only use those
    if (specificDocumentIds && specificDocumentIds.length > 0) {
      documentWhere.id = { in: specificDocumentIds };
    }

    // Get documents for this organization
    const documents = await prisma.document.findMany({
      where: documentWhere,
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

    // Combine document chunks
    let documentContext = '';

    if (documents.length > 0) {
      documentContext = documents
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

    if (!documentContext) {
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
Your task is to analyze documents and determine if they provide evidence for compliance with specific DORA requirements.

Based on the provided documents, you must:
1. Determine if the organization complies with the requirement (YES, NO, PARTIAL, or INSUFFICIENT_INFO)
2. Provide a confidence score (0.0 to 1.0)
3. Explain your reasoning with specific references to the documents
4. Suggest what evidence description the auditor should write
5. List the specific documents that support your analysis

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

    const userPrompt = `DORA Compliance Question:
${questionText}${contextSection}

Available Documents:
${documentContext.substring(0, 60000)}

Analyze these documents and determine compliance with the question above.`;

    const aiResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: userPrompt,
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
