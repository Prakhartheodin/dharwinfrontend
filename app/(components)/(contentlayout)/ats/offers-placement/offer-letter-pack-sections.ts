/**
 * Greedily pack block heights into sheet start indices (each section stays whole).
 * Sheeting: sections [start0..start1), [start1..start2), …
 */
/* Fallback when the live body probe has not laid out yet (≈ 1123px sheet − head − foot − padding). */
export const DEFAULT_OFFER_LETTER_BODY_MAX_PX = 900

export function packSectionHeightsIntoPageStarts(
  heights: number[],
  maxContentPx: number
): number[] {
  if (heights.length === 0) return [0]

  const starts: number[] = [0]
  let acc = 0

  for (let i = 0; i < heights.length; i++) {
    const h = Math.max(0, heights[i] ?? 0)

    if (h > maxContentPx) {
      if (acc > 0 && i > (starts[starts.length - 1] ?? 0)) {
        starts.push(i)
      }
      acc = h
      continue
    }

    if (acc === 0) {
      acc = h
      continue
    }

    if (acc + h > maxContentPx) {
      starts.push(i)
      acc = h
    } else {
      acc += h
    }
  }

  return starts
}
