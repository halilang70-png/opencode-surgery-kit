import path from "path"
import { readFileSync } from "fs"
import { SessionV1 } from "@opencode-ai/core/v1/session"
import { Effect, Schema } from "effect"
import * as Tool from "./tool"
import { Question } from "../question"
import { Session } from "@/session/session"
import { MessageV2 } from "../session/message-v2"
import { Provider } from "@/provider/provider"
import { InstanceState } from "@/effect/instance-state"
import { MessageID, PartID } from "../session/schema"
import EXIT_DESCRIPTION from "./plan-exit.txt"

export const Parameters = Schema.Struct({})

export const PlanExitTool = Tool.define(
  "plan_exit",
  Effect.gen(function* () {
    const session = yield* Session.Service
    const question = yield* Question.Service
    const provider = yield* Provider.Service

    return {
      description: EXIT_DESCRIPTION,
      parameters: Parameters,
      execute: (_params: {}, ctx: Tool.Context) =>
        Effect.gen(function* () {
          const instance = yield* InstanceState.context
          const info = yield* session.get(ctx.sessionID)
          const planFilePath = Session.plan(info, instance)
          const plan = path.relative(instance.worktree, planFilePath)

          // Read plan file content to display summary
          let planSummary = ""
          try {
            const content = readFileSync(planFilePath, "utf-8")
            const lines = content.split("\n").filter((l) => l.trim())
            // Show first 15 lines as summary
            const preview = lines.slice(0, 15).join("\n")
            const truncated = lines.length > 15 ? `\n... (${lines.length - 15} more lines)` : ""
            planSummary = `\n\nPlan preview (${plan}):\n${preview}${truncated}`
          } catch {
            planSummary = `\n\n(Plan file at ${plan} could not be read)`
          }

          const answers = yield* question.ask({
            sessionID: ctx.sessionID,
            questions: [
              {
                question: `Plan at ${plan} is ready for review.${planSummary}\n\nWhat would you like to do?`,
                header: "Review Plan",
                custom: true,
                options: [
                  { label: "Approve", description: "Switch to build agent and start implementing the plan" },
                  { label: "Request Changes", description: "Provide feedback to refine the plan (stays in plan mode)" },
                  { label: "Reject", description: "Dismiss and stay in plan mode to continue working" },
                ],
              },
            ],
            tool: ctx.callID ? { messageID: ctx.messageID, callID: ctx.callID } : undefined,
          })

          const userChoice = answers[0]?.[0]

          // Reject: user dismissed or chose "Reject"
          if (userChoice === "Reject" || !userChoice) yield* new Question.RejectedError()

          // Request Changes: user chose "Request Changes" or typed custom feedback
          if (userChoice === "Request Changes" || (userChoice !== "Approve" && userChoice !== "Other")) {
            const feedback = userChoice === "Request Changes"
              ? "The user requested changes to the plan. Please revise based on their feedback."
              : `The user provided this feedback: "${userChoice}"\n\nPlease revise the plan accordingly.`

            // Stay in plan mode — inject the feedback as a synthetic user message
            const model = yield* provider.defaultModel()
            const msg: SessionV1.User = {
              id: MessageID.ascending(),
              sessionID: ctx.sessionID,
              role: "user",
              time: { created: Date.now() },
              agent: "plan",
              model,
            }
            yield* session.updateMessage(msg)
            yield* session.updatePart({
              id: PartID.ascending(),
              messageID: msg.id,
              sessionID: ctx.sessionID,
              type: "text",
              text: feedback,
              synthetic: true,
            } satisfies SessionV1.TextPart)

            return {
              title: "Plan revision requested",
              output: feedback,
              metadata: {},
            }
          }

          // Approve: switch to build agent
          const messages = yield* session.messages({ sessionID: ctx.sessionID }).pipe(Effect.orDie)
          const lastUser = messages.findLast((item) => item.info.role === "user" && item.info.model)
          const model =
            lastUser?.info.role === "user" && lastUser.info.model ? lastUser.info.model : yield* provider.defaultModel()

          const msg: SessionV1.User = {
            id: MessageID.ascending(),
            sessionID: ctx.sessionID,
            role: "user",
            time: { created: Date.now() },
            agent: "build",
            model,
          }
          yield* session.updateMessage(msg)
          yield* session.updatePart({
            id: PartID.ascending(),
            messageID: msg.id,
            sessionID: ctx.sessionID,
            type: "text",
            text: `The plan at ${plan} has been approved. Read the plan file and execute it step by step, verifying after each change.`,
            synthetic: true,
          } satisfies SessionV1.TextPart)

          return {
            title: "Switching to build agent",
            output: "User approved the plan. Switching to build agent to begin implementation.",
            metadata: {},
          }
        }).pipe(Effect.orDie),
    }
  }),
)
