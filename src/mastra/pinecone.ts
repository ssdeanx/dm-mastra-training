import { PineconeVector } from '@mastra/pinecone';
import { z } from 'zod';
import {createGeminiEmbeddingModel} from './config/googleProvider';
import type { MastraVector } from '@mastra/core';


/**
 * @const {object} pineconeEnvSchema
 * @description The Zod schema for the Pinecone environment variables.
 * @property {string} PINECONE_API_KEY - The Pinecone API key.
 * @property {string} PINECONE_ENVIRONMENT - The Pinecone environment.
 */
const pineconeEnvSchema = z.object({
  PINECONE_API_KEY: z.string().min(1, 'Pinecone API key is required'),
  PINECONE_ENVIRONMENT: z.string().min(1, 'Pinecone environment is required'),
});

/**
 * @const {SafeParseReturnType} validatedEnv
 * @description The validated Pinecone environment variables.
 */
const validatedEnv = pineconeEnvSchema.safeParse(process.env);

if (!validatedEnv.success) {
  throw new Error(
    `Missing Pinecone environment variables: ${validatedEnv.error.issues
      .map((issue) => issue.message)
      .join(', ')}`,
  );
}

/**
 * @const {MastraVector<VectorFilter>} pinecone
 * @description The PineconeVector instance cast to MastraVector<VectorFilter> for Memory compatibility.
 */
export const pinecone: MastraVector = new PineconeVector({
  apiKey: validatedEnv.data.PINECONE_API_KEY,
  environment: validatedEnv.data.PINECONE_ENVIRONMENT,
}) as unknown as MastraVector;

// Duplicate pinecone declaration removed; using the MastraVector export above.

async function initializePinecone() {
  await pinecone.createIndex({
    indexName: "training",
    metric: "cosine",
    dimension: 768,
  });

  // Example: Define chunks as an array of objects with 'text' and 'id' properties
  const chunks = [
    { 
      id: '1', 
      text: 'Example text 1',
      source: 'source1',
      category: 'category1',
      language: 'en',
      author: 'author1',
      score: 0.95
    },
    { 
      id: '2', 
      text: 'Example text 2',
      source: 'source2',
      category: 'category2',
      language: 'en',
      author: 'author2',
      score: 0.92
    },
    // Add more chunks as needed
  ];

  // Define embedMany here if not exported from googleProvider
  async function embedMany({ model, values }: { model: ReturnType<typeof createGeminiEmbeddingModel>, values: string[] }) {
    // Assuming model.doEmbed exists and returns { embeddings: number[][] }
    return await model.doEmbed({ values });
  }

  const embedder = createGeminiEmbeddingModel('models/text-embedding-004', { outputDimensionality: 768, taskType: 'CLUSTERING' });
  const { embeddings: vectors } = await embedMany({
    model: embedder,
    values: chunks.map(chunk => chunk.text)
  });

  // Store embeddings with their corresponding metadata
  await pinecone.upsert({
    indexName: "pineconeIndex",
    vectors,
    metadata: chunks.map((chunk) => ({
      text: chunk.text,
      id: chunk.id,
    })),
  });

  // Store embeddings with rich metadata for better organization and filtering
  await pinecone.upsert({
    indexName: "training",
    vectors,
    metadata: chunks.map((chunk) => ({
      text: chunk.text,
      id: chunk.id,
      source: chunk.source,
      category: chunk.category,
      createdAt: new Date().toISOString(),
      version: "1.0",
      language: chunk.language,
      author: chunk.author,
      confidenceScore: chunk.score,
    })),
  });
}

initializePinecone().catch((error) => {
  console.error("Failed to initialize Pinecone vector store:", error);
});