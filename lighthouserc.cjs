module.exports = {
  ci: {
    collect: {
      numberOfRuns: 1,
      startServerCommand: 'npx vite preview --host 127.0.0.1 --port 4173',
      startServerReadyPattern: 'Local:',
      startServerReadyTimeout: 120000,
      url: [
        'http://127.0.0.1:4173/',
        'http://127.0.0.1:4173/?view=dashboard',
        'http://127.0.0.1:4173/?demo=1',
      ],
      puppeteerScript: './lighthouse/puppeteer-seed.cjs',
      puppeteerLaunchOptions: {
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
      },
      settings: {
        preset: 'desktop',
      },
    },
    assert: {
      assertions: {
        // Soft regression gates — SPA + CI chrome; fail only on severe drops.
        'categories:performance': ['error', { minScore: 0.35 }],
        'categories:accessibility': ['warn', { minScore: 0.85 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 5000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 8000 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.25 }],
        // SPA + transformers/onnx wasm inflate transfer size; warn-only budget.
        'total-byte-weight': ['warn', { maxNumericValue: 32_000_000 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: '.lighthouseci',
    },
  },
};
