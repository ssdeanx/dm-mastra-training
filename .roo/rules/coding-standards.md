---
glob:  - '**/*.ts'
  - '**/*.tsx'
  - '**/*.js'
  - '**/*.jsx'
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
