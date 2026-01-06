import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { deleteFromBlob } from '@/lib/storage/azure-blob';
import { processDocument } from '@/lib/ai/document-processor';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        _count: {
          select: { chunks: true },
        },
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...document,
      fileSize: document.fileSize.toString(),
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Delete from blob storage
    try {
      const blobName = document.fileUrl.split('/').slice(-2).join('/');
      await deleteFromBlob(blobName);
    } catch (error) {
      console.error('Error deleting blob:', error);
      // Continue with database deletion even if blob deletion fails
    }

    // Delete document (cascades to chunks)
    await prisma.document.delete({
      where: { id: documentId },
    });

    // Log the deletion
    await prisma.auditLog.create({
      data: {
        action: 'DELETE_DOCUMENT',
        resource: 'Document',
        resourceId: documentId,
        details: {
          fileName: document.originalName,
          organizationId: document.organizationId,
        },
      },
    });

    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}

// Reprocess a document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Reset status and start processing
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'PENDING',
        errorMessage: null,
        processedAt: null,
      },
    });

    // Start processing asynchronously
    processDocument(documentId).catch(console.error);

    return NextResponse.json({
      message: 'Document reprocessing started',
      documentId,
    });
  } catch (error) {
    console.error('Error reprocessing document:', error);
    return NextResponse.json(
      { error: 'Failed to reprocess document' },
      { status: 500 }
    );
  }
}
