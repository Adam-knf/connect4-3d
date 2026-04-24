/**
 * GameState 游戏状态管理
 * 状态机管理游戏流程
 */

import type {
  GameStateType,
  Difficulty,
  Order,
  Player,
  GameResult,
  Position,
} from '@/types';
import { getBoardHeightByDifficulty } from '@/config/gameConfig';

/**
 * 游戏状态回调类型
 * @param newState 新状态
 * @param oldState 旧状态
 * @param data 附加数据
 */
export type StateCallback = (
  newState: GameStateType,
  oldState: GameStateType,
  data?: unknown
) => void;

/**
 * 游戏状态数据
 */
export interface GameStateData {
  /** 当前状态 */
  currentState: GameStateType;

  /** 当前难度 */
  difficulty: Difficulty;

  /** 玩家棋子类型 */
  playerPiece: Player;

  /** AI棋子类型 */
  aiPiece: Player;

  /** 当前回合玩家 */
  currentTurn: Player;

  /** 游戏结果 */
  result: GameResult | null;

  /** 已用步数 */
  steps: number;

  /** 游戏开始时间 */
  startTime: number | null;

  /** 最后一步位置 */
  lastMove: Position | null;

  /** AI思考状态 */
  aiThinking: boolean;
}

/**
 * 游戏状态管理类
 */
export class GameState {
  /** 状态数据 */
  private data: GameStateData;

  /** 状态变化回调列表 */
  private callbacks: StateCallback[] = [];

  /**
   * 构造函数
   */
  constructor() {
    this.data = this.createInitialState();
  }

  /**
   * 创建初始状态
   */
  private createInitialState(): GameStateData {
    return {
      currentState: 'MENU',
      difficulty: 'EASY',
      playerPiece: 'BLACK',
      aiPiece: 'WHITE',
      currentTurn: 'BLACK',
      result: null,
      steps: 0,
      startTime: null,
      lastMove: null,
      aiThinking: false,
    };
  }

  /**
   * 获取当前状态
   */
  getState(): GameStateType {
    return this.data.currentState;
  }

  /**
   * 获取完整状态数据
   */
  getData(): GameStateData {
    return { ...this.data };
  }

  /**
   * 设置难度（进入选先后手状态）
   * @param difficulty 难度
   */
  setDifficulty(difficulty: Difficulty): void {
    this.data.difficulty = difficulty;
    this.transitionTo('SELECT_ORDER');
  }

  /**
   * 预计算先后手结果（不触发状态变化）
   * 用于开场动画显示提示
   * @param order 先后手选择
   * @returns 是否先手
   */
  determineOrder(order: Order): boolean {
    if (order === 'FIRST') {
      return true;
    } else if (order === 'SECOND') {
      return false;
    } else {
      // RANDOM: 随机选择
      return Math.random() < 0.5;
    }
  }

  /**
   * 应用预先计算的先后手结果
   * @param isFirst 是否先手
   */
  applyOrderResult(isFirst: boolean): void {
    this.data.playerPiece = isFirst ? 'BLACK' : 'WHITE';
    this.data.aiPiece = isFirst ? 'WHITE' : 'BLACK';

    // 选择先后手后，直接开始游戏
    this.data.currentTurn = 'BLACK'; // 黑棋先手
    this.data.result = null;
    this.data.steps = 0;
    this.data.startTime = Date.now();
    this.data.lastMove = null;
    this.data.aiThinking = false;

    // 如果玩家是白棋，需要等待AI先走
    if (this.data.playerPiece === 'WHITE') {
      this.data.aiThinking = true;
      this.transitionTo('AI_TURN');
    } else {
      this.transitionTo('PLAYER_TURN');
    }
  }

  /**
   * 设置先后手（进入游戏状态）
   * @param order 先后手选择
   */
  setOrder(order: Order): void {
    if (order === 'FIRST') {
      this.data.playerPiece = 'BLACK';
      this.data.aiPiece = 'WHITE';
    } else if (order === 'SECOND') {
      this.data.playerPiece = 'WHITE';
      this.data.aiPiece = 'BLACK';
    } else {
      // RANDOM: 随机选择
      const isFirst = Math.random() < 0.5;
      this.data.playerPiece = isFirst ? 'BLACK' : 'WHITE';
      this.data.aiPiece = isFirst ? 'WHITE' : 'BLACK';
    }

    // 选择先后手后，直接开始游戏
    this.data.currentTurn = 'BLACK'; // 黑棋先手
    this.data.result = null;
    this.data.steps = 0;
    this.data.startTime = Date.now();
    this.data.lastMove = null;
    this.data.aiThinking = false;

    // 如果玩家是白棋，需要等待AI先走
    if (this.data.playerPiece === 'WHITE') {
      this.data.aiThinking = true;
      this.transitionTo('AI_TURN');
    } else {
      this.transitionTo('PLAYER_TURN');
    }
  }

  /**
   * 获取玩家棋子类型
   */
  getPlayerPiece(): Player {
    return this.data.playerPiece;
  }

  /**
   * 获取AI棋子类型
   */
  getAIPiece(): Player {
    return this.data.aiPiece;
  }

  /**
   * 获取当前回合玩家
   */
  getCurrentTurn(): Player {
    return this.data.currentTurn;
  }

  /**
   * 是否玩家回合
   */
  isPlayerTurn(): boolean {
    return this.data.currentTurn === this.data.playerPiece && !this.data.aiThinking;
  }

  /**
   * 是否AI回合
   */
  isAITurn(): boolean {
    return this.data.currentTurn === this.data.aiPiece;
  }

  /**
   * 获取难度
   */
  getDifficulty(): Difficulty {
    return this.data.difficulty;
  }

  /**
   * 获取当前难度对应的棋盘高度
   */
  getBoardHeight(): number {
    return getBoardHeightByDifficulty(this.data.difficulty);
  }

  /**
   * 获取步数
   */
  getSteps(): number {
    return this.data.steps;
  }

  /**
   * 获取游戏结果
   */
  getResult(): GameResult | null {
    return this.data.result;
  }

  /**
   * 获取最后一步位置
   */
  getLastMove(): Position | null {
    return this.data.lastMove;
  }

  /**
   * 是否AI正在思考
   */
  isAIThinking(): boolean {
    return this.data.aiThinking;
  }

  /**
   * 开始游戏流程（从主菜单进入难度选择）
   */
  startGame(): void {
    this.transitionTo('SELECT_DIFFICULTY');
  }

  /**
   * 切换回合
   */
  switchTurn(): void {
    const oldState = this.data.currentState;
    const oldTurn = this.data.currentTurn;

    if (this.data.currentTurn === 'BLACK') {
      this.data.currentTurn = 'WHITE';
    } else {
      this.data.currentTurn = 'BLACK';
    }

    // 判断是玩家回合还是AI回合
    const isAITurn = this.data.currentTurn === this.data.aiPiece;
    console.log(`[GameState.switchTurn] turn: ${oldTurn} -> ${this.data.currentTurn}, playerPiece: ${this.data.playerPiece}, aiPiece: ${this.data.aiPiece}, isAITurn: ${isAITurn}`);

    if (isAITurn) {
      this.data.currentState = 'AI_TURN';
      this.data.aiThinking = true;
    } else {
      this.data.currentState = 'PLAYER_TURN';
      this.data.aiThinking = false;
    }

    this.notifyStateChange(this.data.currentState, oldState);
  }

  /**
   * 记录一步棋
   * @param position 放置位置
   */
  recordMove(position: Position): void {
    this.data.steps++;
    this.data.lastMove = position;
    // 棋子放置不改变状态，通知附带位置数据
    this.notifyStateChange(this.data.currentState, this.data.currentState, position);
  }

  /**
   * AI思考完成
   */
  aiDone(): void {
    this.data.aiThinking = false;
    // AI完成不改变状态，通知当前状态
    this.notifyStateChange(this.data.currentState, this.data.currentState);
  }

  /**
   * 游戏结束
   * @param result 游戏结果
   */
  endGame(result: GameResult): void {
    this.data.result = result;
    this.data.aiThinking = false;
    this.transitionTo('GAME_END', result);
  }

  /**
   * 平局
   */
  draw(): void {
    this.data.result = 'DRAW';
    this.data.aiThinking = false;
    this.transitionTo('GAME_END', 'DRAW');
  }

  /**
   * 重新开始
   */
  restart(): void {
    const oldState = this.data.currentState;
    this.data = this.createInitialState();
    this.notifyStateChange('MENU', oldState);
  }

  /**
   * 返回主菜单
   */
  backToMenu(): void {
    this.transitionTo('MENU');
  }

  /**
   * 获取游戏用时（秒）
   */
  getElapsedTime(): number {
    if (this.data.startTime === null) {
      return 0;
    }
    return Math.floor((Date.now() - this.data.startTime) / 1000);
  }

  /**
   * 注册状态变化回调
   * @param callback 回调函数
   */
  onStateChange(callback: StateCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * 移除回调
   * @param callback 回调函数
   */
  removeCallback(callback: StateCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * 通知所有回调状态变化
   */
  private notifyStateChange(
    newState: GameStateType,
    oldState: GameStateType,
    data?: unknown
  ): void {
    for (const callback of this.callbacks) {
      callback(newState, oldState, data);
    }
  }

  /**
   * 状态转换（统一入口）
   */
  private transitionTo(newState: GameStateType, data?: unknown): void {
    const oldState = this.data.currentState;
    this.data.currentState = newState;
    this.notifyStateChange(newState, oldState, data);
  }
}