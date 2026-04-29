/**
 * ThemeSelectUI 主题选择界面（Phase 7 模块19）
 * 提供主题切换入口和预览，二次确认弹窗
 *
 * 核心职责：
 * - HTML/CSS 面板 + 文字描述 + 预览图片 + 二次确认弹窗
 * - 显示三套主题：经典、猫咪、机甲
 * - 二次确认弹窗防止误操作
 * - 当前使用中的主题高亮标记
 */

import type { ThemeId, ThemePreviewItem } from '@/types/theme';
import { ThemeManager } from '@/core/ThemeManager';

/**
 * 主题选择回调类型
 */
export type ThemeSelectCallback = (themeId: ThemeId) => void;

/**
 * 主题选择界面接口（architecture.md 模块19）
 */
export interface IThemeSelectUI {
  show(): void;
  hide(): void;
  setThemeList(themes: ThemePreviewItem[]): void;
  onSelect(callback: ThemeSelectCallback): void;
  showConfirmDialog(themeName: string): Promise<boolean>;
}

/**
 * 主题选择界面
 * 提供主题切换的用户交互界面
 */
export class ThemeSelectUI implements IThemeSelectUI {
  /** 主题管理器 */
  private themeManager: ThemeManager;

  /** 容器元素 */
  private container: HTMLElement;

  /** 主题选择面板 */
  private panel: HTMLElement | null = null;

  /** 确认弹窗 */
  private confirmDialog: HTMLElement | null = null;

  /** 主题列表 */
  private themes: ThemePreviewItem[] = [];

  /** 当前选中的主题 */
  private selectedTheme: ThemeId | null = null;

  /** 选择回调 */
  private selectCallback: ThemeSelectCallback | null = null;

  /** 主题选项元素映射 */
  private themeOptions: Map<ThemeId, HTMLElement> = new Map();

  /** 是否锁定 */
  private locked = false;

  /** 锁提示 toast */
  private lockToast: HTMLElement | null = null;

  /**
   * 构造函数
   * @param themeManager 主题管理器
   * @param containerId 容器DOM ID
   */
  constructor(themeManager: ThemeManager, containerId: string = 'theme-select-ui') {
    this.themeManager = themeManager;
    this.container = document.getElementById(containerId) ?? document.body;
  }

  /**
   * 初始化界面
   */
  init(): void {
    this.createPanel();
    this.createConfirmDialog();
    this.injectStyles();

    // 初始化主题列表
    this.setThemeList(this.themeManager.getThemeList());

    // 设置当前主题为选中状态
    this.selectedTheme = this.themeManager.currentTheme;
    this.updateSelection();

    console.log('[ThemeSelectUI] Initialized');
  }

  /**
   * 创建主题选择面板
   */
  private createPanel(): void {
    this.panel = document.createElement('div');
    this.panel.className = 'theme-select-panel hidden';

    // 标题
    const header = document.createElement('div');
    header.className = 'theme-select-header';
    header.innerHTML = '<span>选择主题</span>';

    // 关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.className = 'theme-close-btn';
    closeBtn.textContent = '×';
    closeBtn.onclick = () => this.hide();
    header.appendChild(closeBtn);

    this.panel.appendChild(header);

    // 主题网格
    const grid = document.createElement('div');
    grid.className = 'theme-grid';
    this.panel.appendChild(grid);

    // 添加到容器
    this.container.appendChild(this.panel);
  }

  /**
   * 创建确认弹窗
   */
  private createConfirmDialog(): void {
    this.confirmDialog = document.createElement('div');
    this.confirmDialog.className = 'theme-confirm-dialog hidden';

    this.confirmDialog.innerHTML = `
      <div class="confirm-content">
        <div class="confirm-title">确认切换</div>
        <div class="confirm-message">确定切换到 <span id="confirm-theme-name"></span> 吗？</div>
        <div class="confirm-buttons">
          <button class="confirm-btn confirm-cancel">取消</button>
          <button class="confirm-btn confirm-ok">确认</button>
        </div>
      </div>
    `;

    // 添加到容器
    this.container.appendChild(this.confirmDialog);
  }

  /**
   * 设置主题列表
   * @param themes 主题预览项列表
   */
  setThemeList(themes: ThemePreviewItem[]): void {
    this.themes = themes;

    // 清空现有选项
    this.themeOptions.clear();
    const grid = this.panel?.querySelector('.theme-grid');
    if (!grid) return;

    grid.innerHTML = '';

    // 创建主题选项卡片
    themes.forEach(theme => {
      const card = this.createThemeCard(theme);
      this.themeOptions.set(theme.id, card);
      grid.appendChild(card);
    });

    // 更新选中状态
    this.updateSelection();
  }

  /**
   * 创建主题卡片
   * @param theme 主题预览项
   */
  private createThemeCard(theme: ThemePreviewItem): HTMLElement {
    const card = document.createElement('div');
    card.className = 'theme-card';
    card.dataset.themeId = theme.id;

    // 预览图
    const preview = document.createElement('div');
    preview.className = 'theme-preview';
    // 使用占位符（因为实际预览图可能不存在）
    preview.innerHTML = `<div class="preview-placeholder">${this.getThemeIcon(theme.id)}</div>`;

    // 名称
    const name = document.createElement('div');
    name.className = 'theme-name';
    name.textContent = theme.name;

    // 描述
    const desc = document.createElement('div');
    desc.className = 'theme-desc';
    desc.textContent = theme.description;

    card.appendChild(preview);
    card.appendChild(name);
    card.appendChild(desc);

    // 点击选择
    card.onclick = () => this.handleThemeSelect(theme.id);

    return card;
  }

  /**
   * 获取主题图标（预览图占位符）
   * @param themeId 主题ID
   */
  private getThemeIcon(themeId: ThemeId): string {
    switch (themeId) {
      case 'CLASSIC':
        return '⚪ ⚫';  // 白黑圆圈
      case 'CAT':
        return '🐱';  // 猫咪图标
      case 'MECHA':
        return '🤖';  // 机甲图标
      default:
        return '🎨';
    }
  }

  /**
   * 处理主题选择
   * @param themeId 选中的主题ID
   */
  private async handleThemeSelect(themeId: ThemeId): Promise<void> {
    if (this.locked) {
      this.showLockToast('在中等难度获胜后可解锁主题切换');
      return;
    }
    if (themeId === this.themeManager.currentTheme) {
      // 已是当前主题，直接关闭
      this.hide();
      return;
    }

    // 高亮选中
    this.selectedTheme = themeId;
    this.updateSelection();

    // 显示确认弹窗
    const theme = this.themes.find(t => t.id === themeId);
    const themeName = theme?.name ?? themeId;

    const confirmed = await this.showConfirmDialog(themeName);

    if (confirmed) {
      // 确认切换
      console.log(`[ThemeSelectUI] User confirmed theme switch: ${themeId}`);

      // 关闭弹窗和面板
      this.hideConfirmDialog();
      this.hide();

      // 调用回调
      if (this.selectCallback) {
        this.selectCallback(themeId);
      }
    } else {
      // 取消，恢复之前选中状态
      this.selectedTheme = this.themeManager.currentTheme;
      this.updateSelection();
      this.hideConfirmDialog();
    }
  }

  /**
   * 更新选中状态
   */
  private updateSelection(): void {
    this.themeOptions.forEach((card, id) => {
      if (id === this.selectedTheme) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });
  }

  /**
   * 显示二次确认弹窗
   * @param themeName 主题名称
   * @returns 用户是否确认
   */
  showConfirmDialog(themeName: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.confirmDialog) {
        resolve(false);
        return;
      }

      // 设置主题名称
      const nameSpan = this.confirmDialog.querySelector('#confirm-theme-name');
      if (nameSpan) {
        nameSpan.textContent = themeName;
      }

      // 显示弹窗
      this.confirmDialog.classList.remove('hidden');

      // 设置按钮回调
      const cancelBtn = this.confirmDialog.querySelector('.confirm-cancel') as HTMLElement;
      const okBtn = this.confirmDialog.querySelector('.confirm-ok') as HTMLElement;

      // 清除旧事件监听器
      cancelBtn.onclick = () => {
        resolve(false);
      };

      okBtn.onclick = () => {
        resolve(true);
      };
    });
  }

  /**
   * 隐藏确认弹窗
   */
  hideConfirmDialog(): void {
    if (this.confirmDialog) {
      this.confirmDialog.classList.add('hidden');
    }
  }

  /**
   * 注册选择回调
   * @param callback 回调函数
   */
  onSelect(callback: ThemeSelectCallback): void {
    this.selectCallback = callback;
  }

  /**
   * 显示主题选择面板
   */
  /** 设置锁定状态 */
  setLocked(locked: boolean): void {
    this.locked = locked;
    if (this.panel) {
      if (locked) {
        this.panel.classList.add('locked');
      } else {
        this.panel.classList.remove('locked');
      }
    }
  }

  private showLockToast(msg: string): void {
    if (!this.lockToast) {
      this.lockToast = document.createElement('div');
      this.lockToast.className = 'lock-toast';
      this.container.appendChild(this.lockToast);
    }
    this.lockToast.textContent = msg;
    this.lockToast.classList.add('visible');
    clearTimeout((this.lockToast as any)._timer);
    (this.lockToast as any)._timer = setTimeout(() => {
      this.lockToast?.classList.remove('visible');
    }, 2000);
  }

  show(): void {
    if (this.panel) {
      // 更新当前选中状态
      this.selectedTheme = this.themeManager.currentTheme;
      this.updateSelection();

      this.panel.classList.remove('hidden');
      console.log('[ThemeSelectUI] Panel shown');
    }
  }

  /**
   * 隐藏主题选择面板
   */
  hide(): void {
    if (this.panel) {
      this.panel.classList.add('hidden');
    }
    this.hideConfirmDialog();
    console.log('[ThemeSelectUI] Panel hidden');
  }

  /**
   * 注入CSS样式
   */
  private injectStyles(): void {
    if (document.getElementById('theme-select-ui-styles')) return;

    const style = document.createElement('style');
    style.id = 'theme-select-ui-styles';
    style.textContent = `
      /* 主题选择面板 */
      .theme-select-panel {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 500px;
        max-height: 80vh;
        background: var(--bg-secondary, #151520);
        border-radius: 12px;
        border: 1px solid var(--border, #2a2a3a);
        padding: 24px;
        z-index: 220;
        transition: opacity 0.3s ease;
      }

      .theme-select-panel.hidden {
        opacity: 0;
        pointer-events: none;
      }

      /* 标题栏 */
      .theme-select-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        font-family: 'Space Mono', monospace;
        font-size: 1.2rem;
        color: var(--fg-primary, #e8e8ec);
      }

      .theme-close-btn {
        background: transparent;
        border: none;
        color: var(--fg-muted, #55556a);
        cursor: pointer;
        font-size: 1.5rem;
        padding: 4px 8px;
        transition: color 0.2s;
      }

      .theme-close-btn:hover {
        color: var(--fg-primary, #e8e8ec);
      }

      /* 主题网格 */
      .theme-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
      }

      /* 主题卡片 */
      .theme-card {
        background: var(--bg-card, #1a1a28);
        border-radius: 8px;
        border: 2px solid var(--border, #2a2a3a);
        padding: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: center;
      }

      .theme-card:hover {
        background: rgba(61, 158, 255, 0.1);
        border-color: var(--accent-player, #3d9eff);
        transform: scale(1.02);
      }

      .theme-card.selected {
        border-color: var(--accent-player, #3d9eff);
        background: rgba(61, 158, 255, 0.2);
      }

      /* 预览图 */
      .theme-preview {
        width: 100%;
        height: 80px;
        display: flex;
        justify-content: center;
        align-items: center;
        background: var(--bg-tertiary, #0a0a0f);
        border-radius: 6px;
        margin-bottom: 12px;
      }

      .preview-placeholder {
        font-size: 2rem;
      }

      /* 主题名称 */
      .theme-name {
        font-family: 'Space Mono', monospace;
        font-size: 1rem;
        color: var(--fg-primary, #e8e8ec);
        margin-bottom: 6px;
      }

      /* 主题描述 */
      .theme-desc {
        font-family: 'DM Sans', sans-serif;
        font-size: 0.75rem;
        color: var(--fg-secondary, #8888a0);
        line-height: 1.4;
      }

      /* 确认弹窗 */
      .theme-confirm-dialog {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 230;
        transition: opacity 0.2s ease;
      }

      .theme-confirm-dialog.hidden {
        opacity: 0;
        pointer-events: none;
      }

      .confirm-content {
        background: var(--bg-secondary, #151520);
        border-radius: 12px;
        border: 1px solid var(--border, #2a2a3a);
        padding: 24px;
        width: 300px;
        text-align: center;
      }

      .confirm-title {
        font-family: 'Space Mono', monospace;
        font-size: 1rem;
        color: var(--fg-primary, #e8e8ec);
        margin-bottom: 16px;
      }

      .confirm-message {
        font-family: 'DM Sans', sans-serif;
        font-size: 0.9rem;
        color: var(--fg-secondary, #8888a0);
        margin-bottom: 20px;
      }

      .confirm-message span {
        color: var(--accent-player, #3d9eff);
        font-weight: 600;
      }

      .confirm-buttons {
        display: flex;
        gap: 12px;
        justify-content: center;
      }

      .confirm-btn {
        font-family: 'DM Sans', sans-serif;
        font-size: 0.9rem;
        padding: 10px 24px;
        border-radius: 6px;
        border: 1px solid var(--border, #2a2a3a);
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .confirm-cancel {
        background: var(--bg-card, #1a1a28);
        color: var(--fg-primary, #e8e8ec);
      }

      .confirm-cancel:hover {
        background: rgba(100, 100, 120, 0.2);
      }

      .confirm-ok {
        background: var(--accent-player, #3d9eff);
        border-color: var(--accent-player, #3d9eff);
        color: white;
      }

      .confirm-ok:hover {
        background: #5aa8ff;
        box-shadow: 0 4px 12px rgba(61, 158, 255, 0.3);
      }

      /* 锁定状态遮罩 */
      .theme-select-panel.locked::after {
        content: '🔒 在中等难度获胜后解锁';
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ff6666;
        font-size: 1.1rem;
        font-family: 'Space Mono', monospace;
        border-radius: 12px;
        z-index: 10;
        pointer-events: all;
      }

      .lock-toast {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 80, 80, 0.9);
        color: #fff;
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 0.9rem;
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.3s;
        pointer-events: none;
      }
      .lock-toast.visible {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.panel) {
      this.container.removeChild(this.panel);
      this.panel = null;
    }

    if (this.confirmDialog) {
      this.container.removeChild(this.confirmDialog);
      this.confirmDialog = null;
    }

    const styleEl = document.getElementById('theme-select-ui-styles');
    if (styleEl) {
      document.head.removeChild(styleEl);
    }

    console.log('[ThemeSelectUI] Disposed');
  }
}