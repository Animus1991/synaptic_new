/** A4 — Netlify function mirror of POST /__chunk_errors */
export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(null, { status: 405 });
  }
  try {
    const body = await req.text();
    const payload = body ? JSON.parse(body) : {};
    console.info('[synapse] chunk-error beacon', payload);
  } catch {
    /* ignore malformed beacons */
  }
  return new Response(null, { status: 204 });
};
