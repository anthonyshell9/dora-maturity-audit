import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ auditId: string }> }
) {
  try {
    const { auditId } = await params;

    // Get audit
    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
      include: {
        organization: true,
        auditor: { select: { id: true, name: true, email: true } },
      },
    });

    if (!audit) {
      return NextResponse.json(
        { error: 'Audit not found' },
        { status: 404 }
      );
    }

    // Get all chapters
    const chapters = await prisma.chapter.findMany({
      orderBy: { id: 'asc' },
    });

    // Get response statistics per chapter
    const chapterSummaries = await Promise.all(
      chapters.map(async (chapter) => {
        const questions = await prisma.question.findMany({
          where: {
            article: { chapterId: chapter.id },
          },
          include: {
            responses: {
              where: { auditId },
            },
          },
        });

        const totalQuestions = questions.length;
        let yesCount = 0;
        let noCount = 0;
        let naCount = 0;
        let noAnswerCount = 0;

        questions.forEach((q) => {
          const response = q.responses[0];
          if (!response) {
            noAnswerCount++;
          } else {
            switch (response.answer) {
              case 'YES':
                yesCount++;
                break;
              case 'NO':
                noCount++;
                break;
              case 'NA':
                naCount++;
                break;
              default:
                noAnswerCount++;
            }
          }
        });

        const applicableQuestions = totalQuestions - naCount;
        const compliancePercentage = applicableQuestions > 0
          ? Math.round((yesCount / applicableQuestions) * 100)
          : 0;

        return {
          chapter: chapter.id,
          title: chapter.title,
          totalQuestions,
          yesCount,
          noCount,
          naCount,
          noAnswerCount,
          compliancePercentage,
        };
      })
    );

    // Get article-level breakdown
    const articles = await prisma.article.findMany({
      include: {
        chapter: true,
        questions: {
          include: {
            responses: {
              where: { auditId },
            },
          },
        },
      },
      orderBy: [
        { chapterId: 'asc' },
        { number: 'asc' },
      ],
    });

    const articleSummaries = articles.map((article) => {
      let yesCount = 0;
      let noCount = 0;
      let naCount = 0;
      let noAnswerCount = 0;

      article.questions.forEach((q) => {
        const response = q.responses[0];
        if (!response) {
          noAnswerCount++;
        } else {
          switch (response.answer) {
            case 'YES':
              yesCount++;
              break;
            case 'NO':
              noCount++;
              break;
            case 'NA':
              naCount++;
              break;
            default:
              noAnswerCount++;
          }
        }
      });

      return {
        chapter: article.chapterId,
        articleNumber: article.number,
        title: article.title,
        totalQuestions: article.questions.length,
        yesCount,
        noCount,
        naCount,
        noAnswerCount,
      };
    });

    // Calculate overall statistics
    const totalQuestions = chapterSummaries.reduce((sum, c) => sum + c.totalQuestions, 0);
    const totalYes = chapterSummaries.reduce((sum, c) => sum + c.yesCount, 0);
    const totalNo = chapterSummaries.reduce((sum, c) => sum + c.noCount, 0);
    const totalNA = chapterSummaries.reduce((sum, c) => sum + c.naCount, 0);
    const totalNoAnswer = chapterSummaries.reduce((sum, c) => sum + c.noAnswerCount, 0);
    const applicableTotal = totalQuestions - totalNA;
    const overallCompliance = applicableTotal > 0
      ? Math.round((totalYes / applicableTotal) * 100)
      : 0;

    return NextResponse.json({
      audit: {
        id: audit.id,
        name: audit.name,
        status: audit.status,
        organization: audit.organization,
        auditor: audit.auditor,
        startedAt: audit.startedAt,
        completedAt: audit.completedAt,
      },
      overall: {
        totalQuestions,
        yesCount: totalYes,
        noCount: totalNo,
        naCount: totalNA,
        noAnswerCount: totalNoAnswer,
        compliancePercentage: overallCompliance,
        progressPercentage: Math.round(((totalYes + totalNo + totalNA) / totalQuestions) * 100),
      },
      chapters: chapterSummaries,
      articles: articleSummaries,
    });
  } catch (error) {
    console.error('Error fetching audit summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit summary' },
      { status: 500 }
    );
  }
}
