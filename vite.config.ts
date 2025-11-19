import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";


export default defineConfig(async () => ({
  // ✅ base fix: ensures assets load correctly on cPanel or local
  base: "./",

  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          (await import("@replit/vite-plugin-cartographer")).cartographer(),
          (await import("@replit/vite-plugin-dev-banner")).devBanner(),
        ]
      : []),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },

  // ✅ root should point to the project directory where src exists
  root: path.resolve(__dirname),

  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },

 server: {
    fs: {
      strict: true,
      deny: ["/.*"],
    },
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,                 // allow http backend in dev
        // rewrite cookie domain so browser will accept Set-Cookie for localhost
        cookieDomainRewrite: "localhost",
      },
    },
  },
}));