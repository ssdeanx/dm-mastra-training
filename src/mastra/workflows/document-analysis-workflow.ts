import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { dataAgent, analyzerAgent } from '../agents';
import { PinoLogger } from '@mastra/loggers';
import { RuntimeContext } from '@mastra/core/runtime-context';
import { dataAgentOutputSchema } from '../agents/data-agent'; // Import dataAgentOutputSchema
import { analyzerAgentOutputSchema } from '../agents/analyzer-agent'; // Import analyzerAgentOutputSchema

const logger = new PinoLogger({ name: 'DocumentAnalysisWorkflow', level: 'info' });

// Input schema for the document analysis workflow
const documentAnalysisInputSchema = z.object({
  documentContent: z.string().optional().describe('The content of the document to analyze.'),
  documentPath: z.string().optional().describe('The path to the document file to analyze (e.g., "reports/my_report.txt").'),
}).refine(data => data.documentContent || data.documentPath, {
  message: "Either 'documentContent' or 'documentPath' must be provided.",
});

// Output schema for the document analysis workflow
const documentAnalysisOutputSchema = z.object({
  originalInput: z.string().describe('The original query or document path.'),
  analysisSummary: z.string().describe('A concise summary of the document analysis.'),
  keyInsights: z.array(z.string()).describe('Key insights extracted from the document.'),
  analysisDetails: z.string().optional().describe('Detailed analysis report.'),
});

/**
 * Step 1: Read Document Content
 * If a documentPath is provided, use dataAgent to read the file.
 * Otherwise, use the provided documentContent directly.
 */
const readDocumentStep = createStep({
  id: 'read-document-content',
  description: 'Reads document content from a file path or uses provided content.',
  inputSchema: documentAnalysisInputSchema,
  outputSchema: z.object({
    content: z.string(),
    source: z.string(),
  }),
  execute: async ({ inputData }) => {
    if (inputData.documentPath) {
      logger.info(`Reading document from path: ${inputData.documentPath}`);
      const dataRuntimeContext = new RuntimeContext();
      dataRuntimeContext.set("mode", "read");
      const { object: resultObject } = await dataAgent.generate(
        `Read the file named "${inputData.documentPath}" from the "data/" directory.`,
        { runtimeContext: dataRuntimeContext, output: dataAgentOutputSchema } // Request structured output
      );

      if (!resultObject.success || resultObject.error) {
        throw new Error(`Failed to read document from path: ${inputData.documentPath}. Error: ${resultObject.error || resultObject.message}`);
      }
      const content = resultObject.data;
      if (typeof content !== 'string') {
        throw new Error(`Unexpected data format from dataAgent. Expected string, got ${typeof content}`);
      }
      return { content, source: inputData.documentPath };
    } else if (inputData.documentContent) {
      logger.info('Using provided document content directly.');
      return { content: inputData.documentContent, source: 'Direct Input' };
    }
    throw new Error('No document content or path provided.');
  },
});

/**
 * Step 2: Analyze Document Content using Analyzer Agent
 */
const analyzeDocumentStep = createStep({
  id: 'analyze-document-content',
  description: 'Analyzes the document content using the Analyzer Agent.',
  inputSchema: z.object({
    content: z.string(),
    source: z.string(),
  }),
  outputSchema: analyzerAgentOutputSchema, // Use structured output schema
  execute: async ({ inputData }) => {
    logger.info(`Analyzing document from source: ${inputData.source}`);
    const analyzerRuntimeContext = new RuntimeContext();
    analyzerRuntimeContext.set("analysis-type", "detailed");
    analyzerRuntimeContext.set("data-source", "internal"); // Assuming content is now internal

    const { object: analysisResultObject } = await analyzerAgent.generate(
      `Perform a detailed analysis of the following document content. Identify key themes, main arguments, and any significant data points. Provide a comprehensive analysis report under the key 'analysis' and extract key insights as a JSON array of strings under the key 'keyInsights'.\n\nDocument Content:\n${inputData.content}\n\nReturn a JSON object with 'analysis' and 'keyInsights'.`,
      { runtimeContext: analyzerRuntimeContext, output: analyzerAgentOutputSchema } // Request structured output
    );
    return {
      analysis: analysisResultObject.analysis,
      visualizations: analysisResultObject.visualizations,
      recommendations: analysisResultObject.recommendations,
      toolsUsed: analysisResultObject.toolsUsed,
      requestId: analysisResultObject.requestId,
      timestamp: analysisResultObject.timestamp,
    };
  },
});

/**
 * Step 3: Summarize and Extract Key Insights
 */
const summarizeInsightsStep = createStep({
  id: 'summarize-insights',
  description: 'Generates a concise summary and extracts key insights from the analysis report.',
  inputSchema: z.object({
    analysisReport: z.string(),
    insights: z.array(z.string()),
    originalInput: z.string(), // Passed from initial input
  }),
  outputSchema: documentAnalysisOutputSchema,
  execute: async ({ inputData }) => {
    logger.info('Summarizing analysis and extracting key insights.');
    const { analysisReport, insights, originalInput } = inputData;

    // Define a specific output schema for this step's interaction with analyzerAgent
    const summaryOutputSchema = z.object({
      conciseSummary: z.string().describe('A concise summary of the document analysis.'),
      refinedKeyInsights: z.array(z.string()).describe('Refined key insights extracted as an array of strings.'),
    });

    const { object: summaryResultObject } = await analyzerAgent.generate(
      `Based on the following detailed analysis report and extracted insights, provide a concise summary (2-3 paragraphs) under the key 'conciseSummary' and a refined list of the top 5-7 key insights as a JSON array of strings under the key 'refinedKeyInsights'.\n\nAnalysis Report:\n${analysisReport}\n\nExtracted Insights:\n${insights.join('\n')}\n\nReturn a JSON object with 'conciseSummary' and 'refinedKeyInsights'.`,
      { output: summaryOutputSchema } // Request structured output
    );

    return {
      originalInput,
      analysisSummary: summaryResultObject.conciseSummary,
      keyInsights: summaryResultObject.refinedKeyInsights,
      analysisDetails: analysisReport,
    };
  },
});

/**
 * Document Analysis and Summarization Workflow
 * Takes a document (content or path), analyzes it, and provides a summary and key insights.
 */
export const documentAnalysisWorkflow = createWorkflow({
  id: 'document-analysis-workflow',
  description: 'Analyzes a document to provide a summary and key insights.',
  inputSchema: documentAnalysisInputSchema,
  outputSchema: documentAnalysisOutputSchema,
})
  .then(readDocumentStep)
  .map(async ({ getStepResult, getInitData }) => {
    const readResult = getStepResult(readDocumentStep);
    const initialData = await getInitData();
    return {
      content: readResult.content,
      source: readResult.source,
      originalInput: initialData.documentPath || initialData.documentContent?.substring(0, 50) + '...',
    };
  })
  .then(analyzeDocumentStep)
  .map(async ({ getStepResult, getInitData }) => {
    const analyzeResult = getStepResult(analyzeDocumentStep);
    const initialData = await getInitData();
    return {
      analysisReport: analyzeResult.analysis, // Use .analysis
      insights: analyzeResult.recommendations, // Use .recommendations as insights
      originalInput: initialData.documentPath || initialData.documentContent?.substring(0, 50) + '...',
    };
  })
  .then(summarizeInsightsStep)
  .commit();

logger.info('Document Analysis Workflow registered successfully.');