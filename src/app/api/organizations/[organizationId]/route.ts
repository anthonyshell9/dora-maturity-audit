import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const updateOrganizationSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum([
    'CREDIT_INSTITUTION',
    'PAYMENT_INSTITUTION',
    'ELECTRONIC_MONEY_INSTITUTION',
    'INVESTMENT_FIRM',
    'CRYPTO_ASSET_SERVICE_PROVIDER',
    'INSURANCE_UNDERTAKING',
    'REINSURANCE_UNDERTAKING',
    'PENSION_FUND',
    'UCITS_MANAGEMENT_COMPANY',
    'AIFM',
    'DATA_REPORTING_SERVICE_PROVIDER',
    'CENTRAL_SECURITIES_DEPOSITORY',
    'CENTRAL_COUNTERPARTY',
    'TRADING_VENUE',
    'CREDIT_RATING_AGENCY',
    'CROWDFUNDING_SERVICE_PROVIDER',
    'SECURITISATION_REPOSITORY',
    'ICT_THIRD_PARTY_SERVICE_PROVIDER',
    'OTHER',
  ]).optional(),
  description: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  try {
    const { organizationId } = await params;

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: { audits: true, users: true },
        },
        audits: {
          select: {
            id: true,
            name: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  try {
    const { organizationId } = await params;
    const body = await request.json();
    const validatedData = updateOrganizationSchema.parse(body);

    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: validatedData,
      include: {
        _count: {
          select: { audits: true, users: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        resource: 'Organization',
        resourceId: organization.id,
        details: validatedData,
      },
    });

    return NextResponse.json(organization);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating organization:', error);
    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  try {
    const { organizationId } = await params;

    // Check if organization has audits
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: { select: { audits: true } },
      },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Delete associated audits first (cascade)
    if (org._count.audits > 0) {
      await prisma.audit.deleteMany({
        where: { organizationId },
      });
    }

    await prisma.organization.delete({
      where: { id: organizationId },
    });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        resource: 'Organization',
        resourceId: organizationId,
        details: { name: org.name },
      },
    });

    return NextResponse.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    console.error('Error deleting organization:', error);
    return NextResponse.json(
      { error: 'Failed to delete organization' },
      { status: 500 }
    );
  }
}
