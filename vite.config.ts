import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      // Use .json so Cloudflare Pages serves it as application/json (recognised by Chrome)
      manifestFilename: "manifest.json",
      includeAssets: ["apple-touch-icon.png", "logo.jpg", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        id:               "/studylm",
        name:             "StudyLM — AI Study Assistant",
        short_name:       "StudyLM",
        description:      "AI-powered study assistant for university students. Upload notes, chat with AI, generate flashcards and quizzes.",
        theme_color:      "#0a1628",
        background_color: "#0a1628",
        display:          "standalone",
        display_override: ["standalone", "minimal-ui"],
        orientation:      "portrait",
        categories:       ["education", "productivity"],
        start_url:        "/dashboard",
        scope:            "/",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any"      },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any"      },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,jpg,jpeg}"],
        // Serve index.html for any navigation request the SW hasn't pre-cached
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/supabase\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react:     ["react", "react-dom"],
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
