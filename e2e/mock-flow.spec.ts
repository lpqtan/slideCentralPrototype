import { test, expect } from "@playwright/test";

// Helper: set strategy in localStorage before navigating
async function setMockStrategy(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem(
      "slidecentral-settings",
      JSON.stringify({ strategy: "mock", provider: "gemini", apiKey: "", daemonAgent: "opencode", daemonModel: "opencode/big-pickle" })
    );
  });
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
      await expect(page.getByText(label)).toBeVisible();
    }
  });
});

test.describe("Full Mock Flow: Briefing → Outline → Preview", () => {
  test("complete wizard and generate outline with mock strategy", async ({ page }) => {
    await setMockStrategy(page);
    await page.goto("/briefing");

    // Step 1: Context — select objective, audience, mode
    await page.getByText("Approval").click();
    await page.getByText("EXCO").click();
    await page.getByText("Presenting").click();
    await page.getByRole("button", { name: /Next/i }).click();

    // Step 2: Message — fill key message and audience ask
    await page.getByLabel(/key message/i).fill("Test key message for mock flow");
    await page.getByLabel(/the ask/i).fill("Approve the test budget");
    await page.getByRole("button", { name: /Next/i }).click();

    // Step 3: Content — skip (optional)
    await page.getByRole("button", { name: /Next/i }).click();

    // Step 4: Narrative — select an arc
    await page.getByText("Proposal").click();
    await page.getByRole("button", { name: /Next/i }).click();

    // Step 5: Template — skip (optional), click Generate
    await page.getByRole("button", { name: /Generate Outline/i }).click();

    // Should redirect to /outline (mock skips /generating)
    await expect(page).toHaveURL(/\/outline/, { timeout: 10_000 });

    // Verify outline has slides
    await expect(page.getByText(/Slide Outline/i)).toBeVisible();
    await expect(page.getByText(/slides/i)).toBeVisible();
  });

  test("outline page shows slides and Build Deck button", async ({ page }) => {
    await setMockStrategy(page);
    await page.goto("/briefing");

    // Quick-fill wizard
    await page.getByText("Approval").click();
    await page.getByText("EXCO").click();
    await page.getByText("Presenting").click();
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByLabel(/key message/i).fill("Test message");
    await page.getByLabel(/the ask/i).fill("Test ask");
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByText("Proposal").click();
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByRole("button", { name: /Generate Outline/i }).click();

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

    // Quick-fill wizard
    await page.getByText("Approval").click();
    await page.getByText("EXCO").click();
    await page.getByText("Presenting").click();
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByLabel(/key message/i).fill("Test message");
    await page.getByLabel(/the ask/i).fill("Test ask");
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByText("Proposal").click();
    await page.getByRole("button", { name: /Next/i }).click();
    await page.getByRole("button", { name: /Generate Outline/i }).click();
    await expect(page).toHaveURL(/\/outline/, { timeout: 10_000 });
    await page.getByRole("button", { name: /Build Deck/i }).click();
    await expect(page).toHaveURL(/\/preview/, { timeout: 10_000 });

    // Preview should show slides panel
    await expect(page.getByText(/Deck Preview/i)).toBeVisible();
    await expect(page.getByText(/Slides/i).first()).toBeVisible();

    // Download button should exist
    await expect(page.getByRole("button", { name: /Download/i })).toBeVisible();
  });
});
