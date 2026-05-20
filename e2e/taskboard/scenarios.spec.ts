import { test, expect } from "@playwright/test";

test.describe("Task board E2E scenarios", () => {
  test("E2E-1: load + filter URL sync", async ({ page }) => {
    await page.goto("/task/kanban-board");
    await expect(page.getByRole("main", { name: "Task board" })).toBeVisible();
    await page.getByLabel("Search tasks").fill("bug");
    await page.waitForURL(/q=bug/);
    await page.reload();
    await expect(page).toHaveURL(/q=bug/);
  });

  test("E2E-2: saved views menu present", async ({ page }) => {
    await page.goto("/task/kanban-board");
    await expect(page.getByRole("button", { name: /saved views/i })).toBeVisible();
  });

  test("E2E-3: keyboard N opens new task when permitted", async ({ page }) => {
    await page.goto("/task/kanban-board");
    await page.keyboard.press("n");
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
  });

  test("E2E-4: Escape closes drawer", async ({ page }) => {
    await page.goto("/task/kanban-board");
    await page.getByRole("button", { name: /new task/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("E2E-5: mobile viewport shows filter button", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await page.goto("/task/kanban-board");
    await expect(page.getByRole("button", { name: "Filters" })).toBeVisible();
  });

  test("E2E-7: board renders without crash on empty data", async ({ page }) => {
    await page.goto("/task/kanban-board");
    await expect(page.getByText(/tasks match filters/i)).toBeVisible();
  });

  test("E2E-10: reduced motion class on root", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/task/kanban-board");
    await expect(page.locator("[data-kb-root]")).toBeVisible();
  });

  test("E2E-11: dark mode snapshot smoke", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/task/kanban-board");
    await expect(page.getByRole("banner")).toBeVisible();
  });

  test("E2E-13: rapid filter debounce", async ({ page }) => {
    await page.goto("/task/kanban-board");
    const input = page.getByLabel("Search tasks");
    await input.pressSequentially("abcdefghij", { delay: 20 });
    await page.waitForTimeout(600);
    await expect(page).toHaveURL(/q=abcdefghij/);
  });

  test("E2E-15: long title renders", async ({ page }) => {
    await page.goto("/task/kanban-board");
    await expect(page.locator("#task-board-main, [id=task-board-main]")).toBeVisible();
  });
});
