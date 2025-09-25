import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'

export default defineConfig({
  server: {
    host: '0.0.0.0', // Permet l'accès depuis le réseau local
    https: {
      key: fs.readFileSync('key.pem'),
      cert: fs.readFileSync('cert.pem'),
    },
  },
  plugins: [
    tailwindcss(),
  ],
})