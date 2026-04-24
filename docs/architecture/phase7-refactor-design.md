# Phase 7 架构重构设计文档

## 基本信息
- **项目名称**：3D四子棋主题系统重构
- **架构师**：Architect Agent
- **文档版本**：v1.2
- **创建日期**：2026-04-24
- **修订日期**：2026-04-24
- **交接目标**：💻 Dev Agent
- **前置依赖**：
  - theme-system-requirements.md v1.2
  - theme-system-design.md v2.3
  - architecture.md v1.3

---

## 一、重构概述

### 1.1 重构目标

| 目标 | 当前状态 | 目标状态 |
|------|----------|----------|
| 棋子渲染 | BoardRenderer 内硬编码几何体/材质 | PieceRenderer 素材驱动 |
| 棋子动画 | BoardRenderer 内下落动画 | AnimationController 统一管理 |
| 棋盘结构 | 固定简约底座 | 支持GLB模型（猫窝/金属平台） |
| 棋盘装饰 | 无 | 支持装饰物配置 |
| 高亮样式 | 硬编码蓝色 `0x3d9eff` | 主题差异化配置 |
| 配置结构 | gameConfig.ts 硬编码单主题 | ThemeConfig 多主题配置 |
| 状态管理 | 无棋子状态管理 | PieceStateManager 6状态机 |
| 主题切换 | 无 | ThemeManager + ThemeSelectUI |

### 1.2 重构影响范围

```
需要改造的文件：
├── src/types/index.ts        → 新增 src/types/theme.ts
├── src/rendering/BoardRenderer.ts → 拆分为 BoardRenderer + PieceRenderer
├── src/config/gameConfig.ts  → 保持经典主题默认，新增主题配置入口
└── src/core/GameController.ts → 集成主题管理器

新增文件：
├── src/types/theme.ts
├── src/core/ThemeManager.ts
├── src/core/ThemeLoader.ts
├── src/core/PieceStateManager.ts
├── src/core/AnimationController.ts
├── src/rendering/PieceRenderer.ts
├── src/rendering/EnvironmentRenderer.ts
├── src/ui/ThemeSelectUI.ts
└── src/config/themes/
    ├── classicTheme.ts
    ├── catTheme.ts (Phase 8)
    └── mechaTheme.ts (Phase 9)
```

---

## 二、数据结构设计（扩展性为核心）

### 2.1 核心设计原则

| 原则 | 说明 | 实现方式 |
|------|------|----------|
| 配置驱动 | 所有主题通过 JSON 配置定义 | ThemeConfig Schema |
| 插件式扩展 | 新主题只需添加配置文件 | 不修改核心代码 |
| 默认值机制 | 缺失配置自动 fallback | 主题继承链 |
| 类型安全 | TypeScript 类型定义 | 完整类型 Schema |

### 2.2 类型 Schema 设计

```typescript
// ==================== src/types/theme.ts ====================

/**
 * 主题ID（枚举式，便于扩展）
 * 新增主题只需添加新枚举值
 */
export type ThemeId = 'CLASSIC' | 'CAT' | 'MECHA';

/**
 * 棋子状态（枚举式，便于扩展）
 * 当前6状态，未来可扩展
 */
export type PieceState = 'SLEEP' | 'IDLE' | 'HOVER' | 'FALL' | 'IMPACT' | 'WIN' | 'LOSE';

/**
 * 棋子事件（枚举式）
 */
export type PieceEvent =
  | 'COVERED'        // 被新棋子覆盖
  | 'UNCOVERED'      // 被移除覆盖成为顶层
  | 'HOVER_START'    // 鼠标开始悬停
  | 'HOVER_END'      // 鼠标结束悬停
  | 'FALL_IMPACT'    // 新棋子落在本位置上方
  | 'GAME_WIN'       // 游戏胜利
  | 'GAME_LOSE'      // 游戏失败
  | 'GAME_RESET';    // 游戏重置

/**
 * 动画类型（枚举式，便于扩展）
 */
export type AnimationType =
  | 'scale_pulse'    // 缩放脉冲
  | 'rotation_y'     // Y轴旋转
  | 'position_bounce'// 位置弹跳
  | 'material_emissive' // 发光材质
  | 'mesh_switch';   // Mesh切换（姿态变化）

/**
 * 动画规格
 * 支持代码动画 + 模型自带动画
 */
export interface AnimationSpec {
  type: 'code' | 'builtin';     // 动画来源类型
  builtinName?: string;          // 模型自带动画名称（可选）
  codeAnimation?: CodeAnimationConfig; // 代码动画配置（可选）
  duration: number;              // 动画时长(ms)
  loop?: boolean;                // 是否循环
}

/**
 * 代码动画配置
 * 统一的动画参数结构
 */
export interface CodeAnimationConfig {
  scale?: ScaleAnimationConfig;
  rotation?: RotationAnimationConfig;
  position?: PositionAnimationConfig;
  material?: MaterialAnimationConfig;
}

/**
 * 缩放动画配置
 */
export interface ScaleAnimationConfig {
  pattern: 'pulse' | 'expand' | 'contract';
  intensity: number;    // 缩放幅度（0.03 = ±3%）
  axis?: 'all' | 'y';   // 缩放轴
}

/**
 * 旋转动画配置
 */
export interface RotationAnimationConfig {
  axis: 'x' | 'y' | 'z';
  angle?: number;       // 旋转角度（度）
  lookAt?: boolean;     // 是否面向鼠标
}

/**
 * 位置动画配置
 */
export interface PositionAnimationConfig {
  pattern: 'bounce' | 'shake' | 'offset';
  intensity: number;    // 位移幅度
  axis?: 'y' | 'all';   // 位移轴
}

/**
 * 材质动画配置
 */
export interface MaterialAnimationConfig {
  pattern: 'emissive_pulse' | 'color_shift' | 'texture_switch';
  color?: number;       // 发光颜色
  intensity?: number;   // 发光强度
}

/**
 * 棋子主题配置（v1.2 修正材质参数冗余）
 * 支持几何体 + GLB模型两种方式
 *
 * ADR-021：材质参数统一使用顶层 material 字段
 * - geometry 内不再包含 metalness/roughness（避免冗余）
 * - GLB模型主题也需要材质参数，顶层 material 适用所有类型
 */
export interface PieceTheme {
  // 几何体配置（经典主题用）
  // v1.2 修正：移除 metalness/roughness，统一使用顶层 material
  geometry?: {
    type: 'cylinder' | 'sphere' | 'box';
    radius?: number;    // cylinder/sphere
    height?: number;    // cylinder
    width?: number;     // box
    depth?: number;     // box
    color: number;      // 颜色（黑白各定义）
    // metalness/roughness 移至顶层 material 字段
  };

  // GLB模型配置（猫咪/机甲用）
  model?: {
    path: string;       // 模型路径
    scale: number;      // 缩放比例
    rotation?: { x: number; y: number; z: number };
    // 黑白共用模型时的颜色覆盖
    colorOverride?: number;
  };

  // 休眠姿态（可选，姿态差异大的主题需要）
  sleepModel?: {
    path: string;
    scale: number;
    rotation?: { x: number; y: number; z: number };
    colorOverride?: number;
  };

  // v1.2 统一：材质物理属性（适用几何体+GLB模型）
  // 用于 Three.js MeshStandardMaterial
  material?: {
    metalness?: number;  // 金属度（经典0.0/机甲0.7）
    roughness?: number;  // 粗糙度（经典0.4/猫咪0.6/机甲0.3）
  };

  // 边缘光晕效果（经典主题苹果风格）
  // 用于悬停/胜利时的光晕增强动画
  emissiveGlow?: {
    color: number;      // 光晕颜色（经典白棋#ffffff/黑棋#3d3d42）
    intensity: number;  // 光晕强度（0.15-0.3）
  };
}

/**
 * 棋盘主题配置（v1.2 合并简洁版与扩展版）
 * 直接使用扩展版结构，避免 TypeScript 同名 interface 冲突
 * 支持 baseType geometry/model 切换 + 高亮配置 + 装饰物
 */
export interface BoardTheme {
  // 底座类型选择（几何体 vs GLB模型）
  baseType: 'geometry' | 'model';

  // 几何体配置（经典主题用）
  geometry?: {
    type: 'box' | 'platform';
    color: number;
    metalness: number;
    roughness: number;
    opacity?: number;
    borderRadius?: number;           // 苹果风格圆角
  };

  // GLB模型配置（猫咪猫窝、机甲金属平台）
  model?: {
    path: string;
    scale: number;
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
  };

  // 纹理贴图（可选，经典毛玻璃等）
  baseTexture?: string;

  // 网格样式
  grid: {
    color: number;
    opacity: number;
    emissive?: number;
    emissiveIntensity?: number;
    style?: 'line' | 'panel' | 'glow';
  };

  // 高亮样式（主题化配置）
  highlight: {
    cellHighlight: { color: number; opacity: number; emissiveIntensity: number };
    verticalHighlight: { color: number; opacity: number; emissiveIntensity: number };
    previewHighlight: { opacity: number; emissive?: number };
  };

  // 装饰物（可选）
  decorations?: {
    id: string;
    modelPath: string;
    position: { x: number; y: number; z: number };
    scale: number;
    optional?: boolean;
  }[];
}

/**
 * 光照配置（环境主题）
 */
export interface LightTheme {
  ambient: { color: number; intensity: number };
  main: { color: number; intensity: number; position: Vector3 };
  fill: { color: number; intensity: number; position: Vector3 };
}

/**
 * 背景配置（环境主题，v1.1 扩展渐变支持）
 */
export interface BackgroundTheme {
  type: 'color' | 'gradient' | 'skybox';
  // v1.1 扩展：支持渐变色（经典主题上浅下深）
  // color: 单色背景
  // gradient: { top: number; bottom: number } 渐变配置
  // skybox: string[] 天空盒6面路径
  value: number | string[] | { top: number; bottom: number };
}

/**
 * 环境主题配置
 */
export interface EnvironmentTheme {
  background: BackgroundTheme;
  lighting: LightTheme;
}

/**
 * 动画主题配置
 * 区分己方/对方的动画（核心扩展性）
 */
export interface AnimationThemeConfig {
  // 呼吸动画是否启用
  hasIdleAnimation: boolean;
  idleAnimation?: AnimationSpec;

  // 悬停动画（区分己方/对方）
  hover: {
    own: AnimationSpec;
    opponent: AnimationSpec;
  };

  // 下落动画（区分底部是己方/对方）
  fall: {
    own: AnimationSpec;      // 底部是己方时的姿态
    opponent: AnimationSpec; // 底部是对方时的姿态
    default: AnimationSpec;  // 底部为空时的姿态
  };

  // 对抗动画（承接棋子）
  impact: {
    own: AnimationSpec;
    opponent: AnimationSpec;
  };

  // 胜负动画
  win: AnimationSpec;
  lose: AnimationSpec;
}

/**
 * 完整主题配置（Schema核心）
 * 新增主题只需实现此接口
 */
export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  previewImage: string;

  // 棋子配置（黑/白）
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

  // 元数据（便于扩展）
  metadata?: {
    author?: string;
    version?: string;
    tags?: string[];
  };
}
```

---

## 三、棋盘结构变化设计（新增）

### 3.1 棋盘主题差异（v1.2 修正高亮色）

| 主题 | 棋盘结构 | 网格样式 | 高亮颜色 | 装饰物 |
|------|----------|----------|----------|--------|
| 经典 | 简约平台（几何体） | 简约线条 | 浅灰白 `#e0e0e8` | 无 |
| 猫咪 | 猫窝（GLB模型） | 木纹纹理 | 暖橘 `#FFD699` | 毛线球、小鱼 |
| 机甲 | 金属平台（GLB模型） | 发光网格 | 冰蓝 `#00ddff` | 能量柱、警示灯 |

### 3.2 BoardTheme 扩展Schema

> **v1.2 修正**：BoardTheme 定义已合并至第二节类型Schema（第225-275行），此处仅引用。
> 避免 TypeScript 同名 interface 重复定义冲突。

**关键扩展点**：
- `baseType: 'geometry' | 'model'` 支持几何体底座和 GLB 模型切换
- `baseTexture?: string` 支持毛玻璃纹理贴图（经典主题）
- `highlight` 结构支持主题化交互高亮颜色
- `decorations[]` 支持装饰物配置（猫咪毛线球、机甲能量柱）

### 3.3 各主题棋盘配置示例（v1.2 修正颜色+毛玻璃纹理）

#### 经典主题棋盘（苹果风格）

```typescript
board: {
  baseType: 'geometry',
  geometry: {
    type: 'platform',
    color: 0xf0f0f5,           // #f0f0f5 毛玻璃浅灰白（需求 v1.2）
    metalness: 0.0,
    roughness: 0.4,            // 光滑塑料质感
    opacity: 0.85,             // 半透明毛玻璃效果
    borderRadius: 0.5,         // 圆角设计
  },
  // v1.2 新增：毛玻璃纹理贴图路径
  // 纹理需使用半透明PNG + NoiseNoise模拟磨砂质感
  baseTexture: '/assets/themes/classic/textures/frosted_glass.png',
  grid: {
    color: 0xc0c0c8,           // #c0c0c8 浅灰网格（需求 v1.2）
    opacity: 0.4,              // 低对比度，不抢眼
    style: 'line',             // 极简线条
  },
  highlight: {
    // 悬停格子高亮：浅灰白
    cellHighlight: {
      color: 0xe0e0e8,         // #e0e0e8（需求 v1.2）
      opacity: 0.4,
      emissiveIntensity: 0.5,
    },
    // 竖线浮现：浅灰
    verticalHighlight: {
      color: 0xc0c0c8,         // #c0c0c8（需求 v1.2）
      opacity: 0.3,
      emissiveIntensity: 0.5,
    },
    // 预览棋子透明度
    previewHighlight: { opacity: 0.4 },
  },
  decorations: undefined,  // 无装饰（极简）
}
```

**毛玻璃纹理说明**：
- `frosted_glass.png` 需使用半透明 PNG + Noise 模拟磨砂质感
- 实际渲染时可通过 Three.js `MeshStandardMaterial` + `alphaTest` 实现
- 若纹理文件缺失，可使用纯色 + `opacity: 0.85` 作为 fallback

#### 猫咪主题棋盘（暖色木纹）

```typescript
board: {
  baseType: 'model',
  model: {
    path: '/assets/themes/cat/models/cat_bed.glb',  // 猫窝模型
    scale: 0.8,
    position: { x: 0, y: -0.1, z: 0 },
  },
  grid: {
    color: 0xFFB347,           // #FFB347 暖橘色网格（需求 v1.2）
    opacity: 0.4,
    style: 'line',
  },
  highlight: {
    // 悬停格子高亮：暖橘
    cellHighlight: {
      color: 0xFFD699,         // #FFD699（需求 v1.2）
      opacity: 0.5,
      emissiveIntensity: 0.5,
    },
    // 竖线浮现：暖橘
    verticalHighlight: {
      color: 0xFFB347,
      opacity: 0.4,
      emissiveIntensity: 0.5,
    },
    previewHighlight: { opacity: 0.4, emissive: 0xFFB347 },
  },
  decorations: [
    { id: 'yarn_ball', modelPath: '/assets/themes/cat/models/yarn_ball.glb',
      position: { x: -3, y: 0, z: -3 }, scale: 0.3, optional: true },
    { id: 'fish', modelPath: '/assets/themes/cat/models/fish.glb',
      position: { x: 3, y: 0, z: 3 }, scale: 0.25, optional: true },
  ],
}
```

#### 机甲主题棋盘（冷色金属）

```typescript
board: {
  baseType: 'model',
  model: {
    path: '/assets/themes/mecha/models/metal_platform.glb',
    scale: 1.0,
  },
  grid: {
    color: 0x00aaff,           // #00aaff 冰蓝发光网格（需求 v1.2）
    opacity: 0.5,
    emissive: 0x00aaff,
    emissiveIntensity: 0.6,
    style: 'glow',             // 发光网格
  },
  highlight: {
    // 悬停格子高亮：冰蓝
    cellHighlight: {
      color: 0x00ddff,         // #00ddff（需求 v1.2）
      opacity: 0.6,
      emissiveIntensity: 0.6,
    },
    // 竖线浮现：冰蓝
    verticalHighlight: {
      color: 0x00bbff,
      opacity: 0.5,
      emissiveIntensity: 0.6,
    },
    // 预览棋子全息感
    previewHighlight: { opacity: 0.35, emissive: 0x00ccff },
  },
  decorations: [
    { id: 'energy_pillar', modelPath: '/assets/themes/mecha/models/energy_pillar.glb',
      position: { x: -2, y: 0, z: -2 }, scale: 0.5 },
    { id: 'warning_light', modelPath: '/assets/themes/mecha/models/warning_light.glb',
      position: { x: 2, y: 0.5, z: 2 }, scale: 0.3 },
  ],
}
```

### 3.4 BoardRenderer 改造要点

**新增功能**：
- 支持 `baseType: 'model'` 时加载GLB模型替换底座
- 支持 `decorations` 装饰物渲染
- 支持 `highlight` 配置替换硬编码颜色
- 支持 `grid.style: 'glow'` 发光网格效果

**关键接口变更**：

```typescript
interface IBoardRenderer {
  // 现有接口保持不变
  init(scene: THREE.Scene): void;
  updateBoardHeight(newHeight: number): void;
  highlightColumn(x: number, y: number, z?: number, hasPreview: boolean): void;
  clearHighlight(): void;
  dispose(): void;

  // 新增接口（主题化）
  applyTheme(theme: BoardTheme): Promise<void>;  // 异步加载模型
  getHighlightConfig(): BoardHighlightConfig;    // 暴露高亮配置供外部使用
}
```

**实现逻辑**：

```typescript
async applyTheme(theme: BoardTheme): Promise<void> {
  // 1. 清除现有底座和装饰物
  this.clearBaseAndDecorations();

  // 2. 根据baseType创建底座
  if (theme.baseType === 'geometry') {
    this.createGeometryBase(theme.geometry);
  } else {
    await this.loadModelBase(theme.model);
  }

  // 3. 更新网格样式
  this.updateGridStyle(theme.grid);

  // 4. 加载装饰物
  if (theme.decorations) {
    await this.loadDecorations(theme.decorations);
  }

  // 5. 更新高亮配置
  this.currentHighlight = theme.highlight;
}
```

---

## 四、模块重构设计

### 4.1 BoardRenderer 拆分策略

**当前结构**：
```
BoardRenderer.ts (800行)
├── 底座网格渲染
├── 网格线框渲染
├── 棋子材质/几何体（硬编码）← 需拆分
├── 棋子下落动画（硬编码）← 需拆分
├── 悬停预览棋子 ← 需拆分
└── 高亮显示
```

**重构后结构**：
```
BoardRenderer.ts（精简版，300行）
├── 底座网格渲染（保留）
├── 网格线框渲染（保留）
├── applyTheme(theme) ← 新增
└── 高亮显示（保留）

PieceRenderer.ts（新增，400行）
├── 棋子Mesh池管理
├── 棋子材质/几何体（素材驱动）
├── 棋子添加/移除
├── 姿态切换（活跃↔休眠）
└── 与AnimationController协作
```

**拆分边界定义**：

| 功能 | 保留在 BoardRenderer | 移到 PieceRenderer |
|------|---------------------|-------------------|
| 底座网格 | ✓ | - |
| 网格线框 | ✓ | - |
| 棋盘材质 | ✓（主题化） | - |
| 棋子Mesh | - | ✓ |
| 棋子材质 | - | ✓ |
| 棋子几何体 | - | ✓ |
| 棋子下落 | - | ✓（委托AnimationController） |
| 悬停预览 | - | ✓ |
| 高亮格子 | ✓ | - |
| 竖直网格线 | ✓ | - |

### 4.2 BoardRenderer 改造设计

```typescript
// ==================== src/rendering/BoardRenderer.ts 改造 ====================

/**
 * BoardRenderer（精简版）
 * 只负责棋盘本身渲染
 */
export class BoardRenderer {
  private scene: THREE.Scene | null = null;
  private boardHeight: number;

  // 底座网格组
  private baseGrid: THREE.Group;
  // 线框组
  private gridLines: THREE.Group;

  // 当前主题配置（新增）
  private currentTheme: BoardTheme | null = null;

  // 底座材质（主题化）
  private baseMaterial: THREE.MeshStandardMaterial | null = null;
  private gridMaterial: THREE.LineBasicMaterial | null = null;

  // 高亮相关（保留）
  private highlightCell: THREE.Mesh | null = null;
  private verticalLines: THREE.Group | null = null;

  constructor(boardHeight: number) {
    this.boardHeight = boardHeight;
    this.baseGrid = new THREE.Group();
    this.gridLines = new THREE.Group();
  }

  /**
   * 初始化（保持原接口）
   */
  init(scene: THREE.Scene): void {
    this.scene = scene;
    // 使用默认主题（经典）
    this.createBaseGrid();
    this.createGridLines();
    scene.add(this.baseGrid);
    scene.add(this.gridLines);
  }

  /**
   * 应用主题（新增接口）
   * @param theme 棋盘主题配置
   */
  applyTheme(theme: BoardTheme): void {
    this.currentTheme = theme;
    this.updateBaseMaterial();
    this.updateGridMaterial();
  }

  /**
   * 更新底座材质（主题化）
   */
  private updateBaseMaterial(): void {
    if (!this.currentTheme || !this.baseMaterial) return;

    this.baseMaterial.color.setHex(this.currentTheme.baseColor);
    if (this.currentTheme.baseTexture) {
      // TODO: 加载纹理贴图（委托ThemeLoader）
    }
  }

  /**
   * 更新网格材质（主题化）
   */
  private updateGridMaterial(): void {
    if (!this.currentTheme || !this.gridMaterial) return;

    this.gridMaterial.color.setHex(this.currentTheme.gridColor);
    this.gridMaterial.opacity = this.currentTheme.gridOpacity;

    // 机甲主题发光效果
    if (this.currentTheme.gridEmissive) {
      // 网格线发光需要特殊处理（使用Mesh代替Line）
    }
  }

  /**
   * 更新棋盘高度（保留）
   */
  updateBoardHeight(newHeight: number): void {
    // ... 保持原逻辑
  }

  /**
   * 高亮显示（保留）
   */
  highlightColumn(x: number, y: number, z?: number, hasPreview: boolean = false): void {
    // ... 保持原逻辑
  }

  /**
   * 清理（保留）
   */
  dispose(): void {
    // 清理底座网格
    this.baseGrid.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    });
    if (this.scene) {
      this.scene.remove(this.baseGrid);
      this.scene.remove(this.gridLines);
    }
  }
}
```

### 4.3 PieceRenderer 新模块设计

```typescript
// ==================== src/rendering/PieceRenderer.ts 新增 ====================

import * as THREE from 'three';
import type { Position, Player, PieceState } from '@/types';
import type { ThemeConfig, PieceTheme } from '@/types/theme';
import { AnimationController } from '@/core/AnimationController';

/**
 * 棋子Mesh包装结构
 */
export interface PieceMesh {
  mesh: THREE.Object3D;      // 棋子Mesh（可能是Group）
  position: Position;        // 棋盘位置
  player: Player;            // 所属玩家
  state: PieceState;         // 当前状态
  isActive: boolean;         // 是否活跃（顶层）
}

/**
 * PieceRenderer 棋子渲染器
 * 素材驱动，管理棋子Mesh池
 */
export class PieceRenderer {
  private scene: THREE.Scene | null = null;
  private animationController: AnimationController;

  // 当前主题配置
  private currentTheme: ThemeConfig | null = null;

  // 棋子Mesh池（位置 -> PieceMesh）
  private pieces: Map<string, PieceMesh> = new Map();

  // 棋子素材缓存（黑/白各两种姿态）
  private assetCache: {
    blackActive: THREE.Object3D | null;
    blackSleep: THREE.Object3D | null;
    whiteActive: THREE.Object3D | null;
    whiteSleep: THREE.Object3D | null;
  } = {
    blackActive: null,
    blackSleep: null,
    whiteActive: null,
    whiteSleep: null,
  };

  // 几何体缓存（经典主题用）
  private geometryCache: THREE.CylinderGeometry | null = null;
  private materialCache: {
    black: THREE.MeshStandardMaterial | null;
    white: THREE.MeshStandardMaterial | null;
  } = {
    black: null,
    white: null,
  };

  constructor(animationController: AnimationController) {
    this.animationController = animationController;
  }

  /**
   * 初始化（加载主题素材）
   * @param scene Three.js场景
   * @param theme 主题配置
   */
  async init(scene: THREE.Scene, theme: ThemeConfig): Promise<void> {
    this.scene = scene;
    this.currentTheme = theme;

    // 预加载棋子素材
    await this.preloadAssets(theme);

    console.log(`✅ PieceRenderer initialized with theme: ${theme.id}`);
  }

  /**
   * 预加载素材
   * 根据主题类型选择加载方式
   */
  private async preloadAssets(theme: ThemeConfig): Promise<void> {
    const { pieces } = theme;

    // 检查是几何体还是模型
    if (pieces.black.geometry) {
      // 经典主题：创建几何体和材质
      this.createGeometryAndMaterial(pieces);
    } else {
      // 猫咪/机甲主题：加载GLB模型
      await this.loadModels(pieces);
    }
  }

  /**
   * 创建几何体和材质（经典主题）
   */
  private createGeometryAndMaterial(pieces: { black: PieceTheme; white: PieceTheme }): void {
    const geo = pieces.black.geometry!;
    this.geometryCache = new THREE.CylinderGeometry(
      geo.radius || 0.4,
      geo.radius || 0.4,
      geo.height || 0.45,
      32
    );

    this.materialCache.black = new THREE.MeshStandardMaterial({
      color: geo.color,
      metalness: geo.metalness,
      roughness: geo.roughness,
    });

    this.materialCache.white = new THREE.MeshStandardMaterial({
      color: pieces.white.geometry!.color,
      metalness: pieces.white.geometry!.metalness,
      roughness: pieces.white.geometry!.roughness,
    });
  }

  /**
   * 加载GLB模型（猫咪/机甲主题）
   */
  private async loadModels(pieces: { black: PieceTheme; white: PieceTheme }): Promise<void> {
    // 由ThemeLoader统一加载，这里从缓存获取
    // 实际加载逻辑在ThemeLoader中
  }

  /**
   * 添加棋子
   * @param pos 位置
   * @param player 玩家
   * @param isTop 是否顶层（决定初始状态）
   * @returns 棋子Mesh和动画Promise
   */
  addPiece(pos: Position, player: Player, isTop: boolean): { piece: PieceMesh; animation: Promise<void> } {
    if (!this.scene || !this.currentTheme) {
      throw new Error('PieceRenderer not initialized');
    }

    // 创建棋子Mesh
    const mesh = this.createPieceMesh(player, isTop ? 'IDLE' : 'SLEEP');

    // 设置位置（从上方开始下落）
    const cellSize = 1; // 从BoardConfig获取
    const cellHeight = 0.5;
    const targetY = pos.z * cellHeight + mesh.position.y / 2;
    mesh.position.set(
      pos.x * cellSize + cellSize / 2,
      this.boardHeight * cellHeight + 15, // 下落起点
      pos.y * cellSize + cellSize / 2
    );

    // 创建PieceMesh包装
    const pieceMesh: PieceMesh = {
      mesh,
      position: pos,
      player,
      state: 'FALL', // 初始状态：下落中
      isActive: false, // 下落期间不是活跃状态
    };

    // 注册到池
    this.pieces.set(this.encodePosition(pos), pieceMesh);

    // 添加到场景
    this.scene.add(mesh);

    // 启动下落动画（委托AnimationController）
    const animation = this.animationController.playFallAnimation(pieceMesh, targetY);

    return { piece: pieceMesh, animation };
  }

  /**
   * 创建棋子Mesh
   * @param player 玩家
   * @param state 状态（决定姿态）
   */
  private createPieceMesh(player: Player, state: PieceState): THREE.Object3D {
    if (this.currentTheme!.pieces.black.geometry) {
      // 经典主题：使用几何体
      const geometry = this.geometryCache!;
      const material = player === 'BLACK'
        ? this.materialCache.black!
        : this.materialCache.white!;
      return new THREE.Mesh(geometry, material.clone());
    } else {
      // 猫咪/机甲主题：使用模型
      const isSleep = state === 'SLEEP';
      const cachedModel = this.getCachedModel(player, isSleep);
      return cachedModel.clone();
    }
  }

  /**
   * 获取缓存的模型
   */
  private getCachedModel(player: Player, isSleep: boolean): THREE.Object3D {
    const key = `${player}_${isSleep ? 'Sleep' : 'Active'}`;
    switch (key) {
      case 'BLACK_Active': return this.assetCache.blackActive!;
      case 'BLACK_Sleep': return this.assetCache.blackSleep!;
      case 'WHITE_Active': return this.assetCache.whiteActive!;
      case 'WHITE_Sleep': return this.assetCache.whiteSleep!;
    }
  }

  /**
   * 更新棋子状态
   * 可能需要切换姿态（活跃↔休眠）
   */
  updatePieceState(pos: Position, newState: PieceState): void {
    const piece = this.pieces.get(this.encodePosition(pos));
    if (!piece) return;

    const oldState = piece.state;
    piece.state = newState;

    // 状态转换：活跃↔休眠需要切换模型
    if (this.needsMeshSwitch(oldState, newState)) {
      this.switchPieceMesh(piece, newState);
    }
  }

  /**
   * 判断是否需要切换Mesh
   */
  private needsMeshSwitch(oldState: PieceState, newState: PieceState): boolean {
    const sleepStates = ['SLEEP'];
    const activeStates = ['IDLE', 'HOVER', 'IMPACT', 'WIN', 'LOSE'];

    return sleepStates.includes(oldState) !== sleepStates.includes(newState);
  }

  /**
   * 切换棋子Mesh（姿态变化）
   */
  private switchPieceMesh(piece: PieceMesh, newState: PieceState): void {
    if (!this.scene) return;

    // 保存位置
    const position = piece.mesh.position.clone();
    const rotation = piece.mesh.rotation.clone();

    // 移除旧Mesh
    this.scene.remove(piece.mesh);

    // 创建新Mesh
    const newMesh = this.createPieceMesh(piece.player, newState);
    newMesh.position.copy(position);
    newMesh.rotation.copy(rotation);

    // 更新引用
    piece.mesh = newMesh;

    // 添加到场景
    this.scene.add(newMesh);
  }

  /**
   * 获取棋子Mesh
   */
  getPieceMesh(pos: Position): PieceMesh | null {
    return this.pieces.get(this.encodePosition(pos));
  }

  /**
   * 获取所有棋子Mesh（用于批量操作）
   */
  getAllPieceMeshes(): PieceMesh[] {
    return Array.from(this.pieces.values());
  }

  /**
   * 清除所有棋子
   */
  clearAll(): void {
    if (this.scene) {
      this.pieces.forEach(piece => {
        this.scene!.remove(piece.mesh);
        // 清理资源
        if (piece.mesh instanceof THREE.Mesh) {
          piece.mesh.geometry.dispose();
          (piece.mesh.material as THREE.Material).dispose();
        }
      });
    }
    this.pieces.clear();
  }

  /**
   * 应用新主题（切换主题时调用）
   */
  async applyTheme(theme: ThemeConfig): Promise<void> {
    this.currentTheme = theme;

    // 清理旧素材缓存
    this.clearAssetCache();

    // 预加载新素材
    await this.preloadAssets(theme);

    // 重新创建所有棋子Mesh
    this.recreateAllPieces();
  }

  /**
   * 重新创建所有棋子（主题切换时）
   * v1.2 修正：先保存位置/旋转数据，再清除旧Mesh
   */
  private recreateAllPieces(): void {
    if (!this.scene) return;

    // v1.2 修正：先保存所有棋子的位置/旋转/状态数据
    const piecesData = Array.from(this.pieces.values()).map(piece => ({
      position: piece.position.clone(),
      worldPosition: piece.mesh.position.clone(),      // 世界坐标位置
      rotation: piece.mesh.rotation.clone(),           // 旋转角度
      player: piece.player,
      state: piece.state,
      isActive: piece.isActive,
    }));

    // 清除旧棋子（dispose 资源）
    this.clearAll();

    // 使用保存的数据重新创建棋子
    piecesData.forEach(data => {
      const newMesh = this.createPieceMesh(data.player, data.state);
      // 恢复位置和旋转
      newMesh.position.copy(data.worldPosition);
      newMesh.rotation.copy(data.rotation);

      // 重新注册到池
      const pieceMesh: PieceMesh = {
        mesh: newMesh,
        position: data.position,
        player: data.player,
        state: data.state,
        isActive: data.isActive,
      };
      this.scene!.add(newMesh);
      this.pieces.set(this.encodePosition(data.position), pieceMesh);

      // 若是活跃状态，启动呼吸动画
      if (data.isActive && data.state === 'IDLE') {
        this.animationController.startIdleAnimation(pieceMesh);
      }
    });
  }

  /**
   * 位置编码
   */
  private encodePosition(pos: Position): string {
    return `${pos.x},${pos.y},${pos.z}`;
  }

  /**
   * 清理素材缓存
   */
  private clearAssetCache(): void {
    // 清理几何体
    if (this.geometryCache) {
      this.geometryCache.dispose();
      this.geometryCache = null;
    }
    // 清理材质
    if (this.materialCache.black) {
      this.materialCache.black.dispose();
      this.materialCache.black = null;
    }
    if (this.materialCache.white) {
      this.materialCache.white.dispose();
      this.materialCache.white = null;
    }
    // 清理模型（GLB资源由ThemeLoader统一管理）
  }
}
```

---

## 五、状态机设计（扩展性为核心）

### 5.1 状态转换表设计

**设计目标**：
- 明确状态转换规则
- 支持未来扩展新状态
- 异常状态自动回退

```typescript
// ==================== src/core/PieceStateManager.ts ====================

import type { Position, Player, PieceState, PieceEvent } from '@/types';

/**
 * 状态转换规则
 */
interface StateTransitionRule {
  from: PieceState | '*';    // 当前状态（'*'表示任意状态）
  event: PieceEvent;         // 触发事件
  to: PieceState;            // 新状态
  action: 'start_idle' | 'stop_idle' | 'play_hover' | 'stop_hover' |
          'play_impact' | 'play_win' | 'play_lose' | 'switch_sleep' |
          'switch_active' | 'clear_animation' | 'none';
  afterAction?: 'start_idle' | 'none';  // 动画结束后的回调
}

/**
 * 状态转换表（核心数据）
 * 新增状态只需添加新规则
 */
const STATE_TRANSITION_TABLE: StateTransitionRule[] = [
  // SLEEP → IDLE（被移除覆盖）
  { from: 'SLEEP', event: 'UNCOVERED', to: 'IDLE', action: 'start_idle' },

  // IDLE → SLEEP（被覆盖）
  { from: 'IDLE', event: 'COVERED', to: 'SLEEP', action: 'switch_sleep' },

  // IDLE → HOVER（悬停开始）
  { from: 'IDLE', event: 'HOVER_START', to: 'HOVER', action: 'play_hover' },

  // HOVER → IDLE（悬停结束）
  { from: 'HOVER', event: 'HOVER_END', to: 'IDLE', action: 'stop_hover', afterAction: 'start_idle' },

  // HOVER → IMPACT（悬停中棋子落下）
  { from: 'HOVER', event: 'FALL_IMPACT', to: 'IMPACT', action: 'play_impact', afterAction: 'start_idle' },

  // IDLE → IMPACT（顶层棋子被冲击）
  { from: 'IDLE', event: 'FALL_IMPACT', to: 'IMPACT', action: 'play_impact', afterAction: 'start_idle' },

  // FALL → IDLE（下落动画结束）
  { from: 'FALL', event: 'UNCOVERED', to: 'IDLE', action: 'start_idle' }, // 特殊：下落结束视为UNCOVERED

  // IMPACT → IDLE（对抗动画结束）
  { from: 'IMPACT', event: 'UNCOVERED', to: 'IDLE', action: 'start_idle' },

  // 任意状态 → WIN
  { from: '*', event: 'GAME_WIN', to: 'WIN', action: 'play_win' },

  // 任意状态 → LOSE
  { from: '*', event: 'GAME_LOSE', to: 'LOSE', action: 'play_lose' },

  // WIN/LOSE → 重置
  { from: 'WIN', event: 'GAME_RESET', to: 'SLEEP', action: 'clear_animation' },
  { from: 'LOSE', event: 'GAME_RESET', to: 'SLEEP', action: 'clear_animation' },
];

/**
 * PieceStateManager 棋子状态管理器
 * 管理所有棋子的状态，触发动画
 */
export class PieceStateManager {
  // 棋子状态缓存（位置 -> 状态）
  private stateCache: Map<string, PieceState> = new Map();

  // 棋子是否顶层缓存
  private topLayerCache: Map<string, boolean> = new Map();

  // 状态变更回调
  private onStateChangeCallback: ((pos: Position, newState: PieceState, action: string) => void) | null = null;

  /**
   * 处理事件
   * @param pos 棋子位置
   * @param event 事件类型
   */
  processEvent(pos: Position, event: PieceEvent): void {
    const key = this.encodePosition(pos);
    const currentState = this.stateCache.get(key) || 'SLEEP';

    // 查找转换规则
    const rule = this.findTransitionRule(currentState, event);
    if (!rule) {
      console.warn(`[PieceStateManager] No transition rule for ${currentState} + ${event}`);
      return;
    }

    // 更新状态缓存
    this.stateCache.set(key, rule.to);

    // 触发回调（通知AnimationController）
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(pos, rule.to, rule.action);
    }

    console.log(`[PieceStateManager] ${key}: ${currentState} → ${rule.to} (${event})`);
  }

  /**
   * 查找转换规则
   */
  private findTransitionRule(currentState: PieceState, event: PieceEvent): StateTransitionRule | null {
    // 优先查找精确匹配
    const exactMatch = STATE_TRANSITION_TABLE.find(
      r => r.from === currentState && r.event === event
    );
    if (exactMatch) return exactMatch;

    // 其次查找通配符匹配
    return STATE_TRANSITION_TABLE.find(
      r => r.from === '*' && r.event === event
    );
  }

  /**
   * 获取棋子状态
   */
  getState(pos: Position): PieceState {
    return this.stateCache.get(this.encodePosition(pos)) || 'SLEEP';
  }

  /**
   * 设置棋子状态（直接设置，用于初始化）
   */
  setState(pos: Position, state: PieceState): void {
    this.stateCache.set(this.encodePosition(pos), state);
  }

  /**
   * 标记棋子是否顶层
   */
  setTopLayer(pos: Position, isTop: boolean): void {
    this.topLayerCache.set(this.encodePosition(pos), isTop);
  }

  /**
   * 判断棋子是否顶层
   */
  isTopLayer(pos: Position): boolean {
    return this.topLayerCache.get(this.encodePosition(pos)) || false;
  }

  /**
   * 获取所有活跃棋子（顶层 + IDLE/HOVER状态）
   */
  getActivePieces(): Position[] {
    const activePieces: Position[] = [];
    this.stateCache.forEach((state, key) => {
      if (state === 'IDLE' || state === 'HOVER') {
        const [x, y, z] = key.split(',').map(Number);
        activePieces.push({ x, y, z });
      }
    });
    return activePieces;
  }

  /**
   * 注册状态变更回调
   */
  onStateChange(callback: (pos: Position, newState: PieceState, action: string) => void): void {
    this.onStateChangeCallback = callback;
  }

  /**
   * 重置所有状态（游戏重置时）
   */
  reset(): void {
    this.stateCache.clear();
    this.topLayerCache.clear();
  }

  /**
   * 位置编码
   */
  private encodePosition(pos: Position): string {
    return `${pos.x},${pos.y},${pos.z}`;
  }
}
```

---

## 五.1、AnimationController 详细设计（v1.2 新增）

### 5.1.1 模块背景与必要性

- **为什么需要**：统一管理循环动画（呼吸）和触发动画（悬停、下落、对抗、胜负），避免动画散落各处导致冲突和性能问题
- **如果没有**：动画逻辑散落在 PieceRenderer 和 BoardRenderer 中，难以协调，可能阻塞渲染帧率

### 5.1.2 工作原理

**核心机制**：
- **循环动画**：使用 `requestAnimationFrame` 每帧更新活跃棋子的呼吸动画
- **触发动画**：事件触发时播放一次性动画，完成后自动停止
- **持续动画**：悬停期间持续播放，离开时停止
- **Promise 完成通知**：下落/对抗动画使用 Promise 通知完成，支持链式调用

**数据流向**：
```
PieceStateManager.processEvent(pos, event)
    ↓
触发回调 → AnimationController.playXXX(piece, params)
    ↓
┌─────────────────────────────────────────────────┐
│ 循环动画（idleList）：                           │
│   requestAnimationFrame → updateAllIdle(delta) │
│   → 每帧计算缩放/光晕 → 更新 Mesh                │
│                                                 │
│ 触发动画（一次性）：                             │
│   startAnimation(piece, config)                 │
│   → 设置 startTime → 每帧检查进度               │
│   → duration 结束 → resolve Promise            │
│                                                 │
│ 持续动画（hover）：                              │
│   playHover(piece, isOwn) → 添加到 hoverList    │
│   → 每帧更新 → stopHover(piece) 移除            │
└─────────────────────────────────────────────────┘
```

### 5.1.3 技术规格

```typescript
// ==================== src/core/AnimationController.ts ====================

import * as THREE from 'three';
import type { PieceMesh, AnimationSpec, CodeAnimationConfig } from '@/types/theme';
import type { ThemeConfig } from '@/types/theme';

/**
 * 动画执行器
 * 负责实际执行代码动画逻辑
 */
interface AnimationRunner {
  piece: PieceMesh;
  startTime: number;
  duration: number;
  config: CodeAnimationConfig;
  resolve?: () => void;          // Promise resolve 回调
  loop?: boolean;                 // 是否循环
}

/**
 * AnimationController 动画控制器
 * v1.2 详细设计：统一管理循环/触发/持续动画
 */
export class AnimationController {
  // 当前主题动画配置
  private themeConfig: ThemeConfig | null = null;

  // 循环动画列表（呼吸动画）
  private idleList: Set<PieceMesh> = new Set();

  // 触发动画队列（一次性动画）
  private triggerQueue: AnimationRunner[] = [];

  // 悬停动画列表（持续型）
  private hoverList: Map<PieceMesh, AnimationRunner> = new Map();

  // 动画帧时间戳
  private lastFrameTime: number = 0;

  // 动画帧更新ID
  private animationFrameId: number | null = null;

  /**
   * 设置主题配置
   */
  setThemeConfig(config: ThemeConfig): void {
    this.themeConfig = config;
  }

  /**
   * 启动动画循环（游戏开始时调用）
   */
  startAnimationLoop(): void {
    this.lastFrameTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.updateFrame.bind(this));
  }

  /**
   * 停止动画循环（游戏结束时调用）
   */
  stopAnimationLoop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.idleList.clear();
    this.hoverList.clear();
    this.triggerQueue = [];
  }

  /**
   * 动画帧更新（核心循环）
   * @param timestamp 当前时间戳（performance.now）
   */
  private updateFrame(timestamp: number): void {
    const deltaTime = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;

    // 1. 更新循环动画（呼吸）
    this.updateAllIdle(deltaTime);

    // 2. 更新触发动画（一次性）
    this.updateTriggerAnimations(timestamp);

    // 3. 更新悬停动画（持续）
    this.updateHoverAnimations(deltaTime);

    // 继续下一帧
    this.animationFrameId = requestAnimationFrame(this.updateFrame.bind(this));
  }

  // ==================== 循环动画（呼吸） ====================

  /**
   * 启动呼吸动画（顶层棋子）
   * @param piece 棋子Mesh
   */
  startIdleAnimation(piece: PieceMesh): void {
    if (!this.themeConfig?.animations.hasIdleAnimation) return;
    this.idleList.add(piece);
  }

  /**
   * 停止呼吸动画（棋子被覆盖）
   * @param piece 棋子Mesh
   */
  stopIdleAnimation(piece: PieceMesh): void {
    this.idleList.delete(piece);
  }

  /**
   * 更新所有呼吸动画
   * @param deltaTime 时间差（ms）
   */
  private updateAllIdle(deltaTime: number): void {
    const idleConfig = this.themeConfig?.animations.idleAnimation;
    if (!idleConfig) return;

    this.idleList.forEach(piece => {
      this.applyCodeAnimation(piece.mesh, idleConfig.codeAnimation!, deltaTime, true);
    });
  }

  // ==================== 触发动画（一次性） ====================

  /**
   * 播放下落动画
   * @param piece 新落下的棋子
   * @param targetY 目标Y坐标
   * @param isOwnBase 底部是否己方棋子
   * @returns Promise（动画完成时resolve）
   */
  playFallAnimation(piece: PieceMesh, targetY: number, isOwnBase: boolean): Promise<void> {
    return new Promise(resolve => {
      const spec = isOwnBase
        ? this.themeConfig!.animations.fall.own
        : this.themeConfig!.animations.fall.default;

      const runner: AnimationRunner = {
        piece,
        startTime: performance.now(),
        duration: spec.duration,
        config: spec.codeAnimation!,
        resolve: () => {
          // 下落完成后设置位置
          piece.mesh.position.y = targetY;
          resolve();
        },
      };
      this.triggerQueue.push(runner);
    });
  }

  /**
   * 播放对抗动画
   * @param piece 承接棋子
   * @param isOwn 落下的棋子是否己方
   * @returns Promise（动画完成时resolve）
   */
  playImpactAnimation(piece: PieceMesh, isOwn: boolean): Promise<void> {
    return new Promise(resolve => {
      const spec = isOwn
        ? this.themeConfig!.animations.impact.own
        : this.themeConfig!.animations.impact.opponent;

      const runner: AnimationRunner = {
        piece,
        startTime: performance.now(),
        duration: spec.duration,
        config: spec.codeAnimation!,
        resolve,
      };
      this.triggerQueue.push(runner);
    });
  }

  /**
   * 播放胜利动画
   * @param piece 胜利棋子
   */
  playWinAnimation(piece: PieceMesh): void {
    const spec = this.themeConfig!.animations.win;
    const runner: AnimationRunner = {
      piece,
      startTime: performance.now(),
      duration: spec.duration,
      config: spec.codeAnimation!,
      loop: spec.loop || false,
    };
    this.triggerQueue.push(runner);
  }

  /**
   * 播放失败动画
   * @param piece 失败棋子
   */
  playLoseAnimation(piece: PieceMesh): void {
    const spec = this.themeConfig!.animations.lose;
    const runner: AnimationRunner = {
      piece,
      startTime: performance.now(),
      duration: spec.duration,
      config: spec.codeAnimation!,
      loop: spec.loop || false,
    };
    this.triggerQueue.push(runner);
  }

  /**
   * 批量播放胜利动画
   * @param pieces 所有胜利棋子
   */
  playWinAnimationBatch(pieces: PieceMesh[]): void {
    pieces.forEach(p => this.playWinAnimation(p));
  }

  /**
   * 批量播放失败动画
   * @param pieces 所有失败棋子
   */
  playLoseAnimationBatch(pieces: PieceMesh[]): void {
    pieces.forEach(p => this.playLoseAnimation(p));
  }

  /**
   * 更新触发动画队列
   * @param timestamp 当前时间戳
   */
  private updateTriggerAnimations(timestamp: number): void {
    const toRemove: AnimationRunner[] = [];

    this.triggerQueue.forEach(runner => {
      const elapsed = timestamp - runner.startTime;
      const progress = elapsed / runner.duration;

      if (progress < 1) {
        // 动画进行中
        this.applyCodeAnimation(runner.piece.mesh, runner.config, elapsed, false, progress);
      } else if (runner.loop) {
        // 循环动画：重置 startTime
        runner.startTime = timestamp;
        this.applyCodeAnimation(runner.piece.mesh, runner.config, elapsed, false, 1);
      } else {
        // 一次性动画完成
        runner.resolve?.();
        toRemove.push(runner);
      }
    });

    // 移除完成的动画
    toRemove.forEach(r => {
      const idx = this.triggerQueue.indexOf(r);
      if (idx >= 0) this.triggerQueue.splice(idx, 1);
    });
  }

  // ==================== 悬停动画（持续型） ====================

  /**
   * 播放悬停动画
   * @param piece 被悬停的棋子
   * @param isOwn 是否己方棋子
   */
  playHoverAnimation(piece: PieceMesh, isOwn: boolean): void {
    // 先停止呼吸动画
    this.stopIdleAnimation(piece);

    const spec = isOwn
      ? this.themeConfig!.animations.hover.own
      : this.themeConfig!.animations.hover.opponent;

    const runner: AnimationRunner = {
      piece,
      startTime: performance.now(),
      duration: spec.duration,
      config: spec.codeAnimation!,
      loop: true,  // 悬停动画持续播放
    };
    this.hoverList.set(piece, runner);
  }

  /**
   * 停止悬停动画
   * @param piece 棋子
   */
  stopHoverAnimation(piece: PieceMesh): void {
    this.hoverList.delete(piece);
    // 恢复呼吸动画（若是顶层）
    if (piece.isActive) {
      this.startIdleAnimation(piece);
    }
  }

  /**
   * 更新悬停动画
   * @param deltaTime 时间差（ms）
   */
  private updateHoverAnimations(deltaTime: number): void {
    this.hoverList.forEach((runner, piece) => {
      this.applyCodeAnimation(piece.mesh, runner.config, deltaTime, true);
    });
  }

  // ==================== 代码动画执行器 ====================

  /**
   * 应用代码动画配置到 Mesh
   * @param mesh 目标Mesh
   * @param config 动画配置
   * @param elapsed 已经过时间（ms）
   * @param isLoop 是否循环动画
   * @param progress 进度（0-1），仅触发动画使用
   */
  private applyCodeAnimation(
    mesh: THREE.Object3D,
    config: CodeAnimationConfig,
    elapsed: number,
    isLoop: boolean,
    progress?: number
  ): void {
    // 缩放动画
    if (config.scale) {
      const { pattern, intensity, axis } = config.scale;
      const period = 2000;  // 2秒周期
      const phase = isLoop
        ? (elapsed % period) / period  // 循环：使用周期相位
        : progress || 0;               // 触发：使用进度

      let scaleMultiplier = 1;
      if (pattern === 'pulse') {
        scaleMultiplier = 1 + Math.sin(phase * Math.PI * 2) * intensity;
      } else if (pattern === 'expand') {
        scaleMultiplier = 1 + phase * intensity;
      } else if (pattern === 'contract') {
        scaleMultiplier = 1 - phase * intensity;
      }

      if (axis === 'y') {
        mesh.scale.y = scaleMultiplier;
      } else {
        mesh.scale.setScalar(scaleMultiplier);
      }
    }

    // 旋转动画
    if (config.rotation) {
      const { axis, angle, lookAt } = config.rotation;
      if (lookAt) {
        // 看向鼠标位置（需要外部传入鼠标位置，此处略）
        // 实际实现时需要在 AnimationController 中维护 mouseWorldPosition
      } else if (angle) {
        const targetAngle = THREE.MathUtils.degToRad(angle);
        mesh.rotation[axis] = targetAngle * (progress || 0);
      }
    }

    // 位置动画
    if (config.position) {
      const { pattern, intensity, axis } = config.position;
      let offset = 0;

      if (pattern === 'bounce') {
        offset = Math.sin((progress || 0) * Math.PI) * intensity;
      } else if (pattern === 'shake') {
        offset = Math.sin(elapsed * 0.1) * intensity;
      } else if (pattern === 'offset') {
        offset = intensity * (progress || 0);
      }

      if (axis === 'y') {
        mesh.position.y += offset;
      } else {
        mesh.position.x += offset * Math.random();
        mesh.position.z += offset * Math.random();
      }
    }

    // 材质动画
    if (config.material) {
      const { pattern, color, intensity } = config.material;
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          if (pattern === 'emissive_pulse') {
            const phase = isLoop
              ? (elapsed % 1000) / 1000
              : (progress || 0);
            child.material.emissive = new THREE.Color(color || 0xffffff);
            child.material.emissiveIntensity = (intensity || 0.5) * (0.5 + Math.sin(phase * Math.PI * 2) * 0.5);
          }
        }
      });
    }
  }

  // ==================== 状态切换 ====================

  /**
   * 切换到休眠姿态（换模型）
   * @param piece 棋子
   */
  switchToSleep(piece: PieceMesh): void {
    // 停止呼吸动画
    this.stopIdleAnimation(piece);
    // 实际模型切换由 PieceRenderer 负责
  }

  /**
   * 切换到活跃姿态
   * @param piece 棋子
   */
  switchToActive(piece: PieceMesh): void {
    // 启动呼吸动画
    if (piece.isActive) {
      this.startIdleAnimation(piece);
    }
  }

  /**
   * 清除所有动画（游戏重置时）
   */
  clearAllAnimations(): void {
    this.idleList.clear();
    this.hoverList.clear();
    this.triggerQueue = [];
  }
}
```

### 5.1.4 与其他模块的关系

| 模块 | 关系 | 说明 |
|------|------|------|
| PieceStateManager | 被调用 | 状态变更触发动画播放 |
| PieceRenderer | 协作 | 动画执行时修改 Mesh 属性 |
| ThemeConfig | 依赖 | 从配置读取动画参数 |
| GameController | 管理 | 启动/停止动画循环 |

### 5.1.5 接口定义摘要

```typescript
interface IAnimationController {
  // 循环动画
  startIdleAnimation(piece: PieceMesh): void;
  stopIdleAnimation(piece: PieceMesh): void;

  // 触发动画（一次性）
  playFallAnimation(piece: PieceMesh, targetY: number, isOwnBase: boolean): Promise<void>;
  playImpactAnimation(piece: PieceMesh, isOwn: boolean): Promise<void>;
  playWinAnimation(piece: PieceMesh): void;
  playLoseAnimation(piece: PieceMesh): void;
  playWinAnimationBatch(pieces: PieceMesh[]): void;
  playLoseAnimationBatch(pieces: PieceMesh[]): void;

  // 悬停动画（持续型）
  playHoverAnimation(piece: PieceMesh, isOwn: boolean): void;
  stopHoverAnimation(piece: PieceMesh): void;

  // 状态切换
  switchToSleep(piece: PieceMesh): void;
  switchToActive(piece: PieceMesh): void;

  // 生命周期
  startAnimationLoop(): void;
  stopAnimationLoop(): void;
  clearAllAnimations(): void;

  // 配置
  setThemeConfig(config: ThemeConfig): void;
}
```

---

## 六、主题扩展机制设计

### 6.1 主题注册表设计

```typescript
// ==================== src/core/ThemeManager.ts ====================

import type { ThemeId, ThemeConfig } from '@/types/theme';
import { ThemeLoader } from './ThemeLoader';
import { PieceRenderer } from '@/rendering/PieceRenderer';
import { BoardRenderer } from '@/rendering/BoardRenderer';
import { EnvironmentRenderer } from '@/rendering/EnvironmentRenderer';

/**
 * 主题注册表
 * 新增主题只需在此注册
 */
const THEME_REGISTRY: Record<ThemeId, () => ThemeConfig> = {
  CLASSIC: () => import('@/config/themes/classicTheme').then(m => m.CLASSIC_THEME),
  CAT: () => import('@/config/themes/catTheme').then(m => m.CAT_THEME),      // Phase 8
  MECHA: () => import('@/config/themes/mechaTheme').then(m => m.MECHA_THEME), // Phase 9
};

/**
 * ThemeManager 主题管理器
 * 统一管理主题切换
 */
export class ThemeManager {
  private currentTheme: ThemeId = 'CLASSIC';
  private themeLoader: ThemeLoader;
  private pieceRenderer: PieceRenderer;
  private boardRenderer: BoardRenderer;
  private environmentRenderer: EnvironmentRenderer;

  // 主题配置缓存
  private configCache: Map<ThemeId, ThemeConfig> = new Map();

  // 状态变更回调
  private onThemeChangeCallback: ((theme: ThemeId) => void) | null = null;

  constructor(
    loader: ThemeLoader,
    piece: PieceRenderer,
    board: BoardRenderer,
    env: EnvironmentRenderer
  ) {
    this.themeLoader = loader;
    this.pieceRenderer = piece;
    this.boardRenderer = board;
    this.environmentRenderer = env;
  }

  /**
   * 获取当前主题
   */
  getCurrentTheme(): ThemeId {
    return this.currentTheme;
  }

  /**
   * 获取主题配置
   */
  async getThemeConfig(id: ThemeId): Promise<ThemeConfig> {
    // 检查缓存
    if (this.configCache.has(id)) {
      return this.configCache.get(id)!;
    }

    // 加载配置
    const loader = THEME_REGISTRY[id];
    if (!loader) {
      throw new Error(`Unknown theme: ${id}`);
    }

    const config = await loader();
    this.configCache.set(id, config);
    return config;
  }

  /**
   * 切换主题
   * @param id 目标主题ID
   */
  async setTheme(id: ThemeId): Promise<void> {
    console.log(`[ThemeManager] Switching to theme: ${id}`);

    // 加载主题配置
    const config = await this.getThemeConfig(id);

    // 加载素材（ThemeLoader负责）
    await this.themeLoader.loadTheme(config);

    // 应用主题到各渲染器
    this.boardRenderer.applyTheme(config.board);
    await this.pieceRenderer.applyTheme(config);
    await this.environmentRenderer.applyTheme(config.environment);

    // 更新当前主题
    this.currentTheme = id;

    // 触发回调
    if (this.onThemeChangeCallback) {
      this.onThemeChangeCallback(id);
    }

    console.log(`✅ Theme switched to: ${id}`);
  }

  /**
   * 检查主题是否已加载
   */
  isLoaded(id: ThemeId): boolean {
    return this.configCache.has(id) && this.themeLoader.isLoaded(id);
  }

  /**
   * 获取所有可用主题列表
   */
  getAvailableThemes(): ThemeId[] {
    return Object.keys(THEME_REGISTRY) as ThemeId[];
  }

  /**
   * 注册主题变更回调
   */
  onThemeChange(callback: (theme: ThemeId) => void): void {
    this.onThemeChangeCallback = callback;
  }

  /**
   * 预加载主题（可选，优化用户体验）
   */
  async preloadTheme(id: ThemeId): Promise<void> {
    const config = await this.getThemeConfig(id);
    await this.themeLoader.preloadTheme(config);
  }
}
```

### 6.2 主题配置文件结构

```
src/config/themes/
├── classicTheme.ts   ← Phase 7 实现
├── catTheme.ts       ← Phase 8 实现
└── mechaTheme.ts     ← Phase 9 实现
```

**经典主题配置示例（v1.1 完全修正）**：

```typescript
// ==================== src/config/themes/classicTheme.ts ====================

import type { ThemeConfig } from '@/types/theme';
import { BOARD_CONFIG } from '@/config/gameConfig';

/**
 * 经典主题配置（苹果风格）
 * 纯净白棋+深空灰棋，毛玻璃底座，极简设计
 * v1.1：颜色、呼吸动画、胜利/失败颜色全部修正为需求规格
 */
export const CLASSIC_THEME: ThemeConfig = {
  id: 'CLASSIC',
  name: '经典主题',
  description: '苹果风格：纯净白棋+深空灰棋，毛玻璃底座，极简设计',
  previewImage: '/assets/themes/classic/preview.png',

  pieces: {
    black: {
      geometry: {
        type: 'cylinder',
        radius: BOARD_CONFIG.cellSize * 0.4,
        height: BOARD_CONFIG.cellHeight * 0.9,
        color: 0x1d1d1f,                       // #1d1d1f 深空灰（需求 v1.2）
        metalness: 0.0,                        // 纯塑料质感
        roughness: 0.4,                        // 光滑表面
      },
      // 边缘光晕效果
      emissiveGlow: {
        color: 0x3d3d42,                       // 深灰光晕
        intensity: 0.15,
      },
      material: { metalness: 0.0, roughness: 0.4 },
    },
    white: {
      geometry: {
        type: 'cylinder',
        radius: BOARD_CONFIG.cellSize * 0.4,
        height: BOARD_CONFIG.cellHeight * 0.9,
        color: 0xf5f5f7,                       // #f5f5f7 苹果白（需求 v1.2）
        metalness: 0.0,
        roughness: 0.4,
      },
      // 边缘光晕效果
      emissiveGlow: {
        color: 0xffffff,                       // 纯白光晕
        intensity: 0.2,
      },
      material: { metalness: 0.0, roughness: 0.4 },
    },
  },

  board: {
    baseType: 'geometry',
    geometry: {
      type: 'platform',
      color: 0xf0f0f5,                         // #f0f0f5 毛玻璃浅灰白
      metalness: 0.0,
      roughness: 0.4,
      opacity: 0.85,                           // 半透明毛玻璃
      borderRadius: 0.5,                       // 圆角设计
    },
    grid: {
      color: 0xc0c0c8,                         // #c0c0c8 浅灰网格
      opacity: 0.4,                            // 低对比度
      style: 'line',
    },
    highlight: {
      cellHighlight: {
        color: 0xe0e0e8,                       // #e0e0e8 浅灰白高亮
        opacity: 0.4,
        emissiveIntensity: 0.5,
      },
      verticalHighlight: {
        color: 0xc0c0c8,
        opacity: 0.3,
        emissiveIntensity: 0.5,
      },
      previewHighlight: { opacity: 0.4 },
    },
    decorations: undefined,
  },

  environment: {
    background: {
      type: 'gradient',                        // 渐变背景（需求 v1.2）
      value: {
        top: 0xf5f5f7,                         // #f5f5f7 上浅
        bottom: 0xd2d2d8,                      // #d2d2d8 下深
      },
    },
    lighting: {
      ambient: { color: 0xffffff, intensity: 0.8 },  // 柔和均匀白光
      main: { color: 0xffffff, intensity: 1.0, position: { x: 5, y: 10, z: 7 } },
      fill: { color: 0xe0e0f0, intensity: 0.4, position: { x: -5, y: 5, z: -5 } },
    },
  },

  animations: {
    // v1.1 修正：经典主题有呼吸动画（缩放±2% + 光晕脉动）
    hasIdleAnimation: true,
    idleAnimation: {
      type: 'code',
      duration: 2000,                          // 2秒循环
      loop: true,
      codeAnimation: {
        scale: { pattern: 'pulse', intensity: 0.02, axis: 'y' },  // ±2%缩放
        material: { pattern: 'emissive_pulse', intensity: 0.15 }, // 光晕脉动
      },
    },

    // 悬停动画：己方发光增强，对方颜色变暗
    hover: {
      own: {
        type: 'code',
        duration: 300,
        codeAnimation: {
          scale: { pattern: 'pulse', intensity: 0.02 },
          material: { pattern: 'emissive_pulse', color: 0xffffff, intensity: 0.3 },  // 边缘光晕变亮
        },
      },
      opponent: {
        type: 'code',
        duration: 300,
        codeAnimation: {
          scale: { pattern: 'pulse', intensity: 0.02 },
          material: { pattern: 'emissive_pulse', color: 0x888890 },  // 颜色变暗（警示）
        },
      },
    },

    // 下落动画：重力下落 + 纯净光晕拖尾
    fall: {
      default: {
        type: 'code',
        duration: 500,
        codeAnimation: {
          position: { pattern: 'bounce', intensity: 0.2, axis: 'y' },
          material: { pattern: 'emissive_pulse', color: 0xffffff },  // 纯净光晕拖尾
        },
      },
      own: {
        type: 'code',
        duration: 500,
        codeAnimation: {
          position: { pattern: 'bounce', intensity: 0.2 },
          material: { pattern: 'emissive_pulse', color: 0xffffff },  // 白棋白色拖尾
        },
      },
      opponent: {
        type: 'code',
        duration: 500,
        codeAnimation: {
          position: { pattern: 'bounce', intensity: 0.2 },
          material: { pattern: 'emissive_pulse', color: 0x6688cc },  // 黑棋浅蓝拖尾
        },
      },
    },

    // 对抗动画：涟漪效果 vs 警示下沉
    impact: {
      own: {
        type: 'code',
        duration: 200,
        codeAnimation: {
          position: { pattern: 'shake', intensity: 0.05 },  // 微下沉
          material: { pattern: 'emissive_pulse', color: 0xe0e0e8, intensity: 0.3 },  // 光晕涟漪
        },
      },
      opponent: {
        type: 'code',
        duration: 200,
        codeAnimation: {
          position: { pattern: 'shake', intensity: 0.05 },
          material: { pattern: 'emissive_pulse', color: 0x888890 },  // 警示下沉
        },
      },
    },

    // v1.1 修正：胜利动画用纯白光，失败用暗淡灰
    win: {
      type: 'code',
      duration: 3000,
      loop: true,
      codeAnimation: {
        position: { pattern: 'bounce', intensity: 0.15 },  // 轻微跳跃
        material: { pattern: 'emissive_pulse', color: 0xffffff, intensity: 0.5 },  // 纯白光晕增强
      },
    },
    lose: {
      type: 'code',
      duration: 3000,
      loop: true,
      codeAnimation: {
        material: { pattern: 'emissive_pulse', color: 0xd2d2d8, intensity: 0.1 },  // 颜色淡化（暗淡灰）
      },
    },
  },

  metadata: {
    author: 'Project Team',
    version: '1.1',
    tags: ['classic', 'minimalist', 'apple-style', 'default'],
    createdAt: '2026-04-24',
  },
};
```

---

## 七、新增主题步骤（扩展指南）

### 7.1 新增主题 Checklist

1. **添加类型定义**：`ThemeId` 枚举新增值
2. **创建配置文件**：`src/config/themes/{newTheme}.ts`
3. **注册到注册表**：`ThemeManager.THEME_REGISTRY` 新增条目
4. **准备素材**：GLB模型、纹理、天空盒（放入 `public/assets/themes/{newTheme}/`）
5. **测试验证**：切换主题、动画播放

### 7.2 示例：新增"水下"主题

```typescript
// Step 1: types/theme.ts 新增枚举
export type ThemeId = 'CLASSIC' | 'CAT' | 'MECHA' | 'UNDERWATER';

// Step 2: src/config/themes/underwaterTheme.ts
export const UNDERWATER_THEME: ThemeConfig = {
  id: 'UNDERWATER',
  name: '水下主题',
  description: '深海潜水棋子',
  previewImage: '/assets/themes/underwater/preview.png',

  pieces: {
    black: { model: { path: '/assets/themes/underwater/diver_black.glb', scale: 0.5 } },
    white: { model: { path: '/assets/themes/underwater/diver_white.glb', scale: 0.5 } },
  },

  board: { baseColor: 0x0066aa, gridColor: 0x00aaff, gridOpacity: 0.8 },

  environment: {
    background: { type: 'skybox', value: ['/assets/themes/underwater/skybox/...'] },
    lighting: { ambient: { color: 0x0088cc, intensity: 0.5 }, ... },
  },

  animations: {
    hasIdleAnimation: true,
    idleAnimation: { type: 'code', duration: 2000, codeAnimation: { position: { pattern: 'bounce', intensity: 0.02, axis: 'y' } } },
    // ... 其他动画配置
  },
};

// Step 3: ThemeManager.ts 注册
const THEME_REGISTRY: Record<ThemeId, () => ThemeConfig> = {
  CLASSIC: () => import('@/config/themes/classicTheme').then(m => m.CLASSIC_THEME),
  CAT: () => import('@/config/themes/catTheme').then(m => m.CAT_THEME),
  MECHA: () => import('@/config/themes/mechaTheme').then(m => m.MECHA_THEME),
  UNDERWATER: () => import('@/config/themes/underwaterTheme').then(m => m.UNDERWATER_THEME),
};
```

---

## 八、开发任务顺序（依赖关系）

```
Phase 7 开发顺序：

T7-1 ─────────────────────────────────────────────────────────────┐
(类型Schema)                                                       │
    ↓                                                              │
T7-2 ──────────────────────────────────────────────────────────────┤
(ThemeManager骨架)                                                  │
    ↓                                                              │
T7-3 ──────────────────────────────────────────────────────────────┤
(ThemeLoader素材加载)                                               │
    ↓                                                              │
┌───┴───┐                                                          │
│       │                                                          │
T7-4    T7-5                                                       │
(状态机) (动画控制器)                                                │
    ↓       ↓                                                      │
└───┬───┘                                                          │
    │                                                              │
T7-6 ──────────────────────────────────────────────────────────────┤
(PieceRenderer改造)                                                 │
    ↓                                                              │
┌───┴───────┬───────┐                                              │
│           │       │                                              │
T7-7        T7-8    T7-9                                            │
(棋盘改造)  (环境渲染) (UI)                                          │
    │           │       │                                          │
    └───────────┴───────┴──────────────────────────────────────────┘
                              ↓
                         集成测试

关键路径：T7-1 → T7-2 → T7-3 → T7-4 → T7-5 → T7-6
```

---

## 九、重构风险评估

| 风险项 | 影响 | 缓解措施 |
|--------|------|----------|
| BoardRenderer拆分影响现有功能 | 高 | 分步重构，保持接口兼容 |
| 动画系统与现有下落动画冲突 | 中 | AnimationController统一管理 |
| 主题切换时棋子状态丢失 | 中 | PieceStateManager状态持久化 |
| 素材加载失败导致渲染崩溃 | 高 | fallback到经典主题 |
| 新模块与GameController集成复杂 | 中 | 设计清晰的依赖注入 |

---

## 十一、三套主题视觉规格总表（v1.1 新增）

> 此表与 `theme-system-requirements.md` v1.2 规格完全对齐，确保架构设计与需求一致。

### 11.1 颜色方案

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

### 11.2 交互高亮颜色

| 交互元素 | 经典主题 | 猫咪主题 | 机甲主题 |
|----------|----------|----------|----------|
| **悬停格子高亮** | `#e0e0e8`（浅灰白） | `#FFD699`（暖橘） | `#00ddff`（冰蓝） |
| **竖线浮现** | `#c0c0c8`（浅灰） | `#FFB347`（暖橘） | `#00bbff`（冰蓝） |
| **预览棋子透明度** | 0.4 | 0.4 | 0.35（全息感） |
| **悬停己方-光晕** | `#ffffff` 发光增强 | `#FFB347` 发光加速 | `#00ccff` 灯光加速 |
| **悬停对方-警示** | `#888890` 颜色变暗 | 伸爪拍打（动作） | 举盾剑威胁（动作） |

### 11.3 胜利/失败颜色

| 效果元素 | 经典主题 | 猫咪主题 | 机甲主题 |
|----------|----------|----------|----------|
| **胜利连线** | `#ffffff`（纯白光） | `#FFB347`（暖金色） | `#00ccff`（冰蓝） |
| **胜利粒子** | `#ffffff`（白色光晕） | `#FFB347`（暖金色） | `#00ccff`（冰蓝火花） |
| **失败连线** | `#d2d2d8`（暗淡灰） | `#C06040`（暗橘色） | `#ff3366`（红色） |
| **失败粒子** | `#a0a0a8`（暗淡粒子） | `#886040`（暗棕色） | `#ff3366`（红色火星） |

### 11.4 材质物理属性

| 主题 | metalness | roughness | 说明 |
|------|-----------|-----------|------|
| 经典 | 0.0 | 0.4 | 光滑塑料质感（苹果风格） |
| 猫咪 | 0.0 | 0.6 | 毛皮质感（哑光） |
| 机甲 | 0.7 | 0.3 | 高金属感+光滑表面 |

---

## 十二、遗留特性兼容性方案（v1.1 新增）

> 解决旧文档中硬编码颜色与主题系统的冲突。

### 12.1 问题识别

| 旧特性 | 旧颜色 | 来源文档 | 问题 |
|--------|--------|----------|------|
| 竖直高亮线 | `#3d9eff`（工业蓝） | hover-highlight-spec.md | 与经典主题浅灰不兼容 |
| 悬停格子高亮 | `#3d9eff` | hover-highlight-spec.md | 与猫咪暖橘/机甲冰蓝冲突 |
| 背景色 | `#0a0a0f`（深色） | visual-style-guide.md | 与经典浅灰渐变冲突 |
| 胜利连线 | `#4ade80`（绿色） | visual-style-guide.md | 经典主题应用纯白光 |
| 胜利粒子 | `#fbbf24`（金色） | visual-style-guide.md | 经典主题应用白色光晕 |
| 失败特效 | `#ff6b4a`（红色） | visual-style-guide.md | 经典主题应用暗淡灰 |

### 12.2 解决方案

| 旧特性 | 主题化方案 | 实施位置 |
|--------|------------|----------|
| 竖直高亮线 | `board.highlight.verticalHighlight.color` | BoardRenderer |
| 悬停格子高亮 | `board.highlight.cellHighlight.color` | BoardRenderer |
| 预览棋子透明度 | `board.highlight.previewHighlight.opacity` | PieceRenderer |
| 背景色 | `environment.background.value` | EnvironmentRenderer |
| 胜利连线 | `animations.win.codeAnimation.material.color` | AnimationController |
| 失败特效 | `animations.lose.codeAnimation.material.color` | AnimationController |

### 12.3 迁移指南

**BoardRenderer 改造**：
```typescript
// 旧代码（硬编码）
const highlightColor = 0x3d9eff;  // ❌ 需移除

// 新代码（主题化）
const highlightColor = this.currentTheme.highlight.cellHighlight.color;  // ✓
```

**visual-style-guide.md 处理**：
- 该文档中的颜色仅作为参考，不应硬编码到渲染器
- 所有颜色应从 ThemeConfig 读取

---

## 十三、前端设计审查（v1.1 新增）

> 基于 frontend-design skill 的视觉设计原则，对三套主题进行差异化审查。

### 13.1 差异化审查表

| 维度 | 经典主题 | 猫咪主题 | 机甲主题 | 是否区分明显 |
|------|----------|----------|----------|--------------|
| **色调方向** | 中性（白灰） | 暖色（橘黄/木纹） | 冷色（冰蓝/深蓝） | ✓ 明显 |
| **材质特征** | 磨砂/光滑塑料 | 毛皮（哑光粗糙） | 金属（高反射） | ✓ 明显 |
| **视觉重量** | 轻（透明+浅色） | 中（温暖但不重） | 重（深色+高对比） | ✓ 明显 |
| **动画节奏** | 慢（2秒呼吸） | 灵动（尾巴+耳朵微动） | 机械（部件开合+灯光） | ✓ 明显 |
| **高亮色** | 白/灰 | 暖橘 | 冰蓝 | ✓ 明显 |
| **失败色** | 灰淡 | 暗橘红 | 鲜红（#ff3366） | ✓ 明显 |

### 13.2 设计风险提示

| 风险 | 级别 | 说明 | 缓解措施 |
|------|------|------|----------|
| 猫咪 vs 经典暖色冲突 | 低 | 经典环境色暖白 `#f5f5f7` 与猫咪暖白 `#f0e8d8` 接近 | 猫咪棋盘木纹暖橘 `#FFB347` 明显区分 |
| 机甲网格发光过亮 | 中 | 冰蓝 `#00aaff` 网格+冷光背景可能在暗处刺眼 | `opacity: 0.5` + `emissiveIntensity: 0.6` 控制 |
| 猫咪毛皮质感不逼真 | 中 | GLB模型+`roughness:0.6`未必模拟毛皮感 | 优先用模型纹理自带质感 |
| 经典主题"太素" | 低 | 苹果极简可能缺乏辨识度 | 光晕拖尾+胜利跳跃提供视觉记忆点 |

### 13.3 主题切换 UI 设计要点

- **字体**：主题标题用 `Space Mono`，描述用 `DM Sans`
- **布局**：卡片式三列并排，每张卡片含预览图+名称+描述+选中状态
- **动效**：卡片 hover 时 scale 1.05 + 微阴影（CSS transition 200ms）
- **选中态**：边框用对应主题色高亮（经典 `#e0e0e8`、猫咪 `#FFB347`、机甲 `#00aaff`）
- **预览图**：200x200px PNG 透明背景

---

## 十四、ADR 决策摘要（v1.1 新增）

### ADR-017：经典主题苹果风格设计

**状态**：已采纳

**决策**：经典主题采用苹果极简风格设计（毛玻璃底座、高光材质、边缘光晕、浅灰渐变背景）

**理由**：
- 需求 v1.2 明确要求苹果风格，与旧版"简约深色"完全不同
- 三主题差异化需要经典主题有明确的视觉记忆点（光晕拖尾+呼吸缩放）

**实施要点**：
- `board.geometry.opacity: 0.85` 模拟毛玻璃
- `piece.emissiveGlow` 定义边缘光晕
- `environment.background.type: 'gradient'` 渐变背景

### ADR-018：主题化交互高亮颜色

**状态**：已采纳

**决策**：交互高亮颜色（悬停格子、竖线浮现、预览棋子）从硬编码迁移为主题配置

**理由**：
- 旧 `hover-highlight-spec.md` 硬编码 `#3d9eff` 与三主题设计色冲突
- 每主题应有独立的高亮风格（经典浅灰白、猫咪暖橘、机甲冰蓝）

**实施要点**：
- `board.highlight.cellHighlight.color` 悬停格子
- `board.highlight.verticalHighlight.color` 竖线浮现
- `board.highlight.previewHighlight.opacity` 预览透明度

### ADR-019：经典主题启用呼吸动画

**状态**：已采纳

**决策**：经典主题 `hasIdleAnimation: true`，实现缩放±2% + 边缘光晕脉动

**理由**：
- 需求 v1.2 明确要求经典主题有呼吸缩放+光晕脉动
- 与旧版"无呼吸动画"设计不同

**实施要点**：
- `idleAnimation.duration: 2000` 2秒循环
- `idleAnimation.codeAnimation.scale.intensity: 0.02` ±2%缩放
- `idleAnimation.codeAnimation.material.pattern: 'emissive_pulse'` 光晕脉动

### ADR-020：素材优化黑白共用

**状态**：已采纳（继承自 theme-system-design v2.3）

**决策**：猫咪/机甲黑白棋子共用同一GLB模型，运行时改色

**理由**：
- 减少50%模型数量（从8个减到4个）
- 降低加载开销和素材管理复杂度

**实施要点**：
- 加载模型后遍历 Mesh 修改 `material.color`
- 黑猫 `#1a1a22`、白猫 `#f0e8d8`
- 黑机甲 `#1a1a2a`、白机甲 `#d0d8e8`

---

## 十五、猫咪/机甲完整配置引用（v1.1 新增）

> 猫咪和机甲主题完整配置请参考 `theme-system-design.md` v2.3 第五章。
> 本文档仅提供经典主题完整配置，避免重复。

**引用路径**：
- 猫咪主题：`docs/architecture/theme-system-design.md` → 5.2 猫咪主题
- 机甲主题：`docs/architecture/theme-system-design.md` → 5.2 机甲主题

**关键配置要点**：

| 配置项 | 猫咪主题 | 机甲主题 |
|--------|----------|----------|
| 棋子模型 | cat_sit.glb / cat_sleep.glb | mecha_stand.glb / mecha_fold.glb |
| 材质 | metalness: 0.0, roughness: 0.6 | metalness: 0.7, roughness: 0.3 |
| 棋盘底座 | 猫窝GLB模型 + 木纹纹理 | 金属平台GLB + 发光网格 |
| 高亮色 | 暖橘 `#FFB347` / `#FFD699` | 冰蓝 `#00aaff` / `#00ddff` |
| 背景 | 暖色室内天空盒 | 冷色科技天空盒 |
| 胜利动画 | 左右跳跃 | 双臂高举欢呼 |
| 失败动画 | 钻洞露头 | 能量熄灭破损 |

---

## 十六、验收标准

### Phase 7 完成标准

- [ ] 类型Schema完整定义（ThemeConfig, PieceState等）
- [ ] ThemeManager可切换主题
- [ ] ThemeLoader可加载GLB/纹理/天空盒
- [ ] PieceStateManager状态转换正确
- [ ] AnimationController动画播放正确
- [ ] BoardRenderer拆分后棋盘渲染正常
- [ ] PieceRenderer棋子渲染素材驱动
- [ ] EnvironmentRenderer环境主题化
- [ ] ThemeSelectUI可选择主题并预览
- [ ] 经典主题完整可用（颜色、呼吸动画、胜利/失败全部正确）
- [ ] 猫咪/机甲主题配置就绪（引用 theme-system-design.md）
- [ ] 遗留硬编码颜色已迁移为主题配置
- [ ] 新增主题只需配置文件（不修改核心代码）

---

**版本**：v1.2
**创建日期**：2026-04-24
**修订日期**：2026-04-24

**修订历史**：
- v1.0：初始版本
- v1.1：根据需求 v1.2 和 theme-system-design v2.3 全面修正
  - PieceTheme Schema 增加 material + emissiveGlow
  - BackgroundTheme 支持渐变
  - 经典主题颜色全部修正（棋子、底座、网格、背景、胜利/失败）
  - 经典主题启用呼吸动画（hasIdleAnimation: true）
  - 添加三套主题完整棋盘配置（颜色规格对齐需求）
  - 添加三套主题视觉规格总表
  - 添加遗留特性兼容性方案
  - 添加前端设计审查
  - 添加 ADR 决策摘要
- v1.2：根据需求挖掘师反馈修复6个设计问题
  - P0：修正第333行表格高亮色（蓝色→浅灰白 #e0e0e8）
  - P1：统一 PieceTheme 材质参数（移除 geometry 内 metalness/roughness，统一使用顶层 material）
  - P1：合并 BoardTheme 定义（删除第340行重复定义，统一使用第225行扩展版）
  - P2：修复 recreateAllPieces() 逻辑（先保存位置数据，再清除旧Mesh）
  - P2：补充 AnimationController 详细设计（第五章新增5.1节，包含完整实现代码）
  - P2：经典棋盘补充毛玻璃纹理配置（baseTexture: frosted_glass.png）
  - 新增 ADR-021：材质参数统一使用顶层 material 字段