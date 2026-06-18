/** Shared mobile rules so every LiveKit + host control stays reachable on phones. */
export const MEETING_CONTROL_BAR_RESPONSIVE_CSS = `
@media (max-width: 760px) {
  .lk-control-bar {
    max-height: none !important;
    height: auto !important;
    min-height: 3.25rem;
    width: 100%;
    flex-wrap: nowrap !important;
    justify-content: flex-start !important;
    align-items: center;
    overflow-x: auto !important;
    overflow-y: hidden !important;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
    scrollbar-width: thin;
    gap: 0.4rem !important;
    scroll-padding-inline: 0.5rem;
  }
  .lk-control-bar > *,
  .lk-control-bar .lk-button-group {
    flex-shrink: 0;
  }
  .lk-control-bar .lk-button,
  .lk-control-bar .lk-disconnect-button,
  .lk-control-bar .lk-start-audio-button {
    min-width: 44px;
    min-height: 44px;
    padding: 0.5rem 0.65rem !important;
  }
  #recording-button-slot,
  #end-meeting-button-slot {
    flex-shrink: 0;
  }
  #recording-button-slot .lk-button,
  #end-meeting-button-slot .lk-button {
    min-width: 44px;
    min-height: 44px;
    padding: 0.5rem 0.65rem !important;
  }
  .lk-host-action-btn__label,
  .lk-recording-timer-label {
    display: none;
  }
}
`;
