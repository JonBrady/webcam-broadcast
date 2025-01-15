import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    watch: {
      usePolling: true,
      interval: 1000,
    },
    hmr: {
      overlay: true
    },
    proxy: {},
    fs: {
      strict: false
    }
  },
  preview: {
    port: 5173,
    strictPort: false,
    host: true
  }
})
