/**
 * 猫咪主题配置（Phase 8）
 * 黑猫白猫对战，蹲坐/趴睡姿态
 *
 * 设计风格：
 * - 暖色调（木纹底座 + 暖橘网格）
 * - 毛皮质感（roughness=0.6）
 * - 暖色天空盒室内氛围
 * - 动画：尾巴摆动 + 耳朵微动（代码动画）
 *
 * 注意：
 * - 需要外部 GLB 模型素材（蹲坐 + 趴睡）
 * - 黑白共用模型，运行时改色
 * - 素材路径 placeholder，获取后更新
 */

import type { ThemeConfig } from '@/types/theme';

/**
 * 猫咪主题完整配置
 * 素材路径为占位符，获取实际素材后需更新
 */
export const CAT_THEME: ThemeConfig = {
  id: 'CAT',
  name: '猫咪主题',
  description: '黑猫白猫对战，蹲坐/趴睡姿态，暖色木纹风格',
  previewImage: '/assets/themes/cat/preview.png',

  // ==================== 棋子配置 ====================
  pieces: {
    // 黑猫（暗棕黑）
    black: {
      // GLB模型配置（黑白共用蹲坐模型，运行时改色）
      model: {
        path: '/assets/themes/cat/models/cat_sit.glb',  // TODO: 获取素材后更新
        scale: 0.5,
        rotation: { x: 0, y: 0, z: 0 },
      },
      // 休眠姿态模型（趴睡）
      sleepModel: {
        path: '/assets/themes/cat/models/cat_sleep.glb',  // TODO: 获取素材后更新
        scale: 0.5,
        rotation: { x: 0, y: 0, z: 0 },
      },
      // 毛皮质感（哑光）
      material: {
        metalness: 0.0,
        roughness: 0.6,
      },
    },

    // 白猫（暖白）
    white: {
      // 黑白共用蹲坐模型
      model: {
        path: '/assets/themes/cat/models/cat_sit.glb',  // TODO: 获取素材后更新
        scale: 0.5,
        rotation: { x: 0, y: 0, z: 0 },
      },
      // 休眠姿态模型（趴睡）
      sleepModel: {
        path: '/assets/themes/cat/models/cat_sleep.glb',  // TODO: 获取素材后更新
        scale: 0.5,
        rotation: { x: 0, y: 0, z: 0 },
      },
      // 毛皮质感（哑光）
      material: {
        metalness: 0.0,
        roughness: 0.6,
      },
    },
  },

  // ==================== 棋盘配置 ====================
  board: {
    // 底座类型：GLB模型（猫窝）或几何体（木纹）
    baseType: 'geometry',

    // 几何体配置（木纹质感）
    geometry: {
      type: 'box',
      color: 0x8B4513,                       // #8B4513 木纹
      metalness: 0.0,
      roughness: 0.7,                        // 哑光木纹
      opacity: 1.0,                          // 不透明
      borderRadius: 0.3,                     // 微圆角
    },

    // 纹理贴图（木纹）
    baseTexture: '/assets/themes/cat/textures/wood.png',  // TODO: 获取素材后更新

    // 网格样式（暖橘色）
    grid: {
      color: 0xFFB347,                       // #FFB347 暖橘
      opacity: 0.6,
      style: 'line',
    },

    // 高亮样式（暖色系）
    highlight: {
      // 底部格子高亮
      cellHighlight: {
        color: 0xFFD699,                     // #FFD699 暖橘高亮
        opacity: 0.4,
        emissiveIntensity: 0.5,
      },
      // 竖直空间网格线
      verticalHighlight: {
        color: 0xFFB347,                     // #FFB347 暖橘
        opacity: 0.4,
        emissiveIntensity: 0.5,
      },
      // 预览棋子高亮
      previewHighlight: {
        opacity: 0.4,
      },
    },

    // 暂无装饰物
    decorations: undefined,
  },

  // ==================== 环境配置 ====================
  environment: {
    // 暖色天空盒室内背景
    background: {
      type: 'skybox',
      value: [
        '/assets/themes/cat/skybox/room/posx.jpg',  // TODO: 获取素材后更新
        '/assets/themes/cat/skybox/room/negx.jpg',
        '/assets/themes/cat/skybox/room/posy.jpg',
        '/assets/themes/cat/skybox/room/negy.jpg',
        '/assets/themes/cat/skybox/room/posz.jpg',
        '/assets/themes/cat/skybox/room/negz.jpg',
      ],
    },
    lighting: {
      // 环境光（暖色调）
      ambient: {
        color: 0xFFE4C4,                     // 暖白
        intensity: 0.6,
      },
      // 主光源
      main: {
        color: 0xffffff,
        intensity: 0.8,
        position: { x: 5, y: 10, z: 7 },
      },
      // 补充光（暖橘）
      fill: {
        color: 0xFFB347,                     // 暖橘
        intensity: 0.2,
        position: { x: -5, y: 5, z: -5 },
      },
    },
  },

  // ==================== 动画配置 ====================
  animations: {
    // 猫咪主题有呼吸动画
    hasIdleAnimation: true,
    idleAnimation: {
      type: 'code',
      duration: 2000,                        // 2秒循环
      loop: true,
      codeAnimation: {
        scale: {
          pattern: 'pulse',
          intensity: 0.03,                   // ±3%呼吸
        },
        // 尾巴摆动 + 耳朵微动通过模型子部件实现
      },
    },

    // 悬停动画
    hover: {
      // 己方：看向鼠标 + 翻身露肚皮
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
            intensity: 0.1,                  // 翻身露肚皮
          },
        },
      },
      // 对方：伸爪拍打
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
            intensity: 0.15,                 // 伸爪拍打
          },
        },
      },
    },

    // 下落动画
    fall: {
      // 伸腿下落
      own: {
        type: 'code',
        duration: 500,
        codeAnimation: {
          position: {
            pattern: 'bounce',
            intensity: 0.1,
          },
        },
      },
      // 伸腿下落
      opponent: {
        type: 'code',
        duration: 500,
        codeAnimation: {
          position: {
            pattern: 'bounce',
            intensity: 0.1,
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
      // 己方：侧弯躲避
      own: {
        type: 'code',
        duration: 300,
        codeAnimation: {
          position: {
            pattern: 'shake',
            intensity: 0.08,                 // 侧弯躲避
          },
        },
      },
      // 对方：炸毛（膨胀+亮色）
      opponent: {
        type: 'code',
        duration: 300,
        codeAnimation: {
          scale: {
            pattern: 'expand',
            intensity: 0.1,                  // 炸毛膨胀
          },
          material: {
            pattern: 'emissive_pulse',
            color: 0xFFB347,
            intensity: 0.4,
          },
        },
      },
    },

    // 胜利动画（左右跳跃）
    win: {
      type: 'code',
      duration: 3000,
      loop: true,
      codeAnimation: {
        position: {
          pattern: 'bounce',
          intensity: 0.2,                    // 左右跳跃
        },
      },
    },

    // 失败动画（钻洞：缩入仅露头）
    lose: {
      type: 'code',
      duration: 3000,
      loop: true,
      codeAnimation: {
        position: {
          pattern: 'offset',
          intensity: 0.3,                    // 缩入
        },
      },
    },
  },

  // ==================== 元数据 ====================
  metadata: {
    author: 'Project Team',
    version: '1.0',
    tags: ['cat', 'cute', 'warm', 'animals'],
    createdAt: '2026-04-27',
  },
};

/**
 * 猫咪主题运行时改色常量
 * 加载 GLB 模型后通过 ThemeLoader.applyColorToModel 使用
 */
export const CAT_COLORS = {
  /** 黑猫暗棕黑 */
  BLACK_CAT: 0x1a1a22,
  /** 白猫暖白 */
  WHITE_CAT: 0xf0e8d8,
};
