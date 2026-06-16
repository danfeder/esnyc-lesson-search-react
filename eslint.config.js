import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default [
  // First, specify ignores (must be first in the array)
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '*.config.js',
      'vite.config.ts',
      // Ignore scripts/ EXCEPT the lint-clean subdirectories (the stage2-retag
      // runner — OQ12 dedicated check surface — and the heritage filter
      // generator — PR C1.1), which get the standard TS rules. Flat-config
      // global ignores cannot be un-ignored by later config objects, so the
      // exceptions must be negation patterns here. Empirically, negations
      // after 'scripts/**' do NOT re-include (the glob swallows the
      // directories themselves); the working pattern is 'scripts/*'
      // (ignore direct children) + re-include each opted-in subdirectory.
      'scripts/*',
      '!scripts/stage2-retag/',
      '!scripts/heritage/',
      'supabase/functions/**',
      'temp-debug-files/**',
      '.eslintrc.*',
      'coverage/**',
      'build/**',
    ],
  },
  js.configs.recommended,
  prettierConfig,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      '@typescript-eslint': typescript,
      react: react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      prettier: prettier,
    },
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        process: 'readonly',
        NodeJS: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLFormElement: 'readonly',
        MouseEvent: 'readonly',
        Event: 'readonly',
        Node: 'readonly',
        Response: 'readonly',
        Deno: 'readonly',
        global: 'readonly',
        __dirname: 'readonly',
        vi: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        crypto: 'readonly',
        TextEncoder: 'readonly',
        Uint8Array: 'readonly',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // TypeScript
      'no-unused-vars': 'off', // Turn off base rule as it doesn't work with TypeScript
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // React
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Accessibility
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-is-valid': 'warn',
      'jsx-a11y/no-autofocus': 'warn',

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'prettier/prettier': 'error',
    },
  },
  {
    files: ['**/*.js'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
  // Standalone Node DB-test scripts under the (un-ignored) heritage dir. These
  // mirror scripts/test-rls-policies.mjs (which lives under the ignored
  // scripts/* and is never linted); since scripts/heritage/ is opted IN for the
  // C1.1 generator, the .mjs test here gets linted too and needs Node globals.
  {
    files: ['scripts/heritage/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
];
