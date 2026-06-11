import { test, expect } from "@playwright/test";

// Helper: set strategy in localStorage and clear stale wizard state
async function setMockStrategy(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem(
      "slidecentral-settings",
      JSON.stringify({ strategy: "mock", provider: "gemini", apiKey: "", daemonAgent: "opencode", daemonModel: "opencode/big-pickle" })
    );
    localStorage.removeItem("slidecentral-current-briefing");
    localStorage.removeItem("slidecentral-current-step");
  });
}

/** Fill the 5-step wizard and click Generate Outline */
async function fillWizard(page: import("@playwright/test").Page, opts?: { keyMessage?: string; ask?: string }) {
  // Step 1: Context — select objective, audience, mode
  await page.getByRole("button", { name: /Approval/ }).click();
  await page.getByRole("button", { name: /EXCO/ }).click();
  await page.getByRole("button", { name: /Presenting/ }).click();
  await page.getByRole("button", { name: "Next" }).click();

  // Step 2: Message — fill key message and audience ask
  await page.getByLabel(/key message/i).fill(opts?.keyMessage ?? "Test key message");
  await page.getByLabel(/the ask/i).fill(opts?.ask ?? "Approve the test budget");
  await page.getByRole("button", { name: "Next" }).click();

  // Step 3: Content — skip (optional)
  await page.getByRole("button", { name: "Next" }).click();

  // Step 4: Narrative — select an arc
  await page.getByRole("button", { name: /Proposal Arc/ }).click();
  await page.getByRole("button", { name: "Next" }).click();

  // Step 5: Template — skip (optional), click Generate
  await page.getByRole("button", { name: /Generate Outline/i }).click();
}

test.describe("Landing Page", () => {
  test("displays the Slide Central heading", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Slide Central/i })).toBeVisible();
  });

  test("has Start New Deck button", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Start New Deck/i })).toBeVisible();
  });

  test("has Chat Briefing button", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Chat Briefing/i })).toBeVisible();
  });

  test("has Saved Decks button", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Saved Decks/i })).toBeVisible();
  });
});

test.describe("Briefing Wizard", () => {
  test("navigates to briefing page on Start New Deck", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Start New Deck/i }).click();
    await expect(page).toHaveURL(/\/briefing/);
    await expect(page.getByText(/Step 1 of 5/i)).toBeVisible();
  });

  test("shows all 5 step labels", async ({ page }) => {
    await page.goto("/briefing");
    for (const label of ["Context", "Message", "Content", "Narrative", "Template"]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });
});

test.describe("Full Mock Flow: Briefing → Outline → Preview", () => {
  test("complete wizard and generate outline with mock strategy", async ({ page }) => {
    await setMockStrategy(page);
    await page.goto("/briefing");
    await fillWizard(page, { keyMessage: "Test key message for mock flow" });

    // Should redirect to /outline (mock skips /generating)
    await expect(page).toHaveURL(/\/outline/, { timeout: 10_000 });

    // Verify outline has slides
    await expect(page.getByRole("heading", { name: /Slide Outline/i })).toBeVisible();
  });

  test("outline page shows slides and Build Deck button", async ({ page }) => {
    await setMockStrategy(page);
    await page.goto("/briefing");
    await fillWizard(page);

    await expect(page).toHaveURL(/\/outline/, { timeout: 10_000 });

    // Should have a Build Deck button
    await expect(page.getByRole("button", { name: /Build Deck/i })).toBeVisible();

    // Click Build Deck — mock strategy builds client-side and goes to /preview
    await page.getByRole("button", { name: /Build Deck/i }).click();
    await expect(page).toHaveURL(/\/preview/, { timeout: 10_000 });
  });

  test("preview page renders slides and has Download button", async ({ page }) => {
    await setMockStrategy(page);
    await page.goto("/briefing");
    await fillWizard(page);

    await expect(page).toHaveURL(/\/outline/, { timeout: 10_000 });
    await page.getByRole("button", { name: /Build Deck/i }).click();
    await expect(page).toHaveURL(/\/preview/, { timeout: 10_000 });

    // Preview should show heading and slides sidebar
    await expect(page.getByRole("heading", { name: /Deck Preview/i })).toBeVisible();

    // Download button should exist
    await expect(page.getByRole("button", { name: /Download/i })).toBeVisible();
  });
});
