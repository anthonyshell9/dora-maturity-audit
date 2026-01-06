import Anthropic from '@anthropic-ai/sdk';
import prisma from '@/lib/prisma';

let anthropicClient: Anthropic | null = null;

async function getApiKey(): Promise<string | null> {
  try {
    const setting = await prisma.settings.findUnique({
      where: { key: 'anthropic_api_key' },
    });
    return setting?.value || process.env.ANTHROPIC_API_KEY || null;
  } catch {
    return process.env.ANTHROPIC_API_KEY || null;
  }
}

export async function getAnthropicClient(): Promise<Anthropic | null> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return null;
  }

  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey,
    });
  }
  return anthropicClient;
}

export async function resetAnthropicClient(): Promise<void> {
  anthropicClient = null;
}

export interface ChunkResult {
  content: string;
  metadata: {
    pageNumber?: number;
    section?: string;
    startIndex: number;
    endIndex: number;
  };
}

// Chunk text into smaller pieces for processing
export function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): ChunkResult[] {
  const chunks: ChunkResult[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    let chunkEnd = endIndex;

    // Try to break at sentence boundary if not at the end
    if (endIndex < text.length) {
      const lastPeriod = text.lastIndexOf('.', endIndex);
      const lastNewline = text.lastIndexOf('\n', endIndex);
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > startIndex + chunkSize / 2) {
        chunkEnd = breakPoint + 1;
      }
    }

    const content = text.slice(startIndex, chunkEnd).trim();
    if (content.length > 0) {
      chunks.push({
        content,
        metadata: {
          startIndex,
          endIndex: chunkEnd,
        },
      });
    }

    startIndex = chunkEnd - overlap;
    if (startIndex < 0) startIndex = 0;
    if (startIndex >= text.length - overlap) break;
  }

  return chunks;
}

// Generate a simple embedding using Claude to summarize and extract key terms
// This is a fallback when a dedicated embedding service isn't available
export async function generateSimpleEmbedding(text: string): Promise<number[]> {
  // Simple TF-IDF-like embedding based on word frequencies
  // This is a basic approach; for production, use proper embedding models
  const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  const wordFreq: Record<string, number> = {};

  for (const word of words) {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  }

  // Create a fixed-size embedding vector (256 dimensions)
  const embedding = new Array(256).fill(0);

  Object.entries(wordFreq).forEach(([word, freq]) => {
    // Hash the word to an index
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash * 31 + word.charCodeAt(i)) % 256;
    }
    embedding[hash] += freq;
  });

  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
  }

  return embedding;
}

// Calculate cosine similarity between two embeddings
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude > 0 ? dotProduct / magnitude : 0;
}

export interface AnalysisResult {
  suggestion: string;
  confidence: number;
  reasoning: string;
  sources: {
    documentId: string;
    documentName: string;
    chunkContent: string;
    relevanceScore: number;
  }[];
}

// Analyze a DORA question using RAG
export async function analyzeQuestion(
  questionText: string,
  relevantChunks: {
    id: string;
    content: string;
    documentId: string;
    documentName: string;
    relevanceScore: number;
  }[],
  model: string = 'claude-sonnet-4-20250514'
): Promise<AnalysisResult | null> {
  const client = await getAnthropicClient();
  if (!client) {
    return null;
  }

  // Build context from relevant chunks
  const context = relevantChunks
    .map((chunk, i) => `[Source ${i + 1}: ${chunk.documentName}]\n${chunk.content}`)
    .join('\n\n---\n\n');

  const systemPrompt = `You are an expert DORA (Digital Operational Resilience Act) compliance auditor.
Your task is to analyze organizational documents and determine if they address specific DORA requirements.

Based on the provided document excerpts, you must:
1. Determine if the organization appears to comply with the requirement (YES, NO, or PARTIAL)
2. Provide a confidence score (0.0 to 1.0) based on how clearly the documents address this requirement
3. Explain your reasoning with specific references to the source documents
4. If the documents don't contain relevant information, indicate that clearly

Always be precise and cite specific passages from the provided sources.`;

  const userPrompt = `DORA Requirement/Question:
${questionText}

Relevant Document Excerpts:
${context}

Please analyze whether the organization's documentation addresses this DORA requirement. Provide your response in the following JSON format:
{
  "assessment": "YES" | "NO" | "PARTIAL" | "INSUFFICIENT_INFO",
  "confidence": 0.0-1.0,
  "reasoning": "Your detailed explanation with specific citations",
  "key_findings": ["Finding 1", "Finding 2", ...]
}`;

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      system: systemPrompt,
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return null;
    }

    // Parse the JSON response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      suggestion: parsed.assessment,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      sources: relevantChunks.map(chunk => ({
        documentId: chunk.documentId,
        documentName: chunk.documentName,
        chunkContent: chunk.content.substring(0, 200) + '...',
        relevanceScore: chunk.relevanceScore,
      })),
    };
  } catch (error) {
    console.error('Error analyzing question with AI:', error);
    return null;
  }
}

// Batch analyze multiple questions
export async function batchAnalyzeQuestions(
  questions: { id: string; text: string }[],
  organizationId: string,
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, AnalysisResult>> {
  const results = new Map<string, AnalysisResult>();

  // Get all document chunks for this organization
  const documents = await prisma.document.findMany({
    where: {
      organizationId,
      status: 'COMPLETED',
    },
    include: {
      chunks: true,
    },
  });

  if (documents.length === 0) {
    return results;
  }

  // Build a combined chunk list with document names
  const allChunks = documents.flatMap(doc =>
    doc.chunks.map(chunk => ({
      ...chunk,
      documentName: doc.name,
    }))
  );

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];

    // Find relevant chunks using embedding similarity
    const questionEmbedding = await generateSimpleEmbedding(question.text);

    const rankedChunks = allChunks
      .map(chunk => ({
        id: chunk.id,
        content: chunk.content,
        documentId: chunk.documentId,
        documentName: chunk.documentName,
        relevanceScore: cosineSimilarity(questionEmbedding, chunk.embedding),
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5); // Top 5 most relevant chunks

    // Only proceed if we have somewhat relevant chunks
    if (rankedChunks.length > 0 && rankedChunks[0].relevanceScore > 0.1) {
      const analysis = await analyzeQuestion(question.text, rankedChunks);
      if (analysis) {
        results.set(question.id, analysis);
      }
    }

    if (onProgress) {
      onProgress(i + 1, questions.length);
    }
  }

  return results;
}
