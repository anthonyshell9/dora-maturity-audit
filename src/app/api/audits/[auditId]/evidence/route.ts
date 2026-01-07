import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { BlobServiceClient } from '@azure/storage-blob';

const getBlobServiceClient = () => {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('Azure Storage connection string not configured');
  }
  return BlobServiceClient.fromConnectionString(connectionString);
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ auditId: string }> }
) {
  try {
    const { auditId } = await params;

    console.log('Evidence upload started for audit:', auditId);

    const formData = await request.formData();

    // Support both 'file' (single) and 'files' (multiple)
    const files: File[] = [];
    const singleFile = formData.get('file');
    const multipleFiles = formData.getAll('files');

    // Filter to only include actual File objects
    if (singleFile && singleFile instanceof File && singleFile.size > 0) {
      files.push(singleFile);
    }
    for (const f of multipleFiles) {
      if (f instanceof File && f.size > 0) {
        files.push(f);
      }
    }

    console.log('Files received:', files.length, files.map(f => ({ name: f.name, size: f.size, type: f.type })));

    // Support both responseId and questionId
    let responseId = formData.get('responseId') as string | null;
    const questionId = formData.get('questionId') as string | null;

    console.log('IDs:', { responseId, questionId });

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'At least one file is required' },
        { status: 400 }
      );
    }

    if (!responseId && !questionId) {
      return NextResponse.json(
        { error: 'Either responseId or questionId is required' },
        { status: 400 }
      );
    }

    // First verify the audit exists
    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
    });

    if (!audit) {
      return NextResponse.json(
        { error: 'Audit not found' },
        { status: 404 }
      );
    }

    // If questionId provided, find existing response
    if (!responseId && questionId) {
      console.log('Looking for existing response with auditId:', auditId, 'questionId:', questionId);

      const existingResponse = await prisma.response.findFirst({
        where: { auditId, questionId },
      });

      if (!existingResponse) {
        return NextResponse.json(
          { error: 'Please save your response first before uploading evidence files.' },
          { status: 400 }
        );
      }
      responseId = existingResponse.id;
    }

    // Validate file types
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/zip',
    ];

    // Validate all files
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds 10MB limit` },
          { status: 400 }
        );
      }

      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `File type ${file.type} not allowed for ${file.name}` },
          { status: 400 }
        );
      }
    }

    // Verify response belongs to audit
    const response = await prisma.response.findFirst({
      where: { id: responseId!, auditId },
    });

    if (!response) {
      return NextResponse.json(
        { error: 'Response not found in this audit' },
        { status: 404 }
      );
    }

    // Upload to Azure Blob Storage
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient('evidence');

    // Ensure container exists
    await containerClient.createIfNotExists();

    const uploadedEvidences = [];

    for (const file of files) {
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const blobName = `${auditId}/${responseId}/${timestamp}_${sanitizedFileName}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const arrayBuffer = await file.arrayBuffer();
      await blockBlobClient.uploadData(Buffer.from(arrayBuffer), {
        blobHTTPHeaders: { blobContentType: file.type },
      });

      // Create evidence record
      const evidence = await prisma.evidence.create({
        data: {
          responseId: responseId!,
          fileName: file.name,
          fileUrl: blockBlobClient.url,
          fileType: file.type,
          fileSize: file.size,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: 'UPLOAD_EVIDENCE',
          resource: 'Evidence',
          resourceId: evidence.id,
          details: {
            auditId,
            responseId,
            fileName: file.name,
            fileSize: file.size,
          },
        },
      });

      uploadedEvidences.push(evidence);
    }

    return NextResponse.json(
      uploadedEvidences.length === 1 ? uploadedEvidences[0] : uploadedEvidences,
      { status: 201 }
    );
  } catch (error) {
    console.error('Error uploading evidence:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to upload evidence: ${errorMessage}` },
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
    const { searchParams } = new URL(request.url);
    const evidenceId = searchParams.get('evidenceId');

    if (!evidenceId) {
      return NextResponse.json(
        { error: 'Evidence ID is required' },
        { status: 400 }
      );
    }

    // Find evidence and verify it belongs to this audit
    const evidence = await prisma.evidence.findFirst({
      where: {
        id: evidenceId,
        response: { auditId },
      },
    });

    if (!evidence) {
      return NextResponse.json(
        { error: 'Evidence not found' },
        { status: 404 }
      );
    }

    // Delete from Azure Blob Storage
    try {
      const blobServiceClient = getBlobServiceClient();
      const containerClient = blobServiceClient.getContainerClient('evidence');
      const url = new URL(evidence.fileUrl);
      const blobName = url.pathname.split('/evidence/')[1];
      if (blobName) {
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.deleteIfExists();
      }
    } catch (storageError) {
      console.error('Error deleting from storage:', storageError);
    }

    // Delete evidence record
    await prisma.evidence.delete({
      where: { id: evidenceId },
    });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE_EVIDENCE',
        resource: 'Evidence',
        resourceId: evidenceId,
        details: { auditId, fileName: evidence.fileName },
      },
    });

    return NextResponse.json({ message: 'Evidence deleted successfully' });
  } catch (error) {
    console.error('Error deleting evidence:', error);
    return NextResponse.json(
      { error: 'Failed to delete evidence' },
      { status: 500 }
    );
  }
}
