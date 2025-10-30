import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'



// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // read VITE_* from .env files (optional)
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.VITE_API_TARGET || "http://localhost:5175";

  return {
    plugins: [react()],
    server: {
        host: '0.0.0.0',  // Listen on all network interfaces (needed for Docker)
        port: 5173,
        proxy: {
          "/api": {
            target,          // where your API runs
            changeOrigin: true,
            secure: false,
            // If your API doesn't include the `/api` prefix on the server,
            // uncomment the next line to strip it for upstream:
            // rewrite: (path) => path.replace(/^\/api/, ""),
            // Enable if you proxy websockets:
            // ws: true,
          },
        },
      },
    };
})
