import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

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
    mcpPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
    esbuildOptions: {
      target: "es2022",
    },
  },
  esbuild: {
    target: "es2022",
    // Remove logs/debugger em produção para encolher payload
    drop: ["debugger"],
  },
  build: {
    target: "es2022",

    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Split heavy / rarely-used libs out of the initial bundle so the
        // landing/auth screens only load what they actually need.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-router")) return "router";
          if (id.includes("@tanstack/react-query")) return "react-query";
          if (id.includes("framer-motion")) return "framer-motion";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("pdfjs-dist")) return "pdfjs";
          if (id.includes("jspdf") || id.includes("html2canvas")) return "pdf-export";
          if (id.includes("docx") || id.includes("file-saver")) return "docx-export";
          if (id.includes("react-joyride")) return "joyride";
          if (id.includes("three")) return "three";
          if (id.includes("embla-carousel")) return "embla";
          if (id.includes("react-rnd") || id.includes("react-draggable") || id.includes("re-resizable")) return "rnd";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("react-markdown") || id.includes("remark") || id.includes("micromark") || id.includes("mdast")) return "markdown";
          if (id.includes("date-fns")) return "date-fns";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("react-dom")) return "react-dom";
          if (id.includes("/react/")) return "react";
        },
      },
    },
  },
}));
