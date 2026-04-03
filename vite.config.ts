import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (
            id.includes('/three/') ||
            id.includes('@react-three') ||
            id.includes('three-stdlib') ||
            id.includes('troika')
          ) {
            return 'three';
          }

          if (id.includes('/react/') || id.includes('/react-dom/')) {
            return 'react';
          }

          return 'vendor';
        },
      },
    },
  },
});
