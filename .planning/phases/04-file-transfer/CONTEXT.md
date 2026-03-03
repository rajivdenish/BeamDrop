<domain>
## File Previewing & Interaction
When a user receives or is preparing to send a file, the application must natively support **previewing and playing** media (images, audio, video) directly within the UI. It shouldn't just be a plain list of filenames; it needs to be an interactive rich-media experience utilizing modern HTML5 tags (`<video>`, `<audio>`, `<img>`) combined with blob URLs pointing directly to the RAM streams preventing disk-writing.
</domain>

<decisions>
## UI Design Aesthetics
- **Premium Interface Theme Constraint:** The main interface (Device Listing, QR Display, and File Transfers) MUST adhere strictly to the exact same premium aesthetic implemented during Phase 2 Authentication constraints.
- **Micro-Animations & Interactivity:** Everything needs to be animated smoothly (`transition` states in CSS). Buttons should feel tactile, modals should slide or fade in cleanly, and list updates should not be jarring or plain. The UI MUST be dynamic and professional.
- **Card-Based Architecture:** Connected devices and file transfers should be represented as premium "cards" using `var(--card-bg)`, soft borders, flexbox grids, and `box-shadow` drops mimicking the `Inter` font dashboard reference.
</decisions>
