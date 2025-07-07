import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { PinoLogger } from "@mastra/loggers";
import simpleGit, { SimpleGit } from 'simple-git';
import { Octokit } from "@octokit/rest";

const logger = new PinoLogger({ name: 'GitOperationsTool', level: 'info' });

// Input Schema
const gitOperationInputSchema = z.object({
  operation: z.enum(["status", "pull", "push", "commit", "clone", "createPR", "getIssues"]).describe("The Git or GitHub operation to perform."),
  repositoryPath: z.string().optional().describe("Local path to the Git repository (for local operations). Defaults to current working directory."),
  remoteUrl: z.string().url().optional().describe("Remote URL of the Git repository (for clone/push/pull)."),
  commitMessage: z.string().optional().describe("Commit message (for 'commit' operation)."),
  branchName: z.string().optional().describe("Branch name (for 'pull', 'push', 'createPR' operations)."),
  prTitle: z.string().optional().describe("Pull Request title (for 'createPR' operation)."),
  prBody: z.string().optional().describe("Pull Request body (for 'createPR' operation)."),
  owner: z.string().optional().describe("GitHub repository owner (for GitHub API operations)."),
  repo: z.string().optional().describe("GitHub repository name (for GitHub API operations)."),
  issueState: z.enum(["open", "closed", "all"]).optional().describe("State of issues to retrieve (for 'getIssues' operation).")
}).strict();

type GitCloneContext = z.infer<typeof gitOperationInputSchema> & { operation: 'clone'; remoteUrl: string };

// Output Schema
const gitOperationOutputSchema = z.object({
  operation: z.string().describe("The Git or GitHub operation performed."),
  success: z.boolean().describe("True if the operation was successful, false otherwise."),
  message: z.string().optional().describe("A descriptive message about the operation's outcome."),
  data: z.any().optional().describe("Additional data returned by the operation (e.g., git status, PR URL, list of issues)."),
  errorMessage: z.string().optional().describe("Error message if the operation failed.")
}).strict();

export const gitOperationsTool = createTool({
  id: "git-operations",
  description: "Performs Git operations on local repositories or interacts with the GitHub API.",
  inputSchema: gitOperationInputSchema,
  outputSchema: gitOperationOutputSchema,
  execute: async ({ context }) => {
    logger.info(`Starting Git operation: ${context.operation}`, context);

    const repoPath = context.repositoryPath || process.cwd();
    let git: SimpleGit | undefined;
    let octokit: Octokit | undefined;

    try {
      if (context.operation !== 'clone') { // simple-git needs to be initialized in an existing repo
        git = simpleGit(repoPath);
      }

      if (['createPR', 'getIssues'].includes(context.operation)) {
        const githubToken = process.env.GITHUB_TOKEN;
        if (!githubToken) {
          throw new Error("GITHUB_TOKEN environment variable is not set for GitHub API operations.");
        }
        octokit = new Octokit({ auth: githubToken });
      }

      let data: unknown; // Changed to unknown
      let message: string | undefined;

      switch (context.operation) {
        case 'status': { // Wrapped in curly braces
          if (!git) throw new Error("Git repository not found or not initialized.");
          data = await git.status();
          message = "Git status retrieved successfully.";
          break;
        }
        case 'pull': { // Wrapped in curly braces
          if (!git) throw new Error("Git repository not found or not initialized.");
          data = await git.pull(context.remoteUrl || '', context.branchName || '');
          message = `Pulled from ${context.remoteUrl || 'origin'}/${context.branchName || 'current'}.`;
          break;
        }
        case 'push': { // Wrapped in curly braces
          if (!git) throw new Error("Git repository not found or not initialized.");
          data = await git.push(context.remoteUrl || '', context.branchName || '');
          message = `Pushed to ${context.remoteUrl || 'origin'}/${context.branchName || 'current'}.`;
          break;
        }
        case 'commit': { // Wrapped in curly braces
          if (!git) throw new Error("Git repository not found or not initialized.");
          if (!context.commitMessage) throw new Error("Commit message is required for commit operation.");
          await git.add('.'); // Add all changes
          data = await git.commit(context.commitMessage);
          message = `Committed with message: "${context.commitMessage}".`;
          break;
        }
        case 'clone': { // Wrapped in curly braces
          const cloneContext = context as GitCloneContext; // Type assertion
          if (!cloneContext.remoteUrl) throw new Error("Remote URL is required for clone operation.");
          git = simpleGit(); // Initialize outside specific repo for clone
          data = await git.clone(cloneContext.remoteUrl, repoPath);
          message = `Cloned ${cloneContext.remoteUrl} to ${repoPath}.`;
          break;
        }
        case 'createPR': { // Wrapped in curly braces
          if (!octokit) throw new Error("Octokit not initialized.");
          if (!context.owner || !context.repo || !context.prTitle || !context.branchName) {
            throw new Error("Owner, repo, PR title, and branch name are required for createPR operation.");
          }
          const pr = await octokit.pulls.create({
            owner: context.owner,
            repo: context.repo,
            title: context.prTitle,
            head: context.branchName,
            base: 'main', // Assuming 'main' as base branch, can be made configurable
            body: context.prBody,
          });
          data = { html_url: pr.data.html_url, number: pr.data.number };
          message = `Pull Request created: ${pr.data.html_url}`;
          break;
        }
        case 'getIssues': { // Wrapped in curly braces
          if (!octokit) throw new Error("Octokit not initialized.");
          if (!context.owner || !context.repo) {
            throw new Error("Owner and repo are required for getIssues operation.");
          }
          const issues = await octokit.issues.listForRepo({
            owner: context.owner,
            repo: context.repo,
            state: context.issueState || 'open',
          });
          data = issues.data.map(issue => ({
            number: issue.number,
            title: issue.title,
            state: issue.state,
            url: issue.html_url,
          }));
          message = `Issues retrieved for ${context.owner}/${context.repo}.`;
          break;
        }
        default:
          throw new Error(`Unsupported operation: ${context.operation}`);
      }

      logger.info(`Git operation successful: ${context.operation}`, { success: true, message });
      return gitOperationOutputSchema.parse({
        operation: context.operation,
        success: true,
        message,
        data,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Git operation failed: ${context.operation}`, {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      return gitOperationOutputSchema.parse({
        operation: context.operation,
        success: false,
        message: `Operation failed: ${errorMessage}`,
        errorMessage: errorMessage,
      });
    }
  },
});