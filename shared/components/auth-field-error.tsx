"use client";

export const AUTH_ERROR_COLOR = "#D92D20";

/** Inline error under an auth-page input. `id` must match the input's aria-describedby. */
export function AuthFieldError({ id, message }: { id: string; message?: string | null }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      style={{ display: "flex", alignItems: "center", gap: 6, margin: 0, fontSize: 13, lineHeight: "150%", color: AUTH_ERROR_COLOR, fontFamily: "'Poppins', sans-serif" }}
    >
      <i className="ri-error-warning-line" aria-hidden="true" />
      {message}
    </p>
  );
}
