# Phase 3: Device Discovery - Research

## What do I need to know to PLAN this phase well?

### 1. WebRTC Signaling Server Implementation
- **Requirement:** Devices must discover each other and set up a P2P channel later. The server needs to act as a WebRTC signaling server.
- **Implementation:** `socket.io` is perfect for real-time signaling. The server will maintain connected clients. Since devices are grouped by the same network, we should use the client's IP address (derived from the socket connection) to partition them into "rooms" representing their LAN segment. 
- Because we want to support previously-paired devices automatically appearing, we can store a persistent "Device ID" in `localStorage` on the frontend. When a device connects via socket, it sends its `deviceId`.

### 2. QR Verification & Pairing
- **Requirement:** First-time device connection uses a QR code.
- **Implementation:** The QR code on the PC should encode a secure pairing token in the URL: `http://<LAN_IP>:<PORT>/pair?token=<XYZ>`. 
- When the mobile device scans and opens it, the backend validates the token. If valid, it establishes the WebRTC link using `socket.io`. 

### 3. Session / Auto-Discovery (Returning Devices)
- **Requirement:** Returning devices on the same network appear automatically.
- **Implementation:** The UI will store the `deviceId` and `paired` state in `localStorage`. 
- Upon opening the site on the same network, the client connects to `socket.io` with its `deviceId`. The server sees the IP address of the socket, maps it to the existing network room, and broadcasts `device_joined` to other devices in that room. The PC (which is already in that room) will immediately see the phone appear in the UI.

### 4. Grouping by Public IP (LAN Segment)
- **Requirement:** Users only see devices on their current network.
- **Implementation:** Express/Socket.io's `socket.handshake.address` will provide the remote IP.
  - If connecting via localhost, the IP is `::1` or `127.0.0.1`.
  - If connecting via LAN, the IP is `192.168.x.x` etc.
  - We can use this `remoteFamily` or string as the distinct "Room ID" in Socket.io. Devices with the same remote IP are automatically bucketed into the same room.

## Validation Architecture
- **Step 1:** Establish a Socket.io server and view terminal logs showing devices connecting.
- **Step 2:** Test the QR pairing flow — accessing the site with a token pairs the device.
- **Step 3:** Refresh the page on an already paired device (without the token) and confirm it auto-discovers and broadcasts its presence to the PC.

## RESEARCH COMPLETE
