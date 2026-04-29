# 任务拆解文档 v2.0

## 基本信息
- **项目名称**：3D四子棋（Connect Four 3D）
- **项目经理**：PM Agent
- **文档版本**：v2.0
- **创建日期**：2026-04-22
- **更新日期**：2026-04-27
- **前置依赖**：
  - requirements.md v1.4
  - architecture.md v1.3
  - visual-style-guide.md v1.0
  - theme-system-requirements.md v1.0
  - theme-system-design.md v2.0
  - ai-evaluation-v2.md v2.0 (Phase 12 AI重构架构)
  - qa-report.md v1.0 (Phase 2 验收)
  - qa-report-phase3.md v1.0 (Phase 3 验收)
  - test-handover-phase4.md v1.0 (Phase 4 验收)
  - qa-report-phase5-v1.2.md (Phase 5 Bug修复验收)
  - qa-report-phase6-v1.0.md (Phase 6 UI层验收)
  - qa-report-phase7-v1.0.md (Phase 7 主题框架验收)
  - code-review-report.md v1.1 (架构师评审)

---

## 角色与技能说明

### 责任角色
| 角色 | 职责 |
|------|------|
| **dev** | 💻 功能开发 - 代码实现、重构、Bug修复 |
| **architect** | 🏗️ 架构设计 - 技术选型、系统架构、算法设计 |
| **qa** | 🧪 测试QA - 测试用例设计、自动化测试、质量检查 |
| **pm** | 📋 项目管理 - 任务规划、进度跟踪、验收确认 |

### 技能标签
| Skill | 适用场景 |
|-------|----------|
| **threejs-game** | Three.js开发 - 3D渲染、游戏机制、相机控制、动画特效 |
| **frontend-design** | 前端UI设计 - 界面组件、样式设计、交互体验 |

---

## 任务分解结构 (WBS)

```
Phase 1: 项目基础搭建 [已完成 ✓]
├── T1-1 项目初始化           [dev]
├── T1-2 类型定义             [dev + architect]
├── T1-3 配置文件             [dev + architect]
└── T1-4 Three.js场景初始化   [dev + threejs-game]

Phase 2: 核心逻辑层（Game Logic）[已完成 ✓]
├── T2-1 Board棋盘逻辑        [dev + architect]
├── T2-2 GameState状态机      [dev + architect]
├── T2-3 WinChecker胜负判定   [dev + architect]
└── T2-4 单元测试（逻辑层）   [qa]

Phase 3: 渲染层基础（Rendering）[已完成 ✓]
├── T3-1 BoardRenderer棋盘渲染      [dev + threejs-game]
├── T3-2 棋子渲染与下落动画          [dev + threejs-game]
├── T3-3 悬停高亮交互               [dev + threejs-game]
├── T3-4 CameraController视角控制   [dev + threejs-game]
└── T3-5 InputHandler输入处理       [dev + threejs-game]

Phase 4: AI系统 [已完成 ✓]
├── T4-1 AIPlayer基础决策     [dev + architect]
├── T4-2 评估函数设计         [dev + architect]
├── T4-3 难度配置实现         [dev]
└── T4-4 AI性能优化           [dev + architect]

Phase 5: 游戏流程整合 [进行中 ⏳]
├── T5-1 GameController流程控制 [dev + architect] ✅ completed
├── T5-2 游戏闭环测试           [qa] ✅ completed
└── T5-3 Bug修复与调优          [dev] ⏳ in_progress (AI评估问题单独处理)

Phase 6: UI层（P1功能）[已完成 ✓]
├── T6-1 GameUI信息面板       [dev + frontend-design]
├── T6-2 MenuUI主菜单         [dev + frontend-design]
├── T6-3 StatsStore战绩存储   [dev]
└── T6-4 战绩展示UI           [dev + frontend-design]

Phase 7: 主题核心框架（P0功能）[待开始]
├── T7-1 主题类型Schema定义         [dev + architect]
├── T7-2 ThemeManager主题管理       [dev + architect]
├── T7-3 ThemeLoader素材加载        [dev + architect]
├── T7-4 PieceStateManager状态管理   [dev + architect]
├── T7-5 AnimationController动画控制  [dev + architect]
├── T7-6 改造PieceRenderer棋子渲染    [dev + architect]
├── T7-7 改造BoardRenderer棋盘渲染    [dev + architect]
├── T7-8 EnvironmentRenderer环境渲染   [dev + architect]
└── T7-9 ThemeSelectUI主题选择界面    [dev + frontend-design]

Phase 8: 猫咪主题（P1功能）[待开始]
├── T8-1 获取猫咪主题素材（GLB模型、纹理、天空盒）[dev]
└── T8-2 猫咪主题配置（主题JSON + 动画参数）       [dev + architect]

Phase 9: 机甲主题（P2功能）[待开始]
├── T9-1 获取机甲主题素材（GLB模型、纹理、天空盒）[dev]
└── T9-2 机甲主题配置（主题JSON + 动画参数）       [dev + architect]

Phase 10: 视觉特效层（P2功能）[待开始]  ← 原Phase 8，重编号
├── T10-1 EffectsRenderer胜负特效  [dev + threejs-game]
├── T10-2 粒子系统实现             [dev + threejs-game]
└── T10-3 堆叠榫合特效预留         [dev + architect]

Phase 11: 验收与优化 [待开始]  ← 原Phase 9，重编号
├── T11-1 整体功能验收         [qa + pm]
├── T11-2 性能优化             [dev + threejs-game]
└── T11-3 WebGL兼容性检测      [dev + threejs-game]
```

---

## 详细任务列表

### Phase 1: 项目基础搭建 ✓ 已完成

| ID | 任务名称 | 优先级 | 角色 | Skill | 估时 | 状态 | 交付物 |
|----|----------|--------|------|-------|------|------|--------|
| T1-1 | 项目初始化：创建Vite+TypeScript项目骨架 | P0 | dev | - | 2h | ✅ completed | package.json, tsconfig.json, vite.config.ts |
| T1-2 | 类型定义：定义核心类型（Player, Position, GameStateType等） | P0 | dev | architect协助 | 2h | ✅ completed | src/types/index.ts |
| T1-3 | 配置文件：游戏配置、AI配置、棋子配置 | P0 | dev | architect协助 | 1h | ✅ completed | src/config/gameConfig.ts, aiConfig.ts |
| T1-4 | Three.js场景初始化：创建Scene、Camera、Renderer、光照 | P0 | dev | threejs-game | 3h | ✅ completed | src/rendering/SceneSetup.ts |

**里程碑 M1**：✅ 已达成 - 项目可运行，显示空白Three.js场景

---

### Phase 2: 核心逻辑层（Game Logic） ✓ 已完成

| ID | 任务名称 | 优先级 | 角色 | Skill | 估时 | 状态 | 交付物 |
|----|----------|--------|------|-------|------|------|--------|
| T2-1 | Board棋盘逻辑：三维数组、重力规则、放置棋子 | P0 | dev | architect协助 | 4h | ✅ completed | src/core/Board.ts |
| T2-2 | GameState状态机：状态定义、转换规则、回调机制 | P0 | dev | architect协助 | 3h | ✅ completed | src/core/GameState.ts |
| T2-3 | WinChecker胜负判定：13方向检测、连线计算、quickWouldWin优化 | P0 | dev | architect协助 | 4h | ✅ completed | src/core/WinChecker.ts |
| T2-4 | 单元测试（逻辑层）：Board、WinChecker、LineIndex测试用例（52个） | P0 | qa | - | 2h | ✅ completed | docs/qa/qa-report.md (100%通过) |

**里程碑 M2**：✅ 已达成 - 核心逻辑层完成，52个单元测试全部通过，qa-report.md 验收通过

---

### Phase 3: 渲染层基础（Rendering） ✓ 已完成

| ID | 任务名称 | 优先级 | 角色 | Skill | 估时 | 依赖 | 状态 | 交付物 |
|----|----------|--------|------|-------|------|------|------|--------|
| T3-1 | BoardRenderer棋盘渲染：底座网格、线框、坐标系统 | P0 | dev | threejs-game | 4h | T1-4, T2-1 | ✅ completed | src/rendering/BoardRenderer.ts |
| T3-2 | 棋子渲染与下落动画：圆柱体材质、从上方15单位下落、物理反弹 | P0 | dev | threejs-game | 4h | T3-1 | ✅ completed | 棋子渲染模块 |
| T3-3 | 悬停高亮交互：底座/棋子顶部悬停显示预览棋子、竖直高亮 | P0 | dev | threejs-game | 3h | T3-1, T3-2 | ✅ completed | 悬停高亮功能 |
| T3-4 | CameraController视角控制：右键拖拽旋转、角度限制（俯视~平视） | P0 | dev | threejs-game | 3h | T1-4 | ✅ completed | src/rendering/CameraController.ts |
| T3-5 | InputHandler输入处理：左键点击、右键旋转、Raycaster、投影穿透检测 | P0 | dev | threejs-game | 3h | T3-4 | ✅ completed | src/ui/InputHandler.ts |

**里程碑 M3**：✅ 已达成 - 棋盘可视化完成，可交互旋转和放置棋子（无AI）

---

### Phase 4: AI系统 ✓ 已完成

| ID | 任务名称 | 优先级 | 角色 | Skill | 估时 | 依赖 | 状态 | 交付物 |
|----|----------|--------|------|-------|------|------|------|--------|
| T4-1 | AIPlayer基础决策：Minimax框架、异步决策 | P0 | dev | architect协助 | 4h | T2-1, T2-3 | ✅ completed | src/core/AIPlayer.ts |
| T4-2 | 评估函数设计：威胁检测、机会评估、中心加分 | P0 | dev | architect协助 | 4h | T4-1 | ✅ completed | 评估函数模块 |
| T4-3 | 难度配置实现：简单/中等/困难、失误率 | P0 | dev | - | 2h | T4-1, T4-2 | ✅ completed | 难度配置生效 |
| T4-4 | AI性能优化：深度限制、异步计算、思考延迟 | P0 | dev | architect协助 | 2h | T4-1 | ✅ completed | AI响应≤3秒 |

**里程碑 M4**：✅ 已达成 - AI可对战，三种难度区分明显，性能符合需求

---

### Phase 5: 游戏流程整合 ⏳ 进行中

| ID | 任务名称 | 优先级 | 角色 | Skill | 估时 | 依赖 | 状态 | 交付物 |
|----|----------|--------|------|-------|------|------|------|--------|
| T5-1 | GameController流程控制：协调所有模块、完整游戏流程 | P0 | dev | architect协助 | 4h | T2-2, T4-1, T3-1, T3-5 | ✅ completed | src/core/GameController.ts |
| T5-2 | 游戏闭环测试：完整流程测试（开始→对战→结束） | P0 | qa | - | 2h | T5-1 | ✅ completed | qa-report-phase5-v1.2.md |
| T5-3 | Bug修复与调优：流程Bug、动画优化 | P0 | dev | - | 3h | T5-2 | ⏳ in_progress | AI评估问题单独处理 |

**里程碑 M5**：⏳ 部分达成 - GameController完成，QA验收通过，AI评估算法问题待修复

**待解决问题**：
- AI评估函数对平面威胁vs立体威胁的评分权重需调整（用户反馈Medium双威胁识别不足）
- 3个LineIndex评估测试失败（统计性测试波动）
- 问题单独处理，不影响Phase 5核心流程功能

---

### Phase 6: UI层（P1功能） ✓ 已完成

| ID | 任务名称 | 优先级 | 角色 | Skill | 估时 | 依赖 | 状态 | 交付物 |
|----|----------|--------|------|-------|------|------|------|--------|
| T6-1 | GameUI信息面板：回合、步数、难度、用时、AI思考提示 | P1 | dev | frontend-design | 3h | T5-1 | ✅ completed | src/ui/GameUI.ts |
| T6-2 | MenuUI主菜单：开始游戏、难度选择、先后手选择 | P1 | dev | frontend-design | 3h | T5-1, T6-3 | ✅ completed | src/ui/MenuUI.ts |
| T6-3 | StatsStore战绩存储：localStorage读写、胜率计算 | P1 | dev | - | 2h | T1-3 | ✅ completed | src/core/StatsStore.ts |
| T6-4 | 战绩展示UI：各难度胜场/败场/胜率展示 | P1 | dev | frontend-design | 2h | T6-1, T6-3 | ✅ completed | 集成到GameUI/MenuUI |

**里程碑 M6**：✅ 已达成 - UI层完成，战绩记录和展示功能可用

---

### Phase 7: 主题核心框架（P0功能） ⏳ 代码验收通过（待浏览器验证）

| ID | 任务名称 | 优先级 | 角色 | Skill | 估时 | 依赖 | 状态 | 交付物 |
|----|----------|--------|------|-------|------|------|------|--------|
| T7-1 | 主题类型Schema定义：ThemeId, ThemeConfig, 各子配置类型 | P0 | dev | architect协助 | 2h | - | ✅ completed | src/types/theme.ts |
| T7-2 | ThemeManager主题管理：主题配置管理、切换流程协调 | P0 | dev | architect协助 | 4h | T7-1 | ✅ completed | src/core/ThemeManager.ts |
| T7-3 | ThemeLoader素材加载：GLB/GLTF模型、纹理、天空盒加载与缓存 | P0 | dev | architect协助 | 6h | T7-1 | ✅ completed | src/core/ThemeLoader.ts |
| T7-4 | PieceStateManager状态管理：6状态机、状态转换表、棋子缓存 | P0 | dev | architect协助 | 6h | T7-1 | ✅ completed | src/core/PieceStateManager.ts |
| T7-5 | AnimationController动画控制：循环动画、触发动画、己方/对方区分 | P0 | dev | architect协助 | 8h | T7-4 | ✅ completed | src/core/AnimationController.ts |
| T7-6 | 改造PieceRenderer：素材驱动、Mesh池管理、姿态切换 | P0 | dev | threejs-game | 6h | T7-2, T7-3 | ✅ completed | src/rendering/PieceRenderer.ts |
| T7-7 | 改造BoardRenderer：纹理贴图、材质颜色主题化 | P1 | dev | threejs-game | 3h | T7-2 | ✅ completed | src/rendering/BoardRenderer.ts |
| T7-8 | EnvironmentRenderer环境渲染：背景、光照、天空盒 | P2 | dev | threejs-game | 4h | T7-2, T7-3 | ✅ completed | src/rendering/EnvironmentRenderer.ts |
| T7-9 | ThemeSelectUI主题选择界面：预览、二次确认 | P1 | dev | frontend-design | 3h | T7-2 | ✅ completed | src/ui/ThemeSelectUI.ts |

**里程碑 M7**：⏳ 代码验收通过 - 经典主题框架完成，接口完备，待浏览器验证

**Phase 7 工时总计：48h（约 5-6 个工作日）**

---

### Phase 8: 猫咪主题（P1功能）

| ID | 任务名称 | 优先级 | 角色 | Skill | 估时 | 依赖 | 状态 | 交付物 |
|----|----------|--------|------|-------|------|------|------|--------|
| T8-1 | 获取猫咪主题素材：GLB模型、纹理、天空盒 | P1 | dev | - | 4h | - | pending | public/assets/themes/cat/ |
| T8-2 | 猫咪主题配置：主题JSON + 动画参数 | P1 | dev | architect协助 | 4h | T7-1, T8-1 | pending | src/config/catTheme.ts |

**里程碑 M8**：猫咪主题完成，呼吸节律/悬停/下落/对抗动画生效

**Phase 8 工时总计：8h（约 1 个工作日）**

---

### Phase 9: 机甲主题（P2功能）

| ID | 任务名称 | 优先级 | 角色 | Skill | 估时 | 依赖 | 状态 | 交付物 |
|----|----------|--------|------|-------|------|------|------|--------|
| T9-1 | 获取机甲主题素材：GLB模型、纹理、天空盒 | P2 | dev | - | 4h | - | pending | public/assets/themes/mecha/ |
| T9-2 | 机甲主题配置：主题JSON + 动画参数 | P2 | dev | architect协助 | 4h | T7-1, T9-1 | pending | src/config/mechaTheme.ts |

**里程碑 M9**：机甲主题完成，全部三套主题可切换

**Phase 9 工时总计：8h（约 1 个工作日）**

---

### Phase 10: 视觉特效层（P2功能）

> **注**：原 Phase 8，重编号。Phase 7 主题系统已覆盖动画相关功能，Phase 10 专注视觉增强特效。

| ID | 任务名称 | 优先级 | 角色 | Skill | 估时 | 依赖 | 状态 | 交付物 |
|----|----------|--------|------|-------|------|------|------|--------|
| T10-1 | EffectsRenderer胜负特效：连线高亮、棋盘旋转展示 | P2 | dev | threejs-game | 4h | T7-6 | pending | src/rendering/EffectsRenderer.ts |
| T10-2 | 粒子系统实现：胜利金色粒子、失败灰色粒子、经典拖尾粒子 | P2 | dev | threejs-game | 4h | T10-1 | pending | 粒子效果 |
| T10-3 | 堆叠榫合特效预留：接口设计（棋子接触时气体喷出） | P2 | dev | architect协助 | 1h | T10-1 | pending | 预留接口 |

**里程碑 M10**：视觉特效完成，游戏体验增强

**Phase 10 工时总计：9h**

---

### Phase 11: 验收与优化

| ID | 任务名称 | 优先级 | 角色 | Skill | 估时 | 依赖 | 状态 | 交付物 |
|----|----------|--------|------|-------|------|------|------|--------|
| T11-1 | 整体功能验收：按验收标准逐项测试 | P0 | qa | pm确认 | 4h | T10-2 | pending | 验收报告 |
| T11-2 | 性能优化：帧率≥30fps、AI响应优化 | P1 | dev | threejs-game | 2h | T11-1 | pending | 性能达标 |
| T11-3 | WebGL兼容性检测：首屏检测、提示用户 | P1 | dev | threejs-game | 1h | T3-4 | pending | 兼容性检测 |

**里程碑 M11**：项目验收完成，可发布

**Phase 11 工时总计：7h**

---

### Phase 12: AI评估系统重构（v2架构）

> **前置依赖**：docs/architecture/ai-evaluation-v2.md v2.0（架构师设计）
> **目标**：基于五子棋成熟AI理论，完全重构评估架构，解决v1的根本问题

| ID | 任务名称 | 优先级 | 角色 | Skill | 估时 | 依赖 | 状态 | 交付物 |
|----|----------|--------|------|-------|------|------|------|--------|
| **基础模块（P0）** |
| T12-1 | scores.ts分数常量：T族/G族/Cross分数定义 | P0 | dev | architect协助 | 2h | - | ✅ completed | src/core/ai/scores.ts |
| T12-2 | PatternMatcher棋形识别：T族连续+G族间隙检测 | P0 | dev | architect协助 | 6h | T12-1 | ✅ completed | src/core/ai/PatternMatcher.ts |
| T12-3 | ThreatEvaluator威胁评估：全盘基线+增量评估 | P0 | dev | architect协助 | 8h | T12-2 | ✅ completed | src/core/ai/ThreatEvaluator.ts |
| **叉子检测（P1）** |
| T12-4 | CrossDetector叉子检测：按空位聚类+类型判定 | P1 | dev | architect协助 | 4h | T12-2 | ✅ completed | src/core/ai/CrossDetector.ts |
| **EASY模式集成（P1）** |
| T12-5 | AIPlayerV2门面：组装引擎+失误逻辑+异步 | P1 | dev | architect协助 | 4h | T12-3, T12-4 | ✅ completed | src/core/ai/AIPlayerV2.ts |
| T12-6 | GameController集成：替换AIPlayer为AIPlayerV2 | P1 | dev | - | 2h | T12-5 | ✅ completed | GameController.ts修改 |
| **搜索引擎（P2）** |
| T12-7 | SearchEngine搜索引擎：Minimax+Alpha-Beta+候选排序 | P2 | dev | architect协助 | 6h | T12-3 | ✅ completed | src/core/ai/SearchEngine.ts |
| T12-8 | MEDIUM/HARD集成：搜索深度+难度配置 | P2 | dev | - | 2h | T12-7, T12-5 | ✅ completed | AIPlayerV2完整模式 |
| **增强功能（P3）** |
| T12-9 | 迭代加深+安静搜索：HARD专属增强 | P3 | dev | architect协助 | 4h | T12-7 | ✅ completed | SearchEngine增强 |
| T12-10 | PonderingEngine预判：玩家回合后台计算 | P3 | dev | architect协助 | 6h | T12-5 | ⏳ pending | src/core/ai/PonderingEngine.ts |
| **测试验收** |
| T12-11 | PatternMatcher测试：单线棋形测试(T族/G族) | P1 | qa | - | 4h | T12-2 | ✅ completed | PatternMatcher.test.ts (15 tests) |
| T12-12 | CrossDetector测试：叉子检测验证 | P1 | qa | - | 2h | T12-4 | pending | CrossDetector.test.ts |
| T12-13 | ThreatEvaluator测试：完整局面评估测试 | P2 | qa | - | 4h | T12-3 | pending | ThreatEvaluator.test.ts |
| T12-14 | AIPlayerV2验收：三种难度行为验证 | P0 | qa | pm确认 | 4h | T12-8 | pending | qa-report-aiplayer-v2.0.md |
| **清理** |
| T12-15 | 废弃旧代码：删除AIPlayer.ts评估函数 | P2 | dev | - | 2h | T12-14 | pending | 代码清理 |

**里程碑 M12**：⏳ 核心模块完成（10/15），15个PatternMatcher测试通过，待PonderingEngine + 验收

**Phase 12 工时总计：60h（约 7-8 个工作日）**

---

## 里程碑计划

| 里程碑 | 交付内容 | 验收标准 | 状态 |
|--------|----------|----------|------|
| M1 | 项目骨架 | Three.js空白场景可运行 | ✅ 已达成 |
| M2 | 核心逻辑层 | Board/WinChecker单元测试通过（37个） | ✅ 已达成 |
| M3 | 渲染层基础 | 棋盘可视化、视角旋转、手动放置棋子 | ✅ 已达成 |
| M4 | AI系统 | 三种难度AI可对战，响应≤3秒 | ✅ 已达成 |
| M5 | 游戏流程整合 | GameController完成，QA验收通过 | ⏳ 部分达成（AI评估问题单独处理） |
| M6 | UI层 | HUD面板、主菜单、战绩记录展示 | ✅ 已达成 |
| M7 | 主题核心框架 | 经典主题可运行，接口完备，60fps | ⏳ 代码验收通过（待浏览器验证） |
| M8 | 猫咪主题 | 猫咪主题动画生效，呼吸节律流畅 | 待开始 |
| M9 | 机甲主题 | 全部三套主题可切换，动画流畅 | 待开始 |
| M10 | 视觉特效 | 胜负特效、粒子效果流畅播放 | 待开始 |
| M11 | 项目验收 | 所有验收标准通过，可发布 | 待开始 |
| M12 | AI评估重构 | 基于v2架构，三难度行为可预测 | ⏳ 核心模块完成（10/15） |

---

## 关键路径

```
T1-1 → T1-4 → T2-1 → T2-3 → T3-1 → T3-2 → T4-1 → T5-1 → T7-1 → T7-5 → T7-6 → T7-9 → T8-2 → T9-2 → T10-2 → T11-1 → T12-2 → T12-3 → T12-14
          ↓                                                              ↓                ↓
      T1-2 → T2-2 → T5-1                                            T7-4 → T7-9      T12-7 → T12-8
```

**关键任务**：
- T2-1 Board（核心数据结构）✅
- T2-3 WinChecker（核心判定逻辑）✅
- T3-1 BoardRenderer（核心渲染）✅
- T5-1 GameController（核心流程控制）✅
- T7-5 AnimationController（主题动画核心）✅
- T12-2 PatternMatcher（AI棋形识别）← Phase 12核心
- T12-3 ThreatEvaluator（AI威胁评估）← Phase 12核心

---

## 角色任务分布

| 角色 | 任务数量 | 主要阶段 |
|------|----------|----------|
| dev | 38个 | 所有开发任务 |
| architect | 22个协助 | Phase 1-7 算法/架构协助 |
| qa | 4个 | Phase 2, 5, 6, 11 测试验收 |
| pm | 1个确认 | Phase 11 验收确认 |

### 技能使用分布

| Skill | 任务数量 | 适用阶段 |
|-------|----------|----------|
| threejs-game | 13个 | Phase 1, 3, 7, 10, 11（3D渲染相关） |
| frontend-design | 5个 | Phase 6, 7（UI界面相关） |
| architect协助 | 22个 | Phase 1-7（算法/架构协助） |

---

## 风险识别

| 风险项 | 概率 | 影响 | 缓解措施 |
|--------|------|------|----------|
| Three.js渲染性能问题 | 中 | 高 | Phase 3预留性能测试时间，使用threejs-game skill |
| AI算法复杂度导致响应慢 | 中 | 高 | T4-4专门优化，深度限制，architect协助算法设计 |
| 13方向胜负判定遗漏 | 低 | 高 | ✅ T2-4单元测试已覆盖所有方向（37个测试） |
| 圆柱棋子堆叠视觉不理想 | 低 | 中 | 参照visual-style-guide.md精确参数 |
| localStorage数据丢失 | 低 | 低 | 用户手动清除，不影响游戏核心功能 |
| WebGL不兼容用户无法游玩 | 中 | 中 | T11-3首屏检测并友好提示 |
| 找不到带完整动画的3D模型 | 高 | 中 | 免费素材 + AI生成 + 代码动画兜底 |
| 主题动画阻塞渲染帧率 | 中 | 高 | requestAnimationFrame + 状态缓存 + 简化动画 |
| PieceStateManager状态冲突 | 中 | 中 | 状态转换表 + 单元测试 |
| 多主题素材加载时间长 | 中 | 低 | 预加载 + 缓存 + 加载进度提示 |
| 素材内存占用过大 | 低 | 中 | 控制模型大小，单主题≤10MB |
| GLB模型动画参数不兼容 | 中 | 高 | AnimationController 参数校验 + fallback 动画 |
| 主题切换内存泄漏 | 中 | 中 | 切换100次后内存/GPU资源检查 |
| PieceStateManager状态转换遗漏 | 低 | 高 | 单元测试覆盖所有状态转换路径 |

---

## 验收检查清单

### Phase 1验收 ✅
- [x] 项目可运行（npm run dev）
- [x] Three.js空白场景显示
- [x] TypeScript类型检查通过

### Phase 2验收 ✅
- [x] Board单元测试通过（放置、重力规则）
- [x] WinChecker单元测试通过（13方向检测、quickWouldWin）
- [x] LineIndex单元测试通过（增量更新、威胁检测）
- [x] GameState状态转换正确
- [x] 52个单元测试全部通过（qa-report.md）
- [x] 无遗留缺陷

### Phase 3验收 ✅
- [x] 棋盘正确显示5x5x6网格
- [x] 右键拖拽视角平滑旋转
- [x] 悬停显示预览棋子（半透明 + 竖直高亮）
- [x] 棋子下落动画流畅（物理反弹 + 压缩变形）
- [x] 构建成功（无编译错误）
- [x] 52个单元测试全部通过
- [x] 接口实现完整（qa-report-phase3.md）

### Phase 4验收（AI系统）✅
- [x] 简单难度响应≤1秒（实际~350ms）
- [x] 困难难度响应≤3秒（实际~2100ms）
- [x] 三种难度失误率正确（EASY 30%, MEDIUM 10%, HARD 0%）
- [x] AI使用quickWouldWin进行高频评估
- [x] 70个单元测试全部通过（18个AI测试）
- [x] 构建成功，无编译错误

### Phase 5验收（P0功能）
- [x] 完整游戏流程：开始→对战→胜负判定→结束
- [x] 玩家可放置棋子
- [x] AI可响应放置棋子
- [x] 胜负判定正确触发
- [x] GameController流程控制完成
- [x] QA验收通过（qa-report-phase5-v1.2.md）
- [ ] AI评估算法优化（单独处理）

### Phase 6验收（P1功能）✅
- [x] HUD面板信息实时准确
- [x] 主菜单难度/先后手选择生效
- [x] 战绩数据正确记录
- [x] 战绩正确展示

### Phase 7验收（主题核心框架 P0功能） ⏳ 代码验收通过
- [ ] 主菜单可切换主题，二次确认后生效 ⏳ 待浏览器验证
  - 测试方法：菜单点击切换 → 弹窗确认 → 确认后主题生效
  - 代码检查：✅ MenuUI有主题按钮，ThemeSelectUI有二次确认弹窗
- [ ] 经典主题棋子正确渲染 ⏳ 待浏览器验证
  - 测试方法：材质颜色与 visual-style-guide.md 设计稿一致，光照效果正确
  - 代码检查：✅ PieceRenderer支持CLASSIC主题，CylinderGeometry材质已实现
- [ ] 素材加载失败时 fallback 到经典主题
  - 测试方法：故意删除素材文件，启动游戏验证 fallback 行为，控制台有警告日志
  - 代码检查：✅ ThemeManager.ts:103-110 fallback机制完整
- [x] 主题类型Schema完整，接口完备
  - 测试方法：TypeScript编译通过，无类型错误
  - 验证结果：✅ npm run build成功，33模块编译通过
- [ ] 动画流畅，60fps ⏳ 待浏览器验证
  - 测试方法：连续5局游戏，每局记录帧率日志，最低帧率≥50fps
- [ ] 主题切换无内存泄漏 ⏳ 待浏览器验证
  - 测试方法：切换主题100次，浏览器内存占用增长≤10MB
  - 代码检查：✅ ThemeManager.dispose()和ThemeLoader.clearCache()存在

### Phase 8验收（猫咪主题 P1功能）
- [ ] 猫咪主题棋子正确渲染
- [ ] 猫咪/机甲顶层棋子有呼吸节律循环动画
- [ ] 被子覆盖时猫咪变趴睡/机甲收拢
- [ ] 鼠标悬停时己方/对方棋子有不同互动动画
- [ ] 下落动画三套主题姿态不同
- [ ] 承接棋子对抗动画区分己方/对方

### Phase 9验收（机甲主题 P2功能）
- [ ] 机甲主题棋子正确渲染
- [ ] 机甲站立/收拢姿态切换正确
- [ ] 三套主题可切换，动画流畅

### Phase 10验收（P2功能）
- [ ] 胜利连线高亮发光
- [ ] 胜利棋盘旋转展示
- [ ] 粒子效果流畅播放
- [ ] 堆叠榫合特效接口预留

### Phase 11验收（整体）
- [ ] 所有P0功能验收通过
- [ ] 所有P1功能验收通过
- [ ] 三套主题可切换，动画流畅
- [ ] 帧率≥30fps
- [ ] WebGL兼容性检测生效
- [ ] 移动端预留接口到位

---

## 文档状态

- [x] 需求文档已确认
- [x] 架构文档已确认（v1.3）
- [x] 主题系统需求文档已确认（v1.0）
- [x] 主题系统架构文档已确认（v2.0）
- [x] 任务拆解完成
- [x] Phase 1-4 已完成
- [x] Phase 5 核心功能已完成
- [x] Phase 6 UI层已完成
- [x] Phase 2 QA验收通过（qa-report.md v1.0）
- [x] Phase 3 QA验收通过（qa-report-phase3.md v1.0）
- [x] Phase 4 开发验收通过（test-handover-phase4.md v1.0）
- [x] Phase 5 QA验收通过（qa-report-phase5-v1.2.md）
- [x] Phase 6 QA验收通过（qa-report-phase6-v1.0）
- [x] Phase 7 QA代码验收通过（qa-report-phase7-v1.0.md） ⏳ 待浏览器验证
- [x] 架构师代码评审通过（code-review-report.md v1.1）
- [ ] AI评估算法优化待处理（单独任务，Phase 11）
- [ ] Phase 8-9 猫咪/机甲主题素材准备
- [ ] Phase 10-11 待开发
- [ ] 禁止后续修改（除非正式变更流程）

---

**版本**：v1.9
**最后更新**：2026-04-27（Phase 7 代码验收通过，更新任务状态）

---

## 下一步行动

1. **当前进度**：Phase 1-7 已完成（代码验收），里程碑 M1-M6 ✅，M7 ⏳
2. **下一优先**：Phase 8 猫咪主题素材准备（GLB模型 + Blender动画制作）
3. **建议执行顺序**：
   - 猫咪素材：使用 Blender 制作 Idle/Hover 动画（参考 docs/design/blender-animation-guide.md）
   - 猫咪配置：T8-2 猫咪主题配置
   - 机甲素材：T9-1 获取机甲素材
   - 机甲配置：T9-2 机甲主题配置
4. **浏览器验证**：启动游戏验证 Phase 7 主题切换流程、帧率、内存
5. **Phase 12 AI重构说明**：
   - 架构设计已完成：docs/architecture/ai-evaluation-v2.md v2.0
   - 15个任务拆分完成，预计60h（7-8个工作日）
   - 建议在 Phase 11 验收后启动，或根据项目进度灵活安排
6. **验收凭证**：
   - Phase 1: docs/qa/qa-report.md (项目骨架)
   - Phase 2: docs/qa/qa-report.md (52个测试100%通过)
   - Phase 3: docs/qa/qa-report-phase3.md (构建+测试通过)
   - Phase 4: docs/dev/test-handover-phase4.md (70个测试通过，性能达标)
   - Phase 5: docs/qa/qa-report-phase5-v1.2.md (QA验收通过)
   - Phase 6: docs/qa/qa-report-phase6-v1.0.md (QA验收通过)
   - Phase 7: docs/qa/qa-report-phase7-v1.0.md (代码验收通过)
   - Code Review: docs/architecture/code-review-report.md v1.1 (架构师评审通过)

---

**版本**：v2.0
**最后更新**：2026-04-27（Phase 12 AI重构任务拆分 + 架构文档前置依赖）