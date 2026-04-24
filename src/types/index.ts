/**
 * 核心类型定义
 * 3D四子棋游戏
 */

// ==================== 基础类型 ====================

/**
 * 棋子玩家类型
 */
export type Player = 'BLACK' | 'WHITE' | 'EMPTY';

/**
 * 三维位置坐标
 */
export interface Position {
  x: number;
  y: number;
  z: number;
}

/**
 * 二维向量（用于鼠标位置等）
 */
export interface Vector2 {
  x: number;
  y: number;
}

/**
 * 三维向量（用于方向检测等）
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

// ==================== 游戏状态类型 ====================

/**
 * 游戏状态类型
 */
export type GameStateType =
  | 'MENU'
  | 'SELECT_DIFFICULTY'
  | 'SELECT_ORDER'
  | 'PLAYING'
  | 'PLAYER_TURN'
  | 'AI_TURN'
  | 'GAME_END';

/**
 * 游戏事件类型
 */
export type GameEvent =
  | 'START'
  | 'SELECTED_DIFFICULTY'
  | 'SELECTED_ORDER'
  | 'PIECE_PLACED'
  | 'AI_DONE'
  | 'WIN_DETECTED'
  | 'DRAW_DETECTED'
  | 'RESTART'
  | 'BACK_TO_MENU';

// ==================== 难度与配置类型 ====================

/**
 * AI难度类型
 */
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

/**
 * 先后手选择类型
 */
export type Order = 'FIRST' | 'SECOND' | 'RANDOM';

/**
 * AI配置
 */
export interface AIConfig {
  depth: number;       // 搜索深度
  mistakeRate: number; // 失误率 (0-1)
}

/**
 * 游戏结果类型
 */
export type GameResult = 'WIN' | 'LOSS' | 'DRAW';

// ==================== 胜负判定类型 ====================

/**
 * 胜负判定结果
 */
export interface WinResult {
  winner: Player;
  linePositions: Position[];
}

// ==================== 战绩数据类型 ====================

/**
 * 单难度战绩数据
 */
export interface DifficultyStats {
  wins: number;
  losses: number;
  rate: number;
}

/**
 * 完整战绩数据
 */
export interface GameStats {
  easy: DifficultyStats;
  medium: DifficultyStats;
  hard: DifficultyStats;
  total: DifficultyStats;
}

/**
 * localStorage存储的战绩数据
 */
export interface StatsStorage {
  easy: { wins: number; losses: number };
  medium: { wins: number; losses: number };
  hard: { wins: number; losses: number };
}

// ==================== 游戏配置类型 ====================

/**
 * 棋盘配置
 */
export interface BoardConfig {
  width: number;      // 长宽 (6)
  height: number;     // 高度 (6、7、8)
  cellSize: number;   // 格子平面尺寸（宽度/深度）
  cellHeight: number; // 格子高度（层间距）
}

/**
 * 棋子配置
 */
export interface PieceConfig {
  radius: number;           // 圆柱半径
  height: number;           // 圆柱高度
  dropStartHeight: number;  // 下落起点高度
  dropDuration: number;     // 下落动画时长 (ms)
  previewOpacity: number;   // 预览棋子透明度
  bounceDecay: number;      // 弹跳衰减比例（每次反弹高度 = 上次 * decay）
  bounceCount: number;      // 弹跳次数
}

/**
 * 渲染配置
 */
export interface RenderConfig {
  pieceBlack: {
    color: number;      // 颜色 (hex)
    metalness: number;
    roughness: number;
  };
  pieceWhite: {
    color: number;
    metalness: number;
    roughness: number;
  };
  gridColor: number;      // 网格颜色
  gridOpacity: number;    // 网格透明度
  baseColor: number;      // 底座颜色
  baseOpacity: number;    // 底座透明度
  // 竖直空间高亮（悬停时浮现）
  verticalHighlight: {
    color: number;           // 发光颜色
    opacity: number;         // 透明度
    emissiveIntensity: number; // 发光强度
  };
  // 底部格子高亮
  cellHighlight: {
    color: number;           // 发光颜色
    opacity: number;         // 透明度
    emissiveIntensity: number; // 发光强度
  };
}

/**
 * 光照配置
 */
export interface LightConfig {
  ambient: {
    color: number;
    intensity: number;
  };
  main: {
    color: number;
    intensity: number;
    position: Vector3;
  };
  fill: {
    color: number;
    intensity: number;
    position: Vector3;
  };
}

// ==================== 相机配置类型 ====================

/**
 * 相机配置
 */
export interface CameraConfig {
  initialPosition: Vector3;
  lookAt: Vector3;
  minPolarAngle: number;   // 最小仰角
  maxPolarAngle: number;   // 最大仰角
  rotateSpeed: number;     // 旋转速度
  minDistanceRatio: number; // 最近距离比例（相对于初始距离，如 0.7 表示拉近30%）
  zoomSpeed: number;        // 缩放速度（滚轮90度从最远到最近的比例）
}

// ==================== 特效配置类型 ====================

/**
 * 粒子配置
 */
export interface ParticleConfig {
  count: number;
  speed: number;
  lifetime: number;
  color: number;
}

/**
 * 胜负特效配置
 */
export interface EffectConfig {
  winLineHighlight: {
    duration: number;
    color: number;       // 胜利连线颜色
    intensity: number;
  };
  loseLineHighlight: {
    duration: number;
    color: number;       // 失败连线颜色
    intensity: number;
  };
  boardRotation: {
    duration: number;
    angle: number;       // 旋转角度
  };
  winParticles: ParticleConfig;
  loseParticles: ParticleConfig;
}

// ==================== 常量定义 ====================

/**
 * 13个方向向量（用于胜负判定）
 */
export const DIRECTIONS: Vector3[] = [
  // 水平（同层）- 4个
  { x: 1, y: 0, z: 0 },   // 横线
  { x: 0, y: 1, z: 0 },   // 竖线
  { x: 1, y: 1, z: 0 },   // XY对角线
  { x: 1, y: -1, z: 0 },  // XY反对角线
  // 垂直 - 1个
  { x: 0, y: 0, z: 1 },   // 垂直线
  // 跨层斜线(XZ) - 4个
  { x: 1, y: 0, z: 1 },
  { x: -1, y: 0, z: 1 },
  { x: 1, y: 0, z: -1 },
  { x: -1, y: 0, z: -1 },
  // 跨层斜线(YZ) - 4个
  { x: 0, y: 1, z: 1 },
  { x: 0, y: -1, z: 1 },
  { x: 0, y: 1, z: -1 },
  { x: 0, y: -1, z: -1 },
  // 空间对角线 - 8个
  { x: 1, y: 1, z: 1 },
  { x: -1, y: -1, z: 1 },
  { x: 1, y: -1, z: 1 },
  { x: -1, y: 1, z: 1 },
  { x: 1, y: 1, z: -1 },
  { x: -1, y: -1, z: -1 },
  { x: 1, y: -1, z: -1 },
  { x: -1, y: 1, z: -1 },
];

/**
 * 连线长度要求
 */
export const WIN_LINE_LENGTH = 4;

/**
 * localStorage存储键
 */
export const STORAGE_KEYS = {
  STATS: 'connect4_3d_stats',
  BOARD_HEIGHT: 'connect4_3d_board_height',
};