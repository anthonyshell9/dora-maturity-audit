import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum([
    'MICROENTERPRISE',
    'DATA_REPORTING_SERVICE_PROVIDER',
    'CENTRAL_SECURITIES_DEPOSITORY',
    'CENTRAL_COUNTERPARTY',
    'PAYMENT_INSTITUTION_EXEMPTED',
    'INSTITUTION_EXEMPTED_2013_36',
    'ELECTRONIC_MONEY_INSTITUTION_EXEMPTED',
    'SMALL_OCCUPATIONAL_RETIREMENT',
    'SMALL_INTERCONNECTED_INVESTMENT',
    'SIGNIFICANT_CREDIT_INSTITUTION',
    'STANDARD',
  ]),
  description: z.string().optional(),
});

export async function GET() {
  try {
    const organizations = await prisma.organization.findMany({
      include: {
        _count: {
          select: { audits: true, users: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createOrganizationSchema.parse(body);

    const organization = await prisma.organization.create({
      data: validatedData,
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        resource: 'Organization',
        resourceId: organization.id,
        details: { name: organization.name },
      },
    });

    return NextResponse.json(organization, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error creating organization:', error);
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    );
  }
}
