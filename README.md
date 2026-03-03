# ⚡ BeamDrop

**Drop files. They arrive. No cloud.**

A PC-hosted local web server that enables instant, browser-based file and data transfer between devices on the same network. Your PC runs the server; any phone or tablet connects by scanning a QR code — no app installation, no cables, no accounts.

## Quick Start

```bash
npm install
npm start
```

Then scan the QR code shown in the terminal with your phone.

- **PC**: `https://localhost:3000`
- **Mobile**: `http://<your-lan-ip>:3001` (plain HTTP for mobile compatibility)

## Features

- 📱 QR code pairing — scan to connect instantly
- 📁 File transfer (photos, docs, videos) in both directions
- 📋 Text & clipboard sharing
- 🔗 URL/link sharing
- 🖱️ Drag & drop + file picker support
- 💬 Real-time messaging
- 🔒 Self-signed HTTPS for desktop, HTTP fallback for mobile
- ⚡ WebRTC peer-to-peer transfers (fast, no server relay)

## How It Works

1. Start the server on your PC
2. Scan the QR code on your phone (or open the URL manually)
3. Devices pair via Socket.io signaling
4. Files transfer directly via WebRTC (peer-to-peer)

## Tech Stack

- **Backend**: Node.js + Express
- **Real-time**: Socket.io
- **P2P Transfer**: WebRTC (SimplePeer)
- **Frontend**: Vanilla HTML/CSS/JS

## License

ISC
