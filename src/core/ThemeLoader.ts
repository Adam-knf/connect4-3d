/**
 * ThemeLoader 素材加载器（Phase 7 模块14）
 * 统一加载 GLB 模型、纹理、天空盒，管理缓存和加载状态
 *
 * 核心职责：
 * - 使用 GLTFLoader 加载 GLB 模型（猫咪/机甲主题）
 * - 使用 TextureLoader 加载纹理贴图
 * - 使用 CubeTextureLoader 加载天空盒
 * - 素材缓存，避免重复加载
 * - 黑白共用模型，运行时改色
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { ThemeId, ThemeConfig, MaterialConfig } from '@/types/theme';
import { CLASSIC_COLORS } from '@/config/themes/classicTheme';
import { CAT_COLORS } from '@/config/themes/catTheme';
import { MECHA_COLORS } from '@/config/themes/mechaTheme';

/**
 * 素材缓存类型
 */
type AssetCache = Map<string, THREE.Object3D | THREE.Texture | THREE.CubeTexture>;

/**
 * 素材加载器接口（architecture.md 模块14）
 */
export interface IThemeLoader {
  loadModel(path: string): Promise<THREE.Group>;
  loadTexture(path: string): Promise<THREE.Texture>;
  loadSkybox(paths: string[]): Promise<THREE.CubeTexture>;
  preloadTheme(config: ThemeConfig): Promise<void>;
  applyColorToModel(model: THREE.Group, color: number, materialConfig?: MaterialConfig): void;
  clearCache(): void;
}

/**
 * 素材加载器
 * 提供统一的素材加载和缓存服务
 */
export class ThemeLoader implements IThemeLoader {
  /** GLTF 加载器 */
  private gltfLoader: GLTFLoader;

  /** 纹理加载器 */
  private textureLoader: THREE.TextureLoader;

  /** 天空盒加载器 */
  private cubeTextureLoader: THREE.CubeTextureLoader;

  /** 素材缓存 */
  private cache: AssetCache = new Map();

  /** 加载中的 Promise 映射（防止重复加载） */
  private loadingPromises: Map<string, Promise<THREE.Object3D | THREE.Texture | THREE.CubeTexture>> = new Map();

  /**
   * 构造函数
   */
  constructor() {
    this.gltfLoader = new GLTFLoader();
    this.textureLoader = new THREE.TextureLoader();
    this.cubeTextureLoader = new THREE.CubeTextureLoader();
  }

  /**
   * 加载 GLB 模型
   * @param path 模型路径
   * @returns Three.js Group
   */
  async loadModel(path: string): Promise<THREE.Group> {
    // 检查缓存
    const cached = this.cache.get(path);
    if (cached && cached instanceof THREE.Group) {
      // 返回克隆的模型（避免修改缓存对象）
      return cached.clone();
    }

    // 检查是否正在加载
    const loading = this.loadingPromises.get(path);
    if (loading) {
      const result = await loading;
      if (result instanceof THREE.Group) {
        return result.clone();
      }
      throw new Error(`[ThemeLoader] Loading promise for ${path} returned unexpected type`);
    }

    // 开始加载
    console.log(`[ThemeLoader] Loading model: ${path}`);
    const promise = new Promise<THREE.Group>((resolve, reject) => {
      this.gltfLoader.load(
        path,
        (gltf) => {
          // 缓存原始模型
          this.cache.set(path, gltf.scene);
          this.loadingPromises.delete(path);
          console.log(`[ThemeLoader] Model loaded: ${path}`);
          resolve(gltf.scene.clone());
        },
        (progress) => {
          // 加载进度（可选）
          if (progress.total > 0) {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            console.log(`[ThemeLoader] Loading ${path}: ${percent}%`);
          }
        },
        (error) => {
          this.loadingPromises.delete(path);
          console.error(`[ThemeLoader] Failed to load model ${path}:`, error);
          reject(error);
        }
      );
    });

    this.loadingPromises.set(path, promise as Promise<THREE.Object3D | THREE.Texture | THREE.CubeTexture>);
    return promise;
  }

  /**
   * 加载纹理贴图
   * @param path 纹理路径
   * @returns Three.js Texture
   */
  async loadTexture(path: string): Promise<THREE.Texture> {
    // 检查缓存
    const cached = this.cache.get(path);
    if (cached && cached instanceof THREE.Texture) {
      return cached;
    }

    // 检查是否正在加载
    const loading = this.loadingPromises.get(path);
    if (loading) {
      const result = await loading;
      if (result instanceof THREE.Texture) {
        return result;
      }
      throw new Error(`[ThemeLoader] Loading promise for ${path} returned unexpected type`);
    }

    // 开始加载
    console.log(`[ThemeLoader] Loading texture: ${path}`);
    const promise = new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader.load(
        path,
        (texture) => {
          // 缓存纹理
          this.cache.set(path, texture);
          this.loadingPromises.delete(path);
          console.log(`[ThemeLoader] Texture loaded: ${path}`);
          resolve(texture);
        },
        undefined,
        (error) => {
          this.loadingPromises.delete(path);
          console.error(`[ThemeLoader] Failed to load texture ${path}:`, error);
          reject(error);
        }
      );
    });

    this.loadingPromises.set(path, promise as Promise<THREE.Object3D | THREE.Texture | THREE.CubeTexture>);
    return promise;
  }

  /**
   * 加载天空盒
   * @param paths 6面路径数组 [posx, negx, posy, negy, posz, negz]
   * @returns Three.js CubeTexture
   */
  async loadSkybox(paths: string[]): Promise<THREE.CubeTexture> {
    // 使用路径数组作为缓存键
    const cacheKey = paths.join('|');

    // 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached && cached instanceof THREE.CubeTexture) {
      return cached;
    }

    // 检查是否正在加载
    const loading = this.loadingPromises.get(cacheKey);
    if (loading) {
      const result = await loading;
      if (result instanceof THREE.CubeTexture) {
        return result;
      }
      throw new Error(`[ThemeLoader] Loading promise for skybox returned unexpected type`);
    }

    // 开始加载
    console.log(`[ThemeLoader] Loading skybox: ${paths[0]}...`);
    const promise = new Promise<THREE.CubeTexture>((resolve, reject) => {
      this.cubeTextureLoader.load(
        paths,
        (cubeTexture) => {
          // 缓存天空盒
          this.cache.set(cacheKey, cubeTexture);
          this.loadingPromises.delete(cacheKey);
          console.log(`[ThemeLoader] Skybox loaded`);
          resolve(cubeTexture);
        },
        undefined,
        (error) => {
          this.loadingPromises.delete(cacheKey);
          console.error(`[ThemeLoader] Failed to load skybox:`, error);
          reject(error);
        }
      );
    });

    this.loadingPromises.set(cacheKey, promise as Promise<THREE.Object3D | THREE.Texture | THREE.CubeTexture>);
    return promise;
  }

  /**
   * 预加载整套主题素材
   * @param config 主题配置
   */
  async preloadTheme(config: ThemeConfig): Promise<void> {
    console.log(`[ThemeLoader] Preloading theme: ${config.id}`);

    const loadPromises: Promise<unknown>[] = [];

    // 加载棋子模型（如果配置了 GLB）
    const pieceConfigs = [config.pieces.black, config.pieces.white];
    for (const pieceConfig of pieceConfigs) {
      // 加载活跃姿态模型
      if (pieceConfig.model?.path) {
        loadPromises.push(this.loadModel(pieceConfig.model.path).catch(err => {
          console.warn(`[ThemeLoader] Failed to load piece model ${pieceConfig.model!.path}:`, err);
          // 模型加载失败不阻止主题切换，后续渲染时会 fallback
        }));
      }

      // 加载休眠姿态模型
      if (pieceConfig.sleepModel?.path) {
        loadPromises.push(this.loadModel(pieceConfig.sleepModel.path).catch(err => {
          console.warn(`[ThemeLoader] Failed to load sleep model ${pieceConfig.sleepModel!.path}:`, err);
        }));
      }
    }

    // 加载棋盘纹理
    if (config.board.baseTexture) {
      loadPromises.push(this.loadTexture(config.board.baseTexture).catch(err => {
        console.warn(`[ThemeLoader] Failed to load board texture ${config.board.baseTexture}:`, err);
      }));
    }

    // 加载天空盒
    if (config.environment.background.type === 'skybox' && Array.isArray(config.environment.background.value)) {
      loadPromises.push(this.loadSkybox(config.environment.background.value).catch(err => {
        console.warn(`[ThemeLoader] Failed to load skybox:`, err);
      }));
    }

    // 并行加载所有素材
    await Promise.all(loadPromises);

    console.log(`[ThemeLoader] Theme ${config.id} preloaded`);
  }

  /**
   * 黑白共用模型改色
   * 在加载 GLB 后 traverse 修改材质颜色
   *
   * 黑猫: #1a1a22（暗棕黑） / 白猫: #f0e8d8（暖白）
   * 黑机甲: #1a1a2a（深蓝灰） / 白机甲: #d0d8e8（冷白）
   *
   * @param model 模型 Group
   * @param color 目标颜色
   * @param materialConfig 材质物理参数（可选）
   */
  applyColorToModel(model: THREE.Group, color: number, materialConfig?: MaterialConfig): void {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material;

        // 处理单材质和多材质情况
        if (material instanceof THREE.MeshStandardMaterial) {
          // 设置颜色
          material.color.setHex(color);

          // 设置材质物理参数
          if (materialConfig) {
            if (materialConfig.metalness !== undefined) {
              material.metalness = materialConfig.metalness;
            }
            if (materialConfig.roughness !== undefined) {
              material.roughness = materialConfig.roughness;
            }
          }

          // 确保材质需要更新
          material.needsUpdate = true;
        } else if (Array.isArray(material)) {
          // 多材质数组
          for (const mat of material) {
            if (mat instanceof THREE.MeshStandardMaterial) {
              mat.color.setHex(color);
              if (materialConfig) {
                if (materialConfig.metalness !== undefined) {
                  mat.metalness = materialConfig.metalness;
                }
                if (materialConfig.roughness !== undefined) {
                  mat.roughness = materialConfig.roughness;
                }
              }
              mat.needsUpdate = true;
            }
          }
        }
      }
    });

    console.log(`[ThemeLoader] Applied color ${color.toString(16)} to model`);
  }

  /**
   * 获取主题棋子颜色
   * @param themeId 主题ID
   * @param player 玩家类型
   */
  getPieceColor(themeId: ThemeId, player: 'BLACK' | 'WHITE'): number {
    switch (themeId) {
      case 'CLASSIC':
        return player === 'BLACK' ? CLASSIC_COLORS.PIECE_BLACK : CLASSIC_COLORS.PIECE_WHITE;
      case 'CAT':
        return player === 'BLACK' ? CAT_COLORS.BLACK_CAT : CAT_COLORS.WHITE_CAT;
      case 'MECHA':
        return player === 'BLACK' ? MECHA_COLORS.BLACK_MECHA : MECHA_COLORS.WHITE_MECHA;
      default:
        // 默认使用经典主题颜色
        return player === 'BLACK' ? CLASSIC_COLORS.PIECE_BLACK : CLASSIC_COLORS.PIECE_WHITE;
    }
  }

  /**
   * 获取缓存对象
   * @param key 缓存键
   */
  getCache(key: string): THREE.Object3D | THREE.Texture | THREE.CubeTexture | null {
    return this.cache.get(key) ?? null;
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    // 清理缓存中的对象
    this.cache.forEach((obj) => {
      if (obj instanceof THREE.Texture || obj instanceof THREE.CubeTexture) {
        (obj as THREE.Texture).dispose();
      } else if (obj instanceof THREE.Object3D) {
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (child.material instanceof THREE.Material) {
              child.material.dispose();
            } else if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            }
          }
        });
      }
    });

    this.cache.clear();
    this.loadingPromises.clear();
    console.log('[ThemeLoader] Cache cleared');
  }

  /**
   * 检查素材是否已缓存
   * @param path 素材路径
   */
  isCached(path: string): boolean {
    return this.cache.has(path);
  }
}