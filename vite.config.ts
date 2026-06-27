import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

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

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.APP_VERSION || process.env.VERCEL_GIT_COMMIT_SHA || `dev-${Date.now()}`),
  },
  plugins: [react(), tailwindcss(), chunkErrorsDevPlugin()],
  server: {
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
