import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chapter = searchParams.get('chapter');
    const article = searchParams.get('article');

    const where: Record<string, unknown> = {};
    if (chapter) {
      where.article = { chapterId: parseInt(chapter) };
    }
    if (article) {
      where.articleId = article;
    }

    const questions = await prisma.question.findMany({
      where,
      include: {
        article: {
          include: { chapter: true },
        },
      },
      orderBy: [
        { article: { chapterId: 'asc' } },
        { article: { number: 'asc' } },
        { ref: 'asc' },
      ],
    });

    return NextResponse.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}
