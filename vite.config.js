import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/guang-website/',
  server: {
    port: 3456,
    open: true
  }
})
