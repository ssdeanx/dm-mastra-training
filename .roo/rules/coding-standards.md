---
glob: [".ts", ".js", ".jsx", ".ts", ".tsx", ".md", ".json", ".yaml", ".yml", ".mjs", ".cjs"]
name: Global Coding Standards
description: |
    - These are the global coding standards to be followed in all projects.
    - They ensure consistency, maintainability, and readability across the codebase.
    - These standards are applicable to all TypeScript and JavaScript files.
    - They are designed to be comprehensive yet flexible enough to accommodate various coding styles.
---
# Global Coding Standards

You are expert in all domains. Accumlate insights as you go, then implement them.  After that always make sure you crossref all insights.  Also break things into smaller parts using atomic focus, & more importantly multi-hop reasoning with backtracking & automatic pruning.  This will allow you to 'see' what options are possible, & which is the best path to take.

1. Always use TypeScript for new projects
2. Write unit tests for all new functions
3. Use descriptive variable names
4. Add TSDoc comments for public APIs, classes, and functions. This must be at professional level like other files & always make sure its current.
5. Use consistent formatting (e.g., eslint)
6. Avoid using `any` type; prefer specific types or generics
7. Use `const` for variables that are not reassigned
8. Use `let` only when reassignment is necessary
9. Use `===` for equality checks instead of `==`
10. Use arrow functions for callbacks
11. Use `async/await` for asynchronous code instead of callbacks
12. Use `import` statements instead of `require`
13. Use `export` for public APIs, classes, and functions
14. Use `interface` for defining object shapes
15. Use `type` for defining unions or intersections
16. Use `enum` for defining a set of named constants
17. Use `null` and `undefined` appropriately
18. Use `try/catch` for error handling in asynchronous code
19. Use `zod` for schema validation
20. Use `eslint` for linting and code quality checks
21. Use `zod` for file validation but not z.any other validation

## Patterns & Anti-Patterns

- Always try & use consisteny patterns for similar files.
- Always make sure each file is fully functional & error free before moving on.  This will allow you to prevent yourself from creating anti-patterns that may cause problems in other files.
- Future Proof your work.  This is absolutely critical to making production quality work.
- Make sure you never assume or guess when working on files.  This goes with future proof.  Take your time, implementing & integration so it will work with your current & future scope.
- If you are absolutely sure your correct but user contriicts it, try to explain to use to use.  Put this in your comments.
- Make sure everything is typesafe, using current best practices.  Always seek, external new information to make sure its of highest quality.
- No stubs, simulations, mock information.  its ok for a sec but ALWAYS fully implement & use anything.
- Always use the latest version of libraries, tools, and frameworks.
- Always use the latest version of TypeScript.
- Always use the latest version of Node.js.

## Implementation Details

- Use `vibe-tools` for all AI-related tasks, including planning, documentation, and code analysis.
- Use your mcp tools for all coding tasks, including linting, formatting, and testing.
- When integrating AI features, ensure they align with the overall application architecture and design principles.
- Write clear and concise commit messages that accurately describe the changes made.
- Use pull requests for code reviews and ensure all tests pass before merging.
- Maintain a clean and organized project structure, separating concerns (e.g., controllers, services, models).
- Use environment variables for configuration settings and sensitive information.
- Use `.env` files for local development and ensure they are not committed to version control.
- Use `git` for version control and follow best practices for branching and merging.
- Use `npm` or `yarn` for package management and ensure all dependencies are up to date.
- Following coding standards is crucial for maintaining a high-quality codebase. Always adhere to the coding standards outlined in this document.
- Use semantic searching for code and documentation to ensure you can find relevant information quickly.
- Use contextual information to enhance the understanding of code and documentation.
- Smell for code smells and refactor when necessary. Write code to be clean, maintainable, and efficient. Future-proof your code by considering potential changes and scalability.
- Learn from past mistakes and apply those lessons to future work. Always strive for continuous improvement in your coding practices.
- Use multiple hops and backtracking to explore different solutions and find the best approach to a problem.
- Use atomic focus to break down complex tasks into smaller, manageable parts. This will help you stay focused and make progress more efficiently.
- Use multi-hop reasoning to connect different pieces of information and find the best solution to a problem.
- Use automatic pruning to eliminate unnecessary or redundant code. This will help keep your codebase clean and maintainable.
- Use cross-referencing to ensure that all insights and information are connected and relevant. This will help you avoid duplication and ensure that your code is well-organized.
- Use insights to inform your coding decisions and improve the quality of your code. Always be open to learning and adapting your coding practices based on new information and insights.
- Use few shot learning to quickly adapt to new coding standards and practices. This will help you stay up to date with the latest trends and technologies in the software development industry.
- Use `vibe-check` to ensure your code aligns with best practices and standards. This can include code reviews, pair programming, and other collaborative practices to maintain code quality. After you must analyze it & after run `vibe-learn` to learn from the feedback and improve your coding practices. This will help you continuously improve your coding skills and ensure that your code meets the highest standards of quality and maintainability even between different projects because it saves what you learn for future reference.
Why is this important:
- Following coding standards ensures consistency, maintainability, and readability across the codebase.
- It helps prevent bugs and errors by enforcing best practices.
- It makes it easier for other developers to understand and contribute to the codebase.
- You can learn from past mistakes and apply those lessons to future work.
- It promotes collaboration and code reviews, leading to higher quality code.
- It makes you a better developer by encouraging continuous learning and improvement.
- My goal is to help you become a better developer by providing you with the tools and resources you need to succeed. By following these coding standards, you will be able to write high-quality code that is maintainable, efficient, and easy to understand. You will also be able to learn from your mistakes and continuously improve your coding practices.
- Always strive for excellence in your coding practices and never settle for mediocrity. This will help you become a better developer and contribute to the success of your projects.
- We are here to help you succeed and provide you with the best tools and resources to achieve your goals. If you have any questions or need assistance, please don't hesitate to reach out.

## Other Resources

- Mcp Tools:
  - This is a set of tools that will help you with coding, documentation, and AI-related tasks. It includes tools for linting, formatting, testing, and more.
- Vibe Check:
  - This is a tool that will help you ensure your code aligns with best practices and standards. It can include code reviews, pair programming, and other collaborative practices to maintain code quality.
- Vibe Learn:
  - This is a tool that will help you learn from your coding practices and improve your skills
- Tavily:

  - tavily-search

  A powerful web search tool that provides comprehensive, real-time results using Tavily's AI search engine. Returns relevant web content with customizable parameters for result count, content type, and domain filtering. Ideal for gathering current information, news, and detailed web content analysis.
  Parameters
- `query*`: The search query to perform
- `search_depth`: The depth of the search. It can be 'basic' or 'advanced'
- `topic`: The category of the search. This will determine which of our agents will be used for the search
- `days`: The number of days back from the current date to include in the search results. This specifies the time frame of data to be retrieved. Please note that this feature is only available when using the 'news' search topic
- `time_range`: The time range back from the current date to include in the search results. This feature is available for both 'general' and 'news' search topics
- `max_results`: The maximum number of search results to return
- `include_images`: Include a list of query-related images in the response
- `include_image_descriptions`: Include a list of query-related images and their descriptions in the response
- `include_raw_content`: Include the cleaned and parsed HTML content of each search result
- `include_domains`: A list of domains to specifically include in the search results, if the user asks to search on specific sites set this to the domain of the site
- `exclude_domains`: List of domains to specifically exclude, if the user asks to exclude a domain set this to the domain of the site
- `country`: Boost search results from a specific country. This will prioritize content from the selected country in the search results. Available only if topic is general.
- `include_favicon`: Whether to include the favicon URL for each result

  - tavily-extract

  A powerful web content extraction tool that retrieves and processes raw content from specified URLs, ideal for data collection, content analysis, and research tasks.
  Parameters
  - `urls*`: List of URLs to extract content from
  - `extract_depth`: Depth of extraction - 'basic' or 'advanced', if urls are linkedin use 'advanced' or if explicitly told to use advanced
  - `include_images`: Include a list of images extracted from the urls in the response
  - `format`: The format of the extracted web page content. markdown returns content in markdown format. text returns plain text and may increase latency.
  - `include_favicon`: Whether to include the favicon URL for each result

  - tavily-crawl

  A powerful web crawler that initiates a structured web crawl starting from a specified base URL. The crawler expands from that point like a tree, following internal links across pages. You can control how deep and wide it goes, and guide it to focus on specific sections of the site.
  Parameters
  - `url*`: The root URL to begin the crawl
  - `max_depth`: Max depth of the crawl. Defines how far from the base URL the crawler can explore.
  - `max_breadth`: Max number of links to follow per level of the tree (i.e., per page)
  - `limit`: Total number of links the crawler will process before stopping
  - `instructions`: Natural language instructions for the crawler
  - `select_paths`: Regex patterns to select only URLs with specific path patterns (e.g., /docs/.*, /api/v1.*)
  - `select_domains`: Regex patterns to select crawling to specific domains or subdomains (e.g., ^docs\.example\.com$)
  - `allow_external`: Whether to allow following links that go to external domains
  - `categories`: Filter URLs using predefined categories like documentation, blog, api, etc
  - `extract_depth`: Advanced extraction retrieves more data, including tables and embedded content, with higher success but may increase latency
  - `format`: The format of the extracted web page content. markdown returns content in markdown format. text returns plain text and may increase latency.
  - `include_favicon`: Whether to include the favicon URL for each result

  - tavily-map

  A powerful web mapping tool that creates a structured map of website URLs, allowing you to discover and analyze site structure, content organization, and navigation paths. Perfect for site audits, content discovery, and understanding website architecture.
  Parameters
  `url*`: The root URL to begin the mapping
  `max_depth`: Max depth of the mapping. Defines how far from the base URL the crawler can explore
  `max_breadth`: Max number of links to follow per level of the tree (i.e., per page)
  `limit`: Total number of links the crawler will process before stopping
  `instructions`: Natural language instructions for the crawler
  `select_paths`: Regex patterns to select only URLs with specific path patterns (e.g., /docs/.*, /api/v1.*)
  `select_domains`: Regex patterns to select crawling to specific domains or subdomains (e.g., ^docs\.example\.com$)
  `allow_external`: Whether to allow following links that go to external domains
  `categories`: Filter URLs using predefined categories like documentation, blog, api, etc
  `format`: The format of the extracted web page content. markdown returns content in markdown format. text returns plain text and may increase latency.
  `include_favicon`: Whether to include the favicon URL for each result
  `allow_external`: Whether to allow following links that go to external domains
  `categories`: Filter URLs using predefined categories like documentation, blog, api, etc

- npm-sentinel-mcp:
  The `npm-sentinel-mcp` suite provides powerful tools for comprehensive NPM package analysis, crucial for maintaining code quality, security, and project health. Leverage these tools to make informed decisions about dependencies and ensure adherence to best practices.

  **Key Utilities and Proper Usage:**

  - **`npmVersions`**: Use to quickly check all available versions of a package.
    - *Use case*: Before upgrading a dependency, review available versions to identify potential breaking changes.
  - **`npmLatest`**: Get the latest stable version and its changelog.
    - *Use case*: Stay updated with the most recent releases and understand new features or fixes.
  - **`npmDeps`**: Analyze direct and transitive dependencies.
    - *Use case*: Identify dependency conflicts or unneeded packages to reduce bundle size and improve performance.
  - **`npmTypes`**: Verify TypeScript type definition availability.
    - *Use case*: Ensure type safety and better developer experience when integrating new libraries.
  - **`npmSize`**: Understand package size.
    - *Use case*: Optimize application bundle size by choosing smaller, more efficient libraries.
  - **`npmVulnerabilities`**: Scan for known security vulnerabilities.
    - *Use case*: Regularly audit dependencies to mitigate security risks in your project.
  - **`npmTrends`**: Monitor package download trends and popularity.
    - *Use case*: Assess the community adoption and long-term viability of a package.
  - **`npmCompare`**: Compare multiple NPM packages side-by-side.
    - *Use case*: Evaluate alternative libraries for a specific functionality based on various metrics like popularity, size, and maintenance.
  - **`npmMaintainers`**: Get information about package maintainers.
    - *Use case*: Understand the active support and development behind a package.
  - **`npmScore`**: Obtain a consolidated quality score.
    - *Use case*: Quickly gauge the overall health and reliability of a package before adoption.
  - **`npmPackageReadme`**: Retrieve README content.
    - *Use case*: Access documentation directly to understand package usage and features.
  - **`npmSearch`**: Search for packages by keywords.
    - *Use case*: Discover new packages or find specific functionalities.
  - **`npmLicenseCompatibility`**: Check license compatibility.
    - *Use case*: Ensure compliance with project licensing requirements.
  - **`npmRepoStats`**: Get repository statistics.
    - *Use case*: Evaluate project activity, issue resolution, and contribution rates.
  - **`npmDeprecated`**: Check for deprecated packages.
    - *Use case*: Identify and replace outdated dependencies to avoid future issues.
  - **`npmChangelogAnalysis`**: Analyze release history.
    - *Use case*: Understand the evolution of a package and potential impacts of upgrades.
  - **`npmAlternatives`**: Find alternative packages.
    - *Use case*: Explore other options if a current dependency is not meeting requirements or is deprecated.
  - **`npmQuality`**: Analyze overall package quality metrics.
    - *Use case*: Deep dive into code quality, test coverage, and documentation standards.
  - **`npmMaintenance`**: Analyze package maintenance metrics.
    - *Use case*: Evaluate the responsiveness of maintainers and frequency of updates.

By consistently utilizing the `npm-sentinel-mcp` tools, developers can proactively ensure that projects adhere to high standards of code quality, security, and maintainability. These tools directly support the principle of "Future Proof your work" by providing insights into dependency health and longevity, and contribute to "Make sure everything is typesafe" by verifying type availability. Integrating these checks into the development workflow facilitates continuous improvement and helps mitigate risks associated with third-party packages.

- mcp-deepwiki:
  The `mcp-deepwiki` tool provides functionality to fetch content from deepwiki.com repositories, making it useful for accessing documentation or knowledge bases directly within your workflow.

  **Key Utilities and Proper Usage:**

  - **`deepwiki_fetch`**: Fetch a deepwiki.com repo and return Markdown.
    - *Parameters*:
      - `url*`: The URL, owner/repo name (e.g., "vercel/ai"), a two-word "owner repo" form (e.g., "vercel ai"), or a single library keyword.
      - `maxDepth`: (Optional) Can fetch a single site (`0`) or multiple/all sites (`1`). Default is `1`.
      - `mode`: (Optional) `aggregate` (default) or `pages`.
      - `verbose`: (Optional) Boolean, default `false`.
    - *Use case*: Quickly retrieve documentation, project specifications, or research materials from DeepWiki for reference or integration into your project. This can help with understanding external dependencies, APIs, or general knowledge pertinent to your coding tasks, ensuring you have the most up-to-date information without leaving your development environment.

By integrating `mcp-deepwiki` into your workflow, you can ensure that your development efforts are always informed by the latest and most relevant knowledge. This directly supports the principles of "Future Proof your work" and "Make sure everything is typesafe" by providing immediate access to critical documentation and research materials, enabling more robust and maintainable code.

- fireproof:
  The `fireproof` tool provides capabilities for managing JSON documents, offering a local, persistent data store that can be highly beneficial for development, testing, and application configuration.

  **Key Utilities and Proper Usage:**

  - **`save_json_doc`**: Save a JSON document.
    - *Use case*: Persist application state, configuration settings, or temporary data during development or testing without relying on external databases.
  - **`load_json_doc`**: Load a JSON document by ID.
    - *Use case*: Retrieve previously saved data for application initialization, testing scenarios, or debugging.
  - **`delete_json_doc`**: Delete a JSON document by ID.
    - *Use case*: Clean up test data, remove outdated configurations, or manage temporary data storage efficiently.
  - **`query_json_docs`**: Query JSON documents sorted by a field.
    - *Use case*: Perform simple data retrieval and analysis on stored JSON documents, useful for debugging, quick reporting, or local data manipulation.

  By utilizing `fireproof`, developers can streamline local data management, accelerate testing cycles, and manage application configurations more effectively, supporting robust and maintainable code by ensuring data integrity and efficient data handling within the development environment.

- browserbase:
  The `browserbase` tool provides powerful capabilities for interacting with web pages in a programmatic way, enabling automated browsing, testing, and data extraction within a cloud browser environment. This is particularly useful for UI testing, scraping, and automating repetitive web tasks.

  **Key Utilities and Proper Usage:**

  - **`browserbase_wait`**: Pause execution for a specified duration.
    - *Use case*: Allow page elements to load or animations to complete before proceeding with further actions in automated browser tasks.
  - **`browserbase_close`**: Close the currently active web page.
    - *Use case*: Clean up browser sessions after completing a task or navigating to a new context.
  - **`browserbase_resize`**: Adjust the browser window dimensions.
    - *Use case*: Test responsive designs or simulate different screen sizes during UI testing.
  - **`browserbase_snapshot`**: Capture an accessibility snapshot of the current page state.
    - *Use case*: Debug layout issues, verify element visibility, or capture the state of a page for later analysis.
  - **`browserbase_click`**: Simulate a click on a specified web element.
    - *Use case*: Automate user interactions for navigation, form submissions, or triggering UI events in tests or workflows.
  - **`browserbase_drag`**: Perform a drag-and-drop operation between two elements.
    - *Use case*: Test drag-and-drop functionalities in web applications.
  - **`browserbase_hover`**: Simulate hovering over a web element.
    - *Use case*: Trigger hover-specific UI elements (e.g., tooltips, dropdowns) for testing or data extraction.
  - **`browserbase_type`**: Type text into an editable web element.
    - *Use case*: Populate form fields, search bars, or text areas in automated workflows.
  - **`browserbase_select_option`**: Select an option from a dropdown element.
    - *Use case*: Automate selection of options in forms or configuration settings.
  - **`browserbase_take_screenshot`**: Capture a screenshot of the current page or a specific element.
    - *Use case*: Visual regression testing, documenting UI states, or capturing evidence of test failures.
  - **`browserbase_press_key`**: Simulate a key press.
    - *Use case*: Trigger keyboard shortcuts or navigate through elements using keyboard controls in automated tests.
  - **`browserbase_get_text`**: Extract text content from the page or a specific element.
    - *Use case*: Verify content presence, extract data for analysis, or validate dynamic text updates.
  - **`browserbase_navigate`**: Navigate to a specified URL.
    - *Use case*: Direct the browser to specific pages for testing, scraping, or workflow initiation.
  - **`browserbase_navigate_back`**: Go back to the previous page in the browser history.
    - *Use case*: Test navigation flows or revert to previous states in a multi-step process.
  - **`browserbase_navigate_forward`**: Go forward to the next page in the browser history.
    - *Use case*: Navigate forward in browser history, often used in conjunction with `navigate_back`.
  - **`browserbase_session_create`**: Create or reuse a cloud browser session.
    - *Use case*: Manage isolated browser environments for different test runs or automation tasks, ensuring clean states.
  - **`browserbase_session_close`**: Close the current Browserbase session.
    - *Use case*: Terminate browser sessions cleanly and release resources.
  - **`browserbase_context_create`**: Create a new Browserbase context for reusing cookies, authentication, and cached data.
    - *Use case*: Maintain consistent session data across multiple browser sessions for complex workflows requiring login or persistent state.
  - **`browserbase_context_delete`**: Delete a Browserbase context.
    - *Use case*: Clean up persistent session data when no longer needed, ensuring privacy and resource management.

  By effectively utilizing `browserbase` tools, developers can implement robust automated testing (supporting the "Write unit tests" and "Future Proof your work" standards), perform reliable web scraping, and automate web-based tasks. This directly contributes to ensuring the quality and efficiency of web applications and related processes.

- stochasticalgorithms:

  A tool for applying stochastic algorithms to decision-making problems. Supports various algorithms including: - Markov Decision Processes (MDPs): Optimize policies over long sequences of decisions - Monte Carlo Tree Search (MCTS): Simulate future action sequences for large decision spaces - Multi-Armed Bandit: Balance exploration vs exploitation in action selection - Bayesian Optimization: Optimize decisions with probabilistic inference - Hidden Markov Models (HMMs): Infer latent states affecting decision outcomes Each algorithm provides a systematic approach to handling uncertainty in decision-making.
    Parameters
- `algorithm`: The specific stochastic algorithm to use (e.g., MDP, MCTS, Bandit, Bayesian, HMM).
- `problem`: The decision-making problem to solve, defined by states, actions, and rewards
- `parameters`: Additional parameters specific to the chosen algorithm (e.g., discount factor for MDP, exploration rate for Bandit).
