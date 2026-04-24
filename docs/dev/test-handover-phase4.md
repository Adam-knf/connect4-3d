# 测试交接文档 - Phase 4 AI系统

## 基本信息
- **文档版本**：v1.0
- **创建日期**：2026-04-23
- **开发者**：Dev Agent
- **交接目标**：🧪 QA Agent
- **前置依赖**：
  - requirements.md v1.4
  - architecture.md v1.3
  - tasks.md v1.3 (Phase 4 任务定义)

---

## 功能概述

Phase 4 实现了 AI 决策系统，包括：
- **T4-1 AIPlayer基础决策**：Minimax + Alpha-Beta 剪枝框架、异步决策
- **T4-2 评估函数设计**：威胁检测、机会评估、中心位置加分
- **T4-3 难度配置实现**：EASY/MEDIUM/HARD 三种难度、失误率机制
- **T4-4 AI性能优化**：深度限制、响应时间优化

---

## 运行环境

### 开发环境
- Node.js: v22.x
- 依赖安装：`npm install`
- 构建命令：`npm run build`
- 测试命令：`npm run test`

### 新增文件
```
src/core/AIPlayer.ts         - AI决策模块
src/core/AIPlayer.test.ts    - AI单元测试（18个测试用例）
```

### 依赖文件
```
src/config/aiConfig.ts       - AI配置（深度、失误率、评估权重）
src/core/Board.ts            - 棋盘逻辑（clone, setPiece, getAvailableColumns）
src/core/WinChecker.ts       - 胜负判定（quickWouldWinFast）
src/core/LineIndex.ts        - 四连索引（威胁评估、快速检测）
```

---

## 接口调用方法

### 1. 创建 AI 玩家实例

```typescript
import { AIPlayer } from '@/core/AIPlayer';
import type { Difficulty, Player } from '@/types';

// 创建指定难度的 AI
const ai = new AIPlayer('HARD');

// 设置 AI 棋子类型（默认为 WHITE）
ai.setPiece('WHITE');
```

### 2. AI 决策（异步）

```typescript
import { Board } from '@/core/Board';

const board = new Board(6);  // 6层棋盘

// AI 决策返回落子位置 (x, y)
const result = await ai.decide(board);
console.log(`AI 选择: (${result.x}, ${result.y})`);

// 放置棋子
const placeResult = board.placePiece(result.x, result.y, 'WHITE');
if (placeResult?.winResult) {
  console.log('AI 获胜！');
}
```

### 3. 难度切换

```typescript
// 动态切换难度
ai.setDifficulty('EASY');  // depth=1, mistakeRate=0.3
ai.setDifficulty('MEDIUM'); // depth=2, mistakeRate=0.1
ai.setDifficulty('HARD');  // depth=4, mistakeRate=0

// 获取当前配置
console.log(ai.getDifficulty());   // 'HARD'
console.log(ai.getSearchDepth());  // 4
```

### 4. 性能监控

```typescript
// 获取搜索节点计数（调试）
await ai.decide(board);
console.log(`搜索节点数: ${ai.getNodeCount()}`);
```

---

## 程序运行顺序

```bash
# 1. 安装依赖
npm install

# 2. 运行构建（验证编译）
npm run build
# 预期输出：built in ~3s，无编译错误

# 3. 运行测试（验证功能）
npm run test
# 预期输出：70 tests passed (18 AI tests + 52 existing tests)

# 4. 启动开发服务器（手动验证）
npm run dev
# 浏览器打开 http://localhost:3000
# 需要集成到 GameController 后才能完整测试 AI 对战
```

---

## 验证方法

### 自动化测试验证

#### 单元测试结果
```
AIPlayer.test.ts: 18 tests passed
- 基础决策: 3 tests ✅
- 获胜检测: 2 tests ✅
- 难度配置: 4 tests ✅
- 棋子类型: 1 test ✅
- 评估函数: 1 test ✅
- 失误率机制: 2 tests ✅
- 性能测试: 5 tests ✅
```

#### 性能测试结果
| 难度 | 响应时间 | 需求 | 状态 |
|------|----------|------|------|
| EASY | ~350ms | ≤1秒 | ✅ 通过 |
| MEDIUM | ~850ms | ≤2秒 | ✅ 通过 |
| HARD | ~2100ms | ≤3秒 | ✅ 通过 |

### 手动验证清单

由于 AI 需要与 GameController 整合后才能完整测试对战流程，Phase 4 交付的是独立的 AIPlayer 模块。手动验证要点：

1. **构建成功**：`npm run build` 无错误
2. **测试通过**：`npm run test` 70 个测试全部通过
3. **接口完整**：
   - `AIPlayer.decide(board)` 返回有效位置
   - 难度配置正确生效
   - 失误率机制正常工作

---

## 难度配置说明

| 难度 | 搜索深度 | 失误率 | 思考延迟 | 说明 |
|------|----------|--------|----------|------|
| EASY | 1 | 30% | 300ms | 新手友好，会随机选次优解 |
| MEDIUM | 2 | 10% | 800ms | 有挑战，偶尔失误 |
| HARD | 4 | 0% | 1500ms | 高难度，始终最优评估 |

---

## 失败排查

### 常见问题

1. **测试超时**
   - 原因：HARD 深度4层搜索较慢
   - 处理：测试已设置超时时间 60s，如仍超时可减少 trials

2. **失误率测试失败**
   - 原因：概率性测试，随机结果可能偏离预期
   - 处理：多次运行测试，或调整 trials 数量

3. **构建错误**
   - 检查 TypeScript 类型是否正确
   - 检查导入路径是否正确（使用 `@/` 别名）

---

## 交付物清单

| 文件 | 内容 | 状态 |
|------|------|------|
| src/core/AIPlayer.ts | AI决策模块 | ✅ 完成 |
| src/core/AIPlayer.test.ts | AI单元测试 | ✅ 完成 |
| test-handover-phase4.md | 测试交接文档 | ✅ 本文档 |

---

## 下一步工作

Phase 5 游戏流程整合需要：
1. 创建 `GameController.ts` 协调 AIPlayer 与 Board、GameState
2. 实现 AI 回合流程（`startAITurn`）
3. 集成到 `main.ts` 完整测试对战

---

**版本**：v1.0
**最后更新**：2026-04-23