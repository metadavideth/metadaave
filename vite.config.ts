import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    allowedHosts: [
      '33562ea696ff.ngrok-free.app',
      'localhost',
      '127.0.0.1'
    ],
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    exclude: ['@farcaster/miniapp-sdk']
  }
})
