import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const STATES = [
  { name: "loaded", setup: async () => {} },
  {
    name: "drawer-open",
    setup: async (page: import("@playwright/test").Page) => {
      await page.getByRole("button", { name: /new task/i }).click();
      await page.getByRole("dialog").waitFor();
    },
  },
  {
    name: "filter-drawer-mobile",
    setup: async (page: import("@playwright/test").Page) => {
      await page.setViewportSize({ width: 375, height: 700 });
      await page.getByRole("button", { name: "Filters" }).click();
    },
  },
];

for (const s of STATES) {
  test(`axe: ${s.name}`, async ({ page }) => {
    await page.goto("/task/kanban-board");
    await s.setup(page);
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(critical).toEqual([]);
  });
}
