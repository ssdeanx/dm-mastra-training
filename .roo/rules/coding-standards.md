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

1. Always use TypeScript for new projects
2. Write unit tests for all new functions
3. Use descriptive variable names
4. Add TSDoc comments for public APIs, classes, and functions
5. Use consistent formatting (e.g., Prettier)
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
