/**
 * 机甲主题配置（Phase 9）
 * 机甲对战，站立/收拢姿态
 *
 * 设计风格：
 * - 冷色调（金属底座 + 冰蓝网格 + 发光效果）
 * - 高金属感（metalness=0.7, roughness=0.3）
 * - 冷色天空盒科技感背景
 * - 动画：机械部件开合 + 灯光流动（代码动画）
 *
 * 注意：
 * - 需要外部 GLB 模型素材（站立 + 收拢）
 * - 黑白共用模型，运行时改色
 * - 素材路径 placeholder，获取后更新
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
      // GLB模型配置（黑白共用站立模型，运行时改色）
      model: {
        path: '/assets/themes/mecha/models/mecha_stand.glb',  // TODO: 获取素材后更新
        scale: 0.5,
        rotation: { x: 0, y: 0, z: 0 },
      },
      // 休眠姿态模型（收拢）
      sleepModel: {
        path: '/assets/themes/mecha/models/mecha_fold.glb',  // TODO: 获取素材后更新
        scale: 0.5,
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
      // 黑白共用站立模型
      model: {
        path: '/assets/themes/mecha/models/mecha_stand.glb',  // TODO: 获取素材后更新
        scale: 0.5,
        rotation: { x: 0, y: 0, z: 0 },
      },
      // 休眠姿态模型（收拢）
      sleepModel: {
        path: '/assets/themes/mecha/models/mecha_fold.glb',  // TODO: 获取素材后更新
        scale: 0.5,
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

    // 纹理贴图（金属）
    baseTexture: '/assets/themes/mecha/textures/metal.png',  // TODO: 获取素材后更新

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
    // 冷色科技感天空盒
    background: {
      type: 'skybox',
      value: [
        '/assets/themes/mecha/skybox/tech/posx.jpg',  // TODO: 获取素材后更新
        '/assets/themes/mecha/skybox/tech/negx.jpg',
        '/assets/themes/mecha/skybox/tech/posy.jpg',
        '/assets/themes/mecha/skybox/tech/negy.jpg',
        '/assets/themes/mecha/skybox/tech/posz.jpg',
        '/assets/themes/mecha/skybox/tech/negz.jpg',
      ],
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
    // 机甲主题有呼吸动画
    hasIdleAnimation: true,
    idleAnimation: {
      type: 'code',
      duration: 2000,                        // 2秒循环
      loop: true,
      codeAnimation: {
        scale: {
          pattern: 'pulse',
          intensity: 0.02,                   // ±2%机械呼吸
        },
        material: {
          pattern: 'emissive_pulse',
          color: 0x00ccff,                   // 灯光流动
          intensity: 0.2,
        },
        // 机械部件开合通过模型子部件实现
      },
    },

    // 悬停动画
    hover: {
      // 己方：看向鼠标 + 微蹲准备 + 灯光加速
      own: {
        type: 'code',
        duration: 200,
        codeAnimation: {
          rotation: {
            axis: 'y',
            angle: 15,                       // 看向鼠标
          },
          position: {
            pattern: 'offset',
            intensity: 0.05,                 // 微蹲准备
          },
          material: {
            pattern: 'emissive_pulse',
            color: 0x00ccff,
            intensity: 0.5,                  // 灯光流动加速
          },
        },
      },
      // 对方：左盾右剑半举
      opponent: {
        type: 'code',
        duration: 200,
        codeAnimation: {
          rotation: {
            axis: 'y',
            angle: 15,                       // 看向鼠标
          },
          position: {
            pattern: 'bounce',
            intensity: 0.1,                  // 举盾剑威胁
          },
        },
      },
    },

    // 下落动画（区分己方/对方）
    fall: {
      // 己方下落：举盾俯冲
      own: {
        type: 'code',
        duration: 500,
        codeAnimation: {
          position: {
            pattern: 'bounce',
            intensity: 0.1,                  // 举盾俯冲
          },
        },
      },
      // 对方下落：举剑俯冲
      opponent: {
        type: 'code',
        duration: 500,
        codeAnimation: {
          position: {
            pattern: 'bounce',
            intensity: 0.1,                  // 举剑俯冲
          },
        },
      },
      default: {
        type: 'code',
        duration: 500,
        codeAnimation: {
          position: {
            pattern: 'bounce',
            intensity: 0.1,
          },
        },
      },
    },

    // 对抗动画
    impact: {
      // 己方：巨盾迎接（冰蓝盾牌光）
      own: {
        type: 'code',
        duration: 300,
        codeAnimation: {
          position: {
            pattern: 'shake',
            intensity: 0.05,                 // 巨盾迎接
          },
          material: {
            pattern: 'emissive_pulse',
            color: 0x00ccff,
            intensity: 0.4,                  // 冰蓝盾牌光
          },
        },
      },
      // 对方：举剑威胁（红光）
      opponent: {
        type: 'code',
        duration: 300,
        codeAnimation: {
          position: {
            pattern: 'bounce',
            intensity: 0.08,                 // 举剑威胁
          },
          material: {
            pattern: 'emissive_pulse',
            color: 0xff3366,                 // 红光
            intensity: 0.3,
          },
        },
      },
    },

    // 胜利动画（双臂高举欢呼）
    win: {
      type: 'code',
      duration: 3000,
      loop: true,
      codeAnimation: {
        position: {
          pattern: 'bounce',
          intensity: 0.2,                    // 双臂高举欢呼
        },
      },
    },

    // 失败动画（能量熄灭：灯光归零）
    lose: {
      type: 'code',
      duration: 3000,
      loop: true,
      codeAnimation: {
        material: {
          pattern: 'emissive_pulse',
          color: 0xff3366,                   // 红光
          intensity: 0.0,                    // 灯光熄灭
        },
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
