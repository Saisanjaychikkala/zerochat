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

## 📄 License

MIT License. Free to use, modify, and distribute.
