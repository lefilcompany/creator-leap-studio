import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/**
 * Converte os <link rel="stylesheet"> injetados pelo Vite em preloads
 * não-bloqueantes (com fallback <noscript>) para remover o CSS do critical path.
 * A app renderiza dentro de #root (sem SSR), então não há FOUC perceptível.
 */
const nonBlockingCss = (): Plugin => ({
  name: "non-blocking-css",
  apply: "build",
  enforce: "post",
  transformIndexHtml(html) {
    const linkRegex = /<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g;
    const matches = [...html.matchAll(linkRegex)];
    if (matches.length === 0) return html;
    let out = html.replace(linkRegex, (_m, href) =>
      `<link rel="preload" as="style" href="${href}" onload="this.onload=null;this.rel='stylesheet'">`,
    );
    const noscript = matches
      .map(([, href]) => `<link rel="stylesheet" href="${href}">`)
      .join("");
    out = out.replace("</head>", `<noscript>${noscript}</noscript></head>`);
    return out;
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    nonBlockingCss(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
}));
