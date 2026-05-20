import { test, expect } from "@playwright/test";

test("task board loads", async ({ page }) => {
  await page.goto("/task/kanban-board");
  await expect(page.getByRole("main", { name: "Task board" })).toBeVisible();
  await expect(page.getByRole("banner")).toBeVisible();
});
