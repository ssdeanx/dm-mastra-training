import type * as google from 'googleapis'
import type { SetNonNullable, Simplify } from 'type-fest'
import { pruneNullOrUndefinedDeep, type SetRequired } from '@agentic/core'
import { z } from 'zod'
import { createTool } from "@mastra/core/tools";
import { PinoLogger } from '@mastra/loggers';

const logger = new PinoLogger({ name: 'google-docs', level: 'info' });

export type GoogleDocsDocument = Simplify<
  SetNonNullable<google.docs_v1.Schema$Document>
>

/**
 * Simplified Google Docs API client.
 *
 * @see https://developers.google.com/workspace/drive/api
 *
 * @example
 * ```ts
 * import { GoogleDocsClient } from '@agentic/google-docs'
 * import { authenticate } from '@google-cloud/local-auth'
 * import { google } from 'googleapis'
 *
 * // (in a real app, store these auth credentials and reuse them)
 * const auth = await authenticate({
 *   scopes: ['https://www.googleapis.com/auth/documents.readonly'],
 *   keyfilePath: process.env.GOOGLE_CREDENTIALS_PATH
 * })
 * const docs = google.docs({ version: 'v1', auth })
 * const client = new GoogleDocsClient({ docs })
 * ```
 */
export class GoogleDocsClient {
  protected readonly docs: google.docs_v1.Docs

  constructor({ docs }: { docs: google.docs_v1.Docs }) {
    this.docs = docs
  }

  async getDocument(
    args: Simplify<
      SetRequired<google.docs_v1.Params$Resource$Documents$Get, 'documentId'>
    >
  ): Promise<GoogleDocsDocument> {
    const { documentId, ...opts } = args

    const { data } = await this.docs.documents.get({
      ...opts,
      documentId
    })

    return convertDocument(data)
  }
}

function convertDocument(
  data: google.docs_v1.Schema$Document
): GoogleDocsDocument {
  return pruneNullOrUndefinedDeep(data)
}

export function isGoogleDocsDocument(
  value: unknown
): value is GoogleDocsDocument {
  return (
    typeof value === 'object' &&
    value !== null &&
    'documentId' in value &&
    typeof (value as { documentId?: unknown })?.documentId === 'string'
  )
}

export function createGoogleDocsClient(docs: google.docs_v1.Docs) {
  const googleDocs = new GoogleDocsClient({ docs });

  return {
    googleDocsGetDocument: createTool({
      id: "google-docs-get-document",
      description: "Gets a Google Docs document by ID.",
      inputSchema: z.object({ documentId: z.string().describe('The ID of the Google Docs document.') }),
      outputSchema: z.any(), // Define a more specific schema if needed
      execute: async ({ context }) => {
        logger.info('Getting Google Docs document', { documentId: context.documentId });
        try {
          const response = await googleDocs.getDocument(context);
          logger.info('Google Docs document retrieved successfully', { documentId: context.documentId });
          return response;
        } catch (error) {
          logger.error('Google Docs document retrieval failed', { documentId: context.documentId, error: error instanceof Error ? error.message : 'Unknown error' });
          throw new Error(`Google Docs document retrieval failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      },
    }),
  };
}
