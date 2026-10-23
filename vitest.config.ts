import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.ts',
    css: true,
    // Explicit discovery roots (refactor-audit §3.2 rider). Vitest's default
    // include is '**/*.{test,spec}.?(c|m)[jt]s?(x)', which would also run any
    // test file moved under scripts/archive/. List the live roots and exclude
    // the archive so an archived test never runs again.
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'supabase/functions/**/*.test.ts',
      'scripts/**/*.test.{ts,mjs}',
    ],
    exclude: ['node_modules', 'dist', 'e2e/**/*', 'scripts/archive/**', '.claude/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/', '**/*.d.ts', '**/*.config.*', '**/mockData/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
