import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ auditId: string }> }
) {
  try {
    const { auditId } = await params;
    const { searchParams } = new URL(request.url);
    const chapter = searchParams.get('chapter');

    // Get audit with applicability settings
    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
      select: { applicability: true },
    });

    if (!audit) {
      return NextResponse.json(
        { error: 'Audit not found' },
        { status: 404 }
      );
    }

    // Build where clause for questions
    const whereClause: Record<string, unknown> = {};
    if (chapter) {
      whereClause.article = { chapterId: parseInt(chapter) };
    }

    // Get all questions with their responses for this audit
    const questions = await prisma.question.findMany({
      where: whereClause,
      include: {
        article: {
          include: { chapter: true },
        },
        responses: {
          where: { auditId },
          include: {
            evidences: {
              select: {
                id: true,
                fileName: true,
                fileUrl: true,
                fileType: true,
                fileSize: true,
              },
            },
          },
        },
      },
      orderBy: [
        { article: { chapterId: 'asc' } },
        { article: { number: 'asc' } },
        { ref: 'asc' },
      ],
    });

    // Transform to include response data directly
    const transformedQuestions = questions.map((q) => ({
      id: q.id,
      ref: q.ref,
      text: q.text,
      chapter: q.article.chapterId,
      chapterTitle: q.article.chapter.title,
      articleNumber: q.article.number,
      articleTitle: q.article.title,
      applicabilityRules: q.applicabilityRules,
      response: q.responses[0] || null,
    }));

    return NextResponse.json(transformedQuestions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}
