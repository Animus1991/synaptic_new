/**
 * Minimal Stanza/spaCy-compatible NER sidecar stub.
 * Run: pip install stanza flask && python server/scripts/ner_sidecar.py
 * Then set NER_SERVICE_URL=http://localhost:8790 in server/.env
 *
 * Production: replace with a proper spaCy/Stanza service behind Docker.
 */
from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = int(os.environ.get("NER_PORT", "8790"))


class Handler(BaseHTTPRequestHandler):
    def do_POST(self) -> None:
        if self.path != "/entities":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length", "0"))
        body = json.loads(self.rfile.read(length).decode("utf-8"))
        text = (body.get("text") or "")[:12000]
        max_n = min(50, int(body.get("max") or 30))
        entities = []
        # Lightweight proper-noun heuristic when Stanza is not installed.
        import re

        for m in re.finditer(r"\b([A-ZΑ-Ω][a-zα-ω]+(?:\s+[A-ZΑ-Ω][a-zα-ω]+){0,2})\b", text):
            term = m.group(1).strip()
            if len(term) >= 4:
                entities.append({"term": term, "kind": "proper", "score": 0.72})
        entities = entities[:max_n]
        payload = json.dumps({"entities": entities}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format: str, *args) -> None:
        return


if __name__ == "__main__":
    print(f"[ner-sidecar] listening on http://127.0.0.1:{PORT}")
    HTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
