/**
 * A4 — Static-hosting ingest for chunkErrorReporter beacons (Vercel serverless).
 * POST /__chunk_errors → 204 No Content
 */
export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }
  try {
    // eslint-disable-next-line no-console
    console.info('[synapse] chunk-error beacon', req.body ?? {});
  } catch {
    /* logging must never fail the ingest */
  }
  res.status(204).end();
}
