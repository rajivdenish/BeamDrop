# Architecture Research — Local LAN Browser-Based File Transfer Tool

**Research Type:** Architecture
**Milestone:** Greenfield
**Date:** 2026-03-01
**Status:** Complete

---

## Summary

Local LAN browser-based file transfer tools follow a thin-server / thick-client pattern: a lightweight HTTP server runs on the PC, the phone browser acts as the client, and all transfer happens over the local network without any internet relay. The architecture has four clearly separable components that can be built in sequence with minimal rework.

---

## 1. Component Boundaries

### 1.1 HTTP/WebSocket Server (Node.js on PC)

**Responsibility:** Entry point for all traffic. Serves the browser UI, handles file upload/download routes, manages WebSocket or SSE connections, and writes received data to the local filesystem.

**Key surfaces:**
- `GET /` — serves the single-page client UI (HTML + JS bundle or inline)
- `POST /upload` — receives multipart form data or chunked binary streams from the phone
- `GET /download/:fileId` — streams a file from the PC filesystem to the phone browser
- `GET /events` or `WS /ws` — real-time progress and status channel
- `POST /text` — receives clipboard text snippets

**Boundary:** The server owns the filesystem. Nothing else touches disk. It exposes files and status through its API surface only.

**Technology options:**
- Node.js with Express or Fastify (most common in open-source tools like LocalSend's web mode, LANDrop, and Snapdrop-style tools)
- Bun with its built-in HTTP server (lighter dependency tree)
- The server must listen on `0.0.0.0` (all interfaces), not `localhost`, so LAN devices can reach it

---

### 1.2 Client UI (Browser SPA served by the PC)

**Responsibility:** The phone navigates to `http://<PC-IP>:<port>`. The server responds with a self-contained HTML page (or a small JS bundle). The UI handles:
- File picker / drag-and-drop target
- Text input field for clipboard transfer
- Upload progress display
- Browsable list of files available for download from the PC
- No install required on the phone side

**Boundary:** The client UI is stateless. It only interacts with the server through HTTP/WebSocket calls. It has no direct filesystem access. All state lives either on the server or transiently in browser memory.

**Technology options:**
- Vanilla JS + Fetch API (zero build tooling, easiest to inline into a single HTML file served directly from the Node server)
- Vite + a lightweight framework (React, Svelte, Preact) if the UI grows complex
- For a greenfield tool, starting with a single `index.html` inline is recommended; extract to a bundler only when necessary

---

### 1.3 Transfer Protocol Layer

**Responsibility:** Manages the mechanics of moving bytes between phone and PC. Sits between the client UI and the HTTP server routes.

**Two directions, different mechanics:**

#### Phone → PC (Upload)

**Chunked multipart upload** is the standard approach:
1. Phone browser reads a `File` object via the File API
2. Splits it into fixed-size chunks (typically 1–4 MB each)
3. Sends each chunk as a `POST` with `Content-Range` header or as sequential numbered requests
4. Server reassembles chunks on disk (write to temp file, rename on completion)

**Streaming upload** (single `fetch` with a `ReadableStream` body) is simpler for small files but less reliable for large files on mobile networks where connections drop mid-transfer. Chunk-based upload with retry is more robust.

**Key decision — chunked vs streaming:**
- Use chunked for files over ~20 MB or when you want a progress bar and resume capability
- Use a single streaming POST for simple first version; add chunking as a follow-on
- Multipart form data (`FormData`) is the lowest-friction approach since browsers handle boundary encoding automatically

#### PC → Phone (Download)

The server streams a file from disk using Node.js `fs.createReadStream()` piped to the HTTP response. The phone browser triggers a download via a standard `<a href>` or `window.location` navigation. No websocket needed for this direction.

**Progress for downloads:** Use the `Content-Length` header + the Fetch API's `ReadableStream` reader on the client to track bytes received, if progress display is desired.

---

### 1.4 QR Code Pairing Layer

**Responsibility:** Eliminates manual IP entry. The PC server discovers its own LAN IP at startup, encodes `http://<IP>:<port>` into a QR code, and displays it in the terminal or a local browser tab opened automatically.

**How IP discovery works:**
```js
const { networkInterfaces } = require('os');
const nets = networkInterfaces();
// iterate, filter for IPv4, non-internal, and prefer the 192.168.x.x or 10.x.x.x range
```

**QR code generation options:**
- `qrcode` npm package (outputs to terminal via ASCII art or to a PNG/SVG)
- `qrcode-terminal` (direct terminal rendering, zero browser dependency)
- Render the QR code as an SVG inside the served HTML page itself (useful if user needs to scan from a second device while the terminal is not visible)

**Boundary:** QR generation is a startup concern only. After the phone scans and connects, this component is idle. It does not participate in transfers.

---

## 2. Data Flow

### 2.1 Phone → PC (File Upload)

```
Phone User
  │
  ├── [1] Scans QR code → opens browser at http://192.168.1.x:PORT
  │
  ├── [2] Browser fetches GET / → Node server responds with index.html
  │
  ├── [3] User picks a file via <input type="file">
  │
  ├── [4] JS reads File object, splits into chunks
  │
  ├── [5] For each chunk: POST /upload { chunk, index, totalChunks, fileId, filename }
  │         Content-Type: multipart/form-data or application/octet-stream
  │
  ├── [6] Node server writes chunk to temp file on disk
  │         /uploads/temp/<fileId>/<chunkIndex>
  │
  ├── [7] On final chunk: server reassembles, moves to /uploads/<filename>
  │
  └── [8] Server emits progress event via WebSocket/SSE back to phone UI
              phone UI updates progress bar
```

### 2.2 PC → Phone (File Download)

```
Phone Browser
  │
  ├── [1] Requests GET /files → server returns JSON list of available files
  │
  ├── [2] User taps a filename → browser navigates to GET /download/<fileId>
  │
  ├── [3] Node server: fs.createReadStream(filePath).pipe(res)
  │         with Content-Disposition: attachment; filename="..."
  │         and Content-Length header
  │
  └── [4] Browser saves file to phone Downloads folder natively
```

### 2.3 Text/Clipboard Transfer

```
Phone Browser                          Node Server
  │                                        │
  ├── POST /text { content: "..." }  ────► │
  │                                        ├── stores in memory or writes to clipboard
  │                                        │   (node-clipboardy or similar)
  ◄── 200 OK ──────────────────────────── │

  OR (PC → Phone):
  PC user pastes text into a local web UI
  ├── POST /text from PC browser ───────► │
  │                                        ├── stores in memory, broadcasts via WS/SSE
  ◄── SSE event: { type: 'text', ... } ── │
  phone UI displays received text
```

---

## 3. Suggested Build Order

Dependencies flow upward. Each phase produces something testable before the next begins.

### Phase 1 — Server Skeleton + QR Code (Day 1)

Build first because everything else depends on it:
1. Node.js HTTP server listening on `0.0.0.0:PORT`
2. LAN IP auto-discovery on startup
3. QR code printed to terminal
4. `GET /` returns a minimal `<h1>It works</h1>` page
5. Verify: phone scans QR, browser opens, sees the page

Deliverable: proven LAN connectivity.

### Phase 2 — Client UI Shell (Day 1–2)

Build second because the transfer logic needs a UI surface to test against:
1. Static `index.html` with file picker, text input, and a file list section
2. Served directly from `GET /`
3. No transfer logic yet — just the DOM structure and layout
4. Style minimally (mobile-first, large tap targets)

Deliverable: UI loads on phone, looks usable.

### Phase 3 — Upload (Phone → PC) (Day 2–3)

Build third — this is the primary user story for most tools:
1. `POST /upload` route with multipart parsing (`busboy` or `multer`)
2. Single-file streaming upload first (no chunking) to prove the path
3. Client JS: pick file, send via `fetch` with `FormData`, log response
4. Add progress events via a simple polling `GET /progress/:fileId` or SSE
5. Add chunking only after end-to-end single-file upload works

Deliverable: phone can send a photo to PC filesystem.

### Phase 4 — Download (PC → Phone) (Day 3)

Build fourth — simpler than upload because the browser handles it natively:
1. `GET /files` route returning JSON file listing of the uploads folder
2. `GET /download/:filename` streaming the file with correct headers
3. Client JS: fetch file list, render as clickable links
4. Test: tap a file on phone, it downloads to phone storage

Deliverable: bidirectional file transfer working.

### Phase 5 — Text Transfer (Day 4)

Build fifth — lowest complexity, high utility:
1. `POST /text` stores text server-side
2. `GET /text` retrieves it
3. SSE channel for real-time push from PC to phone
4. Optional: integrate `clipboardy` to read/write PC clipboard automatically

Deliverable: clipboard sync in both directions.

### Phase 6 — Polish (Day 4–5)

1. Error handling (file too large, disk full, connection lost mid-upload)
2. Transfer history / log in the UI
3. Basic security: optional PIN code to prevent unauthorized LAN devices from accessing
4. Packaging: `npm start` one-liner, or pkg/nexe for a standalone binary

---

## 4. Key Technical Decisions

### 4.1 WebSocket vs SSE vs Polling for Progress

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| **Polling** (`setInterval` + `GET /progress`) | Simplest, works everywhere | Latency, wasteful requests | Good for v1 |
| **SSE** (`EventSource`) | Unidirectional push, native browser support, no library | One direction only (server → client), connection limits on HTTP/1.1 | Best for progress/notifications |
| **WebSocket** | Full duplex, low overhead at scale | More setup, no native reconnect | Overkill for this use case |

**Recommendation:** Use SSE for server-to-client progress events (upload progress, file availability notifications). Use plain HTTP for all client-to-server data. Avoid WebSocket for v1 — add it only if bidirectional real-time features become necessary.

### 4.2 Chunked Upload vs Single Streaming Upload

| Approach | Pros | Cons |
|---|---|---|
| **Single stream** | Simple: one `fetch` call, `FormData` | No progress without streaming Fetch, no resume on failure |
| **Chunked** | Progress tracking, retry per chunk, handles large files | More client JS, more server state |

**Recommendation:** Start with single `FormData` POST. Add chunking when file sizes exceed 50 MB or when mobile network instability becomes a user complaint. The server route can be written to accept both formats simultaneously.

### 4.3 File Reassembly Strategy (Chunked Uploads)

Write each chunk to a temp file at `/uploads/.tmp/<fileId>/<index>`. On receipt of the final chunk, concatenate in order to the final path. Use a SHA-256 checksum sent with the final chunk to verify integrity before moving. Delete temp files after reassembly.

### 4.4 Security Considerations

- **No auth by default** is acceptable for a LAN-only tool aimed at personal use
- **Optional PIN** (4–6 digit code shown in terminal, entered in browser) prevents other LAN devices from accessing
- **CORS:** Lock to same-origin or the specific LAN subnet if needed
- **HTTPS:** Self-signed certs add complexity and certificate warning UX friction on phones; HTTP over LAN is acceptable for this threat model. If HTTPS is desired, use `mkcert` and document the one-time trust step

### 4.5 Port Selection

Default to a high, memorable port (e.g., `8899` or `4444`). Check if the port is in use at startup; fall back to a random available port and update the QR code accordingly.

---

## 5. Reference Implementations (Open Source)

These tools use the same architecture pattern and are worth studying:

- **Snapdrop** (github.com/RobinLinus/snapdrop) — WebRTC-based but same server/browser pairing model
- **LocalSend** — has a web-mode REST API that mirrors this architecture exactly
- **FileSend** / **PairDrop** — Node.js + Express, multipart upload, SSE progress
- **qrcp** (github.com/claudiodangelis/qrcp) — Go implementation, same QR + HTTP pattern; excellent reference for the server startup and IP discovery flow

---

## 6. Component Dependency Map

```
QR Pairing Layer
    └── depends on: Server Skeleton (needs IP + port)

Client UI
    └── depends on: Server Skeleton (needs a host to be served from)

Transfer Protocol Layer
    ├── Upload: depends on Client UI (file picker) + Server (POST route)
    └── Download: depends on Client UI (file list) + Server (GET route)

Text Transfer
    └── depends on Transfer Protocol Layer (same SSE channel pattern)
```

Build order follows this dependency graph bottom-up:
**Server → UI → Upload → Download → Text → Polish**

---

## Quality Gate Checklist

- [x] Components clearly defined with boundaries (Section 1)
- [x] Data flow direction explicit (Section 2, separate diagrams for each direction)
- [x] Build order implications noted (Section 3, with explicit phase dependencies)
- [x] Key technical decisions documented with tradeoffs (Section 4)
