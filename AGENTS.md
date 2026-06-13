# AGENTS.md

## 核心原则

### 1. 验证循环 (Verification Loop)
每次代码修改后**必须**执行验证流水线。任何一步失败则修复并从头开始。**绝不能**让用户替你测试。

验证顺序：Build → Type Check → Lint → Test → Security Scan

```bash
# 根据项目类型选择
npm run build 2>&1 | tail -20
npx tsc --noEmit 2>&1 | head -30
npm run lint 2>&1 | head -30
npm run test -- --coverage 2>&1 | tail -50
```

### 2. 代码质量 (Code Quality)

**命名规范：**
```typescript
// GOOD: 描述性命名
const marketSearchQuery = 'election'
async function fetchMarketData(marketId: string) { }

// BAD: 不清晰
const q = 'election'
async function market(id: string) { }
```

**不可变性 (CRITICAL)：**
```typescript
// GOOD: 使用展开运算符
const updatedUser = { ...user, name: 'New Name' }
const updatedArray = [...items, newItem]

// BAD: 直接修改
user.name = 'New Name'  // 禁止
items.push(newItem)     // 禁止
```

**错误处理：**
```typescript
// GOOD: 完整错误处理
async function fetchData(url: string) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Fetch failed:', error)
    throw new Error('Failed to fetch data')
  }
}

// BAD: 无错误处理
async function fetchData(url) {
  const response = await fetch(url)
  return response.json()
}
```

**并行执行：**
```typescript
// GOOD: 并行执行
const [users, markets, stats] = await Promise.all([
  fetchUsers(),
  fetchMarkets(),
  fetchStats()
])

// BAD: 串行执行
const users = await fetchUsers()
const markets = await fetchMarkets()
const stats = await fetchStats()
```

**类型安全：**
```typescript
// GOOD: 正确类型
interface Market {
  id: string
  name: string
  status: 'active' | 'resolved' | 'closed'
}

function getMarket(id: string): Promise<Market> { }

// BAD: 使用 any
function getMarket(id: any): Promise<any> { }
```

### 3. TDD 工作流

1. **写测试先于代码** (RED)
2. **实现代码** (GREEN)
3. **重构** (REFACTOR)

```bash
npm test  # 测试应该先失败
# 实现代码
npm test  # 测试应该通过
```

### 4. 安全规范

**绝不硬编码密钥：**
```typescript
// GOOD: 使用环境变量
const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  throw new Error('OPENAI_API_KEY not configured')
}

// BAD: 硬编码
const apiKey = "sk-proj-xxxxx"  // 禁止
```

**输入验证：**
```typescript
import { z } from 'zod'

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
})

export async function createUser(input: unknown) {
  const validated = CreateUserSchema.parse(input)
  return await db.users.create(validated)
}
```

**SQL注入防护：**
```typescript
// GOOD: 参数化查询
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('email', userEmail)

// BAD: 字符串拼接
const query = `SELECT * FROM users WHERE email = '${userEmail}'`  // 禁止
```

**认证检查：**
```typescript
// JWT存储在httpOnly cookie
res.setHeader('Set-Cookie',
  `token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`)

// 授权检查
export async function deleteUser(userId: string, requesterId: string) {
  const requester = await db.users.findUnique({ where: { id: requesterId } })
  if (requester.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  await db.users.delete({ where: { id: userId } })
}
```

### 5. API 设计

**RESTful 规范：**
```
GET    /api/v1/users              # 列表
GET    /api/v1/users/:id          # 单个
POST   /api/v1/users              # 创建
PUT    /api/v1/users/:id          # 全量更新
PATCH  /api/v1/users/:id          # 部分更新
DELETE /api/v1/users/:id          # 删除
```

**统一响应格式：**
```typescript
// 成功
{ "data": { "id": "abc-123", "name": "Alice" } }

// 错误
{ "error": { "code": "validation_error", "message": "Email required" } }

// 列表
{
  "data": [...],
  "meta": { "total": 100, "page": 1, "per_page": 20 }
}
```

**状态码：**
- 200 OK - 成功
- 201 Created - 创建成功
- 204 No Content - 删除成功
- 400 Bad Request - 请求错误
- 401 Unauthorized - 未认证
- 403 Forbidden - 无权限
- 404 Not Found - 未找到
- 422 Unprocessable Entity - 验证失败
- 429 Too Many Requests - 限流
- 500 Internal Server Error - 服务器错误

### 6. React 组件

```typescript
// 函数组件 + 类型
interface ButtonProps {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary'
}

export function Button({
  children,
  onClick,
  disabled = false,
  variant = 'primary'
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  )
}
```

**Hooks 模式：**
```typescript
// 自定义Hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

// 状态更新使用函数式
setCount(prev => prev + 1)  // GOOD
setCount(count + 1)         // BAD (可能过时)
```

### 7. 后端模式

**Repository 模式：**
```typescript
interface MarketRepository {
  findAll(filters?: MarketFilters): Promise<Market[]>
  findById(id: string): Promise<Market | null>
  create(data: CreateMarketDto): Promise<Market>
  update(id: string, data: UpdateMarketDto): Promise<Market>
  delete(id: string): Promise<void>
}
```

**数据库优化：**
```typescript
// GOOD: 只选需要的列
const { data } = await supabase
  .from('markets')
  .select('id, name, status, volume')
  .eq('status', 'active')
  .limit(10)

// BAD: 选择所有
const { data } = await supabase
  .from('markets')
  .select('*')
```

**避免N+1：**
```typescript
// BAD: N+1查询
const markets = await getMarkets()
for (const market of markets) {
  market.creator = await getUser(market.creator_id)  // N次查询
}

// GOOD: 批量查询
const markets = await getMarkets()
const creatorIds = markets.map(m => m.creator_id)
const creators = await getUsers(creatorIds)  // 1次查询
const creatorMap = new Map(creators.map(c => [c.id, c]))
markets.forEach(market => {
  market.creator = creatorMap.get(market.creator_id)
})
```

### 8. E2E 测试 (Playwright)

**Page Object Model：**
```typescript
export class ItemsPage {
  readonly page: Page
  readonly searchInput: Locator

  constructor(page: Page) {
    this.page = page
    this.searchInput = page.locator('[data-testid="search-input"]')
  }

  async goto() {
    await this.page.goto('/items')
    await this.page.waitForLoadState('networkidle')
  }
}
```

**测试结构：**
```typescript
test.describe('Item Search', () => {
  let itemsPage: ItemsPage

  test.beforeEach(async ({ page }) => {
    itemsPage = new ItemsPage(page)
    await itemsPage.goto()
  })

  test('should search by keyword', async ({ page }) => {
    await itemsPage.search('test')
    const count = await itemsPage.getItemCount()
    expect(count).toBeGreaterThan(0)
  })
})
```

### 9. 测试规范

**AAA 模式：**
```typescript
test('calculates similarity correctly', () => {
  // Arrange
  const vector1 = [1, 0, 0]
  const vector2 = [0, 1, 0]
  
  // Act
  const similarity = calculateCosineSimilarity(vector1, vector2)
  
  // Assert
  expect(similarity).toBe(0)
})
```

**测试命名：**
```typescript
// GOOD: 描述性命名
test('returns empty array when no markets match query', () => { })
test('throws error when OpenAI API key is missing', () => { })

// BAD: 模糊命名
test('works', () => { })
```

## 代码异味检测

### 1. 函数过长 (>50行)
```typescript
// BAD
function processMarketData() {
  // 100行代码
}

// GOOD: 拆分
function processMarketData() {
  const validated = validateData()
  const transformed = transformData(validated)
  return saveData(transformed)
}
```

### 2. 深层嵌套 (>5层)
```typescript
// BAD
if (user) {
  if (user.isAdmin) {
    if (market) {
      // ...
    }
  }
}

// GOOD: 提前返回
if (!user) return
if (!user.isAdmin) return
if (!market) return
// ...
```

### 3. 魔法数字
```typescript
// BAD
if (retryCount > 3) { }
setTimeout(callback, 500)

// GOOD: 命名常量
const MAX_RETRIES = 3
const DEBOUNCE_DELAY_MS = 500

if (retryCount > MAX_RETRIES) { }
setTimeout(callback, DEBOUNCE_DELAY_MS)
```

### 4. 深度嵌套
```typescript
// BAD: 5+层嵌套
if (user) {
  if (user.isAdmin) {
    if (market) {
      if (market.isActive) {
        if (hasPermission) {
          // 做某事
        }
      }
    }
  }
}

// GOOD: 提前返回
if (!user) return
if (!user.isAdmin) return
if (!market) return
if (!market.isActive) return
if (!hasPermission) return

// 做某事
```

## 文件组织

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API路由
│   ├── markets/           # 市场页面
│   └── (auth)/           # 认证页面
├── components/            # React组件
│   ├── ui/               # 通用UI组件
│   ├── forms/            # 表单组件
│   └── layouts/          # 布局组件
├── hooks/                # 自定义React hooks
├── lib/                  # 工具和配置
│   ├── api/             # API客户端
│   ├── utils/           # 辅助函数
│   └── constants/       # 常量
├── types/                # TypeScript类型
└── styles/              # 全局样式
```

## 注释规范

```typescript
// GOOD: 解释为什么，而不是做什么
// 使用指数退避避免在API故障时过载
const delay = Math.min(1000 * Math.pow(2, retryCount), 30000)

// BAD: 陈述显而易见的事情
// 计数器加1
count++

// 设置名称为用户名称
name = user.name
```

## 性能优化

```typescript
// GOOD: 记忆化昂贵计算
const sortedMarkets = useMemo(() => {
  return markets.sort((a, b) => b.volume - a.volume)
}, [markets])

// GOOD: 懒加载重组件
const HeavyChart = lazy(() => import('./HeavyChart'))

// GOOD: 并行执行
const [users, markets] = await Promise.all([
  fetchUsers(),
  fetchMarkets()
])
```

## 测试覆盖率

```json
{
  "coverageThresholds": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

## E2E 测试

```typescript
// Page Object Model
export class ItemsPage {
  readonly searchInput: Locator

  constructor(page: Page) {
    this.searchInput = page.locator('[data-testid="search-input"]')
  }

  async search(query: string) {
    await this.searchInput.fill(query)
    await this.page.waitForResponse(resp => resp.url().includes('/api/search'))
  }
}

// 测试结构
test.describe('Item Search', () => {
  test('should search by keyword', async ({ page }) => {
    const itemsPage = new ItemsPage(page)
    await itemsPage.goto()
    await itemsPage.search('test')
    await expect(itemsPage.itemCards.first()).toContainText(/test/i)
  })
})
```

## 安全清单

- [ ] 无硬编码密钥
- [ ] 所有输入已验证
- [ ] 使用参数化查询
- [ ] JWT存储在httpOnly cookie
- [ ] 授权检查已实现
- [ ] 错误信息不泄露内部细节
- [ ] .env在.gitignore中
- [ ] 无console.log残留

## 验证报告格式

```
VERIFICATION REPORT
==================

Build:     [PASS/FAIL]
Types:     [PASS/FAIL] (X errors)
Lint:      [PASS/FAIL] (X warnings)
Tests:     [PASS/FAIL] (X/Y passed, Z% coverage)
Security:  [PASS/FAIL] (X issues)

Overall:   [READY/NOT READY] for PR

Issues to Fix:
1. ...
2. ...
```
