/**
 * AIPlayer AI决策模块
 * Minimax + Alpha-Beta 剪枝 + 失误率机制
 * 支持三种难度：EASY、MEDIUM、HARD
 */

import type { Player, Position, Difficulty } from '@/types';
import { Board } from './Board';
import { WinChecker } from './WinChecker';
import { EVAL_WEIGHTS, getAIConfig, getAIThinkDelay } from '@/config/aiConfig';
import { BOARD_CONFIG } from '@/config/gameConfig';

/**
 * AI评估结果
 */
interface Evaluation {
  x: number;
  y: number;
  score: number;
}

/**
 * AI决策类
 * 实现博弈树搜索 + 随机失误
 */
export class AIPlayer {
  /** 当前难度 */
  private difficulty: Difficulty;

  /** 当前搜索深度 */
  private searchDepth: number = 2;

  /** 失误率 */
  private mistakeRate: number = 0.1;

  /** AI棋子类型 */
  private aiPiece: Player;

  /** 对手棋子类型 */
  private opponentPiece: Player;

  /** 搜索节点计数（用于调试） */
  private nodeCount: number;

  /**
   * 构造函数
   * @param difficulty 初始难度
   */
  constructor(difficulty: Difficulty = 'MEDIUM') {
    this.difficulty = difficulty;
    this.aiPiece = 'WHITE';  // 默认 AI 是白棋（后手）
    this.opponentPiece = 'BLACK';
    this.nodeCount = 0;

    // 初始化搜索深度和失误率
    this.updateConfig();
  }

  /**
   * 更新难度配置
   */
  private updateConfig(): void {
    const config = getAIConfig(this.difficulty);
    this.searchDepth = config.depth;
    this.mistakeRate = config.mistakeRate;
  }

  /**
   * 设置难度
   * @param difficulty 难度级别
   */
  setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty;
    this.updateConfig();
  }

  /**
   * 设置 AI 棋子类型
   * @param piece 棋子类型
   */
  setPiece(piece: Player): void {
    this.aiPiece = piece;
    this.opponentPiece = piece === 'BLACK' ? 'WHITE' : 'BLACK';
  }

  /**
   * AI决策（异步）
   * 使用 requestIdleCallback 确保不阻塞主线程渲染
   * @param board 当前棋盘状态
   * @returns 落子位置 (x, y)
   */
  async decide(board: Board): Promise<{ x: number; y: number }> {
    this.nodeCount = 0;

    // 获取思考延迟
    const thinkDelay = getAIThinkDelay(this.difficulty);

    // 使用 requestIdleCallback 实现真正异步
    // 在空闲时间执行计算，不阻塞渲染
    return new Promise((resolve) => {
      // 先等待思考延迟
      setTimeout(() => {
        // 使用 requestIdleCallback 在空闲时间计算
        // 如果不支持（旧浏览器），fallback 到 setTimeout
        if ('requestIdleCallback' in window) {
          requestIdleCallback(
            () => {
              const result = this.calculateBestMove(board);
              resolve(result);
            },
            { timeout: 5000 }  // 最多等待5秒
          );
        } else {
          // Fallback: 使用 setTimeout(0) 放入下一个事件循环
          setTimeout(() => {
            const result = this.calculateBestMove(board);
            resolve(result);
          }, 0);
        }
      }, thinkDelay);
    });
  }

  /**
   * 计算最佳落子位置
   * @param board 当前棋盘状态
   * @returns 最佳位置 (x, y)
   */
  private calculateBestMove(board: Board): { x: number; y: number } {
    // 获取所有候选位置
    const candidates = board.getAvailableColumns();

    if (candidates.length === 0) {
      throw new Error('No available columns');
    }

    // 如果只有1个候选，直接返回
    if (candidates.length === 1) {
      return candidates[0];
    }

    // 评估所有候选位置
    const evaluations: Evaluation[] = [];

    console.log(`[AI Debug] 棋盘状态: ${board.getPieceCount()}颗棋子`);
    console.log(`[AI Debug] AI视角: ${this.aiPiece}, 搜索深度: ${this.searchDepth}`);

    for (const { x, y } of candidates) {
      const z = board.findDropPosition(x, y);
      if (z === -1) continue;

      const pos = { x, y, z };
      const score = this.evaluateMove(board, pos);
      evaluations.push({ x, y, score });

      // 详细日志
      console.log(`[AI Debug] (${x},${y},${z}) => score=${score}`);
    }

    // 排序（分数从高到低）
    evaluations.sort((a, b) => b.score - a.score);

    // 根据失误率决定是否选择次优解
    if (this.shouldMakeMistake() && evaluations.length > 1) {
      // 随机选择一个次优解（排除最优）
      const suboptimal = evaluations.slice(1);
      const randomIndex = Math.floor(Math.random() * Math.min(3, suboptimal.length));
      console.log(`[AI] Mistake! Choosing suboptimal #${randomIndex + 2} (score: ${suboptimal[randomIndex].score})`);
      return suboptimal[randomIndex];
    }

    // 返回最优解
    console.log(`[AI] Best move (${evaluations[0].x}, ${evaluations[0].y}) score: ${evaluations[0].score}, nodes: ${this.nodeCount}`);
    return evaluations[0];
  }

  /**
   * 判断是否失误（随机选择次优解）
   */
  private shouldMakeMistake(): boolean {
    return Math.random() < this.mistakeRate;
  }

  /**
   * 评估单个落子位置
   * @param board 当前棋盘
   * @param pos 放置位置（已计算重力落点）
   * @returns 评估分数
   */
  private evaluateMove(board: Board, pos: Position): number {
    // 优先检测：能否立即获胜
    const winResult = WinChecker.quickWouldWinFast(board, pos, this.aiPiece);
    if (winResult) {
      console.log(`[AI Debug]   -> 立即获胜!`);
      return EVAL_WEIGHTS.WIN;  // 最高分
    }

    // 优先检测：对手能否立即获胜（需要阻挡）
    const opponentWin = WinChecker.quickWouldWinFast(board, pos, this.opponentPiece);
    if (opponentWin) {
      console.log(`[AI Debug]   -> 阻挡对手获胜!`);
      return EVAL_WEIGHTS.BLOCK_WIN;  // 高分阻挡
    }

    // 模拟放置棋子
    const clonedBoard = board.clone();
    clonedBoard.setPiece(pos, this.aiPiece);

    // 使用 Minimax 搜索（深度 > 1 时）
    if (this.searchDepth > 1) {
      const minimaxScore = this.minimax(
        clonedBoard,
        this.searchDepth - 1,
        -Infinity,
        Infinity,
        false  // 下一层是对手回合
      );
      console.log(`[AI Debug]   -> minimax=${minimaxScore}`);
      // 注意：positionBonus 仅用于候选排序（sortCandidates），不叠加到最终分数
      // 依据：ADR-011 评估系统统一架构设计
      return minimaxScore;
    }

    // 深度为1时，直接使用静态评估
    const staticScore = this.staticEvaluate(clonedBoard, this.aiPiece);
    console.log(`[AI Debug]   -> static=${staticScore}`);
    return staticScore;
  }

  /**
   * Minimax 搜索 + Alpha-Beta 剪枝
   * @param board 棋盘状态
   * @param depth 搜索深度
   * @param alpha Alpha 值
   * @param beta Beta 值
   * @param isMaximizing 是否为最大化层（AI回合）
   * @returns 评估分数
   */
  private minimax(
    board: Board,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean
  ): number {
    this.nodeCount++;

    // 终止条件：深度为0或游戏结束
    if (depth === 0) {
      return this.staticEvaluate(board, this.aiPiece);
    }

    // 检测游戏是否结束
    const winResult = board.checkWinWithIndex();
    if (winResult) {
      if (winResult.winner === this.aiPiece) {
        return EVAL_WEIGHTS.WIN;
      } else {
        return -EVAL_WEIGHTS.WIN;
      }
    }

    // 检测平局
    if (board.isFull()) {
      return 0;
    }

    // 获取候选位置
    const candidates = board.getAvailableColumns();

    // 优化：候选位置排序（优先检测威胁位置）
    const sortedCandidates = this.sortCandidates(board, candidates, isMaximizing);

    if (isMaximizing) {
      // AI回合：最大化分数
      let maxScore = -Infinity;

      for (const { x, y } of sortedCandidates) {
        const z = board.findDropPosition(x, y);
        if (z === -1) continue;

        const pos = { x, y, z };

        // 模拟放置
        board.setPiece(pos, this.aiPiece);

        const score = this.minimax(board, depth - 1, alpha, beta, false);

        // 回溯
        board.setPiece(pos, 'EMPTY');

        maxScore = Math.max(maxScore, score);
        alpha = Math.max(alpha, score);

        // Alpha-Beta 剪枝
        if (beta <= alpha) {
          break;
        }
      }

      return maxScore;
    } else {
      // 对手回合：最小化分数
      let minScore = Infinity;

      for (const { x, y } of sortedCandidates) {
        const z = board.findDropPosition(x, y);
        if (z === -1) continue;

        const pos = { x, y, z };

        // 模拟放置
        board.setPiece(pos, this.opponentPiece);

        const score = this.minimax(board, depth - 1, alpha, beta, true);

        // 回溯
        board.setPiece(pos, 'EMPTY');

        minScore = Math.min(minScore, score);
        beta = Math.min(beta, score);

        // Alpha-Beta 剪枝
        if (beta <= alpha) {
          break;
        }
      }

      return minScore;
    }
  }

  /**
   * 候选位置排序优化
   * 优先检测威胁位置和中心位置
   */
  private sortCandidates(
    board: Board,
    candidates: { x: number; y: number }[],
    isMaximizing: boolean
  ): { x: number; y: number }[] {
    const currentPlayer = isMaximizing ? this.aiPiece : this.opponentPiece;
    const opponent = isMaximizing ? this.opponentPiece : this.aiPiece;

    // 计算每个候选的优先级分数
    const scored = candidates.map(({ x, y }) => {
      const z = board.findDropPosition(x, y);
      if (z === -1) return { x, y, priority: -Infinity };

      const pos = { x, y, z };
      let priority = 0;

      // 最高优先：自己能获胜
      const selfWin = WinChecker.quickWouldWinFast(board, pos, currentPlayer);
      if (selfWin) {
        priority += 10000;
      }

      // 高优先：阻挡对手获胜
      const opponentWin = WinChecker.quickWouldWinFast(board, pos, opponent);
      if (opponentWin) {
        priority += 5000;
      }

      // 中优先：中心位置
      priority += this.positionBonus(pos);

      return { x, y, priority };
    });

    // 按优先级排序
    scored.sort((a, b) => b.priority - a.priority);

    return scored.map(({ x, y }) => ({ x, y }));
  }

  /**
   * 静态评估函数
   * 使用 LineIndex 的威胁评估（唯一评分来源）
   * 依据：ADR-011 评估系统统一架构设计
   * @param board 棋盘状态
   * @param player 当前视角玩家（AI）
   * @returns 评估分数
   */
  private staticEvaluate(board: Board, player: Player): number {
    // 使用 LineIndex 的评估分数（唯一评分来源）
    // LineIndex 已隐式包含位置价值（中心位置涉及的4连更多）
    return board.getEvaluationScore(player, true);
  }

  /**
   * 位置加分计算
   * 中心位置获得更高分数
   * @param pos 位置
   * @returns 加分值
   */
  private positionBonus(pos: Position): number {
    const width = BOARD_CONFIG.width;
    const center = Math.floor(width / 2);

    // 距离中心越近，加分越高
    const distToCenter = Math.abs(pos.x - center) + Math.abs(pos.y - center);
    return EVAL_WEIGHTS.CENTER_POSITION * (width - distToCenter);
  }

  /**
   * 获取搜索节点计数（调试用）
   */
  getNodeCount(): number {
    return this.nodeCount;
  }

  /**
   * 获取当前难度
   */
  getDifficulty(): Difficulty {
    return this.difficulty;
  }

  /**
   * 获取当前搜索深度
   */
  getSearchDepth(): number {
    return this.searchDepth;
  }
}