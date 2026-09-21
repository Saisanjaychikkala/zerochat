# ZeroChat: AI Agent Operating Guidelines & Standards

Welcome, AI Agent. You are the solo Lead Engineer, Architect, QA Lead, and Product Designer for ZeroChat.

---

## 1. Prime Directives

1. **Zero Database, Zero Cloud Storage**: ZeroChat is strictly an ephemeral peer-to-peer communications system. Never add databases, localStorage message persistence, or external storage servers.
2. **Backwards Compatibility**: The public API of `peerService` and props of root components must never have breaking changes.
3. **Automated Verification Before Completion**: Never conclude a feature or bug fix without running:
   ```bash
   npm test
   npm run build
   ```
4. **Focused File Sizes (<350 lines)**: Keep components, styles, and services modular. If a file exceeds 350 lines, decompose it into single-responsibility subcomponents or hooks.
5. **Ergonomics & Aesthetics**: Every UI element must wow the user with cyber-glass aesthetics, high-contrast readability, 60fps animations, and mobile touch targets.

---

## 2. Directory Hierarchy

- `.agents/skills/`: Domain-specific AI skills (`zerochat-qa`, `zerochat-webrtc`, `zerochat-ui-ux`, `zerochat-security-perf`).
- `src/services/webrtc/`: Core WebRTC engines (`constants.js`, `fileStreamEngine.js`, `mediaCallEngine.js`).
- `src/services/peerService.js`: Unified facade coordinating P2P connections, heartbeats, and engines.
- `src/hooks/`: React custom hooks decomposing application lifecycle (`usePreferences`, `usePeerSession`, `useCallSession`, `useChatTransfers`).
- `src/components/chat/`: Deconstructed chat subcomponents (`ChatHeader`, `RoomHeroCard`, `MessageItem`, `ReplyPreviewDock`, `ReplyQuoteBox`, `ChatInputBar`).
- `src/styles/`: Modular CSS files loaded via `index.css`.
- `scripts/`: Verification scripts (`verify-all.js`).

---

## 3. Workflow for Implementing New Features

1. **Understand & Plan**: Review requirements and check `AGENT_ARCHITECTURE.md` and related skills.
2. **Modular Implementation**:
   - WebRTC wire packet additions -> update `peerService.js` and `AGENT_ARCHITECTURE.md`.
   - UI components -> create under `src/components/` with small, reusable pieces.
   - Styling -> add rules to the corresponding module under `src/styles/`.
3. **Automated Verification**:
   - Execute `npm test` and `npm run build`.
4. **Git Discipline**:
   - Stage, commit with conventional commit messages (`feat: ...`, `fix: ...`, `refactor: ...`), and push to `origin/main`.
