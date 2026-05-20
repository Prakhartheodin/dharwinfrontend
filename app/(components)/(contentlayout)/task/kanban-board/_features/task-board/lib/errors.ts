type ApiErrorShape = {
  status?: number;
  message?: string;
  errors?: Record<string, string>;
  correlationId?: string;
};

export type ErrorClass =
  | "network"
  | "auth"
  | "permission"
  | "validation"
  | "server"
  | "unknown";

function isErrorWithStatus(e: unknown): e is { status: number } {
  return typeof e === "object" && e !== null && "status" in (e as object);
}

export function classifyError(err: unknown): ErrorClass {
  if (err instanceof TypeError && /fetch/i.test(err.message)) return "network";
  if (!isErrorWithStatus(err)) return "unknown";
  const s = (err as { status: number }).status;
  if (s === 401) return "auth";
  if (s === 403) return "permission";
  if (s === 422) return "validation";
  if (s >= 500 && s < 600) return "server";
  return "unknown";
}

export function humanizeApiError(
  err: unknown,
  fallback = "Something went wrong."
): string {
  switch (classifyError(err)) {
    case "network":
      return "Network error. Check your connection.";
    case "auth":
      return "Session expired. Please sign in again.";
    case "permission":
      return "You don't have permission for this action.";
    case "validation": {
      const fields = (err as ApiErrorShape).errors;
      if (fields) {
        const first = Object.entries(fields)[0];
        if (first) return `${first[0]}: ${first[1]}`;
      }
      return "Some fields are invalid.";
    }
    case "server":
      return "Server error. We've been notified.";
    default:
      if (err instanceof Error && err.message) return err.message;
      if (typeof (err as ApiErrorShape).message === "string") {
        return (err as ApiErrorShape).message!;
      }
      return fallback;
  }
}

export function extractCorrelationId(err: unknown): string | undefined {
  if (err && typeof err === "object" && "correlationId" in err) {
    const v = (err as ApiErrorShape).correlationId;
    return typeof v === "string" ? v : undefined;
  }
  return undefined;
}

export class TaskBoardError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "TaskBoardError";
  }
}

/** @deprecated Prefer humanizeApiError */
export function getErrorMessage(e: unknown): string {
  return humanizeApiError(e);
}
