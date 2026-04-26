/**
 * AIPlayer AI决策模块
 * v3.1 分层评估架构 + Layer 3 潜在叉子检测
 *
 * 难度配置：
 * - EASY: depth=2, 10%失误, 无Minimax, 无Layer3
 * - MEDIUM: depth=3, 0%失误, 启用Minimax+Layer3
 * - HARD: depth=4, 0%失误, 启用Minimax+Layer3, 叉子分数×1.5
 * 
 * v3.1 优化：
 * - Layer 3 只在顶层候选评估使用（评估放置后局面）
 * - 引入折扣机制（不可下空位越多，潜力越低）
 * - 异步时间片处理，避免 UI 阻塞
 */

import type { Player, Position, Difficulty, DifficultyConfig, LineRecord } from '@/types';
import { Board } from './Board';
import { WinChecker } from './WinChecker';
import { LineIndex } from './LineIndex';
import { EVAL_SCORES, getDifficultyConfig, getAIThinkDelay } from '@/config/aiConfig';
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
 * Layer 3 位置统计信息
 */
interface PositionStats {
  aiPotentialLines: number;
  oppPotentialLines: number;
  aiMaxCount: number;
  oppMaxCount: number;
  aiHasTwo: boolean;
  oppHasTwo: boolean;
  aiDiscount: number;
  oppDiscount: number;
}

/**
 * AI决策类
 * 实现分层评估 + 博弈树搜索 + 随机失误
 */
export class AIPlayer {
  /** 当前难度配置 */
  private config: DifficultyConfig;

  /** 当前难度名称（用于准确识别） */
  private currentDifficulty: Difficulty;

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
    this.currentDifficulty = difficulty;
    this.aiPiece = 'WHITE';  // 默认 AI 是白棋（后手）
    this.opponentPiece = 'BLACK';
    this.nodeCount = 0;

    // 初始化难度配置
    this.config = getDifficultyConfig(difficulty);
  }

  /**
   * 设置难度
   * @param difficulty 难度级别
   */
  setDifficulty(difficulty: Difficulty): void {
    this.currentDifficulty = difficulty;
    this.config = getDifficultyConfig(difficulty);
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
    const thinkDelay = getAIThinkDelay(this.getDifficulty());

    // 使用 requestIdleCallback 实现真正异步
    return new Promise((resolve) => {
      setTimeout(async () => {
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          requestIdleCallback(
            async () => {
              const result = await this.calculateBestMove(board);
              resolve(result);
            },
            { timeout: 5000 }
          );
        } else {
          setTimeout(async () => {
            const result = await this.calculateBestMove(board);
            resolve(result);
          }, 0);
        }
      }, thinkDelay);
    });
  }

  /**
   * 计算最佳落子位置（异步分片，避免阻塞 UI）
   * @param board 当前棋盘状态
   * @returns 最佳位置 (x, y)
   */
  private async calculateBestMove(board: Board): Promise<{ x: number; y: number }> {
    const startTime = performance.now();

    const candidates = board.getAvailableColumns();

    if (candidates.length === 0) {
      throw new Error('No available columns');
    }

    if (candidates.length === 1) {
      return candidates[0];
    }

    // 评估所有候选位置
    const evaluations: Evaluation[] = [];

    console.log(`[AI Debug] 棋盘状态: ${board.getPieceCount()}颗棋子`);
    console.log(`[AI Debug] AI视角: ${this.aiPiece}, 难度: ${this.getDifficulty()}, 搜索深度: ${this.config.depth}`);

    // 时间片处理：每 16ms (一帧) 让出主线程，保持 UI 流畅
    const TIME_SLICE_MS = 16;
    let lastYieldTime = performance.now();
    
    for (const { x, y } of candidates) {
      const z = board.findDropPosition(x, y);
      if (z === -1) continue;

      const pos = { x, y, z };
      const score = this.layeredEvaluate(board, pos);

      evaluations.push({ x, y, score });
      console.log(`[AI Debug] (${x},${y},${z}) => score=${score}`);
      
      // 检查是否超过时间片，需要让出主线程
      if (performance.now() - lastYieldTime > TIME_SLICE_MS) {
        await new Promise(resolve => setTimeout(resolve, 0));
        lastYieldTime = performance.now();
      }
    }

    // 排序（分数从高到低）
    evaluations.sort((a, b) => b.score - a.score);

    // 根据失误率决定是否选择次优解
    if (this.shouldMakeMistake(evaluations[0].score) && evaluations.length > 1) {
      const suboptimal = evaluations.slice(1);
      const randomIndex = Math.floor(Math.random() * Math.min(3, suboptimal.length));
      console.log(`[AI] Mistake! Choosing suboptimal #${randomIndex + 2} (score: ${suboptimal[randomIndex].score})`);
      return suboptimal[randomIndex];
    }

    const elapsed = performance.now() - startTime;
    console.log(`[AI] Best move (${evaluations[0].x}, ${evaluations[0].y}) score: ${evaluations[0].score}, nodes: ${this.nodeCount}`);
    console.log(`[AI Performance] calculateBestMove took ${elapsed.toFixed(2)}ms`);
    return evaluations[0];
  }

  /**
   * 分层评估函数（核心）
   * 根据难度配置决定启用哪些评估层
   * @param board 棋盘状态
   * @param pos 放置位置
   * @returns 评估分数
   */
  private layeredEvaluate(board: Board, pos: Position): number {
    // ==================== Layer 0 ====================
    // 立即胜负检测（所有难度启用）

    // 己方立即获胜
    if (this.config.layers.enableImmediateWin) {
      const selfWin = WinChecker.quickWouldWinFast(board, pos, this.aiPiece);
      if (selfWin) {
        console.log(`[AI Debug]   -> Layer0: 立即获胜!`);
        return EVAL_SCORES.WIN;
      }

      // 对方立即获胜（需阻挡）
      const opponentWin = WinChecker.quickWouldWinFast(board, pos, this.opponentPiece);
      if (opponentWin) {
        console.log(`[AI Debug]   -> Layer0: 阻挡对手获胜!`);
        return EVAL_SCORES.BLOCK_WIN;
      }
    }

    // ==================== Layer 1 ====================
    // 基础3连威胁检测
    let layer1Score = 0;

    if (this.config.layers.enableBasicThreat) {
      layer1Score = this.evaluateLayer1(board, pos);
      console.log(`[AI Debug]   -> Layer1 score: ${layer1Score}`);

      // 如果 Layer 1 有显著分数（威胁），直接返回
      // 避免被后续层覆盖或稀释
      if (Math.abs(layer1Score) >= EVAL_SCORES.THREE_BLOCK) {
        // 有3连威胁，先看是否需要进入Layer 2处理双威胁
        if (!this.config.layers.enableAdvancedThreat) {
          return layer1Score;
        }
      }
    }

    // ==================== Layer 2 ====================
    // 进阶威胁检测（双威胁+2连）
    let layer2Score = 0;

    if (this.config.layers.enableAdvancedThreat) {
      layer2Score = this.evaluateLayer2(board, pos);
      console.log(`[AI Debug]   -> Layer2 score: ${layer2Score}`);

      // 双威胁分数极高，直接返回
      if (Math.abs(layer2Score) >= EVAL_SCORES.DOUBLE_THREAT_BLOCK) {
        return layer1Score + layer2Score;
      }
    }

    // ==================== Layer 3 ====================
    // 潜在叉子检测（顶层候选评估，评估放置后的局面）
    let layer3Score = 0;
    
    if (this.config.layers.enablePotentialFork) {
      // 模拟放置后评估叉子局势
      const clonedBoard = board.clone();
      clonedBoard.setPiece(pos, this.aiPiece);
      layer3Score = this.evaluateLayer3_PotentialFork(clonedBoard);

      // Minimax深度≥3时Layer3降权：避免双倍计分
      // depth=4下Minimax内部的evaluateInternalNode提供更准确的fork信号
      if (this.config.layers.enableMinimaxSearch && this.config.depth >= 3) {
        layer3Score = Math.round(layer3Score * 0.05);
      }

      console.log(`[AI Debug]   -> Layer3 fork score: ${layer3Score}`);
    }

    // ==================== Layer 4 ====================
    // Minimax深度搜索（MEDIUM/HARD启用）
    if (this.config.layers.enableMinimaxSearch && this.config.depth > 1) {
      const clonedBoard = board.clone();
      clonedBoard.setPiece(pos, this.aiPiece);

      const minimaxScore = this.minimax(
        clonedBoard,
        this.config.depth - 1,
        -Infinity,
        Infinity,
        false
      );
      // Minimax + Layer 1/2/3 分数
      const totalScore = minimaxScore + layer1Score + layer2Score + layer3Score;
      console.log(`[AI Debug]   -> Layer4 minimax: ${minimaxScore}, total: ${totalScore} (L1=${layer1Score}, L2=${layer2Score}, L3=${layer3Score})`);
      return totalScore;
    }

    // 深度为1或无Minimax时，返回静态评估
    const staticScore = this.staticEvaluate(board, pos);
    const totalScore = layer1Score + layer2Score + layer3Score + staticScore;
    console.log(`[AI Debug]   -> Static total: ${totalScore} (L1=${layer1Score}, L2=${layer2Score}, L3=${layer3Score}, base=${staticScore})`);
    return totalScore;
  }

  /**
   * Layer 1: 基础3连威胁评估
   * 所有难度都完整检测（不再简化）
   * @param board 棋盘状态
   * @param pos 放置位置
   * @returns Layer 1 分数
   */
  private evaluateLayer1(board: Board, pos: Position): number {
    const lineIds = board.getLineIdsAtPosition(pos);
    let score = 0;

    for (const lineId of lineIds) {
      const line = board.getLineRecord(lineId);
      if (!line) continue;

      const aiCount = this.aiPiece === 'BLACK' ? line.blackCount : line.whiteCount;
      const oppCount = this.aiPiece === 'BLACK' ? line.whiteCount : line.blackCount;

      // ===== 己方3连威胁 =====
      if (oppCount === 0 && aiCount === 3 && line.openEnds > 0) {
        score += EVAL_SCORES.THREE_OWN;  // 150
      }

      // ===== 对方3连威胁（需阻挡） =====
      if (aiCount === 0 && oppCount === 3 && line.openEnds > 0) {
        score += EVAL_SCORES.THREE_BLOCK;  // 300（防守优先）
      }
    }

    return score;
  }

  /**
   * Layer 2: 进阶威胁评估（双威胁+2连）
   * 所有难度启用
   *
   * 关键改进：两条2连 = 潜在双威胁（高分）
   * - 单条2连 = 20分（低分，对手一步可堵）
   * - 两条2连 = 300分（下一颗棋子必成双3连）
   *
   * BUG修复：评估"放置后"的威胁线状态，而非"放置前"
   *
   * @param board 棋盘状态
   * @param pos 放置位置
   * @returns Layer 2 分数
   */
  private evaluateLayer2(board: Board, pos: Position): number {
    const lineIds = board.getLineIdsAtPosition(pos);

    // 统计该位置涉及的威胁线数量（放置后的状态）
    let aiThreeLines = 0;
    let oppThreeLines = 0;
    let aiTwoLines = 0;
    let oppTwoLines = 0;

    // 方向去重：同一物理直线上的重叠4连段只计1次
    const countedAiDirs = new Set<string>();
    const countedOppDirs = new Set<string>();

    for (const lineId of lineIds) {
      const line = board.getLineRecord(lineId);
      if (!line) continue;

      const aiCount = this.aiPiece === 'BLACK' ? line.blackCount : line.whiteCount;
      const oppCount = this.aiPiece === 'BLACK' ? line.whiteCount : line.blackCount;

      // 方向 key
      const dirKey = `${line.direction.x},${line.direction.y},${line.direction.z}`;

      // 关键修复：计算"放置后"的count
      // 如果当前线无对方棋子，放置这颗棋子后count会增加1
      const aiCountAfter = (oppCount === 0) ? aiCount + 1 : aiCount;

      // 3连威胁线统计（放置后count=3）
      if (aiCountAfter === 3 && oppCount === 0 && line.openEnds > 0) {
        if (!countedAiDirs.has(dirKey)) {
          countedAiDirs.add(dirKey);
          aiThreeLines++;
        }
      }
      if (oppCount === 3 && aiCount === 0 && line.openEnds > 0) {
        if (!countedOppDirs.has(dirKey)) {
          countedOppDirs.add(dirKey);
          oppThreeLines++;
        }
      }

      // 2连威胁线统计（放置后count=2）
      if (aiCountAfter === 2 && oppCount === 0 && line.openEnds > 0) {
        if (!countedAiDirs.has(dirKey)) {
          countedAiDirs.add(dirKey);
          aiTwoLines++;
        }
      }
      if (oppCount === 2 && aiCount === 0 && line.openEnds > 0) {
        if (!countedOppDirs.has(dirKey)) {
          countedOppDirs.add(dirKey);
          oppTwoLines++;
        }
      }
    }

    // ===== 双威胁评分 =====
    let score = 0;

    // 己方双3连威胁 → 必胜机会
    if (aiThreeLines >= 2) {
      score += EVAL_SCORES.DOUBLE_THREAT_OWN;  // 500
    }

    // 对方双3连威胁 → 必须阻挡
    if (oppThreeLines >= 2) {
      score += EVAL_SCORES.DOUBLE_THREAT_BLOCK;  // 1000
    }

    // ===== 两条2连 = 潜在双威胁（v2.1关键改进）=====
    // 两条2连 ≠ 两个独立2连
    // 两条2连意味着：下一颗棋子就能形成真正的双3连威胁
    // 因此给予接近双3连威胁的高分

    if (aiTwoLines >= 2) {
      score += EVAL_SCORES.POTENTIAL_DOUBLE_OWN;   // 300（高分）
      console.log(`[AI Debug]     -> 两条2连威胁检测！aiTwoLines=${aiTwoLines}`);
    } else if (aiTwoLines === 1) {
      score += EVAL_SCORES.TWO_OWN;                 // 20（单条2连低分）
    }

    if (oppTwoLines >= 2) {
      score += EVAL_SCORES.POTENTIAL_DOUBLE_BLOCK; // 600（防守优先！）
    } else if (oppTwoLines === 1) {
      score += EVAL_SCORES.TWO_BLOCK;               // 40（单条2连）
    }

    return score;
  }

  /**
   * 静态评估（无威胁时的基础评分）
   * @param board 棋盘状态（放置后）
   * @param pos 放置位置
   * @returns 基础分数
   */
  private staticEvaluate(board: Board, pos: Position): number {
    // 使用 LineIndex 的评估分数作为基础
    const lineScore = board.getEvaluationScore(this.aiPiece, false);

    // 加上位置加分（中心位置略优）
    const positionBonus = this.positionBonus(pos);

    return lineScore + positionBonus;
  }

  /**
   * Layer 3: 潜在叉子检测
   * v3.1 优化：识别多条有潜力的线交汇于同一点的模式
   * 
   * 性能优化：
   * - 增量更新：只扫描有棋子的线，而非全局扫描
   * - 折扣机制：不可直接下的空位越多，潜力越低
   * - 取最大值：避免累加导致分数过高
   * 
   * @param board 棋盘状态
   * @returns 潜在叉子评分
   */
  private evaluateLayer3_PotentialFork(board: Board): number {
    // 增量更新 - 只扫描有棋子的线
    const allLines = board.getAllLineRecords();
    const relevantLines = allLines.filter(line => 
      line.blackCount > 0 || line.whiteCount > 0
    );
    
    // 位置 → 潜力统计
    const positionStats = new Map<string, PositionStats>();

    // 遍历受影响的4连线（方案3：增量更新）
    for (const line of relevantLines) {
      const aiCount = this.aiPiece === 'BLACK' ? line.blackCount : line.whiteCount;
      const oppCount = this.aiPiece === 'BLACK' ? line.whiteCount : line.blackCount;

      // 己方有潜力的线
      if (oppCount === 0 && aiCount >= 1 && line.openEnds > 0) {
        if (this.isConsecutive(board, line, this.aiPiece)) {
          const discount = this.calculateLineDiscount(board, line);
          this.updatePositionStats(positionStats, line.positions, 'ai', aiCount, board, discount);
        }
      }

      // 对方有潜力的线
      if (aiCount === 0 && oppCount >= 1 && line.openEnds > 0) {
        if (this.isConsecutive(board, line, this.opponentPiece)) {
          const discount = this.calculateLineDiscount(board, line);
          this.updatePositionStats(positionStats, line.positions, 'opp', oppCount, board, discount);
        }
      }
    }

    // 计算叉子分数（取最强叉子，应用折扣）
    let maxOppForkScore = 0;
    let maxAiForkScore = 0;
    const multiplier = this.config.forkScoreMultiplier || 1.0;

    for (const stats of positionStats.values()) {
      // 对方潜在叉子（防守优先）- 取最大值，应用折扣
      if (stats.oppPotentialLines >= 2) {
        let forkScore = EVAL_SCORES.FORK_BASE;
        forkScore += EVAL_SCORES.FORK_PER_LINE * (stats.oppPotentialLines - 2);
        if (stats.oppHasTwo) {
          forkScore += EVAL_SCORES.FORK_WITH_TWO;
        }
        // 应用折扣：线上不可下的空位越多，分数越低
        const discountedScore = forkScore * EVAL_SCORES.FORK_DEFENSE_MULTIPLIER * multiplier * stats.oppDiscount;
        maxOppForkScore = Math.max(maxOppForkScore, discountedScore);
      }

      // 己方潜在叉子 - 取最大值，应用折扣
      if (stats.aiPotentialLines >= 2) {
        let forkScore = EVAL_SCORES.FORK_BASE;
        forkScore += EVAL_SCORES.FORK_PER_LINE * (stats.aiPotentialLines - 2);
        if (stats.aiHasTwo) {
          forkScore += EVAL_SCORES.FORK_WITH_TWO;
        }
        const discountedScore = forkScore * multiplier * stats.aiDiscount;
        maxAiForkScore = Math.max(maxAiForkScore, discountedScore);
      }
    }

    const score = maxAiForkScore - maxOppForkScore;
    return score;
  }

  /**
   * 检查线上的棋子是否连续（无间隔）
   * 
   * 例如：[黑,空,黑,空] 不连续（中间有空隙）
   *      [黑,黑,空,空] 连续
   * 
   * @param board 棋盘状态
   * @param line 4连记录
   * @param player 玩家类型
   * @returns 是否连续
   */
  private isConsecutive(board: Board, line: LineRecord, player: Player): boolean {
    let state: 'before' | 'in' | 'after' = 'before';
    
    for (const pos of line.positions) {
      const piece = board.getPiece(pos);
      
      if (piece === player) {
        if (state === 'after') return false;  // 中间有空隙后又遇到棋子
        state = 'in';
      } else if (piece === 'EMPTY') {
        if (state === 'in') state = 'after';
      } else {
        // 对方棋子 - 不应该出现（因为已经过滤了oppCount=0）
        return false;
      }
    }
    
    return true;
  }

  /**
   * 计算线的潜力折扣
   * 空位不可直接下的越多，折扣越大
   * 
   * @param board 棋盘状态
   * @param line 4连记录
   * @returns 折扣系数 (0~1)，1=无折扣，0.5=折半，0.25=再折半
   */
  private calculateLineDiscount(board: Board, line: LineRecord): number {
    let unplayableCount = 0;
    
    for (const pos of line.positions) {
      const piece = board.getPiece(pos);
      if (piece !== 'EMPTY') continue;  // 已有棋子，不算
      
      // 检查是否可直接下：z=0 或 下方有棋子
      if (pos.z > 0) {
        const belowPiece = board.getPiece({ x: pos.x, y: pos.y, z: pos.z - 1 });
        if (belowPiece === 'EMPTY') {
          unplayableCount++;  // 不可直接下
        }
      }
    }
    
    // 每个不可下的空位折半
    return Math.pow(0.5, unplayableCount);
  }

  /**
   * 更新位置统计信息
   * 
   * @param stats 统计Map
   * @param positions 位置数组
   * @param side 哪一方（'ai' 或 'opp'）
   * @param count 棋子数量
   * @param board 棋盘状态
   * @param discount 折扣系数
   */
  private updatePositionStats(
    stats: Map<string, any>,
    positions: Position[],
    side: 'ai' | 'opp',
    count: number,
    board: Board,
    discount: number
  ): void {
    for (const pos of positions) {
      // 只统计可直接下的空位
      const piece = board.getPiece(pos);
      if (piece !== 'EMPTY') continue;
      
      if (pos.z > 0) {
        const belowPiece = board.getPiece({ x: pos.x, y: pos.y, z: pos.z - 1 });
        if (belowPiece === 'EMPTY') continue;
      }
      
      const key = `${pos.x},${pos.y},${pos.z}`;
      if (!stats.has(key)) {
        stats.set(key, {
          aiPotentialLines: 0,
          oppPotentialLines: 0,
          aiMaxCount: 0,
          oppMaxCount: 0,
          aiHasTwo: false,
          oppHasTwo: false,
          aiDiscount: 1,
          oppDiscount: 1,
        });
      }
      const data = stats.get(key)!;
      
      if (side === 'ai') {
        data.aiPotentialLines++;
        data.aiMaxCount = Math.max(data.aiMaxCount, count);
        if (count >= 2) data.aiHasTwo = true;
        data.aiDiscount = Math.min(data.aiDiscount, discount);  // 取最小折扣
      } else {
        data.oppPotentialLines++;
        data.oppMaxCount = Math.max(data.oppMaxCount, count);
        if (count >= 2) data.oppHasTwo = true;
        data.oppDiscount = Math.min(data.oppDiscount, discount);
      }
    }
  }

  /**
   * Minimax 内部节点评估
   * 在AI落子后、递归前，检测双威胁（双2连、双3连）
   *
   * Route C: 扩展点递进评分（替代收敛二值判断）
   * - 只计数连续2子块且有可用扩展点的2连线
   * - 0条→0, 1条→20, 2条→80, 3条→300
   * - 消除不连续棋子造成的假阳性
   *
   * @param board 当前棋盘状态（AI刚落子）
   * @returns 内部加分
   */
  private evaluateInternalNode(board: Board): number {
    const allLines = board.getAllLineRecords();
    const boardSize = board.getSize();

    // 物理线去重
    const seenAiKeys = new Set<string>();
    const seenOppKeys = new Set<string>();
    let aiThreeLines = 0;
    let oppThreeLines = 0;

    // 有扩展点的连续2连线计数（不连续的线自动被findExtensionCells排除）
    let aiLinesWithExt = 0;
    let oppLinesWithExt = 0;

    for (const line of allLines) {
      if (line.blackCount === 0 && line.whiteCount === 0) continue;

      const aiCount = this.aiPiece === 'BLACK' ? line.blackCount : line.whiteCount;
      const oppCount = this.aiPiece === 'BLACK' ? line.whiteCount : line.blackCount;
      const physKey = LineIndex.getPhysicalLineKey(line, boardSize.width, boardSize.height);

      // 己方威胁（物理线去重）
      // 注意：
      // - 不检查 openEnds > 0：openEnds 只反映 segment 两端，可能遗漏中段扩展点
      // - 不检查 oppCount === 0：对手棋子可能在 segment 端点，不影响 2 连块连续性
      // - findExtensionCells 是最准确的验证器：验证连续性 + 扩展点可下性
      if (aiCount >= 2) {
        if (!seenAiKeys.has(physKey)) {
          seenAiKeys.add(physKey);
          if (aiCount >= 3) {
            aiThreeLines++;
          } else if (aiCount === 2) {
            // 只计有扩展点的2连（findExtensionCells自动验证连续性+可下性）
            const cells = this.findExtensionCells(line, board, this.aiPiece, boardSize);
            if (cells.length > 0) aiLinesWithExt++;
          }
        }
      }

      // 对方威胁（物理线去重）
      if (oppCount >= 2) {
        if (!seenOppKeys.has(physKey)) {
          seenOppKeys.add(physKey);
          if (oppCount >= 3) {
            oppThreeLines++;
          } else if (oppCount === 2) {
            const cells = this.findExtensionCells(line, board, this.opponentPiece, boardSize);
            if (cells.length > 0) oppLinesWithExt++;
          }
        }
      }
    }

    // ===== 扩展点递进评分 =====
    let score = 0;

    // 双3连威胁（直接致命，无需扩展点检查）
    if (aiThreeLines >= 2) score += EVAL_SCORES.DOUBLE_THREAT_OWN;
    if (oppThreeLines >= 2) score -= EVAL_SCORES.DOUBLE_THREAT_BLOCK;

    // 己方2连：递进加分
    // 注意：2条和3条以上给相同加分（80），因为 depth=4 下多条威胁线可能有重叠，
    // 过高的加分会导致搜索树中连接性好的位置获得不成比例的优势。
    if (aiLinesWithExt >= 2) {
      score += EVAL_SCORES.TWO_OWN * 4;                  // 2+条 → 80（独立威胁）
    } else if (aiLinesWithExt === 1) {
      score += EVAL_SCORES.TWO_OWN;                      // 1条 → 20
    }

    // 对方2连：递进扣分
    if (oppLinesWithExt >= 2) {
      score -= EVAL_SCORES.TWO_BLOCK * 2;               // 2+条 → -80
    } else if (oppLinesWithExt === 1) {
      score -= EVAL_SCORES.TWO_BLOCK;                   // 1条 → -40
    }

    if (score !== 0) {
      console.log(`[AI Debug]     internalNode: ai=${aiLinesWithExt} ai3=${aiThreeLines} opp=${oppLinesWithExt} opp3=${oppThreeLines} bonus=${score > 0 ? '+' : ''}${score}`);
    }
    return score;
  }

  /**
   * 找出4连段中连续2子块的扩展点
   * 扩展点 = 沿直线方向，紧邻连续2块且可下的空位
   *
   * 示例：
   *   4连段 [(0,4),(1,3),(2,2),(3,1)]，方向(1,-1,0)
   *   Black在索引2,3 → 连续2块
   *   后方扩展: (2,2)-(1,-1,0) = (1,3,0)
   *   前方扩展: (3,1)+(1,-1,0) = (4,0,0)
   *
   * @param line 4连段记录
   * @param board 棋盘状态
   * @param player 玩家
   * @param boardSize 棋盘尺寸
   * @returns 可下的扩展点列表
   */
  private findExtensionCells(
    line: LineRecord,
    board: Board,
    player: Player,
    boardSize: { width: number; height: number }
  ): Position[] {
    const positions = line.positions;
    const dir = line.direction;

    // 找连续2子块的起始索引
    let blockStart = -1;
    let blockLen = 0;

    for (let i = 0; i < positions.length; i++) {
      const piece = board.getPiece(positions[i]);
      if (piece === player) {
        if (blockStart === -1) blockStart = i;
        blockLen++;
      } else if (blockStart >= 0) {
        break; // 连续块结束
      }
    }

    if (blockLen !== 2) return [];

    const extCells: Position[] = [];

    // 后方扩展
    const backward: Position = {
      x: positions[blockStart].x - dir.x,
      y: positions[blockStart].y - dir.y,
      z: positions[blockStart].z - dir.z,
    };
    if (this.isPlayableAt(backward, board, boardSize)) {
      extCells.push(backward);
    }

    // 前方扩展
    const forward: Position = {
      x: positions[blockStart + 1].x + dir.x,
      y: positions[blockStart + 1].y + dir.y,
      z: positions[blockStart + 1].z + dir.z,
    };
    if (this.isPlayableAt(forward, board, boardSize)) {
      extCells.push(forward);
    }

    return extCells;
  }

  /**
   * 检查位置是否可落子
   * 三个条件：
   *   1. 坐标在棋盘范围内
   *   2. 位置为空
   *   3. 满足重力规则（z=0 或 下方有子）
   *
   * @param pos 待检查位置
   * @param board 棋盘状态
   * @param boardSize 棋盘尺寸
   * @returns 是否可下
   */
  private isPlayableAt(
    pos: Position,
    board: Board,
    boardSize: { width: number; height: number }
  ): boolean {
    if (pos.x < 0 || pos.x >= boardSize.width ||
        pos.y < 0 || pos.y >= boardSize.width ||
        pos.z < 0 || pos.z >= boardSize.height) {
      return false;
    }

    if (board.getPiece(pos) !== 'EMPTY') return false;

    // 重力检查：z>0时下方必须有子
    if (pos.z > 0) {
      const below = board.getPiece({ x: pos.x, y: pos.y, z: pos.z - 1 });
      if (below === 'EMPTY') return false;
    }

    return true;
  }

  /**
   * Minimax 搜索 + Alpha-Beta 剪枝
   * 仅HARD启用，depth=4
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
      // 基础全局评估（Layer 3 只在顶层候选评估使用，不在叶节点）
      return board.getEvaluationScore(this.aiPiece);
    }

    // 检测游戏是否结束
    const winResult = board.checkWinWithIndex();
    if (winResult) {
      if (winResult.winner === this.aiPiece) {
        return EVAL_SCORES.WIN;
      } else {
        return -EVAL_SCORES.WIN;
      }
    }

    // 检测平局
    if (board.isFull()) {
      return 0;
    }

    // 获取候选位置
    const candidates = board.getAvailableColumns();

    // 候选排序优化（优先探索高分位置）
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

        // 内部节点评估：AI落子后检测双威胁
        // 给搜索树提供持续、可靠的 fork 信号
        let internalBonus = 0;
        if (depth > 0) {
          internalBonus = this.evaluateInternalNode(board);
        }
        const score = internalBonus + this.minimax(board, depth - 1, alpha, beta, false);

        // 回溯
        board.setPiece(pos, 'EMPTY');

        maxScore = Math.max(maxScore, score);
        alpha = Math.max(alpha, score);

        // Alpha-Beta剪枝
        if (beta <= alpha) break;
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

        // Alpha-Beta剪枝
        if (beta <= alpha) break;
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

    scored.sort((a, b) => b.priority - a.priority);

    return scored.map(({ x, y }) => ({ x, y }));
  }

  /**
   * 位置加分计算
   * 中心位置获得更高分数
   */
  private positionBonus(pos: Position): number {
    const width = BOARD_CONFIG.width;
    const center = Math.floor(width / 2);
    const distToCenter = Math.abs(pos.x - center) + Math.abs(pos.y - center);
    return EVAL_SCORES.CENTER_BONUS * (width - distToCenter);
  }

  /**
   * 判断是否失误（随机选择次优解）
   * MEDIUM/HARD：关键时刻（WIN/BLOCK_WIN）不失误
   * EASY：可能关键时刻失误
   */
  private shouldMakeMistake(bestScore: number): boolean {
    // 关键时刻不失误（WIN/BLOCK_WIN）
    if (this.config.criticalNoMistake && bestScore >= EVAL_SCORES.BLOCK_WIN) {
      return false;
    }
    return Math.random() < this.config.mistakeRate;
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
    return this.currentDifficulty;
  }

  /**
   * 获取当前搜索深度
   */
  getSearchDepth(): number {
    return this.config.depth;
  }

  /**
   * 获取当前配置（调试用）
   */
  getConfig(): DifficultyConfig {
    return this.config;
  }
}