export const EXPIRED_TEXT = "This draft expired — ask Sage again";

/** Label only. A laptop clock must not settle the card. */
export function expiryLabel(expiresAt, now) {
  const t = Date.parse(expiresAt);
  if (Number.isNaN(t)) return null;
  const left = t - now;
  if (left > 0) {
    if (left < 60_000) return "expires in under a minute";
    return `expires in ${Math.ceil(left / 60_000)} min`;
  }
  return EXPIRED_TEXT;
}

/** Only a 410 or a server status of expired settles the card. */
export function serverSettlesExpired(httpStatus, status) {
  return httpStatus === 410 || status === "expired";
}
