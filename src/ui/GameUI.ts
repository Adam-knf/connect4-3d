/**
 * GameUI 游戏HUD信息面板
 * 显示回合、步数、难度、用时、AI思考提示
 */

import type { GameStateType, Difficulty, Player } from '@/types';
import { StatsStore } from '@/core/StatsStore';

/**
 * GameUI 配置
 */
export interface GameUIConfig {
  /** 容器DOM ID */
  containerId?: string;
}

/**
 * 时间格式化函数
 * @param seconds 秒数
 * @returns 格式化字符串 MM:SS
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 返回主菜单回调类型
 */
export type BackToMenuCallback = () => void;

/**
 * 难度显示名称映射
 */
const DIFFICULTY_NAMES: Record<Difficulty, string> = {
  EASY: '简单',
  MEDIUM: '中等',
  HARD: '困难',
};

/**
 * 玩家显示名称映射
 */
const PLAYER_NAMES: Record<Player, string> = {
  BLACK: '黑方',
  WHITE: '白方',
  EMPTY: '',
};

/**
 * 游戏HUD信息面板类
 */
export class GameUI {
  /** 容器元素 */
  private container: HTMLElement;

  /** 战绩存储 */
  private statsStore: StatsStore;

  /** 时间更新定时器 */
  private timerInterval: number | null = null;

  /** 游戏开始时间 */
  private startTime: number | null = null;

  /** 时间更新定时器 */
  private hudPanel: HTMLElement | null = null;

  /** 回合指示元素 */
  private turnIndicator: HTMLElement | null = null;

  /** AI思考提示元素 */
  private aiThinkingIndicator: HTMLElement | null = null;

  /** 步数显示元素 */
  private stepsDisplay: HTMLElement | null = null;

  /** 难度显示元素 */
  private difficultyDisplay: HTMLElement | null = null;

  /** 用时显示元素 */
  private timeDisplay: HTMLElement | null = null;

  /** 战绩按钮 */
  private statsButton: HTMLElement | null = null;

  /** 战绩面板 */
  private statsPanel: HTMLElement | null = null;

  /** 是否显示战绩面板 */
  private showingStats: boolean = false;

  /** 返回主菜单按钮 */
  private backToMenuButton: HTMLElement | null = null;

  /** 返回主菜单回调 */
  private onBackToMenu: BackToMenuCallback | null = null;

  /** 再来一局回调 */
  private onRestart: (() => void) | null = null;

  /** 游戏结束面板 */
  private gameEndPanel: HTMLElement | null = null;

  /** 游戏结果文本 */
  private gameEndResultText: HTMLElement | null = null;

  /** 开场提示面板 */
  private startHintPanel: HTMLElement | null = null;

  /**
   * 构造函数
   * @param statsStore 战绩存储
   * @param config 配置
   */
  constructor(statsStore: StatsStore, config?: GameUIConfig) {
    this.statsStore = statsStore;
    const containerId = config?.containerId ?? 'game-ui';
    this.container = document.getElementById(containerId) ?? document.body;
  }

  /**
   * 初始化HUD面板
   */
  init(): void {
    // 创建HUD面板
    this.createHUDPanel();
    console.log('[GameUI] Initialized');
  }

  /**
   * 创建HUD面板DOM
   */
  private createHUDPanel(): void {
    // 创建容器
    this.hudPanel = document.createElement('div');
    this.hudPanel.id = 'hud-panel';
    this.hudPanel.className = 'hud-panel';

    // 左侧：回合指示和返回按钮
    const leftSection = document.createElement('div');
    leftSection.className = 'hud-left';

    this.backToMenuButton = document.createElement('button');
    this.backToMenuButton.className = 'back-to-menu-btn';
    this.backToMenuButton.textContent = '返回菜单';
    this.backToMenuButton.onclick = () => this.handleBackToMenu();

    this.turnIndicator = document.createElement('div');
    this.turnIndicator.className = 'turn-indicator';
    this.turnIndicator.textContent = '等待开始...';

    this.aiThinkingIndicator = document.createElement('div');
    this.aiThinkingIndicator.className = 'ai-thinking hidden';
    this.aiThinkingIndicator.textContent = 'AI思考中...';

    leftSection.appendChild(this.backToMenuButton);
    leftSection.appendChild(this.turnIndicator);
    leftSection.appendChild(this.aiThinkingIndicator);

    // 中间：步数和难度
    const middleSection = document.createElement('div');
    middleSection.className = 'hud-middle';

    this.stepsDisplay = document.createElement('div');
    this.stepsDisplay.className = 'hud-item';
    this.stepsDisplay.innerHTML = '<span class="hud-label">步数</span><span class="hud-value" id="steps-value">0</span>';

    this.difficultyDisplay = document.createElement('div');
    this.difficultyDisplay.className = 'hud-item';
    this.difficultyDisplay.innerHTML = '<span class="hud-label">难度</span><span class="hud-value" id="difficulty-value">中等</span>';

    middleSection.appendChild(this.stepsDisplay);
    middleSection.appendChild(this.difficultyDisplay);

    // 右侧：用时和战绩
    const rightSection = document.createElement('div');
    rightSection.className = 'hud-right';

    this.timeDisplay = document.createElement('div');
    this.timeDisplay.className = 'hud-item';
    this.timeDisplay.innerHTML = '<span class="hud-label">用时</span><span class="hud-value" id="time-value">00:00</span>';

    this.statsButton = document.createElement('button');
    this.statsButton.className = 'stats-toggle-btn';
    this.statsButton.textContent = '战绩';
    this.statsButton.onclick = () => this.toggleStatsPanel();

    rightSection.appendChild(this.timeDisplay);
    rightSection.appendChild(this.statsButton);

    // 组合布局
    this.hudPanel.appendChild(leftSection);
    this.hudPanel.appendChild(middleSection);
    this.hudPanel.appendChild(rightSection);

    // 创建战绩面板（初始隐藏）
    this.createStatsPanel();

    // 创建游戏结束面板（初始隐藏）
    this.createGameEndPanel();
    this.createStartHintPanel();

    // 添加到容器
    this.container.appendChild(this.hudPanel);
    this.container.appendChild(this.statsPanel!);
    this.container.appendChild(this.gameEndPanel!);
    this.container.appendChild(this.startHintPanel!);

    // 添加样式
    this.injectStyles();
  }

  /**
   * 创建战绩面板
   */
  private createStatsPanel(): void {
    this.statsPanel = document.createElement('div');
    this.statsPanel.className = 'stats-panel hidden';
    this.statsPanel.innerHTML = `
      <div class="stats-header">
        <span>战绩统计</span>
        <button class="stats-close-btn" onclick="this.parentElement.parentElement.classList.add('hidden')">✕</button>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-title">简单</div>
          <div class="stat-row">
            <span class="stat-win">胜 <span id="easy-wins">0</span></span>
            <span class="stat-loss">负 <span id="easy-losses">0</span></span>
          </div>
          <div class="stat-rate">胜率 <span id="easy-rate">0%</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-title">中等</div>
          <div class="stat-row">
            <span class="stat-win">胜 <span id="medium-wins">0</span></span>
            <span class="stat-loss">负 <span id="medium-losses">0</span></span>
          </div>
          <div class="stat-rate">胜率 <span id="medium-rate">0%</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-title">困难</div>
          <div class="stat-row">
            <span class="stat-win">胜 <span id="hard-wins">0</span></span>
            <span class="stat-loss">负 <span id="hard-losses">0</span></span>
          </div>
          <div class="stat-rate">胜率 <span id="hard-rate">0%</span></div>
        </div>
        <div class="stat-card stat-total">
          <div class="stat-title">总计</div>
          <div class="stat-row">
            <span class="stat-win">胜 <span id="total-wins">0</span></span>
            <span class="stat-loss">负 <span id="total-losses">0</span></span>
          </div>
          <div class="stat-rate">胜率 <span id="total-rate">0%</span></div>
        </div>
      </div>
    `;
  }

  /**
   * 创建游戏结束面板
   */
  private createGameEndPanel(): void {
    this.gameEndPanel = document.createElement('div');
    this.gameEndPanel.className = 'game-end-panel hidden';

    // 结果文本
    this.gameEndResultText = document.createElement('div');
    this.gameEndResultText.className = 'game-end-result';
    this.gameEndResultText.textContent = '游戏结束';

    // 按钮区域
    const buttonsSection = document.createElement('div');
    buttonsSection.className = 'game-end-buttons';

    const restartButton = document.createElement('button');
    restartButton.className = 'game-end-btn restart-btn';
    restartButton.textContent = '再来一局';
    restartButton.onclick = () => this.handleRestart();

    const menuButton = document.createElement('button');
    menuButton.className = 'game-end-btn menu-btn';
    menuButton.textContent = '返回菜单';
    menuButton.onclick = () => this.handleBackToMenu();

    buttonsSection.appendChild(restartButton);
    buttonsSection.appendChild(menuButton);

    this.gameEndPanel.appendChild(this.gameEndResultText);
    this.gameEndPanel.appendChild(buttonsSection);
  }

  /**
   * 创建开场提示面板
   */
  private createStartHintPanel(): void {
    this.startHintPanel = document.createElement('div');
    this.startHintPanel.className = 'start-hint-panel hidden';
    this.startHintPanel.innerHTML = `
      <div class="start-hint-order">先手（黑棋）</div>
      <div class="start-hint-sub">即将开始</div>
    `;
  }

  /**
   * 切换战绩面板显示
   */
  private toggleStatsPanel(): void {
    if (!this.statsPanel) return;

    this.showingStats = !this.showingStats;
    if (this.showingStats) {
      this.statsPanel.classList.remove('hidden');
      this.updateStatsDisplay();
    } else {
      this.statsPanel.classList.add('hidden');
    }
  }

  /**
   * 更新战绩显示
   */
  private updateStatsDisplay(): void {
    const stats = this.statsStore.getStats();

    // 更新各难度数据
    const easyWinsEl = document.getElementById('easy-wins');
    const easyLossesEl = document.getElementById('easy-losses');
    const easyRateEl = document.getElementById('easy-rate');
    if (easyWinsEl) easyWinsEl.textContent = stats.easy.wins.toString();
    if (easyLossesEl) easyLossesEl.textContent = stats.easy.losses.toString();
    if (easyRateEl) easyRateEl.textContent = `${stats.easy.rate}%`;

    const mediumWinsEl = document.getElementById('medium-wins');
    const mediumLossesEl = document.getElementById('medium-losses');
    const mediumRateEl = document.getElementById('medium-rate');
    if (mediumWinsEl) mediumWinsEl.textContent = stats.medium.wins.toString();
    if (mediumLossesEl) mediumLossesEl.textContent = stats.medium.losses.toString();
    if (mediumRateEl) mediumRateEl.textContent = `${stats.medium.rate}%`;

    const hardWinsEl = document.getElementById('hard-wins');
    const hardLossesEl = document.getElementById('hard-losses');
    const hardRateEl = document.getElementById('hard-rate');
    if (hardWinsEl) hardWinsEl.textContent = stats.hard.wins.toString();
    if (hardLossesEl) hardLossesEl.textContent = stats.hard.losses.toString();
    if (hardRateEl) hardRateEl.textContent = `${stats.hard.rate}%`;

    const totalWinsEl = document.getElementById('total-wins');
    const totalLossesEl = document.getElementById('total-losses');
    const totalRateEl = document.getElementById('total-rate');
    if (totalWinsEl) totalWinsEl.textContent = stats.total.wins.toString();
    if (totalLossesEl) totalLossesEl.textContent = stats.total.losses.toString();
    if (totalRateEl) totalRateEl.textContent = `${stats.total.rate}%`;
  }

  /**
   * 注入CSS样式
   */
  private injectStyles(): void {
    // 检查是否已注入
    if (document.getElementById('game-ui-styles')) return;

    const style = document.createElement('style');
    style.id = 'game-ui-styles';
    style.textContent = `
      /* HUD面板 */
      .hud-panel {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 60px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 20px;
        background: linear-gradient(to top, rgba(15, 15, 20, 0.9), rgba(15, 15, 20, 0.7));
        border-top: 1px solid var(--border, #2a2a3a);
        font-family: 'Space Mono', monospace;
        color: var(--fg-primary, #e8e8ec);
        z-index: 100;
      }

      .hud-left, .hud-middle, .hud-right {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      /* 返回主菜单按钮 */
      .back-to-menu-btn {
        font-family: 'DM Sans', sans-serif;
        font-size: 0.85rem;
        font-weight: 500;
        padding: 6px 12px;
        border-radius: 4px;
        border: 1px solid var(--border, #2a2a3a);
        background: var(--bg-card, #1a1a28);
        color: var(--fg-secondary, #8888a0);
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .back-to-menu-btn:hover {
        background: rgba(255, 107, 74, 0.1);
        border-color: var(--accent-opponent, #ff6b4a);
        color: var(--fg-primary, #e8e8ec);
      }

      /* 回合指示 */
      .turn-indicator {
        font-size: 1rem;
        padding: 8px 16px;
        border-radius: 4px;
        border: 1px solid var(--accent-player, #3d9eff);
        background: rgba(61, 158, 255, 0.2);
        color: var(--accent-player, #3d9eff);
        transition: all 0.3s ease;
      }

      .turn-indicator.ai-turn {
        border-color: var(--accent-opponent, #ff6b4a);
        background: rgba(255, 107, 74, 0.2);
        color: var(--accent-opponent, #ff6b4a);
      }

      /* AI思考提示 */
      .ai-thinking {
        font-size: 0.8rem;
        color: var(--fg-secondary, #8888a0);
        animation: pulse 1.5s ease-in-out infinite;
      }

      .ai-thinking.hidden {
        display: none;
      }

      @keyframes pulse {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 1; }
      }

      /* HUD项目 */
      .hud-item {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .hud-label {
        font-size: 0.7rem;
        color: var(--fg-muted, #55556a);
        text-transform: uppercase;
      }

      .hud-value {
        font-size: 1rem;
        color: var(--fg-primary, #e8e8ec);
        letter-spacing: 0.05em;
      }

      /* 战绩按钮 */
      .stats-toggle-btn {
        font-family: 'DM Sans', sans-serif;
        font-size: 0.85rem;
        font-weight: 500;
        padding: 6px 12px;
        border-radius: 4px;
        border: 1px solid var(--border, #2a2a3a);
        background: var(--bg-card, #1a1a28);
        color: var(--fg-primary, #e8e8ec);
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .stats-toggle-btn:hover {
        background: rgba(61, 158, 255, 0.1);
        border-color: var(--accent-player, #3d9eff);
      }

      /* 战绩面板 */
      .stats-panel {
        position: fixed;
        bottom: 70px;
        right: 20px;
        width: 320px;
        background: var(--bg-secondary, #151520);
        border-radius: 8px;
        border: 1px solid var(--border, #2a2a3a);
        padding: 16px;
        z-index: 101;
        transition: opacity 0.3s ease, transform 0.3s ease;
      }

      .stats-panel.hidden {
        opacity: 0;
        transform: translateY(10px);
        pointer-events: none;
      }

      .stats-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        font-family: 'Space Mono', monospace;
        font-size: 0.9rem;
        color: var(--fg-primary, #e8e8ec);
      }

      .stats-close-btn {
        background: transparent;
        border: none;
        color: var(--fg-muted, #55556a);
        cursor: pointer;
        font-size: 1rem;
        padding: 4px;
      }

      .stats-close-btn:hover {
        color: var(--fg-primary, #e8e8ec);
      }

      .stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .stat-card {
        background: var(--bg-card, #1a1a28);
        border-radius: 6px;
        padding: 12px;
        border: 1px solid var(--border, #2a2a3a);
      }

      .stat-total {
        grid-column: 1 / -1;
        background: rgba(61, 158, 255, 0.1);
        border-color: var(--accent-player, #3d9eff);
      }

      .stat-title {
        font-family: 'Space Mono', monospace;
        font-size: 0.8rem;
        color: var(--fg-secondary, #8888a0);
        margin-bottom: 8px;
      }

      .stat-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
      }

      .stat-win {
        color: var(--accent-win, #4ade80);
        font-size: 0.85rem;
      }

      .stat-loss {
        color: var(--accent-opponent, #ff6b4a);
        font-size: 0.85rem;
      }

      .stat-rate {
        text-align: center;
        color: var(--fg-primary, #e8e8ec);
        font-family: 'Space Mono', monospace;
        font-size: 0.9rem;
        margin-top: 4px;
      }

      /* 游戏结束面板 */
      .game-end-panel {
        position: fixed;
        top: 25%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--bg-secondary, #151520);
        border-radius: 16px;
        border: 2px solid var(--border, #2a2a3a);
        padding: 32px 48px;
        z-index: 150;
        text-align: center;
        transition: opacity 0.3s ease, transform 0.3s ease;
      }

      .game-end-panel.hidden {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.9);
        pointer-events: none;
      }

      .game-end-result {
        font-family: 'Space Mono', monospace;
        font-size: 2rem;
        margin-bottom: 24px;
      }

      .game-end-result.win {
        color: var(--accent-win, #4ade80);
      }

      .game-end-result.loss {
        color: var(--accent-opponent, #ff6b4a);
      }

      .game-end-result.draw {
        color: var(--fg-secondary, #8888a0);
      }

      .game-end-buttons {
        display: flex;
        gap: 16px;
        justify-content: center;
      }

      .game-end-btn {
        font-family: 'DM Sans', sans-serif;
        font-size: 1rem;
        font-weight: 500;
        padding: 12px 24px;
        border-radius: 8px;
        border: 1px solid var(--border, #2a2a3a);
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .game-end-btn.restart-btn {
        background: var(--accent-player, #3d9eff);
        border-color: var(--accent-player, #3d9eff);
        color: white;
      }

      .game-end-btn.restart-btn:hover {
        background: #5aa8ff;
        box-shadow: 0 4px 20px rgba(61, 158, 255, 0.3);
      }

      .game-end-btn.menu-btn {
        background: var(--bg-card, #1a1a28);
        color: var(--fg-primary, #e8e8ec);
      }

      .game-end-btn.menu-btn:hover {
        background: rgba(255, 107, 74, 0.1);
        border-color: var(--accent-opponent, #ff6b4a);
      }

      /* 开场提示面板 */
      .start-hint-panel {
        position: fixed;
        top: 25%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--bg-secondary, #151520);
        border-radius: 16px;
        border: 2px solid var(--accent-player, #3d9eff);
        padding: 24px 40px;
        z-index: 150;
        text-align: center;
        transition: opacity 0.5s ease, transform 0.5s ease;
      }

      .start-hint-panel.hidden {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.9);
        pointer-events: none;
      }

      .start-hint-order {
        font-family: 'Space Mono', monospace;
        font-size: 1.8rem;
        color: var(--accent-player, #3d9eff);
        margin-bottom: 12px;
      }

      .start-hint-order.second {
        color: var(--accent-opponent, #ff6b4a);
      }

      .start-hint-sub {
        font-family: 'DM Sans', sans-serif;
        font-size: 1rem;
        color: var(--fg-secondary, #8888a0);
      }
    `;
    document.head.appendChild(style);
  }

  // ========== 公共接口 ==========

  /**
   * 更新回合显示
   * @param player 当前回合玩家
   * @param isAI 是否AI回合
   */
  updateTurn(player: Player, isAI: boolean = false): void {
    if (!this.turnIndicator) return;

    this.turnIndicator.textContent = `${PLAYER_NAMES[player]}回合`;

    if (isAI) {
      this.turnIndicator.classList.add('ai-turn');
      this.showAIThinking();
    } else {
      this.turnIndicator.classList.remove('ai-turn');
      this.hideAIThinking();
    }
  }

  /**
   * 更新步数显示
   * @param steps 步数
   */
  updateSteps(steps: number): void {
    const valueEl = document.getElementById('steps-value');
    if (valueEl) valueEl.textContent = steps.toString();
  }

  /**
   * 更新难度显示
   * @param difficulty 难度
   */
  updateDifficulty(difficulty: Difficulty): void {
    const valueEl = document.getElementById('difficulty-value');
    if (valueEl) valueEl.textContent = DIFFICULTY_NAMES[difficulty];
  }

  /**
   * 开始计时
   */
  startTimer(): void {
    this.startTime = Date.now();
    this.timerInterval = window.setInterval(() => {
      this.updateTimeDisplay();
    }, 1000);
  }

  /**
   * 停止计时
   */
  stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * 更新时间显示
   */
  private updateTimeDisplay(): void {
    if (this.startTime === null) return;
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const valueEl = document.getElementById('time-value');
    if (valueEl) valueEl.textContent = formatTime(elapsed);
  }

  /**
   * 显示AI思考提示
   */
  showAIThinking(): void {
    if (this.aiThinkingIndicator) {
      this.aiThinkingIndicator.classList.remove('hidden');
    }
  }

  /**
   * 隐藏AI思考提示
   */
  hideAIThinking(): void {
    if (this.aiThinkingIndicator) {
      this.aiThinkingIndicator.classList.add('hidden');
    }
  }

  /**
   * 处理状态变化
   * @param state 新状态
   */
  handleStateChange(state: GameStateType): void {
    // 状态变化时可能需要更新战绩显示
    if (state === 'GAME_END') {
      this.updateStatsDisplay();
    }
  }

  /**
   * 显示HUD面板
   */
  show(): void {
    if (this.hudPanel) {
      this.hudPanel.classList.remove('hidden');
    }
  }

  /**
   * 隐藏HUD面板
   */
  hide(): void {
    if (this.hudPanel) {
      this.hudPanel.classList.add('hidden');
    }
    if (this.statsPanel) {
      this.statsPanel.classList.add('hidden');
      this.showingStats = false;
    }
    if (this.gameEndPanel) {
      this.gameEndPanel.classList.add('hidden');
    }
  }

  /**
   * 更新战绩（游戏结束时调用）
   */
  refreshStats(): void {
    this.updateStatsDisplay();
  }

  /**
   * 设置返回主菜单回调
   * @param callback 回调函数
   */
  setBackToMenuCallback(callback: BackToMenuCallback): void {
    this.onBackToMenu = callback;
  }

  /**
   * 设置再来一局回调
   * @param callback 回调函数
   */
  setRestartCallback(callback: () => void): void {
    this.onRestart = callback;
  }

  /**
   * 处理返回主菜单按钮点击
   */
  private handleBackToMenu(): void {
    this.hideGameEnd();
    if (this.onBackToMenu) {
      this.onBackToMenu();
    }
  }

  /**
   * 处理再来一局按钮点击
   */
  private handleRestart(): void {
    this.hideGameEnd();
    if (this.onRestart) {
      this.onRestart();
    }
  }

  /**
   * 显示开场提示面板
   * @param isFirst 是否先手
   */
  showStartHint(isFirst: boolean): void {
    if (!this.startHintPanel) return;

    const orderEl = this.startHintPanel.querySelector('.start-hint-order') as HTMLElement;
    if (orderEl) {
      orderEl.textContent = isFirst ? '先手（黑棋）' : '后手（白棋）';
      orderEl.className = `start-hint-order ${isFirst ? 'first' : 'second'}`;
    }

    this.startHintPanel.classList.remove('hidden');
  }

  /**
   * 隐藏开场提示面板
   */
  hideStartHint(): void {
    if (this.startHintPanel) {
      this.startHintPanel.classList.add('hidden');
    }
  }

  /**
   * 显示游戏结束面板
   * @param result 游戏结果（WIN/LOSS/DRAW）
   */
  showGameEnd(result: 'WIN' | 'LOSS' | 'DRAW'): void {
    if (!this.gameEndPanel) return;

    // 更新结果文本
    if (this.gameEndResultText) {
      if (result === 'WIN') {
        this.gameEndResultText.textContent = '🏆 你赢了！';
        this.gameEndResultText.className = 'game-end-result win';
      } else if (result === 'LOSS') {
        this.gameEndResultText.textContent = '💔 AI获胜';
        this.gameEndResultText.className = 'game-end-result loss';
      } else {
        this.gameEndResultText.textContent = '🤝 平局';
        this.gameEndResultText.className = 'game-end-result draw';
      }
    }

    this.gameEndPanel.classList.remove('hidden');
  }

  /**
   * 隐藏游戏结束面板
   */
  hideGameEnd(): void {
    if (this.gameEndPanel) {
      this.gameEndPanel.classList.add('hidden');
    }
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.stopTimer();

    if (this.hudPanel) {
      this.container.removeChild(this.hudPanel);
      this.hudPanel = null;
    }

    if (this.statsPanel) {
      this.container.removeChild(this.statsPanel);
      this.statsPanel = null;
    }

    if (this.gameEndPanel) {
      this.container.removeChild(this.gameEndPanel);
      this.gameEndPanel = null;
    }

    // 移除样式（如果需要）
    const styleEl = document.getElementById('game-ui-styles');
    if (styleEl) {
      document.head.removeChild(styleEl);
    }

    console.log('[GameUI] Disposed');
  }
}