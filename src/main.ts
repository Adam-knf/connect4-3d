/**
 * 3D四子棋游戏入口文件
 * Phase 5 游戏流程整合 + Phase 6 UI层
 */

import { SceneSetup } from '@/rendering/SceneSetup';
import { BoardRenderer } from '@/rendering/BoardRenderer';
import { CameraController } from '@/rendering/CameraController';
import { InputHandler } from '@/ui/InputHandler';
import { GameController, type UIUpdateCallback } from '@/core/GameController';
import { StatsStore } from '@/core/StatsStore';
import { GameUI } from '@/ui/GameUI';
import { MenuUI } from '@/ui/MenuUI';
import type { Difficulty, Order, GameResult, Player } from '@/types';
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

  /** 游戏结束回调引用（用于清理） */
  private gameEndCallback: ((result: GameResult, winner: Player | null) => void) | null = null;

  /** UI更新回调引用（用于清理） */
  private uiUpdateCallback: UIUpdateCallback | null = null;

  /**
   * 初始化游戏
   */
  init(): void {
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

      // 显示主菜单
      this.menuUI.show();

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

    // 隐藏主菜单和游戏结束面板，显示HUD
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

    // 更新战绩
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
    this.menuUI?.show();
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