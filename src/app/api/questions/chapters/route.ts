import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const chapters = await prisma.chapter.findMany({
      orderBy: { id: 'asc' },
      include: {
        _count: {
          select: { articles: true },
        },
        articles: {
          include: {
            _count: {
              select: { questions: true },
            },
          },
        },
      },
    });

    // Calculate total questions per chapter
    const chaptersWithCounts = chapters.map(chapter => ({
      id: chapter.id,
      title: chapter.title,
      description: chapter.description,
      _count: {
        articles: chapter._count.articles,
        questions: chapter.articles.reduce(
          (sum, article) => sum + article._count.questions,
          0
        ),
      },
    }));

    return NextResponse.json(chaptersWithCounts);
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chapters' },
      { status: 500 }
    );
  }
}
