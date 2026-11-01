import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],

  resolve: {
    // Force ONE copy of React across all modules (prevents "Invalid hook call")
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react-router-dom'],
    // Hard alias — any import of 'react' always resolves to the same file
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime'),
    },
  },

  optimizeDeps: {
    // Force Vite to include these in the pre-bundled chunk (single instance)
    include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'],
  },

  server: {
    port: 5175,
    strictPort: false,
    // Prevent browser from caching old JS bundles (fixes "reverts to old version")
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/datasets': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
