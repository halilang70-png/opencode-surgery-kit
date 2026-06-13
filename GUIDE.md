# OpenCode 手术工具包

OpenCode 自定义编译 + 提示词替换 — 完整操作手册

> 基于 opencode v1.17.4

---

## 01 背景与目标

OpenCode 的内置提示词存在以下**毒瘤行为**：

- `fewer than 3/4 lines` — 强制 AI 输出极少文字，无法解释复杂问题
- `one word answers are best` — 鼓励单字回答
- `one tool per message` — 限制每次只能调用一个工具，严重拖慢效率
- `just stop` — 鼓励 AI 主动停止工作
- 没有 Verification Mandate — 写完代码不测试，直接甩给用户

本指南的目标是：**用统一的提示词策略替换所有 8 个模型专属 prompt 文件**，注入 Verification Mandate、Code Quality、Error Handling 等核心模块，同时保留各文件的有用特色。

---

## 02 文件地图

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

模型路由逻辑在 `packages/opencode/src/session/system.ts` 中，通过 `provider()` 函数匹配模型 ID 到对应 .txt 文件。

---

## 03 统一注入的 6 大模块

所有 8 个文件共享以下核心模块（放在文件开头，紧随身份声明之后）：

### 1. Verification Mandate (CRITICAL)

每次代码修改后**必须**执行验证流水线：Build → Test → Lint → Smoke Test。任何一步失败则修复并从头开始。**绝不能**让用户替你测试。

### 2. Code Quality

写生产级代码，处理边界情况。使用库前先验证项目已引入。遵循现有代码风格。最小化修改，不乱加注释。

### 3. Error Handling Philosophy

构建失败 → 读错误 → 修根因。测试失败 → 追源 → 修代码。不猜、不压、不吞异常。3 次尝试失败后清晰报告。

### 4. Outcome Reporting

完成后诚实报告：做了什么、验证结果（pass/fail）、无法验证的原因。不声称未验证的成功。

### 5. Search Behavior

写代码前先搜索现有模式。卡住时先搜代码库 → 搜 Web → 读文档全文。不凭记忆猜 API。

### 6. Git Safety

不自动 commit/push/reset。不 revert 他人改动。用非交互 git 命令。

---

## 04 各文件改动详情

| 文件 | 改动级别 | 删除的毒瘤 | 保留的特色 |
|------|----------|------------|------------|
| `default.txt` | 完全重写 | 所有原始内容替换为统一策略 | 基础 CLI 交互框架 |
| `anthropic.txt` | 大幅修改 | 补充缺失模块 | Task Management、Professional Objectivity、TodoWrite 示例 |
| `gpt.txt` | 大幅修改 | 无验证机制 | commentary/final 双通道、Editing Approach、Autonomy、Frontend 约束 |
| `gemini.txt` | 大幅修改 | `fewer than 3 lines` | Software Engineering + New Applications 工作流结构、Core Mandates、Examples |
| `kimi.txt` | 大幅修改 | `one tool per message`、`fewer than 4 lines` | AGENTS.md 感知、Research 指南、Working Environment、语言匹配 |
| `trinity.txt` | 完全重写 | `one word answers are best`、`fewer than 4 lines`、`just stop`、`one tool per message` | 基础 CLI 交互框架 |
| `beast.txt` | 轻量注入 | 无（原版已很好） | 激进自主性、互联网研究强制、10 步工作流、Memory 系统、Communication 示例 |
| `codex.txt` | 轻量注入 | 无验证机制 | ASCII-first、apply_patch、Frontend 设计指南、Final answer 格式规范、File References 规则 |

---

## 05 编译与替换流程

### 5.1 前置条件

- [Bun](https://bun.sh) >= 1.3 已安装
- OpenCode 源码已克隆到本地
- Node.js / npm 已安装（用于全局包管理）

### 5.2 完整操作步骤

```
git pull → 替换 .txt → bun install → bun run build → copy .exe → 验证
```

#### Step 1: 拉取最新源码

```bash
cd /path/to/opencode  # 你的 opencode 源码目录
git pull origin main
```

#### Step 2: 替换 prompt 文件

将本指南附带的 8 个 `.txt` 文件复制到源码目录：

```bash
copy 你的备份目录\*.txt packages\opencode\src\session\prompt\
```

> **注意**：如果上游更新了 prompt 文件结构（比如新增了文件、改了文件名、或在 `system.ts` 中改了路由逻辑），你需要检查 `system.ts` 的变化并相应调整。

#### Step 3: 安装依赖

```bash
bun install
```

如果 `husky` 报错可以忽略，不影响编译。

#### Step 4: 编译

```bash
cd packages\opencode

# 完整编译（含 Web UI，推荐）
bun run build --single

# 快速编译（跳过 Web UI，纯 CLI 模式）
bun run build --single --skip-embed-web-ui
```

编译产物：

```
packages\opencode\dist\opencode-windows-x64\bin\opencode.exe
```

#### Step 5: 替换 npm 全局二进制

```bash
# 先关闭所有正在运行的 opencode 进程

# 替换 npm 全局安装的二进制（根据你的系统调整路径）
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

## 06 上游更新后的操作流程

当 OpenCode 发布新版本时，按以下流程操作：

### 快速更新清单

1. `git pull` 拉取最新源码
2. 检查 `packages/opencode/src/session/system.ts` 是否有变化
   - 如果路由逻辑没变 → 直接覆盖 8 个 .txt 文件
   - 如果新增了模型/prompt 文件 → 按统一模板创建新文件
   - 如果路由逻辑变了 → 需要理解变化并调整
3. 检查 `packages/opencode/src/session/prompt.ts` 中 prompt 组装逻辑是否变了
4. 检查 `packages/opencode/src/session/llm/request.ts` 中 system prompt 拼接是否变了
5. 覆盖 .txt 文件 → `bun install` → `bun run build --single` → 复制 exe

> **好消息**：prompt 文件是纯文本，不涉及 TypeScript 类型、不涉及编译依赖。只要文件名和路由不变，覆盖即可。

### 需要重点关注的文件

| 文件 | 作用 | 变动影响 |
|------|------|----------|
| `session/system.ts` | 模型 ID → prompt 文件路由 | 新增/删除模型时需要关注 |
| `session/prompt.ts` | prompt 组装（provider → env → instructions → skills → user.system） | 拼接顺序变化会影响提示词优先级 |
| `session/llm/request.ts` | 最终 system prompt 构造 | 层级变化会影响注入效果 |
| `session/instruction.ts` | AGENTS.md 加载机制 | 一般不会变 |

---

## 07 Prompt 组装链路

理解这个链路很重要，它决定了你注入的提示词的优先级：

```
provider.txt → env → AGENTS.md → skills → user.system
```

`request.ts:58-66` 中用 `\n` 拼接。你的 .txt 文件在**第一位置**，拥有最高的 primacy bias。这就是为什么必须直接改源码而不是用 AGENTS.md —— AGENTS.md 在第三位，无法覆盖第一位的毒瘤指令。

---

## 08 备份文件清单

以下 8 个文件是本次手术的产物，请妥善备份。上游更新后直接覆盖即可：

| 文件名 | 行数 | 说明 |
|--------|------|------|
| `default.txt` | ~113 | 兜底 prompt，影响所有未匹配模型（DeepSeek、通义千问、GLM 等） |
| `anthropic.txt` | ~169 | Claude 模型族，含 Task Management + Professional Objectivity |
| `gpt.txt` | ~155 | GPT 非旗舰，含 commentary/final 双通道 |
| `gemini.txt` | ~210 | Gemini 模型，保留 Software Engineering + New Applications 工作流 |
| `kimi.txt` | ~146 | Kimi（月之暗面），保留 AGENTS.md 感知 + Research 指南 |
| `trinity.txt` | ~113 | Trinity 模型，统一策略 |
| `beast.txt` | ~179 | GPT-4/o1/o3，保留激进自主性 + 互联网研究 |
| `codex.txt` | ~121 | Codex 模型，保留 ASCII-first + Frontend 设计 |

建议备份到一个独立目录，比如：

```
/path/to/your/backup/
├── default.txt
├── anthropic.txt
├── gpt.txt
├── gemini.txt
├── kimi.txt
├── trinity.txt
├── beast.txt
└── codex.txt
```

---

## 09 常见问题

### Q: 编译报 `preload not found "@opentui/solid/preload"`

依赖没装好。删除 `node_modules` 后重新 `bun install`。

### Q: 编译报 husky 错误

忽略。husky 是 git hook 工具，不影响编译产物。

### Q: `--skip-embed-web-ui` 会影响功能吗？

不会。跳过的是 TUI 渲染界面（终端里的富文本 UI），CLI 功能完全正常。只是界面变成纯文本输出。去掉这个 flag 可以编译完整版。

### Q: 上游新增了模型怎么办？

检查 `system.ts` 看新模型路由到哪个 .txt 文件。如果是新文件，按统一模板创建一个。如果是复用现有文件，不需要额外操作。

### Q: 怎么确认替换成功？

运行 `opencode`，随便让它写个函数，观察它是否自动运行 build/test/lint。如果它写完代码就停下来让你测试，说明替换没生效。

---

## 10 Plan Mode 增强

借鉴 Claude Code 的计划模式，对 OpenCode 的 plan → build 链路进行了全面增强。

### 10.1 计划文件可编辑（核心代码改动）

修改了 `packages/opencode/src/tool/plan.ts`，将原来的 Yes/No 二选一改为三选项：

- **Approve** → 切换到 build agent 执行
- **Request Changes** → 留在 plan mode，AI 根据反馈修改计划
- **Reject** → 留在 plan mode 继续工作

同时启用了 `custom: true`，用户可以输入自定义修改意见。弹出对话框时会显示计划文件前 15 行预览。

**涉及文件**：

```
packages/opencode/src/tool/plan.ts        ← 核心逻辑（三选项 + 计划预览）
packages/opencode/src/tool/plan-exit.txt  ← 工具描述更新
```

> **上游更新注意**：如果上游修改了 `plan.ts` 的 `plan_exit` 工具实现，需要手动合并我们的三选项逻辑。关键改动在 `question.ask()` 调用部分和后续的分支处理。

### 10.2 计划验证工具（插件）

新增 `verify_plan` 插件，提供 `verify-plan` 工具：

- 检查计划结构（8 个必须 section）
- 检查文件修改（git diff）
- 检查实现步骤完成度
- 自动运行验证命令（build/test/lint）
- 生成完成度报告

### 10.3 计划重入（提示词改动）

在 `plan-mode.txt` 中加入了 Plan Reentry 规则：

- **同一任务**：增量更新，标记已完成步骤
- **不同任务**：覆盖，标注旧计划已被取代
- **不确定**：询问用户

### 10.4 Plan Mode 提示词增强

| 文件 | 改动 |
|------|------|
| `plan-mode.txt` | Phase 4 强制 8 section + 验证计划 + 重入规则 |
| `build-switch.txt` | 从 4 行 → 47 行，完整执行指南 + 完成检查清单 |
| `plan.txt` | 新增 Plan Quality Standards 段落 |
| `plan-reminder-anthropic.txt` | 删除硬编码路径 + 增强验证要求 |

---

## 11 Mode Switch 插件

借鉴 Claude Code 的 `/mode` 命令，通过插件实现 6 档工作模式切换。

### 安装方式

```bash
# 创建全局插件目录
mkdir -p ~/.config/opencode/plugins

# 复制插件 JS 文件（直接放文件，不是目录）
cp plugins/mode_switch/src/index.js ~/.config/opencode/plugins/mode_switch.js
cp plugins/verify_plan/src/index.js ~/.config/opencode/plugins/verify_plan.js

# 创建命令文件（让 /mode 等命令可用）
mkdir -p ~/.config/opencode/commands
cp plugins/mode_switch/commands/*.md ~/.config/opencode/commands/
```

插件会自动加载，无需在配置文件中指定。

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

## 12 完整改动文件清单

### Prompt 文件（12 个）

```
packages/opencode/src/session/prompt/
├── default.txt                    ← 完全重写
├── anthropic.txt                  ← 大幅修改
├── gpt.txt                        ← 大幅修改
├── gemini.txt                     ← 大幅修改
├── kimi.txt                       ← 大幅修改
├── trinity.txt                    ← 完全重写
├── beast.txt                      ← 轻量注入
├── codex.txt                      ← 轻量注入
├── plan-mode.txt                  ← 增强（8 section + 验证 + 重入）
├── build-switch.txt               ← 增强（4行→47行执行指南）
├── plan.txt                       ← 增强（质量标准）
└── plan-reminder-anthropic.txt    ← 增强（修正路径）
```

### 核心代码（2 个）

```
packages/opencode/src/tool/plan.ts        ← 三选项 + 计划预览
packages/opencode/src/tool/plan-exit.txt  ← 工具描述更新
```

### 插件（2 个）

```
plugins/mode_switch/           ← /mode 模式切换
plugins/verify_plan/           ← 计划验证工具

安装到全局目录：
~/.config/opencode/plugins/mode_switch.js   ← 插件文件
~/.config/opencode/plugins/verify_plan.js   ← 插件文件
~/.config/opencode/commands/*.md            ← 命令定义文件
```

---

## 13 上游更新完整操作流程

### 每次上游更新后的操作清单

1. `git pull` 拉取最新源码
2. 检查以下文件是否有上游变更：
   - `session/system.ts` — 模型路由
   - `session/prompt.ts` — prompt 组装
   - `session/llm/request.ts` — system prompt 构造
   - `tool/plan.ts` — plan_exit 工具（**我们改过**）
   - `tool/plan-exit.txt` — 工具描述（**我们改过**）
3. 覆盖 12 个 prompt .txt 文件（从 `prompt-files/` 备份）
4. 如果 `tool/plan.ts` 有上游变更，手动合并我们的三选项逻辑
5. `bun install` → `bun run build --single` → 复制 exe
6. 验证：运行 `opencode`，测试 plan → build 流程

> **插件不受上游更新影响**：mode_switch 和 verify_plan 插件是独立的，不依赖 OpenCode 源码。上游更新不需要重新处理插件。

---

## 目录结构

```
opencode-surgery-kit/
├── GUIDE.md                            ← 本文件（完整操作指南）
├── README.md                           ← 快速使用说明
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
│   ├── plan.ts                         ← plan_exit 三选项 + 计划预览
│   └── plan-exit.txt                   ← 工具描述更新
├── instructions/                       ← 从 ECC 偷来的精华 skills
│   ├── strategic-compact.md            ← 代码精简压缩指令
│   ├── verification-loop.md            ← 验证循环强制机制
│   ├── coding-standards.md             ← 编码规范 checklist
│   ├── tdd-workflow.md                 ← TDD 工作流
│   ├── api-design.md                   ← API 设计模式
│   ├── frontend-patterns.md            ← React/Next.js 前端模式
│   ├── backend-patterns.md             ← Node.js 后端模式
│   ├── e2e-testing.md                  ← Playwright E2E 测试
│   └── security-review.md              ← 安全审查 checklist
└── plugins/                            ← 两个插件
    ├── mode_switch/                    ← /mode 模式切换
    │   ├── package.json
    │   ├── README.md
    │   ├── src/index.js                ← 插件主文件
    │   └── commands/                   ← 命令定义文件
    │       ├── mode.md
    │       ├── default.md
    │       ├── gentle.md
    │       ├── sharp.md
    │       ├── workhorse.md
    │       ├── token-saver.md
    │       └── super-ai.md
    └── verify_plan/                    ← 计划验证工具
        ├── package.json
        ├── README.md
        └── src/index.js                ← 插件主文件
```

---

## 14 从 ECC 偷来的精华 Skills

从 [ECC (Everything Claude Code)](https://github.com/anthropics/courses) 项目精选 9 个最有价值的 skills，去除了臃肿的框架依赖，只保留精华内容。

### 使用方式

将 `instructions/` 目录下的 .md 文件作为 OpenCode 的 AGENTS.md 内容使用。可以按需复制到你的项目根目录的 `AGENTS.md` 中，或直接作为参考文档。

### 精华清单

| 文件 | 来源 | 用途 |
|------|------|------|
| `strategic-compact.md` | ECC | 强制代码精简，减少 token 浪费 |
| `verification-loop.md` | ECC | 验证循环：编写 → 测试 → 修复 → 重复 |
| `coding-standards.md` | ECC | 编码规范 checklist（命名、格式、注释） |
| `tdd-workflow.md` | ECC | TDD 工作流：红 → 绿 → 重构 |
| `api-design.md` | ECC | RESTful API 设计模式（Supabase 风格） |
| `frontend-patterns.md` | ECC | React/Next.js 组件模式、Hooks、性能优化 |
| `backend-patterns.md` | ECC | Node.js 架构、数据库优化、中间件 |
| `e2e-testing.md` | ECC | Playwright E2E 测试、POM 模式 |
| `security-review.md` | ECC | 安全审查 checklist（SQL注入、XSS、认证） |

### 与 OpenCode 内置 prompt 的关系

这些 skills 补充了 prompt 替换无法覆盖的**领域知识**。prompt 替换解决的是 AI 行为模式（少说废话、自动验证），skills 解决的是技术规范（怎么写好 React 组件、怎么设计 API）。

---

*OpenCode Prompt Surgery Guide · 2026-06-14 · 基于 opencode v1.17.4 源码*