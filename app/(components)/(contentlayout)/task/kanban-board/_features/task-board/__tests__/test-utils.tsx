import React from "react";
import { render as rtlRender, type RenderOptions } from "@testing-library/react";

export function render(ui: React.ReactElement, opts?: RenderOptions) {
  return rtlRender(<React.StrictMode>{ui}</React.StrictMode>, opts);
}

export * from "@testing-library/react";
