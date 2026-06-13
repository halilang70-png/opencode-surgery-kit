# opencode-plugin-mode-switch

OpenCode 工作模式切换插件，借鉴 Claude Code 的 `/mode` 命令。

## 功能

通过 slash 命令切换 AI 工作模式，每个模式会动态调整：
- **System Prompt**：注入模式专属指令
- **Temperature**：控制创造性/确定性
- **MaxOutputTokens**：控制输出长度

## 6 个模式

| 命令 | 名称 | Temperature | MaxTokens | 行为 |
|------|------|-------------|-----------|------|
| `/default` | 默认 | 不改 | 不改 | 平衡日常开发 |
| `/gentle` | 温柔模式 | 0.4 | 不改 | 耐心解释，适合学习 |
| `/sharp` | 锐利博士 | 0.2 | 不改 | 三阶段代码审查 |
| `/workhorse` | 牛马模式 | 0.2 | 不改 | 自动执行，不废话 |
| `/token-saver` | 省钱模式 | 0.1 | 4096 | 极简输出 |
| `/super-ai` | 超级AI | 0.6 | 16384 | 深度思考，全面分析 |

## 安装

### 方法 1：本地路径引用（推荐）

在项目的 `opencode.json` 中添加：

```json
{
  "plugin": ["./path/to/opencode_plugin/mode_switch"]
}
```

或全局配置 `~/.opencode/opencode.json`。

### 方法 2：相对路径

如果你把插件放在项目目录下：

```json
{
  "plugin": ["./mode_switch"]
}
```

## 使用

```
/mode                查看当前模式和可用列表
/mode workhorse      切换到牛马模式
/workhorse           直接切换（快捷方式）
/sharp               切换到锐利博士
/gentle              切换到温柔模式
/token-saver         切换到省钱模式
/super-ai            切换到超级AI
/default             回到默认模式
```

## 状态持久化

当前模式保存在 `~/.opencode/mode-state.json`，重启 opencode 后自动恢复。

## 原理

插件使用三个 hook：

1. **`command.execute.before`** — 拦截 `/mode` 和 `/workhorse` 等 slash 命令
2. **`experimental.chat.system.transform`** — 每次对话注入当前模式的 system prompt
3. **`chat.params`** — 每次请求调整 temperature 和 maxOutputTokens

## 自定义

编辑 `src/index.ts` 中的 `MODES` 对象即可添加/修改模式。每个模式的结构：

```typescript
{
  name: "显示名称",
  slug: "命令名",
  description: "描述",
  systemPrompt: "注入的 system prompt",
  temperature: 0.3,          // 0 = 不改
  maxOutputTokens: 8192,     // undefined = 不改
}
```

## 兼容性

- OpenCode >= 1.17.0
- 需要 `experimental.chat.system.transform` 和 `chat.params` hook 支持
