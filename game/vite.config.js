import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' so the build runs from any path — required for TikTok mini game packages
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist', assetsInlineLimit: 8388608 },
})
