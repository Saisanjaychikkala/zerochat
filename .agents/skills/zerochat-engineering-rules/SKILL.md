---
name: zerochat-engineering-rules
description: Core engineering directives, functional testing standards, RAM-only WebRTC constraints, modularity thresholds, and bundle performance budgets.
---

# ZeroChat Engineering Standards & Constraints Skill

Use this skill when architecting features, writing tests, reviewing code quality, or enforcing operational constraints in ZeroChat.

---

## 1. Core Prime Directives

1. **Zero Database, Zero Cloud Storage (RAM-Only WebRTC)**
   - All messages, voice notes, challenge cards, and file transfers exist purely in volatile browser memory (`messages` and `transfers` React state).
   - Never introduce `localStorage` message persistence, indexedDB message storage, or cloud database sync for ephemeral chats.
   - When a session burns or the tab closes, all object URLs must be explicitly revoked (`URL.revokeObjectURL`) to prevent memory leaks.

2. **Backwards Compatibility & Stable Interfaces**
   - The public facade of `peerService` and root prop APIs must never introduce breaking changes.
   - Any new packet types added to `GROUP_PACKET_TYPES` or `GAME_PACKET_TYPES` must maintain compatibility with older peers in the room.

3. **Real Functional Automated Verification (No Test Theatre)**
   - Never write unit tests that merely assert line counts (`lines <= 350`) or check raw text substrings (`fs.readFileSync().includes('...')`).
   - Tests must execute real runtime logic:
     - Mathematical calculations (16KB AirDrop chunking, room entropy, zoom scaling).
     - State machines (baton failover, Co-Host election, knocker queueing).
     - Protocol packet serialization and authentication (passcode challenge/admission).
     - Game win-detection matrices (Connect 4, Tic-Tac-Toe, Pong bounds).
   - Every task must pass:
     ```bash
     npm test
     npm run build
     ```

4. **Clean Architecture & Single Responsibility Principle (SRP)**
   - Aim for a single, well-defined responsibility per file.
   - **Never artificial code-golf**: Do not delete helpful comments, combine lines awkwardly, or create fragmented duplicate components just to satisfy an arbitrary line counter. If a component grows large, decompose it along natural responsibility boundaries (custom hook, subcomponents, utility).
   - Write clean, maintainable, readable, and well-structured code.

5. **Cyber-Glass Aesthetics & Touch Safety**
   - Maintain futuristic cyber-glass visual identity (Plus Jakarta Sans, JetBrains Mono, vibrant neon accents).
   - Support `100dvh` viewport rule to prevent mobile browser URL bar jumpiness.
   - Minimum 44x44px touch targets on mobile viewports.
   - Procedural Web Audio API sound synthesis (0 external audio files).

---

## 2. Pragmatic Performance & Code Hygiene

- **Pragmatic Splitting**: Code-split large standalone feature modules (such as `P2PGameArena`) using React lazy loading or dynamic imports when appropriate for initial load speed.
- **Zero Premature Code-Golfing**: Focus on high runtime performance (60fps DOM transitions, efficient WebRTC DataChannel flow control, memory cleanup on session burn) rather than artificial byte limits.

---

## 3. Wire Protocol & Baton Pass Star Architecture

- **Star Topology**: Squad chat utilizes a Baton Pass Star Relay where the active host coordinates up to 8 peers.
- **Automatic Failover**: When the host disconnects, the baton automatically transitions:
  1. Designated Co-Host (if set by admin).
  2. Seniority (peer with oldest `joinedAt` timestamp).
- **Passcode Protection**: When room passcode is configured:
  - Valid passcode -> immediate `ADMIT` packet.
  - Invalid passcode -> `CHALLENGE` packet.
  - Reconnecting peer -> auto-admit without prompt.
  - Open room -> queued in `pendingKnocks` for manual host admission.
