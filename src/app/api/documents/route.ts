import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadToBlob } from '@/lib/storage/azure-blob';
import { processDocument } from '@/lib/ai/document-processor';

const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB in bytes
const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.ms-excel',
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    const documents = await prisma.document.findMany({
      where: { organizationId },
      orderBy: { uploadedAt: 'desc' },
      include: {
        _count: {
          select: { chunks: true },
        },
      },
    });

    // Convert BigInt to string for JSON serialization
    const serializedDocuments = documents.map(doc => ({
      ...doc,
      fileSize: doc.fileSize.toString(),
    }));

    return NextResponse.json(serializedDocuments);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const organizationId = formData.get('organizationId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 5GB limit' },
        { status: 400 }
      );
    }

    // Validate file type
    const fileType = file.type || getFileTypeFromName(file.name);
    if (!ALLOWED_TYPES.includes(fileType) && !file.name.endsWith('.md') && !file.name.endsWith('.txt')) {
      return NextResponse.json(
        { error: `File type not allowed: ${fileType}. Allowed types: PDF, TXT, MD, DOCX, XLSX` },
        { status: 400 }
      );
    }

    // Check if organization exists
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Upload to Azure Blob Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url, blobName } = await uploadToBlob(
      buffer,
      file.name,
      fileType,
      organizationId
    );

    // Create document record
    const document = await prisma.document.create({
      data: {
        organizationId,
        name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        originalName: file.name,
        fileUrl: url,
        fileType: getSimpleFileType(file.name),
        fileSize: BigInt(file.size),
        status: 'PENDING',
      },
    });

    // Log the upload
    await prisma.auditLog.create({
      data: {
        action: 'UPLOAD_DOCUMENT',
        resource: 'Document',
        resourceId: document.id,
        details: {
          fileName: file.name,
          fileSize: file.size,
          organizationId,
        },
      },
    });

    // Start processing asynchronously
    processDocument(document.id).catch(console.error);

    return NextResponse.json({
      ...document,
      fileSize: document.fileSize.toString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}

function getFileTypeFromName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const typeMap: Record<string, string> = {
    pdf: 'application/pdf',
    txt: 'text/plain',
    md: 'text/markdown',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    doc: 'application/msword',
    xls: 'application/vnd.ms-excel',
  };
  return typeMap[ext || ''] || 'application/octet-stream';
}

function getSimpleFileType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ext || 'unknown';
}
