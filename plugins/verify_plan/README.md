# opencode-plugin-verify-plan

OpenCode 计划验证插件。在执行完 plan 后，检查计划完成度。

## 功能

提供 `verify-plan` 工具，自动检查：
1. **计划结构** — 8 个必须 section 是否齐全
2. **文件修改** — 计划中列出的文件是否已被修改（通过 git diff）
3. **实现步骤** — 各步骤是否已完成（通过文件变更推断）
4. **验证命令** — 自动运行计划中指定的 build/test/lint 命令
5. **总结报告** — 完成度统计 + 待办项列表

## 安装

在 `opencode.json` 中添加：

```json
{
  "plugin": [
    "./opencode_plugin/verify_plan",
    "./opencode_plugin/mode_switch"
  ]
}
```

## 使用

在 opencode 中执行完 plan 后：

```
verify-plan ~/.opencode/plans/my-plan.md
```

或使用工作区相对路径：

```
verify-plan .opencode/plans/my-plan.md
```

## 输出示例

```
## Plan Structure Check
  [x] Context
  [x] Recommended Approach
  [x] Files to Modify
  [x] Implementation Steps
  [x] Testing & Verification Plan

## File Modification Check
  [x] src/app.ts — modified
  [ ] src/utils/helper.ts — NOT FOUND

## Implementation Steps Check
  [x] Step 1: Add new endpoint handler
  [ ] Step 2: Write unit tests

## Verification Commands
  [x] `npm run build` — PASS (Build completed successfully)
  [ ] `npm test` — FAIL (2 tests failed)

## Summary
  Completed: 4 | Missing: 2 | Unknown: 0
  **2 item(s) still pending. Plan execution is NOT complete.**
```

## 兼容性

- OpenCode >= 1.17.0
- 需要 git（用于检测文件变更）
