"use client";

/**
 * Eye icon button for auth password fields.
 */
export function AuthPasswordToggle({
  visible,
  onToggle,
  label = "toggle password visibility",
}: {
  visible: boolean;
  onToggle: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onToggle}
      className="absolute end-4 top-1/2 flex -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 cursor-pointer"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z"
          stroke="#98A2B3"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
          stroke="#98A2B3"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {!visible && (
          <path d="M2 2L22 22" stroke="#98A2B3" strokeWidth="1.5" strokeLinecap="round" />
        )}
      </svg>
    </button>
  );
}
