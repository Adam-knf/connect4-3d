/**
 * AIPlayerV2 — AI 决策门面
 * 基于 ai-evaluation-v2.md §5.5
 *
 * 接口兼容旧 AIPlayer，确保 GameController 无缝切换。
 *
 * EASY:   depth=0, 纯评估 + 25% 失误
 * MEDIUM: depth=3, Minimax α-β + 10% 失误
 * HARD:   depth=4-6, 迭代加深 + 安静搜索 + 0% 失误
 */

import type { Player, Position, Difficulty } from '@/types';
import type { Board } from '@/core/Board';
import { ThreatEvaluator, type ThreatReport } from './ThreatEvaluator';
import { SearchEngine } from './SearchEngine';
import {
  DIFFICULTY_CONFIGS,
  positionBonus,
  type DifficultyConfigV2,
} from './scores';

// 兼容旧 AI_THINK_DELAYS
const AI_THINK_DELAYS: Record<string, number> = {
  EASY: 500,
  MEDIUM: 1000,
  HARD: 2000,
};

export class AIPlayerV2 {
  private config: DifficultyConfigV2;
  private currentDifficulty: Difficulty;
  private aiPiece: Player = 'WHITE';
  private nodeCount = 0;
  private evaluator: typeof ThreatEvaluator;
  private searchEngine: SearchEngine | null = null;

  constructor(difficulty: Difficulty = 'MEDIUM') {
    this.currentDifficulty = difficulty;
    this.config = DIFFICULTY_CONFIGS[difficulty];
    this.evaluator = ThreatEvaluator;
    if (this.config.search) {
      this.searchEngine = new SearchEngine(this.config.search, ThreatEvaluator);
    }
  }

  // ==================== 公开接口（兼容旧 AIPlayer） ====================

  setDifficulty(difficulty: Difficulty): void {
    this.currentDifficulty = difficulty;
    this.config = DIFFICULTY_CONFIGS[difficulty];
    if (this.config.search) {
      this.searchEngine = new SearchEngine(this.config.search, ThreatEvaluator);
    } else {
      this.searchEngine = null;
    }
  }

  setPiece(piece: Player): void {
    this.aiPiece = piece;
  }

  getDifficulty(): Difficulty {
    return this.currentDifficulty;
  }

  getNodeCount(): number {
    return this.nodeCount;
  }

  getSearchDepth(): number {
    return this.config.searchDepth;
  }

  getPiece(): Player {
    return this.aiPiece;
  }

  /**
   * 同步决策（PonderingEngine 调用，不经过异步延迟，不失误）
   * @param board 棋盘
   * @param aiPiece AI棋子
   * @param baseline 可选：预计算的基线评估
   * @param allowMistakes 可选：是否允许失误（默认 false，供 PonderingEngine 使用）
   */
  calculateBestMoveSync(
    board: Board,
    aiPiece?: Player,
    baseline?: ThreatReport,
    allowMistakes = false,
  ): { x: number; y: number; score: number } {
    if (aiPiece) this.aiPiece = aiPiece;

    const baseReport = baseline ?? this.evaluator.evaluate(board, this.aiPiece);
    const candidates = board.getAvailableColumns();

    if (candidates.length === 0) return { x: 2, y: 2, score: 0 };
    if (candidates.length === 1) return { x: candidates[0].x, y: candidates[0].y, score: 0 };

    if (this.config.searchDepth === 0) {
      const scored = this.evaluateAllCandidates(board, candidates, baseReport);

      // 失误逻辑（仅测试用）
      if (allowMistakes && this.shouldMakeMistake(scored[0].score)) {
        const pool = scored.slice(1, Math.min(4, scored.length));
        if (pool.length > 0) {
          const pick = pool[Math.floor(Math.random() * pool.length)];
          return { x: pick.x, y: pick.y, score: pick.score };
        }
      }
      return { x: scored[0].x, y: scored[0].y, score: scored[0].score };
    }

    if (this.searchEngine) {
      const result = this.searchEngine.searchSync(board, this.aiPiece, baseReport);
      this.nodeCount += result.nodesSearched;

      if (allowMistakes && this.shouldMakeMistake(result.bestScore)) {
        const others = candidates.filter(
          (c) => c.x !== result.bestPos.x || c.y !== result.bestPos.y,
        );
        if (others.length > 0) {
          const pick = others[Math.floor(Math.random() * Math.min(3, others.length))];
          return { x: pick.x, y: pick.y, score: 0 };
        }
      }
      return { x: result.bestPos.x, y: result.bestPos.y, score: result.bestScore };
    }

    const scored = this.evaluateAllCandidates(board, candidates, baseReport);
    return { x: scored[0].x, y: scored[0].y, score: scored[0].score };
  }

  /**
   * 异步决策（主入口，接口与旧 AIPlayer.decide 完全兼容）
   */
  async decide(board: Board): Promise<{ x: number; y: number }> {
    this.nodeCount = 0;

    // 最小思考时间（UX 需要，避免AI瞬间响应）
    const thinkDelay = AI_THINK_DELAYS[this.currentDifficulty] ?? 500;
    if (thinkDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, thinkDelay));
    }

    // 异步搜索（内部带时间片让出，不阻塞UI）
    return await this.calculateBestMove(board);
  }

  // ==================== 核心计算 ====================

  private async calculateBestMove(board: Board): Promise<{ x: number; y: number }> {
    const candidates = board.getAvailableColumns();

    if (candidates.length === 0) {
      // 无可用列 — 返回中心
      return { x: 2, y: 2 };
    }
    if (candidates.length === 1) {
      return candidates[0];
    }

    // 先做一次全盘基线评估
    const baseline = this.evaluator.evaluate(board, this.aiPiece);

    if (this.config.searchDepth === 0) {
      // === EASY: 纯评估 ===
      return this.calculateByEvaluation(board, candidates, baseline);
    }

    // === MEDIUM/HARD: Minimax 搜索（异步，带时间片让出）===
    if (this.searchEngine) {
      const result = await this.searchEngine.search(board, this.aiPiece, baseline);
      this.nodeCount = result.nodesSearched;
      const bestPos = { x: result.bestPos.x, y: result.bestPos.y };

      // 失误判断
      if (this.shouldMakeMistake(result.bestScore)) {
        return this.pickSuboptimal(candidates, bestPos);
      }
      return bestPos;
    }

    // Fallback to evaluation
    return this.calculateByEvaluation(board, candidates, baseline);
  }

  /**
   * 纯评估模式 (EASY) — 含失误逻辑
   */
  private calculateByEvaluation(
    board: Board,
    candidates: { x: number; y: number }[],
    baseline: ThreatReport,
  ): { x: number; y: number } {
    const scored = this.evaluateAllCandidates(board, candidates, baseline);

    // 关键时刻不失误
    if (this.config.criticalNoMistake && scored.length > 1) {
      const hasCriticalThreat = baseline.oppPatterns.some(
        (p) => p.score >= 50000,
      );
      if (hasCriticalThreat) {
        return { x: scored[0].x, y: scored[0].y };
      }
    }

    // 失误逻辑: 从第2-4名随机选
    if (this.shouldMakeMistake(scored[0].score) && scored.length >= 2) {
      const pool = scored.slice(1, Math.min(4, scored.length));
      return pool[Math.floor(Math.random() * pool.length)];
    }

    return { x: scored[0].x, y: scored[0].y };
  }

  /**
   * 评估所有候选列（共享逻辑：供 EASY 和 PonderingEngine 使用）
   */
  private evaluateAllCandidates(
    board: Board,
    candidates: { x: number; y: number }[],
    baseline: ThreatReport,
  ): { x: number; y: number; score: number }[] {
    const scored: { x: number; y: number; score: number; pos: Position }[] = [];

    for (const col of candidates) {
      const z = board.findDropPosition(col.x, col.y);
      if (z === -1) continue;
      const pos: Position = { x: col.x, y: col.y, z };

      board.setPiece(pos, this.aiPiece);
      const report = this.evaluator.evaluateIncremental(
        baseline, board, pos, this.aiPiece,
      );
      board.setPiece(pos, 'EMPTY'); // undo

      const below = pos.z > 0 ? board.getPiece({ x: pos.x, y: pos.y, z: pos.z - 1 }) : 'EMPTY';
      const score = report.finalScore + positionBonus(pos.x, pos.y, pos.z, below, this.aiPiece);
      scored.push({ x: col.x, y: col.y, score, pos });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  // ==================== 失误逻辑 ====================

  private shouldMakeMistake(_bestScore: number): boolean {
    return Math.random() < this.config.mistakeRate;
  }

  private pickSuboptimal(
    candidates: { x: number; y: number }[],
    best: { x: number; y: number },
  ): { x: number; y: number } {
    const others = candidates.filter((c) => c.x !== best.x || c.y !== best.y);
    if (others.length === 0) return best;
    const pool = others.slice(0, Math.min(3, others.length));
    return pool[Math.floor(Math.random() * pool.length)];
  }
}
