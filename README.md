# OpenCode 手术工具包

OpenCode 自定义编译所需的全部文件。

## 快速开始

```bash
# 复制到项目目录
copy AGENTS.md D:\你的项目目录\

# 启动 opencode
cd D:\你的项目目录
opencode
```

OpenCode 会自动读取项目根目录的 `AGENTS.md`，AI 会遵循里面的规范。

## 目录结构

```
opencode-surgery-kit/
├── AGENTS.md                           ← 精简版规范（直接复制到项目用）
├── GUIDE.md                            ← 完整操作指南
├── README.md                           ← 本文件
├── instructions/                       ← ECC 原始精华（参考用）
│   ├── strategic-compact.md            ← 代码精简压缩指令
│   ├── verification-loop.md            ← 验证循环强制机制
│   ├── coding-standards.md             ← 编码规范 checklist
│   ├── tdd-workflow.md                 ← TDD 工作流
│   ├── api-design.md                   ← API 设计模式
│   ├── frontend-patterns.md            ← React/Next.js 前端模式
│   ├── backend-patterns.md             ← Node.js 后端模式
│   ├── e2e-testing.md                  ← Playwright E2E 测试
│   └── security-review.md              ← 安全审查 checklist
└── plugins/                            ← 两个插件（可选）
    ├── mode_switch/                    ← /mode 模式切换
    │   ├── src/index.js                ← 插件主文件
    │   └── commands/                   ← 命令定义文件
    └── verify_plan/                    ← 计划验证工具
        └── src/index.js                ← 插件主文件
```

## AGENTS.md 说明

`AGENTS.md` 是从 ECC 9个精华 skills 精简合并而成的规范文件，包含：

- 验证循环（Build → Type Check → Lint → Test）
- 代码质量规范（命名、不可变性、错误处理）
- TDD 工作流
- 安全规范（密钥管理、输入验证、SQL注入防护）
- API 设计模式
- React 组件规范
- 后端架构模式
- E2E 测试模式
- 测试规范

**使用方法：**
```bash
# 复制到任意项目目录
copy AGENTS.md D:\你的项目目录\

# 或者追加到已有的 AGENTS.md
type AGENTS.md >> D:\你的项目目录\AGENTS.md
```