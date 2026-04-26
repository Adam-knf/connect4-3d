/**
 * GameController 游戏流程控制
 * 协调 GameState、Board、AIPlayer、BoardRenderer、InputHandler
 * 实现完整游戏流程
 */

import { GameState, StateCallback } from './GameState';
import { Board } from './Board';
import { AIPlayer } from './AIPlayer';
import { BoardRenderer } from '@/rendering/BoardRenderer';
import { CameraController } from '@/rendering/CameraController';
import { InputHandler } from '@/ui/InputHandler';
import type { GameStateType, Difficulty, Order, Player, WinResult, GameResult } from '@/types';
import { BOARD_CONFIG } from '@/config/gameConfig';

/**
 * GameController 配置
 */
export interface GameControllerConfig {
  /** 场景容器DOM ID */
  containerId: string;
}

/**
 * 回调函数类型
 */
export type GameEndCallback = (result: GameResult, winner: Player | null) => void;

/**
 * UI更新回调类型
 */
export type UIUpdateCallback = (type: 'turn' | 'steps' | 'aiThinking', data: unknown) => void;

/**
 * 游戏流程控制器
 * 协调所有游戏模块，管理游戏生命周期
 */
export class GameController {
  // ========== 核心模块 ==========

  /** 游戏状态机 */
  private state: GameState;

  /** 棋盘逻辑 */
  private board: Board;

  /** AI玩家 */
  private ai: AIPlayer;

  // ========== 渲染模块 ==========

  /** 棋盘渲染器 */
  private boardRenderer: BoardRenderer;

  /** 相机控制器 */
  private cameraController: CameraController | null;

  /** 输入处理器 */
  private inputHandler: InputHandler;

  // ========== 状态 ==========

  /** 是否已初始化 */
  private initialized: boolean = false;

  /** 游戏结束回调 */
  private gameEndCallbacks: GameEndCallback[] = [];

  /** UI更新回调 */
  private uiUpdateCallbacks: UIUpdateCallback[] = [];

  /** 状态变化回调引用（用于清理） */
  private stateCallback: StateCallback;

  /**
   * 构造函数
   * @param boardRenderer 棋盘渲染器
   * @param inputHandler 输入处理器
   * @param cameraController 相机控制器（可选，用于动态更新高度）
   */
  constructor(
    boardRenderer: BoardRenderer,
    inputHandler: InputHandler,
    cameraController?: CameraController
  ) {
    this.boardRenderer = boardRenderer;
    this.inputHandler = inputHandler;
    this.cameraController = cameraController ?? null;

    // 创建核心模块
    this.state = new GameState();
    this.board = new Board(this.state.getBoardHeight());
    this.ai = new AIPlayer('MEDIUM');

    // 绑定状态变化回调
    this.stateCallback = this.handleStateChange.bind(this);
    this.state.onStateChange(this.stateCallback);
  }

  /**
   * 初始化游戏
   * 设置默认难度和状态
   */
  init(): void {
    if (this.initialized) {
      console.warn('[GameController] Already initialized');
      return;
    }

    console.log('[GameController] Initializing...');

    // 设置默认难度（用于测试）
    this.state.setDifficulty('MEDIUM');

    // 绑定输入回调
    this.setupInputCallbacks();

    this.initialized = true;
    console.log('[GameController] Initialized, current state:', this.state.getState());
  }

  /**
   * 准备游戏（设置难度、棋盘，预计算先后手）
   * 用于开场动画期间显示提示
   * @param difficulty 难度
   * @param order 先后手
   * @returns 是否先手
   */
  prepareGame(difficulty: Difficulty, order: Order): boolean {
    console.log(`[GameController.prepareGame] Input difficulty: ${difficulty}, current state difficulty: ${this.state.getDifficulty()}`);

    // 直接修改原始状态数据（不触发状态变化）
    const stateData = this.state.getDataRef();
    stateData.difficulty = difficulty;
    stateData.currentState = 'SELECT_ORDER';
    console.log(`[GameController.prepareGame] After setting, difficulty: ${this.state.getDifficulty()}`);

    // 更新AI难度
    this.ai.setDifficulty(difficulty);

    // 根据难度创建新棋盘
    const boardHeight = this.state.getBoardHeight();
    this.board = new Board(boardHeight);

    // 更新渲染器和相机的高度
    this.boardRenderer.updateBoardHeight(boardHeight);
    if (this.cameraController) {
      this.cameraController.updateBoardHeight(boardHeight);
    }

    // 清除棋盘渲染
    this.boardRenderer.clearPieces();
    this.boardRenderer.clearWinHighlight();

    // 更新可点击网格
    this.inputHandler.createClickableGrid(BOARD_CONFIG.width, boardHeight);

    // 预计算先后手结果
    const isFirst = this.state.determineOrder(order);

    console.log(`[GameController] Player will be ${isFirst ? 'BLACK (first)' : 'WHITE (second)'}`);

    return isFirst;
  }

  /**
   * 开始游戏（应用先后手结果，启用输入）
   * @param isFirst 是否先手
   */
  beginGame(isFirst: boolean): void {
    console.log(`[GameController] Beginning game, player is ${isFirst ? 'BLACK' : 'WHITE'}`);

    // 应用预先计算的先后手结果
    this.state.applyOrderResult(isFirst);

    const playerPiece = this.state.getPlayerPiece();
    console.log(`[GameController] Game started: ${playerPiece === 'BLACK' ? 'player goes first' : 'AI goes first'}`);
  }

  /**
   * 开始游戏（兼容旧接口）
   * @param difficulty 难度
   * @param order 先后手
   */
  startGame(difficulty: Difficulty, order: Order): void {
    const isFirst = this.prepareGame(difficulty, order);
    this.beginGame(isFirst);
  }

  /**
   * 设置输入回调
   */
  private setupInputCallbacks(): void {
    // 点击回调
    this.inputHandler.setClickCallback((x, y) => {
      this.handlePlayerClick(x, y);
    });

    // 悬停回调
    this.inputHandler.setHoverCallback((x, y) => {
      this.handleHover(x, y);
    });

    // 右键状态回调
    this.inputHandler.setRightButtonCallback((isPressed) => {
      this.handleRightButton(isPressed);
    });
  }

  /**
   * 处理状态变化
   * @param newState 新状态
   * @param oldState 旧状态
   * @param data 附加数据
   */
  private handleStateChange(newState: GameStateType, oldState: GameStateType, data?: unknown): void {
    console.log(`[GameController.handleStateChange] ${oldState} → ${newState}`, data);

    // 处理UI更新（即使状态不变）
    // 当状态不变但data存在时，说明是步数更新
    if (newState === oldState) {
      // 步数更新
      this.notifyUIUpdate('steps', this.state.getSteps());
      return;
    }

    switch (newState) {
      case 'PLAYER_TURN':
        // 玩家回合：启用输入
        console.log('[GameController] PLAYER_TURN: enabling input');
        this.enableInput();
        // 通知回合更新
        this.notifyUIUpdate('turn', { player: this.state.getCurrentTurn(), isAI: false });
        this.notifyUIUpdate('aiThinking', false);
        break;

      case 'AI_TURN':
        // AI回合：禁用输入，开始AI决策
        console.log('[GameController] AI_TURN: disabling input, starting AI turn');
        this.disableInput();
        // 通知回合更新
        this.notifyUIUpdate('turn', { player: this.state.getCurrentTurn(), isAI: true });
        this.notifyUIUpdate('aiThinking', true);
        this.handleAITurn();
        break;

      case 'GAME_END':
        // 游戏结束：处理结果
        this.handleGameEnd(data as GameResult);
        this.notifyUIUpdate('aiThinking', false);
        break;

      case 'MENU':
        // 返回主菜单：清除棋盘
        this.boardRenderer.clearPieces();
        this.boardRenderer.clearWinHighlight();
        break;

      default:
        break;
    }
  }

  /**
   * 处理玩家点击
   * @param x X坐标
   * @param y Y坐标
   */
  private handlePlayerClick(x: number, y: number): void {
    // 检查是否是玩家回合
    if (!this.state.isPlayerTurn()) {
      console.log('[GameController] Not player turn, ignoring click');
      return;
    }

    console.log(`[GameController] Player click at (${x}, ${y})`);

    // 点击时禁用高亮
    this.boardRenderer.setHighlightEnabled(false);

    // 计算落点
    const z = this.board.findDropPosition(x, y);
    if (z === -1) {
      console.log('[GameController] Column is full');
      // 列满时恢复高亮
      this.boardRenderer.setHighlightEnabled(true);
      this.inputHandler.refreshHoverState();
      return;
    }

    // 获取当前玩家棋子
    const playerPiece = this.state.getPlayerPiece();

    // 放置棋子
    const result = this.board.placePiece(x, y, playerPiece);
    if (!result) {
      console.log('[GameController] Place failed');
      this.boardRenderer.setHighlightEnabled(true);
      this.inputHandler.refreshHoverState();
      return;
    }

    console.log(`[GameController] Piece placed at (${result.pos.x}, ${result.pos.y}, ${result.pos.z})`);

    // 记录步数
    this.state.recordMove(result.pos);

    // 渲染棋子（带下落动画）
    this.boardRenderer.addPiece(result.pos, playerPiece).animation.then(() => {
      console.log('[GameController] Player drop animation complete, checking game state...');
      console.log(`[GameController] Current state: ${this.state.getState()}, turn: ${this.state.getCurrentTurn()}`);

      // 更新棋子列表（用于射线检测）
      this.updatePieceMeshes();

      // 检查胜负
      if (result.winResult) {
        console.log(`[GameController] Winner detected: ${result.winResult.winner}`);
        this.handleWin(result.winResult);
      } else if (this.board.isFull()) {
        // 棋盘满，平局
        console.log('[GameController] Board full, draw');
        this.handleDraw();
      } else {
        // 切换回合
        console.log('[GameController] No winner, switching turn...');
        this.state.switchTurn();
      }
    });
  }

  /**
   * 处理AI回合
   */
  private async handleAITurn(): Promise<void> {
    console.log('[GameController] AI turn starting...');

    // 获取AI棋子类型
    const aiPiece = this.state.getAIPiece();
    this.ai.setPiece(aiPiece);

    // AI决策
    const decision = await this.ai.decide(this.board);
    console.log(`[GameController] AI decision: (${decision.x}, ${decision.y})`);

    // AI思考完成通知
    this.state.aiDone();

    // 放置棋子
    const result = this.board.placePiece(decision.x, decision.y, aiPiece);
    if (!result) {
      console.error('[GameController] AI place failed - column full or invalid position');
      // 异常情况：AI无法放置棋子，游戏结束为平局
      this.handleDraw();
      return;
    }

    console.log(`[GameController] AI piece placed at (${result.pos.x}, ${result.pos.y}, ${result.pos.z})`);

    // 记录步数
    this.state.recordMove(result.pos);

    // 渲染棋子（带下落动画）
    this.boardRenderer.addPiece(result.pos, aiPiece).animation.then(() => {
      console.log('[GameController] AI drop animation complete, checking game state...');
      console.log(`[GameController] Current state: ${this.state.getState()}, turn: ${this.state.getCurrentTurn()}`);

      // 更新棋子列表
      this.updatePieceMeshes();

      // 检查胜负
      if (result.winResult) {
        console.log(`[GameController] AI won: ${result.winResult.winner}`);
        this.handleWin(result.winResult);
      } else if (this.board.isFull()) {
        console.log('[GameController] Board full, draw');
        this.handleDraw();
      } else {
        // 切换回合
        console.log('[GameController] No winner, switching turn...');
        this.state.switchTurn();
      }
    });
  }

  /**
   * 处理胜负结果
   * @param winResult 胜负结果
   */
  private handleWin(winResult: WinResult): void {
    const playerPiece = this.state.getPlayerPiece();
    const isPlayerWin = winResult.winner === playerPiece;
    const result: GameResult = isPlayerWin ? 'WIN' : 'LOSS';

    console.log(`[GameController] Game end: ${result}, winner: ${winResult.winner}`);

    // 显示胜利连线高亮
    if (isPlayerWin) {
      this.boardRenderer.showWinLine(winResult.linePositions);
    } else {
      this.boardRenderer.showLoseLine(winResult.linePositions);
    }

    // 结束游戏
    this.state.endGame(result);
  }

  /**
   * 处理平局
   */
  private handleDraw(): void {
    console.log('[GameController] Game draw');
    this.state.draw();
  }

  /**
   * 处理游戏结束
   * @param result 游戏结果
   */
  private handleGameEnd(result: GameResult): void {
    console.log(`[GameController] Handling game end: ${result}`);

    // 禁用输入
    this.disableInput();

    // 触发游戏结束回调
    const winner = this.state.getData().lastMove ?
      (result === 'WIN' ? this.state.getPlayerPiece() : this.state.getAIPiece()) : null;

    for (const callback of this.gameEndCallbacks) {
      callback(result, winner);
    }
  }

  /**
   * 处理悬停
   * @param x X坐标
   * @param y Y坐标
   */
  private handleHover(x: number, y: number): void {
    // 如果高亮被禁用，不处理
    if (!this.boardRenderer.isHighlightEnabled()) return;

    // 如果不是玩家回合，不显示预览
    if (!this.state.isPlayerTurn()) {
      this.boardRenderer.clearPreviewPiece();
      this.boardRenderer.clearHighlight();
      return;
    }

    if (x === -1 || y === -1) {
      // 鼠标移出棋盘
      this.boardRenderer.clearPreviewPiece();
      this.boardRenderer.clearHighlight();
      return;
    }

    // 计算落点
    const z = this.board.findDropPosition(x, y);
    if (z === -1) {
      // 该列已满
      this.boardRenderer.clearPreviewPiece();
      this.boardRenderer.highlightColumn(x, y, undefined, false);
      return;
    }

    // 显示预览棋子
    const playerPiece = this.state.getPlayerPiece();
    this.boardRenderer.showPreviewPiece(x, y, z, playerPiece);

    // 高亮列
    this.boardRenderer.highlightColumn(x, y, z, true);
  }

  /**
   * 处理右键状态
   * @param isPressed 是否按下
   */
  private handleRightButton(isPressed: boolean): void {
    if (isPressed) {
      // 右键按下：禁用高亮
      this.boardRenderer.setHighlightEnabled(false);
    } else {
      // 右键松开：恢复高亮
      this.boardRenderer.setHighlightEnabled(true);
      this.inputHandler.refreshHoverState();
    }
  }

  /**
   * 启用输入
   */
  private enableInput(): void {
    console.log('[GameController.enableInput] Enabling input, current state:', this.state.getState());
    this.inputHandler.enable();
    this.boardRenderer.setHighlightEnabled(true);
    // 刷新悬停状态
    this.inputHandler.refreshHoverState();
  }

  /**
   * 禁用输入
   */
  private disableInput(): void {
    console.log('[GameController.disableInput] Disabling input, current state:', this.state.getState());
    this.inputHandler.disable();
    this.boardRenderer.setHighlightEnabled(false);
    this.boardRenderer.clearPreviewPiece();
    this.boardRenderer.clearHighlight();
  }

  /**
   * 更新棋子列表（用于射线检测）
   */
  private updatePieceMeshes(): void {
    this.inputHandler.updatePieceMeshes(this.boardRenderer.getPieceMeshes());
  }

  // ========== 公共接口 ==========

  /**
   * 获取当前状态
   */
  getState(): GameStateType {
    return this.state.getState();
  }

  /**
   * 获取状态数据
   */
  getStateData() {
    return this.state.getData();
  }

  /**
   * 是否玩家回合
   */
  isPlayerTurn(): boolean {
    return this.state.isPlayerTurn();
  }

  /**
   * 是否AI正在思考
   */
  isAIThinking(): boolean {
    return this.state.isAIThinking();
  }

  /**
   * 获取步数
   */
  getSteps(): number {
    return this.state.getSteps();
  }

  /**
   * 获取难度
   */
  getDifficulty(): Difficulty {
    return this.state.getDifficulty();
  }

  /**
   * 获取玩家的先后手选择
   */
  getPlayerOrder(): Order {
    return this.state.getPlayerOrder();
  }

  /**
   * 获取游戏用时
   */
  getElapsedTime(): number {
    return this.state.getElapsedTime();
  }

  /**
   * 重新开始游戏
   */
  restart(): void {
    console.log(`[GameController.restart] Before restart, difficulty: ${this.state.getDifficulty()}`);
    this.state.restart();
    console.log(`[GameController.restart] After restart, difficulty: ${this.state.getDifficulty()}`);

    // 重新初始化棋盘
    this.board = new Board(this.state.getBoardHeight());
    this.boardRenderer.clearPieces();
    this.boardRenderer.clearWinHighlight();
  }

  /**
   * 返回主菜单
   */
  backToMenu(): void {
    console.log('[GameController] Back to menu...');
    this.state.backToMenu();
  }

  /**
   * 注册游戏结束回调
   * @param callback 回调函数
   */
  onGameEnd(callback: GameEndCallback): void {
    this.gameEndCallbacks.push(callback);
  }

  /**
   * 移除游戏结束回调
   * @param callback 回调函数
   */
  removeGameEndCallback(callback: GameEndCallback): void {
    const index = this.gameEndCallbacks.indexOf(callback);
    if (index > -1) {
      this.gameEndCallbacks.splice(index, 1);
    }
  }

  /**
   * 注册UI更新回调
   * @param callback 回调函数
   */
  onUIUpdate(callback: UIUpdateCallback): void {
    this.uiUpdateCallbacks.push(callback);
  }

  /**
   * 移除UI更新回调
   * @param callback 回调函数
   */
  removeUIUpdateCallback(callback: UIUpdateCallback): void {
    const index = this.uiUpdateCallbacks.indexOf(callback);
    if (index > -1) {
      this.uiUpdateCallbacks.splice(index, 1);
    }
  }

  /**
   * 通知UI更新
   * @param type 更新类型
   * @param data 更新数据
   */
  private notifyUIUpdate(type: 'turn' | 'steps' | 'aiThinking', data: unknown): void {
    for (const callback of this.uiUpdateCallbacks) {
      callback(type, data);
    }
  }

  /**
   * 清理资源
   */
  dispose(): void {
    // 移除状态回调
    this.state.removeCallback(this.stateCallback);

    // 清理回调列表
    this.gameEndCallbacks = [];
    this.uiUpdateCallbacks = [];

    console.log('[GameController] Disposed');
  }
}