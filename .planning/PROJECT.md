# Web Data Transfer

## What This Is

A PC-hosted local web server that enables instant, browser-based file and data transfer between devices on the same network. Your PC runs the server; any phone or tablet connects by scanning a QR code in their browser — no app installation, no cables, no accounts.

## Core Value

Any device on the same WiFi can transfer files, text, and links to/from your PC by opening a browser and scanning a QR code — zero installation, zero friction.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] PC runs a local server accessible from any browser on the same network
- [ ] PC displays a QR code; phone scans it to connect instantly
- [ ] Files (photos, docs, videos) can be sent from phone to PC
- [ ] Files can be sent from PC to phone/browser
- [ ] Text and clipboard content can be transferred in both directions
- [ ] URLs/links can be shared between devices
- [ ] Drag & drop file transfer supported in the browser UI
- [ ] File picker (button-based) transfer supported as an alternative
- [ ] Works on any phone browser (Chrome, Safari) with no configuration
- [ ] No app installation required on any device

### Out of Scope

- Mobile app (native iOS/Android) — browser-only is the explicit goal
- Cloud relay / internet hosting — local network only for v1
- Auto-sync folder watching — explicit send action is sufficient for v1
- User accounts / authentication — local network trust model
- Transfer history / logging — not needed for core value

## Context

- Replaces common workarounds: emailing files to yourself, USB cables, AirDrop (Apple-only), third-party cloud services
- Target environment: home or office LAN (WiFi), PC as the always-on hub
- The PC server is started manually by the user when needed
- QR code encodes the local IP address and port so the phone browser can find the server

## Constraints

- **Stack**: Browser-based UI; PC server must be runnable without prior dev setup (ideally single executable or `node` command)
- **Network**: Local network only — no internet relay, no port forwarding required
- **Compatibility**: Phone browser must work without any browser extensions or flags

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PC-hosted server (not cloud) | 100% offline, no hosting costs, simpler trust model | — Pending |
| QR code pairing | Fastest zero-typing connection from phone | — Pending |
| Browser-only (no native app) | Eliminates installation barrier entirely | — Pending |

---
*Last updated: 2026-03-01 after initialization*
