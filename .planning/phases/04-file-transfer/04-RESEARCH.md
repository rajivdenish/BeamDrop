# Phase 4: File Transfer - Research

## What do I need to know to PLAN this phase well?

### 1. WebRTC DataChannels for P2P Transfer
- **Requirement:** Files must transfer directly device-to-device without being stored on the server (FILE-05).
- **Implementation:** We will use `WebRTC DataChannel`. To handle the complexities of ICE candidates, STUN servers (optional for LAN but good for broader success), and SDP offers/answers over our existing `socket.io` signaling layer, we can seamlessly inject the `simple-peer` library via a CDN script tag in `index.html`. It has zero server-side dependencies.
- Using `simple-peer`, once the `socket.io` signaling handshakes complete, a direct tunnel opens allowing `peer.send(file)` functionality.

### 2. Handling Large Files
- **Requirement:** WebRTC data channels have a maximum message size limit (usually around 16KB to 64KB depending on browser implementations). 
- **Implementation:** Files must be sliced into chunks using the `File.slice()` API. We will use a `FileReader` reading as an `ArrayBuffer`. We send metadata first (filename, size, MIME type), followed by the binary chunks. The receiver reconstructs the chunks into a single `Blob` in memory.

### 3. Rich Media Previewing & In-Memory Storage
- **Requirement:** User should preview files (videos, images) directly, files shouldn't touch the server's disk.
- **Implementation:** Once the `Blob` is reconstructed in the browser's RAM, we use `URL.createObjectURL(blob)` to generate an in-memory URL. We can assign this URL to `<img src>`, `<video src>`, or `<a download>` tags dynamically.
- Because the server is strictly passing signaling messages (tiny text JSONs), we uphold the privacy goal completely.

### 4. Drag and Drop & Multiple Files
- **Requirement:** Drag & drop UI (FILE-02) and multiple file support (FILE-03).
- **Implementation:** We will attach an `ondragover` and `ondrop` listener to the `body` or a specific file transfer container. When `e.dataTransfer.files` is accessed, we loop through them and queue them in the WebRTC transfer mechanism.
- Concurrently we need to update the Premium CSS aesthetics to highlight the dropzone (e.g. glowing border).

### 5. Transfer Progress
- **Requirement:** Real-time transfer progress (FILE-06).
- **Implementation:** As the sender's `FileReader` slices and sends chunks, it updates a local progress bar. As the receiver collects chunks (counting bytes received vs total bytes declared in metadata), it updates its own progress bar smoothly using CSS `width` transitions.

## RESEARCH COMPLETE
