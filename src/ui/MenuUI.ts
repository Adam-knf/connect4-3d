/**
 * MenuUI 主菜单
 * 显示难度选择、先后手选择、战绩查看
 */

import type { Difficulty, Order } from '@/types';
import { StatsStore } from '@/core/StatsStore';

/**
 * 菜单回调类型
 */
export type StartGameCallback = (difficulty: Difficulty, order: Order) => void;

/**
 * MenuUI 配置
 */
export interface MenuUIConfig {
  /** 容器DOM ID */
  containerId?: string;
}

/**
 * 难度显示名称映射
 */
const DIFFICULTY_NAMES: Record<Difficulty, string> = {
  EASY: '简单',
  MEDIUM: '中等',
  HARD: '困难',
};

/**
 * 先后手显示名称映射
 */
const ORDER_NAMES: Record<Order, string> = {
  FIRST: '先手（黑棋）',
  SECOND: '后手（白棋）',
  RANDOM: '随机',
};

/**
 * 难度描述映射
 */
const DIFFICULTY_DESC: Record<Difficulty, string> = {
  EASY: '适合新手',
  MEDIUM: '有一定挑战',
  HARD: '高难度挑战',
};

/**
 * 主菜单UI类
 */
export class MenuUI {
  /** 容器元素 */
  private container: HTMLElement;

  /** 战绩存储 */
  private statsStore: StatsStore;

  /** 开始游戏回调 */
  private onStartGame: StartGameCallback | null = null;

  /** 菜单面板 */
  private menuPanel: HTMLElement | null = null;

  /** 当前选择的难度 */
  private selectedDifficulty: Difficulty = 'MEDIUM';

  /** 当前选择的先后手 */
  private selectedOrder: Order = 'RANDOM';

  /** 难度选项元素 */
  private difficultyOptions: Map<Difficulty, HTMLElement> = new Map();

  /** 先后手选项元素 */
  private orderOptions: Map<Order, HTMLElement> = new Map();

  /** 战绩面板 */
  private statsPanel: HTMLElement | null = null;

  /** 是否显示战绩面板 */
  private showingStats: boolean = false;

  /**
   * 构造函数
   * @param statsStore 战绩存储
   * @param config 配置
   */
  constructor(statsStore: StatsStore, config?: MenuUIConfig) {
    this.statsStore = statsStore;
    const containerId = config?.containerId ?? 'menu-ui';
    this.container = document.getElementById(containerId) ?? document.body;
  }

  /**
   * 初始化菜单
   */
  init(): void {
    this.createMenuPanel();
    console.log('[MenuUI] Initialized');
  }

  /**
   * 创建菜单面板DOM
   */
  private createMenuPanel(): void {
    this.menuPanel = document.createElement('div');
    this.menuPanel.id = 'menu-panel';
    this.menuPanel.className = 'menu-panel';

    // 标题
    const title = document.createElement('div');
    title.className = 'menu-title';
    title.textContent = 'CONNECT FOUR 3D';

    const subtitle = document.createElement('div');
    subtitle.className = 'menu-subtitle';
    subtitle.textContent = '3D四子棋';

    // 难度选择区域
    const difficultySection = document.createElement('div');
    difficultySection.className = 'menu-section';

    const difficultyLabel = document.createElement('div');
    difficultyLabel.className = 'section-label';
    difficultyLabel.textContent = '选择难度';

    const difficultyGrid = document.createElement('div');
    difficultyGrid.className = 'option-grid';

    // 难度选项
    (['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).forEach((diff) => {
      const option = this.createDifficultyOption(diff);
      this.difficultyOptions.set(diff, option);
      difficultyGrid.appendChild(option);
    });

    difficultySection.appendChild(difficultyLabel);
    difficultySection.appendChild(difficultyGrid);

    // 先后手选择区域
    const orderSection = document.createElement('div');
    orderSection.className = 'menu-section';

    const orderLabel = document.createElement('div');
    orderLabel.className = 'section-label';
    orderLabel.textContent = '选择先后手';

    const orderGrid = document.createElement('div');
    orderGrid.className = 'option-grid';

    // 先后手选项
    (['FIRST', 'SECOND', 'RANDOM'] as Order[]).forEach((order) => {
      const option = this.createOrderOption(order);
      this.orderOptions.set(order, option);
      orderGrid.appendChild(option);
    });

    orderSection.appendChild(orderLabel);
    orderSection.appendChild(orderGrid);

    // 按钮区域
    const buttonsSection = document.createElement('div');
    buttonsSection.className = 'menu-buttons';

    const startButton = document.createElement('button');
    startButton.className = 'menu-btn primary-btn';
    startButton.textContent = '开始游戏';
    startButton.onclick = () => this.handleStartGame();

    const statsButton = document.createElement('button');
    statsButton.className = 'menu-btn secondary-btn';
    statsButton.textContent = '查看战绩';
    statsButton.onclick = () => this.toggleStatsPanel();

    buttonsSection.appendChild(startButton);
    buttonsSection.appendChild(statsButton);

    // 组合布局
    this.menuPanel.appendChild(title);
    this.menuPanel.appendChild(subtitle);
    this.menuPanel.appendChild(difficultySection);
    this.menuPanel.appendChild(orderSection);
    this.menuPanel.appendChild(buttonsSection);

    // 创建战绩面板
    this.createStatsPanel();

    // 添加到容器
    this.container.appendChild(this.menuPanel);
    this.container.appendChild(this.statsPanel!);

    // 添加样式
    this.injectStyles();

    // 初始化选中状态
    this.updateDifficultySelection('MEDIUM');
    this.updateOrderSelection('RANDOM');
  }

  /**
   * 创建难度选项
   */
  private createDifficultyOption(difficulty: Difficulty): HTMLElement {
    const option = document.createElement('div');
    option.className = 'difficulty-option';
    option.dataset.difficulty = difficulty;
    option.onclick = () => this.selectDifficulty(difficulty);

    const nameEl = document.createElement('div');
    nameEl.className = 'option-name';
    nameEl.textContent = DIFFICULTY_NAMES[difficulty];

    const descEl = document.createElement('div');
    descEl.className = 'option-desc';
    descEl.textContent = DIFFICULTY_DESC[difficulty];

    option.appendChild(nameEl);
    option.appendChild(descEl);

    return option;
  }

  /**
   * 创建先后手选项
   */
  private createOrderOption(order: Order): HTMLElement {
    const option = document.createElement('div');
    option.className = 'order-option';
    option.dataset.order = order;
    option.onclick = () => this.selectOrder(order);

    const nameEl = document.createElement('div');
    nameEl.className = 'option-name';
    nameEl.textContent = ORDER_NAMES[order];

    option.appendChild(nameEl);

    return option;
  }

  /**
   * 选择难度
   */
  private selectDifficulty(difficulty: Difficulty): void {
    this.selectedDifficulty = difficulty;
    this.updateDifficultySelection(difficulty);
  }

  /**
   * 更新难度选中状态
   */
  private updateDifficultySelection(difficulty: Difficulty): void {
    this.difficultyOptions.forEach((el, key) => {
      if (key === difficulty) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });
  }

  /**
   * 选择先后手
   */
  private selectOrder(order: Order): void {
    this.selectedOrder = order;
    this.updateOrderSelection(order);
  }

  /**
   * 更新先后手选中状态
   */
  private updateOrderSelection(order: Order): void {
    this.orderOptions.forEach((el, key) => {
      if (key === order) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });
  }

  /**
   * 处理开始游戏
   */
  private handleStartGame(): void {
    console.log(`[MenuUI] Start game: difficulty=${this.selectedDifficulty}, order=${this.selectedOrder}`);

    if (this.onStartGame) {
      this.onStartGame(this.selectedDifficulty, this.selectedOrder);
    }

    this.hide();
  }

  /**
   * 创建战绩面板
   */
  private createStatsPanel(): void {
    this.statsPanel = document.createElement('div');
    this.statsPanel.className = 'menu-stats-panel hidden';
    this.statsPanel.innerHTML = `
      <div class="stats-header">
        <span>战绩统计</span>
        <button class="stats-close-btn">×</button>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-title">简单</div>
          <div class="stat-row">
            <span class="stat-win">胜 <span id="menu-easy-wins">0</span></span>
            <span class="stat-loss">负 <span id="menu-easy-losses">0</span></span>
          </div>
          <div class="stat-rate">胜率 <span id="menu-easy-rate">0%</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-title">中等</div>
          <div class="stat-row">
            <span class="stat-win">胜 <span id="menu-medium-wins">0</span></span>
            <span class="stat-loss">负 <span id="menu-medium-losses">0</span></span>
          </div>
          <div class="stat-rate">胜率 <span id="menu-medium-rate">0%</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-title">困难</div>
          <div class="stat-row">
            <span class="stat-win">胜 <span id="menu-hard-wins">0</span></span>
            <span class="stat-loss">负 <span id="menu-hard-losses">0</span></span>
          </div>
          <div class="stat-rate">胜率 <span id="menu-hard-rate">0%</span></div>
        </div>
        <div class="stat-card stat-total">
          <div class="stat-title">总计</div>
          <div class="stat-row">
            <span class="stat-win">胜 <span id="menu-total-wins">0</span></span>
            <span class="stat-loss">负 <span id="menu-total-losses">0</span></span>
          </div>
          <div class="stat-rate">胜率 <span id="menu-total-rate">0%</span></div>
        </div>
      </div>
    `;

    // 关闭按钮事件
    const closeBtn = this.statsPanel.querySelector('.stats-close-btn') as HTMLElement;
    if (closeBtn) {
      closeBtn.onclick = () => this.toggleStatsPanel();
    }
  }

  /**
   * 切换战绩面板显示
   */
  private toggleStatsPanel(): void {
    if (!this.statsPanel) return;

    this.showingStats = !this.showingStats;
    if (this.showingStats) {
      this.updateStatsDisplay();
      this.statsPanel.classList.remove('hidden');
    } else {
      this.statsPanel.classList.add('hidden');
    }
  }

  /**
   * 更新战绩显示
   */
  private updateStatsDisplay(): void {
    const stats = this.statsStore.getStats();

    const updateEl = (id: string, value: number | string) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value.toString();
    };

    updateEl('menu-easy-wins', stats.easy.wins);
    updateEl('menu-easy-losses', stats.easy.losses);
    updateEl('menu-easy-rate', `${stats.easy.rate}%`);

    updateEl('menu-medium-wins', stats.medium.wins);
    updateEl('menu-medium-losses', stats.medium.losses);
    updateEl('menu-medium-rate', `${stats.medium.rate}%`);

    updateEl('menu-hard-wins', stats.hard.wins);
    updateEl('menu-hard-losses', stats.hard.losses);
    updateEl('menu-hard-rate', `${stats.hard.rate}%`);

    updateEl('menu-total-wins', stats.total.wins);
    updateEl('menu-total-losses', stats.total.losses);
    updateEl('menu-total-rate', `${stats.total.rate}%`);
  }

  /**
   * 注入CSS样式
   */
  private injectStyles(): void {
    if (document.getElementById('menu-ui-styles')) return;

    const style = document.createElement('style');
    style.id = 'menu-ui-styles';
    style.textContent = `
      /* 主菜单面板 */
      .menu-panel {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background: var(--bg-primary, #0a0a0f);
        z-index: 200;
      }

      .menu-panel.hidden {
        display: none;
      }

      /* 标题 */
      .menu-title {
        font-family: 'Space Mono', monospace;
        font-size: 2.5rem;
        letter-spacing: 0.15em;
        color: var(--fg-primary, #e8e8ec);
        margin-bottom: 8px;
      }

      .menu-subtitle {
        font-family: 'DM Sans', sans-serif;
        font-size: 1rem;
        color: var(--fg-secondary, #8888a0);
        margin-bottom: 40px;
      }

      /* 区域 */
      .menu-section {
        margin-bottom: 24px;
        text-align: center;
      }

      .section-label {
        font-family: 'DM Sans', sans-serif;
        font-size: 0.9rem;
        color: var(--fg-muted, #55556a);
        margin-bottom: 12px;
      }

      .option-grid {
        display: flex;
        gap: 12px;
        justify-content: center;
      }

      /* 难度选项 */
      .difficulty-option {
        padding: 16px 24px;
        border: 1px solid var(--border, #2a2a3a);
        border-radius: 8px;
        background: var(--bg-card, #1a1a28);
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 100px;
      }

      .difficulty-option:hover {
        background: rgba(61, 158, 255, 0.1);
        border-color: var(--accent-player, #3d9eff);
      }

      .difficulty-option.selected {
        border-color: var(--accent-player, #3d9eff);
        background: rgba(61, 158, 255, 0.2);
      }

      .option-name {
        font-family: 'Space Mono', monospace;
        font-size: 1rem;
        color: var(--fg-primary, #e8e8ec);
      }

      .option-desc {
        font-family: 'DM Sans', sans-serif;
        font-size: 0.75rem;
        color: var(--fg-secondary, #8888a0);
        margin-top: 4px;
      }

      /* 先后手选项 */
      .order-option {
        padding: 12px 20px;
        border: 1px solid var(--border, #2a2a3a);
        border-radius: 8px;
        background: var(--bg-card, #1a1a28);
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .order-option:hover {
        background: rgba(61, 158, 255, 0.1);
        border-color: var(--accent-player, #3d9eff);
      }

      .order-option.selected {
        border-color: var(--accent-player, #3d9eff);
        background: rgba(61, 158, 255, 0.2);
      }

      /* 按钮 */
      .menu-buttons {
        display: flex;
        gap: 16px;
        margin-top: 32px;
      }

      .menu-btn {
        font-family: 'DM Sans', sans-serif;
        font-size: 1rem;
        font-weight: 500;
        padding: 16px 32px;
        border-radius: 8px;
        border: 1px solid var(--border, #2a2a3a);
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .primary-btn {
        background: var(--accent-player, #3d9eff);
        border-color: var(--accent-player, #3d9eff);
        color: white;
      }

      .primary-btn:hover {
        background: #5aa8ff;
        box-shadow: 0 4px 20px rgba(61, 158, 255, 0.3);
      }

      .secondary-btn {
        background: var(--bg-card, #1a1a28);
        color: var(--fg-primary, #e8e8ec);
      }

      .secondary-btn:hover {
        background: rgba(61, 158, 255, 0.1);
        border-color: var(--accent-player, #3d9eff);
      }

      /* 战绩面板 */
      .menu-stats-panel {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 400px;
        max-height: 80vh;
        background: var(--bg-secondary, #151520);
        border-radius: 12px;
        border: 1px solid var(--border, #2a2a3a);
        padding: 24px;
        z-index: 210;
        transition: opacity 0.3s ease;
      }

      .menu-stats-panel.hidden {
        opacity: 0;
        pointer-events: none;
      }

      .menu-stats-panel .stats-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        font-family: 'Space Mono', monospace;
        font-size: 1rem;
        color: var(--fg-primary, #e8e8ec);
      }

      .menu-stats-panel .stats-close-btn {
        background: transparent;
        border: none;
        color: var(--fg-muted, #55556a);
        cursor: pointer;
        font-size: 1.5rem;
        padding: 4px 8px;
      }

      .menu-stats-panel .stats-close-btn:hover {
        color: var(--fg-primary, #e8e8ec);
      }

      .menu-stats-panel .stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      .menu-stats-panel .stat-card {
        background: var(--bg-card, #1a1a28);
        border-radius: 8px;
        padding: 16px;
        border: 1px solid var(--border, #2a2a3a);
      }

      .menu-stats-panel .stat-total {
        grid-column: 1 / -1;
        background: rgba(61, 158, 255, 0.1);
        border-color: var(--accent-player, #3d9eff);
      }

      .menu-stats-panel .stat-title {
        font-family: 'Space Mono', monospace;
        font-size: 0.9rem;
        color: var(--fg-secondary, #8888a0);
        margin-bottom: 10px;
      }

      .menu-stats-panel .stat-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 6px;
      }

      .menu-stats-panel .stat-win {
        color: var(--accent-win, #4ade80);
        font-size: 0.9rem;
      }

      .menu-stats-panel .stat-loss {
        color: var(--accent-opponent, #ff6b4a);
        font-size: 0.9rem;
      }

      .menu-stats-panel .stat-rate {
        text-align: center;
        color: var(--fg-primary, #e8e8ec);
        font-family: 'Space Mono', monospace;
        font-size: 1rem;
        margin-top: 6px;
      }
    `;
    document.head.appendChild(style);
  }

  // ========== 公共接口 ==========

  /**
   * 显示菜单
   */
  show(): void {
    if (this.menuPanel) {
      this.menuPanel.classList.remove('hidden');
      this.updateStatsDisplay();
    }
  }

  /**
   * 隐藏菜单
   */
  hide(): void {
    if (this.menuPanel) {
      this.menuPanel.classList.add('hidden');
    }
    if (this.statsPanel) {
      this.statsPanel.classList.add('hidden');
      this.showingStats = false;
    }
  }

  /**
   * 设置开始游戏回调
   */
  setStartGameCallback(callback: StartGameCallback): void {
    this.onStartGame = callback;
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.menuPanel) {
      this.container.removeChild(this.menuPanel);
      this.menuPanel = null;
    }

    if (this.statsPanel) {
      this.container.removeChild(this.statsPanel);
      this.statsPanel = null;
    }

    const styleEl = document.getElementById('menu-ui-styles');
    if (styleEl) {
      document.head.removeChild(styleEl);
    }

    console.log('[MenuUI] Disposed');
  }
}