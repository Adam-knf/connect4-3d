/**
 * ThemeManager 主题管理器（Phase 7 模块13）
 * 管理主题配置、切换流程、素材状态
 *
 * 核心职责：
 * - 维护当前主题ID和所有注册的主题配置
 * - 协调 ThemeLoader 加载素材
 * - 通知所有渲染器应用新主题
 * - 切换失败时自动 fallback 到经典主题
 */

import type { ThemeId, ThemeConfig } from '@/types/theme';
import { ThemeLoader } from './ThemeLoader';

/**
 * 主题变更回调类型
 */
export type ThemeChangeCallback = (theme: ThemeId) => void;

/**
 * 主题管理器接口（architecture.md 模块13）
 */
export interface IThemeManager {
  currentTheme: ThemeId;
  setTheme(id: ThemeId): Promise<boolean>;
  getThemeConfig(): ThemeConfig;
  isLoaded(id: ThemeId): boolean;
  onThemeChange(callback: ThemeChangeCallback): void;
}

/**
 * 主题管理器
 * 实现主题切换的核心流程，确保切换安全可靠
 */
export class ThemeManager implements IThemeManager {
  /** 当前主题ID */
  private _currentTheme: ThemeId = 'CLASSIC';

  /** 所有注册的主题配置 */
  private themes: Map<ThemeId, ThemeConfig> = new Map();

  /** 素材加载器 */
  private loader: ThemeLoader;

  /** 已加载的主题集合 */
  private loadedThemes: Set<ThemeId> = new Set();

  /** 主题变更回调列表 */
  private changeCallbacks: ThemeChangeCallback[] = [];

  /** 主题应用回调列表（通知渲染器） */
  private applyCallbacks: Array<(theme: ThemeConfig) => Promise<void>> = [];

  /**
   * 构造函数
   * @param loader 素材加载器
   */
  constructor(loader: ThemeLoader) {
    this.loader = loader;
  }

  /**
   * 注册主题配置
   * @param id 主题ID
   * @param config 主题配置
   */
  registerTheme(id: ThemeId, config: ThemeConfig): void {
    this.themes.set(id, config);
    console.log(`[ThemeManager] Registered theme: ${id} (${config.name})`);
  }

  /**
   * 获取当前主题ID
   */
  get currentTheme(): ThemeId {
    return this._currentTheme;
  }

  /**
   * 切换主题（异步，含加载）
   * @param id 目标主题ID
   * @returns 切换是否成功（失败时自动 fallback 到 CLASSIC）
   */
  async setTheme(id: ThemeId): Promise<boolean> {
    console.log(`[ThemeManager] Switching to theme: ${id}`);

    // 检查主题是否已注册
    const config = this.themes.get(id);
    if (!config) {
      console.error(`[ThemeManager] Theme ${id} not registered`);
      return false;
    }

    // 预加载主题素材
    try {
      if (!this.loadedThemes.has(id)) {
        console.log(`[ThemeManager] Preloading theme assets: ${id}`);
        await this.loader.preloadTheme(config);
        this.loadedThemes.add(id);
        console.log(`[ThemeManager] Theme ${id} loaded successfully`);
      }
    } catch (error) {
      console.error(`[ThemeManager] Failed to load theme ${id}:`, error);

      // Fallback 到经典主题
      if (id !== 'CLASSIC') {
        console.log('[ThemeManager] Falling back to CLASSIC theme');
        await this.setTheme('CLASSIC');
        return false;
      }

      // 如果经典主题也加载失败，返回失败但保持当前状态
      return false;
    }

    // 更新当前主题
    const oldTheme = this._currentTheme;
    this._currentTheme = id;

    // 通知渲染器应用新主题
    try {
      for (const callback of this.applyCallbacks) {
        await callback(config);
      }
    } catch (error) {
      console.error(`[ThemeManager] Failed to apply theme ${id}:`, error);

      // 回退到旧主题
      if (oldTheme !== id) {
        this._currentTheme = oldTheme;
        // 重新应用旧主题
        const oldConfig = this.themes.get(oldTheme);
        if (oldConfig) {
          for (const callback of this.applyCallbacks) {
            await callback(oldConfig);
          }
        }
      }
      return false;
    }

    // 触发主题变更回调
    for (const callback of this.changeCallbacks) {
      callback(id);
    }

    console.log(`[ThemeManager] Theme switched: ${oldTheme} → ${id}`);
    return true;
  }

  /**
   * 获取当前主题配置
   */
  getThemeConfig(): ThemeConfig {
    const config = this.themes.get(this._currentTheme);
    if (!config) {
      throw new Error(`[ThemeManager] Current theme ${this._currentTheme} not registered`);
    }
    return config;
  }

  /**
   * 获取指定主题配置
   * @param id 主题ID
   */
  getThemeConfigById(id: ThemeId): ThemeConfig | undefined {
    return this.themes.get(id);
  }

  /**
   * 获取所有注册的主题列表（用于 ThemeSelectUI）
   */
  getThemeList(): Array<{ id: ThemeId; name: string; description: string; previewImage: string }> {
    return Array.from(this.themes.values()).map(config => ({
      id: config.id,
      name: config.name,
      description: config.description,
      previewImage: config.previewImage,
    }));
  }

  /**
   * 检查主题是否已加载
   * @param id 主题ID
   */
  isLoaded(id: ThemeId): boolean {
    return this.loadedThemes.has(id);
  }

  /**
   * 注册主题变更回调
   * @param callback 回调函数
   */
  onThemeChange(callback: ThemeChangeCallback): void {
    this.changeCallbacks.push(callback);
  }

  /**
   * 移除主题变更回调
   * @param callback 回调函数
   */
  removeThemeChangeCallback(callback: ThemeChangeCallback): void {
    const index = this.changeCallbacks.indexOf(callback);
    if (index > -1) {
      this.changeCallbacks.splice(index, 1);
    }
  }

  /**
   * 注册主题应用回调（供渲染器使用）
   * @param callback 回调函数（接收主题配置，返回 Promise）
   */
  onApplyTheme(callback: (theme: ThemeConfig) => Promise<void>): void {
    this.applyCallbacks.push(callback);
  }

  /**
   * 移除主题应用回调
   * @param callback 回调函数
   */
  removeApplyCallback(callback: (theme: ThemeConfig) => Promise<void>): void {
    const index = this.applyCallbacks.indexOf(callback);
    if (index > -1) {
      this.applyCallbacks.splice(index, 1);
    }
  }

  /**
   * 获取素材加载器（供渲染器使用）
   */
  getLoader(): ThemeLoader {
    return this.loader;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.loader.clearCache();
    this.loadedThemes.clear();
    this.changeCallbacks = [];
    this.applyCallbacks = [];
    console.log('[ThemeManager] Disposed');
  }
}