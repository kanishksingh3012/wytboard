import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths, so the build works at any URL (e.g. GitHub Pages subpaths).
  base: './',
  plugins: [react(), tailwindcss()],
  define: {
    // Required by @excalidraw/excalidraw
    'process.env.IS_PREACT': JSON.stringify('false'),
  },
})
