/**
 * 游戏配置
 * 包含棋盘、棋子、渲染、光照、相机、特效等配置
 */

import type {
  BoardConfig,
  PieceConfig,
  RenderConfig,
  LightConfig,
  CameraConfig,
  EffectConfig,
  Difficulty,
  Vector3,
} from '@/types';

/**
 * 棋盘配置
 */
export const BOARD_CONFIG: BoardConfig = {
  width: 5,          // 长宽 5x5
  height: 6,         // 默认高度 6层（可扩展至8）
  cellSize: 1,       // 格子平面尺寸（宽度/深度）
  cellHeight: 0.5,     // 格子高度（层间距）← 新增，方便调整
};

/**
 * 棋子配置
 * 乐高式圆柱，塑料质感
 * radius ≈ 格子宽度一半，height 可以小于 radius（略扁）
 */
export const PIECE_CONFIG: PieceConfig = {
  radius: BOARD_CONFIG.cellSize * 0.4,     // 圆柱半径（接近格子宽度的一半）
  height: BOARD_CONFIG.cellHeight * 0.9,   // 圆柱高度（略扁）
  dropStartHeight: BOARD_CONFIG.height + 15, // 下落起点：棋盘上方15单位
  dropDuration: 500,                       // 下落动画时长 500ms
  previewOpacity: 0.4,                     // 预览棋子透明度
  // 弹跳动画参数
  bounceDecay: 0.2,                        // 衰减比例：每次反弹高度 = 上次 * 0.3
  bounceCount: 3,                          // 弹跳次数：总共弹跳 3 次
};

/**
 * 渲染配置
 * 钢铁灰色系背景，黑白棋子对比明显
 */
export const RENDER_CONFIG: RenderConfig = {
  // 黑棋材质（深灰色，在钢铁灰背景上可见）
  pieceBlack: {
    color: 0x1a1a22,    // #1a1a22 深灰色
    metalness: 0.0,     // 纯塑料质感
    roughness: 0.4,     // 光滑表面
  },
  // 白棋材质（亮白色）
  pieceWhite: {
    color: 0xf0f0f5,    // #f0f0f5 亮白色
    metalness: 0.0,
    roughness: 0.4,
  },
  // 网格线框（比背景稍亮）
  gridColor: 0x505058,     // #505058 中灰色
  gridOpacity: 0.6,        // 半透明
  // 底座面板（与背景接近）
  baseColor: 0x383840,     // #383840 钢铁灰
  baseOpacity: 0.5,        // 半透明（稍高以便可见）
  // 竖直空间高亮（悬停时浮现）
  verticalHighlight: {
    color: 0x3d9eff,       // 发光颜色（#3d9eff 玩家强调色）
    opacity: 0.3,          // 透明度
    emissiveIntensity: 0.5, // 发光强度
  },
  // 底部格子高亮
  cellHighlight: {
    color: 0x3d9eff,       // 发光颜色
    opacity: 0.4,          // 透明度
    emissiveIntensity: 0.8, // 发光强度（更明显）
  },
};

/**
 * 光照配置
 */
export const LIGHT_CONFIG: LightConfig = {
  // 环境光（提高整体亮度）
  ambient: {
    color: 0xffffff,
    intensity: 0.6,          // 从 0.4 → 0.6
  },
  // 主光源
  main: {
    color: 0xffffff,
    intensity: 1.0,          // 从 0.6 → 1.0
    position: { x: 5, y: 10, z: 7 },  // 右上前方
  },
  // 补充光（蓝色）
  fill: {
    color: 0x3d9eff,      // #3d9eff
    intensity: 0.3,       // 从 0.2 → 0.3
    position: { x: -5, y: 5, z: -5 },  // 左后方
  },
};

/**
 * 相机配置
 * 坐标系统：Three.js标准（Y轴向上）
 */
export const CAMERA_CONFIG: CameraConfig = {
  initialPosition: { x: BOARD_CONFIG.width*1.4, y: BOARD_CONFIG.height * BOARD_CONFIG.cellHeight, z: BOARD_CONFIG.width*1.5 },  // 初始位置：上方俯视
  lookAt: { x: BOARD_CONFIG.width/2, y: BOARD_CONFIG.height*BOARD_CONFIG.cellHeight/2, z: BOARD_CONFIG.width/2 },
  minPolarAngle: Math.PI * 0.01,              // 最小仰角：完全俯视（0度，相机最高）
  maxPolarAngle: Math.PI * 0.53,             // 最大仰角：仰视15度（约105度，可从下方看）
  rotateSpeed: 0.005,
  minDistanceRatio: 0.4,                     // 最近距离比例：拉近60%（初始距离的40%）
  zoomSpeed: 1.11,                           // 缩放速度：滚轮90度从最远到最近（Math.PI/2 / 90度 = 0.02rad/度，但这里用比例）
};

// ==================== 难度→棋盘高度映射 ====================

/**
 * 胜负特效配置
 */
export const EFFECT_CONFIG: EffectConfig = {
  // 胜利连线高亮
  winLineHighlight: {
    duration: 500,
    color: 0x4ade80,      // #4ade80 绿色
    intensity: 2,
  },
  // 失败连线高亮
  loseLineHighlight: {
    duration: 500,
    color: 0xff6b4a,      // #ff6b4a 红色
    intensity: 1.5,
  },
  // 棋盘旋转展示
  boardRotation: {
    duration: 1500,
    angle: Math.PI * 2,   // 360度
  },
  // 胜利粒子
  winParticles: {
    count: 300,
    speed: 2,
    lifetime: 1000,
    color: 0xfbbf24,      // #fbbf24 金色
  },
  // 失败粒子
  loseParticles: {
    count: 200,
    speed: 1,
    lifetime: 1500,
    color: 0x55556a,      // #55556a 灰色
  },
};

/**
 * 计算棋盘中心位置
 */
export function getBoardCenter(height: number = BOARD_CONFIG.height): { x: number; y: number; z: number } {
  const halfWidth = BOARD_CONFIG.width * BOARD_CONFIG.cellSize / 2;
  const halfHeight = height * BOARD_CONFIG.cellSize / 2;
  return {
    x: halfWidth,
    y: halfHeight,
    z: halfWidth,
  };
}

// ==================== 难度→棋盘高度映射 ====================

/**
 * 难度对应的棋盘高度映射
 * EASY: 6层（默认，新手友好）
 * MEDIUM: 7层（中等挑战）
 * HARD: 8层（最大挑战）
 */
export const DIFFICULTY_HEIGHT_MAP: Record<Difficulty, number> = {
  EASY: 6,
  MEDIUM: 7,
  HARD: 8,
};

/**
 * 获取难度对应的棋盘高度
 */
export function getBoardHeightByDifficulty(difficulty: Difficulty): number {
  return DIFFICULTY_HEIGHT_MAP[difficulty];
}

// ==================== 相机动态配置 ====================

/**
 * 计算相机初始位置（根据棋盘高度）
 * Y轴向上坐标系统
 */
export function getCameraInitialPosition(boardHeight: number): Vector3 {
  return {
    x: 8,
    y: boardHeight * BOARD_CONFIG.cellHeight + 10,  // Y: 高度，相机在棋盘上方
    z: 10,
  };
}

/**
 * 计算相机lookAt目标（棋盘中心）
 * Y轴向上坐标系统
 */
export function getCameraLookAt(boardHeight: number): Vector3 {
  return {
    x: BOARD_CONFIG.width * BOARD_CONFIG.cellSize / 2,
    y: boardHeight * BOARD_CONFIG.cellHeight / 2,   // Y: 高度中心
    z: BOARD_CONFIG.width * BOARD_CONFIG.cellSize / 2,
  };
}