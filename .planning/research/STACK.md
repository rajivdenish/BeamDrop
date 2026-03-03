# Stack Research: Web Data Transfer

**Researched:** 2026-03-01
**Domain:** Local LAN browser-based file transfer tool (Node.js PC server, browser client)

---

## Recommended Stack

### Server Runtime

| Choice | Recommendation | Confidence |
|--------|---------------|------------|
| **Node.js 20+ LTS** | ✓ Use this | High |
| Python (aiohttp/FastAPI) | Viable alternative | Medium |
| Go (net/http) | Viable but more complex packaging | Medium |
| Bun | Too new for production reliability | Low |

**Rationale:** Node.js is the clear choice — native `fs.createReadStream()` for streaming downloads, `os.networkInterfaces()` for IP detection, excellent multipart upload libraries, and easily run with `node server.js`. No separate build step.

---

### HTTP Server Framework

| Choice | Recommendation | Confidence |
|--------|---------------|------------|
| **Express 4.x** | ✓ Use this | High |
| Fastify 4.x | Good alternative, marginally faster | High |
| Koa | Less ecosystem support for multipart | Medium |
| Raw `http` module | Too verbose for routing | Low |

**Rationale:** Express is the most familiar, has `multer` for multipart uploads, and has decades of examples. `express@4.18.x` with `multer@1.4.x` covers file uploads cleanly.

---

### File Upload (Phone → PC)

| Choice | Recommendation | Confidence |
|--------|---------------|------------|
| **multer** (multipart/form-data) | ✓ Use this for v1 | High |
| busboy (raw multipart) | More control, more code | Medium |
| tus-node-server (resumable) | Overkill for v1 | Low |

**Rationale:** `multer@1.4.5-lts.1` integrates with Express. For v1, single-shot FormData POST is sufficient. Add chunking (tus protocol) only if large file reliability becomes a problem.

**Libraries:**
```json
"multer": "^1.4.5-lts.1"
```

---

### Real-Time Progress / Events

| Choice | Recommendation | Confidence |
|--------|---------------|------------|
| **Server-Sent Events (SSE)** | ✓ Use this | High |
| WebSocket (ws library) | Overkill — bidirectional not needed | Medium |
| Long polling | Legacy pattern | Low |

**Rationale:** SSE is native browser API, unidirectional server→client push, no library needed client-side. `res.writeHead(200, { 'Content-Type': 'text/event-stream' })`. Upload progress on the client side comes from `XMLHttpRequest.upload.onprogress` or `fetch` with a ReadableStream wrapper — not SSE.

---

### QR Code Generation

| Choice | Recommendation | Confidence |
|--------|---------------|------------|
| **qrcode** (npm) | ✓ Use this | High |
| **qrcode-terminal** (npm) | ✓ Use for terminal display | High |
| qr-image | Unmaintained | Low |

**Rationale:** `qrcode@1.5.x` generates base64 PNG for embedding in the web UI. `qrcode-terminal@0.12.x` prints ASCII QR to the terminal at startup — useful before the browser is open.

**Libraries:**
```json
"qrcode": "^1.5.4",
"qrcode-terminal": "^0.12.0"
```

---

### LAN IP Detection

Use Node.js built-in `os.networkInterfaces()`. No library needed.

**Strategy:**
1. Filter to IPv4 interfaces that are not loopback (`127.x.x.x`) and not internal
2. Prefer the interface whose gateway matches the system default route
3. On Windows, use `ipconfig` output as fallback; on Mac/Linux, `ip route` / `netstat -rn`
4. Expose `--host <ip>` CLI flag for override when auto-detection fails (Docker, VPN, WSL)

---

### Client UI

| Choice | Recommendation | Confidence |
|--------|---------------|------------|
| **Vanilla JS + HTML** | ✓ Use this | High |
| React / Vue | Overkill — adds build step | Low |
| Alpine.js | Viable lightweight option | Medium |
| HTMX | Good for server-rendered updates | Medium |

**Rationale:** A single `public/index.html` with inline or adjacent `app.js` keeps the project dependency-free on the frontend. No bundler, no transpilation, just files served by Express. The UI is simple enough that vanilla JS handles drag-and-drop, progress bars, and clipboard paste cleanly.

**CSS:** Vanilla CSS or a single-file utility like Pico.css (classless, mobile-friendly, ~10KB). No Tailwind/PostCSS build step.

---

### Text / Clipboard Transfer

Use a simple REST endpoint:
- `POST /text` — body: `{ text: string, type: 'text' | 'url' }` → stored in server memory, pushed to connected clients via SSE
- `GET /text` — returns latest text item

No library needed. The `navigator.clipboard` browser API handles reading/writing clipboard on the client.

**HTTPS caveat:** `navigator.clipboard.writeText()` requires a secure context (HTTPS or localhost). On the phone connecting via HTTP over LAN, clipboard write will fail silently. Mitigation: show a text area pre-selected for manual copy as fallback.

---

### Packaging / Distribution

| Choice | Recommendation | Confidence |
|--------|---------------|------------|
| **`node server.js`** | ✓ Use for v1 | High |
| pkg (single executable) | Good for v2 distribution | Medium |
| electron | Too heavy | Low |
| Docker | Adds setup complexity | Low |

**Rationale:** For v1, `node server.js` is sufficient. Users who have Node.js installed (likely on dev machines) can run it directly. For wider distribution, `pkg` or `nexe` can bundle into a single `.exe`.

---

## Final Dependency List (v1)

```json
{
  "dependencies": {
    "express": "^4.18.3",
    "multer": "^1.4.5-lts.1",
    "qrcode": "^1.5.4",
    "qrcode-terminal": "^0.12.0"
  }
}
```

**Zero frontend dependencies.** No bundler, no transpiler, no framework.

---

## What NOT to Use

| Technology | Why Not |
|------------|---------|
| WebRTC (PeerJS, etc.) | Requires STUN/TURN for traversal, browser permission dialogs, more complex than HTTP for LAN |
| Socket.io | Too heavy — SSE is sufficient for one-directional progress |
| tus-js-client / resumable.js | Over-engineered for v1; add only if chunked upload needed |
| Webpack / Vite | No build step needed — vanilla HTML/JS is the goal |
| HTTPS / self-signed certs | Causes connection refusals on mobile without trust installation; stay HTTP for LAN |
| mDNS / Bonjour | Platform-specific, requires elevated permissions on some systems; QR code is simpler |

---

*Stack researched: 2026-03-01*
*Confidence: High — aligns with Snapdrop (Node.js + WS), PairDrop (Node.js), and ShareDrop (Node.js + WebRTC) architectural choices*
