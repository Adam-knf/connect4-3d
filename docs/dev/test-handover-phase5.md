# 测试交接文档 - Phase 5 游戏流程整合

## 基本信息
- **文档版本**：v1.1
- **创建日期**：2026-04-24
- **更新日期**：2026-04-24 (Bug修复版本)
- **开发者**：Dev Agent
- **交接目标**：🧪 QA Agent
- **前置依赖**：
  - requirements.md v1.4
  - architecture.md v1.3
  - tasks.md v1.4 (Phase 5 任务定义)
  - code-review-report.md v1.1 (架构师评审)

---

## Bug修复内容

### P1-1: CameraController dispose 解绑失败
- **问题**：使用 `bind(this)` 创建新函数引用，无法正确解绑事件
- **修复**：保存绑定后的函数引用到类属性，使用引用解绑
- **文件**：src/rendering/CameraController.ts

### P1-2: GameController AI放置失败处理不完善
- **问题**：AI放置失败时仅切换回合，可能导致异常状态
- **修复**：调用 `handleDraw()` 结束游戏为平局
- **文件**：src/core/GameController.ts

### P2-3: BoardRenderer.clearWinHighlight 棋子颜色推断错误
- **问题**：key 格式是 `x,y,z`，不是以 'B'/'W' 开头，导致颜色推断错误
- **修复**：从材质颜色推断棋子类型（克隆材质保留了原始颜色）
- **文件**：src/rendering/BoardRenderer.ts

### InputHandler dispose 解绑问题（同 P1-1）
- **问题**：同 CameraController，使用 `bind(this)` 无法正确解绑
- **修复**：保存绑定后的函数引用
- **文件**：src/ui/InputHandler.ts

---

## 功能概述

Phase 5 实现了游戏流程整合，包括：
- **T5-1 GameController流程控制**：协调 GameState、Board、AIPlayer、BoardRenderer、InputHandler
- 完整游戏流程：开始 → 玩家回合 → AI回合 → 胜负判定 → 结束
- 状态变化驱动：监听 GameState 状态变化，触发对应行为

---

## 运行环境

### 开发环境
- Node.js: v22.x
- 依赖安装：`npm install`
- 构建命令：`npm run build`
- 测试命令：`npm run test`

### 新增/修改文件
```
src/core/GameController.ts  - 游戏流程控制器（新增）
src/main.ts                 - 入口文件（重构，使用 GameController）
```

---

## 接口调用方法

### 1. 创建 GameController 实例

```typescript
import { GameController } from '@/core/GameController';
import { BoardRenderer } from '@/rendering/BoardRenderer';
import { InputHandler } from '@/ui/InputHandler';

// 需要先初始化渲染器和输入处理器
const boardRenderer = new BoardRenderer(height);
const inputHandler = new InputHandler(camera, scene, canvas);

// 创建 GameController
const gameController = new GameController(boardRenderer, inputHandler);
gameController.init();
```

### 2. 开始游戏

```typescript
import type { Difficulty, Order } from '@/types';

// 开始游戏：难度 + 先后手
gameController.startGame('MEDIUM', 'FIRST');  // 玩家先手（黑棋）
gameController.startGame('HARD', 'SECOND');   // 玩家后手（白棋，AI先走）
gameController.startGame('EASY', 'RANDOM');   // 随机先后手
```

### 3. 游戏状态查询

```typescript
// 获取当前状态
const state = gameController.getState();  // 'PLAYER_TURN' | 'AI_TURN' | 'GAME_END' 等

// 获取完整状态数据
const data = gameController.getStateData();  // { difficulty, playerPiece, steps, ... }

// 是否玩家回合
const isPlayerTurn = gameController.isPlayerTurn();

// 是否AI正在思考
const isAIThinking = gameController.isAIThinking();

// 获取步数
const steps = gameController.getSteps();

// 获取难度
const difficulty = gameController.getDifficulty();

// 获取用时
const elapsed = gameController.getElapsedTime();
```

### 4. 游戏结束回调

```typescript
// 注册游戏结束回调
gameController.onGameEnd((result, winner) => {
  console.log(`Game ended: ${result}, winner: ${winner}`);
  // result: 'WIN' | 'LOSS' | 'DRAW'
  // winner: 'BLACK' | 'WHITE' | null (平局时)
});
```

### 5. 重新开始/返回菜单

```typescript
// 重新开始
gameController.restart();

// 返回主菜单
gameController.backToMenu();

// 清理资源
gameController.dispose();
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
# 预期输出：70 tests passed

# 4. 启动开发服务器（手动验证）
npm run dev
# 浏览器打开 http://localhost:3000
# 游戏自动开始：MEDIUM难度，玩家先手
# 点击放置棋子，等待AI响应
```

---

## 验证方法

### 自动化测试验证

#### 单元测试结果
```
所有测试通过：70 tests (无新增测试，验证现有功能不受影响)
```

### 手动验证清单

**完整游戏流程验证**：

1. **启动游戏**
   - 打开 http://localhost:3000
   - 控制台应显示 "Phase 5 Game Flow Integration"
   - 自动开始游戏（MEDIUM难度，玩家先手）

2. **玩家回合**
   - 悬停显示预览棋子（半透明）
   - 点击放置棋子，触发下落动画
   - 动画完成后切换到AI回合

3. **AI回合**
   - 禁用输入（无法点击）
   - AI思考约 800ms (MEDIUM)
   - AI放置棋子，触发下落动画
   - 切换回玩家回合

4. **胜负判定**
   - 当4连成功时：
     - 显示胜利连线高亮（绿色）
     - 游戏结束
   - 当AI获胜时：
     - 显示失败连线高亮（红色）
     - 游戏结束
   - 棋盘满时：
     - 平局结束

5. **控制台日志验证**
   ```
   [GameController] Starting game: difficulty=MEDIUM, order=FIRST
   [GameController] Player is BLACK, player goes first
   [GameController] Player click at (x, y)
   [GameController] Piece placed at (x, y, z)
   [GameController] AI turn starting...
   [GameController] AI decision: (x, y)
   [GameController] Game end: WIN/LOSS/DRAW
   ```

---

## 架构设计说明

### 状态驱动流程

```
GameState 状态变化 → GameController.handleStateChange() → 执行对应行为

状态转换：
  MENU → SELECT_DIFFICULTY → SELECT_ORDER → PLAYER_TURN/AI_TURN
  PLAYER_TURN ↔ AI_TURN (回合交替)
  PLAYER_TURN/AI_TURN → GAME_END (胜负判定后)

行为触发：
  PLAYER_TURN → enableInput() (启用点击)
  AI_TURN → disableInput() + handleAITurn() (禁用点击，AI决策)
  GAME_END → disableInput() + 触发回调
```

### 模块协调

```
GameController
  ├── GameState (状态机)
  ├── Board (棋盘逻辑)
  ├── AIPlayer (AI决策)
  ├── BoardRenderer (棋盘渲染)
  └── InputHandler (输入处理)
```

---

## 失败排查

### 常见问题

1. **点击无响应**
   - 检查是否在 PLAYER_TURN 状态
   - 检查 InputHandler 是否启用

2. **AI不响应**
   - 检查是否在 AI_TURN 状态
   - 检查 AIPlayer.setPiece 是否正确设置棋子类型

3. **胜利高亮显示所有棋子**
   - 已修复：材质共享问题（clone材质后设置发光）

4. **游戏无法重新开始**
   - 检查 board 是否重新创建
   - 检查 boardRenderer.clearPieces() 是否执行

---

## 交付物清单

| 文件 | 内容 | 状态 |
|------|------|------|
| src/core/GameController.ts | 游戏流程控制器 | ✅ 完成 |
| src/main.ts | 入口文件（重构） | ✅ 完成 |
| docs/dev/test-handover-phase5.md | 测试交接文档 | ✅ 本文档 |

---

## 下一步工作

Phase 6 UI层开发：
1. GameUI 信息面板：回合、步数、难度、用时、AI思考提示
2. MenuUI 主菜单：开始游戏、难度选择、先后手选择
3. StatsStore 战绩存储：localStorage读写、胜率计算
4. 战绩展示UI

Phase 7 特效层（胜负特效）。

---

## 调试指南

### 控制台日志说明

运行游戏后，打开浏览器控制台（F12），观察以下日志：

```
[GameState.switchTurn] turn: BLACK -> WHITE, playerPiece: BLACK, aiPiece: WHITE, isAITurn: true
[GameController.handleStateChange] PLAYER_TURN → AI_TURN
[GameController] AI_TURN: disabling input, starting AI turn
[GameController] AI turn starting...
[GameController] AI decision: (x, y)
[GameController] AI drop animation complete, checking game state...
[GameController] Current state: AI_TURN, turn: WHITE
[GameController] No winner, switching turn...
[GameState.switchTurn] turn: WHITE -> BLACK, playerPiece: BLACK, aiPiece: WHITE, isAITurn: false
[GameController.handleStateChange] AI_TURN → PLAYER_TURN
[GameController] PLAYER_TURN: enabling input
```

### 常见问题排查

1. **AI连续下棋**
   - 检查 `[GameState.switchTurn]` 日志，确认 `isAITurn` 值是否正确
   - 检查 `playerPiece` 和 `aiPiece` 设置是否正确
   - 检查 `[GameController.enableInput]` 是否被调用

2. **点击无响应**
   - 检查当前状态是否为 PLAYER_TURN
   - 检查 `[GameController.disableInput]` 是否正确禁用

3. **状态切换异常**
   - 观察 `handleStateChange` 日志中的状态转换序列
   - 确认动画回调中的 `switchTurn()` 调用时机

---

**版本**：v1.1
**最后更新**：2026-04-24