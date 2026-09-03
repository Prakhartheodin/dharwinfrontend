export type ExternalJobErrorKind =
  | "rate_limit"
  | "provider_down"
  | "network"
  | "forbidden"
  | "stale_results"
  | "generic";

export interface ExternalJobUserError {
  kind: ExternalJobErrorKind;
  message: string;
  status?: number;
  /** Suggested wait before retry (e.g. rate limit). */
  retryAfterSec?: number;
  canRetry: boolean;
}

type AxiosLikeError = {
  response?: { status?: number; data?: { message?: string } };
  request?: unknown;
  message?: string;
  code?: string;
};

function isNetworkError(err: AxiosLikeError): boolean {
  return Boolean(err.request && !err.response) || err.code === "ERR_NETWORK";
}

function normalizeBackendMessage(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  if (lower === "bad request" || lower === "internal server error") return undefined;
  return trimmed;
}

/**
 * Map an API failure to user-facing copy for external-jobs search / load-more.
 * `hasStaleResults` = prior successful rows still on screen (do not wipe on error).
 */
export function mapExternalJobSearchError(
  err: unknown,
  hasStaleResults = false
): ExternalJobUserError {
  const e = err as AxiosLikeError;
  const status = e?.response?.status;
  const backendMsg = normalizeBackendMessage(e?.response?.data?.message);

  if (status === 429) {
    return {
      kind: "rate_limit",
      status: 429,
      message:
        "Search limit reached — wait about a minute. (The Search button also waits 5 seconds between clicks.)",
      retryAfterSec: 60,
      canRetry: true,
    };
  }

  if (status === 403) {
    return {
      kind: "forbidden",
      status: 403,
      message: "You don't have access to search external jobs.",
      canRetry: false,
    };
  }

  if (status === 502 || status === 503) {
    return {
      kind: "provider_down",
      status,
      message: "External job feed temporarily unavailable. Try again or switch source.",
      canRetry: true,
    };
  }

  if (isNetworkError(e)) {
    return {
      kind: "network",
      message: "Connection problem. Check your network and try again.",
      canRetry: true,
    };
  }

  if (hasStaleResults) {
    return {
      kind: "stale_results",
      status,
      message: "Couldn't complete this search — showing results from your last successful search.",
      canRetry: true,
    };
  }

  if (status === 400 || status === 500) {
    return {
      kind: "generic",
      status,
      message:
        backendMsg ??
        (status === 400
          ? "Search couldn't complete. Check your filters and try again."
          : "Search couldn't complete. Try again in a moment."),
      canRetry: true,
    };
  }

  return {
    kind: "generic",
    status,
    message: backendMsg ?? e?.message ?? "Search couldn't complete.",
    canRetry: true,
  };
}

export function mapExternalJobLoadError(err: unknown): ExternalJobUserError {
  const e = err as AxiosLikeError;
  const status = e?.response?.status;
  const backendMsg = normalizeBackendMessage(e?.response?.data?.message);

  if (status === 429) {
    return {
      kind: "rate_limit",
      status: 429,
      message: "Search limit reached — wait about a minute before loading more.",
      retryAfterSec: 60,
      canRetry: true,
    };
  }

  if (status === 502 || status === 503) {
    return {
      kind: "provider_down",
      status,
      message: "External job feed temporarily unavailable.",
      canRetry: true,
    };
  }

  if (isNetworkError(e)) {
    return {
      kind: "network",
      message: "Connection problem. Couldn't load more jobs.",
      canRetry: true,
    };
  }

  return {
    kind: "generic",
    status,
    message: backendMsg ?? "Couldn't load more jobs.",
    canRetry: true,
  };
}

export function mapExternalJobListError(err: unknown, label: string): ExternalJobUserError {
  const e = err as AxiosLikeError;
  const backendMsg = normalizeBackendMessage(e?.response?.data?.message);

  if (isNetworkError(e)) {
    return {
      kind: "network",
      message: `Connection problem. Couldn't load ${label}.`,
      canRetry: true,
    };
  }

  return {
    kind: "generic",
    status: e?.response?.status,
    message: backendMsg ?? `Couldn't load ${label}.`,
    canRetry: true,
  };
}
