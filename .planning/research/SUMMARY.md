# Project Research Summary

**Project:** Local LAN Browser-Based File Transfer Tool
**Domain:** Local network file transfer — PC-hosted HTTP server, browser client, QR code pairing
**Researched:** 2026-03-01
**Confidence:** HIGH

## Executive Summary

This is a PC-hosted LAN file transfer tool: a Node.js HTTP server runs on the PC, phones connect via browser after scanning a QR code, and files/text/links transfer bidirectionally over the local network. The domain is well-understood — open-source tools (Snapdrop, PairDrop, qrcp, LocalSend's web mode) have validated this exact architecture. The recommended approach is a thin Node.js/Express server serving vanilla HTML/JS with no frontend build step, using `multer` for uploads, `fs.createReadStream` for downloads, SSE for progress events, and the `qrcode` npm package for QR generation. The entire v1 dependency list is four npm packages.

The architecture follows a clear "server → UI → upload → download → text" build order, where each layer depends on the previous and produces something independently testable. The biggest differentiator for this project over Snapdrop/PairDrop is the explicit PC-as-hub model: the server knows all connected clients, enabling targeted device-to-device routing, paste-to-send from the PC, and first-class URL sharing. These features have low implementation complexity but high daily utility.

The primary risks are all cross-device and invisible during localhost development: Windows Firewall silently blocking inbound LAN connections, QR codes encoding the wrong IP on multi-NIC machines (VPN adapters, Docker bridges, WSL), and iOS Safari's aggressive tab suspension and non-standard download behavior. The mitigation strategy is identical for all: test on a real phone over real Wi-Fi from day one, bind the server to `0.0.0.0` explicitly, and implement smart IP filtering (prefer the interface whose subnet contains the default gateway) before writing any other code.

---

## Key Findings

### Recommended Stack

Node.js 20+ LTS with Express 4.x is the clear choice — it provides native streaming with `fs.createReadStream`, network interface detection with `os.networkInterfaces`, and the best-supported multipart upload library (`multer`). The frontend is intentionally zero-dependency: a single `public/index.html` with vanilla JS and Pico.css (classless, mobile-first, ~10KB). No bundler, no transpiler, no framework. This is the right decision — the UI is simple enough that React or Vue would add build complexity with no benefit.

**Core technologies:**
- **Node.js 20+ LTS**: server runtime — native streaming, filesystem, network interface APIs
- **Express 4.18.x**: HTTP framework — best ecosystem for multipart upload routing
- **multer 1.4.5-lts.1**: file upload parsing — direct Express integration, handles FormData
- **qrcode 1.5.x**: QR generation — base64 PNG for web UI embedding
- **qrcode-terminal 0.12.x**: terminal QR output — useful at startup before browser is open
- **Vanilla JS + HTML**: client UI — no build step, served directly from Express static middleware
- **SSE (native browser API)**: real-time progress — no library needed, unidirectional server push

**What NOT to use:** WebRTC (requires signaling server, overkill for LAN), Socket.io (too heavy vs SSE), self-signed HTTPS (causes mobile browser trust errors), mDNS (platform-specific, QR code is simpler), Webpack/Vite (no build step needed).

### Expected Features

The feature research distinguishes clearly between what users will abandon the tool over (table stakes) and what creates genuine competitive advantage (differentiators).

**Must have (table stakes):**
- Bidirectional file transfer (phone-to-PC and PC-to-phone) — the core use case
- QR code pairing with correct LAN IP — the zero-config connection model
- No installation required on mobile — the primary advantage over LocalSend
- HTTP-only operation (no SSL certificate friction) — prerequisite for mobile adoption
- Transfer progress indication — without this, users assume the transfer is broken
- Multiple file selection — single-file-only is a dealbreaker

**Should have (competitive differentiators):**
- Text transfer and link transfer with one-tap "Open" button — specified in project goal; no competitor treats URLs as a first-class type
- Paste-to-send (Ctrl+V on PC) — unique to PC-as-hub architecture; not possible in Snapdrop/PairDrop's symmetric P2P model
- Send to specific device — server knows all connected clients; natural to implement
- Drag-and-drop on PC side — standard but well-loved
- Device nicknames — essential when multiple phones connect

**Defer (v2+):**
- Background process / system tray app (D-10) — high complexity, needed for non-developer audience
- Auto-copy/auto-open on receive (D-05) — blocked by HTTPS requirement for clipboard API
- Transfer history log (D-04) — polish, not core
- Chunked upload with resume (beyond basic) — add only when >50 MB reliability becomes a complaint

**Anti-features (explicitly do not build):** cloud relay, user accounts, custom E2E encryption, filesystem browser, persistent server-side storage, folder transfer (v1), chat features.

### Architecture Approach

The architecture is a classic thin-server / stateless-client pattern. The Node.js server owns the filesystem exclusively and exposes it through a small HTTP surface. The browser client is stateless — all state lives server-side. Four components with clear boundaries: HTTP/WebSocket Server, Client UI SPA, Transfer Protocol Layer, and QR Pairing Layer. The QR Pairing Layer is a startup concern only — once the phone connects, it is idle. The Transfer Protocol Layer has asymmetric mechanics: phone-to-PC uses multipart POST with FormData (progress via `XMLHttpRequest.upload.onprogress`), PC-to-phone uses `fs.createReadStream` piped to the HTTP response (progress via `Content-Length` header + Fetch ReadableStream reader).

**Major components:**
1. **HTTP Server (Express on `0.0.0.0`)** — serves UI, handles upload/download routes, manages SSE connections, owns filesystem
2. **Client UI (vanilla HTML/JS)** — stateless SPA served by Express; file picker, text input, download list, progress display
3. **Transfer Protocol Layer** — FormData POST for uploads, streaming GET for downloads, SSE for progress events
4. **QR Pairing Layer** — IP discovery at startup, QR generation, terminal + web display; idle after initial connection

### Critical Pitfalls

1. **Server binds to `127.0.0.1` instead of `0.0.0.0`** — trivial one-line mistake, catastrophic effect (all cross-device connections refused). Explicitly bind to `0.0.0.0` and print the bound address at startup. Verify with `netstat`. Must be correct from line one.

2. **Windows Firewall silently blocks inbound LAN connections** — works on localhost, every other device times out. No error shown to user. Print a firewall warning at startup with the exact `netsh` command to add a rule. Test on a fresh Windows machine from a separate device before any real-world usage.

3. **QR code encodes wrong IP on multi-NIC machines** — VPN adapters (Tailscale), Docker bridges (`172.x.x.x`), WSL virtual adapters all present non-LAN IPs that OS treats as "primary." Filter using the routing table (interface whose subnet contains the default gateway). When multiple candidates remain, show all of them. Add `--host` flag for override.

4. **HTTPS vs HTTP tension** — browser clipboard API, camera-based QR scanning, and some fetch behaviors require HTTPS (secure context). But self-signed certs on mobile cause hard certificate errors users cannot bypass. Decision: stay on plain HTTP for v1. Use native phone camera app to scan QR (not browser camera). Accept that clipboard auto-copy on receive requires v2 HTTPS solution.

5. **iOS Safari download behavior** — ignores `Content-Disposition: attachment` for recognized MIME types (PDFs, images open inline). Aggressively suspends background tabs mid-transfer. Requires `application/octet-stream` content type + correct file extension + explicit user warning to keep tab active. Test on real iOS Safari early — emulators do not replicate this behavior.

---

## Implications for Roadmap

Based on research, the architecture's dependency graph maps directly to a 6-phase build order. Each phase is independently testable, produces a concrete deliverable, and avoids the pitfalls identified for that phase.

### Phase 1: Foundation — Server Skeleton, IP Detection, QR Code

**Rationale:** Everything else depends on this. The server must bind correctly, detect the right LAN IP, and display a working QR code before any transfer logic can be tested on real devices. All four critical Phase-1 pitfalls (localhost binding, Windows Firewall, wrong IP, CORS from separate origins) must be resolved here, not retrofitted later.

**Delivers:** A phone can scan the QR code and see a "Hello World" page in its browser. Proven LAN connectivity on real hardware.

**Addresses features:** TS-02 (device discovery), TS-03 (QR pairing), TS-04 (no install required), TS-05 (HTTP-only operation)

**Avoids pitfalls:** PITFALL 1 (HTTPS/HTTP decision locked), PITFALL 2 (Windows Firewall warning at startup), PITFALL 3 (correct IP filtering), PITFALL 5 (CORS eliminated via same-origin serving), PITFALL 7 (explicit `0.0.0.0` binding)

**Stack:** Node.js, Express, `qrcode`, `qrcode-terminal`, `os.networkInterfaces()`

**Research flag:** Standard patterns — skip phase research. `os.networkInterfaces()` and Express static serving are well-documented. IP filtering heuristic (routing table approach) is documented in PITFALLS.md.

---

### Phase 2: Client UI Shell

**Rationale:** Transfer logic needs a real UI surface to test against on mobile. Building UI before transfer routes means the DOM structure, mobile tap targets, and layout are validated on a real phone before any server-side state management is added.

**Delivers:** A mobile-first UI loads on the phone with file picker, text input area, and download list section. No transfer logic — just the shell.

**Addresses features:** D-06 (QR code as hero element), TS-07 (multi-file input), partial D-03 (drag-and-drop target area)

**Avoids pitfalls:** Mobile layout issues discovered early before they compound

**Stack:** Vanilla HTML/JS, Pico.css, no bundler, served via Express static middleware

**Research flag:** Skip research. Vanilla HTML/JS/CSS is standard; Pico.css is straightforward.

---

### Phase 3: Upload (Phone to PC)

**Rationale:** Phone-to-PC is the most common use case and the more complex transfer direction. Getting it right first (with progress) establishes the SSE event channel that text transfer reuses. Start with single-file FormData POST, add chunking only after end-to-end works.

**Delivers:** A photo taken on the phone lands in the PC's uploads folder with a working progress bar.

**Addresses features:** TS-01 (bidirectional file transfer — upload direction), TS-06 (progress indication), TS-07 (multi-file selection)

**Avoids pitfalls:** PITFALL 4 (large file reliability — design chunk-readiness into upload route from start even if chunking is not active in v1), PITFALL 6 (mobile browser behavior — validate FormData upload on real iOS/Android)

**Stack:** `multer`, Express `POST /upload` route, SSE via `res.writeHead(200, {'Content-Type': 'text/event-stream'})`, `XMLHttpRequest.upload.onprogress` on client

**Research flag:** Skip research. multer + FormData upload is thoroughly documented. SSE pattern is standard.

---

### Phase 4: Download (PC to Phone)

**Rationale:** Simpler than upload because the browser handles the save dialog natively. Build after upload so the upload folder already contains test files. The correct headers (`Content-Disposition`, `Content-Type`, `Content-Length`) must be set correctly for iOS Safari.

**Delivers:** Full bidirectional file transfer. A file queued on the PC can be tapped and saved to the phone.

**Addresses features:** TS-01 (bidirectional — download direction), TS-06 (download progress via Content-Length + ReadableStream)

**Avoids pitfalls:** PITFALL 6 (iOS download behavior — `Content-Disposition: attachment`, `application/octet-stream`, correct extensions), PITFALL 9 (popup blockers — use direct `<a href>` anchor links, not JavaScript-triggered downloads)

**Stack:** `fs.createReadStream().pipe(res)`, Express `GET /download/:filename` route, `GET /files` JSON listing route

**Research flag:** Skip research. Node.js streaming response is standard. iOS Safari behavior documented in PITFALLS.md.

---

### Phase 5: Text and Link Transfer

**Rationale:** Lowest implementation complexity, highest daily utility. Reuses the SSE channel established in Phase 3. URL as a first-class type (with "Open" button) is the key differentiator vs. all reference tools — this is where the project earns its identity.

**Delivers:** Copy a URL on the PC, send it to the phone with one click, phone sees an "Open" button. Clipboard sync in both directions.

**Addresses features:** D-01 (text transfer), D-02 (link transfer with Open button), D-09 (paste-to-send with Ctrl+V on PC), partial D-05 (auto-copy on receive where clipboard API available)

**Avoids pitfalls:** PITFALL 1 (clipboard API requires secure context — on HTTP, show pre-selected text area as manual copy fallback)

**Stack:** `POST /text` and `GET /text` REST endpoints, SSE broadcast, `navigator.clipboard` (with fallback), `window.open()` for URL opening

**Research flag:** Skip research. Standard patterns. The HTTPS/clipboard limitation is documented and the fallback (pre-selected text area) is well-understood.

---

### Phase 6: Polish — Multi-Device Routing, Drag-and-Drop, Device Naming

**Rationale:** Add the differentiating UX features that elevate this beyond a proof of concept. Device targeting requires server-side session tracking (which Phase 3's SSE connection already provides). Drag-and-drop and paste-to-send are PC-side enhancements that don't affect the server.

**Delivers:** A household with 3 phones can all connect simultaneously, and the PC user can route a file to the right device. Drag files from the desktop or paste from clipboard directly into the app.

**Addresses features:** TS-08 (session management), D-07 (device nicknames), D-08 (send to specific device), D-03 (drag-and-drop), D-09 (paste-to-send)

**Avoids pitfalls:** PITFALL 8 (network interface changes — detect and update QR/IP display in this phase)

**Stack:** In-memory session map keyed by SSE connection, `sessionStorage` for device nickname, HTML5 Drag-and-Drop API, `navigator.clipboard.read()` for paste

**Research flag:** Session routing on the server may benefit from brief research into SSE connection lifecycle management. All other patterns are standard.

---

### Phase Ordering Rationale

- **Foundation first** because the four critical pitfalls (localhost binding, firewall, IP detection, CORS) must be solved before any other feature is testable on real hardware. Retrofitting these later costs far more than getting them right first.
- **Upload before download** because upload is the more complex direction (multipart parsing, progress tracking, temp file reassembly) and establishes the SSE channel reused throughout.
- **Text/links after bidirectional file transfer** because the feature reuses existing infrastructure (SSE channel, session model) and layering it on a proven foundation is lower risk.
- **Polish last** because device targeting, drag-and-drop, and paste-to-send are additive enhancements that don't restructure existing code.
- **No phase requires a protocol change** to add the next phase — each phase extends rather than replaces previous work.

### Research Flags

Phases with standard patterns (skip `/gsd:research-phase`):
- **Phase 1:** IP detection, Express setup, QR code — all well-documented; pitfall mitigations are explicit in PITFALLS.md
- **Phase 2:** Vanilla HTML/JS UI — no research needed
- **Phase 3:** multer + SSE upload progress — thoroughly documented
- **Phase 4:** Node.js streaming download + iOS header requirements — documented in PITFALLS.md
- **Phase 5:** Text/link transfer via REST + SSE — standard patterns

Phases that may benefit from targeted research during planning:
- **Phase 6:** SSE connection lifecycle for multi-device session routing — the specifics of managing per-connection state and cleaning up disconnected clients may warrant a brief research spike, particularly around iOS Safari's handling of SSE reconnects.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Aligns with multiple open-source reference implementations (Snapdrop, PairDrop, qrcp). Specific library versions verified. Four-package dependency list is well-scoped. |
| Features | HIGH | Competitive landscape is well-mapped. Feature categorization is grounded in known limitations of reference tools. Anti-features are explicit and reasoned. |
| Architecture | HIGH | Build order validated by dependency graph analysis. Component boundaries are clean. Data flow diagrams for both transfer directions are specific and implementable. |
| Pitfalls | HIGH | Pitfalls are grounded in documented browser behavior (MDN), known open-source tool issues, and OS-specific behavior (Windows Firewall, iOS Safari). Phased mitigation strategy is actionable. |

**Overall confidence: HIGH**

### Gaps to Address

- **Clipboard API on HTTP (mobile):** The HTTPS requirement for `navigator.clipboard.writeText()` means auto-copy on receive will not work over HTTP on mobile. The fallback (pre-selected text area) is documented but the exact UX flow for phone-side text receipt needs design attention during Phase 5 planning.

- **iOS Safari SSE reconnection behavior:** iOS aggressively suspends tabs. How SSE connections behave when the tab is backgrounded or the screen locks on iOS needs empirical testing in Phase 3 — may require a heartbeat/keep-alive ping to prevent silent disconnection.

- **Multi-NIC IP selection edge cases:** The routing-table heuristic (prefer interface whose subnet contains the default gateway) handles VPN and Docker adapters well, but enterprise networks with multiple active LAN interfaces (Ethernet + Wi-Fi both on the corporate LAN) may still present ambiguity. The `--host` override flag is the escape hatch, but the startup output when multiple candidates exist needs UX design attention.

- **Windows Firewall programmatic detection:** Detecting whether an inbound firewall rule exists (to decide whether to show the warning) requires running `netsh` at startup. This is feasible but the exact command and parsing logic needs validation on Windows 10/11 in Phase 1.

---

## Sources

### Primary (HIGH confidence)
- Snapdrop (github.com/RobinLinus/snapdrop) — WebRTC P2P reference; same server/browser pairing model
- PairDrop (github.com/schlagmichdoch/PairDrop) — Snapdrop fork with text transfer and device naming
- LocalSend (localsend.org) — REST API + multicast DNS; web-mode mirrors this architecture
- ShareDrop (github.com/ShareDrop/ShareDrop) — WebRTC P2P; files only
- qrcp (github.com/claudiodangelis/qrcp) — Go implementation; same QR + HTTP pattern; IP discovery reference
- MDN Web Docs — File API, Clipboard API, Drag-and-Drop API, SSE EventSource, Fetch ReadableStream

### Secondary (MEDIUM confidence)
- Browser security model documentation — HTTP vs HTTPS feature gating (camera, clipboard, service workers)
- iOS Safari and Android Chrome behavioral differences — browser compatibility tables as of 2025
- wormhole-william browser client — chunked transfer patterns

### Tertiary (LOW confidence / needs empirical validation)
- iOS Safari SSE reconnection behavior under tab suspension — requires testing on real device
- Windows Firewall `netsh` detection command parsing — requires testing on fresh Windows 10/11 install
- Multi-NIC routing-table heuristic edge cases on enterprise networks — untested configuration

---
*Research completed: 2026-03-01*
*Ready for roadmap: yes*
