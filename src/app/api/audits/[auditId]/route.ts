import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateAuditSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'ARCHIVED']).optional(),
  applicability: z.object({
    microenterprise: z.boolean(),
    dataReportingServiceProvider: z.boolean(),
    centralSecuritiesDepository: z.boolean(),
    centralCounterparty: z.boolean(),
    paymentInstitutionExempted: z.boolean(),
    institutionExempted201336: z.boolean(),
    electronicMoneyInstitutionExempted: z.boolean(),
    smallOccupationalRetirement: z.boolean(),
    smallInterconnectedInvestment: z.boolean(),
    significantCreditInstitution: z.boolean(),
  }).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ auditId: string }> }
) {
  try {
    const { auditId } = await params;

    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
      include: {
        organization: true,
        auditor: {
          select: { id: true, name: true, email: true },
        },
        responses: {
          include: {
            question: {
              include: {
                article: {
                  include: { chapter: true },
                },
              },
            },
            evidences: true,
          },
        },
        reports: true,
      },
    });

    if (!audit) {
      return NextResponse.json(
        { error: 'Audit not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(audit);
  } catch (error) {
    console.error('Error fetching audit:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ auditId: string }> }
) {
  try {
    const { auditId } = await params;
    const body = await request.json();
    const validatedData = updateAuditSchema.parse(body);

    const updateData: Record<string, unknown> = { ...validatedData };
    if (validatedData.status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    const audit = await prisma.audit.update({
      where: { id: auditId },
      data: updateData,
      include: {
        organization: true,
        auditor: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: audit.auditorId,
        action: 'UPDATE',
        resource: 'Audit',
        resourceId: audit.id,
        details: validatedData,
      },
    });

    return NextResponse.json(audit);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating audit:', error);
    return NextResponse.json(
      { error: 'Failed to update audit' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ auditId: string }> }
) {
  try {
    const { auditId } = await params;

    await prisma.audit.delete({
      where: { id: auditId },
    });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        resource: 'Audit',
        resourceId: auditId,
      },
    });

    return NextResponse.json({ message: 'Audit deleted successfully' });
  } catch (error) {
    console.error('Error deleting audit:', error);
    return NextResponse.json(
      { error: 'Failed to delete audit' },
      { status: 500 }
    );
  }
}
