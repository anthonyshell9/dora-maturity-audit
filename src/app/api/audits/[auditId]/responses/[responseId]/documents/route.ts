import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Get linked documents for a response
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ auditId: string; responseId: string }> }
) {
  try {
    const { auditId, responseId } = await params;

    // Verify response exists and belongs to audit
    const response = await prisma.response.findFirst({
      where: { id: responseId, auditId },
    });

    if (!response) {
      return NextResponse.json(
        { error: 'Response not found' },
        { status: 404 }
      );
    }

    const links = await prisma.responseDocumentLink.findMany({
      where: { responseId },
      include: {
        document: {
          select: {
            id: true,
            name: true,
            originalName: true,
            fileType: true,
            fileUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(links);
  } catch (error) {
    console.error('Error fetching document links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document links' },
      { status: 500 }
    );
  }
}

// Add a document link to a response
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ auditId: string; responseId: string }> }
) {
  try {
    const { auditId, responseId } = await params;
    const body = await request.json();
    const { documentId, relevanceScore, excerpt, status } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      );
    }

    // Verify response exists and belongs to audit
    const response = await prisma.response.findFirst({
      where: { id: responseId, auditId },
    });

    if (!response) {
      return NextResponse.json(
        { error: 'Response not found' },
        { status: 404 }
      );
    }

    // Create or update the link
    const link = await prisma.responseDocumentLink.upsert({
      where: {
        responseId_documentId: {
          responseId,
          documentId,
        },
      },
      update: {
        relevanceScore,
        excerpt,
        status: status || 'approved',
      },
      create: {
        responseId,
        documentId,
        relevanceScore,
        excerpt,
        status: status || 'approved',
      },
      include: {
        document: {
          select: {
            id: true,
            name: true,
            originalName: true,
            fileType: true,
            fileUrl: true,
          },
        },
      },
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error('Error creating document link:', error);
    return NextResponse.json(
      { error: 'Failed to create document link' },
      { status: 500 }
    );
  }
}

// Delete a document link
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ auditId: string; responseId: string }> }
) {
  try {
    const { auditId, responseId } = await params;
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const linkId = searchParams.get('linkId');

    if (!documentId && !linkId) {
      return NextResponse.json(
        { error: 'documentId or linkId is required' },
        { status: 400 }
      );
    }

    // Verify response exists and belongs to audit
    const response = await prisma.response.findFirst({
      where: { id: responseId, auditId },
    });

    if (!response) {
      return NextResponse.json(
        { error: 'Response not found' },
        { status: 404 }
      );
    }

    if (linkId) {
      await prisma.responseDocumentLink.delete({
        where: { id: linkId },
      });
    } else if (documentId) {
      await prisma.responseDocumentLink.delete({
        where: {
          responseId_documentId: {
            responseId,
            documentId,
          },
        },
      });
    }

    return NextResponse.json({ message: 'Document link deleted' });
  } catch (error) {
    console.error('Error deleting document link:', error);
    return NextResponse.json(
      { error: 'Failed to delete document link' },
      { status: 500 }
    );
  }
}
