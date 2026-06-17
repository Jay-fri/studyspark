import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: './',
  server: {
    proxy: {
      '/r2-models': {
        target: 'https://pub-b501ce6fd8de4bf4938674fb9e008ad0.r2.dev',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/r2-models/, ''),
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectRegister: null,
      manifestFilename: "manifest.json",
      includeAssets: ["apple-touch-icon.png", "logo.jpg", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        id:                          "/",
        name:                        "StudyLM — AI Study Assistant",
        short_name:                  "StudyLM",
        description:                 "AI-powered study assistant for university students. Upload notes, chat with AI, generate flashcards and quizzes.",
        theme_color:                 "#0a1628",
        background_color:            "#0a1628",
        display:                     "standalone",
        orientation:                 "portrait",
        prefer_related_applications: false,
        categories:                  ["education", "productivity"],
        start_url:                   "/",
        scope:                       "/",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any"      },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any"      },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,jpg,jpeg}"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Ensure only one copy of React and Three.js ends up in the bundle.
    // R3F v9 accesses React internals via the same module instance —
    // a duplicate copy causes "Cannot read properties of undefined (reading 'S')".
    dedupe: ["react", "react-dom", "react/jsx-runtime", "three"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Keep React + R3F in the same chunk so they share one React instance
          react:     ["react", "react-dom", "@react-three/fiber", "@react-three/drei", "three", "@react-spring/three", "@use-gesture/react"],
          router:    ["react-router-dom"],
          motion:    ["framer-motion"],
          query:     ["@tanstack/react-query"],
          supabase:  ["@supabase/supabase-js"],
          charts:    ["recharts"],
          markdown:  ["react-markdown", "remark-gfm"],
        },
      },
    },
  },
});
