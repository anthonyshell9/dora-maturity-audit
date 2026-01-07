import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const DEFAULT_USER_ID = 'default-auditor';

const createResponseSchema = z.object({
  questionId: z.string().min(1, 'Question ID is required'),
  userId: z.string().optional(),
  answer: z.enum(['YES', 'NO', 'NA', 'NO_ANSWER']),
  notes: z.string().nullable().optional(),
});

const bulkResponseSchema = z.object({
  userId: z.string().optional(),
  responses: z.array(z.object({
    questionId: z.string().min(1),
    answer: z.enum(['YES', 'NO', 'NA', 'NO_ANSWER']),
    notes: z.string().nullable().optional(),
  })),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ auditId: string }> }
) {
  try {
    const { auditId } = await params;

    const responses = await prisma.response.findMany({
      where: { auditId },
      include: {
        question: {
          include: {
            article: {
              include: { chapter: true },
            },
          },
        },
        evidences: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(responses);
  } catch (error) {
    console.error('Error fetching responses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch responses' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ auditId: string }> }
) {
  try {
    const { auditId } = await params;
    const body = await request.json();

    // Check if it's a bulk operation
    if (body.responses) {
      const validatedData = bulkResponseSchema.parse(body);
      const userId = validatedData.userId || DEFAULT_USER_ID;

      const results = await Promise.all(
        validatedData.responses.map(async (r) => {
          return prisma.response.upsert({
            where: {
              auditId_questionId: {
                auditId,
                questionId: r.questionId,
              },
            },
            update: {
              answer: r.answer,
              notes: r.notes,
              userId,
            },
            create: {
              auditId,
              questionId: r.questionId,
              userId,
              answer: r.answer,
              notes: r.notes,
            },
          });
        })
      );

      return NextResponse.json(results, { status: 201 });
    }

    // Single response
    const validatedData = createResponseSchema.parse(body);
    const userId = validatedData.userId || DEFAULT_USER_ID;

    const response = await prisma.response.upsert({
      where: {
        auditId_questionId: {
          auditId,
          questionId: validatedData.questionId,
        },
      },
      update: {
        answer: validatedData.answer,
        notes: validatedData.notes,
        userId,
      },
      create: {
        auditId,
        questionId: validatedData.questionId,
        userId,
        answer: validatedData.answer,
        notes: validatedData.notes,
      },
      include: {
        question: true,
        evidences: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'RESPOND',
        resource: 'Response',
        resourceId: response.id,
        details: {
          auditId,
          questionId: validatedData.questionId,
          answer: validatedData.answer,
        },
      },
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error creating response:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to create response: ${errorMessage}` },
      { status: 500 }
    );
  }
}
