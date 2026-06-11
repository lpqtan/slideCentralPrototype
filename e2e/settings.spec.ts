import { test, expect } from "@playwright/test";

test.describe("Settings Page", () => {
  test("loads and displays all strategy options", async ({ page }) => {
    await page.goto("/settings");

    await expect(page.getByText(/AI Settings/i)).toBeVisible();
    await expect(page.getByText("Mock")).toBeVisible();
    await expect(page.getByText("Local OpenCode")).toBeVisible();
    await expect(page.getByText("Open Design Daemon")).toBeVisible();
    await expect(page.getByText("Direct LLM API")).toBeVisible();
  });

  test("selecting LLM strategy shows provider options", async ({ page }) => {
    await page.goto("/settings");

    await page.getByText("Direct LLM API").click();

    // Provider section should be visible
    await expect(page.getByText(/Gemini 2.5 Flash Lite/i)).toBeVisible();
    await expect(page.getByText(/Groq/i)).toBeVisible();
    await expect(page.getByText(/OpenRouter/i)).toBeVisible();
    await expect(page.getByText(/OpenAI/i)).toBeVisible();
  });

  test("selecting daemon strategy shows agent options", async ({ page }) => {
    await page.goto("/settings");

    await page.getByText("Open Design Daemon").click();

    // Agent section should be visible
    await expect(page.getByText("OpenCode")).toBeVisible();
    await expect(page.getByText("Claude Code")).toBeVisible();
    await expect(page.getByText("Codex CLI")).toBeVisible();
    await expect(page.getByText("Gemini CLI")).toBeVisible();
  });

  test("saving settings persists to localStorage", async ({ page }) => {
    await page.goto("/settings");

    // Select LLM strategy
    await page.getByText("Direct LLM API").click();

    // Should show "Unsaved changes"
    await expect(page.getByText(/Unsaved changes/i)).toBeVisible();

    // Save — triggers reload, so we listen for navigation
    await page.getByRole("button", { name: /Save Settings/i }).click();

    // After reload, verify the setting was saved
    await page.waitForLoadState("domcontentloaded");

    const stored = await page.evaluate(() =>
      localStorage.getItem("slidecentral-settings")
    );
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.strategy).toBe("llm");
  });

  test("LLM API key field is shown when LLM is selected", async ({ page }) => {
    await page.goto("/settings");
    await page.getByText("Direct LLM API").click();

    await expect(page.getByPlaceholder(/sk-/i)).toBeVisible();
  });

  test("back button navigates to briefing page", async ({ page }) => {
    await page.goto("/settings");

    await page.getByTitle(/Back to current deck/i).click();
    await expect(page).toHaveURL(/\/briefing/);
  });
});
