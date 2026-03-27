"use client";

import type { ActivityLog } from "@/shared/lib/types";
import {
  formatActivityLogClientGeoLine,
  formatActivityLogIpGeoLine,
} from "@/shared/lib/activity-log-location-display";

/**
 * Location column: stored IP-derived geo (and optional browser GPS) for this log row’s HTTP request — not the viewer’s network.
 */
export function ActivityLogLocationCell({
  log,
  className,
}: {
  log: ActivityLog;
  className?: string;
}) {
  const ipGeoLine = formatActivityLogIpGeoLine(log.geo);
  const browserLine = formatActivityLogClientGeoLine(log.clientGeo);
  const placeLine = ipGeoLine || "—";

  return (
    <div className={className}>
      {browserLine ? (
        <>
          <div className="font-medium text-defaulttextcolor">{browserLine}</div>
          <div className="mt-0.5 text-[0.7rem] text-defaulttextcolor/55">{placeLine}</div>
        </>
      ) : (
        <div>{placeLine}</div>
      )}
    </div>
  );
}
