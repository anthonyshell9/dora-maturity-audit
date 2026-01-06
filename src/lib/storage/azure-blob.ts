import { BlobServiceClient, ContainerClient, BlockBlobClient } from '@azure/storage-blob';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
const containerName = process.env.AZURE_STORAGE_CONTAINER || 'documents';

let blobServiceClient: BlobServiceClient | null = null;
let containerClient: ContainerClient | null = null;

function getBlobServiceClient(): BlobServiceClient {
  if (!blobServiceClient) {
    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is not set');
    }
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  }
  return blobServiceClient;
}

async function getContainerClient(): Promise<ContainerClient> {
  if (!containerClient) {
    const serviceClient = getBlobServiceClient();
    containerClient = serviceClient.getContainerClient(containerName);

    // Create container if it doesn't exist
    const exists = await containerClient.exists();
    if (!exists) {
      await containerClient.create();
    }
  }
  return containerClient;
}

export interface UploadResult {
  url: string;
  blobName: string;
}

export async function uploadToBlob(
  file: Buffer,
  fileName: string,
  contentType: string,
  organizationId: string
): Promise<UploadResult> {
  const container = await getContainerClient();

  // Create a unique blob name with organization prefix
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const blobName = `${organizationId}/${timestamp}-${sanitizedFileName}`;

  const blockBlobClient: BlockBlobClient = container.getBlockBlobClient(blobName);

  await blockBlobClient.upload(file, file.length, {
    blobHTTPHeaders: {
      blobContentType: contentType,
    },
  });

  return {
    url: blockBlobClient.url,
    blobName,
  };
}

export async function deleteFromBlob(blobName: string): Promise<void> {
  const container = await getContainerClient();
  const blockBlobClient = container.getBlockBlobClient(blobName);
  await blockBlobClient.deleteIfExists();
}

export async function getBlobUrl(blobName: string): Promise<string> {
  const container = await getContainerClient();
  const blockBlobClient = container.getBlockBlobClient(blobName);
  return blockBlobClient.url;
}

export async function downloadBlob(blobName: string): Promise<Buffer> {
  const container = await getContainerClient();
  const blockBlobClient = container.getBlockBlobClient(blobName);
  const downloadResponse = await blockBlobClient.download();

  const chunks: Buffer[] = [];
  if (downloadResponse.readableStreamBody) {
    for await (const chunk of downloadResponse.readableStreamBody) {
      chunks.push(Buffer.from(chunk));
    }
  }

  return Buffer.concat(chunks);
}
