/**
 * Field validators for the sign-in, register and forgot/reset password pages.
 * Each returns an error message, or null when the value is valid.
 *
 * Password rules mirror `password` in uat.dharwin.backend/src/validations/custom.validation.js
 * (min 8, one capital letter, one number) — keep them in sync.
 * ponytail: the email regex is a shape check only; the backend's Joi .email() also checks the
 * TLD against the IANA list, so a typo like "x@gmail.con" is still rejected server-side.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_HINT = "At least 8 characters, with 1 capital letter and 1 number.";

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/;

export function validateEmail(value: string): string | null {
  const v = value.trim();
  if (!v) return "Email is required.";
  if (!EMAIL_RE.test(v)) return "Enter a valid email address, like name@example.com.";
  return null;
}

/** Sign-in only checks presence: existing accounts may predate the current rules. */
export function validateLoginPassword(value: string): string | null {
  return value ? null : "Password is required.";
}

export function validateNewPassword(value: string): string | null {
  if (!value) return "Password is required.";
  if (value.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (!/[A-Z]/.test(value)) return "Password must contain at least 1 capital letter.";
  if (!/\d/.test(value)) return "Password must contain at least 1 number.";
  return null;
}

export function validateConfirmPassword(password: string, confirm: string): string | null {
  if (!confirm) return "Please confirm your password.";
  return password === confirm ? null : "Passwords do not match.";
}
