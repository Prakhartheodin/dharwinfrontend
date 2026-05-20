/** Strip HTML and cap length for saved view names. */
export function sanitizeViewName(name: string): string {
  return String(name ?? "")
    .replace(/<[^>]*>/g, "")
    .trim()
    .slice(0, 80);
}

/** Plain-text display for task titles/descriptions in the board UI. */
export function sanitizeText(value: string | undefined | null): string {
  return String(value ?? "")
    .replace(/<[^>]*>/g, "")
    .trim();
}
