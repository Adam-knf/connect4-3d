/**
 * 经典主题配置（苹果风格）
 * 纯净白棋+深空灰棋，毛玻璃底座，极简设计
 *
 * v1.2 完整修订：
 * - 棋子颜色：#f5f5f7 苹果白 / #1d1d1f 深空灰
 * - 底座颜色：#f0f0f5 毛玻璃浅灰白
 * - 毛玻璃纹理：frosted_glass.png
 * - 网格颜色：#c0c0c8 浅灰
 * - 背景：渐变上浅下深
 * - 胜利：纯白光晕增强
 * - 失败：暗淡灰淡化
 * - 呼吸动画：启用（缩放±2% + 光晕脉动）
 * - 材质参数：统一使用顶层 material（ADR-021）
 *
 * 特点：
 * - 几何体棋子（CylinderGeometry）
 * - 毛玻璃底座（半透明 + 纹理贴图）
 * - 边缘光晕效果（emissiveGlow）
 * - 浅灰渐变背景
 * - 柔和均匀白光
 */

import type { ThemeConfig } from '@/types/theme';
import { BOARD_CONFIG } from '@/config/gameConfig';

/**
 * 经典主题完整配置（v1.2）
 */
export const CLASSIC_THEME: ThemeConfig = {
  id: 'CLASSIC',
  name: '经典主题',
  description: '苹果风格：纯净白棋+深空灰棋，毛玻璃底座，极简设计',
  previewImage: '/assets/themes/classic/preview.png',

  // ==================== 棋子配置 ====================
  pieces: {
    // 黑棋（深空灰）
    black: {
      geometry: {
        type: 'cylinder',
        radius: BOARD_CONFIG.cellSize * 0.4,
        height: BOARD_CONFIG.cellHeight * 0.9,
        color: 0x1d1d1f,                       // #1d1d1f 深空灰
        // v1.2 修正：metalness/roughness 移至顶层 material
      },
      // 边缘光晕效果
      emissiveGlow: {
        color: 0x3d3d42,                       // 深灰光晕
        intensity: 0.15,
      },
      // v1.2 统一：材质物理属性
      material: {
        metalness: 0.0,                        // 纯塑料质感
        roughness: 0.4,                        // 光滑表面
      },
    },

    // 白棋（苹果白）
    white: {
      geometry: {
        type: 'cylinder',
        radius: BOARD_CONFIG.cellSize * 0.4,
        height: BOARD_CONFIG.cellHeight * 0.9,
        color: 0xf5f5f7,                       // #f5f5f7 苹果白
      },
      // 边缘光晕效果
      emissiveGlow: {
        color: 0xffffff,                       // 纯白光晕
        intensity: 0.2,
      },
      material: {
        metalness: 0.0,
        roughness: 0.4,
      },
    },
  },

  // ==================== 棋盘配置 ====================
  board: {
    // 底座类型：几何体（毛玻璃风格）
    baseType: 'geometry',

    // 几何体配置（苹果风格底座）
    geometry: {
      type: 'platform',
      color: 0xf0f0f5,                         // #f0f0f5 毛玻璃浅灰白
      metalness: 0.0,
      roughness: 0.4,                          // 光滑表面
      opacity: 0.85,                           // 半透明毛玻璃效果
      borderRadius: 0.5,                       // 圆角设计
    },

    // v1.2 新增：毛玻璃纹理贴图
    baseTexture: '/assets/themes/classic/textures/frosted_glass.png',

    // 网格样式（极简线条）
    grid: {
      color: 0xc0c0c8,                         // #c0c0c8 浅灰网格
      opacity: 0.4,                            // 低对比度，不抢眼
      style: 'line',                           // 极简线条风格
    },

    // 高亮样式（浅灰白系）
    highlight: {
      // 底部格子高亮
      cellHighlight: {
        color: 0xe0e0e8,                       // #e0e0e8 浅灰白高亮
        opacity: 0.4,
        emissiveIntensity: 0.5,
      },
      // 竖直空间网格线
      verticalHighlight: {
        color: 0xc0c0c8,                       // #c0c0c8 浅灰
        opacity: 0.3,
        emissiveIntensity: 0.5,
      },
      // 预览棋子高亮
      previewHighlight: {
        opacity: 0.4,                          // 半透明预览
      },
    },

    // 无装饰物（极简设计）
    decorations: undefined,
  },

  // ==================== 环境配置 ====================
  environment: {
    // 渐变背景（上浅下深）
    background: {
      type: 'gradient',
      value: {
        top: 0xf5f5f7,                         // #f5f5f7 上浅
        bottom: 0xd2d2d8,                      // #d2d2d8 下深
      },
    },
    lighting: {
      // 环境光（柔和均匀白光）
      ambient: {
        color: 0xffffff,
        intensity: 0.8,
      },
      // 主光源（右上前方）
      main: {
        color: 0xffffff,
        intensity: 1.0,
        position: { x: 5, y: 10, z: 7 },
      },
      // 补充光（左后方，淡灰蓝）
      fill: {
        color: 0xe0e0f0,                       // #e0e0f0
        intensity: 0.4,
        position: { x: -5, y: 5, z: -5 },
      },
    },
  },

  // ==================== 动画配置 ====================
  animations: {
    // v1.1 修正：经典主题有呼吸动画（缩放±2% + 光晕脉动）
    hasIdleAnimation: true,
    idleAnimation: {
      type: 'code',
      duration: 2000,                          // 2秒循环
      loop: true,
      codeAnimation: {
        scale: {
          pattern: 'pulse',
          intensity: 0.02,                     // ±2%缩放
          axis: 'y',
        },
        material: {
          pattern: 'emissive_pulse',
          intensity: 0.15,                     // 光晕脉动
        },
      },
    },

    // 悬停动画：己方发光增强，对方颜色变暗
    hover: {
      own: {
        type: 'code',
        duration: 300,
        codeAnimation: {
          scale: {
            pattern: 'pulse',
            intensity: 0.02,
          },
          material: {
            pattern: 'emissive_pulse',
            color: 0xffffff,                   // 边缘光晕变亮
            intensity: 0.3,
          },
        },
      },
      opponent: {
        type: 'code',
        duration: 300,
        codeAnimation: {
          scale: {
            pattern: 'pulse',
            intensity: 0.02,
          },
          material: {
            pattern: 'emissive_pulse',
            color: 0x888890,                   // 颜色变暗（警示）
          },
        },
      },
    },

    // 下落动画：重力下落 + 纯净光晕拖尾
    fall: {
      default: {
        type: 'code',
        duration: 500,                         // 500ms下落
        codeAnimation: {
          position: {
            pattern: 'bounce',
            intensity: 0.2,                    // 弹跳幅度
            axis: 'y',
          },
          material: {
            pattern: 'emissive_pulse',
            color: 0xffffff,                   // 纯净光晕拖尾
          },
        },
      },
      own: {
        type: 'code',
        duration: 500,
        codeAnimation: {
          position: {
            pattern: 'bounce',
            intensity: 0.2,
            axis: 'y',
          },
          material: {
            pattern: 'emissive_pulse',
            color: 0xffffff,                   // 白棋白色拖尾
          },
        },
      },
      opponent: {
        type: 'code',
        duration: 500,
        codeAnimation: {
          position: {
            pattern: 'bounce',
            intensity: 0.2,
            axis: 'y',
          },
          material: {
            pattern: 'emissive_pulse',
            color: 0x6688cc,                   // 黑棋浅蓝拖尾
          },
        },
      },
    },

    // 对抗动画：涟漪效果 vs 警示下沉
    impact: {
      own: {
        type: 'code',
        duration: 200,
        codeAnimation: {
          position: {
            pattern: 'shake',
            intensity: 0.05,                   // 微下沉
          },
          material: {
            pattern: 'emissive_pulse',
            color: 0xe0e0e8,                   // 光晕涟漪
            intensity: 0.3,
          },
        },
      },
      opponent: {
        type: 'code',
        duration: 200,
        codeAnimation: {
          position: {
            pattern: 'shake',
            intensity: 0.05,
          },
          material: {
            pattern: 'emissive_pulse',
            color: 0x888890,                   // 警示下沉
          },
        },
      },
    },

    // v1.1 修正：胜利动画用纯白光
    win: {
      type: 'code',
      duration: 3000,                          // 3秒
      loop: true,
      codeAnimation: {
        position: {
          pattern: 'bounce',
          intensity: 0.15,                     // 轻微跳跃
        },
        material: {
          pattern: 'emissive_pulse',
          color: 0xffffff,                     // 纯白光晕增强
          intensity: 0.5,
        },
      },
    },

    // v1.1 修正：失败动画用暗淡灰
    lose: {
      type: 'code',
      duration: 3000,
      loop: true,
      codeAnimation: {
        material: {
          pattern: 'emissive_pulse',
          color: 0xd2d2d8,                     // 颜色淡化（暗淡灰）
          intensity: 0.1,
        },
      },
    },
  },

  // ==================== 元数据 ====================
  metadata: {
    author: 'Project Team',
    version: '1.1',
    tags: ['classic', 'minimalist', 'apple-style', 'default'],
    createdAt: '2026-04-24',
  },
};

/**
 * 经典主题默认棋子几何体参数
 * 供其他模块快速引用
 */
export const CLASSIC_GEOMETRY_PARAMS = {
  radius: BOARD_CONFIG.cellSize * 0.4,
  height: BOARD_CONFIG.cellHeight * 0.9,
  segments: 32,
};

/**
 * 经典主题颜色常量（便于其他模块引用）
 */
export const CLASSIC_COLORS = {
  // 棋子
  PIECE_BLACK: 0x1d1d1f,                       // #1d1d1f 深空灰
  PIECE_WHITE: 0xf5f5f7,                       // #f5f5f7 苹果白
  GLOW_BLACK: 0x3d3d42,                        // 黑棋光晕
  GLOW_WHITE: 0xffffff,                        // 白棋光晕

  // 棋盘
  BOARD_BASE: 0xf0f0f5,                        // #f0f0f5 毛玻璃
  BOARD_GRID: 0xc0c0c8,                        // #c0c0c8 浅灰网格

  // 高亮
  HIGHLIGHT_CELL: 0xe0e0e8,                    // #e0e0e8 浅灰白
  HIGHLIGHT_VERTICAL: 0xc0c0c8,

  // 背景
  BG_TOP: 0xf5f5f7,
  BG_BOTTOM: 0xd2d2d8,

  // 动画
  WIN_GLOW: 0xffffff,
  LOSE_GLOW: 0xd2d2d8,
  OPPONENT_WARN: 0x888890,
  FALL_TRAIL_WHITE: 0xffffff,
  FALL_TRAIL_BLACK: 0x6688cc,
};