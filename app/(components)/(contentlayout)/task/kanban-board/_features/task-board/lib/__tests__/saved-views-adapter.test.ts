import { describe, expect, it, beforeEach } from "vitest";
import { LocalStorageAdapter } from "../saved-views-adapter";
import { EMPTY_FILTERS } from "../../types";

describe("LocalStorageAdapter", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates and lists views", async () => {
    const adapter = new LocalStorageAdapter("user1");
    const view = await adapter.create({
      name: "My view",
      filters: EMPTY_FILTERS,
      view: "board",
      density: "comfortable",
    });
    expect(view.name).toBe("My view");
    const list = await adapter.list();
    expect(list).toHaveLength(1);
  });
});
