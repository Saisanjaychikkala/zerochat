---
name: zerochat-ui-ux
description: Visual standards, cyber-glass styling rules, thumb-friendly mobile layouts (100dvh, safe areas), micro-animations, and procedural Web Audio synthesis sound cues.
---

# ZeroChat UI & UX Design System Skill

Use this skill when designing, refining, or adapting user interfaces, mobile responsiveness, animations, or audio synthesis in ZeroChat.

## 1. Visual Theme: Cyber-Glass Aesthetic
ZeroChat employs a dark, futuristic cyber-glass visual language with high contrast and subtle neon accents.

### Color Tokens
- **Backgrounds**: `--bg-primary` (`#06080d`), `--bg-secondary` (`#0c101a`), `--bg-card` (`rgba(14, 19, 32, 0.85)`).
- **Accents**: 
  - Cyan: `--accent-cyan` (`#00f2fe`), `--accent-cyan-glow` (`rgba(0, 242, 254, 0.35)`).
  - Blue: `--accent-blue` (`#4facfe`).
  - Purple: `--accent-purple` (`#9d4edd`).
  - Emerald: `--accent-emerald` (`#10b981`).
  - Rose: `--accent-rose` (`#f43f5e`).
- **Typography**: Primary font is Plus Jakarta Sans, monospace is JetBrains Mono.

## 2. Mobile Ergonomics & Viewport Rules
- **100dvh Rule**: Always use `height: 100vh; height: 100dvh;` to prevent mobile browser URL bar jumpiness.
- **Safe Area Inset**:
  ```css
  padding-bottom: max(8px, env(safe-area-inset-bottom, 8px));
  ```
- **16px Font Rule**: Mobile text inputs must use `font-size: 16px !important;` to prevent iOS Safari auto-zoom on focus.
- **Touch Target Size**: Minimum 40x40px (ideal 44x44px) for touch interactivity on mobile screens.
- **Top Segmented Pill**: On mobile screens (`<= 768px`), top navigation switches between "Chat" and "Files" using `.mobile-segmented-bar`.

## 3. Web Audio Synthesis (0 Audio Files)
All audio cues (message receive, connection chime, ringtones, file complete) are generated procedurally using the Web Audio API in [`src/utils/soundEffects.js`](file:///d:/sanjay/antigravity%20projects/project-fun/src/utils/soundEffects.js). Never import external mp3 or wav files.

## 4. CSS File Structure
All CSS rules are modularized under `src/styles/`:
- `variables.css`: Global tokens.
- `base.css`: Reset, buttons, status indicators.
- `layout.css`: Header, workspace grid, file sidebar.
- `chat.css`: Messages, bubbles, replies, quotes, typing dots.
- `media.css`: Audio bubbles, code blocks, drag overlays, inputs.
- `call.css`: Floating pill dock, video viewports, audio visualizer, PIP.
- `modals.css`: Modals, room codes, guide cards.
- `responsive.css`: Media queries for tablet and mobile viewports.
- `index.css`: Master barrel file importing the modules in order.
