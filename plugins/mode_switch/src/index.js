import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const MODES = {
  default: {
    name: "Default",
    slug: "default",
    description: "Balanced mode for everyday development",
    systemPrompt: "",
    temperature: 0,
    maxOutputTokens: undefined,
  },
  gentle: {
    name: "Gentle",
    slug: "gentle",
    description: "Patient explanations, great for learning",
    systemPrompt: "# Mode: Gentle (Learning Mode)\n\nYou are in gentle learning mode. Follow these additional guidelines:\n- Explain concepts clearly with examples and analogies\n- Be patient and thorough in explanations\n- When the user makes a mistake, gently explain WHY something does not work rather than just fixing it\n- Use verbose, educational output style\n- Prioritize understanding over speed\n- Ask clarifying questions to ensure the user follows along",
    temperature: 0.4,
    maxOutputTokens: undefined,
  },
  sharp: {
    name: "Dr. Sharp",
    slug: "sharp",
    description: "Strict review, focused on code quality",
    systemPrompt: "# Mode: Dr. Sharp (Review Mode)\n\nYou are in sharp review mode. Follow this 3-phase workflow for any code change:\n\n## Phase 1: Understand\n- Read and deeply understand the existing code before proposing changes\n- Identify the purpose, constraints, and edge cases\n\n## Phase 2: Review\nBefore making any change, identify:\n- Bugs and logic errors\n- Security vulnerabilities\n- Performance issues\n- Missing error handling\n- Style/convention violations\n- Missing tests\n\n## Phase 3: Report & Fix\n- Report findings ordered by severity with file:line references\n- Fix issues systematically\n- Add tests for each fix\n- Verify all tests pass\n\nOutput style: structured, precise, no filler.",
    temperature: 0.2,
    maxOutputTokens: undefined,
  },
  workhorse: {
    name: "Workhorse",
    slug: "workhorse",
    description: "Auto-execute, minimal confirmations, no nonsense",
    systemPrompt: "# Mode: Workhorse\n\nYou are in workhorse mode. Execute tasks efficiently with minimal back-and-forth.\n\nRules:\n- Do NOT ask for confirmation unless the action is irreversible or destructive\n- Do NOT ask \"should I proceed?\" \u2014 just proceed with the most reasonable option\n- Give concise outputs \u2014 state what you did, not what you are going to do\n- Do not explain obvious things\n- If you encounter a choice with no clear winner, pick one and move on\n- Focus on getting things DONE, not on discussing how to do them\n- Never ask permission questions. Never ask \"how would you like me to proceed?\"\n- If blocked after checking context, ask ONE targeted question with your recommended default",
    temperature: 0.2,
    maxOutputTokens: undefined,
  },
  "token-saver": {
    name: "Token Saver",
    slug: "token-saver",
    description: "Minimal replies, save tokens",
    systemPrompt: "# Mode: Token Saver\n\nYou are in token-saving mode. Follow these rules strictly:\n- Give the shortest correct answer possible\n- One-liners preferred over paragraphs\n- No explanations unless explicitly asked\n- No \"I will do X now\" \u2014 just do it\n- No summaries unless asked\n- Use code references instead of descriptions when possible",
    temperature: 0.1,
    maxOutputTokens: 4096,
  },
  "super-ai": {
    name: "Super AI",
    slug: "super-ai",
    description: "Deep thinking, comprehensive analysis",
    systemPrompt: "# Mode: Super AI\n\nYou are in super AI mode. Think deeply and comprehensively.\n\nGuidelines:\n- Think through multiple approaches before acting\n- Consider edge cases, alternatives, and long-term implications\n- Provide comprehensive analysis with clear reasoning\n- When reviewing code, check for subtle bugs, race conditions, and architectural issues\n- Explore the codebase broadly before making changes\n- Write thorough tests that cover edge cases\n- Verify extensively \u2014 build, test, lint, and smoke test\n- Use verbose output to explain your reasoning process",
    temperature: 0.6,
    maxOutputTokens: 16384,
  },
};

const STATE_DIR = join(homedir(), ".opencode");
const STATE_FILE = join(STATE_DIR, "mode-state.json");

function loadCurrentMode() {
  try {
    if (existsSync(STATE_FILE)) {
      const data = JSON.parse(readFileSync(STATE_FILE, "utf-8"));
      return data.mode || "default";
    }
  } catch {
    // ignore
  }
  return "default";
}

function saveCurrentMode(mode) {
  try {
    if (!existsSync(STATE_DIR)) {
      mkdirSync(STATE_DIR, { recursive: true });
    }
    writeFileSync(STATE_FILE, JSON.stringify({ mode, updatedAt: new Date().toISOString() }), "utf-8");
  } catch {
    // ignore
  }
}

let currentMode = loadCurrentMode();

export const ModeSwitchPlugin = async (_ctx) => {
  return {
    "experimental.chat.system.transform": async (_input, output) => {
      const mode = MODES[currentMode];
      if (mode && mode.systemPrompt) {
        output.system.push(mode.systemPrompt);
      }
    },

    "chat.params": async (_input, output) => {
      const mode = MODES[currentMode];
      if (!mode) return;
      if (mode.temperature !== 0) {
        output.temperature = mode.temperature;
      }
      if (mode.maxOutputTokens !== undefined) {
        output.maxOutputTokens = mode.maxOutputTokens;
      }
    },

    "command.execute.before": async (input, output) => {
      const cmdName = input.command.toLowerCase();

      // 处理 /mode 命令（显示模式列表）
      if (cmdName === "mode") {
        const args = (input.arguments || "").trim().toLowerCase();

        if (args === "" || args === "list" || args === "status") {
          const lines = ["Current mode: **" + (MODES[currentMode]?.name || currentMode) + "** (" + currentMode + ")", "", "Available modes:"];
          for (const [slug, mode] of Object.entries(MODES)) {
            const marker = slug === currentMode ? " \u2190 active" : "";
            lines.push("  /mode-" + slug + " \u2014 " + mode.description + marker);
          }
          lines.push("", "Usage: /mode-<name>  (e.g. /mode-workhorse)");
          output.parts = [{ type: "text", text: lines.join("\n") }];
          return;
        }

        if (MODES[args]) {
          currentMode = args;
          saveCurrentMode(args);
          const mode = MODES[args];
          output.parts = [
            {
              type: "text",
              text: "Switched to **" + mode.name + "** mode (" + args + ")\n\n" + mode.description + "\n\nParameters: temperature=" + (mode.temperature === 0 ? "default" : mode.temperature) + ", maxOutputTokens=" + (mode.maxOutputTokens === undefined ? "default" : mode.maxOutputTokens),
            },
          ];
          return;
        }

        const available = Object.keys(MODES).join(", ");
        output.parts = [
          {
            type: "text",
            text: 'Unknown mode: "' + args + '". Available modes: ' + available,
          },
        ];
        return;
      }

      // 处理 /mode-xxx 命令（直接切换模式）
      if (cmdName.startsWith("mode-")) {
        const modeSlug = cmdName.replace("mode-", "");
        if (MODES[modeSlug]) {
          currentMode = modeSlug;
          saveCurrentMode(modeSlug);
          const mode = MODES[modeSlug];
          output.parts = [
            {
              type: "text",
              text: "Switched to **" + mode.name + "** mode (" + modeSlug + ")\n\n" + mode.description + "\n\nParameters: temperature=" + (mode.temperature === 0 ? "default" : mode.temperature) + ", maxOutputTokens=" + (mode.maxOutputTokens === undefined ? "default" : mode.maxOutputTokens),
            },
          ];
          return;
        }
      }

      // 处理旧格式命令（兼容性）
      if (MODES[cmdName]) {
        currentMode = cmdName;
        saveCurrentMode(cmdName);
        const mode = MODES[cmdName];
        output.parts = [
          {
            type: "text",
            text: "Switched to **" + mode.name + "** mode (" + cmdName + ")\n\n" + mode.description + "\n\nParameters: temperature=" + (mode.temperature === 0 ? "default" : mode.temperature) + ", maxOutputTokens=" + (mode.maxOutputTokens === undefined ? "default" : mode.maxOutputTokens),
          },
        ];
        return;
      }
    },
  };
};

export default ModeSwitchPlugin;
