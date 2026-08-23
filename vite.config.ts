import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Cargo writes locked .exe files under src-tauri/target. Watching them
      // crashes Vite on Windows (EBUSY), especially when the project is in OneDrive.
      ignored: ['**/src-tauri/**'],
    },
  },
});
