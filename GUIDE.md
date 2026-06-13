# OpenCode 手术工具包

AGENTS.md 规范 + 插件使用指南

---

## 核心：AGENTS.md

`AGENTS.md` 是从 ECC 9 个精华 skills 精简合并的规范文件，让 AI 自动遵循好习惯。

### 使用方法

```bash
# 复制到项目目录
copy AGENTS.md D:\你的项目目录\

# 启动 opencode
cd D:\你的项目目录
opencode
```

OpenCode 会自动读取项目根目录的 `AGENTS.md`，AI 会遵循里面的规范。

### 包含内容

| 模块 | 说明 |
|------|------|
| 验证循环 | Build → Type Check → Lint → Test，任何一步失败则修复 |
| 代码质量 | 命名规范、不可变性、错误处理、并行执行 |
| TDD 工作流 | 先写测试 → 实现 → 重构 |
| 安全规范 | 密钥管理、输入验证、SQL注入防护、认证检查 |
| API 设计 | RESTful 规范、统一响应格式、状态码 |
| React 组件 | 函数组件、Hooks 模式、状态更新 |
| 后端模式 | Repository 模式、数据库优化、避免N+1 |
| E2E 测试 | Playwright POM 模式、测试结构 |
| 测试规范 | AAA 模式、命名规范、覆盖率 |

### 与 OpenCode 内置 prompt 的关系

`AGENTS.md` 在 prompt 组装链路的第三位：

```
provider.txt → env → AGENTS.md → skills → user.system
```

它无法覆盖第一位的毒瘤指令（如 `one word answers are best`），但可以补充**领域知识**和**行为规范**。

---

## 插件（可选）

### Mode Switch 插件

6 档工作模式切换，通过 `/mode` 命令使用。

#### 安装

```bash
# 创建全局插件目录
mkdir -p ~/.config/opencode/plugins

# 复制插件文件
copy plugins\mode_switch\src\index.js %USERPROFILE%\.config\opencode\plugins\mode_switch.js

# 创建命令文件（让 Tab 补全生效）
mkdir -p ~/.config/opencode/commands
copy plugins\mode_switch\commands\*.md %USERPROFILE%\.config\opencode\commands\
```

#### 模式列表

| 命令 | Temperature | MaxTokens | 行为 |
|------|-------------|-----------|------|
| `/default` | 不改 | 不改 | 平衡 |
| `/gentle` | 0.4 | 不改 | 耐心解释 |
| `/sharp` | 0.2 | 不改 | 三阶段审查 |
| `/workhorse` | 0.2 | 不改 | 牛马模式 |
| `/token-saver` | 0.1 | 4096 | 极简输出 |
| `/super-ai` | 0.6 | 16384 | 深度思考 |

### Verify Plan 插件

计划验证工具，在 plan mode 中使用。

#### 安装

```bash
copy plugins\verify_plan\src\index.js %USERPROFILE%\.config\opencode\plugins\verify_plan.js
```

#### 功能

- 检查计划结构（8 个必须 section）
- 检查文件修改（git diff）
- 检查实现步骤完成度
- 自动运行验证命令（build/test/lint）
- 生成完成度报告

---

## 目录结构

```
opencode-surgery-kit/
├── AGENTS.md                           ← 精简版规范（直接复制到项目用）
├── GUIDE.md                            ← 本文件
├── README.md                           ← 快速使用说明
├── instructions/                       ← ECC 原始精华（参考用）
│   ├── strategic-compact.md
│   ├── verification-loop.md
│   ├── coding-standards.md
│   ├── tdd-workflow.md
│   ├── api-design.md
│   ├── frontend-patterns.md
│   ├── backend-patterns.md
│   ├── e2e-testing.md
│   └── security-review.md
└── plugins/                            ← 两个插件（可选）
    ├── mode_switch/                    ← /mode 模式切换
    │   ├── src/index.js
    │   └── commands/
    └── verify_plan/                    ← 计划验证工具
        └── src/index.js
```

---

## 常见问题

### Q: AGENTS.md 会被 AI 忽略吗？

不会。OpenCode 启动时会自动加载项目根目录的 `AGENTS.md`，作为额外指令注入。

### Q: 插件不生效怎么办？

1. 确认文件放在 `~/.config/opencode/plugins/` 下（直接放 .js 文件，不是目录）
2. 确认命令文件放在 `~/.config/opencode/commands/` 下
3. 重启 opencode

### Q: 怎么确认 AGENTS.md 生效了？

让 AI 写一个函数，观察它是否自动运行 build/test/lint。如果它写完代码就停下来让你测试，说明没生效。

---

*OpenCode Surgery Kit · 2026-06-14*
