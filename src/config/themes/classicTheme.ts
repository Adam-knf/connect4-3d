/**
 * 经典主题配置
 * 黑白圆柱棋子，简约风格
 *
 * 特点：
 * - 几何体棋子（CylinderGeometry）
 * - 无呼吸动画（hasIdleAnimation: false）
 * - 简约深色背景
 * - 标准三色光照
 */

import type { ThemeConfig } from '@/types/theme';
import { BOARD_CONFIG } from '@/config/gameConfig';

/**
 * 经典主题完整配置
 */
export const CLASSIC_THEME: ThemeConfig = {
  id: 'CLASSIC',
  name: '经典主题',
  description: '黑白圆柱棋子，简约风格',
  previewImage: '/assets/themes/classic/preview.png',

  // ==================== 棋子配置 ====================
  pieces: {
    // 黑棋
    black: {
      geometry: {
        type: 'cylinder',
        radius: BOARD_CONFIG.cellSize * 0.4,    // 圆柱半径（接近格子宽度一半）
        height: BOARD_CONFIG.cellHeight * 0.9,  // 圆柱高度（略扁）
        color: 0x1a1a22,                         // #1a1a22 深灰色
        metalness: 0.0,                          // 纯塑料质感
        roughness: 0.4,                          // 光滑表面
      },
      // 无GLB模型（经典主题用几何体）
    },

    // 白棋
    white: {
      geometry: {
        type: 'cylinder',
        radius: BOARD_CONFIG.cellSize * 0.4,
        height: BOARD_CONFIG.cellHeight * 0.9,
        color: 0xf0f0f5,                         // #f0f0f5 亮白色
        metalness: 0.0,
        roughness: 0.4,
      },
    },
  },

  // ==================== 棋盘配置 ====================
  board: {
    // 底座类型：几何体（简约风格）
    baseType: 'geometry',

    // 几何体配置（简约底座）
    geometry: {
      type: 'platform',
      color: 0x383840,         // #383840 钢铁灰底座
      metalness: 0.0,
      roughness: 0.9,
      opacity: 0.5,
    },

    // 无GLB模型（经典主题用几何体）
    // model: undefined

    // 无纹理贴图
    baseTexture: undefined,

    // 网格样式（简约线条）
    grid: {
      color: 0x505058,         // #505058 中灰色网格
      opacity: 0.6,
      style: 'line',           // 简约线条风格
      // 无发光效果（经典主题简约）
    },

    // 高亮样式（蓝色强调色）
    highlight: {
      // 底部格子高亮
      cellHighlight: {
        color: 0x3d9eff,       // #3d9eff 蓝色
        opacity: 0.4,
        emissiveIntensity: 0.8,
      },
      // 竖直空间网格线
      verticalHighlight: {
        color: 0x3d9eff,       // #3d9eff 蓝色
        opacity: 0.3,
        emissiveIntensity: 0.5,
      },
      // 预览棋子高亮
      previewHighlight: {
        opacity: 0.4,          // 半透明预览
        // 无发光效果
      },
    },

    // 无装饰物（经典主题简约）
    decorations: undefined,
  },

  // ==================== 环境配置 ====================
  environment: {
    background: {
      type: 'color',
      value: 0x1a1a22,       // #1a1a22 深色背景
    },
    lighting: {
      // 环境光（提高整体亮度）
      ambient: {
        color: 0xffffff,
        intensity: 0.6,
      },
      // 主光源（右上前方）
      main: {
        color: 0xffffff,
        intensity: 1.0,
        position: { x: 5, y: 10, z: 7 },
      },
      // 补充光（左后方，蓝色调）
      fill: {
        color: 0x3d9eff,      // #3d9eff
        intensity: 0.3,
        position: { x: -5, y: 5, z: -5 },
      },
    },
  },

  // ==================== 动画配置 ====================
  animations: {
    // 经典主题无呼吸动画（静态圆柱）
    hasIdleAnimation: false,
    idleAnimation: undefined,

    // 悬停动画：看向鼠标位置（己方/对方相同）
    hover: {
      own: {
        type: 'code',
        duration: 300,
        codeAnimation: {
          rotation: {
            axis: 'y',
            lookAt: true,     // 微旋转面向鼠标
          },
        },
      },
      opponent: {
        type: 'code',
        duration: 300,
        codeAnimation: {
          rotation: {
            axis: 'y',
            lookAt: true,
          },
        },
      },
    },

    // 下落动画：重力下落（己方/对方/默认相同）
    // 拖尾粒子效果在代码实现中添加
    fall: {
      default: {
        type: 'code',
        duration: 500,       // 500ms下落
        codeAnimation: {
          position: {
            pattern: 'bounce',
            intensity: 0.2,  // 弹跳幅度
            axis: 'y',
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
        },
      },
    },

    // 对抗动画：通用受击反馈（己方/对方相同）
    impact: {
      own: {
        type: 'code',
        duration: 200,
        codeAnimation: {
          position: {
            pattern: 'shake',
            intensity: 0.05,  // 微震动
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
        },
      },
    },

    // 胜利动画：发光高亮（绿色）
    win: {
      type: 'code',
      duration: 3000,        // 3秒
      loop: true,
      codeAnimation: {
        material: {
          pattern: 'emissive_pulse',
          color: 0x4ade80,   // #4ade80 绿色
          intensity: 2,
        },
      },
    },

    // 失败动画：暗淡化（红色）
    lose: {
      type: 'code',
      duration: 3000,
      loop: true,
      codeAnimation: {
        material: {
          pattern: 'emissive_pulse',
          color: 0xff6b4a,   // #ff6b4a 红色
          intensity: 1.5,
        },
      },
    },
  },

  // ==================== 元数据 ====================
  metadata: {
    author: 'Project Team',
    version: '1.0',
    tags: ['classic', 'minimalist', 'default'],
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