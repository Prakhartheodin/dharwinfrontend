"use client";

import React from "react";

type Props = { fallback: React.ReactNode; children: React.ReactNode };
type BoundaryState = { hasError: boolean };

declare global {
  interface Window {
    __sentry?: { captureException?: (err: unknown) => void };
  }
}

export class TaskBoardErrorBoundary extends React.Component<Props, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(err: unknown): void {
    if (typeof window !== "undefined") {
      window.__sentry?.captureException?.(err);
    }
    // eslint-disable-next-line no-console -- surfaced for local debugging per task board plan
    console.error("[TaskBoard] render error:", err);
  }

  render(): React.ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
