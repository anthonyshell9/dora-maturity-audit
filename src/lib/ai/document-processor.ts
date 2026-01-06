import prisma from '@/lib/prisma';
import { chunkText, generateSimpleEmbedding } from './anthropic';
import pdf from 'pdf-parse';

// Extract text from different file types
export async function extractText(buffer: Buffer, fileType: string): Promise<string> {
  const type = fileType.toLowerCase();

  if (type === 'pdf' || type === 'application/pdf') {
    return extractPdfText(buffer);
  }

  if (type === 'txt' || type === 'text/plain') {
    return buffer.toString('utf-8');
  }

  if (type === 'md' || type === 'text/markdown') {
    return buffer.toString('utf-8');
  }

  // For other types, try to read as text
  // In production, you would add support for DOCX, XLSX, etc.
  try {
    return buffer.toString('utf-8');
  } catch {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

// Process a document: extract text, chunk it, and generate embeddings
export async function processDocument(documentId: string): Promise<void> {
  // Update status to processing
  await prisma.document.update({
    where: { id: documentId },
    data: { status: 'PROCESSING' },
  });

  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Download the file from blob storage
    const { downloadBlob } = await import('@/lib/storage/azure-blob');
    const blobName = document.fileUrl.split('/').slice(-2).join('/');
    const buffer = await downloadBlob(blobName);

    // Extract text
    const text = await extractText(buffer, document.fileType);

    if (!text || text.trim().length === 0) {
      throw new Error('No text content found in document');
    }

    // Chunk the text
    const chunks = chunkText(text, 1500, 200);

    // Delete existing chunks for this document
    await prisma.documentChunk.deleteMany({
      where: { documentId },
    });

    // Create new chunks with embeddings
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await generateSimpleEmbedding(chunk.content);

      await prisma.documentChunk.create({
        data: {
          documentId,
          content: chunk.content,
          metadata: chunk.metadata,
          embedding,
          chunkIndex: i,
        },
      });
    }

    // Update document status to completed
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'PROCESS_DOCUMENT',
        resource: 'Document',
        resourceId: documentId,
        details: {
          chunksCreated: chunks.length,
          textLength: text.length,
        },
      },
    });
  } catch (error) {
    console.error('Error processing document:', error);

    // Update document status to error
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
}

// Get document processing statistics
export async function getDocumentStats(organizationId: string) {
  const documents = await prisma.document.findMany({
    where: { organizationId },
    select: {
      status: true,
      fileSize: true,
    },
  });

  const stats = {
    total: documents.length,
    pending: documents.filter(d => d.status === 'PENDING').length,
    processing: documents.filter(d => d.status === 'PROCESSING').length,
    completed: documents.filter(d => d.status === 'COMPLETED').length,
    error: documents.filter(d => d.status === 'ERROR').length,
    totalSize: documents.reduce((sum, d) => sum + Number(d.fileSize), 0),
  };

  return stats;
}
