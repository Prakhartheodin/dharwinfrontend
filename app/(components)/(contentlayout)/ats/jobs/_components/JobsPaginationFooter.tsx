"use client";

import React, { useEffect, useState } from "react";
import ListPagination, { type ListPaginationProps } from "@/shared/components/ListPagination";

export type JobsPaginationFooterProps = Omit<
  ListPaginationProps,
  | "layout"
  | "className"
  | "showPageSize"
  | "showSummaryIcon"
  | "useEnDashInSummary"
  | "neutralNavButtons"
  | "compactControls"
  | "ariaLabel"
>;

function useNarrowViewport(maxWidthPx: number) {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidthPx}px)`);
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [maxWidthPx]);

  return narrow;
}

/**
 * Jobs table footer pager — split row layout, compact controls, jobs-only responsive rules via `.jobs-list-pagination`.
 */
export function JobsPaginationFooter(props: JobsPaginationFooterProps) {
  const touchFriendly = useNarrowViewport(640);

  return (
    <div className="jobs-command-strip jobs-list-footer__command w-full min-w-0">
      <ListPagination
        {...props}
        className="jobs-list-pagination"
        showPageSize={false}
        touchFriendly={touchFriendly}
        ariaLabel="Pagination"
      />
    </div>
  );
}
