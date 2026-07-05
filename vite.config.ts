import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Dev + preview ingest for chunkErrorReporter beacons (mirrors server POST /__chunk_errors). */
function chunkErrorsBeaconMiddleware(
  req: import('http').IncomingMessage,
  res: import('http').ServerResponse,
  next: () => void,
) {
  if (req.method !== 'POST' || !req.url?.startsWith('/__chunk_errors')) {
    next();
    return;
  }
  const chunks: Buffer[] = [];
  req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
  req.on('end', () => {
    try {
      const raw = Buffer.concat(chunks).toString('utf8');
      const payload = raw ? JSON.parse(raw) : {};
      // eslint-disable-next-line no-console
      console.info('[synapse] chunk-error beacon', payload);
    } catch {
      /* ignore malformed beacons */
    }
    res.statusCode = 204;
    res.end();
  });
}

function chunkErrorsDevPlugin(): Plugin {
  return {
    name: 'synapse-chunk-errors-beacon',
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
    name: 'synapse-workspace-entry-manifest',
    generateBundle(_options, bundle) {
      const urls: string[] = [];
      for (const item of Object.values(bundle)) {
        const fileName = item.type === 'chunk' || item.type === 'asset' ? item.fileName : null;
        if (!fileName) continue;
        if (
          /StudyWorkspace/i.test(fileName)
          || /CognitiveReader/i.test(fileName)
          || /workspace\.worker/i.test(fileName)
        ) {
          urls.push(`/${fileName}`);
        }
      }
      if (urls.length === 0) return;
      this.emitFile({
        type: 'asset',
        fileName: 'workspace-entry-chunks.json',
        source: JSON.stringify(urls),
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.APP_VERSION || process.env.VERCEL_GIT_COMMIT_SHA || `dev-${Date.now()}`),
  },
  plugins: [
    react(),
    tailwindcss(),
    chunkErrorsDevPlugin(),
    workspaceEntryManifestPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Synapse",
        short_name: "Synapse",
        description: "AI study workspace — offline-first ingest, FSRS, institution RBAC",
        theme_color: "#0f0a1e",
        background_color: "#0f0a1e",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
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
  ],
  server: {
    proxy: {
      '/v1': { target: 'http://localhost:8787', changeOrigin: true },
      '/auth': { target: 'http://localhost:8787', changeOrigin: true },
      '/health': { target: 'http://localhost:8787', changeOrigin: true },
    },
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
  },
  optimizeDeps: {
    exclude: ['pyodide'],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  worker: {
    format: 'es',
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('pyodide')) return 'pyodide';
          if (id.includes('mermaid')) return 'mermaid';
          if (id.includes('pdfjs-dist')) return 'pdf';
          if (id.includes('katex')) return 'katex';
          if (id.includes('codemirror') || id.includes('@codemirror')) return 'codemirror';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('react-dom') || id.includes('react/') || id.includes('scheduler')) return 'react-vendor';
          return 'vendor';
        },
      },
    },
  },
});
