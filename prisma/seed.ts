import { PrismaClient } from '@prisma/client';
import questionsData from './seed-data/questions.json';

const prisma = new PrismaClient();

interface QuestionData {
  chapter: number;
  article: string;
  title: string;
  ref: string;
  question: string;
}

const CHAPTER_INFO: Record<number, { title: string; description: string }> = {
  2: {
    title: 'ICT Risk Management',
    description: 'Requirements for ICT risk management framework, governance, business continuity, backup policies, and communication.',
  },
  3: {
    title: 'ICT-Related Incident Management, Classification and Reporting',
    description: 'Requirements for incident management process, classification, and reporting to competent authorities.',
  },
  4: {
    title: 'Digital Operational Resilience Testing',
    description: 'Requirements for resilience testing programs including threat-led penetration testing.',
  },
  5: {
    title: 'Managing ICT Third-Party Risk',
    description: 'Requirements for managing third-party ICT service providers and contractual arrangements.',
  },
  6: {
    title: 'Information-Sharing Arrangements',
    description: 'Requirements for information sharing on cyber threats among financial entities.',
  },
};

async function main() {
  console.log('Starting database seed...');

  // Create default auditor user
  console.log('Creating default auditor user...');
  await prisma.user.upsert({
    where: { email: 'auditor@dora-audit.local' },
    update: {},
    create: {
      id: 'default-auditor',
      email: 'auditor@dora-audit.local',
      name: 'Default Auditor',
      role: 'AUDITOR',
    },
  });

  // Create chapters
  console.log('Creating chapters...');
  for (const [chapterNum, info] of Object.entries(CHAPTER_INFO)) {
    await prisma.chapter.upsert({
      where: { id: parseInt(chapterNum) },
      update: { title: info.title, description: info.description },
      create: { id: parseInt(chapterNum), title: info.title, description: info.description },
    });
  }

  // Group questions by chapter and article
  const questionsByChapterAndArticle = new Map<string, QuestionData[]>();

  for (const q of questionsData as QuestionData[]) {
    const key = `${q.chapter}-${q.article}`;
    if (!questionsByChapterAndArticle.has(key)) {
      questionsByChapterAndArticle.set(key, []);
    }
    questionsByChapterAndArticle.get(key)!.push(q);
  }

  // Create articles and questions
  console.log('Creating articles and questions...');

  const processedArticles = new Set<string>();

  for (const [key, questions] of questionsByChapterAndArticle) {
    const firstQuestion = questions[0];
    const articleMatch = firstQuestion.article.match(/Article\s+(\d+)/);
    if (!articleMatch) continue;

    const articleNumber = parseInt(articleMatch[1]);
    const articleKey = `${firstQuestion.chapter}-${articleNumber}`;

    if (!processedArticles.has(articleKey)) {
      processedArticles.add(articleKey);

      // Create or update article
      const article = await prisma.article.upsert({
        where: {
          chapterId_number: {
            chapterId: firstQuestion.chapter,
            number: articleNumber,
          },
        },
        update: { title: firstQuestion.title },
        create: {
          chapterId: firstQuestion.chapter,
          number: articleNumber,
          title: firstQuestion.title,
        },
      });

      // Create questions for this article
      for (const q of questions) {
        await prisma.question.upsert({
          where: {
            id: `ch${q.chapter}-art${articleNumber}-${q.ref}`,
          },
          update: {
            text: q.question.trim(),
          },
          create: {
            id: `ch${q.chapter}-art${articleNumber}-${q.ref}`,
            ref: q.ref,
            text: q.question.trim(),
            articleId: article.id,
          },
        });
      }
    }
  }

  // Create a default auditor (required for audit creation)
  console.log('Creating default auditor...');
  await prisma.user.upsert({
    where: { id: 'default-auditor' },
    update: {},
    create: {
      id: 'default-auditor',
      email: 'auditor@dora-audit.local',
      name: 'Default Auditor',
      role: 'AUDITOR',
    },
  });

  // Create a demo admin user
  console.log('Creating demo admin...');
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  // Create a demo organization
  console.log('Creating demo organization...');
  const org = await prisma.organization.upsert({
    where: { id: 'demo-org' },
    update: {},
    create: {
      id: 'demo-org',
      name: 'Demo Financial Services',
      type: 'CREDIT_INSTITUTION',
      description: 'A demo organization for testing DORA compliance',
    },
  });

  console.log('Seed completed successfully!');

  // Print summary
  const chapterCount = await prisma.chapter.count();
  const articleCount = await prisma.article.count();
  const questionCount = await prisma.question.count();

  console.log(`
Summary:
- Chapters: ${chapterCount}
- Articles: ${articleCount}
- Questions: ${questionCount}
- Demo Organization: ${org.name}
  `);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
