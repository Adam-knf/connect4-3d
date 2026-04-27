/**
 * EnvironmentRenderer 环境渲染器（Phase 7 模块18）
 * 根据主题动态切换背景（颜色/渐变/天空盒）和光照
 *
 * 核心职责：
 * - 背景渲染：支持 color（纯色）、gradient（渐变）、skybox（天空盒）
 * - 光照管理：环境光 + 主光 + 补光（根据 ThemeConfig 配置）
 * - 切换时平滑过渡或立即切换
 */

import * as THREE from 'three';
import type { ThemeConfig, BackgroundTheme, LightTheme } from '@/types/theme';

/**
 * 环境渲染器接口（architecture.md 模块18）
 */
export interface IEnvironmentRenderer {
  init(scene: THREE.Scene): void;
  applyTheme(theme: ThemeConfig): Promise<void>;
  setBackground(bg: BackgroundTheme): void;
  setLighting(lighting: LightTheme): void;
  clear(): void;
}

/**
 * 环境渲染器
 * 实现环境主题化，增强视觉沉浸感
 */
export class EnvironmentRenderer implements IEnvironmentRenderer {
  /** Three.js 场景 */
  private scene: THREE.Scene | null = null;

  /** 环境光 */
  private ambientLight: THREE.AmbientLight | null = null;

  /** 主光源 */
  private mainLight: THREE.DirectionalLight | null = null;

  /** 补充光 */
  private fillLight: THREE.DirectionalLight | null = null;

  /** 是否已初始化 */
  private initialized: boolean = false;

  /**
   * 初始化（创建默认光照）
   * @param scene Three.js 场景
   */
  init(scene: THREE.Scene): void {
    this.scene = scene;

    // 创建默认光源
    this.createLights();

    this.initialized = true;
    console.log('[EnvironmentRenderer] Initialized');
  }

  /**
   * 创建光源
   */
  private createLights(): void {
    if (!this.scene) return;

    // 环境光（默认柔和白光）
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(this.ambientLight);

    // 主光源（右上前方）
    this.mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.mainLight.position.set(5, 10, 7);
    this.mainLight.castShadow = true;
    // 配置阴影参数
    this.mainLight.shadow.mapSize.width = 1024;
    this.mainLight.shadow.mapSize.height = 1024;
    this.mainLight.shadow.camera.near = 1;
    this.mainLight.shadow.camera.far = 20;
    this.mainLight.shadow.camera.left = -10;
    this.mainLight.shadow.camera.right = 10;
    this.mainLight.shadow.camera.top = 10;
    this.mainLight.shadow.camera.bottom = -10;
    this.scene.add(this.mainLight);

    // 补充光（左后方）
    this.fillLight = new THREE.DirectionalLight(0xe0e0f0, 0.4);
    this.fillLight.position.set(-5, 5, -5);
    this.scene.add(this.fillLight);

    console.log('[EnvironmentRenderer] Lights created');
  }

  /**
   * 应用主题环境配置
   * @param theme 主题配置
   */
  async applyTheme(theme: ThemeConfig): Promise<void> {
    if (!this.initialized || !this.scene) {
      console.warn('[EnvironmentRenderer] Not initialized');
      return;
    }

    console.log(`[EnvironmentRenderer] Applying theme: ${theme.id}`);

    // 应用背景
    this.setBackground(theme.environment.background);

    // 应用光照
    this.setLighting(theme.environment.lighting);

    console.log(`[EnvironmentRenderer] Theme ${theme.id} applied`);
  }

  /**
   * 设置背景
   * @param bg 背景配置
   */
  setBackground(bg: BackgroundTheme): void {
    if (!this.scene) return;

    switch (bg.type) {
      case 'color':
        // 纯色背景
        const colorValue = bg.value as number;
        this.scene.background = new THREE.Color(colorValue);
        console.log(`[EnvironmentRenderer] Background: color ${colorValue.toString(16)}`);
        break;

      case 'gradient':
        // 渐变背景（使用 Canvas 生成纹理）
        const gradientValue = bg.value as { top: number; bottom: number };
        const gradientTexture = this.createGradientTexture(gradientValue.top, gradientValue.bottom);
        this.scene.background = gradientTexture;
        console.log(`[EnvironmentRenderer] Background: gradient ${gradientValue.top.toString(16)} → ${gradientValue.bottom.toString(16)}`);
        break;

      case 'skybox':
        // 天空盒背景
        const skyboxPaths = bg.value as string[];
        // 天空盒由 ThemeLoader 加载，这里从缓存获取或创建简单默认
        this.loadSkybox(skyboxPaths);
        break;

      default:
        console.warn(`[EnvironmentRenderer] Unknown background type: ${bg.type}`);
    }
  }

  /**
   * 创建渐变纹理
   * @param topColor 顶部颜色
   * @param bottomColor 底部颜色
   */
  private createGradientTexture(topColor: number, bottomColor: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;  // 高分辨率渐变

    const context = canvas.getContext('2d');
    if (!context) {
      console.warn('[EnvironmentRenderer] Failed to create canvas context');
      return new THREE.CanvasTexture(canvas);
    }

    // 绘制渐变
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `#${topColor.toString(16).padStart(6, '0')}`);
    gradient.addColorStop(1, `#${bottomColor.toString(16).padStart(6, '0')}`);

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    return texture;
  }

  /**
   * 加载天空盒（异步）
   * @param paths 6面路径
   */
  private async loadSkybox(paths: string[]): Promise<void> {
    if (!this.scene) return;

    try {
      // 使用 CubeTextureLoader 加载
      const loader = new THREE.CubeTextureLoader();
      const cubeTexture = await new Promise<THREE.CubeTexture>((resolve, reject) => {
        loader.load(
          paths,
          (texture) => resolve(texture),
          undefined,
          (error) => {
            console.warn('[EnvironmentRenderer] Failed to load skybox:', error);
            reject(error);
          }
        );
      });

      this.scene.background = cubeTexture;
      console.log('[EnvironmentRenderer] Skybox loaded');
    } catch (error) {
      // 天空盒加载失败时使用默认渐变背景
      console.warn('[EnvironmentRenderer] Skybox load failed, using default gradient');
      this.scene.background = this.createGradientTexture(0xf5f5f7, 0xd2d2d8);
    }
  }

  /**
   * 设置光照
   * @param lighting 光照配置
   */
  setLighting(lighting: LightTheme): void {
    if (!this.ambientLight || !this.mainLight || !this.fillLight) {
      console.warn('[EnvironmentRenderer] Lights not created');
      return;
    }

    // 环境光
    this.ambientLight.color.setHex(lighting.ambient.color);
    this.ambientLight.intensity = lighting.ambient.intensity;

    // 主光源
    this.mainLight.color.setHex(lighting.main.color);
    this.mainLight.intensity = lighting.main.intensity;
    this.mainLight.position.set(
      lighting.main.position.x,
      lighting.main.position.y,
      lighting.main.position.z
    );

    // 补充光
    this.fillLight.color.setHex(lighting.fill.color);
    this.fillLight.intensity = lighting.fill.intensity;
    this.fillLight.position.set(
      lighting.fill.position.x,
      lighting.fill.position.y,
      lighting.fill.position.z
    );

    console.log(`[EnvironmentRenderer] Lighting applied: ambient=${lighting.ambient.color.toString(16)}, main=${lighting.main.color.toString(16)}`);
  }

  /**
   * 获取环境光（供外部调整）
   */
  getAmbientLight(): THREE.AmbientLight | null {
    return this.ambientLight;
  }

  /**
   * 获取主光源（供外部调整）
   */
  getMainLight(): THREE.DirectionalLight | null {
    return this.mainLight;
  }

  /**
   * 获取补充光（供外部调整）
   */
  getFillLight(): THREE.DirectionalLight | null {
    return this.fillLight;
  }

  /**
   * 清空（移除光源和背景）
   */
  clear(): void {
    if (!this.scene) return;

    // 移除光源
    if (this.ambientLight) {
      this.scene.remove(this.ambientLight);
      this.ambientLight.dispose();
      this.ambientLight = null;
    }
    if (this.mainLight) {
      this.scene.remove(this.mainLight);
      this.mainLight.dispose();
      this.mainLight = null;
    }
    if (this.fillLight) {
      this.scene.remove(this.fillLight);
      this.fillLight.dispose();
      this.fillLight = null;
    }

    // 清除背景
    this.scene.background = null;

    this.initialized = false;
    console.log('[EnvironmentRenderer] Cleared');
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.clear();
    console.log('[EnvironmentRenderer] Disposed');
  }
}