// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { ensurePrelineCollections, markNonPrelineTablists } from "./PrelineScript";

/**
 * Regression: preline 2.7.0's HSOverlay resize listener reads
 * `window.$hsOverlayCollection.length` with no nullish guard. If that global
 * is undefined when a resize fires, it throws
 * "Cannot read properties of undefined (reading 'length')".
 * ensurePrelineCollections() must seed it before preline is imported.
 */
describe("ensurePrelineCollections", () => {
  beforeEach(() => {
    delete (window as { $hsOverlayCollection?: unknown[] }).$hsOverlayCollection;
  });

  it("seeds $hsOverlayCollection as an array when undefined (the resize-crash guard)", () => {
    expect(window.$hsOverlayCollection).toBeUndefined();
    ensurePrelineCollections();
    expect(Array.isArray(window.$hsOverlayCollection)).toBe(true);
  });

  it("does not clobber an already-populated collection", () => {
    const existing = [{ element: {} }];
    window.$hsOverlayCollection = existing;
    ensurePrelineCollections();
    expect(window.$hsOverlayCollection).toBe(existing);
  });
});

describe("markNonPrelineTablists", () => {
  it("marks React tablists that lack data-hs-tab toggles", () => {
    document.body.innerHTML = `
      <div id="react-tabs" role="tablist"><button role="tab">Overview</button></div>
      <nav id="preline-tabs" role="tablist">
        <button type="button" class="active" data-hs-tab="#panel-a">A</button>
      </nav>
    `;
    markNonPrelineTablists();
    expect(document.getElementById("react-tabs")?.classList.contains("--prevent-on-load-init")).toBe(true);
    expect(document.getElementById("preline-tabs")?.classList.contains("--prevent-on-load-init")).toBe(false);
  });
});
