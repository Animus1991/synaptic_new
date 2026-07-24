import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";

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

/** Dev + preview ingest for chunkErrorReporter beacons (mirrors server POST /__chunk_errors). */
function chunkErrorsBeaconMiddleware(
  req: import("http").IncomingMessage,
  res: import("http").ServerResponse,
  next: () => void,
) {
  if (req.method !== "POST" || !req.url?.startsWith("/__chunk_errors")) {
    next();
    return;
  }
  const chunks: Buffer[] = [];
  req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  req.on("end", () => {
    try {
      const raw = Buffer.concat(chunks).toString("utf8");
      const payload = raw ? JSON.parse(raw) : {};
      // eslint-disable-next-line no-console
      console.info("[synapse] chunk-error beacon", payload);
    } catch {
      /* ignore malformed beacons */
    }
    res.statusCode = 204;
    res.end();
  });
}

function chunkErrorsDevPlugin(): Plugin {
  return {
    name: "synapse-chunk-errors-beacon",
    configureServer(server) {
      server.middlewares.use(chunkErrorsBeaconMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(chunkErrorsBeaconMiddleware);
    },
  };
}

/** B11 — emit hashed entry-chunk URLs for runtime `<link rel="prefetch">`. */
function workspaceEntryManifestPlugin(): Plugin {
  return {
    name: "synapse-workspace-entry-manifest",
    generateBundle(_options, bundle) {
      const baseHref = basePath.endsWith("/") ? basePath : `${basePath}/`;
      const urls: string[] = [];
      for (const item of Object.values(bundle)) {
        const fileName = item.type === "chunk" || item.type === "asset" ? item.fileName : null;
        if (!fileName) continue;
        if (
          /StudyWorkspace/i.test(fileName)
          || /CognitiveReader/i.test(fileName)
          || /workspace\.worker/i.test(fileName)
        ) {
          urls.push(`${baseHref}${fileName}`);
        }
      }
      if (urls.length === 0) return;
      this.emitFile({
        type: "asset",
        fileName: "workspace-entry-chunks.json",
        source: JSON.stringify(urls),
      });
    },
  };
}

export default defineConfig({
  base: basePath,
  define: {
    __APP_VERSION__: JSON.stringify(
      process.env.APP_VERSION || process.env.VERCEL_GIT_COMMIT_SHA || `dev-${Date.now()}`,
    ),
  },
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    chunkErrorsDevPlugin(),
    workspaceEntryManifestPlugin(),
    VitePWA({
      // W0 INFRA-CL-05: autoUpdate = skipWaiting + clientsClaim via workbox-window.
      // Rollback = redeploy previous dist; clients pick up on next navigation.
      registerType: "autoUpdate",
      manifest: {
        name: "Synapse",
        short_name: "Synapse",
        description: "AI study workspace — offline-first ingest, FSRS, institution RBAC",
        theme_color: "#0f0a1e",
        background_color: "#0f0a1e",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: basePath,
        icons: [
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/favicon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg}"],
        globIgnores: ["**/pyodide/**"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            urlPattern: /^\/pyodide\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "pyodide-runtime",
              expiration: {
                maxEntries: 64,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
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
        "./src/components/workspace/SimulatorPanel.tsx",
        "./src/components/workspace/ComparePanel.tsx",
        "./src/components/workspace/TimerPanel.tsx",
        "./src/components/workspace/LeitnerPanel.tsx",
        "./src/components/workspace/DebatePanel.tsx",
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
