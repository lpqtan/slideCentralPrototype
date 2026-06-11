import { test, expect } from "@playwright/test";

/**
 * LLM E2E tests — parameterised across providers.
 *
 * Each provider's tests are skipped if the corresponding env var is not set.
 * In CI, add whichever secrets you want to test:
 *   GEMINI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY, OPENAI_API_KEY
 */

const providers = [
  { id: "gemini", envKey: "GEMINI_API_KEY", label: "Gemini" },
  { id: "groq", envKey: "GROQ_API_KEY", label: "Groq" },
  { id: "openrouter", envKey: "OPENROUTER_API_KEY", label: "OpenRouter" },
  { id: "openai", envKey: "OPENAI_API_KEY", label: "OpenAI" },
] as const;

for (const provider of providers) {
  test.describe(`LLM Flow: ${provider.label}`, () => {
    const apiKey = process.env[provider.envKey];

    test.skip(!apiKey, `${provider.envKey} not set — skipping ${provider.label} tests`);

    test.beforeEach(async ({ page }) => {
      // Configure settings via localStorage
      await page.goto("/");
      await page.evaluate(
        ([pid, key]) => {
          localStorage.setItem(
            "slidecentral-settings",
            JSON.stringify({
              strategy: "llm",
              provider: pid,
              apiKey: key,
              daemonAgent: "opencode",
              daemonModel: "opencode/big-pickle",
            })
          );
          // Clear any existing briefing
          localStorage.removeItem("slidecentral-current-briefing");
          localStorage.removeItem("slidecentral-current-step");
        },
        [provider.id, apiKey!] as const
      );
    });

    test("generate outline via LLM", async ({ page }) => {
      test.setTimeout(120_000); // LLM calls can be slow

      await page.goto("/briefing");

      // Step 1: Context
      await page.getByText("Approval").click();
      await page.getByText("EXCO").click();
      await page.getByText("Presenting").click();
      await page.getByRole("button", { name: /Next/i }).click();

      // Step 2: Message
      await page.getByLabel(/key message/i).fill(
        "Member engagement is declining — we need $500k for digital outreach pilots"
      );
      await page.getByLabel(/the ask/i).fill(
        "Approve budget and nominate a department lead"
      );
      await page.getByRole("button", { name: /Next/i }).click();

      // Step 3: Content — skip
      await page.getByRole("button", { name: /Next/i }).click();

      // Step 4: Narrative
      await page.getByText("Proposal").click();
      await page.getByRole("button", { name: /Next/i }).click();

      // Step 5: Generate
      await page.getByRole("button", { name: /Generate Outline/i }).click();

      // Should go to /generating page
      await expect(page).toHaveURL(/\/generating/, { timeout: 10_000 });

      // Wait for redirect to /outline (LLM generation completes)
      await expect(page).toHaveURL(/\/outline/, { timeout: 90_000 });

      // Verify outline loaded
      await expect(page.getByText(/Slide Outline/i)).toBeVisible();
      // Should have multiple slides
      await expect(page.getByText(/slides/i)).toBeVisible();
    });

    test("build deck via LLM", async ({ page }) => {
      test.setTimeout(120_000);

      await page.goto("/briefing");

      // Quick wizard fill
      await page.getByText("Approval").click();
      await page.getByText("EXCO").click();
      await page.getByText("Presenting").click();
      await page.getByRole("button", { name: /Next/i }).click();
      await page.getByLabel(/key message/i).fill("Digital outreach pilot");
      await page.getByLabel(/the ask/i).fill("Approve budget");
      await page.getByRole("button", { name: /Next/i }).click();
      await page.getByRole("button", { name: /Next/i }).click();
      await page.getByText("Proposal").click();
      await page.getByRole("button", { name: /Next/i }).click();
      await page.getByRole("button", { name: /Generate Outline/i }).click();
      await expect(page).toHaveURL(/\/outline/, { timeout: 90_000 });

      // Build deck
      await page.getByRole("button", { name: /Build Deck/i }).click();

      // For non-daemon LLM, should go to /building then /preview
      // Or for mock-fallback, straight to /preview
      await expect(page).toHaveURL(/\/(building|preview)/, { timeout: 10_000 });

      // Wait for final landing on /preview
      if (page.url().includes("/building")) {
        // Wait for the "View Deck" button or auto-redirect
        await expect(page).toHaveURL(/\/preview/, { timeout: 90_000 });
      }

      // Verify preview loaded
      await expect(page.getByText(/Deck Preview/i)).toBeVisible({ timeout: 10_000 });
    });
  });
}
