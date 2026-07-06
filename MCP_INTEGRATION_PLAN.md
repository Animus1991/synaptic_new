# Synapse MCP Integration — Technical Plan & Data Model

> **Goal.** Let external AI clients (ChatGPT, Claude, Cursor, Codex, Windsurf) talk to Synapse **as the signed-in user**, so a student can query and act on *their own* courses, notes, RAG library and progress from any AI assistant — no copy-paste.
>
> **Grounded in our real backend.** This is built on the existing `server/` (Express + Postgres + JWT auth + RAG), **not** on Lovable's Supabase edge-function template. The MCP work the user saw in Lovable lived in a separate `tanstack_start_ts_current` project and is not reusable here.

---

## 1. Why MCP (plain language)

MCP (Model Context Protocol) is a standard "cable" that connects an AI assistant to an app. Instead of the student opening Synapse, copying a lesson into ChatGPT, and pasting the answer back, the assistant calls Synapse **tools** directly and sees only that user's data (JWT-scoped, same isolation as the web app).

| Student asks their AI assistant | MCP tool called |
|---|---|
| "What courses do I have?" | `list_courses` |
| "Search my library for θερμοδυναμική" | `search_library` (RAG) |
| "Show the outline of my Biology course" | `get_course_outline` |
| "How am I doing? What's weak?" | `get_progress` |
| "Define ‘εντροπία' from my notes" | `list_glossary` |
| "Make 8 quiz questions on chapter 3" | `generate_quiz` |
| "Mark lesson 2 as done" | `mark_lesson_complete` |

---

## 2. Transport & protocol

- **Protocol:** MCP JSON-RPC 2.0. Supported spec version string: `2025-06-18` (also accepts `2025-03-26`).
- **Transport:** **Streamable HTTP** at a single endpoint `POST /mcp`.
  - Requests are JSON-RPC messages (single or batch).
  - For our synchronous tools the server returns `Content-Type: application/json` with the JSON-RPC response directly (spec-permitted alternative to SSE). `GET /mcp` returns `405` (no server-initiated stream needed yet).
- **Methods implemented:** `initialize`, `notifications/initialized` (no-op), `ping`, `tools/list`, `tools/call`.
- **Capabilities advertised:** `{ tools: { listChanged: false } }`.

### Message flow
```
client → initialize                → server: protocolVersion, capabilities, serverInfo
client → notifications/initialized → (no response)
client → tools/list                → server: { tools: [...] }
client → tools/call {name,args}     → server: { content:[{type:'text',text}], structuredContent?, isError }
```

---

## 3. Authentication

- **Now (v1):** **Bearer JWT** — the same access token the web app uses. `POST /mcp` runs through the existing `authenticate` middleware, so `req.account = { id, email, plan }` and every tool is user-scoped exactly like the REST API. External clients that lack native OAuth connect through the `mcp-remote` bridge with an `Authorization: Bearer <token>` header (see §7).
- **Row isolation:** identical to REST — all tools read/write via `accountId`. No cross-user access. Anonymous access follows the server's existing `ALLOW_ANONYMOUS` flag.
- **v2 — BUILT:** full **OAuth 2.1** so ChatGPT/Claude run the consent flow natively (details in §9). Discovery (RFC 9728 + 8414), Dynamic Client Registration (RFC 7591), PKCE S256 authorization-code + refresh grants, a server-rendered consent screen, and a `WWW-Authenticate` challenge on `/mcp`. Scopes: `courses:read`, `library:read`, `progress:read`, `progress:write`, `quiz:generate`.

---

## 4. Tool contract (v1)

All tools are user-scoped and return a human-readable `text` block plus machine-readable `structuredContent`.

| Tool | Input | Reads/Writes | Notes |
|---|---|---|---|
| `echo` | `{ message }` | — | Connectivity check. |
| `list_courses` | `{ status? }` | reads `library.generatedCourses` | id, title, subject, mastery, lessons, exam date, status. |
| `get_course_outline` | `{ courseId }` | reads course topics/lessons | topic → lesson titles + mastery + lock state. |
| `search_library` | `{ query, topK?, courseId? }` | RAG `searchGlobalLibraryGraph` | Graph-RAG over the user's indexed chunks. |
| `get_progress` | `{ courseId? }` | reads courses | overall + per-course mastery, weakest topics, exam countdown. |
| `list_glossary` | `{ search?, courseId?, limit? }` | reads `library.glossaryEntries` | term + definition, filterable. |
| `mark_lesson_complete` | `{ courseId, lessonId }` | **writes** library | flips lesson `status`, recomputes `completedLessons`. |
| `generate_quiz` | `{ courseId?, topic?, count?, lang? }` | RAG + upstream LLM | Grounded MCQ generation; graceful error if no upstream key. |
| `create_flashcard` | `{ courseId, front, back }` | **writes** library | appends to `course.mcpFlashcards`. |
| `add_annotation` | `{ courseId, text, note? }` | **writes** library | appends to `course.mcpAnnotations`. |

**Result shape** (`tools/call`):
```json
{ "content": [{ "type": "text", "text": "..." }],
  "structuredContent": { /* typed payload */ },
  "isError": false }
```

Unknown tool → JSON-RPC error `-32602`. Tool runtime failure → `{ isError: true, content:[{type:'text', text}] }` (per MCP, tool errors are in-band, not protocol errors).

---

## 5. Data model (existing, reused)

- **Account:** `{ id, email, plan }` from JWT (`server/src/middleware/auth.ts`).
- **Library** (`getLibraryAsync(accountId)` → `StoredLibrary`):
  - `generatedCourses: Course[]` — `{ id, title, subject, mastery, totalLessons, completedLessons, examDate, status, topics: Topic[] }`.
  - `glossaryEntries: { term, definition, ... }[]`.
  - `uploadedFiles: UploadedFile[]`.
- **RAG:** `searchGlobalLibraryGraph(accountId, query, { topK, courseId })` → `{ hits, indexedChunks, graphExpanded }`.
- **Upstream LLM:** `upstreamFetch('/chat/completions', body)` (server-side key, metered via `addUsageAsync`).

No schema migrations are required for v1 — MCP is a new *view* over existing stores.

---

## 6. File layout

```
server/src/mcp/
  types.ts     # JSON-RPC + MCP result types
  tools.ts     # tool registry + handlers (pure, store-injectable → testable)
  server.ts    # handleJsonRpc(message, ctx): initialize/tools.list/tools.call/ping
  router.ts    # Express router: POST /mcp (authenticate) → handleJsonRpc
  *.test.ts    # protocol + per-tool + auth + error tests
```
Mounted in `server/src/index.ts` as `app.use(mcpRouter)`; `/health.features.mcp = true`.

---

## 7. Connecting an external client (v1, Bearer)

1. Sign in to Synapse, obtain an access token (`POST /auth/login`).
2. Point the client at the MCP endpoint via the `mcp-remote` bridge:
```jsonc
// Claude Desktop / Cursor mcp config
{
  "mcpServers": {
    "synapse": {
      "command": "npx",
      "args": ["mcp-remote", "https://<host>/mcp", "--header", "Authorization: Bearer <ACCESS_TOKEN>"]
    }
  }
}
```
3. Once published with a public URL + OAuth (v2), ChatGPT/Claude connect natively with the consent flow.

---

## 8. Security & guardrails

- Every tool is `accountId`-scoped; no tool accepts an arbitrary user id.
- `generate_quiz` and `search_library` meter tokens via `addUsageAsync` and respect plan quotas (reuse `enforceQuota` semantics).
- Write tools (`mark_lesson_complete`) validate ownership (course must belong to the account) and are idempotent.
- Payload size and `topK` are clamped. Errors never leak stack traces.

---

## 9. Roadmap / status

- **v1 — DONE:** Streamable-HTTP MCP, Bearer auth, 8 tools, full tests.
- **v2 — DONE:** OAuth 2.1 authorization server for native ChatGPT/Claude connect (no bridge).
  - `GET /.well-known/oauth-protected-resource` (RFC 9728) + `GET /.well-known/oauth-authorization-server` (RFC 8414).
  - `POST /oauth/register` — Dynamic Client Registration (RFC 7591), public PKCE clients.
  - `GET /oauth/authorize` — server-rendered consent screen (login + scope approval).
  - `POST /oauth/authorize/decision` → issues a one-time PKCE authorization code.
  - `POST /oauth/token` — `authorization_code` (S256 PKCE) + `refresh_token` grants; issues the app's JWTs.
  - `/mcp` now returns `WWW-Authenticate: Bearer resource_metadata="…"` on 401 so clients auto-discover the flow.
  - Scopes: `courses:read`, `library:read`, `progress:read`, `progress:write`, `quiz:generate`.
  - Code: `server/src/mcp/oauth/` (`store.ts`, `metadata.ts`, `consent.ts`, `router.ts`) + `router.test.ts` (16 tests).
- **v3 — DONE:** MCP resources, prompts, and write tools.
  - **Resources** (`resources/list`, `resources/read`, `resources/templates/list`): `synapse://library/summary` + `synapse://course/{courseId}`.
  - **Prompts** (`prompts/list`, `prompts/get`): `study_plan`, `explain_weak_areas`, `quiz_me` — each instructs the client to call the grounded tools.
  - **Write tools:** `create_flashcard`, `add_annotation` — persisted per-account in the library payload (`course.mcpFlashcards` / `course.mcpAnnotations`), non-breaking and re-indexed on save.
  - `initialize` now advertises `resources` + `prompts` capabilities.
- **Remaining follow-up:** token-level **SSE streaming** for `generate_quiz` (needs upstream streaming passthrough; current JSON transport is spec-compliant), a client-side reader for `mcpFlashcards`/`mcpAnnotations`, and OAuth client/code persistence in Postgres for multi-instance deploys (currently in-memory).

**Test status:** server suite 157 passing (incl. 58 MCP: tools 25, dispatcher 17, OAuth 16). Client typecheck clean, 1029 client tests passing.
