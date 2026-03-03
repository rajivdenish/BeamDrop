# Phase 5 Research: Text and Clipboard P2P Tunnels

## Goal
Establish a high-speed text communication and clipboard syncing system using our existing simple-peer WebRTC connections. This supplements massive payload transfers (Phase 4) with zero-friction text/URL sharing natively.

## Technical Analysis

### 1. The P2P Text Channel Structure (Done in Phase 4 Extension)
We already prototyped text sending using standard `JSON.stringify` packets formatted as `{ type: 'text', content: '...' }` sent immediately over the active WebRTC DataChannel via `SimplePeer`. 
* **Benefit**: No new connections needed; low latency.
* **Storage**: Blobs render seamlessly in the RAM Inbox as downloadable `.txt` files containing snippets, plus rendered HTML inline strings using `<div>` formatting.

### 2. Clipboard API Integration (PC Side)
Modern desktop browsers (Chrome, Edge, Firefox) expose the highly capable `Clipboard API`.
* **The 'paste' EventListener**: Applying `window.addEventListener('paste', e => ...)` captures any keyboard `Ctrl+V` commands instantly wherever the user is focused on the page (excluding specialized inputs).
* **Extraction**: Reading `e.clipboardData.getData('text')` allows instant retrieval of massive copied blocks dynamically.
* **Security Context**: The `paste` event works effectively on HTTP `localhost` and HTTPS. Since the Node backend forces self-signed HTTPS or `localhost` access, there are no structural browser blocks for this API!

### 3. Mobile Fallbacks
Mobile devices (iOS, Android Safari/Chrome) severely restrict the `Clipboard API` without user interaction gestures (tapping buttons specifically for copying/pasting). 
* **The Solution**: We already have standard manual text `<input>` and `Send` action buttons attached to the device list. Mobile users will manually paste data seamlessly here to emulate Ctrl+V.
