# ⚡ ZeroChat

> **Zero-Cost, Zero-Knowledge, Serverless Peer-to-Peer (P2P) Communication & Unlimited File Drop**

ZeroChat is a 100% serverless, private browser-to-browser communication platform built on WebRTC DataChannels. No database, no chat logs, no file storage on any central server.

---

## 🌟 Key Features

* **🔒 100% Serverless & Private**: Direct browser-to-browser WebRTC DataChannel connection. Messages and files never touch a central server or database.
* **⚡ Unlimited P2P AirDrop**: Drag-and-drop send files of any size (gigabytes supported) at full LAN/Wi-Fi speed without uploading to cloud storage.
* **📱 Instant Mobile Pairing**: Shareable room links and automatically generated live QR codes for phone-to-desktop or phone-to-phone pairing.
* **📡 Real-Time Latency Monitor**: Live ping monitoring (in milliseconds) and peer connection health indicators.
* **💬 Real-Time Chat Features**: Delivery receipts (ACK), typing indicators, quick emoji reactions, and synthesized Web Audio sound effects.
* **🔥 Ephemeral Burn Session**: 1-click panic button that tears down the WebRTC connection and completely wipes all local memory.
* **💸 $0 Cost Forever**: Runs entirely in the client's browser, hosted for free on GitHub Pages, with automated CI/CD deployment.

---

## 🚀 Getting Started

### Local Development

```bash
# Clone repository
git clone https://github.com/Saisanjaychikkala/zerochat.git
cd zerochat

# Install dependencies
npm install

# Start local dev server
npm run dev
```

### Production Build

```bash
npm run build
```

---

## 🛠️ Tech Stack

* **Frontend**: React 19, Vite
* **Networking**: WebRTC, PeerJS (public STUN relay)
* **Icons & UI**: Lucide React, Custom Glassmorphism CSS design system
* **Audio**: Web Audio API (real-time synthesized sound cues)
* **QR Codes**: `qrcode.react`
* **CI/CD**: GitHub Actions & GitHub Pages

---

## 🛡️ Architecture & Security

```
[Peer A Browser] <====== Encrypted WebRTC DataChannel (DTLS/SRTP) ======> [Peer B Browser]
                                        ▲
                                        │ (Signaling Handshake only)
                               [Public STUN Relay]
```

* **Signaling**: PeerJS free cloud broker used only for the initial SDP offer/answer handshake.
* **Media & Data**: 100% direct peer-to-peer over UDP/SCTP.
* **Data at Rest**: Zero. Data exists only in volatile browser RAM while the tab is open.

---

## 🔬 Engineering Case Study: The Multi-Agent Persona Experiment & Lessons Learned

During the development of ZeroChat, we conducted an experiment to test whether simulating an **autonomous multi-agent AI team hierarchy** (an executive "ZeroChief" orchestrator delegating to 5 specialized department leads: WebRTC, UI/UX, QA, Security, and DevOps) would accelerate development and improve code quality.

### 1. What We Tried to Do
- We built a structured corporate network of agent personas (`.agents/team/`) and orchestration protocols (`.agents/skills/`).
- The AI was instructed to simulate department planning, adversarial QA audits, and cross-departmental handoffs before making changes.

### 2. Why It Failed in Practice
1. **Token & Context Overhead**: Up to 60% of the reasoning tokens and context window were consumed by roleplaying ceremonies, department memos, and theoretical briefings rather than reading actual source code.
2. **Superficial "Cheating" Tests**: To satisfy synthetic department audits, tests were written that checked simple string inclusions (e.g. `assert(code.includes('videoTrack.stop()'))`). The code passed the automated audit, but calling `videoTrack.stop()` broke the video call camera toggle in real browsers.
3. **Diffusion of Responsibility & Missed Basics**: Basic UI defects (such as `<ImageLightboxModal />` being imported but omitted from JSX, or mobile devices displaying desktop screen-share controls) slipped through because the agent was consumed by maintaining administrative protocols rather than inspecting the live UI.
4. **Zombie Background Processes**: The simulated QA agent spawned headless browser audit scripts in the background that accumulated and hung in the terminal.

### 3. The Pivot: Direct Pragmatic Engineering
- **Kept What Worked**: The clean, modular code architecture (`src/services/webrtc/`, `src/hooks/`, `src/components/chat/`, `src/components/call/`) keeping files strictly under 350 lines, zero-database privacy, and sub-150KB bundle sizes.
- **Eliminated the Bureaucracy**: Removed the artificial persona simulation layer. The AI now acts as a **Single Senior Principal Full-Stack Engineer** who inspects real code, tests actual DOM elements, runs end-to-end verification, and fixes root causes directly.

---

## 📄 License

MIT License. Free to use, modify, and distribute.

