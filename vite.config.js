import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    // Single-bundle app by design — raise the threshold so the build log stays clean.
    chunkSizeWarningLimit: 1500,
  },
})