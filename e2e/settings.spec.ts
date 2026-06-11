import { test, expect } from "@playwright/test";

test.describe("Settings Page", () => {
  test("loads and displays all strategy options", async ({ page }) => {
    await page.goto("/settings");

    await expect(page.getByRole("heading", { name: /AI Settings/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Mock/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Local OpenCode/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Open Design Daemon/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Direct LLM API/ })).toBeVisible();
  });

  test("selecting LLM strategy shows provider options", async ({ page }) => {
    await page.goto("/settings");

    await page.getByRole("button", { name: /Direct LLM API/ }).click();

    // Provider buttons should be visible
    await expect(page.getByRole("button", { name: /Gemini 2.5 Flash Lite/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Groq/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^OpenRouter/ })).toBeVisible();
    // OpenAI button's accessible name is "OpenAI gpt-4o-mini" — distinct from the
    // strategy description "OpenAI / Gemini / Groq / OpenRouter"
    await expect(page.getByRole("button", { name: /^OpenAI/ })).toBeVisible();
  });

  test("selecting daemon strategy shows agent options", async ({ page }) => {
    await page.goto("/settings");

    await page.getByRole("button", { name: /Open Design Daemon/ }).click();

    // Agent buttons should be visible
    await expect(page.getByRole("button", { name: /^OpenCode/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Claude Code/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Codex CLI/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Gemini CLI/ })).toBeVisible();
  });

  test("saving settings persists to localStorage", async ({ page }) => {
    await page.goto("/settings");

    // Select LLM strategy
    await page.getByRole("button", { name: /Direct LLM API/ }).click();

    // Should show "Unsaved changes"
    await expect(page.getByText(/Unsaved changes/i)).toBeVisible();

    // Save — triggers reload
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
    await page.getByRole("button", { name: /Direct LLM API/ }).click();

    await expect(page.getByPlaceholder(/sk-/i)).toBeVisible();
  });

  test("back button navigates to briefing page", async ({ page }) => {
    await page.goto("/settings");

    await page.getByRole("link", { name: /Back to current deck/i }).click();
    await expect(page).toHaveURL(/\/briefing/);
  });
});
