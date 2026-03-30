"use client";

import type { ActivityLog } from "@/shared/lib/types";
import {
  formatActivityLogClientGeoPlaceLine,
  formatActivityLogIpGeoLine,
} from "@/shared/lib/activity-log-location-display";

const gpsHint = (
  <span className="sr-only">GPS-based place</span>
);
const ipApproxHint = (
  <span className="sr-only">IP-based approximate location</span>
);

/**
 * Location column: device place (GPS / reverse-geocode) as primary when present; IP-based geo as secondary or sole fallback.
 */
export function ActivityLogLocationCell({
  log,
  className,
}: {
  log: ActivityLog;
  className?: string;
}) {
  const ipLine = formatActivityLogIpGeoLine(log.geo);
  const hasIpPlace = ipLine !== "—";
  const gpsPlace = formatActivityLogClientGeoPlaceLine(log.clientGeo);
  const cg = log.clientGeo;
  const hasLegacyCoordsOnly =
    !gpsPlace &&
    cg != null &&
    typeof cg.lat === "number" &&
    typeof cg.lng === "number" &&
    Number.isFinite(cg.lat) &&
    Number.isFinite(cg.lng);
  const hasGps = Boolean(gpsPlace || hasLegacyCoordsOnly);

  return (
    <div className={className}>
      {hasGps ? (
        <>
          <div className="font-medium text-defaulttextcolor flex items-start gap-1.5">
            <i className="ri-map-pin-2-fill text-primary shrink-0 text-[1rem] mt-0.5" aria-hidden />
            <span>
              {gpsPlace || (
                <span className="text-[0.8125rem] text-defaulttextcolor/75">
                  Device location (legacy entry, no place name)
                </span>
              )}
              <span className="text-[0.65rem] font-normal text-defaulttextcolor/50 ms-1">(GPS)</span>
              {gpsHint}
            </span>
          </div>
          {hasIpPlace ? (
            <div className="mt-0.5 text-[0.7rem] text-defaulttextcolor/60 flex items-start gap-1.5">
              <i className="ri-earth-line shrink-0 text-[0.95rem] mt-px opacity-70" aria-hidden />
              <span>
                {ipLine}
                <span className="text-[0.62rem] text-defaulttextcolor/45 ms-1">(IP, approx.)</span>
                {ipApproxHint}
              </span>
            </div>
          ) : null}
        </>
      ) : hasIpPlace ? (
        <div className="font-medium text-defaulttextcolor flex items-start gap-1.5">
          <i className="ri-earth-line shrink-0 text-[1rem] mt-0.5 opacity-80" aria-hidden />
          <span>
            {ipLine}
            <span className="text-[0.65rem] font-normal text-defaulttextcolor/50 ms-1">(IP, approx.)</span>
            {ipApproxHint}
          </span>
        </div>
      ) : (
        <div>—</div>
      )}
    </div>
  );
}
