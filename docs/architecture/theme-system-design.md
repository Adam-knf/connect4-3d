# 主题系统架构设计文档 v2.1

> **修订说明**：v2.1 根据需求挖掘师反馈修复以下问题：
> - P0：翻转动画实现优先级（代码动画为主，模型自带可选）
> - P1：机甲下落动画增加己方/对方区分配置
> - P1：补充完整状态转换表，明确回退逻辑
> - P2：胜负动画增加批量接口
> - P2：预览UI布局明确化
> - 素材优化：白棋子用同一模型改色，减少模型数量

## 基本信息
- **项目名称**：3D四子棋（Connect Four 3D）主题系统
- **架构师**：Architect Agent
- **文档版本**：v2.0
- **创建日期**：2026-04-24
- **交接目标**：💻 Dev Agent
- **前置依赖**：theme-system-requirements.md v1.0, architecture.md v1.3
- **开发阶段**：Phase 3

---

## 一、需求分析与难度评估

### 1.1 需求复杂度矩阵

| 维度 | 复杂度 | 说明 |
|------|--------|------|
| 模型素材 | ⭐⭐⭐⭐ | 三套主题 + 多姿态（活跃/休眠）+ 区分黑白 |
| 动画系统 | ⭐⭐⭐⭐⭐ | 6状态机 + 循环动画 + 触发动画 + 区分己方/对方 |
| 状态管理 | ⭐⭐⭐⭐ | 每颗棋子独立状态 + 状态转换规则 |
| 渲染架构 | ⭐⭐⭐ | 现有架构改造为素材驱动 |
| UI交互 | ⭐⭐ | 主题切换 + 二次确认 |

### 1.2 技术难点识别

| 难点 | 风险等级 | 解决思路 |
|------|----------|----------|
| 获取带完整动画的模型 | 高 | 免费素材 + AI生成补齐 + 代码动画兜底 |
| 状态机正确转换 | 中 | 明确状态转换表 + 单元测试 |
| 动画不阻塞渲染 | 中 | requestAnimationFrame + 状态缓存 |
| 区分己方/对方 | 低 | 棋子创建时记录所属玩家 |

---

## 二、技术选型决策

### ADR-012：动画实现方案选择（修订版）

**状态**：已采纳（已修订）

**决策**：采用**代码动画为主 + 模型自带动画可选**

**修订原因**：需求明确要求「代码动画优先，模型自带动画可选」。免费素材几乎不可能带"炸毛""翻身露肚皮"等特定动画，翻转优先级更实际。

**方案对比**：

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| A. 纯代码动画 | 实现可控，不依赖素材，符合需求 | 复杂动画不够自然 | **主要方案** |
| B. 模型自带动画 | 动画专业流畅 | 素材获取难度极高（免费素材无特定动画） | **可选补充** |
| C. 混合方案（原方案） | 灵活 | 优先级与需求矛盾 | ❌ 未采纳 |

**实施策略（修订后）**：
1. **优先使用代码动画**：所有动画默认通过代码实现（缩放/旋转/位移/材质变化）
2. **模型自带动画可选**：若恰好找到带合适动画的模型，可作为增强使用
3. **经典主题**：全部用代码动画（无模型，纯几何体）
4. **猫咪/机甲主题**：
   - 模型仅用于**姿态展示**（蹲坐/趴睡、站立/收拢）
   - 动画效果通过**代码实现**（翻身、伸爪、炸毛等用缩放/旋转模拟）

**代码动画实现方式**：

| 动画类型 | 代码实现方式 |
|----------|-------------|
| 呼吸节律 | Y轴缩放微调（±3%） + 周期2秒 |
| 眨眼 | 材质纹理切换（闭眼纹理 ↔ 开眼纹理） |
| 翻身露肚皮 | Z轴旋转90° + X轴位移偏移 |
| 伸爪拍打 | 局部部件（爪子）X轴前后位移 |
| 炸毛 | 整体缩放膨胀（+10%） + 材质亮度提升 |
| 跳跃 | Y轴位移循环（↑↓↑↓） |
| 看向鼠标 | Y轴旋转指向鼠标位置 |
| 灯光流动 | 材质emissive颜色渐变 |

### ADR-013：素材组织方案

**状态**：已采纳

**决策**：采用**单模型多姿态 + 纹理切换**

**方案对比**：

| 方案 | 描述 | 加载开销 | 切换开销 |
|------|------|----------|----------|
| 单模型多动画 | 一个GLB包含所有Animation clips | 低（一次加载） | 低（切换Action） |
| 多模型文件 | 每姿态一个GLB | 高（多次加载） | 高（替换Mesh） |
| 纹理切换 | 同模型换纹理 | 低 | 中（换材质） |

**最终方案**：

| 主题 | 活跃姿态 | 休眠姿态 | 切换方式 |
|------|----------|----------|----------|
| 经典 | 单一圆柱 | 同圆柱 | 无切换 |
| 猫咪 | 蹲坐姿态GLB | 趴睡姿态GLB | **多模型文件**（姿态差异大） |
| 机甲 | 站立姿态GLB | 收拢姿态GLB | **多模型文件**（姿态差异大） |

**理由**：
- 猫咪/机甲的活跃/休眠姿态差异太大，无法用同一模型实现
- 使用多模型文件，切换时替换Mesh
- 加载时预加载两种姿态，避免切换卡顿

### ADR-014：状态管理方案

**状态**：已采纳

**决策**：采用**中央状态机管理 + 棋子状态缓存**

**设计要点**：
1. `PieceStateManager` 中央管理所有棋子状态
2. 每颗棋子缓存当前状态（避免每次查询）
3. 状态转换由事件触发（覆盖、悬停、下落）
4. 状态转换表明确定义，便于测试

---

## 三、系统架构图

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Theme System Architecture                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  Theme Layer (新增)                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │ ThemeManager│  │ ThemeLoader │  │ ThemeConfig         │  │   │
│  │  │ (主题管理)  │  │ (素材加载)  │  │ (配置定义)          │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  State Layer (新增)                          │   │
│  │  ┌─────────────────────────────────────────────────────┐   │   │
│  │  │ PieceStateManager                                     │   │   │
│  │  │   • 状态机：Sleep → Idle → Hover → Fall/Impact       │   │   │
│  │  │   • 状态转换表                                        │   │   │
│  │  │   • 棋子状态缓存                                      │   │   │
│  │  └─────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  Animation Layer (新增)                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │ IdleAnimator│  │ EventAnim.  │  │ AnimationConfig     │  │   │
│  │  │ (循环动画)  │  │ (触发动画)  │  │ (动画配置)          │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  Rendering Layer (改造)                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │ PieceRenderer│ │ BoardRenderer│ │ EnvironmentRenderer │  │   │
│  │  │ (棋子渲染)  │  │ (棋盘渲染)  │  │ (环境渲染)          │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  UI Layer (新增)                             │   │
│  │  ┌─────────────┐  ┌─────────────────────────────────────┐  │   │
│  │  │ ThemeSelect │  │ ConfirmDialog                        │  │   │
│  │  │ (主题选择)  │  │ (二次确认)                          │  │   │
│  │  └─────────────┘  └─────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 模块依赖关系

```
ThemeSelectUI
    ↓
ThemeManager.setTheme(themeId)
    ↓
ThemeLoader.loadAll(themeConfig)
    ↓
┌──────────────────────────────┐
│ PieceRenderer.init(theme)    │ ← 创建棋子Mesh池
│ BoardRenderer.applyTheme()   │ ← 棋盘材质
│ EnvironmentRenderer.apply()  │ ← 背景+光照
└──────────────────────────────┘

游戏进行中：
InputHandler.onHover()
    ↓
PieceStateManager.onHover(pos)
    ↓
AnimationController.playHover(piece, isOwn)
    ↓
PieceRenderer.updateAnimation(piece)

Board.placePiece()
    ↓
PieceStateManager.onPlace(pos)
    ↓
AnimationController.playFall(newPiece)
AnimationController.playImpact(targetPiece, isOwn)
    ↓
PieceRenderer.updateMesh(piece, state)
```

---

## 四、模块详细设计

### 模块 1：ThemeManager（主题管理）

#### 1. 背景与必要性
- **为什么需要**：统一管理主题配置、切换流程、素材状态
- **如果没有**：主题切换散落在各模块，难以协调和调试

#### 2. 工作原理
- **核心机制**：
  - 维护当前主题ID
  - 协调 ThemeLoader 加载素材
  - 通知所有渲染器应用新主题
- **数据流向**：
  ```
  UI切换请求 → ThemeManager.setTheme()
                → ThemeLoader.loadAll()
                → 各Renderer.applyTheme()
                → 完成，回调UI
  ```

#### 3. 技术规格
- **职责**：主题配置管理、切换流程协调
- **输入**：主题ID
- **输出**：切换完成事件
- **依赖**：ThemeLoader, PieceRenderer, BoardRenderer, EnvironmentRenderer
- **接口定义**：
  ```typescript
  interface IThemeManager {
    currentTheme: ThemeId;
    setTheme(id: ThemeId): Promise<void>;
    getThemeConfig(): ThemeConfig;
    isLoaded(id: ThemeId): boolean;
    onThemeChange(callback: (theme: ThemeId) => void): void;
  }
  ```

---

### 模块 2：ThemeLoader（素材加载）

#### 1. 背景与必要性
- **为什么需要**：统一加载模型、纹理、天空盒，管理加载状态
- **如果没有**：各模块分散加载，重复请求，无法统一fallback

#### 2. 工作原理
- **核心机制**：
  - 使用 GLTFLoader 加载模型
  - 使用 TextureLoader 加载纹理
  - 使用 CubeTextureLoader 加载天空盒
  - 缓存已加载素材
- **数据流向**：
  ```
  loadRequest → checkCache → ifNotCached → fetchAsset → storeCache → return
  ```

#### 3. 技术规格
- **职责**：素材加载、缓存管理、失败fallback
- **输入**：素材路径配置
- **输出**：Three.js资源对象
- **依赖**：Three.js loaders
- **接口定义**：
  ```typescript
  interface IThemeLoader {
    loadModel(path: string): Promise<THREE.Group>;
    loadTexture(path: string): Promise<THREE.Texture>;
    loadSkybox(paths: string[]): Promise<THREE.CubeTexture>;
    preloadTheme(config: ThemeConfig): Promise<void>;
    getCache(key: string): THREE.Object3D | null;
    clearCache(): void;
  }
  ```

---

### 模块 3：PieceStateManager（棋子状态管理）

#### 1. 背景与必要性
- **为什么需要**：管理每颗棋子的状态（活跃/休眠/悬停等），触发动画
- **如果没有**：动画触发混乱，状态冲突，无法正确响应事件

#### 2. 工作原理
- **核心机制**：状态机 + 状态缓存
- **完整状态转换表**：

| 当前状态 | 触发事件 | 新状态 | 动画行为 | 回退逻辑 |
|----------|----------|--------|----------|----------|
| SLEEP | UNCOVERED（被移除覆盖） | IDLE | 启动呼吸动画 | - |
| IDLE | COVERED（被新棋子覆盖） | SLEEP | 停止呼吸动画 + 切换休眠素材 | - |
| IDLE | HOVER_START（鼠标悬停） | HOVER | 停止呼吸动画 + 播放悬停动画 | - |
| HOVER | HOVER_END（鼠标离开） | IDLE | 停止悬停动画 + 启动呼吸动画 | - |
| HOVER | FALL_IMPACT（新棋子落下） | IMPACT | **先停止悬停动画** + 播放对抗动画 | 动画结束→IDLE |
| IDLE | FALL_IMPACT（新棋子落在上方） | IMPACT | 播放对抗动画 | 动画结束→IDLE |
| FALL | 动画结束 | IDLE | 启动呼吸动画 | - |
| IMPACT | 动画结束 | IDLE | 启动呼吸动画 | - |
| ANY | GAME_WIN（游戏胜利） | WIN | 播放胜利动画 | 游戏结束后保持WIN状态 |
| ANY | GAME_LOSE（游戏失败） | LOSE | 播放失败动画 | 游戏结束后保持LOSE状态 |
| WIN/LOSE | GAME_RESET（重新开始） | SLEEP/IDLE | 清除动画 + 按层级恢复状态 | 根据是否顶层决定 |

**状态转换规则补充**：

| 转换场景 | 处理规则 |
|----------|----------|
| 悬停中新棋子落下 | 先停止悬停动画 → 转入IMPACT → 动画结束后回到IDLE |
| 下落动画棋子 | FALL状态独立，动画结束后自动回到IDLE并启动呼吸动画 |
| 胜负动画后 | 保持WIN/LOSE状态，游戏重新开始时统一清除并恢复 |
| 被覆盖的棋子成为顶层 | UNCOVERED事件 → SLEEP→IDLE → 启动呼吸动画 |

- **数据流向**：
  ```
  外部事件（覆盖/悬停/下落）
      ↓
  PieceStateManager.processEvent(pos, event)
      ↓
  查询当前状态 → 计算新状态 → 更新缓存 → 触发动画
  ```

#### 3. 技术规格
- **职责**：棋子状态管理、状态转换、动画触发
- **输入**：位置 + 事件类型
- **输出**：新状态 + 动画指令
- **依赖**：AnimationController, Board（查询棋子）
- **接口定义**：
  ```typescript
  interface IPieceStateManager {
    getState(pos: Position): PieceState;
    setState(pos: Position, state: PieceState): void;
    processEvent(pos: Position, event: PieceEvent): void;
    getAllActivePieces(): Position[];
    onStateChange(callback: StateChangeCallback): void;
    reset(): void;  // 清空所有状态
  }

  type PieceState = 'SLEEP' | 'IDLE' | 'HOVER' | 'IMPACT' | 'WIN' | 'LOSE';
  type PieceEvent = 'COVERED' | 'UNCOVERED' | 'HOVER_START' | 'HOVER_END' |
                    'FALL_IMPACT' | 'GAME_WIN' | 'GAME_LOSE';
  ```

---

### 模块 4：AnimationController（动画控制）

#### 1. 背景与必要性
- **为什么需要**：统一控制循环动画和触发动画，避免动画冲突
- **如果没有**：动画散落在各处，难以协调，可能阻塞渲染

#### 2. 工作原理
- **核心机制**：
  - 循环动画：requestAnimationFrame 每帧更新
  - 触发动画：事件触发时播放，完成后自动停止
  - 区分己方/对方：动画参数不同
- **数据流向**：
  ```
  循环动画：
  AnimationController.startIdle(piece)
      ↓
  添加到 idleList
      ↓
  requestAnimationFrame 每帧更新 idleList 中所有棋子
      ↓
  AnimationController.stopIdle(piece) 时移除

  触发动画：
  AnimationController.playHover(piece, isOwn)
      ↓
  播放悬停动画（持续型）
      ↓
  hoverEnd() 时停止
  ```

#### 3. 技术规格
- **职责**：动画播放、停止、更新
- **输入**：棋子Mesh + 动画类型 + 参数
- **输出**：动画帧更新
- **依赖**：ThemeConfig（动画参数）
- **接口定义**：
  ```typescript
  interface IAnimationController {
    // 循环动画
    startIdleAnimation(piece: PieceMesh): void;
    stopIdleAnimation(piece: PieceMesh): void;
    updateAllIdle(deltaTime: number): void;  // 每帧调用

    // 触发动画（持续型）
    playHoverAnimation(piece: PieceMesh, isOwn: boolean): void;
    stopHoverAnimation(piece: PieceMesh): void;

    // 触发动画（一次性）
    playFallAnimation(piece: PieceMesh, isOwnBase: boolean): Promise<void>;  // 修订：增加己方/对方区分
    playImpactAnimation(piece: PieceMesh, isOwn: boolean): Promise<void>;
    playWinAnimation(piece: PieceMesh): void;
    playLoseAnimation(piece: PieceMesh): void;

    // 批量胜负动画（新增）
    playWinAnimationForAll(player: Player): void;  // 对所有己方棋子播放胜利动画
    playLoseAnimationForAll(player: Player): void; // 对所有对方棋子播放失败动画

    // 状态切换动画
    switchToSleep(piece: PieceMesh): void;  // 切换休眠素材
    switchToActive(piece: PieceMesh): void; // 切换活跃素材

    // 游戏重置
    clearAllAnimations(): void;  // 清除所有动画状态
  }
  ```

**批量动画实现逻辑**：
```typescript
// playWinAnimationForAll 实现
playWinAnimationForAll(winner: Player): void {
  const allPieces = this.pieceRenderer.getAllPieceMeshes();
  for (const piece of allPieces) {
    if (piece.player === winner) {
      this.playWinAnimation(piece);
    }
  }
}
```

---

### 模块 5：PieceRenderer（棋子渲染）

#### 1. 背景与必要性
- **为什么需要**：根据主题渲染棋子，管理棋子Mesh池
- **如果没有**：无法渲染主题棋子，无素材驱动架构

#### 2. 工作原理
- **核心机制**：
  - 预创建棋子Mesh池（黑/白各一套活跃+休眠）
  - 根据主题选择模型/纹理
  - 根据状态选择活跃/休眠姿态
- **数据流向**：
  ```
  init(theme) → 加载模型 → 创建Mesh池
  addPiece(pos, player, state) → 从池中取Mesh → 设置位置 → 添加到场景
  updatePieceState(pos, state) → 切换Mesh（活跃↔休眠）
  ```

#### 3. 技术规格
- **职责**：棋子Mesh管理、渲染、姿态切换
- **输入**：位置 + 玩家 + 状态
- **输出**：棋子Mesh
- **依赖**：ThemeLoader, AnimationController
- **接口定义**：
  ```typescript
  interface IPieceRenderer {
    init(scene: THREE.Scene, theme: ThemeConfig): Promise<void>;
    addPiece(pos: Position, player: Player, isTop: boolean): PieceMesh;
    removePiece(pos: Position): void;
    updatePieceState(pos: Position, state: PieceState): void;
    getPieceMesh(pos: Position): PieceMesh | null;
    getAllPieceMeshes(): PieceMesh[];
    clearAll(): void;
  }

  interface PieceMesh {
    mesh: THREE.Object3D;
    position: Position;
    player: Player;
    state: PieceState;
    isOwn: boolean;  // 区分己方/对方（相对于当前玩家）
  }
  ```

---

### 模块 6：BoardRenderer（棋盘渲染 - 改造）

#### 1. 背景与必要性
- **为什么需要**：棋盘材质随主题变化
- **如果没有**：棋盘风格固定，与主题不协调

#### 2. 改造要点
- 移除硬编码材质
- 添加 `applyTheme(theme)` 方法
- 支持纹理贴图、材质颜色配置

#### 3. 技术规格
- **新增接口**：
  ```typescript
  interface IBoardRenderer {
    // 现有方法保持不变
    init(scene: THREE.Scene): void;
    // ...

    // 新增方法
    applyTheme(theme: ThemeConfig): void;
  }
  ```

---

### 模块 7：EnvironmentRenderer（环境渲染 - 新增）

#### 1. 背景与必要性
- **为什么需要**：统一管理背景和光照主题
- **如果没有**：环境风格固定，与主题不协调

#### 2. 工作原理
- **核心机制**：
  - 背景：颜色/渐变/天空盒
  - 光照：三光源（环境光+主光+补光）
  - 根据主题切换配置

#### 3. 技术规格
- **职责**：背景、光照渲染
- **输入**：主题环境配置
- **输出**：Three.js背景、光源
- **依赖**：SceneSetup, ThemeLoader
- **接口定义**：
  ```typescript
  interface IEnvironmentRenderer {
    init(scene: THREE.Scene): void;
    applyTheme(theme: ThemeConfig): Promise<void>;
    setBackground(type: string, value: any): void;
    setLighting(config: LightingConfig): void;
  }
  ```

---

### 模块 8：ThemeSelectUI（主题选择界面）

#### 1. 背景与必要性
- **为什么需要**：提供主题切换入口和预览
- **如果没有**：无法切换主题

#### 2. 工作原理
- **核心机制**：HTML/CSS面板 + 文字描述 + 预览图片 + 二次确认
- **UI布局设计**：

```
┌─────────────────────────────────────────────────────┐
│                  主题选择面板                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │  [预览图]       │  │  主题名称       │          │
│  │                 │  │  主题描述       │          │
│  │  经典主题       │  │                 │          │
│  └─────────────────┘  └─────────────────┘          │
│                                                     │
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │  [预览图]       │  │  猫咪主题       │          │
│  │                 │  │  黑猫白猫对战   │          │
│  │  猫咪           │  │                 │          │
│  └─────────────────┘  └─────────────────┘          │
│                                                     │
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │  [预览图]       │  │  机甲主题       │          │
│  │                 │  │  机甲对战       │          │
│  │  机甲           │  │                 │          │
│  └─────────────────┘  └─────────────────┘          │
│                                                     │
│           [确认切换]        [取消]                   │
│                                                     │
└─────────────────────────────────────────────────────┘

二次确认弹窗：
┌─────────────────────────────────┐
│  确定切换到 [猫咪主题] 吗？       │
│                                 │
│       [确定]      [取消]         │
└─────────────────────────────────┘
```

- **数据流向**：
  ```
  MenuUI点击"主题切换"
      ↓
  ThemeSelectUI.show()
      ↓
  显示主题列表（文字 + 预览图）
      ↓
  用户选择 → 高亮选中
      ↓
  点击"确认切换" → 二次弹窗
      ↓
  用户确定 → ThemeManager.setTheme() → 关闭面板
  用户取消 → 关闭弹窗，保持选中状态
  ```

#### 3. 技术规格
- **职责**：主题选择UI、二次确认弹窗
- **输入**：用户点击
- **输出**：选中的主题ID
- **依赖**：ThemeManager
- **接口定义**：
  ```typescript
  interface IThemeSelectUI {
    show(): void;
    hide(): void;
    // 预览内容：图片 + 文字描述
    setThemeList(themes: ThemePreviewItem[]): void;
    onSelect(callback: (themeId: ThemeId) => void): void;
    showConfirmDialog(themeName: string): Promise<boolean>;
  }

  interface ThemePreviewItem {
    id: ThemeId;
    name: string;
    description: string;
    previewImage: string;  // 预览图片路径
  }
  ```

---

## 五、主题配置Schema

### 5.1 类型定义

```typescript
// src/types/theme.ts

/** 主题ID */
type ThemeId = 'CLASSIC' | 'CAT' | 'MECHA';

/** 主题配置 */
interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;

  // 棋子配置
  pieces: {
    black: PieceTheme;
    white: PieceTheme;
  };

  // 棋盘配置
  board: BoardTheme;

  // 环境配置
  environment: EnvironmentTheme;

  // 动画配置
  animations: AnimationThemeConfig;
}

/** 棋子主题配置 */
interface PieceTheme {
  // 活跃姿态模型
  activeModel?: {
    path: string;
    scale: number;
    rotation: { x: number; y: number; z: number };
    hasBuiltinAnimation: boolean;  // 是否自带动画
  };

  // 休眠姿态模型（可选）
  sleepModel?: {
    path: string;
    scale: number;
    rotation: { x: number; y: number; z: number };
  };

  // 经典模式：使用几何体
  geometry?: {
    type: 'cylinder';
    radius: number;
    height: number;
    color: number;
  };
}

/** 棋盘主题配置 */
interface BoardTheme {
  baseColor: number;
  baseTexture?: string;
  gridColor: number;
  gridOpacity: number;
}

/** 环境主题配置 */
interface EnvironmentTheme {
  background: {
    type: 'color' | 'skybox';
    value: number | string[];  // 颜色或天空盒路径数组
  };
  lighting: {
    ambient: { color: number; intensity: number };
    main: { color: number; intensity: number; position: Vector3 };
    fill: { color: number; intensity: number; position: Vector3 };
  };
}

/** 动画主题配置（修订版） */
interface AnimationThemeConfig {
  // 是否启用呼吸动画
  hasIdleAnimation: boolean;

  // 悬停动画配置（区分己方/对方）
  hover: {
    own: AnimationSpec;
    opponent: AnimationSpec;
  };

  // 下落动画配置（修订：增加己方/对方区分，用于机甲举盾/举剑）
  fall: {
    own: AnimationSpec;      // 底部是己方棋子时的下落姿态（如举盾俯冲）
    opponent: AnimationSpec; // 底部是敌方棋子时的下落姿态（如举剑俯冲）
  };

  // 对抗动画配置（区分己方/对方）
  impact: {
    own: AnimationSpec;
    opponent: AnimationSpec;
  };

  // 胜负动画配置
  win: AnimationSpec;
  lose: AnimationSpec;
}

/** 动画规格（修订版：默认type为'code'） */
interface AnimationSpec {
  type: 'code' | 'builtin';  // 修订：代码动画为主，模型自带可选
  builtinName?: string;      // 自带动画名称（可选）
  codeAnimation?: {
    scale?: {
      duration: number;
      pattern: 'pulse' | 'expand' | 'contract';  // 缩放模式
      intensity: number;  // 缩放幅度（如0.03表示±3%）
    };
    rotation?: {
      duration: number;
      axis: 'x' | 'y' | 'z';
      angle?: number;  // 旋转角度（如90度翻身）
    };
    position?: {
      duration: number;
      pattern: 'bounce' | 'shake' | 'offset';
      intensity: number;  // 位移幅度
    };
    material?: {
      pattern: 'emissive_pulse' | 'texture_switch';  // 材质动画
      color?: number;
      texturePath?: string;
    };
  };
}
```

### 5.2 各主题配置示例

#### 经典主题

```typescript
export const CLASSIC_THEME: ThemeConfig = {
  id: 'CLASSIC',
  name: '经典主题',
  description: '黑白圆柱棋子，简约风格',

  pieces: {
    black: {
      geometry: { type: 'cylinder', radius: 0.4, height: 0.45, color: 0x1a1a22 },
    },
    white: {
      geometry: { type: 'cylinder', radius: 0.4, height: 0.45, color: 0xf0f0f5 },
    },
  },

  board: { baseColor: 0x383840, gridColor: 0x505058, gridOpacity: 0.6 },

  environment: {
    background: { type: 'color', value: 0x1a1a22 },
    lighting: { ambient: { color: 0xffffff, intensity: 0.6 }, ... },
  },

  animations: {
    hasIdleAnimation: false,  // 经典无呼吸动画
    hover: {
      own: { type: 'code', codeAnimation: { rotation: { duration: 300, axis: 'y' } } },
      opponent: { type: 'code', codeAnimation: { rotation: { duration: 300, axis: 'y' } } },
    },
    // ... 其他动画使用代码实现
  },
};
```

#### 猫咪主题

```typescript
export const CAT_THEME: ThemeConfig = {
  id: 'CAT',
  name: '猫咪主题',
  description: '黑猫白猫对战',

  pieces: {
    black: {
      activeModel: { path: '/assets/themes/cat/black_cat_sit.glb', scale: 0.5, ... },
      sleepModel: { path: '/assets/themes/cat/black_cat_sleep.glb', scale: 0.5, ... },
    },
    white: {
      activeModel: { path: '/assets/themes/cat/white_cat_sit.glb', scale: 0.5, ... },
      sleepModel: { path: '/assets/themes/cat/white_cat_sleep.glb', scale: 0.5, ... },
    },
  },

  board: { baseTexture: '/assets/themes/cat/wood.png', ... },

  environment: {
    background: { type: 'skybox', value: ['/assets/themes/cat/skybox/...'] },
    lighting: { ambient: { color: 0xFFE4C4, intensity: 0.6 }, ... },  // 暖色调
  },

  animations: {
    hasIdleAnimation: true,
    hover: {
      own: { type: 'builtin', builtinName: 'roll_over' },    // 翻身露肚皮
      opponent: { type: 'builtin', builtinName: 'paw_slap' }, // 伸爪拍打
    },
    // ... 尝试使用模型自带动画，若无则用代码兜底
  },
};
```

#### 机甲主题

```typescript
export const MECHA_THEME: ThemeConfig = {
  id: 'MECHA',
  name: '机甲主题',
  description: '机甲对战',

  pieces: {
    black: {
      activeModel: { path: '/assets/themes/mecha/black_mecha_stand.glb', ... },
      sleepModel: { path: '/assets/themes/mecha/black_mecha_fold.glb', ... },
    },
    white: { ... },
  },

  board: { baseColor: 0x2a2a3a, gridColor: 0x00aaff, gridOpacity: 0.8 },  // 冷色调+发光

  environment: {
    background: { type: 'skybox', value: ['/assets/themes/mecha/skybox/...'] },
    lighting: { ambient: { color: 0x4488ff, intensity: 0.5 }, ... },  // 冷色调
  },

  animations: {
    hasIdleAnimation: true,
    hover: {
      own: { type: 'builtin', builtinName: 'crouch_ready' },
      opponent: { type: 'builtin', builtinName: 'shield_raise' },
    },
    // ...
  },
};
```

---

## 六、素材获取方案（修订版）

### 6.1 素材需求清单（优化后）

> **优化策略**：白棋子不需要单独建模，使用同一模型修改材质颜色即可。模型数量从8个减少到4个。

| 主题 | 素材类型 | 数量 | 来源建议 | 说明 |
|------|----------|------|----------|------|
| 猫咪 | 猫蹲坐GLB（共用） | 1 | Sketchfab 购买 | 黑白共用，运行时改色 |
| 猫咪 | 猫趴睡GLB（共用） | 1 | Sketchfab 或 AI生成 | 黑白共用，运行时改色 |
| 猫咪 | 木纹纹理PNG | 1 | Kenney.nl 免费 | 棋盘底座 |
| 猫咪 | 天空盒（室内） | 6张 | Sketchfab 免费 | 环境背景 |
| 机甲 | 机甲站立GLB（共用） | 1 | Sketchfab 购买 | 黑白共用，运行时改色 |
| 机甲 | 机甲收拢GLB（共用） | 1 | AI生成 或 Blender调整 | 黑白共用，运行时改色 |
| 机甲 | 金属纹理PNG | 1 | 免费 | 棋盘底座 |
| 机甲 | 天空盒（科技） | 6张 | Sketchfab 免费 | 环境背景 |
| 共享 | 预览图PNG | 3 | 戳图/截图 | 每主题一张 |

**素材总数对比**：

| 方案 | GLB模型数量 | 说明 |
|------|-------------|------|
| 原方案 | 8个（黑×2 + 白×2 × 2主题） | 每种颜色单独模型 |
| **优化方案** | **4个**（蹲坐+趴睡+站立+收拢） | 黑白共用，运行时改色 |

### 6.2 模型改色实现

```typescript
// 加载模型后修改材质颜色
loadModelAndSetColor(path: string, color: number): THREE.Group {
  const model = await loader.load(path);

  // 遍历所有Mesh，修改材质颜色
  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (child.material instanceof THREE.MeshStandardMaterial) {
        child.material.color.setHex(color);
      }
    }
  });

  return model;
}

// 黑猫：color = 0x1a1a22
// 白猫：color = 0xf0f0f5
// 黑机甲：color = 0x2a2a3a
// 白机甲：color = 0xe0e0f0
```

### 6.2 Sketchfab搜索关键词

| 主题 | 搜索关键词 | 筛选条件 |
|------|------------|----------|
| 猫咪 | `stylized cat sitting low poly` | Animated, Free/$10, GLB |
| 猫咪 | `cat cartoon cute game` | Downloadable |
| 机甲 | `mecha robot low poly` | Animated, Free/$15, GLB |
| 机甲 | `robot stylized standing` | Downloadable |

### 6.3 AI生成方案（兜底）

| 工具 | 用途 | 适用场景 |
|------|------|----------|
| Meshy.ai | 生成3D模型 | 缺少姿态模型时 |
| Rodin.ai | 生成带动画模型 | 需要动画片段时 |
| Blender | 修改现有模型 | 换色、调整姿态 |

### 6.4 素材目录结构（优化版）

```
public/assets/themes/
├── classic/
│   └── preview.png              # 预览图
│
├── cat/
│   ├── models/
│   │   ├── cat_sit.glb          # 蹲坐姿态（黑白共用）
│   │   └── cat_sleep.glb        # 趴睡姿态（黑白共用）
│   ├── textures/
│   │   └── wood.png             # 棋盘纹理
│   ├── skybox/
│   │   └── room/                # 天空盒6面
│   │       ├── posx.jpg, negx.jpg, ...
│   └── preview.png              # 预览图
│
├── mecha/
│   ├── models/
│   │   ├── mecha_stand.glb      # 站立姿态（黑白共用）
│   │   └── mecha_fold.glb       # 收拢姿态（黑白共用）
│   ├── textures/
│   │   └── metal.png
│   ├── skybox/
│   │   └── tech/
│   │       ├── posx.jpg, ...
│   └── preview.png
│
└── shared/
    └── ui/
        └── theme_select_bg.png
```

**对比原方案目录**：

| 原方案 | 优化方案 | 减少 |
|--------|----------|------|
| 8个GLB文件 | 4个GLB文件 | 减少50% |
| 每种颜色单独模型 | 黑白共用模型 | 简化管理 |

---

## 七、开发任务分解

### 7.1 Phase 3 任务列表

| 任务ID | 任务名称 | 依赖 | 难度 | 优先级 | 状态 |
|--------|----------|------|------|--------|------|
| T3-1 | 定义主题类型Schema | 无 | ⭐⭐ | P0 | 待开发 |
| T3-2 | 创建 ThemeManager | T3-1 | ⭐⭐⭐ | P0 | 待开发 |
| T3-3 | 创建 ThemeLoader | T3-1 | ⭐⭐⭐⭐ | P0 | 待开发 |
| T3-4 | 创建 PieceStateManager | T3-1 | ⭐⭐⭐⭐ | P0 | 待开发 |
| T3-5 | 创建 AnimationController | T3-4 | ⭐⭐⭐⭐⭐ | P0 | 待开发 |
| T3-6 | 改造 PieceRenderer | T3-2, T3-3 | ⭐⭐⭐⭐ | P0 | 待开发 |
| T3-7 | 改造 BoardRenderer | T3-2 | ⭐⭐ | P1 | 待开发 |
| T3-8 | 创建 EnvironmentRenderer | T3-2, T3-3 | ⭐⭐⭐ | P2 | 待开发 |
| T3-9 | 创建 ThemeSelectUI | T3-2 | ⭐⭐ | P1 | 待开发 |
| T3-10 | 获取猫咪模型素材 | 无 | ⭐⭐⭐⭐ | P1 | 待开发 |
| T3-11 | 获取机甲模型素材 | 无 | ⭐⭐⭐⭐ | P2 | 待开发 |
| T3-12 | 实现猫咪主题配置 | T3-1, T3-10 | ⭐⭐⭐ | P1 | 待开发 |
| T3-13 | 实现机甲主题配置 | T3-1, T3-11 | ⭐⭐⭐ | P2 | 待开发 |
| T3-14 | 集成测试 | T3-6~T3-13 | ⭐⭐⭐⭐ | P0 | 待开发 |

### 7.2 难度说明

| 难度等级 | 说明 |
|----------|------|
| ⭐⭐ | 简单，主要是配置和接口定义 |
| ⭐⭐⭐ | 中等，需要理解现有架构并扩展 |
| ⭐⭐⭐⭐ | 较难，涉及核心逻辑和复杂交互 |
| ⭐⭐⭐⭐⭐ | 最难，涉及动画系统和性能优化 |

---

## 八、风险评估

| 风险项 | 影响等级 | 缓解措施 |
|--------|----------|----------|
| 找不到带完整动画的模型 | 高 | 免费素材 + AI生成 + 代码动画兜底 |
| 动画阻塞渲染帧率 | 中 | requestAnimationFrame + 状态缓存 + 简化动画 |
| 状态机转换逻辑错误 | 中 | 状态转换表 + 单元测试 |
| 多模型加载时间长 | 中 | 预加载 + 缓存 + 加载进度提示 |
| 素材内存占用过大 | 低 | 控制模型大小，单主题≤10MB |

---

## 九、ADR 决策记录汇总（修订版）

| ADR编号 | 决策内容 | 状态 | 修订说明 |
|---------|----------|------|----------|
| ADR-012 | 动画实现方案：代码动画为主 + 模型自带可选 | 已采纳（修订） | 原方案优先级与需求矛盾，已翻转 |
| ADR-013 | 素材组织：多模型文件（活跃/休眠分离） | 已采纳 | 保持不变 |
| ADR-014 | 状态管理：中央状态机 + 棋子状态缓存 | 已采纳 | 保持不变 |
| ADR-015 | 素材优化：黑白共用模型，运行时改色 | 已采纳（新增） | 减少50%模型数量 |
| ADR-016 | 下落动画：增加己方/对方区分配置 | 已采纳（新增） | 机甲举盾/举剑需求 |

---

## 文档状态

- [x] 需求分析完成
- [x] 难度评估完成
- [x] 技术选型完成
- [x] 模块设计完成
- [x] 素材方案完成
- [x] 任务分解完成
- [ ] 已移交给 Dev Agent
- [ ] 禁止后续修改（除非正式变更流程）

---

**版本**：v2.1
**创建日期**：2026-04-24
**修订日期**：2026-04-24
**预计开发阶段**：Phase 3

**修订历史**：
- v2.0：初始版本
- v2.1：根据需求挖掘师反馈修复5个问题，优化素材方案