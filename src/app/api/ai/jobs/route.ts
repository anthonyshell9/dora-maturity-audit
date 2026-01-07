import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Create a new analysis job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { auditId, organizationId, chapterId } = body;

    if (!auditId || !organizationId) {
      return NextResponse.json(
        { error: 'auditId and organizationId are required' },
        { status: 400 }
      );
    }

    // Check for existing running job
    const existingJob = await prisma.aIAnalysisJob.findFirst({
      where: {
        auditId,
        status: { in: ['PENDING', 'RUNNING'] },
      },
    });

    if (existingJob) {
      return NextResponse.json(existingJob);
    }

    // Count questions to analyze
    const questionWhere: { article?: { chapterId: number } } = {};
    if (chapterId) {
      questionWhere.article = { chapterId: parseInt(chapterId) };
    }

    const totalQuestions = await prisma.question.count({
      where: questionWhere,
    });

    // Get existing suggestions count
    const existingSuggestions = await prisma.aISuggestion.count({
      where: { auditId },
    });

    const questionsToAnalyze = Math.max(0, totalQuestions - existingSuggestions);

    // Create the job
    const job = await prisma.aIAnalysisJob.create({
      data: {
        auditId,
        organizationId,
        chapterId: chapterId ? parseInt(chapterId) : null,
        status: 'PENDING',
        totalQuestions: questionsToAnalyze,
        processedQuestions: 0,
        failedQuestions: 0,
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error('Error creating analysis job:', error);
    return NextResponse.json(
      { error: 'Failed to create analysis job' },
      { status: 500 }
    );
  }
}

// Get jobs for an audit
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const auditId = searchParams.get('auditId');

    if (!auditId) {
      return NextResponse.json(
        { error: 'auditId is required' },
        { status: 400 }
      );
    }

    const jobs = await prisma.aIAnalysisJob.findMany({
      where: { auditId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}
