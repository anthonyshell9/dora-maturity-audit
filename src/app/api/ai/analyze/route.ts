import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  getAnthropicClient,
  analyzeQuestion,
  generateSimpleEmbedding,
  cosineSimilarity,
} from '@/lib/ai/anthropic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { auditId, questionId, organizationId } = body;

    if (!questionId || !organizationId) {
      return NextResponse.json(
        { error: 'questionId and organizationId are required' },
        { status: 400 }
      );
    }

    // Check if Anthropic client is available
    const client = await getAnthropicClient();
    if (!client) {
      return NextResponse.json(
        { error: 'AI not configured. Please add your Anthropic API key in Settings.' },
        { status: 400 }
      );
    }

    // Get the question
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        article: {
          include: { chapter: true },
        },
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Get all completed document chunks for this organization
    const documents = await prisma.document.findMany({
      where: {
        organizationId,
        status: 'COMPLETED',
      },
      include: {
        chunks: true,
      },
    });

    if (documents.length === 0) {
      return NextResponse.json(
        { error: 'No documents available for analysis. Please upload documents first.' },
        { status: 400 }
      );
    }

    // Build a combined chunk list with document names
    const allChunks = documents.flatMap(doc =>
      doc.chunks.map(chunk => ({
        ...chunk,
        documentName: doc.name,
      }))
    );

    if (allChunks.length === 0) {
      return NextResponse.json(
        { error: 'Documents are still being processed. Please wait and try again.' },
        { status: 400 }
      );
    }

    // Find relevant chunks using embedding similarity
    const questionEmbedding = await generateSimpleEmbedding(question.text);

    const rankedChunks = allChunks
      .map(chunk => ({
        id: chunk.id,
        content: chunk.content,
        documentId: chunk.documentId,
        documentName: chunk.documentName,
        relevanceScore: cosineSimilarity(questionEmbedding, chunk.embedding),
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5); // Top 5 most relevant chunks

    // Check if we have relevant chunks
    if (rankedChunks.length === 0 || rankedChunks[0].relevanceScore < 0.05) {
      return NextResponse.json({
        suggestion: 'INSUFFICIENT_INFO',
        confidence: 0,
        reasoning: 'No relevant information found in the uploaded documents for this question.',
        sources: [],
      });
    }

    // Analyze the question
    const analysis = await analyzeQuestion(question.text, rankedChunks);

    if (!analysis) {
      return NextResponse.json(
        { error: 'AI analysis failed. Please try again.' },
        { status: 500 }
      );
    }

    // Save the suggestion if auditId is provided
    if (auditId) {
      await prisma.aISuggestion.upsert({
        where: {
          auditId_questionId: {
            auditId,
            questionId,
          },
        },
        update: {
          suggestion: analysis.suggestion,
          confidence: analysis.confidence,
          reasoning: analysis.reasoning,
          sources: analysis.sources,
          status: 'PENDING',
          createdAt: new Date(),
        },
        create: {
          auditId,
          questionId,
          suggestion: analysis.suggestion,
          confidence: analysis.confidence,
          reasoning: analysis.reasoning,
          sources: analysis.sources,
        },
      });
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'AI_ANALYZE_QUESTION',
        resource: 'Question',
        resourceId: questionId,
        details: {
          auditId,
          organizationId,
          confidence: analysis.confidence,
          chunksAnalyzed: rankedChunks.length,
        },
      },
    });

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error analyzing question:', error);
    return NextResponse.json(
      { error: 'Failed to analyze question' },
      { status: 500 }
    );
  }
}
