/** Human-readable lines for who set Deferred / Cancelled on a placement. */

export type PlacementActorRef = { name?: string; email?: string } | null | undefined

export type PlacementForActor = {
  status?: string
  deferredBy?: PlacementActorRef
  deferredAt?: string | null
  cancelledBy?: PlacementActorRef
  cancelledAt?: string | null
} | null | undefined

function label(u: PlacementActorRef): string {
  if (!u) return "Unknown user"
  const n = (u.name || "").trim()
  if (n) return n
  return (u.email || "").trim() || "Unknown user"
}

/**
 * One line for current Deferred / Cancelled; optional "Previously deferred" when status moved on.
 */
export function getPlacementStatusActorSummary(placement: PlacementForActor): { primary: string | null; secondary: string | null } {
  if (!placement) return { primary: null, secondary: null }
  const st = placement.status
  if (st === "Cancelled" && (placement.cancelledBy?.name || placement.cancelledBy?.email)) {
    return {
      primary: `Cancelled by ${label(placement.cancelledBy)}${
        placement.cancelledAt ? ` · ${new Date(placement.cancelledAt).toLocaleString()}` : ""
      }`,
      secondary: null,
    }
  }
  if (st === "Deferred" && (placement.deferredBy?.name || placement.deferredBy?.email)) {
    return {
      primary: `Deferred by ${label(placement.deferredBy)}${
        placement.deferredAt ? ` · ${new Date(placement.deferredAt).toLocaleString()}` : ""
      }`,
      secondary: null,
    }
  }
  if (st && st !== "Deferred" && st !== "Cancelled" && (placement.deferredBy?.name || placement.deferredBy?.email) && placement.deferredAt) {
    return {
      primary: null,
      secondary: `Previously deferred by ${label(placement.deferredBy)} · ${new Date(placement.deferredAt).toLocaleString()}`,
    }
  }
  return { primary: null, secondary: null }
}
