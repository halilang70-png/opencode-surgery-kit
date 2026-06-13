# OpenCode 手术工具包

AGENTS.md 规范 + 插件。

## 快速开始

```bash
# 复制到全局目录（所有项目生效）
mkdir -p %USERPROFILE%\.config\opencode
copy AGENTS.md %USERPROFILE%\.config\opencode\AGENTS.md
```

重启 opencode 即可。所有项目都会自动加载这个 AGENTS.md。

## 优先级

OpenCode 加载 AGENTS.md 的顺序：

1. 项目目录的 `AGENTS.md`（项目级，最高优先级）
2. `~/.config/opencode/AGENTS.md`（全局）
3. `~/.claude/CLAUDE.md`（兼容 Claude Code）

项目级会覆盖全局。如果某个项目需要不同规范，在项目目录放一个自己的 AGENTS.md。

## 目录结构

```
opencode-surgery-kit/
├── AGENTS.md                           ← 规范文件（复制到全局目录）
├── GUIDE.md                            ← 完整指南
├── README.md                           ← 本文件
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
└── plugins/                            ← 插件（可选）
    ├── mode_switch/                    ← /mode 模式切换
    └── verify_plan/                    ← 计划验证工具
```

## AGENTS.md 内容

从 ECC 9 个精华 skills 精简合并：

- 验证循环（Build → Type Check → Lint → Test）
- 代码质量规范（命名、不可变性、错误处理）
- TDD 工作流
- 安全规范（密钥管理、输入验证、SQL注入防护）
- API 设计模式
- React 组件规范
- 后端架构模式
- E2E 测试模式
- 测试规范
