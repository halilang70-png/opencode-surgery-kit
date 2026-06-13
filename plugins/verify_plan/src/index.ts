import type { Plugin, Hooks } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { readFileSync, existsSync, readdirSync, statSync } from "fs"
import { join, extname } from "path"
import { execSync } from "child_process"

// --- Verify Plan Tool ---

export const VerifyPlanPlugin: Plugin = async (_ctx) => {
  return {
    tool: {
      "verify-plan": tool({
        description:
          "Verify the execution status of a plan file. Checks which implementation steps have been completed by examining git diff, file existence, and test results. Use this after executing a plan to confirm all steps are done.",
        args: {
          plan_path: tool
            .schema()
            .string()
            .describe(
              "Absolute or workspace-relative path to the plan markdown file"
            ),
          working_dir: tool
            .schema()
            .string()
            .optional()
            .describe(
              "The project root directory (defaults to current working directory)"
            ),
        },
        async execute(args) {
          const planPath = args.plan_path
          const workDir = args.working_dir || process.cwd()

          if (!existsSync(planPath)) {
            return `Error: Plan file not found at "${planPath}"`
          }

          const content = readFileSync(planPath, "utf-8")

          // Parse the plan file
          const sections = parsePlanSections(content)
          const steps = extractSteps(content)
          const filesToModify = extractFilesToModify(content)
          const verificationCommands = extractVerificationCommands(content)

          // Check each dimension
          const results: string[] = []

          // 1. Check required sections
          results.push("## Plan Structure Check")
          const requiredSections = [
            "Context",
            "Recommended Approach",
            "Files to Modify",
            "Implementation Steps",
            "Testing & Verification Plan",
          ]
          for (const section of requiredSections) {
            const found = sections.some(
              (s) => s.toLowerCase().includes(section.toLowerCase())
            )
            results.push(
              found ? `  [x] ${section}` : `  [ ] ${section} — MISSING`
            )
          }

          // 2. Check files that should have been modified
          results.push("\n## File Modification Check")
          if (filesToModify.length > 0) {
            let gitDiff: string
            try {
              gitDiff = execSync(
                'git diff --name-only HEAD 2>/dev/null || git diff --name-only',
                { cwd: workDir, encoding: "utf-8", timeout: 10000 }
              ).trim()
            } catch {
              gitDiff = ""
            }

            const changedFiles = new Set(
              gitDiff
                .split("\n")
                .filter((f) => f.trim())
                .map((f) => f.trim())
            )

            for (const file of filesToModify) {
              const exists = existsSync(join(workDir, file))
              const changed = changedFiles.has(file)
              if (changed) {
                results.push(`  [x] ${file} — modified`)
              } else if (exists) {
                results.push(`  [?] ${file} — exists but no git changes detected`)
              } else {
                results.push(`  [ ] ${file} — NOT FOUND`)
              }
            }
          } else {
            results.push("  (no files listed in plan)")
          }

          // 3. Check implementation steps
          results.push("\n## Implementation Steps Check")
          if (steps.length > 0) {
            // Try to infer completion from git log and file changes
            let gitLog: string
            try {
              gitLog = execSync(
                'git log --oneline -20 2>/dev/null',
                { cwd: workDir, encoding: "utf-8", timeout: 10000 }
              ).trim()
            } catch {
              gitLog = ""
            }

            for (let i = 0; i < steps.length; i++) {
              const step = steps[i]
              // Heuristic: if the step mentions a file that was changed, mark as likely done
              const stepFiles = filesToModify.filter((f) =>
                step.toLowerCase().includes(f.toLowerCase().split("/").pop() || "")
              )
              const likelyDone =
                stepFiles.length > 0 &&
                stepFiles.some((f) => {
                  try {
                    const diff = execSync(
                      `git diff --name-only HEAD -- "${f}" 2>/dev/null || echo ""`,
                      { cwd: workDir, encoding: "utf-8", timeout: 5000 }
                    ).trim()
                    return diff.length > 0
                  } catch {
                    return false
                  }
                })

              results.push(
                likelyDone
                  ? `  [x] Step ${i + 1}: ${truncate(step, 80)}`
                  : `  [ ] Step ${i + 1}: ${truncate(step, 80)}`
              )
            }
          } else {
            results.push("  (no numbered steps found in plan)")
          }

          // 4. Run verification commands if specified
          results.push("\n## Verification Commands")
          if (verificationCommands.length > 0) {
            for (const cmd of verificationCommands) {
              try {
                const output = execSync(cmd, {
                  cwd: workDir,
                  encoding: "utf-8",
                  timeout: 60000,
                  stdio: ["pipe", "pipe", "pipe"],
                })
                const lastLine = output.trim().split("\n").pop() || ""
                results.push(`  [x] \`${cmd}\` — PASS (${truncate(lastLine, 60)})`)
              } catch (err: any) {
                const errMsg =
                  (err.stderr || err.message || "").split("\n")[0] || "FAILED"
                results.push(`  [ ] \`${cmd}\` — FAIL (${truncate(errMsg, 60)})`)
              }
            }
          } else {
            results.push(
              '  (no verification commands found — add "Testing & Verification Plan" section with specific commands)'
            )
          }

          // 5. Summary
          const totalChecks = (results.join("\n").match(/\[x\]/g) || []).length
          const totalMissing = (results.join("\n").match(/\[ \]/g) || []).length
          const totalUnknown = (results.join("\n").match(/\[\?\]/g) || []).length

          results.push("\n## Summary")
          results.push(
            `  Completed: ${totalChecks} | Missing: ${totalMissing} | Unknown: ${totalUnknown}`
          )
          if (totalMissing === 0 && totalUnknown === 0) {
            results.push("  **All checks passed. Plan execution is complete.**")
          } else if (totalMissing > 0) {
            results.push(
              `  **${totalMissing} item(s) still pending. Plan execution is NOT complete.**`
            )
          } else {
            results.push(
              "  Some items could not be automatically verified. Manual review recommended."
            )
          }

          return results.join("\n")
        },
      }),
    },
  } satisfies Hooks
}

// --- Helpers ---

function parsePlanSections(content: string): string[] {
  const lines = content.split("\n")
  const sections: string[] = []
  for (const line of lines) {
    const match = line.match(/^#{1,3}\s+(.+)/)
    if (match) {
      sections.push(match[1].trim())
    }
  }
  return sections
}

function extractSteps(content: string): string[] {
  const lines = content.split("\n")
  const steps: string[] = []
  for (const line of lines) {
    // Match numbered steps like "1. Do something" or "1) Do something"
    const match = line.match(/^\s*\d+[.)]\s+(.+)/)
    if (match) {
      steps.push(match[1].trim())
    }
  }
  return steps
}

function extractFilesToModify(content: string): string[] {
  const lines = content.split("\n")
  const files: string[] = []
  let inFilesSection = false
  for (const line of lines) {
    if (
      line.toLowerCase().includes("file") &&
      (line.match(/^#{1,3}/) || line.match(/^\s*[-*]\s/))
    ) {
      inFilesSection = true
    }
    if (inFilesSection) {
      // Match file paths: paths with extensions, or paths starting with ./ or /
      const pathMatch = line.match(/`?([^\s`]+\.[a-zA-Z]{1,5})`?/)
      if (pathMatch) {
        const p = pathMatch[1]
        // Filter out non-file paths
        if (
          !p.startsWith("http") &&
          !p.includes("example") &&
          extname(p).length <= 5
        ) {
          files.push(p)
        }
      }
      // Exit files section on next heading
      if (line.match(/^#{1,3}\s/) && !line.toLowerCase().includes("file")) {
        inFilesSection = false
      }
    }
  }
  return [...new Set(files)]
}

function extractVerificationCommands(content: string): string[] {
  const commands: string[] = []
  const lines = content.split("\n")
  let inVerifySection = false
  for (const line of lines) {
    if (
      line.toLowerCase().includes("verif") ||
      line.toLowerCase().includes("test")
    ) {
      if (line.match(/^#{1,3}/)) {
        inVerifySection = true
      }
    }
    if (inVerifySection) {
      // Match inline code commands like `npm test`, `cargo build`
      const cmdMatches = line.matchAll(/`([^`]+)`/g)
      for (const m of cmdMatches) {
        const cmd = m[1]
        // Filter to actual commands (start with known prefixes)
        if (
          cmd.match(
            /^(npm|yarn|bun|cargo|go|python|pytest|ruff|tsc|eslint|make|git|dotnet)\b/
          ) ||
          cmd.match(/^(npm run|yarn run|bun run|cargo |go |python |pytest |ruff )/)
        ) {
          commands.push(cmd)
        }
      }
      if (line.match(/^#{1,3}\s/) && !line.toLowerCase().includes("verif")) {
        inVerifySection = false
      }
    }
  }
  return [...new Set(commands)]
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 3) + "..."
}

export default VerifyPlanPlugin
