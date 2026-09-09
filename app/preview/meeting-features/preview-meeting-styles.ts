import { MEETING_CONTROL_BAR_RESPONSIVE_CSS } from "@/shared/components/livekit/meeting-control-bar-responsive.css";

/** Obsidian tokens mirrored from public-meeting-room-client. */
export const PREVIEW_OBSIDIAN_CSS = `
  :root {
    --obs-bg: #0B0D0E;
    --obs-bg-2: #15181b;
    --obs-bg-3: #1c2024;
    --obs-fg: #f4f5f6;
    --obs-fg-dim: #a8acb1;
    --obs-fg-faint: #6b7075;
    --obs-line: rgba(255,255,255,0.08);
    --obs-line-2: rgba(255,255,255,0.14);
    --obs-accent: #00E6C3;
    --obs-accent-dim: #0a8c77;
    --obs-danger: #ff5252;
    --obs-font-display: 'Fraunces', 'Times New Roman', serif;
    --obs-font-body: 'Manrope', system-ui, sans-serif;
    --obs-font-mono: 'JetBrains Mono', ui-monospace, monospace;
  }
`;

export const PREVIEW_MEETING_CSS = `
  .preview-meeting-shell {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    background: radial-gradient(ellipse at top, #15181b 0%, #0B0D0E 60%, #06070a 100%);
    font-family: var(--obs-font-body);
    color: var(--obs-fg);
  }

  .preview-meeting-header {
    flex-shrink: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--obs-line);
    background: rgba(11,13,14,0.85);
    backdrop-filter: blur(12px);
  }

  .preview-meeting-header h1 {
    margin: 0;
    font-family: var(--obs-font-display);
    font-size: clamp(1rem, 2vw, 1.25rem);
    font-weight: 500;
    letter-spacing: -0.02em;
  }

  .preview-meeting-header p {
    margin: 0.15rem 0 0;
    font-size: 12px;
    color: var(--obs-fg-dim);
  }

  .preview-header-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  .preview-demo-controls {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
  }

  .preview-demo-btn {
    min-height: 32px;
    padding: 0.25rem 0.6rem;
    border: 1px solid var(--obs-line-2);
    border-radius: 999px;
    background: rgba(255,255,255,0.04);
    color: var(--obs-fg-dim);
    font-family: var(--obs-font-mono);
    font-size: 10px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
  }

  .preview-demo-btn:hover:not(:disabled) {
    background: rgba(255,255,255,0.08);
    color: var(--obs-fg);
  }

  .preview-demo-btn[aria-pressed="true"] {
    border-color: rgba(255,176,86,0.45);
    background: rgba(255,176,86,0.12);
    color: #ffce9a;
  }

  .preview-demo-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .preview-sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .preview-width-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.65rem;
    border-radius: 999px;
    border: 1px solid var(--obs-line-2);
    background: rgba(255,255,255,0.04);
    font-family: var(--obs-font-mono);
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--obs-fg-dim);
  }

  .preview-width-badge strong {
    color: var(--obs-accent);
    font-weight: 600;
  }

  .preview-meeting-stage-wrap {
    flex: 1 1 auto;
    min-height: 0;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
  }

  .preview-meeting-stage-wrap[data-narrow="true"] {
    padding: 0;
  }

  .room-meeting-container {
    isolation: isolate;
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid var(--obs-line);
    box-shadow: 0 24px 64px -24px rgba(0,0,0,0.75);
    background: radial-gradient(ellipse at top, #15181b 0%, #0B0D0E 60%, #06070a 100%);
    font-family: var(--obs-font-body);
    letter-spacing: -0.005em;
  }

  .room-meeting-container::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' /></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>");
    opacity: 0.025;
    pointer-events: none;
    mix-blend-mode: overlay;
    z-index: -1;
  }

  .preview-meeting-stage-wrap[data-narrow="true"] .room-meeting-container {
    border-radius: 0;
    border-left: 0;
    border-right: 0;
    border-bottom: 0;
  }

  /* LiveKit defaults .lk-video-conference to row flex (inner | control bar). Our markup
   * renders the bar as a sibling of inner, so row layout shrinks the stage to content
   * width and stretches the bar vertically — tiny tiles top-left, bar floating mid-screen. */
  .room-meeting-container .lk-video-conference {
    display: flex !important;
    flex-direction: column !important;
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
    background: transparent !important;
  }

  .room-meeting-container .lk-video-conference-inner {
    position: relative;
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    background: transparent !important;
  }

  .room-meeting-container .lk-video-conference > .lk-control-bar {
    order: 999;
    flex-shrink: 0;
    margin-top: auto;
  }

  .room-meeting-container .lk-grid-layout {
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    height: 100%;
    padding: 0.75rem;
    gap: 0.5rem;
    place-items: stretch;
  }

  .room-meeting-container .lk-cam-tile {
    position: relative;
    min-width: 0;
    min-height: 0;
    height: 100%;
    width: 100%;
    border-radius: 14px;
    overflow: hidden;
    animation: previewTileIn 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  @keyframes previewTileIn {
    from { opacity: 0; transform: scale(0.98); }
    to { opacity: 1; transform: scale(1); }
  }

  .room-meeting-container .lk-cam-tile > .lk-participant-tile {
    height: 100% !important;
    width: 100% !important;
  }

  .room-meeting-container .lk-participant-tile {
    position: relative;
    min-height: 120px;
    border-radius: 14px !important;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.06);
    box-shadow: 0 8px 24px -8px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.03);
    background: var(--obs-bg-3);
    transition: border-color 200ms ease, box-shadow 200ms ease;
  }

  .room-meeting-container .lk-participant-tile[data-lk-speaking="true"] {
    border-color: var(--obs-accent) !important;
    box-shadow: 0 0 0 1px var(--obs-accent), 0 8px 32px -4px rgba(0,230,195,0.25);
  }

  .room-meeting-container .lk-participant-placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
    opacity: 1 !important;
    background: linear-gradient(145deg, var(--obs-bg-3) 0%, var(--obs-bg-2) 100%);
  }

  .room-meeting-container .lk-participant-placeholder svg {
    width: min(40%, 120px);
    height: auto;
    opacity: 0.35;
  }

  .room-meeting-container .lk-participant-metadata {
    max-width: calc(100% - 1rem);
    min-width: 0;
  }

  .room-meeting-container .lk-participant-metadata-item {
    min-width: 0;
    max-width: 100%;
  }

  .room-meeting-container .lk-participant-name,
  .room-meeting-container .lk-participant-metadata {
    font-family: var(--obs-font-mono) !important;
    font-size: 11px !important;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    background: rgba(11,13,14,0.55) !important;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 6px !important;
    padding: 4px 8px !important;
    color: var(--obs-fg);
  }

  .room-meeting-container .lk-participant-metadata .lk-participant-name {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  .room-meeting-container .lk-participant-name[data-lk-local="true"] {
    color: var(--obs-accent) !important;
  }

  .preview-hand-toast-stack {
    position: absolute;
    top: 1rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 25;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    width: min(420px, calc(100% - 2rem));
    pointer-events: none;
  }

  .preview-hand-toast {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    max-width: 100%;
    padding: 0.65rem 1rem;
    border-radius: 12px;
    background: rgba(11,13,14,0.88);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(0,230,195,0.35);
    box-shadow:
      0 8px 32px -8px rgba(0,0,0,0.65),
      inset 0 0 0 1px rgba(255,255,255,0.04);
    color: var(--obs-fg);
    font-size: 14px;
    font-weight: 500;
    line-height: 1.35;
    animation: previewHandToastIn 280ms cubic-bezier(0.2, 0.8, 0.2, 1);
    pointer-events: auto;
  }

  .preview-hand-toast-icon {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: rgba(0,230,195,0.15);
    color: var(--obs-accent);
    font-size: 14px;
    line-height: 1;
  }

  .preview-hand-toast-message {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @keyframes previewHandToastIn {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes previewHandToastFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .meeting-tile-hand-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    border-radius: 5px;
    background: rgba(0,230,195,0.18);
    border: 1px solid rgba(0,230,195,0.4);
    color: var(--obs-accent);
    font-size: 11px;
    line-height: 1;
  }

  .room-meeting-container .lk-participant-metadata .lk-participant-metadata-item:has(.meeting-tile-hand-badge) {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    max-width: 100%;
  }

  .room-meeting-container .lk-participant-metadata .lk-participant-metadata-item:has(.meeting-tile-hand-badge) .lk-participant-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .room-meeting-container .lk-control-bar {
    flex-shrink: 0;
    margin: 0 0.75rem 0.75rem;
    padding: 0.5rem 0.75rem !important;
    background: rgba(15,17,19,0.72) !important;
    backdrop-filter: blur(24px) saturate(140%);
    -webkit-backdrop-filter: blur(24px) saturate(140%);
    border: 1px solid rgba(255,255,255,0.08) !important;
    border-radius: 16px !important;
    box-shadow: 0 12px 48px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05);
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 0.4rem;
    overflow-x: auto;
  }

  .room-meeting-container .lk-control-bar .lk-button {
    border-radius: 10px !important;
    background: rgba(255,255,255,0.04) !important;
    border: 1px solid rgba(255,255,255,0.06) !important;
    color: #f4f5f6 !important;
    font-family: var(--obs-font-body) !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    letter-spacing: -0.01em;
    min-width: 44px;
    min-height: 44px;
    padding: 0.55rem 0.85rem !important;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 160ms ease, border-color 160ms ease;
  }

  .room-meeting-container .lk-control-bar .lk-button svg {
    flex-shrink: 0;
  }

  .room-meeting-container .lk-control-bar .lk-button:hover {
    background: rgba(255,255,255,0.08) !important;
    border-color: rgba(255,255,255,0.14) !important;
  }

  .room-meeting-container .lk-control-bar .lk-button:focus-visible,
  .room-meeting-container .lk-control-bar .preview-raise-hand-btn:focus-visible {
    outline: 2px solid var(--obs-accent);
    outline-offset: 2px;
  }

  .room-meeting-container .lk-control-bar .lk-button[aria-pressed="true"] {
    background: linear-gradient(180deg, rgba(0,230,195,0.18), rgba(0,230,195,0.08)) !important;
    border-color: rgba(0,230,195,0.4) !important;
    color: #d6fff6 !important;
  }

  .room-meeting-container .lk-control-bar .lk-disconnect-button,
  .room-meeting-container .lk-control-bar .lk-button[data-lk-button-type="leave"] {
    background: linear-gradient(180deg, rgba(255,82,82,0.95), rgba(220,40,40,0.95)) !important;
    border-color: rgba(255,120,120,0.4) !important;
    color: #fff !important;
    font-weight: 600 !important;
  }

  .room-meeting-container .lk-control-bar .preview-raise-hand-btn .ri-hand {
    font-size: 16px;
    line-height: 1;
  }

  .lk-chat-panel {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 30;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: min(360px, 100%);
    padding: 0.75rem 0.75rem 0.75rem 0;
    transform: translateX(100%);
    opacity: 0;
    visibility: hidden;
    transition: transform 180ms cubic-bezier(0.4, 0, 1, 1),
      opacity 140ms linear,
      visibility 0s linear 180ms;
  }

  .lk-chat-panel[data-open="true"] {
    transform: translateX(0);
    opacity: 1;
    visibility: visible;
    transition: transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1),
      opacity 180ms linear,
      visibility 0s;
  }

  .lk-chat-panel > .lk-chat {
    display: grid !important;
    grid-template-rows: auto minmax(0, 1fr) auto;
    flex: 1 1 auto;
    width: 100%;
    min-height: 0;
    background: rgba(15, 17, 19, 0.82) !important;
    backdrop-filter: blur(24px) saturate(140%);
    -webkit-backdrop-filter: blur(24px) saturate(140%);
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 16px !important;
    box-shadow: 0 12px 48px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05);
    overflow: hidden;
  }

  .lk-chat-panel .lk-chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin: 0;
    padding: 0.5rem 0.5rem 0.5rem 0.875rem;
    font-family: var(--obs-font-mono);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.6);
    border-bottom: 1px solid rgba(255,255,255,0.07);
  }

  .lk-chat-panel .lk-chat-header .lk-close-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    padding: 0;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: rgba(255,255,255,0.65);
    cursor: pointer;
    transition: background 160ms ease, color 160ms ease;
  }

  .lk-chat-panel .lk-chat-header .lk-close-button:hover {
    background: rgba(255,255,255,0.08);
    color: #fff;
  }

  .lk-chat-panel .lk-chat-header .lk-close-button:focus-visible {
    outline: 2px solid var(--obs-accent);
    outline-offset: -2px;
  }

  .lk-chat-panel .lk-chat-messages {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-height: 0;
    margin: 0;
    padding: 0.875rem;
    overflow-y: auto;
    overscroll-behavior: contain;
    list-style: none;
    scrollbar-width: thin;
  }

  .lk-chat-panel .lk-chat-messages::-webkit-scrollbar {
    width: 6px;
  }

  .lk-chat-panel .lk-chat-messages::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.18);
    border-radius: 999px;
  }

  /* Preview imports @livekit/components-styles; reset its chat prefab rules
   * (inline-block body + max-width: calc(100% - 32px)) so local bubbles are not
   * squeezed to one character wide when align-self: flex-end shrinks the entry. */
  .lk-chat-panel .lk-chat-entry {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: fit-content;
    max-width: 88%;
    margin: 0;
    padding: 0.45rem 0.7rem;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    background: rgba(255,255,255,0.055);
    font-size: 13px;
    line-height: 1.5;
    color: rgba(255,255,255,0.92);
    overflow-wrap: break-word;
    word-break: normal;
    animation: lkChatIn 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .lk-chat-panel .lk-chat-entry[data-lk-message-origin="local"] {
    align-self: flex-end;
    background: rgba(0,230,195,0.13);
    border-color: rgba(0,230,195,0.26);
  }

  .lk-chat-panel .lk-chat-entry[data-lk-message-origin="remote"] {
    align-self: flex-start;
  }

  .lk-chat-panel .lk-meta-data {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.25rem 0.4rem;
    margin-bottom: 0.15rem;
    min-width: 0;
  }

  .lk-chat-panel .lk-chat-entry .lk-participant-name {
    margin-top: 0 !important;
    padding: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    font-family: inherit !important;
    font-size: 11px !important;
    font-weight: 600;
    letter-spacing: 0 !important;
    text-transform: none !important;
    color: var(--obs-accent) !important;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
    min-width: 0;
    flex: 1 1 auto;
  }

  .lk-chat-panel .lk-timestamp {
    margin-left: auto;
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    color: rgba(255,255,255,0.4);
  }

  .lk-chat-panel .lk-message-body {
    display: block;
    width: auto;
    max-width: none;
    min-width: 2.5ch;
    margin: 0;
    padding: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    overflow-wrap: anywhere;
    word-break: normal;
  }

  .lk-chat-panel .lk-message-body .preview-chat-link {
    color: var(--obs-accent, #00E6C3);
    text-decoration: none;
    text-underline-offset: 2px;
  }

  .lk-chat-panel .lk-message-body .preview-chat-link:hover {
    text-decoration: underline;
  }

  .lk-chat-panel .lk-message-body .preview-chat-link:focus-visible {
    outline: 2px solid var(--obs-accent, #00E6C3);
    outline-offset: 2px;
    border-radius: 2px;
  }

  .preview-chat-empty {
    margin: auto 0;
    padding: 1rem;
    text-align: center;
    font-size: 13px;
    color: rgba(255,255,255,0.45);
    list-style: none;
  }

  .preview-chat-scroll-anchor {
    height: 0;
    margin: 0;
    padding: 0;
    list-style: none;
    overflow: hidden;
  }

  .lk-chat-panel .preview-chat-form {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    border-top: 1px solid rgba(255,255,255,0.07);
    max-height: none;
  }

  .lk-chat-panel .preview-chat-composer {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex: 1 1 12rem;
    min-width: 0;
  }

  .lk-chat-panel .preview-chat-form .lk-chat-form-button {
    flex: 0 0 auto;
  }

  .lk-chat-panel .preview-chat-form .preview-chat-composer {
    flex: 1 1 12rem;
  }

  .preview-chat-form-input-wrap {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    align-items: center;
    min-height: 44px;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    background: rgba(255,255,255,0.05);
    padding: 0 0.75rem;
  }

  .preview-chat-form-input-wrap:focus-within {
    outline: 2px solid var(--obs-accent);
    outline-offset: 1px;
    border-color: transparent;
  }

  .lk-chat-panel .preview-chat-form-input {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 44px;
    border: 0 !important;
    background: transparent !important;
    padding: 0 !important;
    color: #fff;
    font: inherit;
    font-size: 14px;
  }

  .lk-chat-panel .preview-chat-form-input::placeholder {
    color: rgba(255,255,255,0.36);
  }

  .lk-chat-panel .preview-chat-form-input:focus,
  .lk-chat-panel .preview-chat-form-input:focus-visible {
    outline: none;
  }

  .preview-emoji-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: rgba(255,255,255,0.7);
    cursor: pointer;
    flex-shrink: 0;
    font-size: 18px;
    line-height: 1;
    padding: 0;
  }

  .preview-emoji-btn i {
    display: block;
    line-height: 1;
  }

  .preview-emoji-btn:hover,
  .preview-emoji-btn[aria-expanded="true"] {
    background: rgba(255,255,255,0.08);
    color: #fff;
  }

  .preview-emoji-btn:focus-visible {
    outline: 2px solid var(--obs-accent);
    outline-offset: 1px;
  }

  .preview-emoji-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .preview-emoji-picker {
    position: absolute;
    left: 0;
    right: 0;
    bottom: calc(100% + 0.35rem);
    z-index: 40;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    max-height: min(40vh, 220px);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0.5rem;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(15,17,19,0.95);
    backdrop-filter: blur(16px);
    box-shadow: 0 12px 32px -8px rgba(0,0,0,0.65);
    scrollbar-width: thin;
  }

  .preview-emoji-picker-row {
    display: grid;
    grid-template-columns: repeat(6, minmax(44px, 1fr));
    gap: 0.25rem;
  }

  .preview-emoji-picker button {
    min-width: 44px;
    min-height: 44px;
    width: 100%;
    aspect-ratio: 1;
    border: 0;
    border-radius: 8px;
    background: transparent;
    font-size: 1.25rem;
    cursor: pointer;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .preview-emoji-picker button:hover {
    background: rgba(255,255,255,0.08);
  }

  .preview-emoji-picker button:focus-visible {
    outline: 2px solid var(--obs-accent);
    outline-offset: 1px;
    background: rgba(255,255,255,0.08);
  }

  .lk-chat-panel .lk-chat-form-button {
    min-height: 44px;
    padding: 0 1rem;
    border: 0;
    border-radius: 12px;
    background: var(--obs-accent) !important;
    color: #06231f !important;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    flex-shrink: 0;
  }

  .lk-chat-panel .lk-chat-form-button:hover:not(:disabled) {
    filter: brightness(1.08);
  }

  .lk-chat-panel .lk-chat-form-input:disabled,
  .lk-chat-panel .lk-chat-form-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .lk-chat-panel[data-offline="true"] .lk-chat-form-input,
  .lk-chat-panel[data-offline="true"] .lk-chat-form-button,
  .lk-chat-panel[data-offline="true"] .preview-emoji-btn {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .lk-chat-offline {
    flex: 0 0 auto;
    margin: 0 0.75rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid rgba(255,176,86,0.3);
    border-radius: 12px;
    background: rgba(255,176,86,0.12);
    color: #ffce9a;
    font-size: 12px;
    line-height: 1.45;
  }

  .preview-chat-send-error {
    flex: 1 1 100%;
    margin: 0;
    padding: 0.35rem 0.5rem;
    border-radius: 8px;
    background: rgba(255,82,82,0.12);
    border: 1px solid rgba(255,82,82,0.28);
    color: #ffb4b4;
    font-size: 12px;
    line-height: 1.4;
  }

  /* Unread dot on chat toggle — counts only while chat is closed (production parity). */
  #chat-button-slot .lk-button {
    position: relative;
  }

  .lk-video-conference[data-unread="true"] #chat-button-slot .lk-button::after {
    content: "";
    position: absolute;
    top: 6px;
    right: 6px;
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: var(--obs-accent, #00E6C3);
    box-shadow: 0 0 0 2px rgba(15,17,19,0.9);
  }

  .preview-chat-unread-badge {
    position: absolute;
    top: 2px;
    right: 2px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 999px;
    background: var(--obs-accent, #00E6C3);
    color: #06231f;
    font-size: 10px;
    font-weight: 700;
    line-height: 16px;
    text-align: center;
    box-shadow: 0 0 0 2px rgba(15,17,19,0.9);
    pointer-events: none;
  }

  .lk-video-conference[data-unread="true"] #chat-button-slot .lk-button:has(.preview-chat-unread-badge)::after {
    display: none;
  }

  @keyframes lkChatIn {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .preview-hint-bar {
    flex-shrink: 0;
    padding: 0.5rem 1rem;
    font-size: 12px;
    color: var(--obs-fg-faint);
    text-align: center;
    border-top: 1px solid var(--obs-line);
  }

  @media (max-width: 640px) {
    .preview-hand-toast-stack {
      top: 0.65rem;
      width: calc(100% - 1rem);
    }

    .preview-hand-toast {
      font-size: 13px;
      padding: 0.55rem 0.85rem;
    }

    .room-meeting-container .lk-grid-layout {
      grid-gap: 0.25rem;
      padding: 0.25rem;
    }

    .preview-emoji-picker {
      max-height: min(35vh, 200px);
    }

    .room-meeting-container .lk-control-bar {
      margin: 0;
      border-radius: 0 !important;
      border-left: 0 !important;
      border-right: 0 !important;
      border-bottom: 0 !important;
      padding-left: max(0.75rem, env(safe-area-inset-left)) !important;
      padding-right: max(0.75rem, env(safe-area-inset-right)) !important;
      padding-bottom: max(0.75rem, env(safe-area-inset-bottom)) !important;
    }

    .lk-chat-panel {
      width: 100%;
      padding: 0.5rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .room-meeting-container .lk-cam-tile {
      animation: none;
    }

    .room-meeting-container .lk-participant-tile {
      transition: none;
    }

    .lk-chat-panel,
    .lk-chat-panel[data-open="true"] {
      transform: none;
      transition: opacity 120ms linear, visibility 0s linear 120ms;
    }

    .lk-chat-panel[data-open="true"] {
      transition: opacity 120ms linear, visibility 0s;
    }

    .lk-chat-panel .lk-chat-entry {
      animation: none;
    }

    .room-meeting-container .lk-control-bar .lk-button {
      transition: none;
    }

    .preview-hand-toast {
      animation: previewHandToastFadeIn 200ms linear;
    }
  }

  ${MEETING_CONTROL_BAR_RESPONSIVE_CSS}
`;
