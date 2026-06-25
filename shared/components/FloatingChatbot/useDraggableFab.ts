"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type FabSide = "left" | "right";

export interface FabPosition {
  side: FabSide;
  topPct: number; // 0..1 of viewport height (anchor center)
}

interface Options {
  storageKey: string;
  fabSize: number; // px
  margin: number; // edge margin px
  defaultPos?: FabPosition;
  onClick?: () => void;
}

const DRAG_THRESHOLD_MOUSE = 5; // px
const DRAG_THRESHOLD_TOUCH = 12; // px — touch slop; avoids classifying taps as drags

function clamp(v: number, lo: number, hi: number) {
  return Math.min(Math.max(v, lo), hi);
}

function loadPosition(key: string, fallback: FabPosition): FabPosition {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (
      (parsed.side === "left" || parsed.side === "right") &&
      typeof parsed.topPct === "number" &&
      parsed.topPct >= 0 &&
      parsed.topPct <= 1
    ) {
      return parsed;
    }
  } catch {
    /* ignore corrupt entry */
  }
  return fallback;
}

/**
 * Draggable floating button hook.
 * - 5px movement threshold separates click from drag.
 * - On release, snaps horizontally to nearest viewport edge.
 * - Persists `{side, topPct}` so position survives reload + viewport resize.
 */
export function useDraggableFab({
  storageKey,
  fabSize,
  margin,
  defaultPos = { side: "right", topPct: 0.88 },
  onClick,
}: Options) {
  const [position, setPosition] = useState<FabPosition>(defaultPos);
  const [isDragging, setIsDragging] = useState(false);
  const [livePos, setLivePos] = useState<{ x: number; y: number } | null>(null);

  const startRef = useRef<{ x: number; y: number; pointerId: number; pointerType: string } | null>(null);
  const movedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const tapHandledRef = useRef(false);
  const fabRef = useRef<HTMLButtonElement>(null);

  const dragThresholdFor = (pointerType: string) =>
    pointerType === "touch" ? DRAG_THRESHOLD_TOUCH : DRAG_THRESHOLD_MOUSE;

  useEffect(() => {
    setPosition(loadPosition(storageKey, defaultPos));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const computeStyle = useCallback((): React.CSSProperties => {
    const touchAction = isDragging ? "none" : "manipulation";
    if (livePos) {
      return {
        position: "fixed",
        left: livePos.x - fabSize / 2,
        top: livePos.y - fabSize / 2,
        right: "auto",
        bottom: "auto",
        touchAction,
      };
    }
    const top = `calc(${position.topPct * 100}vh - ${fabSize / 2}px)`;
    return {
      position: "fixed",
      top,
      [position.side]: `max(${margin}px, env(safe-area-inset-${position.side}, 0px))`,
      touchAction,
    } as React.CSSProperties;
  }, [livePos, position, fabSize, margin, isDragging]);

  const fireTap = useCallback(() => {
    if (tapHandledRef.current) return;
    tapHandledRef.current = true;
    onClick?.();
    window.setTimeout(() => {
      tapHandledRef.current = false;
    }, 400);
  }, [onClick]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
    };
    movedRef.current = false;
    suppressClickRef.current = false;
    // Defer capture on touch — immediate capture suppresses quick taps on mobile.
    if (e.pointerType === "mouse") {
      fabRef.current?.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const start = startRef.current;
    if (!start || start.pointerId !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const threshold = dragThresholdFor(start.pointerType);
    if (!movedRef.current && Math.hypot(dx, dy) < threshold) return;

    if (!movedRef.current) {
      movedRef.current = true;
      suppressClickRef.current = true;
      try {
        fabRef.current?.setPointerCapture(e.pointerId);
      } catch {
        /* not captured */
      }
    }

    setIsDragging(true);
    setLivePos({
      x: clamp(e.clientX, fabSize / 2 + 4, window.innerWidth - fabSize / 2 - 4),
      y: clamp(e.clientY, fabSize / 2 + 4, window.innerHeight - fabSize / 2 - 4),
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const start = startRef.current;
    startRef.current = null;
    try {
      fabRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* not captured */
    }

    if (!movedRef.current) {
      setIsDragging(false);
      setLivePos(null);
      fireTap();
      return;
    }

    const cx = e.clientX;
    const cy = e.clientY;
    const side: FabSide = cx < window.innerWidth / 2 ? "left" : "right";
    const topPct = clamp(cy / window.innerHeight, 0.06, 0.94);
    const next: FabPosition = { side, topPct };
    setPosition(next);
    setLivePos(null);
    setIsDragging(false);
    suppressClickRef.current = true;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);

    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* quota exceeded — non-fatal */
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    const wasTap = startRef.current && !movedRef.current;
    startRef.current = null;
    try {
      fabRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* not captured */
    }
    setIsDragging(false);
    setLivePos(null);
    if (wasTap) fireTap();
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (suppressClickRef.current || tapHandledRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    fireTap();
  };

  return {
    fabRef,
    position,
    isDragging,
    style: computeStyle(),
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onClick: handleClick,
    },
  };
}
