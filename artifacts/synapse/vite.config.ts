import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  optimizeDeps: {
    exclude: ["pyodide"],
  },
  worker: {
    format: "es",
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    warmup: {
      clientFiles: [
        "./src/components/workspace/StudyWorkspace.tsx",
        "./src/components/workspace/CognitiveReader.tsx",
        "./src/components/workspace/QuizPanel.tsx",
        "./src/components/workspace/TimerPanel.tsx",
        "./src/components/workspace/LeitnerPanel.tsx",
      ],
    },
    fs: {
      strict: false,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("pyodide")) return "pyodide";
          if (id.includes("mermaid")) return "mermaid";
          if (id.includes("pdfjs-dist")) return "pdf";
          if (id.includes("katex")) return "katex";
          if (id.includes("codemirror") || id.includes("@codemirror"))
            return "codemirror";
          if (id.includes("framer-motion")) return "motion";
          if (
            id.includes("react-dom") ||
            id.includes("react/") ||
            id.includes("scheduler")
          )
            return "react-vendor";
          return "vendor";
        },
      },
    },
  },
});
