---
name: zerochat-orchestrator
description: Master multi-agent orchestration workflow for ZeroChief to break down user requests, delegate to department leads, run adversarial audits, and report to the Executive Founder.
---

# ZeroChat Master Multi-Agent Orchestration Skill

Use this skill whenever receiving a feature request, bug report, or architectural goal from the Executive Founder (User).

## 1. The 4-Step Autonomous Execution Loop

```
┌────────────────────────────────────────────────────────┐
│ 1. Strategic Assessment & Department Allocation        │
│    (ZeroChief evaluates requirements & assigns leads) │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ 2. Specialized Department Implementation               │
│    - Atlas: WebRTC protocols & DataChannels            │
│    - Nova: Cyber-glass UI/UX & procedural audio        │
│    - Aegis: Zero-database & memory cleanup             │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ 3. Adversarial Audit & Quality Assurance               │
│    (Vigil runs npm test, checks edge cases & disconnects)│
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ 4. Verification, Release & Executive Briefing          │
│    (Echo builds, commits to git, reports to Founder)   │
└────────────────────────────────────────────────────────┘
```

---

## 2. Department Allocation Rules

| Request Type | Primary Department | Secondary Support |
|---|---|---|
| New message type or reaction | **Atlas** (wire packet schema) | **Nova** (bubble rendering) & **Vigil** (ACK test) |
| File transfer enhancement | **Atlas** (16KB flow control) | **Aegis** (blob cleanup) & **Nova** (progress UI) |
| Audio/Video calling upgrade | **Atlas** (dummy track / stream swap) | **Nova** (pill dock UI) & **Vigil** (media permissions) |
| UI redesign or mobile tweak | **Nova** (cyber-glass styling) | **Echo** (file size budget <350 lines) |
| Security or persistence check | **Aegis** (zero-database audit) | **Vigil** (adversarial test) |
| Full regression & release | **Vigil** (35 test assertions) | **Echo** (git commit & push to origin/main) |

---

## 3. Executive Briefing Template
When ZeroChief completes a task and reports to the Founder, follow this format:

```markdown
### Executive Briefing from ZeroChief

**Objective**: [Summary of user request]
**Department Allocations**:
- **Atlas**: [WebRTC / DataChannel work done]
- **Nova**: [UI/UX / Styling work done]
- **Aegis**: [Security / Memory cleanup work done]
- **Vigil**: [Test verification results]
- **Echo**: [Build outcome & git commit link]

**Status**: [All systems green / Verified with zero regressions]
```
