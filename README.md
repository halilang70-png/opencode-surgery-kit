# OpenCode 手术工具包

OpenCode 自定义编译所需的全部文件。

## 快速开始

详细操作指南请查看 [GUIDE.md](GUIDE.md)

## 目录结构

```
opencode-surgery-kit/
├── GUIDE.md                            ← 完整操作指南
├── README.md                           ← 本文件
├── prompt-files/                       ← 12 个改好的 prompt 文件
├── core-patches/                       ← 核心代码补丁
│   ├── plan.ts                         ← plan_exit 三选项 + 计划预览
│   └── plan-exit.txt                   ← 工具描述更新
└── plugins/                            ← 两个插件
    ├── mode_switch/                    ← /mode 模式切换
    │   ├── src/index.js                ← 插件主文件
    │   └── commands/                   ← 命令定义文件
    └── verify_plan/                    ← 计划验证工具
        └── src/index.js                ← 插件主文件
```

## 快速使用

### 1. 编译 OpenCode

```bash
cd /path/to/opencode
bun install
cd packages/opencode
bun run build --single
```

### 2. 应用改动

**Prompt 文件：**
```bash
cp prompt-files/*.txt packages/opencode/src/session/prompt/
```

**核心代码补丁：**
```bash
cp core-patches/plan.ts packages/opencode/src/tool/
cp core-patches/plan-exit.txt packages/opencode/src/tool/
```

**插件：**
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

### 3. 重新编译

```bash
cd packages/opencode
bun run build --single
```

### 4. 替换 npm 全局二进制

```bash
# npm 全局安装路径（根据你的系统调整）
# Windows:
cp dist/opencode-windows-x64/bin/opencode.exe \
   "$APPDATA/npm/node_modules/opencode-ai/bin/opencode.exe"
# macOS/Linux:
# cp dist/opencode-macos-arm64/bin/opencode \
#    "$HOME/.local/share/npm/lib/node_modules/opencode-ai/bin/opencode"
```

## 上游更新后

1. `git pull` 拉取最新源码
2. 检查 `core-patches/` 中的文件是否有上游冲突
3. 重新覆盖 `prompt-files/*.txt`
4. 重新编译

详细流程见 `GUIDE.md`。