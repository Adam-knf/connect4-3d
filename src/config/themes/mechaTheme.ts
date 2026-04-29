/**
 * 机甲主题配置（Phase 9）
 * 机甲对战，GLB模型棋子
 *
 * 设计风格：
 * - 冷色调（金属底座 + 冰蓝网格 + 发光效果）
 * - 高金属感（metalness=0.7, roughness=0.3）
 * - 深色科技感渐变背景
 * - 动画：GLB模型自带动画（运行时改色）
 *
 * 当前状态：
 * - 棋盘贴图：chessboard.png（金属平台棋盘）
 * - 棋子模型：tyrael_mecha.glb（黑白共用，运行时改色）
 * - 天空盒：已取消，使用渐变背景
 * - 动画：使用模型内建动画 + 代码动画混合
 */

import type { ThemeConfig } from '@/types/theme';

/**
 * 机甲主题完整配置
 * 素材路径为占位符，获取实际素材后需更新
 */
export const MECHA_THEME: ThemeConfig = {
  id: 'MECHA',
  name: '机甲主题',
  description: '机甲对战，站立/收拢姿态，冷色金属科技风格',
  previewImage: '/assets/themes/mecha/preview.png',

  // ==================== 棋子配置 ====================
  pieces: {
    // 黑机甲（深蓝灰）
    black: {
      // GLB模型配置（黑白共用模型，运行时改色）
      model: {
        path: '/assets/mecha/tyrael_mecha.glb',
        scale: 0.4,  // 手动调整，越小模型越小
        rotation: { x: 0, y: 0, z: 0 },
      },
      // 高金属感+光滑
      material: {
        metalness: 0.7,
        roughness: 0.3,
      },
    },

    // 白机甲（冷白）
    white: {
      // 黑白共用模型
      model: {
        path: '/assets/mecha/tyrael_mecha.glb',
        scale: 0.4,  // 手动调整，越小模型越小
        rotation: { x: 0, y: 0, z: 0 },
      },
      // 高金属感+光滑
      material: {
        metalness: 0.7,
        roughness: 0.3,
      },
    },
  },

  // ==================== 棋盘配置 ====================
  board: {
    // 底座类型：几何体（金属质感）
    baseType: 'geometry',

    // 几何体配置（金属质感）
    geometry: {
      type: 'box',
      color: 0x2a2a3a,                       // #2a2a3a 金属
      metalness: 0.7,
      roughness: 0.3,                        // 光滑金属
      opacity: 1.0,                          // 不透明
      borderRadius: 0.1,                     // 机甲风格直角
    },

    // 纹理贴图（金属平台棋盘）
    baseTexture: '/assets/themes/mecha/textures/chessboard.png',

    // 网格样式（冰蓝色发光）
    grid: {
      color: 0x00aaff,                       // #00aaff 冰蓝
      opacity: 0.8,
      style: 'glow',                         // 发光效果
      emissive: 0x0066cc,                    // 蓝色发光
      emissiveIntensity: 0.3,
    },

    // 高亮样式（冷色系）
    highlight: {
      // 底部格子高亮
      cellHighlight: {
        color: 0x00ddff,                     // #00ddff 冰蓝高亮
        opacity: 0.5,
        emissiveIntensity: 0.6,
      },
      // 竖直空间网格线
      verticalHighlight: {
        color: 0x00bbff,                     // #00bbff 冰蓝
        opacity: 0.5,
        emissiveIntensity: 0.6,
      },
      // 预览棋子高亮（全息感）
      previewHighlight: {
        opacity: 0.35,                       // 全息投影
        emissive: 0x00aaff,                  // 冰蓝发光
      },
    },

    // 暂无装饰物
    decorations: undefined,
  },

  // ==================== 环境配置 ====================
  environment: {
    // 深色科技感渐变背景（天空盒已取消）
    background: {
      type: 'gradient',
      value: {
        top: 0x1a1a2a,                         // #1a1a2a 深蓝黑上浅
        bottom: 0x0a0a1a,                      // #0a0a1a 更深下深
      },
    },
    lighting: {
      // 环境光（冷色调）
      ambient: {
        color: 0x4488ff,                     // 冷蓝
        intensity: 0.5,
      },
      // 主光源
      main: {
        color: 0xffffff,
        intensity: 1.0,
        position: { x: 5, y: 10, z: 7 },
      },
      // 补充光（冰蓝）
      fill: {
        color: 0x00ccff,                     // 冰蓝
        intensity: 0.3,
        position: { x: -5, y: 5, z: -5 },
      },
    },
  },

  // ==================== 动画配置 ====================
  animations: {
    // 机甲主题有呼吸动画（各状态使用专用内建动画 + 代码效果叠加）
    hasIdleAnimation: true,
    idleAnimation: {
      type: 'builtin',
      builtinName: 'Armature_Stand_full',
      duration: 2667,
      loop: true,
    },

    // 悬停动画
    hover: {
      // 己方：战斗预备姿态 + 冰蓝灯光
      own: {
        type: 'builtin',
        builtinName: 'Armature_Stand Ready_full',
        duration: 1333,
        loop: true,
        codeAnimation: {
          rotation: { axis: 'y', angle: 15 },
          material: { pattern: 'emissive_pulse', color: 0x00ccff, intensity: 0.5 },
        },
      },
      // 对方：战斗预备姿态 + 威胁抖动
      opponent: {
        type: 'builtin',
        builtinName: 'Armature_Stand Ready_full',
        duration: 1333,
        loop: true,
        codeAnimation: {
          rotation: { axis: 'y', angle: 15 },
          position: { pattern: 'bounce', intensity: 0.1 },
        },
      },
    },

    // 下落动画（区分己方/对方）
    fall: {
      // 己方下落：攻击姿态 + 弹跳
      own: {
        type: 'builtin',
        builtinName: 'Armature_Attack_full',
        duration: 2133,
        loop: false,
        codeAnimation: {
          position: { pattern: 'bounce', intensity: 0.1 },
        },
      },
      // 对方下落：攻击03姿态 + 弹跳
      opponent: {
        type: 'builtin',
        builtinName: 'Armature_Attack 03_full',
        duration: 2167,
        loop: false,
        codeAnimation: {
          position: { pattern: 'bounce', intensity: 0.1 },
        },
      },
      // 底部为空：标准待机 + 弹跳
      default: {
        type: 'builtin',
        builtinName: 'Armature_Stand_full',
        duration: 2667,
        loop: true,
        codeAnimation: {
          position: { pattern: 'bounce', intensity: 0.1 },
        },
      },
    },

    // 对抗动画
    impact: {
      // 己方：法术 B + 冰蓝盾光震击
      own: {
        type: 'builtin',
        builtinName: 'Armature_Spell B_full',
        duration: 867,
        loop: false,
        codeAnimation: {
          position: { pattern: 'shake', intensity: 0.05 },
          material: { pattern: 'emissive_pulse', color: 0x00ccff, intensity: 0.4 },
        },
      },
      // 对方：法术 C + 红光威胁
      opponent: {
        type: 'builtin',
        builtinName: 'Armature_Spell C_full',
        duration: 867,
        loop: false,
        codeAnimation: {
          position: { pattern: 'bounce', intensity: 0.08 },
          material: { pattern: 'emissive_pulse', color: 0xff3366, intensity: 0.3 },
        },
      },
    },

    // 胜利动画（胜利欢呼）
    win: {
      type: 'builtin',
      builtinName: 'Armature_Stand Victory_full',
      duration: 2000,
      loop: true,
      codeAnimation: {
        position: { pattern: 'bounce', intensity: 0.2 },
      },
    },

    // 失败动画（T-pose + 能量熄灭）
    lose: {
      type: 'builtin',
      builtinName: 'Armature_DEFAULTS.001',
      duration: 3000,
      loop: true,
      codeAnimation: {
        material: { pattern: 'emissive_pulse', color: 0xff3366, intensity: 0.0 },
      },
    },
  },

  // ==================== 元数据 ====================
  metadata: {
    author: 'Project Team',
    version: '1.0',
    tags: ['mecha', 'robot', 'cold', 'sci-fi', 'metal'],
    createdAt: '2026-04-27',
  },
};

/**
 * 机甲主题运行时改色常量
 * 加载 GLB 模型后通过 ThemeLoader.applyColorToModel 使用
 */
export const MECHA_COLORS = {
  /** 黑机甲深蓝灰 */
  BLACK_MECHA: 0x1a1a2a,
  /** 白机甲冷白 */
  WHITE_MECHA: 0xd0d8e8,
};
