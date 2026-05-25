export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function userDisplay(u: { name?: string; email?: string } | null | undefined): string {
  if (!u) return "—";
  const n = u.name?.trim();
  if (n && u.email?.trim()) return `${n} · ${u.email.trim()}`;
  if (n) return n;
  if (u.email?.trim()) return u.email.trim();
  return "—";
}
