# PITFALLS — Local LAN Browser-Based File Transfer Tool

**Research Type:** Pitfalls — Domain-specific mistakes and gotchas
**Date:** 2026-03-01
**Milestone:** Greenfield — Pre-build research
**Domain:** Local network, browser-based file transfer (HTTP server, QR code, mobile browsers)

---

## Summary

Local LAN file transfer tools appear simple but fail in practice on real devices due to a cluster of well-known pitfalls. Most are invisible during localhost development and only surface when a phone tries to connect. The pitfalls fall into six categories: HTTPS/mixed-content, firewall, IP detection, large file reliability, CORS, and mobile browser behavior.

---

## PITFALL 1 — HTTPS / Mixed Content Blocks on Mobile Browsers

### What Goes Wrong
Modern browsers (Chrome 80+, Firefox, Safari) block "mixed content" — a page served over HTTPS trying to load or communicate with HTTP resources. More critically, some browser APIs required for file transfer (clipboard access, certain `fetch()` behaviors, `SharedArrayBuffer`) require a **secure context** (HTTPS or localhost). When your server runs plain HTTP, mobile browsers may silently fail or show cryptic errors instead of useful ones.

Conversely, if you add self-signed HTTPS to solve this, iOS Safari and Android Chrome will block the connection entirely with a certificate error that has no "proceed anyway" option accessible to a regular user — it requires navigating through multiple warning screens that most users will abandon.

### Warning Signs (Early Detection)
- Works on desktop localhost, fails silently on mobile
- File download starts but the browser shows 0 bytes received
- `fetch()` calls to the server return network errors in mobile DevTools
- Users report "connection refused" on HTTP URLs from Android Chrome
- iOS Safari shows "Safari cannot open the page" with no further detail

### Prevention Strategy
- **Default to plain HTTP** for LAN-only tools. The threat model for a local network is not the same as the public web; HTTP is acceptable and expected.
- **Never mix protocols.** If you serve the UI page over HTTP, all API calls must also be HTTP. Never redirect to HTTPS from an HTTP LAN server.
- Do not use browser APIs that require a secure context unless you are prepared to implement a full self-signed certificate flow with user instructions for each OS/browser combination.
- If HTTPS is needed: use `mkcert` to generate a locally-trusted certificate and document the one-time installation step per device. Do not use self-signed certs without a trust installation step.

### Phase to Address
Phase 1 (Foundation) — Server protocol choice must be locked in before any UI is built. Retrofitting HTTPS later breaks everything.

---

## PITFALL 2 — Windows Firewall Blocks the Server Port

### What Goes Wrong
When a Node.js, Python, or Go process binds to a port (e.g., 8080) on Windows, the Windows Defender Firewall will either (a) silently block inbound connections from other devices on the LAN, or (b) show a one-time UAC-style dialog asking if the app should be allowed through. If the user clicks "Cancel" or "Block", the rule is saved and the server will never be reachable from other devices — with no error shown to the user and no indication the server is running fine locally.

The tool appears to work perfectly when tested from the same machine (localhost bypasses the firewall) but every other device on the network gets a connection timeout.

### Warning Signs (Early Detection)
- Server starts successfully, QR code displays, but phones time out connecting
- `curl http://[machine-ip]:8080` from another PC on the LAN hangs
- Windows Security shows the process has "blocked" network access in the firewall log
- No firewall dialog was shown at first launch (common when running as a non-elevated process)

### Prevention Strategy
- **Document the firewall step explicitly** in the tool's startup output. Print a message like: "If other devices can't connect, allow this app through Windows Firewall."
- **Detect and warn at startup:** attempt a loopback connectivity check and separately try to detect if the process has an inbound firewall rule. Use `netsh advfirewall firewall show rule` or equivalent to check.
- **Provide a one-click fix command** in the startup output: print the exact `netsh` command to add the firewall rule, or provide a small PowerShell snippet the user can run.
- Do not attempt to programmatically add firewall rules without explicit user consent — this requires elevation and is a security-sensitive action.
- Test the tool specifically on a Windows machine that has never run it before, from a different device on the LAN.

### Phase to Address
Phase 1 (Foundation) — Must be addressed in the server startup logic before any user testing. Cannot be discovered late.

---

## PITFALL 3 — QR Code Shows Wrong IP on Multi-Interface Machines

### What Goes Wrong
Most machines have multiple network interfaces: loopback (`127.0.0.1`), Ethernet, Wi-Fi, VPN adapter (Tailscale, WireGuard, etc.), WSL virtual adapter, Docker bridge network, and sometimes Bluetooth PAN or USB tethering. Naively picking the first non-loopback IP address — or using the OS's reported "primary" interface — frequently returns a VPN address, a Docker subnet address, or a WSL bridge address instead of the actual LAN Wi-Fi/Ethernet IP.

The QR code then encodes an IP that is unreachable from the phone, and users see a connection timeout with no explanation.

### Warning Signs (Early Detection)
- QR code URL uses a `10.x.x.x` address that is actually a VPN range, not LAN
- QR code URL uses `172.x.x.x` (Docker bridge) or `192.168.x.x` from a different subnet than the phone
- Phone scans QR code and times out immediately
- Running `ipconfig` (Windows) or `ip addr` (Linux) shows 4+ network interfaces
- User has Tailscale, Docker Desktop, or any VPN software installed

### Prevention Strategy
- **Do not rely on a single "primary" IP detection heuristic.** Enumerate all interfaces, filter for those that are up and non-loopback, then apply a priority order: prefer the interface whose subnet contains the machine's default gateway.
- **Use the routing table to find the correct interface.** On Windows, `route print` or `Get-NetRoute -DestinationPrefix 0.0.0.0/0` gives the default gateway interface. This is the most reliable heuristic for "the interface connected to the LAN."
- **When multiple valid LAN interfaces exist, show all of them** in the startup output with labeled URLs. Let the user pick or scan the right one.
- **Add a `--host` / `--interface` flag** so users can pin the server to a specific IP. Document this prominently.
- **Filter out known non-LAN ranges:** `10.x.x.x` VPN ranges (but note Tailscale uses `100.x.x.x`), `172.16-31.x.x` Docker ranges, `169.254.x.x` APIPA addresses.

### Phase to Address
Phase 1 (Foundation) — IP detection logic must be correct before QR code generation is built. The QR code feature is useless if it encodes the wrong IP.

---

## PITFALL 4 — Large File Transfer Reliability

### What Goes Wrong
Single-request HTTP transfers of large files (1 GB+) fail unpredictably due to: TCP timeouts on idle connections, browser fetch/XHR timeouts, memory exhaustion from buffering entire files in JavaScript, Wi-Fi signal drops that kill the connection midway, and browser tab backgrounding on mobile (iOS aggressively suspends background tabs, killing active connections).

On the server side, streaming a large file in one response is generally fine — the problem is on the receiving end. Browsers have per-tab memory limits. A 4 GB file cannot be assembled in-memory in a browser `Blob` without crashing the tab.

On the sending side (phone uploading to server), `multipart/form-data` uploads with large files block the entire upload in a single request. If the connection drops at 90%, the entire file must be re-uploaded.

### Warning Signs (Early Detection)
- 500 MB+ transfers fail midway with no error message, just a stalled progress bar
- iOS Safari kills the download after screen lock or tab switch
- Android Chrome shows "Download failed" for files over 2 GB
- Server memory usage climbs linearly with file size (buffering in memory)
- Upload fails at exact same point repeatedly (Wi-Fi dead zone mid-transfer)

### Prevention Strategy
- **Stream files from the server** using HTTP range requests (`Content-Range`, `Accept-Ranges: bytes`). This allows resume and reduces memory pressure.
- **Use chunked upload on the sender side.** Split files into 5–50 MB chunks on the client before uploading. Send each chunk as a separate request. Implement a simple resume protocol (check which chunks the server has received).
- **Set appropriate `Content-Disposition: attachment` headers** on download responses. Without this, some browsers try to display files inline, loading the entire file into memory.
- **Use `ReadableStream` / `TransformStream` on the client** to pipe downloaded data directly to disk via the File System Access API (where available) rather than assembling a Blob.
- **Show chunk-level progress**, not just total bytes, so the user knows the transfer is alive.
- **Keep-alive and timeout tuning:** set server-side timeouts generously (30+ minutes for large files). Do not set aggressive idle connection timeouts.
- **For iOS Safari:** warn users to keep the screen on and the tab active during transfers. iOS will suspend background tabs and kill active network connections.

### Phase to Address
Phase 2 (Core Transfer) — Must be designed in from the start of transfer implementation. Adding chunked upload/download later requires a protocol change.

---

## PITFALL 5 — CORS Issues When UI Is Served from a Different Origin

### What Goes Wrong
If the web UI is served from a different origin than the API server (different port, or a bundled frontend served from a CDN/file:// URL), browsers enforce CORS. The API requests from the UI are blocked unless the server responds with correct `Access-Control-Allow-Origin` headers.

This is not an issue when the same server serves both the HTML and the API, but it becomes one when:
- The UI is served on port 3000 (dev server) and the API is on port 8080
- The UI is an Electron or Tauri app making requests to a local HTTP server
- Someone opens the HTML file directly from disk (`file://`) and tries to connect to the server

The symptom is a CORS error in the browser console, which is clear on desktop but harder to diagnose on mobile without DevTools access.

### Warning Signs (Early Detection)
- Browser console shows `Access to fetch at 'http://...' from origin 'null' has been blocked by CORS policy`
- Works in one browser/config, fails in another
- All API requests fail during development with a separate frontend dev server

### Prevention Strategy
- **Serve the UI from the same server as the API.** The file transfer server should serve the HTML/JS/CSS bundle as static files on the same port. This eliminates CORS entirely.
- **If CORS is needed for development:** add permissive `Access-Control-Allow-Origin: *` headers during dev only. Never rely on this for production behavior.
- **Do not open HTML files from the filesystem (`file://`) and expect them to make `fetch()` calls to a local server.** The `null` origin from `file://` URLs is blocked by most CORS policies.
- **Test with the exact same origin setup** the production build will use, not just the dev server setup.

### Phase to Address
Phase 1 (Foundation) — Server architecture must be decided upfront. Same-origin serving eliminates this class of problem entirely.

---

## PITFALL 6 — Mobile Browser Download Behavior Differences

### What Goes Wrong
Mobile browsers handle file downloads very differently from desktop browsers, and from each other:

**iOS Safari:**
- Cannot download arbitrary binary files to the Files app without specific MIME type handling
- PDFs and images open inline by default, ignoring `Content-Disposition: attachment`
- Files without a recognized extension may be rejected or opened in-browser
- No support for the File System Access API (as of 2025) — cannot stream-write to disk
- Background tabs are aggressively killed, interrupting in-progress downloads
- Large files (over a few hundred MB) may fail silently
- Safari's download manager does not retry failed downloads

**Android Chrome:**
- Generally more permissive than iOS Safari
- Supports the File System Access API in newer versions
- Downloads go to the system Downloads folder; no user-selectable path by default
- Some Android OEMs have modified Chrome behavior for downloads

**General Mobile:**
- No concept of "Save As" dialog for programmatic downloads (data URIs, Blob URLs)
- `<a download="filename">` attribute is the most reliable cross-browser download trigger
- `application/octet-stream` MIME type is the safest for triggering a download rather than inline display

### Warning Signs (Early Detection)
- Files open in browser instead of downloading on iOS
- Download completes on Android but file is corrupt or wrong extension
- Progress bar reaches 100% on iOS but file is not in Files app
- Zip files download fine but JPEGs open in browser instead

### Prevention Strategy
- **Always set `Content-Disposition: attachment; filename="..."` header.** This is the most reliable signal to the browser that the response should be downloaded, not displayed.
- **Set `Content-Type: application/octet-stream` for unknown or binary file types.** For known types (PDF, image), the browser may override the disposition header — test explicitly.
- **For iOS Safari downloads,** ensure the filename has a correct extension. iOS uses the extension to determine which app handles the file. Missing extensions cause silent failures.
- **Do not use data URIs for large files.** `<a href="data:...">` triggers in-memory encoding of the entire file and crashes the browser tab on mobile for files over ~50 MB.
- **Prefer server-side streaming downloads** over client-side Blob URL downloads. A direct link to the server endpoint (`<a href="/download/file.txt">`) is the most reliable cross-platform download mechanism.
- **Test explicitly** on: iOS Safari 17+, Android Chrome, Samsung Internet. These have the most distinct behaviors.
- **Warn users on iOS** that large file downloads require keeping the screen on and the Safari tab in the foreground.

### Phase to Address
Phase 2 (Core Transfer) — Must be tested on real devices early. Emulators do not replicate mobile download behavior accurately.

---

## PITFALL 7 — Server Binds to Localhost Only, Not LAN Interface

### What Goes Wrong
Many HTTP server frameworks and examples bind to `127.0.0.1` (localhost) by default. A server bound only to localhost accepts connections from the same machine only. Connections from other LAN devices are refused. This is a trivially easy mistake that is invisible during local testing and causes complete failure on real devices.

Common in: Node.js `http.createServer().listen(8080)` without a host argument (actually binds to all interfaces — this is fine), but explicitly passing `'localhost'` or `'127.0.0.1'` breaks LAN access.

### Warning Signs (Early Detection)
- Phone gets "connection refused" immediately (not timeout)
- `netstat -an | grep 8080` shows `127.0.0.1:8080` instead of `0.0.0.0:8080`
- Works from the host machine browser, fails from every other device

### Prevention Strategy
- **Explicitly bind to `0.0.0.0`** (all interfaces) in the server listen call. Document this as intentional.
- **Print the bound address at startup** so it is visible in the output: `Listening on 0.0.0.0:8080 (all interfaces)`.
- **Verify with `netstat`** during development that the server is bound to `0.0.0.0`, not `127.0.0.1`.

### Phase to Address
Phase 1 (Foundation) — Single line fix, but must be correct from day one.

---

## PITFALL 8 — No Graceful Handling of Network Interface Changes

### What Goes Wrong
If the user starts the server while on one Wi-Fi network, then moves to a different network (or Wi-Fi reconnects), the server's IP address changes but the server is still running and still bound to the old IP. The QR code now encodes a stale IP. New devices cannot connect and existing transfers are interrupted silently.

### Warning Signs (Early Detection)
- Server starts fine, QR code is shared, then Wi-Fi drops and reconnects — new devices can't connect
- IP address shown at startup differs from current `ipconfig` output
- User unplugs Ethernet and switches to Wi-Fi mid-session

### Prevention Strategy
- **Detect network interface changes** using OS events (Node.js `os.networkInterfaces()` polling, or OS-level network change notifications) and update the displayed IP and QR code.
- **Re-generate and display the QR code** when the IP changes, with a visual indicator that the connection information has changed.
- **Warn users** in the UI and CLI output if the IP has changed since startup.
- **For simplicity:** bind to `0.0.0.0` so the server continues to accept connections on the new IP without restart; only the displayed/QR-coded URL needs updating.

### Phase to Address
Phase 2 (Core Transfer) — Can be deferred until basic transfer works, but should be addressed before any real-world usage.

---

## PITFALL 9 — Browser Popup Blockers Intercept Programmatic Downloads

### What Goes Wrong
When a file download is triggered programmatically (creating a hidden `<a>` element and calling `.click()`) rather than by direct user interaction, some browsers (especially Safari) treat this as a popup and block it. The download silently fails with no error message to the user.

This pattern is common for "download all files as zip" buttons that generate the download URL dynamically after an API call.

### Warning Signs (Early Detection)
- "Download" button works on Chrome desktop, silently fails on Safari
- No download dialog appears after clicking the button on iOS
- Browser console shows `SecurityError: Not allowed to open a window or a tab`

### Prevention Strategy
- **Trigger downloads directly from user gesture handlers.** Do not interpose an async API call between the user's click and the download initiation. If an API call is needed, pre-compute the download URL and use a direct `<a href="...">` link.
- **Use direct anchor links** (`<a href="/download/file" download>`) instead of JavaScript-triggered downloads wherever possible.
- **For dynamically generated downloads,** open the download URL in a new tab with `window.open()` called synchronously in the click handler (before any `await`).

### Phase to Address
Phase 2 (Core Transfer) — Test on Safari early. This is a common late-discovery bug.

---

## Priority Summary

| # | Pitfall | Severity | Discovery Risk | Phase |
|---|---------|----------|----------------|-------|
| 1 | HTTPS/Mixed Content | Critical | Late (only on mobile) | Phase 1 |
| 2 | Windows Firewall | Critical | Late (only cross-device) | Phase 1 |
| 3 | Wrong IP in QR Code | High | Late (only on real devices) | Phase 1 |
| 7 | Server binds to localhost only | Critical | Late (only cross-device) | Phase 1 |
| 4 | Large file reliability | High | Medium (size-dependent) | Phase 2 |
| 5 | CORS issues | Medium | Early (dev server) | Phase 1 |
| 6 | Mobile download behavior | High | Late (only on mobile) | Phase 2 |
| 8 | Network interface changes | Medium | Late (real usage) | Phase 2 |
| 9 | Popup blocker blocks downloads | Medium | Late (Safari-specific) | Phase 2 |

---

## Cross-Cutting Recommendation

**Test on a real phone over real Wi-Fi from day one of development.** Every pitfall in this document is invisible during localhost development and only surfaces on actual devices. Set up a simple test protocol: server starts on Windows machine, phone on same Wi-Fi, scan QR code, transfer a 100 MB file. Run this test at the end of every significant change. Do not rely on browser DevTools device emulation for network behavior — it does not emulate LAN topology, firewall rules, or mobile download APIs accurately.

---

*Research basis: common patterns from open-source LAN transfer tools (snapdrop, LocalSend, FileSend, wormhole-william browser client), browser compatibility documentation, MDN Web Docs, known iOS Safari and Android Chrome behavioral differences as of 2025.*
