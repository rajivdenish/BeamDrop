# Features Research — Local LAN Browser-Based File Transfer Tool

**Project:** PC-hosted server, QR code pairing, two-way file/text/link transfer, browser-only, no installation
**Date:** 2026-03-01
**Research Type:** Project Research — Features Dimension
**Milestone:** Greenfield

---

## Competitive Landscape Summary

| Tool | Model | Install | Transfer Types | Platform |
|------|-------|---------|---------------|----------|
| Snapdrop | Browser P2P (WebRTC) | None (visit URL) | Files | Any browser |
| PairDrop | Browser P2P (WebRTC) | None (visit URL) | Files, text | Any browser |
| LocalSend | Native app | Required | Files, text | Desktop + mobile |
| ShareDrop | Browser P2P (WebRTC) | None (visit URL) | Files | Any browser |
| **This project** | PC-hosted server | None (visit URL) | Files, text, links | Browser-only |

Key distinction for this project: **PC-hosted** (not cloud-relay, not peer-served). The PC is the server. Phones connect to it over LAN. This is a different architecture from Snapdrop/PairDrop (which rely on a signaling server and WebRTC) and from LocalSend (native app).

---

## Feature Inventory

### Category 1 — Table Stakes
*Must-have. If missing, users abandon immediately. Zero negotiation.*

---

#### TS-01: File Transfer (PC ↔ Mobile, bidirectional)
**What:** Send files in both directions — phone to PC and PC to phone.
**Why table stakes:** The primary use case. Any tool missing this is not a file transfer tool.
**Complexity:** Medium. Requires chunked upload handling, progress tracking, and a clean download UX on the receiving end.
**Dependencies:** TS-02 (connection must exist first), TS-05 (HTTPS or local HTTP needed for browser file APIs on mobile).
**Notes:** Mobile browsers enforce restrictions on file access without HTTPS. Service workers or careful HTTP handling required for large files.

---

#### TS-02: Automatic Device Discovery / Pairing on LAN
**What:** Devices on the same network find each other without manual IP entry.
**Why table stakes:** The value proposition of every tool in this space is "just works." Manual IP entry is a UX failure. Users expect zero-config discovery.
**Complexity:** Low-medium. Options: mDNS/Bonjour broadcast (good for native apps, unreliable in browsers), QR code (reliable), or both.
**Dependencies:** None — this is the root of all other features.
**Notes for this project:** QR code is the specified pairing mechanism. This is a valid and practical choice that sidesteps mDNS browser limitations entirely.

---

#### TS-03: QR Code Pairing
**What:** PC displays a QR code encoding the local URL (e.g., `http://192.168.x.x:PORT`). Phone scans it to connect.
**Why table stakes (for this project):** This is the specified pairing model. It replaces mDNS discovery. It must work flawlessly — if QR scanning fails or the URL doesn't load, users are stuck.
**Complexity:** Low. Libraries exist (qrcode.js, python-qrcode). The hard part is reliably detecting the correct local IP to encode.
**Dependencies:** TS-02, requires correct LAN IP detection on the host PC.
**Notes:** Must handle multi-NIC systems (WiFi + Ethernet + VPN adapters). Wrong IP = broken QR. Should show the URL as text alongside the QR as fallback.

---

#### TS-04: No Installation Required on Receiving Device
**What:** The phone (or other device) opens a browser URL and everything works. No app install, no plugin, no extension.
**Why table stakes:** This is the core promise of browser-based tools. Breaking it eliminates the primary advantage over LocalSend.
**Complexity:** Low (constraint, not a feature to build — it's a design constraint to preserve).
**Dependencies:** All features must be implementable in standard browser APIs. This eliminates WebRTC datachannel-only approaches that require paired JS on both sides without a server.
**Notes:** Practically means: standard HTTP file upload/download, no special browser flags, works in Safari/Chrome/Firefox on iOS and Android.

---

#### TS-05: Works on HTTP (Local Network, No SSL Certificate Hassle)
**What:** The tool works over plain HTTP on the local network without requiring the user to install self-signed certificates or trust prompts.
**Why table stakes:** Most home users cannot install SSL certificates. HTTPS on LAN requires either self-signed certs (which browsers block or warn on) or a proper CA. This is a known pain point for self-hosted tools.
**Complexity:** Medium-high. Some browser APIs (clipboard, camera for QR scan) require HTTPS or localhost. Must audit which APIs are needed and find workarounds or accept limitations.
**Dependencies:** Affects TS-03 (QR scanning via browser camera requires HTTPS on most mobile browsers), TS-06 (clipboard API).
**Notes:** This is a genuine tension. Options: (1) HTTP only, accept that camera-based QR scanning won't work on mobile (user must manually type URL or use native camera app to scan); (2) Provide a self-signed cert with instructions; (3) Use a localhost tunnel for development only. Most practical: serve HTTP, display QR, let the native phone camera app open the URL — this avoids the HTTPS requirement for QR scanning.

---

#### TS-06: Transfer Progress Indication
**What:** Visual feedback showing transfer progress (percentage, speed, estimated time).
**Why table stakes:** Without progress, users don't know if a transfer is working, hung, or complete. They cancel and retry, causing frustration.
**Complexity:** Low-medium. Standard XMLHttpRequest or fetch with progress events on upload. Download progress is harder in browsers (streaming response required).
**Dependencies:** TS-01.
**Notes:** Upload progress is easy. Download progress requires streaming with known Content-Length headers. Worth implementing properly.

---

#### TS-07: Multiple File Selection
**What:** User can select and send multiple files in one operation.
**Why table stakes:** Single-file-at-a-time is a dealbreaker for most use cases (sending photos, documents, etc.).
**Complexity:** Low. Standard `<input multiple>` or drag-and-drop with multi-file support.
**Dependencies:** TS-01.

---

#### TS-08: Basic Session Management (Who Is Connected)
**What:** Show which devices are currently connected to the server.
**Why table stakes:** Users need to know the transfer will go to the right place. On a family LAN with multiple phones, showing "iPhone 14 (Rajiv)" vs "Samsung Galaxy (Guest)" is essential.
**Complexity:** Low-medium. WebSocket-based presence tracking on the server. Device names from browser user-agent or user-entered name.
**Dependencies:** TS-02.

---

### Category 2 — Differentiators
*Competitive advantage. Not every tool has these. Worth building if they align with the project goal.*

---

#### D-01: Text Transfer (Clipboard Sync)
**What:** Send a text snippet from PC to phone or phone to PC. Appears in a text box, user can copy it.
**Why differentiating:** Snapdrop originally had no text transfer. PairDrop added it. LocalSend has it. Still not universal — many tools are files-only.
**Complexity:** Low. Text is just a small payload sent over the same channel as files. The UX difference (no file picker, just a text box) is minimal to implement.
**Dependencies:** TS-02 (connection), TS-08 (session — text goes to a specific device).
**Value for this project:** High. The spec calls for text transfer. Low complexity, high daily utility (sending URLs, addresses, passwords cross-device).

---

#### D-02: Link Transfer (URL Sharing)
**What:** Send a URL from PC to phone (or vice versa) with a one-tap "Open" button on the receiving end.
**Why differentiating:** A URL is technically just text, but treating it as a first-class type with an "Open in browser" button significantly improves UX. No other tool in this space makes this a dedicated feature — they all treat links as text.
**Complexity:** Very low. URL detection (regex) on text input, render as tappable link on receiver side.
**Dependencies:** D-01.
**Value for this project:** High. Specified in project goal. True differentiator — none of the reference tools do this as a first-class feature.

---

#### D-03: Drag-and-Drop File Upload (on PC side)
**What:** Drag files from desktop onto the browser UI to send.
**Why differentiating:** Not all tools implement this cleanly. It's a power-user feature that dramatically speeds up PC-to-phone transfers.
**Complexity:** Low. Standard HTML5 drag-and-drop API.
**Dependencies:** TS-01.
**Value for this project:** Medium. PC is the server/host — the person at the PC likely transfers frequently. Worth including.

---

#### D-04: Transfer History / Log
**What:** A log of what was transferred in the current session (filename, size, direction, timestamp).
**Why differentiating:** Useful for verifying transfers completed, especially for large batch transfers. Most tools have no history.
**Complexity:** Low-medium. In-memory session log, displayed in UI. No persistence needed (session-only is fine).
**Dependencies:** TS-01, TS-06.
**Value for this project:** Medium. Nice-to-have. Adds polish without significant complexity.

---

#### D-05: Auto-Open / Auto-Copy on Receive
**What:** When a link is received, the browser automatically opens it. When text is received, it's automatically copied to clipboard (with user permission).
**Why differentiating:** Reduces the "receive, tap, copy" flow to zero steps on the receiving end.
**Complexity:** Medium. Clipboard API requires HTTPS or localhost (see TS-05). Auto-open via `window.open()` is blocked by popup blockers unless triggered by a user gesture. Requires careful UX design.
**Dependencies:** D-01, D-02, TS-05 (HTTPS constraint for clipboard).
**Value for this project:** Medium-high. Reduces friction. The HTTPS constraint is the blocker — plan around it.

---

#### D-06: QR Code Displayed Prominently, Always Visible
**What:** The QR code is a first-class UI element — always visible in the main interface, not buried in settings.
**Why differentiating:** Most server-hosted tools hide their connection info. Making QR code the hero element of the UI signals instant pairing as the core UX.
**Complexity:** Very low (UI/UX decision, not an engineering challenge).
**Dependencies:** TS-03.
**Value for this project:** High. This IS the pairing model. Lean into it.

---

#### D-07: Device Nickname / Naming
**What:** Connected devices can set a friendly name ("Rajiv's Phone," "Guest Tablet") visible in the UI.
**Why differentiating:** PairDrop does this. It makes the multi-device experience much clearer.
**Complexity:** Low. Store nickname in sessionStorage, send to server on connect.
**Dependencies:** TS-08.
**Value for this project:** Medium. Useful when multiple devices connect simultaneously.

---

#### D-08: Send to Specific Device (When Multiple Connected)
**What:** When more than one device is connected, the sender can choose which device receives the transfer.
**Why differentiating:** Most tools broadcast to all connected peers or are one-to-one only. Targeted sending is more useful in a household with multiple devices.
**Complexity:** Medium. Requires device selection UI and server-side routing to specific WebSocket connection.
**Dependencies:** TS-08, D-07.
**Value for this project:** High. PC-hosted architecture makes this natural — server knows all connected clients and can route by session ID.

---

#### D-09: Paste-to-Send (PC Side Clipboard Integration)
**What:** User pastes from clipboard into the UI (Ctrl+V) and it is immediately queued for transfer — whether it's text, a URL, or an image.
**Why differentiating:** Dramatically speeds up PC-to-phone transfers. Copy something on PC, Ctrl+V in the app, it appears on the phone.
**Complexity:** Medium. Clipboard API on desktop browsers is well-supported (Ctrl+V event, `navigator.clipboard.read()`). Image paste requires additional handling (Blob → file).
**Dependencies:** D-01, D-02, D-03.
**Value for this project:** High. A workflow that doesn't exist in Snapdrop/PairDrop (which are symmetric P2P). The PC-as-server model enables a "PC is the hub" UX pattern.

---

#### D-10: Persistent Server (Runs as Background Process on PC)
**What:** The PC server runs as a background process (system tray app, or service), not requiring a terminal window to stay open.
**Why differentiating:** Command-line servers require the user to keep a terminal open, which is a UX barrier. A tray app makes the tool feel native.
**Complexity:** High. Requires packaging (Electron, PyInstaller, etc.), OS integration, autostart on login.
**Dependencies:** All server-side features.
**Value for this project:** Medium-high for end users, but high build complexity. This is a v2 feature.

---

### Category 3 — Anti-Features
*Things to deliberately NOT build. Complexity traps, scope creep, or features that undermine the core promise.*

---

#### AF-01: Cloud Relay / Internet Transfer
**What:** Routing transfers through a cloud server when LAN is unavailable.
**Why anti-feature:** Destroys the core value proposition (local, private, fast). Introduces privacy concerns, server costs, latency. Users who need internet transfer should use a different tool (WeTransfer, Google Drive).
**Risk:** Once cloud relay exists, it becomes a support burden. Users complain when it's slow or down.

---

#### AF-02: User Accounts / Authentication
**What:** Login system, user profiles, stored credentials.
**Why anti-feature:** This is a LAN tool. Accounts add complexity, a backend database, password reset flows, and privacy exposure. The LAN itself IS the authentication — if you're on the same network, you're trusted.
**Risk:** Account systems are 10x more work than they appear and create ongoing maintenance burden.

---

#### AF-03: End-to-End Encryption (Custom Protocol)
**What:** Building a custom encryption layer on top of the transfer.
**Why anti-feature:** On a trusted LAN, encryption between devices on the same router is low priority. The complexity of key exchange, certificate management, and debugging encrypted streams is substantial. HTTPS solves this if needed (and adds the TS-05 complications). Don't build a custom protocol.
**Caveat:** Using HTTPS (with self-signed cert) is fine and simple. Building a custom E2E encryption layer is the anti-feature.

---

#### AF-04: File Manager / Browse Remote Filesystem
**What:** Ability to browse the PC's filesystem from the phone and pick files to pull.
**Why anti-feature:** Exposing the PC filesystem to the browser is a significant security surface. It's also complex (file browser UI, permissions, symlink handling). This is a different product (remote file access) not a file transfer tool.
**Risk:** Security nightmare if the server is ever accidentally exposed beyond the LAN.

---

#### AF-05: Persistent File Storage / Server-Side Storage
**What:** Files are stored on the PC server and available for later download.
**Why anti-feature:** This turns the tool into a NAS/file server, which is out of scope. Adds disk management, cleanup, storage limits, and security concerns.
**Exception:** A short-lived buffer (transfer in progress) is fine. Permanent storage is the anti-feature.

---

#### AF-06: Cross-Platform Native App
**What:** Building native apps for iOS, Android, macOS, Windows alongside the browser tool.
**Why anti-feature:** The entire value proposition is browser-only. Native apps require app store review, update mechanisms, platform-specific code, and cost. If the web app is good, native apps are unnecessary.
**Caveat:** A lightweight PC-side server wrapper (tray app) is D-10 and is acceptable as a v2 polish feature. Full native apps on all platforms is the anti-feature.

---

#### AF-07: Chat / Messaging Features
**What:** Real-time chat, message history, emoji reactions.
**Why anti-feature:** This is a file transfer tool, not a messaging app. Chat features attract scope creep and distract from the core transfer experience.
**Risk:** If you build chat, users will compare it to iMessage, WhatsApp, etc. Don't compete in that space.

---

#### AF-08: Folder / Directory Transfer with Recursive Structure
**What:** Drag a folder onto the UI and transfer the entire directory tree, preserving structure.
**Why anti-feature (initially):** Folder transfer in browsers requires the File System Access API (limited browser support, not available in all mobile browsers) or zip-on-the-fly. The complexity is disproportionate to the incremental value over "select multiple files."
**Caveat:** Zip-on-the-fly (server zips a folder and serves it as a download) is acceptable if explicitly requested. Make it a v2 feature.

---

#### AF-09: Bandwidth Throttling / QoS Controls
**What:** Settings to limit transfer speed, prioritize certain transfers, or cap bandwidth usage.
**Why anti-feature:** Overkill for a LAN tool. LAN is fast (typically 100Mbps–1Gbps). No one needs throttling in this context.

---

#### AF-10: Plugin / Extension System
**What:** API for third-party plugins to extend the tool.
**Why anti-feature:** Premature architecture. Plugins require stable APIs, documentation, versioning, and a plugin ecosystem. Build the core tool first.

---

## Dependency Map

```
TS-02 (Discovery/Pairing)
  └── TS-03 (QR Code)
  └── TS-08 (Session Management)
        └── D-07 (Device Naming)
        └── D-08 (Send to Specific Device)

TS-01 (File Transfer)
  └── TS-06 (Progress)
  └── TS-07 (Multi-file)
  └── D-03 (Drag-and-Drop)
  └── D-04 (Transfer History)

D-01 (Text Transfer)
  └── D-02 (Link Transfer)
        └── D-05 (Auto-open on receive)
  └── D-09 (Paste-to-Send)

TS-05 (HTTP vs HTTPS)
  → Affects: TS-03, D-05, D-09 (clipboard API)
```

---

## Recommended Build Order (MVP → v1 → v2)

### MVP (Get to working demo)
1. TS-03 — QR Code display with correct LAN IP
2. TS-04 — Browser-only receiving (no install)
3. TS-01 — File transfer PC → phone (one direction first)
4. TS-01 — File transfer phone → PC
5. TS-06 — Progress indication
6. TS-07 — Multi-file selection
7. TS-08 — Basic session (who is connected)

### v1 (Full project goal)
8. D-01 — Text transfer
9. D-02 — Link transfer with Open button
10. D-06 — QR code as hero UI element
11. D-08 — Send to specific device
12. D-03 — Drag-and-drop on PC side
13. D-09 — Paste-to-send (Ctrl+V)
14. D-07 — Device nickname

### v2 (Polish)
15. D-04 — Transfer history
16. D-05 — Auto-copy/auto-open on receive (needs HTTPS workaround)
17. D-10 — Background process / tray app

---

## Key Technical Tensions to Resolve Before Implementation

| Tension | Options | Recommendation |
|---------|---------|---------------|
| HTTP vs HTTPS | Plain HTTP (simple, limited APIs) vs Self-signed cert (more APIs, trust warnings) | Start with HTTP; use native phone camera for QR scan (not browser camera); revisit HTTPS for v2 |
| LAN IP detection | Auto-detect (unreliable on multi-NIC) vs User-configurable | Auto-detect with fallback to user config; show all candidates |
| Transfer channel | HTTP multipart upload (simple) vs WebSocket streaming (complex) vs WebRTC (overkill without signaling server) | HTTP multipart for files, WebSocket for text/links/presence |
| State architecture | Server-side sessions vs client-side | Server holds session state (it's the PC server); clients are stateless |

---

## Sources

*Research conducted from training knowledge (knowledge cutoff August 2025) covering:*
- Snapdrop (github.com/RobinLinus/snapdrop) — WebRTC P2P, browser-based, files only
- PairDrop (github.com/schlagmichdoch/PairDrop) — Snapdrop fork, adds text transfer, rooms, paired devices
- LocalSend (localsend.org) — Native app, REST + multicast DNS, files + text, cross-platform
- ShareDrop (github.com/ShareDrop/ShareDrop) — WebRTC P2P, files only, Firebase signaling
- General browser API constraints (MDN Web Docs): File API, Clipboard API, Drag-and-drop API, WebSocket
- Browser security model: HTTP vs HTTPS feature gating (camera, clipboard, service workers)
