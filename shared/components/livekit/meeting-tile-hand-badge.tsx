"use client";

import { useLayoutEffect, type RefObject } from "react";

export function MeetingTileHandBadge() {
  return (
    <span className="meeting-tile-hand-badge" aria-label="Hand raised">
      <i className="ri-hand" aria-hidden="true" />
    </span>
  );
}

/** Inline hand badge beside ParticipantTile name (LiveKit renders the name internally). */
export function MeetingTileHandInMetadata({
  active,
  containerRef,
}: {
  active: boolean;
  containerRef: RefObject<HTMLElement | null>;
}) {
  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const metaItem = root.querySelector<HTMLElement>(
      ".lk-participant-metadata .lk-participant-metadata-item"
    );
    if (!metaItem) return;

    const badgeClass = "meeting-tile-hand-badge";
    let badge = metaItem.querySelector<HTMLElement>(`.${badgeClass}`);

    if (!active) {
      badge?.remove();
      return;
    }

    if (!badge) {
      badge = document.createElement("span");
      badge.className = badgeClass;
      badge.setAttribute("aria-label", "Hand raised");
      const icon = document.createElement("i");
      icon.className = "ri-hand";
      icon.setAttribute("aria-hidden", "true");
      badge.appendChild(icon);
    }

    const name = metaItem.querySelector(".lk-participant-name");
    if (name) {
      if (badge.parentElement !== metaItem || badge.nextElementSibling !== name) {
        metaItem.insertBefore(badge, name);
      }
      return;
    }

    if (badge.parentElement !== metaItem) {
      metaItem.prepend(badge);
    }
  }, [active, containerRef]);

  return null;
}
