# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 构建命令

```bash
npm run dev          # 启动开发服务器（端口3000），热重载
npm run build        # TypeScript检查 + Vite生产构建
npm run preview      # 预览生产构建
npm run test         # 运行所有测试（Vitest）
npm run test:watch   # 测试监视模式
```

## 项目概述

3D四子棋游戏 - 5x5x6棋盘，重力规则放置棋子，13个三维方向连成4子获胜。玩家对战AI，3种难度。

**当前进度**：Phase 1-5已完成（核心逻辑+渲染+AI+流程整合），Phase 6-8待开发（UI、特效、验收）。

**待解决问题**：AI评估算法对平面威胁vs立体威胁的评分权重需调整（单独处理）。

## 架构（4层）

```
展示层 (Presentation) → InputHandler ✅, GameUI, MenuUI（待开发）
游戏逻辑层 (Logic)     → GameState ✅, Board ✅, WinChecker ✅, LineIndex ✅, AIPlayer ✅, GameController ✅
渲染层 (Rendering)    → SceneSetup ✅, BoardRenderer ✅, CameraController ✅, EffectsRenderer（待开发）
数据层 (Data)         → StatsStore（待开发）, localStorage
```

**核心模式**：状态机管理游戏流程（`GameState.ts`）。Board使用三维数组+重力规则。WinChecker检测13方向的4连胜利。GameController协调所有模块。

## 已实现核心模块

| 模块 | 作用 |
|------|------|
| `Board` | 三维数组存储，重力放置，clone支持AI模拟 |
| `GameState` | 状态机：MENU → SELECT_DIFFICULTY → SELECT_ORDER → PLAYING → PLAYER_TURN/AI_TURN → GAME_END |
| `WinChecker` | 13方向胜负检测，`quickWouldWin`用于AI高频调用 |
| `LineIndex` | 预计算四连索引，O(13)增量更新（AI优化） |
| `AIPlayer` | Minimax算法，三种难度，异步决策 |
| `BoardRenderer` | 棋盘网格渲染，棋子下落动画，悬停高亮 |
| `CameraController` | 右键拖拽旋转视角，角度限制 |
| `InputHandler` | Raycaster点击检测，投影穿透检测 |
| `GameController` | 游戏流程控制器，协调所有模块 |

## 路径别名

`@/*` 映射到 `src/*`。使用 `@/core/Board` 代替相对路径。

## 测试

- Vitest，匹配模式 `src/**/*.test.ts`
- 70个测试覆盖Board、WinChecker、LineIndex、AIPlayer、GameState
- 测试重力规则、13方向胜利检测、LineIndex增量更新、AI决策

## 配置文件

| 文件 | 用途 |
|------|------|
| `src/config/gameConfig.ts` | 棋盘尺寸、棋子参数、材质、光照、特效 |
| `src/config/aiConfig.ts` | 难度配置（深度+失误率）、评估权重 |

## 下一步开发

**并行任务**：
1. AI评估算法优化（平面威胁vs立体威胁评分权重）- 单独处理
2. Phase 6 UI层开发：
   - T6-1: `GameUI` - 信息面板（回合、步数、难度、用时）
   - T6-2: `MenuUI` - 主菜单（开始、难度选择、先后手）
   - T6-3: `StatsStore` - 战绩存储（localStorage）
   - T6-4: 战绩展示UI

Phase 7 特效层：
- T7-1: `EffectsRenderer` - 胜负特效（连线高亮、粒子）

## 设计文档

- `docs/architecture/architecture.md` - 完整架构、ADR决策记录、接口定义
- `docs/pm/tasks.md` - WBS任务分解，8个阶段，依赖关系，状态
- `docs/requirements/requirements.md` - 功能列表、用户流程、验收标准
- `docs/design/visual-style-guide.md` - 配色、棋子设计（乐高式圆柱）

## 备注

- 渲染层开发使用 `threejs-game` skill
- AI难度：简单(depth 1, 30%失误), 中等(depth 2, 10%), 困难(depth 4, 0%)
- 棋盘高度可配置（默认6层，可扩展至8层）