# OpenCode Surgery Kit

魔改 OpenCode 的工具包。从 ECC (Everything Claude Code) 偷来精华 skills，精简合并成 AGENTS.md，让 AI 自动遵循好习惯。

## 包含什么

- **AGENTS.md** — 精简版规范，验证循环、代码质量、TDD、安全、API 设计等
- **prompt-files/** — 12 个改好的 prompt 文件，替换内置毒瘤指令
- **core-patches/** — plan.ts 三选项 + 计划预览补丁
- **plugins/** — mode_switch（6档模式切换）和 verify_plan（计划验证）
- **instructions/** — ECC 原始文件，参考用

## 快速开始

```bash
# 安装 AGENTS.md（全局生效）
mkdir -p %USERPROFILE%\.config\opencode
copy AGENTS.md %USERPROFILE%\.config\opencode\AGENTS.md

# 安装插件（可选）
copy plugins\mode_switch\src\index.js %USERPROFILE%\.config\opencode\plugins\mode_switch.js
mkdir -p %USERPROFILE%\.config\opencode\commands
copy plugins\mode_switch\commands\*.md %USERPROFILE%\.config\opencode\commands\
```

重启 opencode 即可。

## 详细文档

prompt 替换、编译流程、core-patches、插件配置、常见问题 → 看 [GUIDE.md](GUIDE.md)
