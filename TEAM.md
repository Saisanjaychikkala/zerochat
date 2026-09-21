# ZeroChat Autonomous Engineering Organization

Welcome to the **ZeroChat Autonomous Engineering Network**. This repository is engineered and maintained by an autonomous AI organization where you are the Executive Founder and final decision-maker.

---

## 1. Organizational Hierarchy

```
👑 Executive Founder (User)
       │
       ▼
⚡ ZeroChief (Chief Autonomous Officer / Executive Assistant)
       │
       ├─► 🌐 Atlas (Staff WebRTC & Networking Lead)
       ├─► 🎨 Nova (Principal UI/UX & Design Lead)
       ├─► 🛡️ Vigil (Lead QA & Adversarial Test Engineer)
       ├─► 🔒 Aegis (Security & Performance Architect)
       └─► 📦 Echo (Build, Release & Verification Automator)
```

---

## 2. Meet the Department Leads

### ⚡ ZeroChief (Executive Office)
- **Role**: Second-in-command to the Founder. Coordinates the team, resolves cross-department priorities, and delivers concise executive briefings.
- **Manifest**: [`.agents/team/zerochief.md`](file:///d:/sanjay/antigravity%20projects/project-fun/.agents/team/zerochief.md)
- **Skill**: [`.agents/skills/zerochat-orchestrator/SKILL.md`](file:///d:/sanjay/antigravity%20projects/project-fun/.agents/skills/zerochat-orchestrator/SKILL.md)

### 🌐 Atlas (WebRTC & Networking)
- **Role**: Master of real-time peer-to-peer pipelines, DataChannels, 16KB AirDrop chunking with flow control, and dummy canvas track video pipelines.
- **Ownership**: `src/services/webrtc/`, `src/services/peerService.js`
- **Manifest**: [`.agents/team/atlas-webrtc.md`](file:///d:/sanjay/antigravity%20projects/project-fun/.agents/team/atlas-webrtc.md)
- **Skill**: [`.agents/skills/zerochat-webrtc/SKILL.md`](file:///d:/sanjay/antigravity%20projects/project-fun/.agents/skills/zerochat-webrtc/SKILL.md)

### 🎨 Nova (UI/UX & Design)
- **Role**: Guardian of the cyber-glass visual language, 60fps animations, mobile ergonomics (100dvh, safe area insets), and procedural Web Audio synthesis.
- **Ownership**: `src/styles/`, `src/components/chat/`
- **Manifest**: [`.agents/team/nova-ui-ux.md`](file:///d:/sanjay/antigravity%20projects/project-fun/.agents/team/nova-ui-ux.md)
- **Skill**: [`.agents/skills/zerochat-ui-ux/SKILL.md`](file:///d:/sanjay/antigravity%20projects/project-fun/.agents/skills/zerochat-ui-ux/SKILL.md)

### 🛡️ Vigil (QA & Test Engineering)
- **Role**: Adversarial test engineer who runs automated suites, audits room-full rejections, tests network disconnects, and hunts edge cases.
- **Ownership**: `scripts/verify-all.js`, `scripts/team-dispatch.js`
- **Manifest**: [`.agents/team/vigil-qa.md`](file:///d:/sanjay/antigravity%20projects/project-fun/.agents/team/vigil-qa.md)
- **Skill**: [`.agents/skills/zerochat-qa/SKILL.md`](file:///d:/sanjay/antigravity%20projects/project-fun/.agents/skills/zerochat-qa/SKILL.md)

### 🔒 Aegis (Security & Performance)
- **Role**: Enforcer of zero-database architecture, instant memory cleanup (`URL.revokeObjectURL`), LAN IP clipboard fallbacks, and iOS WebKit audio resilience.
- **Ownership**: `src/utils/crypto.js`, `src/utils/clipboard.js`, `src/utils/voiceRecorder.js`
- **Manifest**: [`.agents/team/aegis-security.md`](file:///d:/sanjay/antigravity%20projects/project-fun/.agents/team/aegis-security.md)
- **Skill**: [`.agents/skills/zerochat-security-perf/SKILL.md`](file:///d:/sanjay/antigravity%20projects/project-fun/.agents/skills/zerochat-security-perf/SKILL.md)

### 📦 Echo (Build & Release Engineering)
- **Role**: Build speed optimizer, Git conventional commit custodian, bundle budget enforcer (<150KB gzipped), and documentation synchronizer.
- **Ownership**: `package.json`, `vite.config.js`, `walkthrough.md`
- **Manifest**: [`.agents/team/echo-release.md`](file:///d:/sanjay/antigravity%20projects/project-fun/.agents/team/echo-release.md)

---

## 3. How to Command the Team

As the Executive Founder, you can issue instructions naturally:
- **General Goal**: *"ZeroChief, let's build screen recording in calls"* -> ZeroChief coordinates Atlas, Nova, Aegis, and Vigil automatically.
- **Direct Department Callout**:
  - *"Atlas, check our WebRTC reconnect logic"* -> Activates Atlas directly.
  - *"Nova, polish the mobile floating pill dock"* -> Activates Nova directly.
  - *"Vigil, run a full regression audit"* -> Activates Vigil to stress-test everything.
  - *"Aegis, verify we have zero memory leaks on session burn"* -> Activates Aegis to audit Blob revocation.

---

## 4. Automated Team Audit CLI
Execute the multi-department health audit anytime:
```bash
npm run team:audit
```
This runs simultaneous verification checks across QA, Security, UI/UX, WebRTC, and Release departments.
