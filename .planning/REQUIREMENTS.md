# Requirements: Web Data Transfer

**Defined:** 2026-03-01
**Core Value:** Any device on the same WiFi can securely transfer files, text, and clipboard content to your PC — browser-to-browser, no installation, no files touching the server

---

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can register with email and password
- [ ] **AUTH-02**: Admin can generate invite links that auto-approve registration
- [ ] **AUTH-03**: Admin can manually approve pending registrations
- [ ] **AUTH-04**: User session persists across browser sessions (stay logged in)
- [ ] **AUTH-05**: User can log out from any device

### Device Discovery

- [ ] **DISC-01**: First-time device connection uses QR code scanning (phone scans QR shown on PC browser)
- [ ] **DISC-02**: Previously-paired devices on the same LAN appear automatically without re-scanning QR (like Snapdrop)
- [ ] **DISC-03**: Devices are grouped by same network (same public IP / LAN segment) — users only see devices on their current network

### File Transfer

- [ ] **FILE-01**: User can select and send files from phone to PC using a file picker (button)
- [ ] **FILE-02**: User can drag & drop files onto the browser UI to send them
- [ ] **FILE-03**: User can send multiple files in one operation
- [ ] **FILE-04**: User can browse files available from PC and download them to phone
- [ ] **FILE-05**: File data transfers peer-to-peer (WebRTC DataChannel) — files never go through the cloud server
- [ ] **FILE-06**: Transfer progress is shown in real-time during send and receive

### Text & Clipboard

- [ ] **TEXT-01**: User can send text from phone to PC and PC to phone
- [ ] **TEXT-02**: User can paste clipboard content on PC (Ctrl+V shortcut) and it appears on phone instantly

### Compatibility

- [ ] **COMPAT-01**: Works on any phone browser without installation (Chrome Android, Safari iOS)
- [ ] **COMPAT-02**: Works on PC in Chrome, Firefox, Edge

---

## v2 Requirements

### Links / URLs

- **LINK-01**: URL transfer as a first-class type with "Open in browser" button
- **LINK-02**: Paste URL on PC, it appears as a clickable link on phone

### Transfer History

- **HIST-01**: Session-scoped history of sent/received items (files, text) visible in UI
- **HIST-02**: User can clear transfer history

### Enhanced Discovery

- **DISC-04**: Device naming (give your phone/PC a friendly name instead of "Device 1")
- **DISC-05**: Send to specific device when multiple devices are on same network

### Notifications

- **NOTIF-01**: Browser notification on receiving device when a file/text arrives (if tab is in background)

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Files stored on cloud server | Privacy requirement — P2P only, no server storage |
| Cross-network transfer (different WiFi) | LAN-only for v1; relay adds latency, cost, and complexity |
| Native mobile app | Browser-only is the explicit design goal |
| End-to-end encryption (custom) | WebRTC DataChannel is encrypted by spec (DTLS-SRTP); no custom layer needed |
| File manager / remote filesystem browsing | Security surface, out of scope |
| Public registration (open to anyone) | Invite-only to prevent abuse |
| Cloud file relay | Destroys privacy value proposition |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 2 | Pending |
| DISC-01 | Phase 3 | Pending |
| DISC-02 | Phase 3 | Pending |
| DISC-03 | Phase 3 | Pending |
| FILE-01 | Phase 4 | Pending |
| FILE-02 | Phase 4 | Pending |
| FILE-03 | Phase 4 | Pending |
| FILE-04 | Phase 4 | Pending |
| FILE-05 | Phase 4 | Pending |
| FILE-06 | Phase 4 | Pending |
| TEXT-01 | Phase 5 | Pending |
| TEXT-02 | Phase 5 | Pending |
| COMPAT-01 | Phase 6 | Pending |
| COMPAT-02 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0

---
*Requirements defined: 2026-03-01*
*Last updated: 2026-03-01 after roadmap creation — traceability populated*
