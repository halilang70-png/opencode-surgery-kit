import type { Plugin, Hooks } from "@opencode-ai/plugin"
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs"
import { join } from "path"
import { homedir } from "os"

// --- Mode Definitions ---

type ModeConfig = {
  name: string
  slug: string
  description: string
  systemPrompt: string
  temperature: number
  maxOutputTokens: number | undefined
}

const MODES: Record<string, ModeConfig> = {
  default: {
    name: "Default",
    slug: "default",
    description: "Balanced mode for everyday development",
    systemPrompt: "",
    temperature: 0, // let provider decide
    maxOutputTokens: undefined,
  },
  gentle: {
    name: "Gentle",
    slug: "gentle",
    description: "Patient explanations, great for learning",
    systemPrompt: `# Mode: Gentle (Learning Mode)

You are in gentle learning mode. Follow these additional guidelines:
- Explain concepts clearly with examples and analogies
- Be patient and thorough in explanations
- When the user makes a mistake, gently explain WHY something doesn't work rather than just fixing it
- Use verbose, educational output style
- Prioritize understanding over speed
- Ask clarifying questions to ensure the user follows along`,
    temperature: 0.4,
    maxOutputTokens: undefined,
  },
  sharp: {
    name: "Dr. Sharp",
    slug: "sharp",
    description: "Strict review, focused on code quality",
    systemPrompt: `# Mode: Dr. Sharp (Review Mode)

You are in sharp review mode. Follow this 3-phase workflow for any code change:

## Phase 1: Understand
- Read and deeply understand the existing code before proposing changes
- Identify the purpose, constraints, and edge cases

## Phase 2: Review
Before making any change, identify:
- Bugs and logic errors
- Security vulnerabilities
- Performance issues
- Missing error handling
- Style/convention violations
- Missing tests

## Phase 3: Report & Fix
- Report findings ordered by severity with file:line references
- Fix issues systematically
- Add tests for each fix
- Verify all tests pass

Output style: structured, precise, no filler.`,
    temperature: 0.2,
    maxOutputTokens: undefined,
  },
  workhorse: {
    name: "Workhorse",
    slug: "workhorse",
    description: "Auto-execute, minimal confirmations, no nonsense",
    systemPrompt: `# Mode: Workhorse

You are in workhorse mode. Execute tasks efficiently with minimal back-and-forth.

Rules:
- Do NOT ask for confirmation unless the action is irreversible or destructive
- Do NOT ask "should I proceed?" — just proceed with the most reasonable option
- Give concise outputs — state what you did, not what you're going to do
- Do not explain obvious things
- If you encounter a choice with no clear winner, pick one and move on
- Focus on getting things DONE, not on discussing how to do them
- Never ask permission questions. Never ask "how would you like me to proceed?"
- If blocked after checking context, ask ONE targeted question with your recommended default`,
    temperature: 0.2,
    maxOutputTokens: undefined,
  },
  "token-saver": {
    name: "Token Saver",
    slug: "token-saver",
    description: "Minimal replies, save tokens",
    systemPrompt: `# Mode: Token Saver

You are in token-saving mode. Follow these rules strictly:
- Give the shortest correct answer possible
- One-liners preferred over paragraphs
- No explanations unless explicitly asked
- No "I'll do X now" — just do it
- No summaries unless asked
- Use code references instead of descriptions when possible`,
    temperature: 0.1,
    maxOutputTokens: 4096,
  },
  "super-ai": {
    name: "Super AI",
    slug: "super-ai",
    description: "Deep thinking, comprehensive analysis",
    systemPrompt: `# Mode: Super AI

You are in super AI mode. Think deeply and comprehensively.

Guidelines:
- Think through multiple approaches before acting
- Consider edge cases, alternatives, and long-term implications
- Provide comprehensive analysis with clear reasoning
- When reviewing code, check for subtle bugs, race conditions, and architectural issues
- Explore the codebase broadly before making changes
- Write thorough tests that cover edge cases
- Verify extensively — build, test, lint, and smoke test
- Use verbose output to explain your reasoning process`,
    temperature: 0.6,
    maxOutputTokens: 16384,
  },
}

// --- State Persistence ---

const STATE_DIR = join(homedir(), ".opencode")
const STATE_FILE = join(STATE_DIR, "mode-state.json")

function loadCurrentMode(): string {
  try {
    if (existsSync(STATE_FILE)) {
      const data = JSON.parse(readFileSync(STATE_FILE, "utf-8"))
      return data.mode || "default"
    }
  } catch {
    // ignore
  }
  return "default"
}

function saveCurrentMode(mode: string) {
  try {
    if (!existsSync(STATE_DIR)) {
      mkdirSync(STATE_DIR, { recursive: true })
    }
    writeFileSync(STATE_FILE, JSON.stringify({ mode, updatedAt: new Date().toISOString() }), "utf-8")
  } catch {
    // ignore
  }
}

// --- Plugin ---

let currentMode = loadCurrentMode()

export const ModeSwitchPlugin: Plugin = async (_ctx) => {
  return {
    // Inject mode-specific system prompt
    "experimental.chat.system.transform": async (_input, output) => {
      const mode = MODES[currentMode]
      if (mode && mode.systemPrompt) {
        output.system.push(mode.systemPrompt)
      }
    },

    // Adjust LLM parameters based on mode
    "chat.params": async (_input, output) => {
      const mode = MODES[currentMode]
      if (!mode) return

      if (mode.temperature !== 0) {
        output.temperature = mode.temperature
      }
      if (mode.maxOutputTokens !== undefined) {
        output.maxOutputTokens = mode.maxOutputTokens
      }
    },

    // Intercept slash commands to handle mode switching
    "command.execute.before": async (input, output) => {
      const cmdName = input.command.toLowerCase()

      if (cmdName === "mode") {
        const args = input.arguments.trim().toLowerCase()

        if (args === "" || args === "list" || args === "status") {
          // Show current mode and available modes
          const lines = [`Current mode: **${MODES[currentMode]?.name || currentMode}** (${currentMode})`, "", "Available modes:"]
          for (const [slug, mode] of Object.entries(MODES)) {
            const marker = slug === currentMode ? " ← active" : ""
            lines.push(`  /${slug} — ${mode.description}${marker}`)
          }
          lines.push("", "Usage: /mode <name>  (e.g. /mode workhorse)")
          output.parts = [{ type: "text", text: lines.join("\n") }]
          return
        }

        if (MODES[args]) {
          currentMode = args
          saveCurrentMode(args)
          const mode = MODES[args]
          output.parts = [
            {
              type: "text",
              text: `Switched to **${mode.name}** mode (${args})\n\n${mode.description}\n\nParameters: temperature=${mode.temperature === 0 ? "default" : mode.temperature}, maxOutputTokens=${mode.maxOutputTokens === undefined ? "default" : mode.maxOutputTokens}`,
            },
          ]
          return
        }

        // Unknown mode
        const available = Object.keys(MODES).join(", ")
        output.parts = [
          {
            type: "text",
            text: `Unknown mode: "${args}". Available modes: ${available}`,
          },
        ]
        return
      }

      // Handle direct mode slash commands: /workhorse, /sharp, etc.
      if (MODES[cmdName]) {
        currentMode = cmdName
        saveCurrentMode(cmdName)
        const mode = MODES[cmdName]
        output.parts = [
          {
            type: "text",
            text: `Switched to **${mode.name}** mode (${cmdName})\n\n${mode.description}\n\nParameters: temperature=${mode.temperature === 0 ? "default" : mode.temperature}, maxOutputTokens=${mode.maxOutputTokens === undefined ? "default" : mode.maxOutputTokens}`,
          },
        ]
        return
      }
    },
  } satisfies Hooks
}

export default ModeSwitchPlugin
