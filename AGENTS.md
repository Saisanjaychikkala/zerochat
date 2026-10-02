# ZeroChat: AI Engineering Guidelines & Operational Standards

ZeroChat is maintained using **Direct Pragmatic Engineering**. The AI agent operates as a **Senior Principal Full-Stack Engineer** taking direct ownership of the entire system—eliminating artificial persona bureaucracy, simulated delegation meetings, and administrative token overhead.

---

## 1. Prime Directives

1. **Zero Database, Zero Cloud Storage**: ZeroChat is strictly an ephemeral peer-to-peer communications system over WebRTC DataChannels. Never add databases, localStorage message persistence, or external storage servers. All chat history, files, and voice notes exist only in volatile browser RAM while the tab is active.
2. **Backwards Compatibility**: The public API of `peerService` and props of root components must never introduce breaking changes.
3. **Automated Functional Verification**: Tests must verify real runtime execution, protocol packets, game win detection, and state machines rather than superficial string-matching or artificial line counters. Never conclude any task without running:
   ```bash
   npm test
   npm run build
   ```
4. **Clean Architecture & Single Responsibility Principle (SRP)**: Each component, service, and hook must have a distinct, well-defined single responsibility. Avoid artificial code-golfing or decomposing files into duplicate micro-fragments. Write clean, readable, self-contained, and maintainable code.
5. **Cyber-Glass Ergonomics & Aesthetics**: Every UI element must deliver high-contrast readability, 60fps hardware-accelerated animations, responsive mobile touch targets (>=44x44px, 100dvh viewport support), and procedural Web Audio feedback.

---

## 2. Directory Architecture

- **`src/services/webrtc/`**: Isolated WebRTC sub-engines:
  - `constants.js`: Room entropy dictionary, 16KB chunk sizes, ICE configuration.
  - `streamHelpers.js`: Media track handling, desktop-only screen share detection, camera flip.
  - `fileStreamEngine.js`: 16KB AirDrop chunking with backpressure flow control.
  - `mediaCallEngine.js`: Voice and video calling pipeline with reliable track toggling.
  - `groupRelayEngine.js`: Baton Pass Star Relay for up to 8 peers with failover.
  - `groupPacketHandler.js`: Wire protocol dispatcher for knock admission, broadcast, and roster sync.
  - `groupBatonManager.js`: Relay authority migration, designated Co-Host succession, and seniority failover.
- **`src/services/peerService.js`**: Unified coordinator facade for WebRTC connections, heartbeat monitoring, and wake/reconnection resilience.
- **`src/hooks/`**: React custom hooks decomposing application lifecycle:
  - `usePreferences.js`: Display name, sound toggles.
  - `usePeerSession.js`: PeerJS connection state, room lifecycle, typing indicators.
  - `useCallSession.js`: Media call ringing, audio/video toggling, screen share, direct mic mute.
  - `useChatTransfers.js`: In-memory messages, 16KB file transfers, panic session burn.
  - `useInChatGames.js`: In-chat game drawer, challenge cards, cardId isolation, match state caching.
  - `useGroupSession.js`: Group chat session coordinator, knocks, roster, baton authority.
- **`src/components/chat/`**: Deconstructed chat subcomponents (`ChatHeader`, `RoomHeroCard`, `MessageItem`, `ReplyPreviewDock`, `ReplyQuoteBox`, `ChatInputBar`, `ChatWorkspace`).
- **`src/components/call/`**: Deconstructed call subcomponents (`CallHeaderBar`, `CallControlsDock`, `VideoViewport`, `ZoomControls`, `IncomingCallDialog`).
- **`src/components/game/`**: P2P gaming subcomponents (`GameDrawer`, `ActiveMatchStage`, `InChatGameCard`, `CyberPongGame`, `CyberGridGame`, `CyberConnectFour`, `GameLobbyChat`, `GameVoiceDock`, `GameArenaHeader`).
- **`src/components/group/`**: Group chat subcomponents (`GroupHeaderBar`, `GroupCreateModal`, `SquadQrModal`, `MemberDrawer`, `GroupChatWorkspace`).
- **`src/styles/`**: Modular CSS files loaded via `index.css` (`variables.css`, `base.css`, `layout.css`, `chat.css`, `media.css`, `call.css`, `zoom.css`, `modals.css`, `responsive.css`, `gameDrawer.css`, `inChatGameCard.css`, `activeMatchStage.css`, `connect4.css`, `groupChat.css`, `groupDrawer.css`, `settings.css`).
- **`scripts/`**: Verification and QA automation (`verify-all.js`, `capture-c4-and-file.js`).

---

## 3. Direct Pragmatic Execution Loop

1. **Root Cause Analysis**: Inspect real source code, state hooks, and DOM elements directly. Never rely on superficial string-matching tests.
2. **Surgical Implementation**: Make minimal, robust changes in cohesive modular files with clean component boundaries and zero code duplication.
3. **Automated Verification**:
   - Run `npm test` to verify all functional regression checks (protocol, state machines, game math, stream teardown).
   - Run `npm run build` to verify clean compilation with no syntax or packaging errors.
4. **Git Hygiene**:
   - Commit with conventional commit messages (`feat: ...`, `fix: ...`, `refactor: ...`).
   - Push directly to `origin/main`.

