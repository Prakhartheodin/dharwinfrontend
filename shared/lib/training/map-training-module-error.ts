import { AxiosError } from "axios"

/**
 * Map API / Joi / generic errors to copy suitable for Swal (never raw Joi).
 * @param err Caught error
 * @param fallback Used when nothing matches
 */
export function mapTrainingModuleError(err: unknown, fallback: string): string {
  const raw = extractRawMessage(err)
  const combined = raw.toLowerCase()

  if (
    combined.includes("students") ||
    combined.includes("mentorsassigned") ||
    combined.includes("mentors assigned")
  ) {
    return "Could not save assigned students or mentors. Please try again."
  }
  if (combined.includes("categories") && combined.includes("array")) {
    return "Could not save folders. Please try again."
  }
  if (combined.includes("positions") && combined.includes("array")) {
    return "Could not save positions. Please try again."
  }
  if (combined.includes("playlist") && (combined.includes("required") || combined.includes("before publishing"))) {
    return "Add at least one playlist item before publishing."
  }
  if (combined.includes("must be an array") || combined.includes('"must be')) {
    return fallback
  }

  return raw || fallback
}

/**
 * Pull message from Axios body, Error, or string.
 */
function extractRawMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: unknown } | undefined
    if (data?.message != null) return String(data.message)
    if (err.message) return err.message
  }
  if (err instanceof Error) return err.message
  if (typeof err === "string") return err
  return ""
}
