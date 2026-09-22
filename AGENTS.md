# ZeroChat: AI Engineering Guidelines & Operational Standards

ZeroChat is maintained using **Direct Pragmatic Engineering**. The AI agent operates as a **Senior Principal Full-Stack Engineer** taking direct ownership of the entire system—eliminating artificial persona bureaucracy, simulated delegation meetings, and administrative token overhead.

---

## 1. Prime Directives

1. **Zero Database, Zero Cloud Storage**: ZeroChat is strictly an ephemeral peer-to-peer communications system over WebRTC DataChannels. Never add databases, localStorage message persistence, or external storage servers. All chat history, files, and voice notes exist only in volatile browser RAM while the tab is active.
2. **Backwards Compatibility**: The public API of `peerService` and props of root components must never introduce breaking changes.
3. **Automated Verification Before Completion**: Never conclude any task or feature without running:
   ```bash
   npm test
   npm run build
   ```
4. **Focused File Sizes (<350 lines)**: Keep components, styles, and services strictly modular. If any file exceeds 350 lines, decompose it into single-responsibility subcomponents, utility modules, or custom React hooks.
5. **Cyber-Glass Ergonomics & Aesthetics**: Every UI element must deliver high-contrast readability, 60fps hardware-accelerated animations, responsive mobile touch targets (>=44x44px, 100dvh viewport support), and procedural Web Audio feedback.

---

## 2. Directory Architecture

- **`src/services/webrtc/`**: Isolated WebRTC sub-engines:
  - `constants.js`: Room entropy dictionary, 16KB chunk sizes, ICE configuration.
  - `streamHelpers.js`: Media track handling, desktop-only screen share detection, camera flip.
  - `fileStreamEngine.js`: 16KB AirDrop chunking with backpressure flow control.
  - `mediaCallEngine.js`: Voice and video calling pipeline with reliable track toggling.
- **`src/services/peerService.js`**: Unified coordinator facade for WebRTC connections, heartbeat monitoring, and wake/reconnection resilience.
- **`src/hooks/`**: React custom hooks decomposing application lifecycle:
  - `usePreferences.js`: Display name, sound toggles.
  - `usePeerSession.js`: PeerJS connection state, room lifecycle, typing indicators.
  - `useCallSession.js`: Media call ringing, audio/video toggling, screen share.
  - `useChatTransfers.js`: In-memory messages, 16KB file transfers, panic session burn.
- **`src/components/chat/`**: Deconstructed chat subcomponents (`ChatHeader`, `RoomHeroCard`, `MessageItem`, `ReplyPreviewDock`, `ReplyQuoteBox`, `ChatInputBar`).
- **`src/components/call/`**: Deconstructed call subcomponents (`CallHeaderBar`, `CallControlsDock`, `VideoViewport`, `ZoomControls`, `IncomingCallDialog`).
- **`src/styles/`**: Modular CSS files loaded via `index.css` (`variables.css`, `base.css`, `layout.css`, `chat.css`, `media.css`, `call.css`, `zoom.css`, `modals.css`, `responsive.css`).
- **`scripts/`**: Verification and QA automation (`verify-all.js`).

---

## 3. Direct Pragmatic Execution Loop

1. **Root Cause Analysis**: Inspect real source code, state hooks, and DOM elements directly. Do not guess or rely on superficial string-matching tests.
2. **Surgical Implementation**: Make minimal, robust changes in the dedicated modular file within the <350 line budget.
3. **Automated Verification**:
   - Run `npm test` to verify all 64 regression checks.
   - Run `npm run build` to verify the production bundle remains <150KB gzipped.
4. **Git Hygiene**:
   - Commit with conventional commit messages (`feat: ...`, `fix: ...`, `refactor: ...`).
   - Push directly to `origin/main`.
