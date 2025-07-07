import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Apply ESLint's recommended rules
  eslint.configs.recommended,

  // Apply TypeScript ESLint's recommended rules
  ...tseslint.configs.recommended,

  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mjs'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Custom rules or overrides for TypeScript files
      // For example, to warn about unused variables:
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
  {
    // Optional: Configuration for JavaScript files if needed
    files: ['**/*.js', '**/*.jsx'],
    rules: {
      // Add any JavaScript-specific rules here
    },
  },
);
