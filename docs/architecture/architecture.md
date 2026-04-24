# 系统架构设计文档 v1.2

## 基本信息
- **项目名称**：3D四子棋（Connect Four 3D）
- **架构师**：Architect Agent
- **文档版本**：v1.2
- **创建日期**：2026-04-22
- **更新日期**：2026-04-23
- **交接目标**：💻 Dev Agent
- **前置依赖**：requirements.md v1.4
- **视觉设计参考**：docs/design/visual-style-guide.md

---

## 技术选型

### 技术栈总览

| 层级 | 技术 | 版本 | 选择理由 |
|------|------|------|----------|
| 前端框架 | TypeScript | 5.x | 类型安全，提升代码质量和可维护性 |
| 3D引擎 | Three.js | r160+ | WebGL封装完善，社区活跃，适合3D游戏开发 |
| 构建工具 | Vite | 5.x | 快速冷启动，HMR响应迅速，适合Web游戏开发 |
| 状态管理 | 状态模式（自定义） | - | 游戏状态明确，使用状态机模式管理游戏流程 |
| 数据存储 | localStorage | - | 本地战绩记录，无需后端，浏览器原生支持 |
| 样式方案 | CSS + CSS Variables | - | 简约风格，CSS Variables便于主题扩展 |

### ADR-001：技术选型决策

**决策**：选择 Three.js + TypeScript + Vite 组合

**理由**：
1. Three.js 是Web端3D开发的主流选择，文档完善，社区活跃
2. TypeScript 提供类型检查，减少运行时错误，适合复杂游戏逻辑
3. Vite 开发体验优秀，HMR快速，适合频繁迭代的游戏开发
4. 无后端需求（当前版本），纯前端架构降低部署复杂度

**替代方案**：
- Babylon.js：功能更强大但学习曲线陡峭，对休闲游戏过度
- React + Three.js：引入额外复杂度，游戏逻辑更适合直接状态管理

---

## 系统架构图

### 整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Browser                                    │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Presentation Layer                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │  GameUI     │  │  MenuUI     │  │  StatsUI            │  │   │
│  │  │ (HUD面板)   │  │ (主菜单)    │  │ (战绩展示)          │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓ ↑                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Game Logic Layer                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │ GameState   │  │ GameController│ │ WinChecker        │  │   │
│  │  │ (状态机)    │  │ (流程控制)   │  │ (胜负判定)         │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│  │  ┌─────────────┐  ┌─────────────────────────────────────┐  │   │
│  │  │ AIPlayer    │  │ Board (棋盘逻辑)                    │  │   │
│  │  │ (AI决策)    │  │ (三维数组 + 重力规则)               │  │   │
│  │  └─────────────┘  └─────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓ ↑                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Rendering Layer                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │ BoardRenderer│ │ PieceRenderer│ │ EffectsRenderer    │  │   │
│  │  │ (棋盘渲染)  │  │ (棋子渲染)  │  │ (特效渲染)         │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│  │  ┌─────────────┐  ┌─────────────────────────────────────┐  │   │
│  │  │ CameraCtrl  │  │ Three.js Scene                      │  │   │
│  │  │ (视角控制)  │  │ (WebGL渲染引擎)                     │  │   │
│  │  └─────────────┘  └─────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓ ↑                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Data Layer                                │   │
│  │  ┌─────────────┐  ┌─────────────────────────────────────┐  │   │
│  │  │ StatsStore  │  │ localStorage                        │  │   │
│  │  │ (战绩存储)  │  │ (持久化存储)                        │  │   │
│  │  └─────────────┘  └─────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 模块交互流程

```
用户操作 → InputHandler → GameController → GameState变更
                ↓                           ↓
         CameraCtrl(右键)            Board更新/AI计算
                ↓                           ↓
         视角旋转                   WinChecker检测
                                          ↓
                                   结果 → EffectsRenderer
                                          ↓
                                   StatsStore更新
```

---

## 模块设计

### 模块 1：GameState（游戏状态机）

#### 1. 背景与必要性
- **为什么需要**：游戏有明确的阶段（菜单、选难度、游戏中、结束），需要状态机管理流程转换
- **如果没有**：状态混乱，难以控制游戏流程，用户体验混乱

#### 2. 工作原理
- **核心机制**：有限状态机（FSM），定义状态和转换规则
- **数据流向**：用户事件 → 状态转换 → 触发对应行为
- **关键逻辑**：
  ```
  状态列表：
  - MENU: 主菜单
  - SELECT_DIFFICULTY: 选择难度
  - SELECT_ORDER: 选择先后手
  - PLAYING: 游戏进行中
  - PLAYER_TURN: 玩家回合
  - AI_TURN: AI回合（AI思考中）
  - GAME_END: 游戏结束（胜利/失败/平局）

  状态转换：
  MENU → SELECT_DIFFICULTY → SELECT_ORDER → PLAYING
  PLAYING → PLAYER_TURN ↔ AI_TURN
  PLAYER_TURN/AI_TURN → GAME_END
  GAME_END → SELECT_DIFFICULTY 或 MENU
  ```

#### 3. 服务于整体项目
- **位置**：Game Logic Layer 核心
- **关系**：被 GameController 调用，触发 Board、AIPlayer、UI 更新
- **贡献**：确保游戏流程正确，是游戏逻辑的"大脑"

#### 4. 技术规格
- **职责**：管理游戏状态转换，触发状态变更回调
- **输入**：用户操作事件、游戏事件（胜负判定）
- **输出**：状态变更通知、当前状态查询
- **依赖**：无
- **接口定义**：
  ```typescript
  interface IGameState {
    current: GameStateType;
    transition(event: GameEvent): void;
    onStateChange(callback: (state: GameStateType) => void): void;
  }

  type GameStateType = 'MENU' | 'SELECT_DIFFICULTY' | 'SELECT_ORDER' | 'PLAYING' | 'PLAYER_TURN' | 'AI_TURN' | 'GAME_END';

  type GameEvent = 'START' | 'SELECTED_DIFFICULTY' | 'SELECTED_ORDER' | 'PIECE_PLACED' | 'AI_DONE' | 'WIN_DETECTED' | 'DRAW_DETECTED' | 'RESTART' | 'BACK_TO_MENU';
  ```

---

### 模块 2：Board（棋盘逻辑）

#### 1. 背景与必要性
- **为什么需要**：核心游戏数据结构，存储棋盘状态和棋子位置
- **如果没有**：无法进行游戏，没有棋盘数据

#### 2. 工作原理
- **核心机制**：三维数组存储棋盘状态，重力规则计算落点
- **数据流向**：
  ```
  输入：(x, y) 点击位置
  处理：计算 z = findLowestEmptyZ(x, y)（重力规则）
  输出：(x, y, z) 实际落点位置
  ```
- **关键算法**：
  ```typescript
  // 重力规则：找到该列最底层空位
  findLowestEmptyZ(x: number, y: number): number | null {
    for (let z = 0; z < this.height; z++) {
      if (this.board[x][y][z] === EMPTY) {
        return z;  // 返回最底层空位
      }
    }
    return null;  // 该列已满
  }

  // 检测是否可放置
  canPlace(x: number, y: number): boolean {
    return findLowestEmptyZ(x, y) !== null;
  }

  // 放置棋子
  placePiece(x: number, y: number, player: Player): Position | null {
    const z = findLowestEmptyZ(x, y);
    if (z === null) return null;
    this.board[x][y][z] = player;
    return { x, y, z };
  }
  ```

#### 3. 服务于整体项目
- **位置**：Game Logic Layer，核心数据模型
- **关系**：被 GameController 调用放置棋子，被 WinChecker 调用检测胜负
- **贡献**：提供棋盘数据结构和核心操作

#### 4. 技术规格
- **职责**：存储棋盘状态，计算落点位置，提供棋盘操作
- **输入**：棋子放置请求 (x, y)
- **输出**：实际落点位置 (x, y, z)，棋盘状态查询
- **依赖**：无
- **接口定义**：
  ```typescript
  interface IBoard {
    // 配置
    width: number;   // 6
    height: number;  // 6 或 8（可扩展）

    // 数据
    board: Player[][][];  // 三维数组，Player = 'BLACK' | 'WHITE' | 'EMPTY'

    // 操作
    canPlace(x: number, y: number): boolean;
    placePiece(x: number, y: number, player: Player): Position | null;
    getPiece(x: number, y: number, z: number): Player;
    isFull(): boolean;
    clear(): void;

    // 配置扩展
    setHeight(h: number): void;  // 支持扩展至8层
  }

  type Player = 'BLACK' | 'WHITE' | 'EMPTY';
  type Position = { x: number; y: number; z: number };
  ```

---

### 模块 3：WinChecker（胜负判定）

#### 1. 背景与必要性
- **为什么需要**：检测游戏胜负，是游戏目标的核心逻辑
- **如果没有**：无法判断游戏结束，游戏无法正常进行

#### 2. 工作原理
- **核心机制**：遍历13个方向向量，检测4子连线
- **数据流向**：
  ```
  输入：最后放置的棋子位置 (x, y, z)
  处理：以该位置为中心，向13个方向检测
  输出：是否胜利，获胜连线位置列表
  ```
- **关键算法**：
  ```typescript
  // 13个方向向量
  const DIRECTIONS: Vector3[] = [
    // 水平（同层）
    { x: 1, y: 0, z: 0 },   // 横线
    { x: 0, y: 1, z: 0 },   // 竖线
    { x: 1, y: 1, z: 0 },   // XY对角线
    { x: 1, y: -1, z: 0 },  // XY反对角线
    // 垂直
    { x: 0, y: 0, z: 1 },   // 垂直线
    // 跨层斜线(XZ)
    { x: 1, y: 0, z: 1 },
    { x: -1, y: 0, z: 1 },
    { x: 1, y: 0, z: -1 },
    { x: -1, y: 0, z: -1 },
    // 跨层斜线(YZ)
    { x: 0, y: 1, z: 1 },
    { x: 0, y: -1, z: 1 },
    { x: 0, y: 1, z: -1 },
    { x: 0, y: -1, z: -1 },
    // 空间对角线
    { x: 1, y: 1, z: 1 },
    { x: -1, y: -1, z: 1 },
    { x: 1, y: -1, z: 1 },
    { x: -1, y: 1, z: 1 },
    { x: 1, y: 1, z: -1 },
    { x: -1, y: -1, z: -1 },
    { x: 1, y: -1, z: -1 },
    { x: -1, y: 1, z: -1 },
  ];

  // 检测胜利
  checkWin(x: number, y: number, z: number, player: Player): WinResult | null {
    for (const dir of DIRECTIONS) {
      const line = this.countLine(x, y, z, dir, player);
      if (line >= 4) {
        return {
          winner: player,
          linePositions: this.getLinePositions(x, y, z, dir, line)
        };
      }
    }
    return null;
  }

  // 计算某方向的连线数
  countLine(x: number, y: number, z: number, dir: Vector3, player: Player): number {
    let count = 1;  // 当前位置
    // 正方向
    for (let i = 1; i < 4; i++) {
      const pos = { x: x + dir.x * i, y: y + dir.y * i, z: z + dir.z * i };
      if (this.isValid(pos) && this.board.getPiece(pos.x, pos.y, pos.z) === player) {
        count++;
      } else break;
    }
    // 反方向
    for (let i = 1; i < 4; i++) {
      const pos = { x: x - dir.x * i, y: y - dir.y * i, z: z - dir.z * i };
      if (this.isValid(pos) && this.board.getPiece(pos.x, pos.y, pos.z) === player) {
        count++;
      } else break;
    }
    return count;
  }
  ```

#### 3. 服务于整体项目
- **位置**：Game Logic Layer
- **关系**：依赖 Board，被 GameController 调用
- **贡献**：实现游戏核心目标判定

#### 4. 技术规格
- **职责**：检测胜负、平局
- **输入**：最后放置位置、棋盘状态
- **输出**：胜利结果（获胜者+连线位置）或 null
- **依赖**：Board
- **接口定义**：
  ```typescript
  interface IWinChecker {
    checkWin(pos: Position, player: Player): WinResult | null;
    checkDraw(): boolean;
  }

  type WinResult = {
    winner: Player;
    linePositions: Position[];
  };
  ```

---

### 模块 4：AIPlayer（AI决策）

#### 1. 背景与必要性
- **为什么需要**：提供单人游戏体验，不同难度增加挑战性
- **如果没有**：只能多人对战，无法单人游玩

#### 2. 工作原理
- **核心机制**：博弈树搜索 + 随机失误率
- **数据流向**：
  ```
  输入：当前棋盘状态、难度配置
  处理：根据深度搜索评估最佳位置，可能随机选次优解
  输出：放置位置 (x, y)
  ```
- **关键算法**：
  ```typescript
  // AI决策
  decide(board: IBoard, difficulty: Difficulty): Position {
    const evaluations = this.evaluateAllMoves(board);

    // 根据难度和失误率选择
    if (this.shouldMake Mistake(difficulty)) {
      return this.selectRandomSuboptimal(evaluations);
    }
    return this.selectBest(evaluations);
  }

  // 失误率判定
  shouldMake Mistake(difficulty: Difficulty): boolean {
    const mistakeRates = { EASY: 0.3, MEDIUM: 0.1, HARD: 0 };
    return Math.random() < mistakeRates[difficulty];
  }

  // 评估所有可能的落点
  evaluateAllMoves(board: IBoard): Evaluation[] {
    const evaluations: Evaluation[] = [];
    for (let x = 0; x < board.width; x++) {
      for (let y = 0; y < board.width; y++) {
        if (board.canPlace(x, y)) {
          const score = this.minimax(x, y, board, this.depth);
          evaluations.push({ x, y, score });
        }
      }
    }
    return evaluations;
  }

  // Minimax算法（带深度限制）
  minimax(x: number, y: number, board: IBoard, depth: number): number {
    // 实现博弈树搜索
    // ...
  }

  // 简化评估函数（考虑威胁、机会）
  evaluatePosition(board: IBoard, pos: Position): number {
    // 检测我方能否获胜 → 高分
    // 检测对方能否获胜 → 阻挡得分
    // 检测连线潜力 → 中等分
    // 中心位置 → 略高分
  }
  ```

#### 3. 服务于整体项目
- **位置**：Game Logic Layer
- **关系**：依赖 Board，被 GameController 调用
- **贡献**：提供智能对手，实现单人游戏体验

#### 4. 技术规格
- **职责**：AI决策，返回落点位置
- **输入**：棋盘状态、难度配置
- **输出**：落点位置 (x, y)
- **依赖**：Board, WinChecker（用于评估）
- **接口定义**：
  ```typescript
  interface IAIPlayer {
    decide(board: IBoard): Promise<Position>;  // 异步，支持思考延迟
    setDifficulty(difficulty: Difficulty): void;
  }

  type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

  type AIConfig = {
    depth: number;      // 搜索深度
    mistakeRate: number; // 失误率
  };

  const AI_CONFIGS: Record<Difficulty, AIConfig> = {
    EASY: { depth: 1, mistakeRate: 0.3 },
    MEDIUM: { depth: 2, mistakeRate: 0.1 },
    HARD: { depth: 4, mistakeRate: 0 }
  };
  ```

---

### 模块 5：BoardRenderer（棋盘渲染）

#### 1. 背景与必要性
- **为什么需要**：将棋盘数据可视化，提供3D交互体验
- **如果没有**：游戏无法展示，用户无法操作

#### 2. 工作原理
- **核心机制**：Three.js 场景构建，响应式更新棋子
- **数据流向**：
  ```
  输入：Board 数据变更
  处理：创建/更新 3D 对象（棋盘格子、棋子）
  输出：Three.js Scene 渲染
  ```
- **关键设计**：
  ```typescript
  // 棋盘渲染结构
  - BoardBase: 半透明网格底座
  - GridLines: 线框显示格子边界
  - ColumnHighlighters: 鼠标悬停高亮可放置列（底座格子或棋子顶部）
  - Pieces[]: 棋子对象数组（黑/白圆柱体）
  - PreviewPiece: 半透明预览棋子（悬停时显示）

  // 棋子材质（乐高式圆柱，塑料质感）
  - 形状：CylinderGeometry，直径=高度，稳定堆叠
  - 黑棋：#1a1a2e，metalness=0.0，roughness=0.4
  - 白棋：#f0f0f5，metalness=0.0，roughness=0.4

  // 棋子下落动画
  - 起点：棋盘上方15单位高度
  - 目标：该列最底层可用位置
  - 动画：500ms，带弹跳缓动效果

  // 悬停高亮规则
  - 鼠标悬停底座格子 → 显示半透明预览棋子
  - 鼠标悬停棋子顶部 → 显示半透明预览棋子
  - 预览棋子opacity: 0.4

  // 简约风格（参见 docs/design/visual-style-guide.md）
  - 低饱和度颜色
  - 简洁几何形状
  - 清晰边缘
  ```

#### 3. 服务于整体项目
- **位置**：Rendering Layer
- **关系**：依赖 Board 数据，被 GameController 触发更新
- **贡献**：提供视觉呈现

#### 4. 技术规格
- **职责**：渲染棋盘和棋子
- **输入**：Board 状态变更
- **输出**：Three.js 3D场景
- **依赖**：Three.js Scene, Board
- **接口定义**：
  ```typescript
  interface IBoardRenderer {
    init(scene: THREE.Scene): void;
    updatePiece(pos: Position, player: Player): void;
    highlightColumn(x: number, y: number): void;  // 悬停高亮
    clearHighlights(): void;
    showPreviewPiece(x: number, y: number, player: Player): void;  // 半透明预览
    showWinLine(positions: Position[]): void;  // 胜利连线高亮
  }

  // 棋子配置
  const PIECE_CONFIG = {
    radius: cellSize * 0.4,      // 圆柱半径
    height: cellSize * 0.8,      // 圆柱高度（直径=高度）
    dropStartHeight: boardHeight + 15,  // 下落起点：上方15单位
    dropDuration: 500,           // 下落动画时长
    previewOpacity: 0.4          // 预览棋子透明度
  };
  ```

---

### 模块 6：CameraController（视角控制）

#### 1. 背景与必要性
- **为什么需要**：用户需要从不同角度观察棋盘，判断落点位置
- **如果没有**：视角固定，难以观察三维空间

#### 2. 工作原理
- **核心机制**：右键拖拽旋转，OrbitControls 风格控制
- **数据流向**：
  ```
  输入：鼠标右键拖拽事件
  处理：计算旋转角度，更新相机位置
  输出：相机视角变换
  ```
- **关键设计**：
  ```typescript
  // 视角控制
  - 右键按住：进入旋转模式
  - 拖拽移动：围绕棋盘中心旋转
  - 松开：固定当前视角
  - 限制：限制最大/最小仰角，避免视角翻转

  // 移动端预留接口
  - touchRotate(pinch gesture): void  // 双指旋转
  ```

#### 3. 服务于整体项目
- **位置**：Rendering Layer
- **关系**：独立模块，监听用户输入
- **贡献**：提供视角控制体验

#### 4. 技术规格
- **职责**：视角旋转控制
- **输入**：鼠标事件（右键拖拽）
- **输出**：相机变换
- **依赖**：Three.js Camera
- **接口定义**：
  ```typescript
  interface ICameraController {
    startRotate(startPos: Vector2): void;
    updateRotate(currentPos: Vector2): void;
    endRotate(): void;

    // 移动端预留
    onTouchRotate(delta: number): void;
  }
  ```

---

### 模块 7：EffectsRenderer（特效渲染）

#### 1. 背景与必要性
- **为什么需要**：胜负反馈，增强游戏体验和成就感
- **如果没有**：游戏结束平淡，缺乏反馈

#### 2. 工作原理
- **核心机制**：粒子系统 + 动画序列
- **数据流向**：
  ```
  输入：胜负结果
  处理：播放特效序列（连线高亮 → 旋转 → 粒子 → 文字）
  输出：视觉效果
  ```
- **关键设计**：
  ```typescript
  // 特效序列
  Sequence:
  1. WinLineHighlight (0.5s) - 获胜连线发光高亮
     - 胜利：emissive=#4ade80（绿色）
     - 失败：emissive=#ff6b4a（红色）
  2. BoardRotation (1.5s) - 棋盘自动旋转展示连线（胜利时）
  3. ParticleExplosion (1s) - 粒子爆炸效果
     - 胜利：金色粒子#fbbf24，向外扩散
     - 失败：灰色粒子#55556a，向下飘落
  4. ResultText (0.5s) - 显示 "胜利！" 或 "失败..."
  5. ShowButtons - 弹出"再来一局" / "返回主菜单"

  // 粒子配置
  ParticleConfig:
  - 数量：200-500
  - 速度：向外扩散（胜利）/ 向下飘落（失败）
  - 生命周期：1-2秒
  - 颜色：胜利金色/失败灰色

  // 堆叠榫合特效（待实现）
  StackEffect:
  - 触发时机：棋子下落接触其他棋子瞬间
  - 效果：气体喷出粒子
  - 状态：预留接口，后续版本实现
  ```

#### 3. 服务于整体项目
- **位置**：Rendering Layer
- **关系**：被 GameController 触发，预留被 BoardRenderer 触发（堆叠特效）
- **贡献**：增强胜负反馈体验

#### 4. 技术规格
- **职责**：播放胜负特效、堆叠榫合特效（预留）
- **输入**：胜负结果、连线位置、堆叠位置（预留）
- **输出**：视觉效果动画
- **依赖**：Three.js Scene, BoardRenderer
- **接口定义**：
  ```typescript
  interface IEffectsRenderer {
    // 胜负特效
    playWinEffect(winLine: Position[]): Promise<void>;
    playLoseEffect(): Promise<void>;
    playDrawEffect(): Promise<void>;
    clear(): void;

    // 堆叠榫合特效（预留，后续实现）
    playStackEffect(pos: Position): void;  // 棋子落下接触时气体喷出
  }
  ```

---

### 模块 8：GameUI（游戏HUD）

#### 1. 背景与必要性
- **为什么需要**：显示游戏状态信息，帮助用户了解当前局面
- **如果没有**：用户无法知道当前回合、步数等信息

#### 2. 工作原理
- **核心机制**：HTML/CSS HUD面板，响应游戏状态更新
- **数据流向**：
  ```
  输入：GameState 变更
  处理：更新 HUD 显示内容
  输出：UI面板内容更新
  ```
- **关键设计**：
  ```typescript
  // HUD内容
  - 当前回合："黑方回合" / "白方回合"
  - AI思考提示："AI思考中..."（动态显示）
  - 已用步数："步数: 12"
  - 当前难度："难度: 中等"
  - 本局用时："用时: 05:32"
  - 单步用时："本步: 00:08"

  // 战绩展示（点击展开）
  - 简单难度：胜X场 负X场 胜率XX%
  - 中等难度：胜X场 负X场 胜率XX%
  - 困难难度：胜X场 负X场 胜率XX%
  - 总计：胜X场 负X场 胜率XX%

  // 响应式更新
  - 回合切换：立即更新
  - 时间：每秒更新
  - 战绩：游戏结束更新
  ```

#### 3. 服务于整体项目
- **位置**：Presentation Layer
- **关系**：监听 GameState，读取 StatsStore
- **贡献**：提供游戏信息展示

#### 4. 技术规格
- **职责**：显示游戏HUD信息
- **输入**：GameState, Timer, StatsStore
- **输出**：UI渲染更新
- **依赖**：GameState, StatsStore
- **接口定义**：
  ```typescript
  interface IGameUI {
    updateTurn(player: Player): void;
    updateSteps(steps: number): void;
    updateDifficulty(difficulty: Difficulty): void;
    updateTime(gameTime: number, stepTime: number): void;
    showAIThinking(): void;
    hideAIThinking(): void;
    showStats(stats: GameStats): void;
  }

  type GameStats = {
    easy: { wins: number; losses: number; rate: number };
    medium: { wins: number; losses: number; rate: number };
    hard: { wins: number; losses: number; rate: number };
    total: { wins: number; losses: number; rate: number };
  };
  ```

---

### 模块 9：GameController（游戏流程控制）

#### 1. 背景与必要性
- **为什么需要**：协调各模块工作，管理游戏流程
- **如果没有**：模块独立工作，缺乏协调，游戏流程混乱

#### 2. 工作原理
- **核心机制**：事件驱动，协调状态变更和模块调用
- **数据流向**：
  ```
  用户操作 → Input → Controller → GameState更新
                    ↓
              Board操作 → WinChecker检测
                    ↓
              结果 → Effects/UI更新 → StatsStore更新
  ```
- **关键流程**：
  ```typescript
  // 游戏启动流程
  startGame(difficulty: Difficulty, order: Order): void {
    this.state.transition('SELECTED_ORDER');
    this.board.clear();
    this.renderer.clear();

    if (order === 'RANDOM') {
      order = Math.random() > 0.5 ? 'FIRST' : 'SECOND';
    }

    this.currentPlayer = order === 'FIRST' ? 'BLACK' : 'WHITE';
    this.state.transition('PLAYING');

    if (this.currentPlayer === 'WHITE') {
      this.startAITurn();
    } else {
      this.state.transition('PLAYER_TURN');
    }
  }

  // 玩家落子流程
  onPlayerPlace(x: number, y: number): void {
    if (this.state.current !== 'PLAYER_TURN') return;

    const pos = this.board.placePiece(x, y, this.currentPlayer);
    if (!pos) return;  // 该列已满

    this.renderer.updatePiece(pos, this.currentPlayer);
    this.steps++;
    this.ui.updateSteps(this.steps);

    const winResult = this.winChecker.checkWin(pos, this.currentPlayer);
    if (winResult) {
      this.endGame(winResult);
      return;
    }

    if (this.board.isFull()) {
      this.endDraw();
      return;
    }

    this.startAITurn();
  }

  // AI回合流程
  async startAITurn(): void {
    this.state.transition('AI_TURN');
    this.ui.showAIThinking();

    const pos = await this.ai.decide(this.board);
    const actualPos = this.board.placePiece(pos.x, pos.y, 'WHITE');

    this.renderer.updatePiece(actualPos, 'WHITE');
    this.ui.hideAIThinking();
    this.steps++;

    const winResult = this.winChecker.checkWin(actualPos, 'WHITE');
    if (winResult) {
      this.endGame(winResult);
      return;
    }

    if (this.board.isFull()) {
      this.endDraw();
      return;
    }

    this.state.transition('PLAYER_TURN');
    this.currentPlayer = 'BLACK';
    this.ui.updateTurn('BLACK');
  }

  // 游戏结束流程
  endGame(winResult: WinResult): void {
    const isPlayerWin = winResult.winner === 'BLACK';

    this.state.transition('GAME_END');
    this.effects.playWinEffect(winResult.linePositions);

    // 更新战绩
    this.stats.update(this.difficulty, isPlayerWin ? 'WIN' : 'LOSS');

    // 显示结果按钮
    this.ui.showResultButtons();
  }

  endDraw(): void {
    this.state.transition('GAME_END');
    this.effects.playDrawEffect();
    this.stats.update(this.difficulty, 'DRAW');
    this.ui.showResultButtons();
  }
  ```

#### 3. 服务于整体项目
- **位置**：Game Logic Layer 核心，协调者
- **关系**：协调所有模块
- **贡献**：确保游戏流程正确执行

#### 4. 技术规格
- **职责**：协调游戏流程，处理用户输入
- **输入**：用户操作事件、配置
- **输出**：调用各模块执行操作
- **依赖**：GameState, Board, AIPlayer, WinChecker, BoardRenderer, EffectsRenderer, GameUI, StatsStore
- **接口定义**：
  ```typescript
  interface IGameController {
    startGame(difficulty: Difficulty, order: Order): void;
    onPlayerPlace(x: number, y: number): void;
    restart(): void;
    backToMenu(): void;
  }

  type Order = 'FIRST' | 'SECOND' | 'RANDOM';
  ```

---

### 模块 10：StatsStore（战绩存储）

#### 1. 背景与必要性
- **为什么需要**：记录玩家战绩，提供成就感反馈
- **如果没有**：玩家无法了解自己的游戏水平

#### 2. 工作原理
- **核心机制**：localStorage 持久化存储
- **数据流向**：
  ```
  输入：游戏结束事件
  处理：更新统计数据，保存到 localStorage
  输出：战绩查询数据
  ```
- **关键设计**：
  ```typescript
  // 数据结构
  interface StatsData {
    easy: { wins: number; losses: number };
    medium: { wins: number; losses: number };
    hard: { wins: number; losses: number };
  }

  // 存储键
  const STORAGE_KEY = 'connect4_3d_stats';

  // 计算胜率
  calculateRate(wins: number, losses: number): number {
    const total = wins + losses;
    return total === 0 ? 0 : wins / total;
  }
  ```

#### 3. 服务于整体项目
- **位置**：Data Layer
- **关系**：被 GameController 更新，被 GameUI 读取
- **贡献**：提供战绩数据存储和查询

#### 4. 技术规格
- **职责**：战绩数据存储和查询
- **输入**：战绩更新事件
- **输出**：战绩统计数据
- **依赖**：localStorage
- **接口定义**：
  ```typescript
  interface IStatsStore {
    update(difficulty: Difficulty, result: GameResult): void;
    getStats(): GameStats;
    clear(): void;
  }

  type GameResult = 'WIN' | 'LOSS' | 'DRAW';
  ```

---

### 模块 11：InputHandler（输入处理）

#### 1. 背景与必要性
- **为什么需要**：处理用户交互，区分左键点击和右键拖拽
- **如果没有**：无法响应用户操作

#### 2. 工作原理
- **核心机制**：事件监听，区分交互意图
- **数据流向**：
  ```
  输入：鼠标事件
  处理：判断是点击还是拖拽
  输出：调用 Controller 或 CameraController
  ```
- **关键设计**：
  ```typescript
  // 输入区分
  - 左键按下：记录位置，等待释放判断是否点击
  - 左键释放：若移动距离小 → 点击放置
  - 右键按下：进入旋转模式
  - 右键拖拽：调用 CameraController.updateRotate()
  - 右键释放：结束旋转

  // 点击位置计算
  - 使用 Three.js Raycaster 检测点击的棋盘位置
  - 返回 (x, y) 格子坐标
  ```

#### 3. 服务于整体项目
- **位置**：Presentation Layer
- **关系**：调用 GameController 和 CameraController
- **贡献**：提供用户交互入口

#### 4. 技术规格
- **职责**：处理用户输入，区分点击和拖拽
- **输入**：鼠标事件
- **输出**：调用对应控制器
- **依赖**：Three.js Raycaster, GameController, CameraController
- **接口定义**：
  ```typescript
  interface IInputHandler {
    init(canvas: HTMLCanvasElement): void;
    destroy(): void;

    // 移动端预留
    onTouchStart(pos: Vector2): void;
    onTouchMove(pos: Vector2): void;
    onTouchEnd(): void;
  }
  ```

---

### 模块 12：MenuUI（主菜单）

#### 1. 背景与必要性
- **为什么需要**：提供游戏入口，选择难度和先后手
- **如果没有**：游戏无法开始

#### 2. 工作原理
- **核心机制**：HTML/CSS 界面，响应选择操作
- **数据流向**：
  ```
  输入：用户选择
  处理：调用 GameController.startGame()
  输出：进入游戏
  ```
- **关键设计**：
  ```typescript
  // 菜单内容
  - 开始游戏按钮
  - 难度选择：简单 / 中等 / 困难
  - 先后手选择：先手黑棋 / 后手白棋 / 随机
  - 战绩查看按钮（展示 StatsStore 数据）
  ```

#### 3. 服务于整体项目
- **位置**：Presentation Layer
- **关系**：调用 GameController
- **贡献**：提供游戏入口

#### 4. 技术规格
- **职责**：显示主菜单，处理选择
- **输入**：用户点击
- **输出**：调用 GameController
- **依赖**：GameController, StatsStore
- **接口定义**：
  ```typescript
  interface IMenuUI {
    show(): void;
    hide(): void;
    onSelectDifficulty(difficulty: Difficulty): void;
    onSelectOrder(order: Order): void;
  }
  ```

---

## 数据库设计

### 本地存储结构

由于当前版本无后端，使用 localStorage 存储战绩数据：

```typescript
// localStorage 键
const STORAGE_KEYS = {
  STATS: 'connect4_3d_stats',
  BOARD_HEIGHT: 'connect4_3d_board_height',  // 棋盘高度配置（扩展功能）
};

// 战绩数据结构
interface StatsStorage {
  easy: { wins: number; losses: number };
  medium: { wins: number; losses: number };
  hard: { wins: number; losses: number };
}

// 默认值
const DEFAULT_STATS: StatsStorage = {
  easy: { wins: 0, losses: 0 },
  medium: { wins: 0, losses: 0 },
  hard: { wins: 0, losses: 0 },
};
```

---

## API 接口规范

### 内部模块接口

当前版本为纯前端，无外部API。模块间通过接口定义通信：

```typescript
// 核心接口汇总
interface IGameController {
  startGame(difficulty: Difficulty, order: Order): void;
  onPlayerPlace(x: number, y: number): void;
  restart(): void;
  backToMenu(): void;
}

interface IBoard {
  canPlace(x: number, y: number): boolean;
  placePiece(x: number, y: number, player: Player): Position | null;
  getPiece(x: number, y: number, z: number): Player;
  isFull(): boolean;
  clear(): void;
}

interface IAIPlayer {
  decide(board: IBoard): Promise<Position>;
  setDifficulty(difficulty: Difficulty): void;
}

interface IWinChecker {
  checkWin(pos: Position, player: Player): WinResult | null;
  checkDraw(): boolean;
}

interface IBoardRenderer {
  init(scene: THREE.Scene): void;
  updatePiece(pos: Position, player: Player): void;
  highlightColumn(x: number, y: number): void;
  clearHighlights(): void;
  showWinLine(positions: Position[]): void;
}

interface ICameraController {
  startRotate(startPos: Vector2): void;
  updateRotate(currentPos: Vector2): void;
  endRotate(): void;
}

interface IEffectsRenderer {
  playWinEffect(winLine: Position[]): Promise<void>;
  playLoseEffect(): Promise<void>;
  playDrawEffect(): Promise<void>;
}

interface IGameUI {
  updateTurn(player: Player): void;
  updateSteps(steps: number): void;
  updateTime(gameTime: number, stepTime: number): void;
  showAIThinking(): void;
  hideAIThinking(): void;
}

interface IStatsStore {
  update(difficulty: Difficulty, result: GameResult): void;
  getStats(): GameStats;
  clear(): void;
}
```

---

## 部署架构

### 当前版本（纯前端）

```
┌─────────────────────────────────────┐
│           Static Hosting            │
│  (Vercel / Netlify / GitHub Pages)  │
├─────────────────────────────────────┤
│  index.html                         │
│  ├── main.js (打包后的JS)           │
│  ├── styles.css                     │
│  └── assets/                        │
│      └── textures/ (可选)           │
└─────────────────────────────────────┘
```

### 构建流程

```
源代码 (TypeScript)
    ↓ Vite build
打包产物 (ES Module)
    ↓ 部署
静态托管服务
```

---

## 项目目录结构

```
connect4-3d/
├── docs/
│   ├── requirements/
│   │   └── requirements.md
│   └── architecture/
│   │   └── architecture.md
├── src/
│   ├── main.ts                 # 入口文件
│   ├── core/
│   │   ├── GameState.ts        # 游戏状态机
│   │   ├── GameController.ts   # 游戏控制器
│   │   ├── Board.ts            # 棋盘逻辑
│   │   ├── WinChecker.ts       # 胜负判定
│   │   ├── AIPlayer.ts         # AI决策
│   │   └── StatsStore.ts       # 战绩存储
│   ├── rendering/
│   │   ├── BoardRenderer.ts    # 棋盘渲染
│   │   ├── EffectsRenderer.ts  # 特效渲染
│   │   ├── CameraController.ts # 视角控制
│   │   └── SceneSetup.ts       # Three.js场景初始化
│   ├── ui/
│   │   ├── GameUI.ts           # 游戏HUD
│   │   ├── MenuUI.ts           # 主菜单
│   │   └── InputHandler.ts     # 输入处理
│   ├── types/
│   │   └── index.ts            # 类型定义
│   ├── config/
│   │   ├── gameConfig.ts       # 游戏配置
│   │   └── aiConfig.ts         # AI配置
│   └── utils/
│       ├── timer.ts            # 计时器
│       └── storage.ts          # localStorage封装
├── public/
│   ├── index.html
│   └── favicon.ico
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### ADR-007：连线检测分层优化

**状态**：已采纳

**问题**：AI高频调用 `checkWin()` 导致性能瓶颈

**背景**：
- 全盘 `checkWin()` 复杂度：O(W² × H × 13) ≈ 2800次检查（6×6×6棋盘）
- AI评估时使用 `wouldWin()`，每个候选位置调用一次全盘扫描
- 搜索深度4层，每层36个候选位置 → 36^4 × 2800 ≈ 39亿次检查（不可行）

**决策**：连线检测分层设计

```
┌─────────────────────────────────────────────────────┐
│ 连线检测分层架构                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Layer 1: 游戏流程层（低频调用）                     │
│     └─ checkWin(board) → 全盘扫描                   │
│     └─ 调用时机：玩家/AI落子后确认胜负              │
│     └─ 频率：每回合1次                              │
│     └─ 复杂度：O(W² × H × 13) ≈ 2800次              │
│                                                     │
│  Layer 2: AI评估层（高频调用）                       │
│     └─ quickWouldWin(board, pos, player)            │
│     └─ 只检测该位置周围的13方向                     │
│     └─ 频率：AI评估每个候选位置                     │
│     └─ 复杂度：O(13 × 7) ≈ 91次（提升30倍）         │
│                                                     │
│  Layer 3: 增量威胁追踪（可选高级优化）               │
│     └─ ThreatMap 缓存                               │
│     └─ 每次落子增量更新威胁状态                     │
│     └─ O(13 × 7) 增量更新                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**理由**：
1. 游戏流程层只需每回合1次全盘扫描，性能可接受
2. AI评估需要高频调用，必须使用局部检测优化
3. `quickWouldWin` 只检测13方向的连线，复杂度降低约30倍
4. 分层设计符合"用正确的工具解决正确的问题"原则

**接口定义**：
```typescript
// 新增方法
static quickWouldWin(board: Board, pos: Position, player: Player): WinResult | null {
  // 只检测以 pos 为中心的13方向连线
  // 复杂度：O(13 × 7) ≈ 91次检查
}

// 原有方法（保持不变）
static checkWin(board: Board): WinResult | null {
  // 全盘扫描
  // 复杂度：O(W² × H × 13)
}
```

**影响**：
- AI评估性能提升约30倍
- 需要修改 `WinChecker.ts` 添加 `quickWouldWin` 方法
- AI评估函数应使用 `quickWouldWin` 而非 `wouldWin`

### ADR-008：AI评估算法说明

**状态**：已采纳

**问题**：澄清"失误率=0"是否等于"完美决策"

**结论**：不存在绝对完美的AI方案

**背景分析**：

| 维度 | 传统2D四子棋 | 3D四子棋(本项目) |
|------|-------------|-----------------|
| 状态空间 | 7×6=42格，约10^13状态 | 6×6×6=216格，约10^30+状态 |
| 是否可穷举解 | ✅ 已证明先手必胜 | ❌ 无法穷举 |
| 完美策略存在 | ✅ 存在（数据库可查） | ❌ 不存在 |

**Minimax + Alpha-Beta 的局限性**：

```
┌─────────────────────────────────────────────────────┐
│ Minimax算法本质                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  假设：双方都采取最优策略                            │
│                                                     │
│  但实际受限：                                        │
│  1. 搜索深度有限（本项目HARD=4层）                   │
│     └─ 无法看到远期必胜/必败路径                    │
│                                                     │
│  2. 评估函数是启发式估计                             │
│     └─ 不是精确的胜负判定                           │
│     └─ 可能有估值偏差                               │
│                                                     │
│  3. Alpha-Beta剪枝可能剪掉关键分支                  │
│     └─ 依赖评估函数准确性                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**"失误率=0"的真实含义**：

```
mistakeRate = 0 并不等于"完美决策"

而是：
┌─ AI总是选择评估函数认为的"最优"位置 ─┐
│                                      │
│  但"评估函数认为最优" ≠ "实际最优"   │
│                                      │
│  原因：                              │
│  • 搜索深度有限，看不到更远的威胁    │
│  • 评估函数权重可能不合理            │
│  • 某些战略价值无法量化              │
│                                      │
└──────────────────────────────────────┘

失误率机制的实际作用：
• mistakeRate > 0：随机从次优选择中选一个
• 让AI显得"更像人"，增加游戏趣味
• 而不是掩盖"完美算法"的缺陷
```

**决策**：明确AI不是"完美"的，而是"有限深度下的最优估计"

**影响**：
- 需要在文档中明确说明AI的局限性
- 评估函数设计应考虑更多因素（即时胜负、威胁、连线潜力、位置价值）
- 不宣称AI"不失误就是完美"

---

## ADR 决策记录

### ADR-001：技术选型

**状态**：已采纳

**决策**：选择 Three.js + TypeScript + Vite

**理由**：
1. Three.js 是Web 3D的主流方案
2. TypeScript 提供类型安全
3. Vite 开发体验优秀
4. 无后端需求，纯前端降低复杂度

### ADR-002：AI算法选择

**状态**：已采纳

**决策**：使用 Minimax + 评估函数 + 随机失误

**理由**：
1. Minimax 是博弈树经典算法，适合完全信息博弈
2. 评估函数简化计算，避免全深度搜索
3. 随机失误增加趣味性，区分难度

**替代方案**：
- Monte Carlo Tree Search：更智能但计算量大，不适合Web环境
- 纯随机：太弱，没有挑战性

### ADR-003：状态管理方案

**状态**：已采纳

**决策**：使用状态机模式，不使用 React/Vue

**理由**：
1. 游戏状态明确有限，状态机模式天然匹配
2. 避免 React/Vue 的额外复杂度
3. 直接管理状态更高效，适合游戏场景

### ADR-004：棋盘高度可扩展设计

**状态**：已采纳

**决策**：Board 模块支持配置高度（6或8层）

**理由**：
1. 需求明确要求可扩展
2. 通过配置参数而非硬编码实现灵活性
3. 三维数组结构天然支持高度变化

### ADR-005：棋子形状选择

**状态**：已采纳

**决策**：使用乐高式圆柱体（CylinderGeometry）

**理由**：
1. 圆柱体平底可稳定堆叠，符合重力规则的物理逻辑
2. 直径=高度的比例，堆叠视觉稳定
3. 塑料质感（metalness=0.0, roughness=0.4）与工业风格协调
4. 辨识度高，区别于常见棋类游戏的球体棋子

**替代方案**：
- 球体（SphereGeometry）：传统熟悉，但堆叠视觉不稳定，有滚动错觉
- 围棋棋子（扁圆形）：堆叠不稳，需要额外晃动动画补偿

### ADR-006：棋子下落动画起点

**状态**：已采纳

**决策**：棋子从棋盘上方15单位高度开始下落

**理由**：
1. 15单位高度足够展示下落动画，不显得仓促
2. 从顶部掉落的视觉效果符合"重力规则"直觉
3. 动画时长500ms带弹跳缓动，体验流畅不拖沓

---

## 技术风险评估

| 风险项 | 影响等级 | 缓解措施 |
|--------|----------|----------|
| WebGL兼容性 | 中 | 首屏检测WebGL支持，不兼容时提示用户 |
| AI计算性能 | 中 | 深度限制，异步计算，避免阻塞UI |
| Three.js学习曲线 | 低 | 模块化设计，渲染层与逻辑层分离 |
| localStorage容量限制 | 低 | 战绩数据极小（<1KB），无风险 |
| 浏览器性能差异 | 中 | 性能测试，控制粒子数量，限制渲染复杂度 |

---

## 文档状态

- [x] 架构设计完成
- [x] 技术选型确定
- [x] 模块设计完成
- [x] 接口定义完成
- [x] 视觉风格同步更新
- [ ] 已移交给 Dev Agent
- [ ] 禁止后续修改（除非正式变更流程）

---

### ADR-009：连线检测数据结构优化（四连索引方案）

**状态**：已采纳

**问题**：AI高频调用连线检测导致性能瓶颈

**背景分析**：
- 当前全盘扫描复杂度：O(216 × 13) ≈ 2800次
- AI深度搜索每节点需要评估，搜索树节点数36^4 ≈ 170万
- 需要优化AI评估层的检测效率

**决策**：采用四连索引表（LineIndex）方案

**方案架构**：
```
┌─────────────────────────────────────────────────────┐
│ 四连索引表架构（LineIndex）                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  预计算阶段（初始化时一次性完成）                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  计算所有可能的4连起点和方向                    │   │
│  │  每条4连记录：[pos0, pos1, pos2, pos3, status] │   │
│  │  总记录数：约648条                             │   │
│  │                                               │   │
│  │  计算逻辑：                                     │   │
│  │  - 方向 (1,0,0) 横线：3×6×6 = 108条            │   │
│  │  - 方向 (0,1,0) 竖线：6×3×6 = 108条            │   │
│  │  - 方向 (1,1,0) XY对角：3×3×6 = 54条           │   │
│  │  - 方向 (1,-1,0) XY反对角：3×3×6 = 54条        │   │
│  │  - 方向 (0,0,1) 垂直：6×6×3 = 108条            │   │
│  │  - 跨层斜线(向上)：4方向×54 = 216条            │   │
│  │  - 空间对角(向上)：4方向×27 = 108条            │   │
│  │  ─────────────────────────────────────────── │   │
│  │  正向方向共13个，避免重复检测                   │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  数据结构                                           │
│  ┌─────────────────────────────────────────────┐   │
│  │  LineRecord {                                 │   │
│  │    id: number;          // 唯一ID             │   │
│  │    positions: Position[4]; // 4个位置         │   │
│  │    direction: Vector3;  // 方向向量           │   │
│  │    blackCount: number;  // 黑棋数量(0-4)      │   │
│  │    whiteCount: number;  // 白棋数量(0-4)      │   │
│  │  }                                            │   │
│  │                                               │   │
│  │  posToLines: Map<number, number[]>;           │   │
│  │  // 位置索引 → 涉及的LineRecord ID列表         │   │
│  │  // 每个位置约涉及13条4连                      │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  运行阶段                                           │
│  ┌─────────────────────────────────────────────┐   │
│  │  每次落子：                                    │   │
│  │    1. 查询该位置涉及的4连ID列表（~13条）       │   │
│  │    2. 更新每条4连的计数状态                    │   │
│  │    3. 检测是否有4连达到4颗同类棋子             │   │
│  │    复杂度：O(13) 增量更新                      │   │
│  │                                               │   │
│  │  AI评估：                                      │   │
│  │    1. 模拟放置时更新索引（O(13)）              │   │
│  │    2. 撤销时回退索引（O(13)）                  │   │
│  │    3. 查询威胁状态（O(1)读取计数）             │   │
│  │                                               │   │
│  │  clone支持：                                   │   │
│  │    复制648条记录 + 216个映射 ≈ O(864)          │   │
│  │    内存开销：约200KB                           │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  与现有架构集成                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  Board类扩展：                                 │   │
│  │    - grid: Player[][][]       // 保留         │   │
│  │    - lineIndex: LineIndex     // 新增索引     │   │
│  │                                               │   │
│  │  WinChecker改造：                              │   │
│  │    - checkWin() → 调用lineIndex检测           │   │
│  │    - quickWouldWin() → 使用lineIndex增量模拟  │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**复杂度对比**：

| 操作 | 原方案（三维数组扫描） | 四连索引方案 |
|------|----------------------|-------------|
| 初始化 | O(1) | O(648) 预计算 |
| 每次落子更新 | 无 | O(13) 增量更新 |
| checkWin（游戏流程） | O(2800) | O(648)遍历或O(13)增量检测 |
| quickWouldWin（AI评估） | O(91) | O(13) |
| Board.clone | O(216) | O(216+648) ≈ O(864) |
| AI搜索总开销 | 170万×91 ≈ 1.55亿 | 170万×13 ≈ 2200万 |

**收益分析**：
- AI评估效率提升约7倍
- 游戏流程检测效率提升约4倍
- 内存增加约200KB（可控）

**理由**：
1. **平衡收益与复杂度**：实现复杂度中等，收益显著
2. **兼容现有架构**：在Board类上扩展，不破坏现有接口
3. **增量更新友好**：AI模拟回溯时天然支持
4. **空间开销可控**：648条记录 + 216个映射 ≈ 200KB

**替代方案（未采纳）**：
- ThreatMap威胁图：效率最高（O(1)查询），但AI模拟回溯复杂，内存风险大
- 位运算位图：三维棋盘实现复杂，收益不如四连索引明显

**实施计划**：
1. 创建 `src/core/LineIndex.ts` 四连索引类
2. 修改 `Board.ts` 集成 LineIndex
3. 修改 `WinChecker.ts` 使用 LineIndex 优化检测
4. 编写单元测试验证索引正确性

---

### ADR-010：难度→棋盘高度映射架构

**状态**：已采纳

**问题**：如何设计难度与棋盘高度的映射关系

**背景**：
- 需求要求棋盘高度可扩展（默认6层，可扩展至8层）
- 不同难度对应不同棋盘高度，增加挑战性
- 当前代码中 Board 的 todo 注释需要实现

**决策**：
1. 映射关系定义在 `gameConfig.ts`（棋盘配置领域）
2. Board 只接收具体高度数值，不依赖 Difficulty 类型
3. GameState 负责调用 `getBoardHeightByDifficulty()` 计算并传入

**映射规则**：
```
EASY   → 6层（默认，新手友好）
MEDIUM → 7层（中等挑战）
HARD   → 8层（最大挑战，状态空间指数增长）
```

**数据流向**：
```
用户选择难度
     ↓
GameState.setDifficulty(difficulty)
     ↓
GameState.startGame() → getBoardHeightByDifficulty(difficulty)
     ↓
new Board(height) → 创建对应高度的棋盘
     ↓
LineIndex 预计算该高度的4连索引
     ↓
BoardRenderer 渲染对应高度的棋盘
```

**接口定义**：
```typescript
// gameConfig.ts
export const DIFFICULTY_HEIGHT_MAP: Record<Difficulty, number> = {
  EASY: 6,
  MEDIUM: 7,
  HARD: 8,
};

export function getBoardHeightByDifficulty(difficulty: Difficulty): number;
export function getCameraInitialPosition(boardHeight: number): Vector3;
export function getCameraLookAt(boardHeight: number): Vector3;
```

**理由**：
1. Board 是数据层，应保持纯粹的数据操作职责
2. Difficulty 是业务概念，属于 Logic Layer
3. GameState 作为流程控制，负责协调配置与数据层
4. 避免数据层依赖业务概念，符合分层架构原则

**关联影响**：
| 模块 | 影响内容 | 处理方式 |
|------|----------|----------|
| LineIndex | 4连记录数量变化 | 构造时根据 Board.height 计算 |
| BoardRenderer | 渲染高度、相机lookAt | 动态计算棋盘中心 |
| CameraController | 相机初始位置 | 高度越高，相机Y坐标相应提高 |
| WinChecker | 无影响 | 基于 Board 的 width/height 动态计算 |

---

### ADR-011：AI评估系统统一架构设计

**状态**：已采纳

**问题**：AI评估系统存在三层独立评分系统，评分职责不清，导致决策偏差

**背景分析**：

当前架构存在三个独立评分系统：

| 评分系统 | 位置 | 分数范围 | 问题 |
|----------|------|----------|------|
| LineIndex评估 | `getEvaluationScore()` | ~-300 ~ +300 | 威胁线动态评估（核心评分） |
| staticEvaluate.positionScore | AIPlayer.ts:371-389 | ~-50 ~ +50 | 重复计算位置价值 |
| positionBonus | AIPlayer.ts:200-202 | 0 ~ 25 | 静态启发叠加到最终分数 |

**问题示例**：
- 中心位置 bonus 直接叠加到 minimax 分数上
- 覆盖了 LineIndex 评估函数的差异判断
- 导致AI选择"静态最优"而非"动态最优"位置

**决策**：统一评估架构，明确职责分离

```
┌─────────────────────────────────────────────────────┐
│ AI评估系统统一架构                                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ Layer 1: 棋盘状态评估（唯一评分来源）          │   │
│  │     └─ LineIndex.getEvaluationScore()        │   │
│  │     └─ 包含：威胁线评分 + 隐式位置价值         │   │
│  │     └─ 中心位置涉及的4连更多，隐含位置优势     │   │
│  │                                               │   │
│  │  职责：评估当前棋盘状态的博弈价值              │   │
│  │  输出：minimax 搜索的评分结果                  │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ Layer 2: 候选排序启发（不影响决策质量）        │   │
│  │     └─ sortCandidates() 使用 positionBonus    │   │
│  │     └─ 目的：优化搜索效率（优先探索中心位置）   │   │
│  │                                               │   │
│  │  职责：优化Alpha-Beta剪枝效率                  │   │
│  │  不影响：最终决策分数                          │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ 已移除的冗余评分系统                           │   │
│  │     └─ staticEvaluate.positionScore ← 移除    │   │
│  │     └─ evaluateMove.positionBonus叠加 ← 移除  │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**设计原则**：

| 原则 | 说明 |
|------|------|
| 单一评分源 | LineIndex 是唯一的棋盘状态评分来源 |
| 启发与决策分离 | positionBonus 仅用于排序，不叠加到最终分数 |
| 度量基准统一 | 所有评分系统使用统一的分数量级设计 |

**代码修改规范**：

```typescript
// evaluateMove() - 移除 positionBonus 叠加
private evaluateMove(board: Board, pos: Position): number {
  // ... 检测立即获胜/阻挡 ...

  const clonedBoard = board.clone();
  clonedBoard.setPiece(pos, this.aiPiece);

  // 只返回 minimax 分数，不再叠加 positionBonus
  const minimaxScore = this.minimax(...);
  return minimaxScore;  // 移除: minimaxScore + this.positionBonus(pos)
}

// staticEvaluate() - 移除 positionScore 计算
private staticEvaluate(board: Board, player: Player): number {
  // 只使用 LineIndex 评估分数
  return board.getEvaluationScore(player);  // 移除: + positionScore
}

// sortCandidates() - 保留 positionBonus（用于排序）
private sortCandidates(...): { x: number; y: number }[] {
  // ...
  priority += this.positionBonus(pos);  // 保留，仅用于排序优先级
  // ...
}
```

**理由**：
1. LineIndex 已隐式包含位置价值（中心位置涉及的4连更多）
2. Minimax 搜索已完成博弈评估，不应被静态启发修改
3. positionBonus 的真正价值是优化搜索效率，而非修改决策质量
4. 消除冗余计算，提高评估一致性

**影响**：
- AI决策质量提升（不再被静态启发覆盖）
- 评估系统架构清晰（单一评分源）
- 维护复杂度降低（移除冗余计算）

---

**版本**：v1.3
**最后更新**：2026-04-24（添加ADR-011 AI评估系统统一架构设计）