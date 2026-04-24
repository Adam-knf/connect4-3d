/**
 * 主题系统类型定义
 * Phase 7 核心类型Schema
 *
 * 设计原则：
 * - 配置驱动：所有主题通过 JSON 配置定义
 * - 插件式扩展：新主题只需添加配置文件
 * - 类型安全：完整 TypeScript 类型定义
 */

// ==================== 基础枚举类型 ====================

/**
 * 主题ID（枚举式，便于扩展）
 * 新增主题只需添加新枚举值
 */
export type ThemeId = 'CLASSIC' | 'CAT' | 'MECHA';

/**
 * 棋子状态（枚举式，便于扩展）
 * 6状态机：Sleep → Idle → Hover → Fall/Impact → Win/Lose
 */
export type PieceState = 'SLEEP' | 'IDLE' | 'HOVER' | 'FALL' | 'IMPACT' | 'WIN' | 'LOSE';

/**
 * 棋子事件（状态机触发事件）
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
 * 动画来源类型
 * ADR-012：代码动画为主 + 模型自带可选
 */
export type AnimationSourceType = 'code' | 'builtin';

/**
 * 缩放动画模式
 */
export type ScalePattern = 'pulse' | 'expand' | 'contract';

/**
 * 位置动画模式
 */
export type PositionPattern = 'bounce' | 'shake' | 'offset';

/**
 * 材质动画模式
 */
export type MaterialPattern = 'emissive_pulse' | 'color_shift' | 'texture_switch';

/**
 * 几何体类型
 */
export type GeometryType = 'cylinder' | 'sphere' | 'box';

/**
 * 背景类型
 */
export type BackgroundType = 'color' | 'gradient' | 'skybox';

// ==================== 动画配置类型 ====================

/**
 * 缩放动画配置
 */
export interface ScaleAnimationConfig {
  pattern: ScalePattern;
  intensity: number;    // 缩放幅度（0.03 = ±3%）
  axis?: 'all' | 'y';   // 缩放轴
}

/**
 * 旋转动画配置
 */
export interface RotationAnimationConfig {
  axis: 'x' | 'y' | 'z';
  angle?: number;       // 旋转角度（度）
  lookAt?: boolean;     // 是否面向鼠标（看向鼠标位置）
}

/**
 * 位置动画配置
 */
export interface PositionAnimationConfig {
  pattern: PositionPattern;
  intensity: number;    // 位移幅度
  axis?: 'y' | 'all';   // 位移轴
}

/**
 * 材质动画配置
 */
export interface MaterialAnimationConfig {
  pattern: MaterialPattern;
  color?: number;       // 发光颜色
  intensity?: number;   // 发光强度
  texturePath?: string; // 纹理切换路径
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
 * 动画规格
 * 支持代码动画 + 模型自带动画
 * ADR-012：代码动画为主，模型自带可选
 */
export interface AnimationSpec {
  type: AnimationSourceType;     // 动画来源类型
  builtinName?: string;          // 模型自带动画名称（可选）
  codeAnimation?: CodeAnimationConfig; // 代码动画配置（可选）
  duration: number;              // 动画时长(ms)
  loop?: boolean;                // 是否循环（默认false）
}

// ==================== 棋子主题配置 ====================

/**
 * 几何体配置（经典主题用）
 */
export interface GeometryConfig {
  type: GeometryType;
  radius?: number;    // cylinder/sphere
  height?: number;    // cylinder
  width?: number;     // box
  depth?: number;     // box
  color: number;      // 颜色
  metalness: number;
  roughness: number;
}

/**
 * GLB模型配置（猫咪/机甲用）
 * ADR-015：黑白共用模型，运行时改色
 */
export interface ModelConfig {
  path: string;       // 模型路径
  scale: number;      // 缩放比例
  rotation?: { x: number; y: number; z: number };
  // 黑白共用模型时的颜色覆盖
  colorOverride?: number;
}

/**
 * 棋子主题配置
 * 支持几何体 + GLB模型两种方式
 */
export interface PieceTheme {
  // 几何体配置（经典主题用）
  geometry?: GeometryConfig;

  // GLB模型配置（猫咪/机甲用）
  model?: ModelConfig;

  // 休眠姿态（可选，姿态差异大的主题需要）
  // ADR-013：多模型文件（活跃/休眠分离）
  sleepModel?: ModelConfig;
}

// ==================== 棋盘主题配置 ====================

/**
 * 棋盘底座几何体配置（经典主题用）
 */
export interface BoardGeometryConfig {
  type: 'box' | 'platform';   // box: 简约底座, platform: 平台
  color: number;
  metalness: number;
  roughness: number;
  opacity?: number;
}

/**
 * 棋盘底座模型配置（猫咪/机甲用）
 * 支持GLB模型替换底座结构
 */
export interface BoardModelConfig {
  path: string;               // 模型路径（如猫窝GLB）
  scale: number;
  position?: { x: number; y: number; z: number };  // 相对于棋盘中心的位置偏移
  rotation?: { x: number; y: number; z: number };
}

/**
 * 棋盘装饰物配置
 * 用于添加主题特色装饰（如猫窝旁的毛线球、机甲平台的能量柱）
 */
export interface BoardDecoration {
  id: string;                 // 装饰物ID
  modelPath: string;          // GLB模型路径
  position: { x: number; y: number; z: number };
  scale: number;
  rotation?: { x: number; y: number; z: number };
  optional?: boolean;         // 可选装饰（加载失败不影响）
}

/**
 * 棋盘高亮样式配置
 * 区分各主题的高亮颜色和效果
 */
export interface BoardHighlightConfig {
  // 底部格子高亮
  cellHighlight: {
    color: number;            // 高亮颜色（猫咪暖色、机甲冷色）
    opacity: number;          // 透明度
    emissiveIntensity: number; // 发光强度
  };
  // 竖直空间网格线
  verticalHighlight: {
    color: number;
    opacity: number;
    emissiveIntensity: number;
  };
  // 预览棋子高亮（悬停时的虚影）
  previewHighlight: {
    opacity: number;          // 预览棋子透明度
    emissive?: number;        // 预览棋子发光颜色（可选）
  };
}

/**
 * 棋盘网格样式配置
 */
export interface BoardGridConfig {
  color: number;
  opacity: number;
  // 机甲主题发光效果
  emissive?: number;
  emissiveIntensity?: number;
  // 网格样式（简约线条 vs 发光面板）
  style?: 'line' | 'panel' | 'glow';
}

/**
 * 棋盘主题配置（扩展版）
 * 支持结构变化（猫窝 vs 简约底座 vs 金属平台）
 */
export interface BoardTheme {
  // 底座类型选择（几何体 vs GLB模型）
  baseType: 'geometry' | 'model';

  // 几何体配置（经典主题用）
  geometry?: BoardGeometryConfig;

  // GLB模型配置（猫咪猫窝、机甲金属平台）
  model?: BoardModelConfig;

  // 纹理贴图（可选，用于几何体底座）
  baseTexture?: string;

  // 网格样式
  grid: BoardGridConfig;

  // 高亮样式（差异化配置）
  highlight: BoardHighlightConfig;

  // 装饰物（可选，用于增加主题特色）
  decorations?: BoardDecoration[];
}

// ==================== 环境主题配置 ====================

/**
 * 光照配置（环境主题）
 */
export interface LightTheme {
  ambient: { color: number; intensity: number };
  main: { color: number; intensity: number; position: Vector3 };
  fill: { color: number; intensity: number; position: Vector3 };
}

/**
 * 背景配置（环境主题）
 */
export interface BackgroundTheme {
  type: BackgroundType;
  value: number | string[];   // 颜色(hex)或天空盒路径数组(6面)
}

/**
 * 环境主题配置
 */
export interface EnvironmentTheme {
  background: BackgroundTheme;
  lighting: LightTheme;
}

// ==================== 动画主题配置 ====================

/**
 * 动画主题配置
 * 区分己方/对方的动画（核心扩展性）
 * ADR-016：下落动画增加己方/对方区分
 */
export interface AnimationThemeConfig {
  // 呼吸动画是否启用（经典无，猫咪/机甲有）
  hasIdleAnimation: boolean;
  idleAnimation?: AnimationSpec;

  // 悬停动画（区分己方/对方）
  hover: {
    own: AnimationSpec;      // 己方棋子悬停动画
    opponent: AnimationSpec; // 对方棋子悬停动画
  };

  // 下落动画（区分底部是己方/对方）
  // ADR-016：机甲举盾/举剑需求
  fall: {
    own: AnimationSpec;      // 底部是己方时的姿态（如举盾俯冲）
    opponent: AnimationSpec; // 底部是对方时的姿态（如举剑俯冲）
    default: AnimationSpec;  // 底部为空时的姿态
  };

  // 对抗动画（承接棋子）
  impact: {
    own: AnimationSpec;      // 承接己方棋子
    opponent: AnimationSpec; // 承接对方棋子
  };

  // 胜负动画
  win: AnimationSpec;
  lose: AnimationSpec;
}

// ==================== 完整主题配置 ====================

/**
 * 主题元数据（便于扩展和管理）
 */
export interface ThemeMetadata {
  author?: string;
  version?: string;
  tags?: string[];
  createdAt?: string;
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

  // 元数据（可选）
  metadata?: ThemeMetadata;
}

// ==================== 棋子Mesh包装类型 ====================

/**
 * 棋子Mesh包装结构
 * 用于PieceRenderer管理
 */
export interface PieceMesh {
  mesh: THREE.Object3D;      // 棋子Mesh（可能是Group）
  position: Position;        // 棋盘位置
  player: Player;            // 所属玩家
  state: PieceState;         // 当前状态
  isActive: boolean;         // 是否活跃（顶层）
}

// ==================== 主题预览UI类型 ====================

/**
 * 主题预览项（用于ThemeSelectUI）
 */
export interface ThemePreviewItem {
  id: ThemeId;
  name: string;
  description: string;
  previewImage: string;  // 预览图片路径
}

// ==================== 向量类型（复用现有） ====================

/**
 * 三维向量（复用types/index.ts）
 * 这里单独声明避免循环依赖
 */
interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * 位置类型（复用types/index.ts）
 */
interface Position {
  x: number;
  y: number;
  z: number;
}

/**
 * 玩家类型（复用types/index.ts）
 */
type Player = 'BLACK' | 'WHITE' | 'EMPTY';