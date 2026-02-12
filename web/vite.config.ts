import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
  tailwindcss()
  ],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
      'axios': path.resolve(__dirname, 'node_modules/axios'),
    },
  },
  server: {
    // Try to use port 3000 as the primary port
    port: 3000,
    host: true, // Allow access from network

    // Enable HTTPS using the same certificates as backend
    // https: {
    //   key: fs.readFileSync(path.resolve(__dirname, '../backend/ssl/key.pem')),
    //   cert: fs.readFileSync(path.resolve(__dirname, '../backend/ssl/cert.pem')),
    // },

    // Optional: If you set strictPort to true, Vite will exit 
    // rather than trying the next available port if port 3000 is taken.
    // If you want a fallback, keep this commented out or set to false (default behavior).
    // strictPort: true, 
    // Proxy API requests to backend during development
    proxy: {
      '/api': {
        target: 'https://rmforrender.onrender.com', // Update target to HTTPS backend
        changeOrigin: true,
        secure: false, // Accept self-signed certs
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  },

})
