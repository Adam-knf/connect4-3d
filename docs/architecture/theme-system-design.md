# 主题系统架构设计文档 v2.1

> **修订说明**：v2.1 根据需求挖掘师反馈修复以下问题：
> - P0：翻转动画实现优先级（代码动画为主，模型自带可选）
> - P1：机甲下落动画增加己方/对方区分配置
> - P1：补充完整状态转换表，明确回退逻辑
> - P2：胜负动画增加批量接口
> - P2：预览UI布局明确化
> - 素材优化：白棋子用同一模型改色，减少模型数量
> - **v2.2 更新**：经典主题重新定义为苹果风格（毛玻璃、高光材质、边缘光晕、浅灰渐变）
> - **v2.3 更新**：完整猫咪/机甲主题配置，修正经典胜利颜色，新增三套主题视觉规格总表，解决遗留特性主题化兼容性

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
| 呼吸缩放（经典） | Y轴缩放 ±2% + emissive脉动 |
| 光晕拖尾（经典） | emissive渐变 + 轨迹粒子（非爆炸） |
| 涟漪效果（经典） | 微下沉 + emissive向外扩散 |

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

/** 棋子主题配置（v2.3 扩展材质参数） */
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

  // Apple风格：边缘光晕效果
  emissiveGlow?: {
    color: number;
    intensity: number;
  };

  // v2.3 新增：材质物理属性（Three.js MeshStandardMaterial）
  material?: {
    metalness?: number;  // 金属度（0=塑料/1=金属，机甲主题需0.7）
    roughness?: number;  // 粗糙度（0=镜面/1=哑光，猫咪毛皮需0.6）
  };
}

/** 棋盘主题配置（v2.3 扩展主题化交互高亮） */
interface BoardTheme {
  baseColor: number;
  baseTexture?: string;
  gridColor: number;
  gridOpacity: number;
  // Apple风格支持
  borderRadius?: number;  // 圆角半径
  opacity?: number;       // 半透明（毛玻璃效果）
  // v2.3 新增：主题化交互高亮（解决遗留硬编码颜色冲突）
  hoverHighlight?: {
    gridColor: number;           // 悬停格子高亮色
    verticalLineColor: number;   // 竖线浮现色
    verticalLineOpacity: number;
    verticalLineEmissive: number;
  };
  previewOpacity?: number;  // 预览棋子透明度（经典0.4，机甲0.35全息感）
}

/** 环境主题配置 */
interface EnvironmentTheme {
  background: {
    type: 'color' | 'gradient' | 'skybox';
    value: number | string[] | { top: number; bottom: number };  // 颜色/天空盒路径/渐变色
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
      intensity?: number;  // 光晕强度
      texturePath?: string;
    };
  };
}
```

### 5.2 各主题配置示例

#### 经典主题（v2.3 修订：修正胜利/失败颜色）

```typescript
export const CLASSIC_THEME: ThemeConfig = {
  id: 'CLASSIC',
  name: '经典主题',
  description: '苹果风格：纯净白棋+深空灰棋，毛玻璃底座，极简设计',

  pieces: {
    black: {
      geometry: { type: 'cylinder', radius: 0.4, height: 0.45, color: 0x1d1d1f },  // 深空灰
      emissiveGlow: { color: 0x3d3d42, intensity: 0.15 },
    },
    white: {
      geometry: { type: 'cylinder', radius: 0.4, height: 0.45, color: 0xf5f5f7 },  // 苹果白
      emissiveGlow: { color: 0xffffff, intensity: 0.2 },
    },
  },

  board: {
    baseColor: 0xf0f0f5,
    baseTexture: '/assets/themes/classic/frosted_glass.png',
    gridColor: 0xc0c0c8,
    gridOpacity: 0.4,
    borderRadius: 0.5,
    opacity: 0.85,
    previewOpacity: 0.4,
    hoverHighlight: {
      gridColor: 0xe0e0e8,  // 浅灰白高亮
      verticalLineColor: 0xc0c0c8,
      verticalLineOpacity: 0.3,
      verticalLineEmissive: 0.5,
    },
  },

  environment: {
    background: {
      type: 'gradient',
      value: { top: 0xf5f5f7, bottom: 0xd2d2d8 },
    },
    lighting: {
      ambient: { color: 0xffffff, intensity: 0.8 },
      main: { color: 0xffffff, intensity: 1.0, position: { x: 5, y: 10, z: 7 } },
      fill: { color: 0xe0e0f0, intensity: 0.4, position: { x: -5, y: 5, z: -5 } },
    },
  },

  animations: {
    hasIdleAnimation: true,
    hover: {
      own: { type: 'code', codeAnimation: {
        scale: { duration: 300, pattern: 'pulse', intensity: 0.02 },
        material: { pattern: 'emissive_pulse', color: 0xffffff, intensity: 0.3 },  // 边缘光晕变亮
      }},
      opponent: { type: 'code', codeAnimation: {
        scale: { duration: 300, pattern: 'pulse', intensity: 0.02 },
        material: { pattern: 'emissive_pulse', color: 0x888890 },  // 颜色变暗（警示）
      }},
    },
    fall: {
      own: { type: 'code', codeAnimation: {
        position: { duration: 500, pattern: 'bounce', intensity: 0.1 },
        material: { pattern: 'emissive_pulse', color: 0xffffff },  // 纯净光晕拖尾（白棋）
      }},
      opponent: { type: 'code', codeAnimation: {
        position: { duration: 500, pattern: 'bounce', intensity: 0.1 },
        material: { pattern: 'emissive_pulse', color: 0x6688cc },  // 黑棋浅蓝拖尾
      }},
    },
    impact: {
      own: { type: 'code', codeAnimation: {
        position: { duration: 300, pattern: 'shake', intensity: 0.05 },  // 微下沉
        material: { pattern: 'emissive_pulse', color: 0xe0e0e8, intensity: 0.3 },  // 光晕涟漪
      }},
      opponent: { type: 'code', codeAnimation: {
        position: { duration: 300, pattern: 'shake', intensity: 0.05 },
        material: { pattern: 'emissive_pulse', color: 0x888890 },  // 警示下沉
      }},
    },
    win: { type: 'code', codeAnimation: {
      position: { duration: 500, pattern: 'bounce', intensity: 0.15 },  // 轻微跳跃
      material: { pattern: 'emissive_pulse', color: 0xffffff, intensity: 0.5 },  // 纯白光晕增强
    }},
    lose: { type: 'code', codeAnimation: {
      material: { pattern: 'emissive_pulse', color: 0xd2d2d8, intensity: 0.1 },  // 颜色淡化（透明度降低）
    }},
  },
};
```

#### 猫咪主题（v2.3 修订：完整颜色规格）

```typescript
export const CAT_THEME: ThemeConfig = {
  id: 'CAT',
  name: '猫咪主题',
  description: '黑猫白猫对战，蹲坐/趴睡姿态',

  pieces: {
    black: {
      activeModel: {
        path: '/assets/themes/cat/models/cat_sit.glb',
        scale: 0.5,
        rotation: { x: 0, y: 0, z: 0 },
        hasBuiltinAnimation: false,
      },
      sleepModel: {
        path: '/assets/themes/cat/models/cat_sleep.glb',
        scale: 0.5,
        rotation: { x: 0, y: 0, z: 0 },
      },
      material: { metalness: 0.0, roughness: 0.6 },  // 毛皮质感
    },
    white: {
      activeModel: {
        path: '/assets/themes/cat/models/cat_sit.glb',  // 黑白共用同一模型
        scale: 0.5,
        rotation: { x: 0, y: 0, z: 0 },
        hasBuiltinAnimation: false,
      },
      sleepModel: {
        path: '/assets/themes/cat/models/cat_sleep.glb',
        scale: 0.5,
        rotation: { x: 0, y: 0, z: 0 },
      },
      material: { metalness: 0.0, roughness: 0.6 },  // 毛皮质感
    },
  },

  board: {
    baseColor: 0x8B4513,  // 木纹质感
    baseTexture: '/assets/themes/cat/textures/wood.png',
    gridColor: 0xFFB347,  // 暖橘色网格
    gridOpacity: 0.6,
    borderRadius: 0.3,
    opacity: 1.0,  // 不透明木纹
    previewOpacity: 0.4,
    hoverHighlight: {
      gridColor: 0xFFD699,  // 暖橘高亮
      verticalLineColor: 0xFFB347,
      verticalLineOpacity: 0.4,
      verticalLineEmissive: 0.5,
    },
  },

  environment: {
    background: {
      type: 'skybox',
      value: [
        '/assets/themes/cat/skybox/room/posx.jpg',
        '/assets/themes/cat/skybox/room/negx.jpg',
        '/assets/themes/cat/skybox/room/posy.jpg',
        '/assets/themes/cat/skybox/room/negy.jpg',
        '/assets/themes/cat/skybox/room/posz.jpg',
        '/assets/themes/cat/skybox/room/negz.jpg',
      ],
    },
    lighting: {
      ambient: { color: 0xFFE4C4, intensity: 0.6 },  // 暖色调柔和光照
      main: { color: 0xffffff, intensity: 0.8, position: { x: 5, y: 10, z: 7 } },
      fill: { color: 0xFFB347, intensity: 0.2, position: { x: -5, y: 5, z: -5 } },
    },
  },

  animations: {
    hasIdleAnimation: true,
    hover: {
      own: { type: 'code', codeAnimation: {
        rotation: { duration: 200, axis: 'y', angle: 15 },  // 看向鼠标
        position: { duration: 200, pattern: 'offset', intensity: 0.1 },  // 翻身露肚皮
      }},
      opponent: { type: 'code', codeAnimation: {
        rotation: { duration: 200, axis: 'y', angle: 15 },  // 看向鼠标
        position: { duration: 200, pattern: 'bounce', intensity: 0.15 },  // 伸爪拍打
      }},
    },
    fall: {
      own: { type: 'code', codeAnimation: {
        position: { duration: 500, pattern: 'bounce', intensity: 0.1 },  // 伸腿下落
      }},
      opponent: { type: 'code', codeAnimation: {
        position: { duration: 500, pattern: 'bounce', intensity: 0.1 },
      }},
    },
    impact: {
      own: { type: 'code', codeAnimation: {
        position: { duration: 300, pattern: 'shake', intensity: 0.08 },  // 侧弯躲避
      }},
      opponent: { type: 'code', codeAnimation: {
        scale: { duration: 300, pattern: 'expand', intensity: 0.1 },  // 炸毛：膨胀+亮色
        material: { pattern: 'emissive_pulse', color: 0xFFB347, intensity: 0.4 },
      }},
    },
    win: { type: 'code', codeAnimation: {
      position: { duration: 400, pattern: 'bounce', intensity: 0.2 },  // 左右跳跃
    }},
    lose: { type: 'code', codeAnimation: {
      position: { duration: 500, pattern: 'offset', intensity: 0.3 },  // 钻洞：缩入仅露头
    }},
  },
};
```

**猫咪主题运行时改色**：
```typescript
// 加载后修改材质颜色区分黑/白猫
loadModel('/assets/themes/cat/models/cat_sit.glb').then(model => {
  model.traverse(child => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      child.material.color.setHex(isBlack ? 0x1a1a22 : 0xf0e8d8);  // 暗棕黑 / 暖白
      child.material.roughness = 0.6;  // 毛皮质感
    }
  });
});
```

#### 机甲主题（v2.3 修订：完整颜色规格）

```typescript
export const MECHA_THEME: ThemeConfig = {
  id: 'MECHA',
  name: '机甲主题',
  description: '机甲对战，站立/收拢姿态',

  pieces: {
    black: {
      activeModel: {
        path: '/assets/themes/mecha/models/mecha_stand.glb',
        scale: 0.5,
        rotation: { x: 0, y: 0, z: 0 },
        hasBuiltinAnimation: false,
      },
      sleepModel: {
        path: '/assets/themes/mecha/models/mecha_fold.glb',
        scale: 0.5,
        rotation: { x: 0, y: 0, z: 0 },
      },
      material: { metalness: 0.7, roughness: 0.3 },  // 高金属感+光滑
    },
    white: {
      activeModel: {
        path: '/assets/themes/mecha/models/mecha_stand.glb',  // 黑白共用
        scale: 0.5,
        rotation: { x: 0, y: 0, z: 0 },
        hasBuiltinAnimation: false,
      },
      sleepModel: {
        path: '/assets/themes/mecha/models/mecha_fold.glb',
        scale: 0.5,
        rotation: { x: 0, y: 0, z: 0 },
      },
      material: { metalness: 0.7, roughness: 0.3 },  // 高金属感+光滑
    },
  },

  board: {
    baseColor: 0x2a2a3a,  // 金属质感
    baseTexture: '/assets/themes/mecha/textures/metal.png',
    gridColor: 0x00aaff,  // 冰蓝色网格线+发光
    gridOpacity: 0.8,
    borderRadius: 0.1,  // 机甲风格直角
    opacity: 1.0,
    previewOpacity: 0.35,  // 全息感
    hoverHighlight: {
      gridColor: 0x00ddff,  // 冰蓝高亮
      verticalLineColor: 0x00bbff,
      verticalLineOpacity: 0.5,
      verticalLineEmissive: 0.6,
    },
  },

  environment: {
    background: {
      type: 'skybox',
      value: [
        '/assets/themes/mecha/skybox/tech/posx.jpg',
        '/assets/themes/mecha/skybox/tech/negx.jpg',
        '/assets/themes/mecha/skybox/tech/posy.jpg',
        '/assets/themes/mecha/skybox/tech/negy.jpg',
        '/assets/themes/mecha/skybox/tech/posz.jpg',
        '/assets/themes/mecha/skybox/tech/negz.jpg',
      ],
    },
    lighting: {
      ambient: { color: 0x4488ff, intensity: 0.5 },  // 冷色调高对比
      main: { color: 0xffffff, intensity: 1.0, position: { x: 5, y: 10, z: 7 } },
      fill: { color: 0x00ccff, intensity: 0.3, position: { x: -5, y: 5, z: -5 } },
    },
  },

  animations: {
    hasIdleAnimation: true,
    hover: {
      own: { type: 'code', codeAnimation: {
        rotation: { duration: 200, axis: 'y', angle: 15 },  // 看向鼠标
        position: { duration: 200, pattern: 'offset', intensity: 0.05 },  // 微蹲准备
        material: { pattern: 'emissive_pulse', color: 0x00ccff, intensity: 0.5 },  // 灯光流动加速
      }},
      opponent: { type: 'code', codeAnimation: {
        rotation: { duration: 200, axis: 'y', angle: 15 },  // 看向鼠标
        position: { duration: 200, pattern: 'bounce', intensity: 0.1 },  // 左盾右剑半举
      }},
    },
    fall: {
      own: { type: 'code', codeAnimation: {
        position: { duration: 500, pattern: 'bounce', intensity: 0.1 },  // 举盾俯冲
      }},
      opponent: { type: 'code', codeAnimation: {
        position: { duration: 500, pattern: 'bounce', intensity: 0.1 },  // 举剑俯冲
      }},
    },
    impact: {
      own: { type: 'code', codeAnimation: {
        position: { duration: 300, pattern: 'shake', intensity: 0.05 },  // 巨盾迎接
        material: { pattern: 'emissive_pulse', color: 0x00ccff, intensity: 0.4 },  // 冰蓝盾牌光
      }},
      opponent: { type: 'code', codeAnimation: {
        position: { duration: 300, pattern: 'bounce', intensity: 0.08 },  // 举剑威胁
        material: { pattern: 'emissive_pulse', color: 0xff3366, intensity: 0.3 },  // 红光
      }},
    },
    win: { type: 'code', codeAnimation: {
      position: { duration: 500, pattern: 'bounce', intensity: 0.2 },  // 双臂高举欢呼
    }},
    lose: { type: 'code', codeAnimation: {
      material: { pattern: 'emissive_pulse', color: 0xff3366, intensity: 0.0 },  // 能量熄灭：灯光归零
    }},
  },
};
```

**机甲主题运行时改色**：
```typescript
// 加载后修改材质颜色区分黑/白机甲
loadModel('/assets/themes/mecha/models/mecha_stand.glb').then(model => {
  model.traverse(child => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      child.material.color.setHex(isBlack ? 0x1a1a2a : 0xd0d8e8);  // 深蓝灰 / 冷白
      child.material.metalness = 0.7;  // 金属质感
      child.material.roughness = 0.3;
      // 灯光流动效果用 emissive 实现
      child.material.emissive = new THREE.Color(0x00ccff);
      child.material.emissiveIntensity = 0.1;
    }
  });
});
```

---

### 5.3 三套主题视觉规格总表

> 此表与 `theme-system-requirements.md` 中的规格总表保持完全一致，确保架构设计与需求对齐。

#### 颜色方案

| 视觉元素 | 经典主题 | 猫咪主题 | 机甲主题 |
|----------|----------|----------|----------|
| **棋子-黑方** | `#1d1d1f`（深空灰） | `#1a1a22`（暗棕黑） | `#1a1a2a`（深蓝灰） |
| **棋子-白方** | `#f5f5f7`（苹果白） | `#f0e8d8`（暖白） | `#d0d8e8`（冷白） |
| **棋盘-底座** | `#f0f0f5` + 毛玻璃 | `#8B4513`（木纹） | `#2a2a3a`（金属） |
| **棋盘-网格** | `#c0c0c8`（浅灰） | `#FFB347`（暖橘） | `#00aaff`（冰蓝） |
| **背景** | `#f5f5f7`→`#d2d2d8` 渐变 | 暖色天空盒 | 冷色天空盒 |
| **光照-环境** | `#ffffff` 强度 0.8 | `#FFE4C4` 强度 0.6 | `#4488ff` 强度 0.5 |
| **光照-主光** | `#ffffff` 强度 1.0 | `#ffffff` 强度 0.8 | `#ffffff` 强度 1.0 |
| **光照-补光** | `#e0e0f0` 强度 0.4 | `#FFB347` 强度 0.2 | `#00ccff` 强度 0.3 |
| **阴影** | `rgba(0,0,0,0.15)` 弱 | `rgba(100,80,60,0.2)` 弱 | `rgba(0,50,100,0.25)` 中 |

#### 交互高亮颜色

| 交互元素 | 经典主题 | 猫咪主题 | 机甲主题 |
|----------|----------|----------|----------|
| **悬停格子高亮** | `#e0e0e8`（浅灰白） | `#FFD699`（暖橘） | `#00ddff`（冰蓝） |
| **竖线浮现** | `#c0c0c8`（浅灰） | `#FFB347`（暖橘） | `#00bbff`（冰蓝） |
| **预览棋子透明度** | 0.4 | 0.4 | 0.35（全息感） |
| **悬停己方-光晕** | `#ffffff` 发光增强 | `#FFB347` 发光加速 | `#00ccff` 灯光加速 |
| **悬停对方-警示** | `#888890` 颜色变暗 | 伸爪拍打（动作） | 举盾剑威胁（动作） |

#### 胜利/失败颜色

| 效果元素 | 经典主题 | 猫咪主题 | 机甲主题 |
|----------|----------|----------|----------|
| **胜利连线** | `#ffffff`（纯白光） | `#FFB347`（暖金色） | `#00ccff`（冰蓝） |
| **胜利粒子** | `#ffffff`（白色光晕） | `#FFB347`（暖金色+心形） | `#00ccff`（冰蓝火花） |
| **失败连线** | `#d2d2d8`（暗淡灰） | `#C06040`（暗橘色） | `#ff3366`（红色） |
| **失败粒子** | `#a0a0a8`（暗淡粒子） | `#886040`（暗棕色） | `#ff3366`（红色火星） |

#### 下落/对抗特效颜色

| 效果元素 | 经典主题 | 猫咪主题 | 机甲主题 |
|----------|----------|----------|----------|
| **下落拖尾** | `#ffffff`（白棋）/ `#6688cc`（黑棋） | 无特效 | 无特效 |
| **对抗己方-涟漪** | `#e0e0e8`（光晕扩散） | 侧弯躲避 | 巨盾迎接（冰蓝） |
| **对抗对方-警示** | `#888890`（颜色变暗） | 炸毛（膨胀+亮色） | 举剑威胁（红光） |

### 5.4 BoardTheme Schema 扩展（v2.3）

为支持主题化交互高亮颜色，BoardTheme 接口需扩展以下字段：

```typescript
interface BoardTheme {
  baseColor: number;
  baseTexture?: string;
  gridColor: number;
  gridOpacity: number;
  borderRadius?: number;
  opacity?: number;

  // v2.3 新增：主题化交互高亮
  hoverHighlight?: {
    gridColor: number;       // 悬停格子高亮色
    verticalLineColor: number; // 竖线浮现色
    verticalLineOpacity: number;
    verticalLineEmissive: number;
  };
  previewOpacity?: number;   // 预览棋子透明度（默认0.4）
}
```

### 5.5 遗留特性主题化兼容性

> 解决 `hover-highlight-spec.md` 和 `visual-style-guide.md` 与主题系统的颜色冲突。

**问题**：原 `hover-highlight-spec.md` 中竖直高亮线使用硬编码色 `#3d9eff`（工业蓝），原 `visual-style-guide.md` 中胜利连线/粒子使用 `#4ade80`（绿）、`#fbbf24`（金），这些颜色与三套主题的设计色不兼容。

**解决方案**：

| 旧特性 | 旧颜色 | 主题化方案 |
|--------|--------|------------|
| 竖直高亮线 | `#3d9eff` | 每主题独立配置 `board.hoverHighlight.verticalLineColor` |
| 悬停格子高亮 | `#3d9eff` | 每主题独立配置 `board.hoverHighlight.gridColor` |
| 预览棋子 | 硬编码 `opacity: 0.4` | 每主题配置 `board.previewOpacity` |
| 胜利连线 | `#4ade80` | 每主题动画配置 `animations.win.material.color` |
| 胜利粒子 | `#fbbf24` | 从胜利颜色表取色（经典#ffffff、猫咪#FFB347、机甲#00ccff） |
| 失败特效 | `#ff6b4a` | 从失败颜色表取色（经典#d2d2d8、猫咪#C06040、机甲#ff3366） |
| 背景 | `#0a0a0f` | 由 `environment.background` 控制（经典渐变/猫咪天空盒/机甲天空盒） |
| UI补光 | `#3d9eff` | 由 `environment.lighting.fill.color` 控制 |

**实施说明**：
- `hover-highlight-spec.md` 中 `RENDER_CONFIG.verticalHighlight` 应改为从 `ThemeConfig.board.hoverHighlight` 读取，不再使用全局配置
- `visual-style-guide.md` 中深色背景（`#0a0a0f`）和强调色板（`#3d9eff`、`#ff6b4a`、`#4ade80`、`#fbbf24`）仅作为经典主题的 fallback 参考，不得硬编码到渲染器
- 所有胜利/失败特效颜色从 `ThemeConfig.animations` 配置读取

### 5.6 前端设计审查（frontend-design skill 应用）

> 基于 frontend-design skill 的视觉设计原则，对三套主题进行差异化审查。

**核心原则**：三套主题必须在视觉上形成鲜明的差异化记忆点，避免"AI 生成的同质化感"。

#### 差异化审查

| 维度 | 经典主题 | 猫咪主题 | 机甲主题 | 是否区分明显 |
|------|----------|----------|----------|--------------|
| **色调方向** | 中性（白灰） | 暖色（橘黄/木纹） | 冷色（冰蓝/深蓝） | 明显 |
| **材质特征** | 磨砂/光滑塑料 | 毛皮（哑光粗糙） | 金属（高反射） | 明显 |
| **视觉重量** | 轻（透明+浅色） | 中（温暖但不重） | 重（深色+高对比） | 明显 |
| **动画节奏** | 慢（2秒呼吸） | 灵动（尾巴+耳朵微动） | 机械（部件开合+灯光流动） | 明显 |
| **高亮色** | 白/灰 | 暖橘 | 冰蓝 | 明显 |
| **失败色** | 灰淡 | 暗橘红 | 鲜红（#ff3366） | 明显 |

#### 设计风险提示

| 风险 | 级别 | 说明 | 缓解措施 |
|------|------|------|----------|
| 猫咪 vs 经典暖色冲突 | 低 | 经典主题环境色也是暖白 `#f5f5f7`，猫咪暖白 `#f0e8d8` 接近 | 猫咪棋盘用木纹暖橘 `#FFB347` 明显区分 |
| 机甲网格发光过亮 | 中 | 冰蓝 `#00aaff` 网格 + 冷光背景可能在暗处刺眼 | `gridOpacity: 0.8` 配合 `verticalLineEmissive: 0.6` 控制 |
| 猫咪毛皮质感不逼真 | 中 | GLB 模型 + `roughness: 0.6` 不一定能模拟出毛皮感 | 优先用模型纹理自带质感，材质参数仅辅助 |
| 经典主题"太素" | 低 | 苹果极简可能在游戏里缺乏辨识度 | 光晕拖尾和胜利跳跃提供视觉记忆点 |

#### 主题切换 UI 设计要点（frontend-design 角度）

- **字体**：主题标题用 `Space Mono`（与游戏整体一致），描述文字用 `DM Sans`
- **布局**：卡片式三列并排，每张卡片含预览图+名称+描述+选中状态
- **动效**：主题选择卡片 hover 时做 scale 1.05 + 微阴影过渡（CSS transition 200ms）
- **选中态**：主题卡片边框用对应主题色高亮（经典 `#e0e0e8`、猫咪 `#FFB347`、机甲 `#00aaff`）
- **预览图**：200x200px PNG 透明背景，确保在不同背景色下可见

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

// 黑猫：color = 0x1a1a22（暗棕黑）
// 白猫：color = 0xf0e8d8（暖白）
// 黑机甲：color = 0x1a1a2a（深蓝灰）
// 白机甲：color = 0xd0d8e8（冷白）
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
| ADR-017 | 经典主题：苹果风格设计（毛玻璃+高光+边缘光晕） | 已采纳（新增） | v2.2更新 |
| ADR-018 | 主题化交互高亮颜色（解决遗留特性颜色冲突） | 已采纳（新增） | v2.3更新 |
| ADR-019 | 猫咪/机甲主题完整视觉规格 | 已采纳（新增） | v2.3更新 |
| ADR-020 | 前端设计审查：三主题差异化确认 + 设计风险识别 | 已采纳（新增） | v2.3更新，应用frontend-design skill |

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

**版本**：v2.3
**创建日期**：2026-04-24
**修订日期**：2026-04-24
**预计开发阶段**：Phase 3

**修订历史**：
- v2.0：初始版本
- v2.1：根据需求挖掘师反馈修复5个问题，优化素材方案
- v2.2：经典主题重新定义为苹果风格，更新棋盘/环境/动画配置
- v2.3：完整猫咪/机甲主题配置，修正经典胜利颜色，新增视觉规格总表，解决遗留特性兼容性，扩展材质/交互高亮Schema，应用frontend-design skill做差异化审查