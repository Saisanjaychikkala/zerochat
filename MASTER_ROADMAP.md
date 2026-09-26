# 🗺️ ZeroChat Master Roadmap, Tech Specifications & Feature Tracker

> **Document Status**: Live Working Blueprint  
> **Last Updated**: September 2026  
> **Engineering Model**: Senior Principal Full-Stack Direct Ownership  
> **Operating Constraint**: $0 Hosting & Deployment Cost, Zero Database Dependency (for Core), Volatile RAM Privacy Guarantee.

---

## 1. Tech Stack Decision & Architecture Blueprint

### The Verdict: Retain React 19 + Vite + Modular Vanilla CSS (Reject Heavy Libraries like MUI)

| Consideration | Current Stack (React + Vite + Modular CSS Tokens) | MUI / Chakra / Ant Design | Verdict |
| :--- | :--- | :--- | :--- |
| **Bundle Size & Speed** | Extremely lightweight (~45KB gzipped), sub-second load times. | Heavy bloat (+300KB to 600KB minified JS), degrades First Contentful Paint. | **Current Stack Wins** |
| **Mobile Touch & Viewport** | 100% fine-grained control over `visualViewport`, dynamic keyboard offset, `100dvh`, pinch gestures. | Opinionated wrappers, fighting CSS-in-JS abstractions, difficult to customize keyboard behaviors. | **Current Stack Wins** |
| **Cyber-Glass Aesthetics** | Tailored neon glows (`#00ff88`), high-contrast dark mode, hardware-accelerated glassmorphism. | Generic corporate Google Material design; feels like an enterprise admin panel. | **Current Stack Wins** |
| **Deployment & Hosting Cost** | Compiles to 100% static HTML/JS/CSS assets. Hosted **$0 forever** on Vercel, Netlify, Cloudflare Pages, or GitHub Pages. | Same hosting cost, but slower build times and heavier bandwidth usage for users. | **Current Stack Wins** |
| **Developer Maintenance** | Clean CSS tokens in `src/styles/` under the <350-line rule. No dependency breakage when React updates. | Complex theming engines, frequent breaking changes between major versions. | **Current Stack Wins** |

---

## 2. Comprehensive Status Matrix: Implemented vs. In-Progress vs. Future

### Legend:
- `[x] ACTIVE & VERIFIED` - Fully built, tested, and operational in current build.
- `[ ] PRIORITY NEXT` - Planned for immediate implementation.
- `[🔒] ROADMAP / LOCKED` - Homescreen locked tiles & architecture milestones.

---

### Category A: Core Networking & Privacy Modes
- [x] **WebRTC Direct DataChannels**: Ephemeral peer-to-peer data transport over SCTP/UDP.
- [x] **3-Word Cryptographic Rooms**: High-entropy dictionary generation (`word-word-num`) without accounts.
- [x] **Zero-Database Volatile Memory**: Chat history and files live strictly in RAM (`useState`); zero disk persistence.
- [x] **Hardware Media Security Teardown**: Explicit `MediaStreamTrack.stop()` turning off camera/mic LEDs on mute/hangup.
- [x] **Procedural Audio Synthesis**: Native Web Audio API sound effects (no external MP3/WAV files).
- [x] **Dual Connection Modes ("True Private" vs "Universal Private")**:
  - **Mode 1: True Private (STUN Only)**: Direct peer-to-peer router connection. Zero relay. If router firewall blocks direct connection, shows user-friendly fallback modal explaining the firewall and offering Mode 2.
  - **Mode 2: Universal Private (STUN + Free TURN Relay)**: Relays encrypted UDP packets through public TURN servers to penetrate strict corporate/university NAT firewalls.
- [x] **Real-time Peer Online / Offline Status Badge**:
  - Live status pills in Chat Header: 🟢 Online (Connected) | 🟡 Reconnecting (Re-syncing) | 🔴 Offline.
- [🔒] **Cloud Vault Chat (Login / Persistent)**:
  - Homescreen locked feature tile. User authentication via free Firebase Auth (Google / Email). Client-side AES-256 encrypted local device storage (IndexedDB). Messages synced over WebRTC.

---

### Category B: Chat Ergonomics & Mobile Physics (WhatsApp / Instagram Feel)
- [x] **In-Memory Message History & Reply Previews**: Quotable reply previews and image thumbnails in volatile RAM.
- [x] **Cross-Platform Voice Notes**: Safe MediaRecorder codecs for iOS (`audio/mp4`) and Android/Desktop (`audio/webm`).
- [x] **Mobile Tap-to-Dismiss Keyboard**: Tapping outside input / message list background blurs active input and closes soft keyboard.
- [x] **Dynamic visualViewport Auto-Scroll**: `interactive-widget=resizes-content` and `visualViewport` resize listener smoothly scroll messages into view without pushing them out of reach.
- [ ] **Voice Note Waveform Scrubber**:
  - Replace flat progress bar with interactive visual waveform bars (canvas/SVG) that users can drag to seek through audio.
- [ ] **Message Emoji Reactions (Confetti Bursts)**:
  - Quick emoji reactions (`👍`, `❤️`, `🔥`, `😂`) over DataChannel floating up on recipient screen.
- [ ] **Inline Markdown & Code Block Formatter**:
  - Format bold, code snippets, and syntax blocks with a one-click "Copy Code" action.

---

### Category C: Media Calling & Video Engine
- [x] **Voice & Video Media Calling**: Full duplex audio/video pipeline.
- [x] **Dummy Canvas Video Track**: 1x1 black canvas track allowing zero-renegotiation audio-to-video upgrades.
- [x] **Interactive Pan & Pinch-to-Zoom**: 1x to 4x remote video zoom for desktop and touch screens.
- [x] **OnePlus & Legacy Android Camera Flip Bug Fix**:
  - Explicitly stops front camera track *before* requesting new camera sensor, releasing kernel hardware lock on Snapdragon 820/legacy chips, with `enumerateDevices()` fallback.
- [x] **Call Glare Resolution (Simultaneous Calling Conflict)**:
  - Auto-reconciles if both peers dial simultaneously without freezing WebRTC state machines.
- [x] **Call Nudge / Ping Button**:
  - One-tap `Bell` button in header sending a high-priority peer alert: *"Calling you in 5s! Stay ready"*.
- [ ] **Picture-in-Picture (PiP) Video Calling**:
  - Native `HTMLVideoElement.requestPictureInPicture()` integration for background multitasking.
- [ ] **Screen WakeLock API**:
  - `navigator.wakeLock.request('screen')` during calls and file transfers with an opt-out toggle.

---

### Category D: Homescreen & Multi-Tool Suite
- [x] **Homescreen Command Hub (`HomeScreen.jsx`)**:
  - Central dashboard featuring True Private, Universal Private, P2P Game Arena, and locked feature preview cards.
- [x] **P2P Cyber Game Arena (`P2PGameArena.jsx`)**:
  - **Game 1: Cyber Pong Duel**: Real-time 60fps 2-player Cyber Pong duel over WebRTC DataChannel (<30ms latency) with Practice Bot AI mode and live Audio/Video Face-Off PIP window!
  - **Game 2: Cyber Grid (3x3)**: 2-player high-tech Tic-Tac-Toe duel with turn tracking, win streak confetti, and single-player Bot AI.
  - **Game 3: Cyber Connect Four (Drop 4)**: 7x6 gravity drop connect-four strategy duel with column hover, victory detector, and Practice Bot AI.
- [x] **8 High-Contrast Cyber-Glass Themes with Ambient Background Lighting**:
  - **Cyber Cyan (Default)**: Vivid neon cyan & electric purple.
  - **Matrix Emerald**: Terminal hacker green & matrix mesh ambient glow.
  - **Synthwave Purple**: Neon magenta, hot pink & violet sunset.
  - **Solar Amber**: Cyber gold, molten amber obsidian.
  - **Crimson Red**: Blood ruby & deep scarlet lasers.
  - **Midnight Blue**: Deep electric cobalt & sapphire glow.
  - **Monolith Slate**: Dark onyx & industrial platinum silver.
  - **Tokyo Neon**: Cyberpunk sakura pink & neon sky blue.
- [x] **Synchronized Remote Session Burn**:
  - Zero-trace memory incineration on both sides. Remote peer receives `{ type: 'session_burned' }`, revokes all Blob URLs (`URL.revokeObjectURL`), terminates media calls, wipes messages from RAM, and transitions smoothly to homescreen with a security alert.

---

### Category E: File Transfers (AirDrop Engine)
- [x] **16KB AirDrop Chunking with Backpressure**: Streams files of any size without buffer bloat or memory crashes.
- [ ] **Live Transfer Speed & ETA Metrics**:
  - Real-time throughput gauge (e.g. `45.2 MB/s`, `ETA: 12s`) inside transfer cards.
- [ ] **Global Drag-and-Drop Dropzone**:
  - Full-window glowing neon dropzone overlay to queue files instantly from anywhere on the screen.
- [ ] **Folder & Multi-File Batch Transfer**:
  - Drag entire directories (`webkitGetAsEntry`) streamed sequentially or as in-memory packages.

---

### Category F: Product Ecosystem & Distribution
- [ ] **PWA (Progressive Web App) Manifest & Service Worker**:
  - Installable icon on iOS and Android home screens without browser URL bars.
- [ ] **Ephemeral Web Push Notifications**:
  - Ring recipient's device when invited to a call, even if the browser tab is minimized.

---

## 3. Deployment & Multi-Platform Distribution ($0 Budget Strategy)

### Web App ($0 Forever)
* **Vercel / Cloudflare Pages / GitHub Pages**:
  * Free unlimited global CDN hosting for static Vite/React bundles.
  * Automatic HTTPS certificates (mandatory for WebRTC and camera/mic permissions).

### Android & Google Play Store ($0 development, optional $25 one-time Google fee)
* **TWA (Trusted Web Activity) via PWABuilder**:
  * Free tool maintained by Microsoft. Takes your production HTTPS URL and packages it into a verified Google Play Store `.aab` file without writing Java/Kotlin.

### Desktop App: Windows & macOS ($0)
* **Tauri or PWABuilder**:
  * Tauri produces ultra-small (~5MB), blazing-fast native desktop `.exe` and `.dmg` installers that run your React frontend natively.
  * Microsoft Store accepts PWAs directly via PWABuilder for free.

### iOS App Store
* **Apple Constraints**: Requires an Apple Developer Account ($99/year fee charged by Apple).
* **Technical Wrapper**: Capacitor or Cordova wraps the React codebase into an Xcode project. Screen sharing on iOS web is restricted by WebKit; native Capacitor plugins bypass this restriction.

---

## 4. Unity Games vs. WebRTC Browser Games

* **Unity Capabilities**: Unity is a standalone C# 3D game engine. While Unity can export to WebGL, Unity WebGL builds are heavy (20MB - 50MB initial download) and take 15 seconds to load.
* **The ZeroChat Gaming Recommendation**: Build lightweight, instant-load **HTML5 Canvas / WebGL games** (e.g. 2-Player Cyber Pong, Retro Snake Duel, Chess) directly over WebRTC DataChannels.
  * Latency is <30ms peer-to-peer.
  * Zero load time.
  * Zero server costs.
