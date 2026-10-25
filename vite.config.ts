import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()], base: process.env.BASE_PATH || '/campusai-transformation-lab/', build: { chunkSizeWarningLimit: 2000 } })
