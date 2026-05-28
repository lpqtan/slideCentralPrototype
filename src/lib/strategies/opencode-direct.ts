import { spawn } from "child_process";
import type { BackendStrategy, StrategyOptions } from "./types";
import type { BriefingData, SlideOutline } from "@/lib/types";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompts-od";
import { extractJson } from "./llm";

const OPENDODE_BIN = process.env.OPENCODE_BIN ?? "opencode";
const DEFAULT_MODEL = "opencode/big-pickle";

/**
 * Call opencode CLI directly (no daemon).
 * Sends prompt via stdin, captures stdout, parses JSON.
 */
function callOpenCode(
  systemPrompt: string,
  userPrompt: string,
  model = DEFAULT_MODEL
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(OPENDODE_BIN, ["run", "--format", "json", "-m", model], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, OPENCODE_NO_INTERACTIVE: "1" },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `OpenCode exited with ${code}${stderr ? ": " + stderr.slice(0, 200) : ""}`
          )
        );
        return;
      }
      if (!stdout.trim()) {
        reject(new Error("OpenCode returned empty output"));
        return;
      }
      resolve(stdout);
    });

    child.on("error", (err) => {
      reject(new Error(`OpenCode failed to start: ${err.message}`));
    });

    // Write the prompt via stdin
    const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;
    child.stdin.write(fullPrompt);
    child.stdin.end();
  });
}

/**
 * Send a free-form text prompt to opencode and get a text response back.
 * Used by chat briefing for conversational analysis.
 */
export async function chatOpenCode(prompt: string, model = DEFAULT_MODEL): Promise<string> {
  return callOpenCode(
    "You are a helpful, concise assistant. Respond directly to the user's request.",
    prompt,
    model
  );
}

/**
 * Generate a slide outline by calling opencode directly.
 */
export async function generateOutlineOpenCode(
  briefing: BriefingData,
  model = DEFAULT_MODEL
): Promise<SlideOutline[]> {
  const sys = buildSystemPrompt();
  const usr = buildUserPrompt(briefing);
  const output = await callOpenCode(sys, usr, model);
  return extractJson(output);
}

const opencodeDirectStrategy: BackendStrategy = {
  id: "opencode-direct",

  async healthCheck(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const child = spawn(OPENDODE_BIN, ["--version"], {
          stdio: "pipe",
          timeout: 5000,
        });
        child.on("close", (code) => resolve(code === 0));
        child.on("error", () => resolve(false));
        // Timeout safety
        setTimeout(() => {
          try { child.kill(); } catch { /* already dead */ }
          resolve(false);
        }, 5000);
      } catch {
        resolve(false);
      }
    });
  },

  async generateOutline(
    briefing: BriefingData,
    opts?: StrategyOptions
  ): Promise<SlideOutline[]> {
    const model = opts?.model ?? DEFAULT_MODEL;
    return generateOutlineOpenCode(briefing, model);
  },
};

export default opencodeDirectStrategy;
