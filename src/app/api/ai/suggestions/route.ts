import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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

    const suggestions = await prisma.aISuggestion.findMany({
      where: { auditId },
      orderBy: { createdAt: 'desc' },
    });

    // Get questions for each suggestion
    const questionIds = suggestions.map(s => s.questionId);
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      include: {
        article: {
          include: { chapter: true },
        },
      },
    });

    const questionsMap = new Map(questions.map(q => [q.id, q]));

    const enrichedSuggestions = suggestions.map(s => ({
      ...s,
      question: questionsMap.get(s.questionId),
    }));

    return NextResponse.json(enrichedSuggestions);
  } catch (error) {
    console.error('Error fetching AI suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI suggestions' },
      { status: 500 }
    );
  }
}
