import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/filial-sp1/',
  build: {
    outDir: 'dist'
  }
})
