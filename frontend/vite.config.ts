import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
  tailwindcss()
  ],
  server: {
    // Try to use port 3000 as the primary port
    port: 3000,
    host: true, // Allow access from network

    // Optional: If you set strictPort to true, Vite will exit 
    // rather than trying the next available port if port 3000 is taken.
    // If you want a fallback, keep this commented out or set to false (default behavior).
    // strictPort: true, 
    // Proxy API requests to backend during development
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  },

})
