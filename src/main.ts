/**
 * 3D四子棋游戏入口文件
 * Phase 5 游戏流程整合 + Phase 6 UI层 + Phase 7 主题系统
 */

import { SceneSetup } from '@/rendering/SceneSetup';
import { BoardRenderer } from '@/rendering/BoardRenderer';
import { CameraController } from '@/rendering/CameraController';
import { EnvironmentRenderer } from '@/rendering/EnvironmentRenderer';
import { PieceRenderer } from '@/rendering/PieceRenderer';
import { MenuBackground } from '@/rendering/MenuBackground';
import { InputHandler } from '@/ui/InputHandler';
import { GameController, type UIUpdateCallback } from '@/core/GameController';
import { StatsStore } from '@/core/StatsStore';
import { ThemeManager } from '@/core/ThemeManager';
import { ThemeLoader } from '@/core/ThemeLoader';
import { UnlockManager } from '@/core/UnlockManager';
import { AnimationController } from '@/core/AnimationController';
import { PieceStateManager } from '@/core/PieceStateManager';
import { GameUI } from '@/ui/GameUI';
import { MenuUI } from '@/ui/MenuUI';
import { ThemeSelectUI } from '@/ui/ThemeSelectUI';
import { CLASSIC_THEME } from '@/config/themes/classicTheme';
import { CAT_THEME } from '@/config/themes/catTheme';
import { MECHA_THEME } from '@/config/themes/mechaTheme';
import type { Difficulty, Order, GameResult, Player } from '@/types';
import type { ThemeId, ThemeConfig } from '@/types/theme';
import { BOARD_CONFIG } from '@/config/gameConfig';

/**
 * 游戏主类
 * Phase 5：整合 GameController 实现完整游戏流程
 * Phase 6：添加 UI层（主菜单、HUD面板、战绩存储）
 */
class ConnectFour3D {
  private sceneSetup: SceneSetup | null = null;
  private boardRenderer: BoardRenderer | null = null;
  private cameraController: CameraController | null = null;
  private inputHandler: InputHandler | null = null;
  private gameController: GameController | null = null;

  // Phase 6 UI模块
  private statsStore: StatsStore | null = null;
  private gameUI: GameUI | null = null;
  private menuUI: MenuUI | null = null;

  // Phase 7 主题模块
  private themeManager: ThemeManager | null = null;
  private animationController: AnimationController | null = null;
  private pieceStateManager: PieceStateManager | null = null;
  private themeSelectUI: ThemeSelectUI | null = null;
  private environmentRenderer: EnvironmentRenderer | null = null;
  private pieceRenderer: PieceRenderer | null = null;
  private themeLoader: ThemeLoader | null = null;
  private menuBackground: MenuBackground | null = null;

  /** 游戏结束回调引用（用于清理） */
  private gameEndCallback: ((result: GameResult, winner: Player | null) => void) | null = null;

  /** UI更新回调引用（用于清理） */
  private uiUpdateCallback: UIUpdateCallback | null = null;

  /**
   * 初始化游戏
   */
  async init(): Promise<void> {
    try {
      console.log('🎮 Connect Four 3D - Phase 6 UI Layer');

      // 初始化战绩存储
      this.statsStore = new StatsStore();

      // 初始化UI模块
      this.gameUI = new GameUI(this.statsStore);
      this.menuUI = new MenuUI(this.statsStore);

      this.gameUI.init();
      this.menuUI.init();

      // 初始化Three.js场景
      this.sceneSetup = new SceneSetup('canvas-container');
      const scene = this.sceneSetup.getScene();
      const camera = this.sceneSetup.getCamera();
      const canvas = this.sceneSetup.getCanvas();

      // 使用默认高度初始化渲染器
      const defaultHeight = BOARD_CONFIG.height;
      this.boardRenderer = new BoardRenderer(defaultHeight);
      this.boardRenderer.init(scene);

      // 初始化相机控制器
      this.cameraController = new CameraController(camera, canvas, defaultHeight);

      // 初始化输入处理器
      this.inputHandler = new InputHandler(camera, scene, canvas);
      this.inputHandler.createClickableGrid(BOARD_CONFIG.width, defaultHeight);

      // 创建游戏控制器
      this.gameController = new GameController(
        this.boardRenderer,
        this.inputHandler,
        this.cameraController
      );

      // 初始化游戏控制器（绑定输入回调）
      this.gameController.init();

      // === Phase 7：主题系统初始化 ===
      // 创建素材加载器
      this.themeLoader = new ThemeLoader();

      // 创建主题管理器
      this.themeManager = new ThemeManager(this.themeLoader);
      this.themeManager.registerTheme('CLASSIC', CLASSIC_THEME);
      this.themeManager.registerTheme('CAT', CAT_THEME);
      this.themeManager.registerTheme('MECHA', MECHA_THEME);

      // 创建环境渲染器（管理背景+光照）
      this.environmentRenderer = new EnvironmentRenderer();
      this.environmentRenderer.init(scene);

      // 创建棋子渲染器（GLB模型管理）
      this.pieceRenderer = new PieceRenderer(this.themeLoader);
      // 关联到BoardRenderer（使GLB主题时BoardRenderer能委托创建模型棋子）
      this.boardRenderer.setPieceRenderer(this.pieceRenderer);

      // 创建动画控制器
      this.animationController = new AnimationController();
      this.animationController.setTheme(CLASSIC_THEME); // 设置初始主题

      // 创建棋子状态管理器
      this.pieceStateManager = new PieceStateManager();

      // 创建主题选择UI（需要ThemeManager参数）
      this.themeSelectUI = new ThemeSelectUI(this.themeManager);
      this.themeSelectUI.init();
      this.themeSelectUI.onSelect((themeId) => {
        this.switchTheme(themeId);
      });

      // 注册渲染器到ThemeManager（切换时自动同步环境+棋盘）
      this.themeManager.onApplyTheme(async (theme: ThemeConfig) => {
        await this.environmentRenderer?.applyTheme(theme);
        await this.boardRenderer?.applyTheme(theme);
      });

      // 集成到渲染循环
      this.sceneSetup.setAnimationController(this.animationController);

      // 每帧更新中心棋子朝向镜头
      this.sceneSetup.onBeforeRender(() => {
        if (this.boardRenderer && this.sceneSetup) {
          this.boardRenderer.updateCenterPiece(this.sceneSetup.getCamera());
        }
      });

      // 集成到游戏控制器
      this.gameController.setThemeManager(this.themeManager);
      this.gameController.setPieceStateManager(this.pieceStateManager);
      this.gameController.setAnimationController(this.animationController);

      // 启动时加载默认主题（CLASSIC）- 应用背景/光照/棋盘颜色
      await this.themeManager.setTheme('CLASSIC');
      console.log('[Game] Default theme CLASSIC applied');

      // 主菜单 3D 背景
      this.menuBackground = new MenuBackground(this.themeLoader);
      await this.menuBackground.init(scene);

      // 设置菜单回调
      this.menuUI.setStartGameCallback((difficulty, order) => {
        this.startGame(difficulty, order);
      });

      // 设置返回主菜单回调
      this.gameUI.setBackToMenuCallback(() => {
        this.backToMenu();
      });

      // 设置再来一局回调
      this.gameUI.setRestartCallback(() => {
        this.restart();
      });

      // Phase 7：设置主题按钮回调
      this.menuUI.setThemeSelectCallback(() => {
        this.showThemeSelect();
      });

      // 注册游戏结束回调
      this.gameEndCallback = (result, winner) => {
        this.handleGameEnd(result, winner);
      };
      this.gameController.onGameEnd(this.gameEndCallback);

      // 注册UI更新回调
      this.uiUpdateCallback = (type, data) => {
        this.handleUIUpdate(type, data);
      };
      this.gameController.onUIUpdate(this.uiUpdateCallback);

      // 显示主菜单：素色背景 + 固定相机角度 + 隐藏棋盘
      this.sceneSetup?.setPlainBackground(0x0a0a0f);
      this.boardRenderer?.setBoardVisible(false);
      this.cameraController?.setEnabled(false);
      this.applyMenuCamera();
      this.menuUI.show();
      this.menuBackground?.show();

      console.log('✅ Phase 6 UI layer initialized');
      console.log('📌 Menu displayed, select difficulty and order to start');
      console.log('🖱️ Left-click to place piece');
      console.log('🖱️ Right-click drag to rotate view');
      console.log('🖱️ Scroll wheel to zoom in/out');

    } catch (error) {
      console.error('❌ Initialization failed:', error);
    }
  }

  /**
   * 开始新游戏
   * @param difficulty 难度
   * @param order 先后手
   */
  async startGame(difficulty: Difficulty, order: Order): Promise<void> {
    if (!this.gameController) return;

    console.log(`[Game] Starting new game: difficulty=${difficulty}, order=${order}`);

    // 恢复主题背景，显示棋盘
    if (this.environmentRenderer) {
      const theme = this.themeManager?.getThemeConfig();
      if (theme) this.environmentRenderer.applyTheme(theme);
    }
    this.boardRenderer?.setBoardVisible(true);
    this.menuBackground?.hide();
    this.menuUI?.hide();
    this.gameUI?.hideGameEnd();
    this.gameUI?.show();

    // 更新HUD信息（难度在动画期间显示）
    this.gameUI?.updateDifficulty(difficulty);
    this.gameUI?.updateSteps(0);

    // === 开场动画期间禁用所有交互 ===
    // 禁用相机旋转/缩放
    this.cameraController?.setEnabled(false);
    // 禁用棋盘点击（InputHandler）
    this.inputHandler?.disable();
    // 禁用HUD按钮（返回菜单、战绩按钮）
    this.gameUI?.setButtonsEnabled(false);

    // 准备游戏：设置棋盘，预计算先后手
    const isPlayerFirst = this.gameController.prepareGame(difficulty, order);

    // 显示开场提示
    this.gameUI?.showStartHint(isPlayerFirst);

    // 播放开场动画（2秒）
    await this.cameraController?.playIntroAnimation(2000);

    // 动画完成，隐藏提示
    this.gameUI?.hideStartHint();

    // === 动画完成后启用交互 ===
    this.cameraController?.setEnabled(true);
    this.gameUI?.setButtonsEnabled(true);
    // InputHandler 会在 beginGame 中根据游戏状态自动启用/禁用

    // 开始游戏逻辑（这会触发状态变化和启用输入）
    this.gameController.beginGame(isPlayerFirst);

    // 更新回合显示
    this.gameUI?.updateTurn(isPlayerFirst ? 'BLACK' : 'WHITE', !isPlayerFirst);

    // 开始计时
    this.gameUI?.startTimer();
  }

  /**
   * 处理游戏结束
   * @param result 游戏结果
   * @param winner 获胜者
   */
  private handleGameEnd(result: GameResult, winner: Player | null): void {
    console.log(`[Game] Game ended: result=${result}, winner=${winner}`);

    // 停止计时
    this.gameUI?.stopTimer();

    // 更新战绩（解锁状态从战绩自动推导，无需单独管理）
    const difficulty = this.gameController?.getDifficulty() || 'MEDIUM';
    if (result !== 'DRAW') {
      this.statsStore?.update(difficulty, result);
    }

    // 刷新战绩显示
    this.gameUI?.refreshStats();

    // 显示游戏结束面板
    this.gameUI?.showGameEnd(result);

    // 显示结果提示
    if (result === 'WIN') {
      console.log('🏆 You won!');
    } else if (result === 'LOSS') {
      console.log('💔 AI won!');
    } else {
      console.log('🤝 Draw!');
    }
  }

  /**
   * 处理UI更新
   * @param type 更新类型
   * @param data 更新数据
   */
  private handleUIUpdate(type: 'turn' | 'steps' | 'aiThinking', data: unknown): void {
    switch (type) {
      case 'turn':
        const turnData = data as { player: Player; isAI: boolean };
        this.gameUI?.updateTurn(turnData.player, turnData.isAI);
        break;

      case 'steps':
        this.gameUI?.updateSteps(data as number);
        break;

      case 'aiThinking':
        const thinking = data as boolean;
        if (thinking) {
          this.gameUI?.showAIThinking();
        } else {
          this.gameUI?.hideAIThinking();
        }
        break;
    }
  }

  /**
   * 重新开始游戏
   */
  restart(): void {
    if (!this.gameController) return;

    // 保存当前难度和先后手选择
    const currentDifficulty = this.gameController.getDifficulty();
    const currentOrder = this.gameController.getPlayerOrder();

    console.log(`[Game] Restarting... difficulty=${currentDifficulty}, order=${currentOrder}`);

    this.gameController.restart();

    // 使用保存的难度和先后手选择开始新游戏
    this.startGame(currentDifficulty, currentOrder);
  }

  /**
   * 返回主菜单
   */
  backToMenu(): void {
    if (!this.gameController) return;

    console.log('[Game] Back to menu...');
    this.gameController.backToMenu();

    // 停止计时
    this.gameUI?.stopTimer();
    this.gameUI?.hide();

    // 显示主菜单
    this.sceneSetup?.setPlainBackground(0x0a0a0f);
    this.boardRenderer?.setBoardVisible(false);
    this.cameraController?.setEnabled(false);
    this.applyMenuCamera();
    this.menuUI?.show();
    this.menuBackground?.show();
  }

  /**
   * 获取游戏状态（调试用）
   */
  getState(): string {
    return this.gameController?.getState() || 'UNKNOWN';
  }

  /**
   * 获取步数（调试用）
   */
  getSteps(): number {
    return this.gameController?.getSteps() || 0;
  }

  /**
   * 是否玩家回合（调试用）
   */
  isPlayerTurn(): boolean {
    return this.gameController?.isPlayerTurn() || false;
  }

  /**
   * 获取战绩数据（调试用）
   */
  getStats() {
    return this.statsStore?.getStats();
  }

  // ========== Phase 7：主题系统方法 ==========

  /**
   * 显示主题选择界面
   */
  showThemeSelect(): void {
    const unlocks = this.statsStore
      ? UnlockManager.get(this.statsStore)
      : { theme: false };
    this.themeSelectUI?.setLocked(!unlocks.theme);
    this.themeSelectUI?.show();
  }

  /**
   * 切换主题
   * @param themeId 主题ID
   */
  async switchTheme(themeId: ThemeId): Promise<void> {
    if (!this.themeManager) return;

    console.log(`[Game] Switching theme to: ${themeId}`);

    // Step 1: 初始化 PieceRenderer（加载GLB模型），必须在BoardRenderer重建棋子之前
    if (themeId !== 'CLASSIC' && this.pieceRenderer && this.sceneSetup) {
      const cfg = this.themeManager.getThemeConfigById(themeId);
      if (cfg) {
        const scene = this.sceneSetup.getScene();
        await this.pieceRenderer.init(scene, cfg);
        console.log(`[Game] PieceRenderer initialized for ${themeId}`);
      }
    }

    // Step 2: 应用主题（触发 BoardRenderer.applyTheme → recreateAllPieces 使用已加载的模型）
    const success = await this.themeManager.setTheme(themeId);

    if (success) {
      // 更新动画控制器
      const theme = this.themeManager.getThemeConfig();
      if (theme && this.animationController) {
        this.animationController.setTheme(theme);
      }

      console.log(`[Game] Theme switched to ${themeId}`);
    } else {
      console.warn(`[Game] Theme switch failed`);
    }
  }

  /**
   * 获取当前主题（调试用）
   */
  getTheme(): string {
    return this.themeManager?.currentTheme || 'CLASSIC';
  }

  /** 设置菜单相机角度：逆时针45° + 压低30° */
  private applyMenuCamera(): void {
    const cam = this.sceneSetup?.getCamera();
    if (!cam) return;
    // 逆时针旋转 + 压低 → 相机移到左前侧，降低高度
    cam.position.set(3, 8, 11);
    cam.lookAt(2.5, 4, 2.5);
  }

  /**
   * 清理资源
   */
  dispose(): void {
    // 移除回调
    if (this.gameController && this.gameEndCallback) {
      this.gameController.removeGameEndCallback(this.gameEndCallback);
    }
    if (this.gameController && this.uiUpdateCallback) {
      this.gameController.removeUIUpdateCallback(this.uiUpdateCallback);
    }

    // 清理UI模块
    this.gameUI?.dispose();
    this.menuUI?.dispose();

    // Phase 7：清理主题模块
    this.themeSelectUI?.dispose();
    this.animationController?.dispose();
    this.pieceStateManager?.reset();
    this.environmentRenderer?.dispose();
    this.pieceRenderer?.clearAll();
    this.menuBackground?.dispose();

    // 清理游戏模块
    this.gameController?.dispose();
    this.boardRenderer?.dispose();
    this.cameraController?.dispose();
    this.inputHandler?.dispose();
    this.sceneSetup?.dispose();
  }
}

// 启动游戏
const game = new ConnectFour3D();
game.init();

// 暴露到全局（方便调试）
(window as unknown as { game: ConnectFour3D }).game = game;