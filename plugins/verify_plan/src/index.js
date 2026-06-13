import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { execSync } from "node:child_process";

export const VerifyPlanPlugin = async (_ctx) => {
  return {
    tool: {
      "verify-plan": {
        description:
          "Verify the execution status of a plan file. Checks which implementation steps have been completed by examining git diff, file existence, and test results. Use this after executing a plan to confirm all steps are done.",
        args: {
          plan_path: {
            type: "string",
            description: "Absolute or workspace-relative path to the plan markdown file",
          },
          working_dir: {
            type: "string",
            description: "The project root directory (defaults to current working directory)",
            optional: true,
          },
        },
        async execute(args) {
          const planPath = args.plan_path;
          const workDir = args.working_dir || process.cwd();

          if (!existsSync(planPath)) {
            return 'Error: Plan file not found at "' + planPath + '"';
          }

          const content = readFileSync(planPath, "utf-8");
          const sections = parsePlanSections(content);
          const steps = extractSteps(content);
          const filesToModify = extractFilesToModify(content);
          const verificationCommands = extractVerificationCommands(content);
          const results = [];

          results.push("## Plan Structure Check");
          const requiredSections = [
            "Context",
            "Recommended Approach",
            "Files to Modify",
            "Implementation Steps",
            "Testing & Verification Plan",
          ];
          for (const section of requiredSections) {
            const found = sections.some((s) =>
              s.toLowerCase().includes(section.toLowerCase())
            );
            results.push(found ? "  [x] " + section : "  [ ] " + section + " \u2014 MISSING");
          }

          results.push("\n## File Modification Check");
          if (filesToModify.length > 0) {
            let gitDiff;
            try {
              gitDiff = execSync(
                "git diff --name-only HEAD 2>nul || git diff --name-only",
                { cwd: workDir, encoding: "utf-8", timeout: 10000 }
              ).trim();
            } catch {
              gitDiff = "";
            }
            const changedFiles = new Set(
              gitDiff.split("\n").filter((f) => f.trim()).map((f) => f.trim())
            );
            for (const file of filesToModify) {
              const exists = existsSync(join(workDir, file));
              const changed = changedFiles.has(file);
              if (changed) {
                results.push("  [x] " + file + " \u2014 modified");
              } else if (exists) {
                results.push("  [?] " + file + " \u2014 exists but no git changes detected");
              } else {
                results.push("  [ ] " + file + " \u2014 NOT FOUND");
              }
            }
          } else {
            results.push("  (no files listed in plan)");
          }

          results.push("\n## Implementation Steps Check");
          if (steps.length > 0) {
            for (let i = 0; i < steps.length; i++) {
              const step = steps[i];
              const stepFiles = filesToModify.filter((f) =>
                step.toLowerCase().includes(f.toLowerCase().split("/").pop() || "")
              );
              const likelyDone =
                stepFiles.length > 0 &&
                stepFiles.some((f) => {
                  try {
                    const diff = execSync(
                      'git diff --name-only HEAD -- "' + f + '" 2>nul || echo ""',
                      { cwd: workDir, encoding: "utf-8", timeout: 5000 }
                    ).trim();
                    return diff.length > 0;
                  } catch {
                    return false;
                  }
                });
              results.push(
                likelyDone
                  ? "  [x] Step " + (i + 1) + ": " + truncate(step, 80)
                  : "  [ ] Step " + (i + 1) + ": " + truncate(step, 80)
              );
            }
          } else {
            results.push("  (no numbered steps found in plan)");
          }

          results.push("\n## Verification Commands");
          if (verificationCommands.length > 0) {
            for (const cmd of verificationCommands) {
              try {
                const output = execSync(cmd, {
                  cwd: workDir,
                  encoding: "utf-8",
                  timeout: 60000,
                  stdio: ["pipe", "pipe", "pipe"],
                });
                const lastLine = output.trim().split("\n").pop() || "";
                results.push("  [x] `" + cmd + "` \u2014 PASS (" + truncate(lastLine, 60) + ")");
              } catch (err) {
                const errMsg =
                  (err.stderr || err.message || "").split("\n")[0] || "FAILED";
                results.push("  [ ] `" + cmd + "` \u2014 FAIL (" + truncate(errMsg, 60) + ")");
              }
            }
          } else {
            results.push(
              '  (no verification commands found \u2014 add "Testing & Verification Plan" section with specific commands)'
            );
          }

          const totalChecks = (results.join("\n").match(/\[x\]/g) || []).length;
          const totalMissing = (results.join("\n").match(/\[ \]/g) || []).length;
          const totalUnknown = (results.join("\n").match(/\[\?\]/g) || []).length;

          results.push("\n## Summary");
          results.push(
            "  Completed: " + totalChecks + " | Missing: " + totalMissing + " | Unknown: " + totalUnknown
          );
          if (totalMissing === 0 && totalUnknown === 0) {
            results.push("  **All checks passed. Plan execution is complete.**");
          } else if (totalMissing > 0) {
            results.push(
              "  **" + totalMissing + " item(s) still pending. Plan execution is NOT complete.**"
            );
          } else {
            results.push(
              "  Some items could not be automatically verified. Manual review recommended."
            );
          }

          return results.join("\n");
        },
      },
    },
  };
};

function parsePlanSections(content) {
  const lines = content.split("\n");
  const sections = [];
  for (const line of lines) {
    const match = line.match(/^#{1,3}\s+(.+)/);
    if (match) {
      sections.push(match[1].trim());
    }
  }
  return sections;
}

function extractSteps(content) {
  const lines = content.split("\n");
  const steps = [];
  for (const line of lines) {
    const match = line.match(/^\s*\d+[.)]\s+(.+)/);
    if (match) {
      steps.push(match[1].trim());
    }
  }
  return steps;
}

function extractFilesToModify(content) {
  const lines = content.split("\n");
  const files = [];
  let inFilesSection = false;
  for (const line of lines) {
    if (
      line.toLowerCase().includes("file") &&
      (line.match(/^#{1,3}/) || line.match(/^\s*[-*]\s/))
    ) {
      inFilesSection = true;
    }
    if (inFilesSection) {
      const pathMatch = line.match(/`?([^\s`]+\.[a-zA-Z]{1,5})`?/);
      if (pathMatch) {
        const p = pathMatch[1];
        if (
          !p.startsWith("http") &&
          !p.includes("example") &&
          extname(p).length <= 5
        ) {
          files.push(p);
        }
      }
      if (line.match(/^#{1,3}\s/) && !line.toLowerCase().includes("file")) {
        inFilesSection = false;
      }
    }
  }
  return [...new Set(files)];
}

function extractVerificationCommands(content) {
  const commands = [];
  const lines = content.split("\n");
  let inVerifySection = false;
  for (const line of lines) {
    if (
      line.toLowerCase().includes("verif") ||
      line.toLowerCase().includes("test")
    ) {
      if (line.match(/^#{1,3}/)) {
        inVerifySection = true;
      }
    }
    if (inVerifySection) {
      const cmdMatches = line.matchAll(/`([^`]+)`/g);
      for (const m of cmdMatches) {
        const cmd = m[1];
        if (
          cmd.match(
            /^(npm|yarn|bun|cargo|go|python|pytest|ruff|tsc|eslint|make|git|dotnet)\b/
          ) ||
          cmd.match(/^(npm run|yarn run|bun run|cargo |go |python |pytest |ruff )/)
        ) {
          commands.push(cmd);
        }
      }
      if (line.match(/^#{1,3}\s/) && !line.toLowerCase().includes("verif")) {
        inVerifySection = false;
      }
    }
  }
  return [...new Set(commands)];
}

function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

export default VerifyPlanPlugin;
