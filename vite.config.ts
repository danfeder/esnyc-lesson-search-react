import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor', test: /node_modules\/(react|react-dom)\// },
            { name: 'router', test: /node_modules\/react-router(-dom)?\// },
            { name: 'query', test: /node_modules\/@tanstack\/(react-)?query(-core)?\// },
            { name: 'supabase', test: /node_modules\/@supabase\// },
            { name: 'ui', test: /node_modules\/(@headlessui\/react|lucide-react)\// },
          ],
        },
      },
    },
  },
});
