# OpenCode 手术工具包

完整操作手册（基于 opencode v1.17.4）

> 背景和介绍请看 [README.md](README.md)

---

## 01 Prompt 文件地图

所有 prompt 文件位于：

```
opencode/packages/opencode/src/session/prompt/
├── default.txt    ← 兜底（DeepSeek、通义千问、GLM 等所有未匹配模型）
├── anthropic.txt  ← Claude 模型族
├── gpt.txt        ← GPT 非旗舰模型
├── gemini.txt     ← Gemini 模型
├── kimi.txt       ← Kimi（月之暗面）
├── trinity.txt    ← Trinity 模型
├── beast.txt      ← GPT-4/o1/o3 旗舰模型
└── codex.txt      ← Codex 模型
```

模型路由逻辑在 `packages/opencode/src/session/system.ts` 中。

---

## 02 编译与替换流程

### 前置条件

- [Bun](https://bun.sh) >= 1.3 已安装
- OpenCode 源码已克隆到本地
- Node.js / npm 已安装

### 操作步骤

```
git pull → 替换 .txt → bun install → bun run build → copy .exe → 验证
```

#### Step 1: 拉取最新源码

```bash
cd /path/to/opencode
git pull origin main
```

#### Step 2: 替换 prompt 文件

```bash
copy prompt-files\*.txt packages\opencode\src\session\prompt\
```

#### Step 3: 安装依赖

```bash
bun install
```

#### Step 4: 编译

```bash
cd packages\opencode

# 完整编译（含 Web UI）
bun run build --single

# 快速编译（跳过 Web UI）
bun run build --single --skip-embed-web-ui
```

编译产物：`packages\opencode\dist\opencode-windows-x64\bin\opencode.exe`

#### Step 5: 替换 npm 全局二进制

```bash
# Windows:
copy packages\opencode\dist\opencode-windows-x64\bin\opencode.exe ^
     %APPDATA%\npm\node_modules\opencode-ai\bin\opencode.exe

# macOS/Linux:
# cp packages/opencode/dist/opencode-macos-arm64/bin/opencode \
#    "$HOME/.local/share/npm/lib/node_modules/opencode-ai/bin/opencode"
```

#### Step 6: 验证

```bash
opencode --version
```

---

## 03 Core Patches

修改了 `packages/opencode/src/tool/plan.ts`，将 Yes/No 二选一改为三选项：

- **Approve** → 切换到 build agent 执行
- **Request Changes** → 留在 plan mode，AI 根据反馈修改计划
- **Reject** → 留在 plan mode 继续工作

### 应用补丁

```bash
copy core-patches\plan.ts packages\opencode\src\tool\
copy core-patches\plan-exit.txt packages\opencode\src\tool\
```

---

## 04 插件安装

### Mode Switch 插件

```bash
# 创建全局插件目录
mkdir -p %USERPROFILE%\.config\opencode\plugins

# 复制插件文件
copy plugins\mode_switch\src\index.js %USERPROFILE%\.config\opencode\plugins\mode_switch.js

# 创建命令文件（让 Tab 补全生效）
mkdir -p %USERPROFILE%\.config\opencode\commands
copy plugins\mode_switch\commands\*.md %USERPROFILE%\.config\opencode\commands\
```

### Verify Plan 插件

```bash
copy plugins\verify_plan\src\index.js %USERPROFILE%\.config\opencode\plugins\verify_plan.js
```

### 模式列表

| 命令 | Temperature | MaxTokens | 行为 |
|------|-------------|-----------|------|
| `/default` | 不改 | 不改 | 平衡 |
| `/gentle` | 0.4 | 不改 | 耐心解释 |
| `/sharp` | 0.2 | 不改 | 三阶段审查 |
| `/workhorse` | 0.2 | 不改 | 牛马模式 |
| `/token-saver` | 0.1 | 4096 | 极简输出 |
| `/super-ai` | 0.6 | 16384 | 深度思考 |

---

## 05 AGENTS.md

从 ECC 9 个精华 skills 精简合并的规范文件。

### 安装

```bash
mkdir -p %USERPROFILE%\.config\opencode
copy AGENTS.md %USERPROFILE%\.config\opencode\AGENTS.md
```

### 优先级

1. 项目目录的 `AGENTS.md` — 项目级，最高优先级
2. `~/.config/opencode/AGENTS.md` — 全局
3. `~/.claude/CLAUDE.md` — 兼容 Claude Code

项目级会覆盖全局。

### 包含内容

验证循环、代码质量、TDD、安全、API 设计、React 组件、后端模式、E2E 测试、测试规范

### 原始文件（参考用）

`instructions/` 目录下的 9 个 .md 文件是 ECC 原始内容，包含详细代码示例。

---

## 06 上游更新流程

1. `git pull` 拉取最新源码
2. 检查 `system.ts`、`prompt.ts`、`request.ts` 是否有变化
3. 覆盖 .txt 文件
4. 如果 `tool/plan.ts` 有上游变更，手动合并三选项逻辑
5. `bun install` → `bun run build --single` → 复制 exe
6. 验证：运行 `opencode`，测试 plan → build 流程

> 插件不受上游更新影响。

---

## 07 常见问题

### Q: 编译报 `preload not found "@opentui/solid/preload"`

删除 `node_modules` 后重新 `bun install`。

### Q: 编译报 husky 错误

忽略。husky 是 git hook 工具，不影响编译产物。

### Q: `--skip-embed-web-ui` 会影响功能吗？

不会。跳过的是 TUI 渲染界面，CLI 功能完全正常。

### Q: 怎么确认替换成功？

运行 `opencode`，随便让它写个函数，观察它是否自动运行 build/test/lint。

### Q: 插件不生效？

1. 确认文件放在 `~/.config/opencode/plugins/` 下（直接放 .js 文件，不是目录）
2. 确认命令文件放在 `~/.config/opencode/commands/` 下
3. 重启 opencode

---

## 目录结构

```
opencode-surgery-kit/
├── AGENTS.md                           ← 精简版规范（复制到全局目录）
├── GUIDE.md                            ← 本文件
├── README.md                           ← 项目介绍
├── prompt-files/                       ← 12 个改好的 prompt 文件
│   ├── default.txt
│   ├── anthropic.txt
│   ├── gpt.txt
│   ├── gemini.txt
│   ├── kimi.txt
│   ├── trinity.txt
│   ├── beast.txt
│   ├── codex.txt
│   ├── plan-mode.txt
│   ├── build-switch.txt
│   ├── plan.txt
│   └── plan-reminder-anthropic.txt
├── core-patches/                       ← 核心代码补丁
│   ├── plan.ts
│   └── plan-exit.txt
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
└── plugins/                            ← 两个插件
    ├── mode_switch/                    ← /mode 模式切换
    │   ├── src/index.js
    │   └── commands/
    └── verify_plan/                    ← 计划验证工具
        └── src/index.js
```

---

*OpenCode Surgery Kit · 2026-06-14*
