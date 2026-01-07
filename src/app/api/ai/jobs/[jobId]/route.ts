import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  getAnthropicClient,
  analyzeQuestion,
  generateSimpleEmbedding,
  cosineSimilarity,
} from '@/lib/ai/anthropic';

const BATCH_SIZE = 5; // Process 5 questions at a time

// Get job status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    const job = await prisma.aIAnalysisJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}

// Process next batch of questions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    const job = await prisma.aIAnalysisJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    if (job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED') {
      return NextResponse.json({
        message: 'Job already finished',
        job,
      });
    }

    // Check if Anthropic client is available
    const client = await getAnthropicClient();
    if (!client) {
      await prisma.aIAnalysisJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorMessage: 'AI not configured. Please add your Anthropic API key in Settings.',
        },
      });
      return NextResponse.json(
        { error: 'AI not configured' },
        { status: 400 }
      );
    }

    // Update job to RUNNING if PENDING
    if (job.status === 'PENDING') {
      await prisma.aIAnalysisJob.update({
        where: { id: jobId },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });
    }

    // Get questions that don't have suggestions yet
    const existingSuggestions = await prisma.aISuggestion.findMany({
      where: { auditId: job.auditId },
      select: { questionId: true },
    });
    const existingQuestionIds = new Set(existingSuggestions.map(s => s.questionId));

    // Build question query
    const questionWhere: { article?: { chapterId: number } } = {};
    if (job.chapterId) {
      questionWhere.article = { chapterId: job.chapterId };
    }

    const allQuestions = await prisma.question.findMany({
      where: questionWhere,
      include: {
        article: {
          include: { chapter: true },
        },
      },
    });

    // Filter to questions without suggestions
    const questionsToAnalyze = allQuestions.filter(q => !existingQuestionIds.has(q.id));

    if (questionsToAnalyze.length === 0) {
      // All done!
      const updatedJob = await prisma.aIAnalysisJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
      return NextResponse.json({
        message: 'All questions analyzed',
        job: updatedJob,
        processed: 0,
        remaining: 0,
      });
    }

    // Get next batch
    const batch = questionsToAnalyze.slice(0, BATCH_SIZE);

    // Get all completed document chunks for this organization
    const documents = await prisma.document.findMany({
      where: {
        organizationId: job.organizationId,
        status: 'COMPLETED',
      },
      include: {
        chunks: true,
      },
    });

    if (documents.length === 0) {
      await prisma.aIAnalysisJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorMessage: 'No documents available for analysis',
        },
      });
      return NextResponse.json(
        { error: 'No documents available' },
        { status: 400 }
      );
    }

    const allChunks = documents.flatMap(doc =>
      doc.chunks.map(chunk => ({
        ...chunk,
        documentName: doc.originalName || doc.name,
      }))
    );

    if (allChunks.length === 0) {
      await prisma.aIAnalysisJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorMessage: 'Documents are still being processed',
        },
      });
      return NextResponse.json(
        { error: 'Documents still processing' },
        { status: 400 }
      );
    }

    // Process the batch
    let processedCount = 0;
    let failedCount = 0;

    for (const question of batch) {
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
              auditId: job.auditId,
              questionId: question.id,
              suggestion: 'INSUFFICIENT_INFO',
              confidence: 0,
              reasoning: 'No relevant information found in uploaded documents.',
              sources: [],
            },
          });
          processedCount++;
          continue;
        }

        // Analyze the question
        const analysis = await analyzeQuestion(question.text, rankedChunks);

        if (analysis) {
          await prisma.aISuggestion.create({
            data: {
              auditId: job.auditId,
              questionId: question.id,
              suggestion: analysis.suggestion,
              confidence: analysis.confidence,
              reasoning: analysis.reasoning,
              sources: analysis.sources,
            },
          });
          processedCount++;
        } else {
          failedCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`Error analyzing question ${question.id}:`, error);
        failedCount++;
      }
    }

    // Update job progress
    const newProcessed = job.processedQuestions + processedCount;
    const newFailed = job.failedQuestions + failedCount;
    const remaining = questionsToAnalyze.length - batch.length;

    const updatedJob = await prisma.aIAnalysisJob.update({
      where: { id: jobId },
      data: {
        processedQuestions: newProcessed,
        failedQuestions: newFailed,
        status: remaining === 0 ? 'COMPLETED' : 'RUNNING',
        completedAt: remaining === 0 ? new Date() : undefined,
      },
    });

    return NextResponse.json({
      job: updatedJob,
      processed: processedCount,
      failed: failedCount,
      remaining,
      batchSize: batch.length,
    });
  } catch (error) {
    console.error('Error processing batch:', error);

    // Try to update job status to failed
    try {
      const { jobId } = await params;
      await prisma.aIAnalysisJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    } catch {
      // Ignore
    }

    return NextResponse.json(
      { error: 'Failed to process batch' },
      { status: 500 }
    );
  }
}

// Cancel a job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    const job = await prisma.aIAnalysisJob.update({
      where: { id: jobId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });

    return NextResponse.json(job);
  } catch (error) {
    console.error('Error cancelling job:', error);
    return NextResponse.json(
      { error: 'Failed to cancel job' },
      { status: 500 }
    );
  }
}
