# OpenCode Surgery Kit

魔改 OpenCode 的工具包。

## 背景

OpenCode 的内置提示词有毒瘤：

- `fewer than 3/4 lines` — 强制 AI 少说话
- `one word answers are best` — 鼓励单字回答
- `one tool per message` — 限制每次只能用一个工具
- `just stop` — 鼓励 AI 主动停
- 没有验证机制 — 写完代码不测试

本工具包的目标：**替换毒瘤指令，注入好习惯**。

## 包含什么

- **AGENTS.md** — 精简版规范，从 ECC 9 个 skills 合并
- **prompt-files/** — 12 个改好的 prompt 文件
- **core-patches/** — plan.ts 三选项 + 计划预览补丁
- **plugins/** — mode_switch（6档模式切换）和 verify_plan（计划验证）
- **instructions/** — ECC 原始文件，参考用

## AGENTS.md 是什么

从 ECC (Everything Claude Code) 提炼 9 个精华 skills，精简合并成一份规范文件，让 AI 自动遵循好习惯：

验证循环、代码质量、TDD、安全、API 设计、React 组件、后端模式、E2E 测试、测试规范

## 文档

安装、编译、配置 → 看 [GUIDE.md](GUIDE.md)
