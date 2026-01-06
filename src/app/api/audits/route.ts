import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const createAuditSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  organizationId: z.string().min(1, 'Organization is required'),
  auditorId: z.string().min(1, 'Auditor is required'),
  applicability: z.object({
    microenterprise: z.boolean().default(false),
    dataReportingServiceProvider: z.boolean().default(false),
    centralSecuritiesDepository: z.boolean().default(false),
    centralCounterparty: z.boolean().default(false),
    paymentInstitutionExempted: z.boolean().default(false),
    institutionExempted201336: z.boolean().default(false),
    electronicMoneyInstitutionExempted: z.boolean().default(false),
    smallOccupationalRetirement: z.boolean().default(false),
    smallInterconnectedInvestment: z.boolean().default(false),
    significantCreditInstitution: z.boolean().default(false),
  }),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (organizationId) where.organizationId = organizationId;
    if (status) where.status = status;

    const audits = await prisma.audit.findMany({
      where,
      include: {
        organization: true,
        auditor: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { responses: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(audits);
  } catch (error) {
    console.error('Error fetching audits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audits' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createAuditSchema.parse(body);

    const audit = await prisma.audit.create({
      data: {
        name: validatedData.name,
        organizationId: validatedData.organizationId,
        auditorId: validatedData.auditorId,
        applicability: validatedData.applicability,
      },
      include: {
        organization: true,
        auditor: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Log audit creation
    await prisma.auditLog.create({
      data: {
        userId: validatedData.auditorId,
        action: 'CREATE',
        resource: 'Audit',
        resourceId: audit.id,
        details: { name: audit.name },
      },
    });

    return NextResponse.json(audit, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating audit:', error);
    return NextResponse.json(
      { error: 'Failed to create audit' },
      { status: 500 }
    );
  }
}
