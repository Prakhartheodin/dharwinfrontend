import { test, expect } from "@playwright/test";

test("memory growth bounded after repeated interactions", async ({ page }) => {
  await page.goto("/task/kanban-board");
  await page.waitForSelector("[data-kb-root]");

  const before = await page.evaluate(
    () =>
      (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
        ?.usedJSHeapSize ?? 0
  );
  for (let i = 0; i < 20; i++) {
    await page.getByLabel("Search tasks").fill(`q${i}`);
    await page.waitForTimeout(50);
  }
  const after = await page.evaluate(
    () =>
      (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
        ?.usedJSHeapSize ?? 0
  );
  if (before > 0 && after > 0) {
    expect((after - before) / before).toBeLessThan(0.5);
  }
});
