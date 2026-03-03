<domain>
## Apple iTunes Sync-Style Device Inspector
The device discovery interface shouldn't just be a simple list of IP addresses or raw Node IDs. When a device is discovered (or connects), it must broadcast rich metadata so the UI displays it beautifully, reminiscent of Apple's iTunes phone sync interface or AirDrop.
- **Required Metadata:** The client should use `navigator.userAgent` parsing to deduce the device type (e.g., iPhone, Android, Windows, Mac), the browser (Safari, Chrome), and explicitly define an aesthetic icon/graphic based on that device model type. 
- **Display Details:** Show the connection status, the device's assigned name (e.g. "Rajiv's iPhone Pro"), and the local IP visually as a bold, beautifully laid out "card" widget.
</domain>

<decisions>
## UI Design Aesthetics
- **Premium Interface Theme Constraint:** The main interface (Device Listing, QR Display, and File Transfers) MUST adhere strictly to the exact same premium aesthetic implemented during Phase 2 Authentication constraints (deep purple buttons, rounded cards, `var(--bg-color)` background).
- **Micro-Animations & Interactivity:** Everything needs to fade or transition smoothly in CSS. Badges denoting device status should glow cleanly. 
</decisions>
