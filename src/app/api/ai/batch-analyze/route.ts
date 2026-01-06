import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  getAnthropicClient,
  analyzeQuestion,
  generateSimpleEmbedding,
  cosineSimilarity,
} from '@/lib/ai/anthropic';

export const maxDuration = 300; // 5 minutes for long-running batch analysis

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { auditId, organizationId, chapterId, limit = 10 } = body;

    if (!auditId || !organizationId) {
      return NextResponse.json(
        { error: 'auditId and organizationId are required' },
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

    // Get questions that don't have AI suggestions yet for this audit
    const existingSuggestions = await prisma.aISuggestion.findMany({
      where: { auditId },
      select: { questionId: true },
    });
    const existingQuestionIds = new Set(existingSuggestions.map(s => s.questionId));

    // Build question query
    const questionWhere: { articleId?: string; article?: { chapterId: number } } = {};
    if (chapterId) {
      questionWhere.article = { chapterId: parseInt(chapterId) };
    }

    const allQuestions = await prisma.question.findMany({
      where: questionWhere,
      include: {
        article: {
          include: { chapter: true },
        },
      },
    });

    // Filter to questions without suggestions and limit
    const questionsToAnalyze = allQuestions
      .filter(q => !existingQuestionIds.has(q.id))
      .slice(0, limit);

    if (questionsToAnalyze.length === 0) {
      return NextResponse.json({
        message: 'All questions already have AI suggestions',
        analyzed: 0,
        total: allQuestions.length,
      });
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

    // Analyze each question
    const results: {
      questionId: string;
      success: boolean;
      suggestion?: string;
      confidence?: number;
      error?: string;
    }[] = [];

    for (const question of questionsToAnalyze) {
      try {
        // Find relevant chunks
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
          .slice(0, 5);

        if (rankedChunks.length === 0 || rankedChunks[0].relevanceScore < 0.05) {
          // No relevant info found
          await prisma.aISuggestion.create({
            data: {
              auditId,
              questionId: question.id,
              suggestion: 'INSUFFICIENT_INFO',
              confidence: 0,
              reasoning: 'No relevant information found in uploaded documents.',
              sources: [],
            },
          });
          results.push({
            questionId: question.id,
            success: true,
            suggestion: 'INSUFFICIENT_INFO',
            confidence: 0,
          });
          continue;
        }

        // Analyze the question
        const analysis = await analyzeQuestion(question.text, rankedChunks);

        if (analysis) {
          await prisma.aISuggestion.create({
            data: {
              auditId,
              questionId: question.id,
              suggestion: analysis.suggestion,
              confidence: analysis.confidence,
              reasoning: analysis.reasoning,
              sources: analysis.sources,
            },
          });
          results.push({
            questionId: question.id,
            success: true,
            suggestion: analysis.suggestion,
            confidence: analysis.confidence,
          });
        } else {
          results.push({
            questionId: question.id,
            success: false,
            error: 'Analysis returned null',
          });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error analyzing question ${question.id}:`, error);
        results.push({
          questionId: question.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Log the batch action
    await prisma.auditLog.create({
      data: {
        action: 'AI_BATCH_ANALYZE',
        resource: 'Audit',
        resourceId: auditId,
        details: {
          organizationId,
          chapterId,
          questionsAnalyzed: results.filter(r => r.success).length,
          questionsFailed: results.filter(r => !r.success).length,
        },
      },
    });

    return NextResponse.json({
      analyzed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      total: questionsToAnalyze.length,
      results,
    });
  } catch (error) {
    console.error('Error in batch analysis:', error);
    return NextResponse.json(
      { error: 'Failed to perform batch analysis' },
      { status: 500 }
    );
  }
}
