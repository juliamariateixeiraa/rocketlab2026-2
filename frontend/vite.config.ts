import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Repassa as chamadas da API para o FastAPI, evitando configurar CORS no dev.
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
