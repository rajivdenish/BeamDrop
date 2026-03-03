# Phase 1: Foundation - Research

## What do I need to know to PLAN this phase well?

### 1. Node.js/Express Server Scaffold
- **Requirement:** Serve static files and bind to `0.0.0.0`.
- **Implementation:** Express is lightweight and perfect for this. We need to create a `server.js` file that starts an Express server, serves a `public` directory, and listens on a specified port (e.g., 3000) binding to `0.0.0.0` so it's accessible externally.

### 2. LAN IP Detection 
- **Requirement:** Extract the actual Wi-Fi/LAN IP address so the payload for the QR code functions properly across real networks, avoiding virtual adapters (Docker, WSL, VPNs).
- **Implementation:** Node.js `os.networkInterfaces()` provides all NICs. We need a heuristic:
  - Skip internal (`127.0.0.1`).
  - Skip known virtual/hypervisor prefixes (e.g., `vEthernet`, `WSL`, `Docker`).
  - Pick the first remaining IPv4 address.
  - Provide a `--host` override via `process.argv` for edges cases.

### 3. QR Code Generation
- **Requirement:** Display a functional QR code in the terminal upon startup and prepare one for UI embedding.
- **Implementation:** Use the `qrcode-terminal` package for the terminal and `qrcode` for generating a data URL that can be shown in the browser. 
- Payload must be `http://<LAN_IP>:<PORT>`.

### 4. Windows Firewall Detection
- **Requirement:** Prompt user if firewall blocks the inbound connection.
- **Implementation:** Since this relies on Node.js running on Windows, we can use `child_process.exec` to run `netsh advfirewall firewall show rule name=all | findstr /i "Node.js"` or simply output a clear warning instruction upon server start. GSD explicitly stated: "startup output includes the exact firewall command needed if inbound connections are blocked".
    - Command to print: `netsh advfirewall firewall add rule name="Web Data Transfer" dir=in action=allow protocol=TCP localport=<PORT>`

## Validation Architecture
- **Step 1:** Run `node server.js`. Verify terminal displays the correct IP, the Firewall warning, and the QR code.
- **Step 2:** Ensure we can connect to `http://<LAN_IP>:<PORT>` on a mobile device on the same network.

## RESEARCH COMPLETE
