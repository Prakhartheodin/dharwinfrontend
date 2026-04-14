/** Marker appended when optional intake fields are merged into `description` (plain text). */
export const PROJECT_INTAKE_PLAIN_MARKER = "--- Project brief (intake) ---";

/** Remove a previously merged intake block so re-saving does not duplicate sections. */
export function stripMergedIntakeFromPlainDescription(plain: string): string {
  const t = plain.trim();
  const idx = t.indexOf(PROJECT_INTAKE_PLAIN_MARKER);
  if (idx === -1) return t;
  return t.slice(0, idx).trim();
}

/**
 * Merge rich-text body (caller strips HTML first) with optional intake answers for API storage.
 */
export function composeProjectDescriptionPlainFromParts(args: {
  mainPlain: string;
  intakeSuccess?: string;
  intakeConstraints?: string;
  intakeMilestones?: string;
}): string | undefined {
  const base = stripMergedIntakeFromPlainDescription(args.mainPlain);
  const success = String(args.intakeSuccess ?? "").trim();
  const constraints = String(args.intakeConstraints ?? "").trim();
  const milestones = String(args.intakeMilestones ?? "").trim();
  const parts: string[] = [];
  if (base) parts.push(base);
  if (success || constraints || milestones) {
    parts.push(`\n\n${PROJECT_INTAKE_PLAIN_MARKER}`);
    if (success) parts.push(`\nSuccess / done-when:\n${success}`);
    if (constraints) parts.push(`\nConstraints / dependencies:\n${constraints}`);
    if (milestones) parts.push(`\nMilestones / phases:\n${milestones}`);
  }
  const full = parts.join("").trim();
  return full || undefined;
}
