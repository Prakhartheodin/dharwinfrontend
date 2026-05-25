import { test, expect } from "@playwright/test";

/**
 * Requires staging/local with:
 * - FF_REFERRAL_SALES_AGENT_ATTRIBUTION=true (backend)
 * - NEXT_PUBLIC_FF_REFERRAL_SALES_AGENT_ATTRIBUTION=true (frontend)
 * - Administrator session cookies imported into Playwright storage state
 */
test.describe("referral sales-agent attribution", () => {
  test.skip(process.env.E2E_REFERRAL_SALES_AGENT !== "true", "Set E2E_REFERRAL_SALES_AGENT=true to run");

  test("admin assigns then changes sales agent", async ({ page }) => {
    await page.goto("/ats/referral-leads");
    await page.getByRole("row", { name: /Bholesh Bansal/i }).getByRole("button", { name: /actions/i }).click();
    await page.getByRole("menuitem", { name: "Assign Sales Agent" }).click();
    await page.getByLabel("Sales agent").fill("Priya");
    await page.getByText("Priya Singh").click();
    await page.getByRole("button", { name: "Save assignment" }).click();
    await expect(page.getByText("Priya Singh")).toBeVisible();

    await page.getByRole("row", { name: /Bholesh Bansal/i }).getByRole("button", { name: /actions/i }).click();
    await page.getByRole("menuitem", { name: "Change Sales Agent" }).click();
    await page.getByLabel("Sales agent").fill("Rohan");
    await page.getByText("Rohan Mehta").click();
    await page.getByRole("button", { name: "Save assignment" }).click();
    await expect(page.getByText("Rohan Mehta")).toBeVisible();
  });
});
