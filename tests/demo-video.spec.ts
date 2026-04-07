// tests/demo-video.spec.ts — Verifies demo video recording UI elements
// Run: npx playwright test tests/demo-video.spec.ts

import { test, expect } from "@playwright/test";

test.describe("Demo Video Recording", () => {
  test("video record button is visible in dev mode toolbar", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);

    // The video record button should be visible (dev mode = localhost)
    const videoBtn = page.locator('button[title="Record demo video"]');
    await expect(videoBtn).toBeVisible({ timeout: 5000 });
  });

  test("video record button is next to screenshot button", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);

    // Both buttons should exist
    const screenshotBtn = page.locator('button[title="Screenshot"]');
    const videoBtn = page.locator('button[title="Record demo video"]');
    await expect(screenshotBtn).toBeVisible({ timeout: 5000 });
    await expect(videoBtn).toBeVisible({ timeout: 5000 });

    // Video button should be positioned after screenshot button
    const screenshotBox = await screenshotBtn.boundingBox();
    const videoBox = await videoBtn.boundingBox();
    expect(screenshotBox).not.toBeNull();
    expect(videoBox).not.toBeNull();
    // Video button should be to the right of screenshot button
    expect(videoBox!.x).toBeGreaterThan(screenshotBox!.x);
  });

  test("eggs per round is 2", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);

    // There should be 2 progress dots (eggs), not 3
    const dots = page.locator(".rounded-full.border-2");
    await expect(dots).toHaveCount(2, { timeout: 5000 });
  });
});
