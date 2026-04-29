/**
 * 搜索引擎 — Minimax + Alpha-Beta + 迭代加深 + 安静搜索
 * 基于 ai-evaluation-v2.md §5.4, §8
 */

import type { Player, Position } from '@/types';
import type { Board } from '@/core/Board';
import { WinChecker } from '@/core/WinChecker';
import type { ThreatEvaluator, ThreatReport } from './ThreatEvaluator';
import { positionBonus, opponentOf } from './scores';
import type { SearchConfig } from './scores';

// ==================== SearchResult ====================

export interface SearchResult {
  bestPos: Position;
  bestScore: number;
  depthReached: number;
  nodesSearched: number;
  timeMs: number;
}

// 调试日志级别: 0=关闭, 1=根节点候选, 2=包含BLACK深度2
const SEARCH_TRACE = 1;

const WIN_SCORE = 1_000_000;

// ==================== SearchEngine ====================

export class SearchEngine {
  private config: SearchConfig;
  private evaluator: typeof ThreatEvaluator;
  private nodesSearched = 0;
  private startTime = 0;
  // 启发式缓存
  private historyTable = new Map<string, number>();
  private killerMoves: (Position | null)[] = [];
  // 时间片控制（避免阻塞UI线程）
  private lastYieldTime = 0;
  private static YIELD_INTERVAL_MS = 12; // 每12ms让出主线程一次

  constructor(config: SearchConfig, evaluator: typeof ThreatEvaluator) {
    this.config = config;
    this.evaluator = evaluator;
    this.killerMoves = new Array(config.maxDepth + 1).fill(null);
  }

  /**
   * 让出主线程（仅在距上次让出超过阈值时真正让出）
   */
  private async yieldToBrowser(): Promise<void> {
    const now = performance.now();
    if (now - this.lastYieldTime > SearchEngine.YIELD_INTERVAL_MS) {
      this.lastYieldTime = now;
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }

  /**
   * 搜索最优走法（异步版，带时间片让出）
   */
  async search(board: Board, aiPiece: Player, baseline?: ThreatReport): Promise<SearchResult> {
    this.nodesSearched = 0;
    this.startTime = Date.now();
    this.lastYieldTime = performance.now();

    // 基线评估（如果调用方未提供）
    const baseReport = baseline ?? this.evaluator.evaluate(board, aiPiece);

    const candidates = this.getSortedCandidates(board, aiPiece, baseReport);
    if (candidates.length === 0) {
      // fallback
      return {
        bestPos: { x: 2, y: 2, z: 0 },
        bestScore: 0,
        depthReached: 0,
        nodesSearched: 0,
        timeMs: 0,
      };
    }

    // 立即获胜速查：只读检测，不修改棋盘，避免 undo 问题
    for (const pos of candidates) {
      const z = board.findDropPosition(pos.x, pos.y);
      if (z === -1) continue;
      if (board.quickWouldWinAt({ x: pos.x, y: pos.y, z }, aiPiece)) {
        if (SEARCH_TRACE >= 1) {
          console.log(`[AI-TRACE] ⚡ INSTANT-WIN at (${pos.x},${pos.y},${z}) — skip search`);
        }
        return {
          bestPos: { x: pos.x, y: pos.y, z },
          bestScore: WIN_SCORE,
          depthReached: 0,
          nodesSearched: 0,
          timeMs: 0,
        };
      }
    }

    let bestResult = {
      bestPos: candidates[0],
      bestScore: -Infinity,
      depthReached: 0,
    };

    // 迭代加深
    const startDepth = this.config.useIterativeDeepening ? 2 : this.config.maxDepth;
    const maxDepth = this.config.maxDepth;

    for (let d = startDepth; d <= maxDepth; d++) {
      // 时间检查
      if (this.isTimeUp()) break;

      let bestScore = -Infinity;
      let bestPos = candidates[0];
      let alpha = -Infinity;
      const beta = Infinity;

      for (const pos of candidates) {
        if (this.isTimeUp()) break;

        const z = board.findDropPosition(pos.x, pos.y);
        if (z === -1) continue;
        const fullPos: Position = { x: pos.x, y: pos.y, z };

        board.setPiece(fullPos, aiPiece);
        const rootBaseline = this.evaluator.evaluateIncremental(
          baseReport, board, fullPos, aiPiece,
        );
        const rawScore = this.minimax(
          board, d - 1, alpha, beta, false, aiPiece, rootBaseline,
        );
        board.setPiece(fullPos, 'EMPTY');
        this.nodesSearched++;

        const below = fullPos.z > 0 ? board.getPiece({ x: fullPos.x, y: fullPos.y, z: fullPos.z - 1 }) : 'EMPTY';
        const pb = positionBonus(fullPos.x, fullPos.y, fullPos.z, below, aiPiece);
        const score = rawScore + pb;

        if (score > bestScore) {
          bestScore = score;
          bestPos = fullPos;
        }
        alpha = Math.max(alpha, score);

        if (SEARCH_TRACE >= 1) {
          const isNewBest = score === bestScore ? '←BEST' : '';
          console.log(`[AI-TRACE] root (${fullPos.x},${fullPos.y},${fullPos.z}) raw=${rawScore} pb=${pb} total=${score} alpha=${alpha} ${isNewBest}`);
        }

        // 每处理完一个根候选就让出主线程（保持UI响应）
        await this.yieldToBrowser();
      }

      bestResult = { bestPos, bestScore, depthReached: d };

      // 如果找到必胜走法提前退出
      if (bestScore >= WIN_SCORE - 1000) break;
    }

    const elapsed = Date.now() - this.startTime;
    return {
      ...bestResult,
      nodesSearched: this.nodesSearched,
      timeMs: elapsed,
    };
  }

  /**
   * 搜索最优走法（同步版，PonderingEngine用。不进行时间片让出）
   */
  searchSync(board: Board, aiPiece: Player, baseline?: ThreatReport): SearchResult {
    this.nodesSearched = 0;
    this.startTime = Date.now();

    const baseReport = baseline ?? this.evaluator.evaluate(board, aiPiece);

    const candidates = this.getSortedCandidates(board, aiPiece, baseReport);
    if (candidates.length === 0) {
      return {
        bestPos: { x: 2, y: 2, z: 0 },
        bestScore: 0,
        depthReached: 0,
        nodesSearched: 0,
        timeMs: 0,
      };
    }

    // 立即获胜速查：只读检测，不修改棋盘，避免 undo 问题
    for (const pos of candidates) {
      const z = board.findDropPosition(pos.x, pos.y);
      if (z === -1) continue;
      if (board.quickWouldWinAt({ x: pos.x, y: pos.y, z }, aiPiece)) {
        if (SEARCH_TRACE >= 1) {
          console.log(`[AI-TRACE] ⚡ INSTANT-WIN at (${pos.x},${pos.y},${z}) — skip search`);
        }
        return {
          bestPos: { x: pos.x, y: pos.y, z },
          bestScore: WIN_SCORE,
          depthReached: 0,
          nodesSearched: 0,
          timeMs: 0,
        };
      }
    }

    let bestResult = {
      bestPos: candidates[0],
      bestScore: -Infinity,
      depthReached: 0,
    };

    const startDepth = this.config.useIterativeDeepening ? 2 : this.config.maxDepth;
    const maxDepth = this.config.maxDepth;

    for (let d = startDepth; d <= maxDepth; d++) {
      if (this.isTimeUp()) break;

      let bestScore = -Infinity;
      let bestPos = candidates[0];
      let alpha = -Infinity;
      const beta = Infinity;

      for (const pos of candidates) {
        if (this.isTimeUp()) break;

        const z = board.findDropPosition(pos.x, pos.y);
        if (z === -1) continue;
        const fullPos: Position = { x: pos.x, y: pos.y, z };

        board.setPiece(fullPos, aiPiece);
        const rootBaseline = this.evaluator.evaluateIncremental(
          baseReport, board, fullPos, aiPiece,
        );
        const rawScore = this.minimax(
          board, d - 1, alpha, beta, false, aiPiece, rootBaseline,
        );
        board.setPiece(fullPos, 'EMPTY');
        this.nodesSearched++;

        const below = fullPos.z > 0 ? board.getPiece({ x: fullPos.x, y: fullPos.y, z: fullPos.z - 1 }) : 'EMPTY';
        const pb = positionBonus(fullPos.x, fullPos.y, fullPos.z, below, aiPiece);
        const score = rawScore + pb;

        if (score > bestScore) {
          bestScore = score;
          bestPos = fullPos;
        }
        alpha = Math.max(alpha, score);
      }

      bestResult = { bestPos, bestScore, depthReached: d };

      if (bestScore >= WIN_SCORE - 1000) break;
    }

    const elapsed = Date.now() - this.startTime;
    return {
      ...bestResult,
      nodesSearched: this.nodesSearched,
      timeMs: elapsed,
    };
  }

  // ==================== Minimax ====================

  private minimax(
    board: Board,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    aiPiece: Player,
    baseline: ThreatReport,
  ): number {
    this.nodesSearched++;

    const currentPlayer = isMaximizing ? aiPiece : opponentOf(aiPiece);

    // 终止: 深度到0
    if (depth === 0) {
      if (this.config.useQuiescenceSearch) {
        return this.quiescenceSearch(board, alpha, beta, isMaximizing, aiPiece);
      }
      const report = this.evaluator.evaluate(board, aiPiece);
      if (SEARCH_TRACE >= 4 && Math.abs(report.finalScore) < 5000) {
        console.log(`[AI-TRACE]         depth=0 own=${report.ownScore} opp=${report.oppScore} final=${report.finalScore}`);
      }
      return report.finalScore;
    }

    // 终止: 时间到
    if (this.isTimeUp()) {
      const report = this.evaluator.evaluate(board, aiPiece);
      return report.finalScore;
    }

    // 终止: 游戏结束
    const winResult = board.checkWinWithIndex();
    if (winResult) {
      if (winResult.winner === aiPiece) {
        return WIN_SCORE + depth * 1000;
      } else {
        return -(WIN_SCORE + depth * 1000);
      }
    }

    // 终止: 平局
    if (board.isFull()) return 0;

    const candidates = board.getAvailableColumns();
    if (candidates.length === 0) return 0;

    // 候选排序（baseline 始终从 aiPiece 视角，通过 isOwnTurn 反转视角）
    const sorted = this.sortCandidatesForSearch(board, candidates, currentPlayer, baseline, isMaximizing);

    if (isMaximizing) {
      let maxScore = -Infinity;
      let bestMaxPos: Position | null = null;
      let maxCutCount = 0;
      for (const pos of sorted) {
        const z = board.findDropPosition(pos.x, pos.y);
        if (z === -1) continue;
        const fullPos: Position = { x: pos.x, y: pos.y, z };

        board.setPiece(fullPos, currentPlayer);
        const childBaseline = this.evaluator.evaluateIncremental(
          baseline, board, fullPos, currentPlayer,
        );
        const score = this.minimax(board, depth - 1, alpha, beta, false, aiPiece, childBaseline);
        board.setPiece(fullPos, 'EMPTY');

        if (SEARCH_TRACE >= 4 && depth === 1 && Math.abs(score) < 5000) {
          console.log(`[AI-TRACE]       WHITE(${fullPos.x},${fullPos.y},${fullPos.z}) score=${score} alpha=${alpha} beta=${beta}`);
        }

        if (score > maxScore) {
          maxScore = score;
          bestMaxPos = fullPos;
        }
        alpha = Math.max(alpha, score);
        if (beta <= alpha) {
          if (SEARCH_TRACE >= 4 && depth === 1) {
            console.log(`[AI-TRACE]       → CUT at (${fullPos.x},${fullPos.y}) beta(${beta}) <= alpha(${alpha})`);
          }
          maxCutCount++;
          this.killerMoves[depth] = fullPos;
          break;
        }
      }
      if (SEARCH_TRACE >= 4 && depth === 1) {
        console.log(`[AI-TRACE]       WHITE depth=1 best=(${bestMaxPos?.x},${bestMaxPos?.y},${bestMaxPos?.z}) maxScore=${maxScore}`);
      }
      return maxScore;
    } else {
      let minScore = Infinity;
      let bestMinPos: Position | null = null;
      let cutCount = 0;
      for (const pos of sorted) {
        const z = board.findDropPosition(pos.x, pos.y);
        if (z === -1) continue;
        const fullPos: Position = { x: pos.x, y: pos.y, z };

        board.setPiece(fullPos, currentPlayer);
        const childBaseline = this.evaluator.evaluateIncremental(
          baseline, board, fullPos, currentPlayer,
        );
        const score = this.minimax(board, depth - 1, alpha, beta, true, aiPiece, childBaseline);
        board.setPiece(fullPos, 'EMPTY');

        if (SEARCH_TRACE >= 3 && depth === 2 && score < 100) {
          console.log(`[AI-TRACE]     BLACK(${fullPos.x},${fullPos.y},${fullPos.z}) score=${score} beta=${beta} alpha=${alpha}`);
        }

        if (score < minScore) {
          minScore = score;
          bestMinPos = fullPos;
        }
        beta = Math.min(beta, score);
        if (beta <= alpha) {
          if (SEARCH_TRACE >= 3 && depth === 2) {
            console.log(`[AI-TRACE]     → CUT at (${fullPos.x},${fullPos.y}) beta=${beta} <= alpha=${alpha}, cut ${sorted.length - cutCount} remaining`);
          }
          cutCount++;
          this.killerMoves[depth] = fullPos;
          break;
        }
      }
      if (SEARCH_TRACE >= 2 && depth === 2 && !isMaximizing) {
        console.log(`[AI-TRACE]   BLACK depth=2: bestResponse=(${bestMinPos?.x},${bestMinPos?.y},${bestMinPos?.z}) minScore=${minScore} beta=${beta} alpha=${alpha} totalScanned=${cutCount > 0 ? 'CUT' : sorted.length}`);
      }
      return minScore;
    }
  }

  // ==================== 安静搜索 ====================

  private quiescenceSearch(
    board: Board,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    aiPiece: Player,
  ): number {
    this.nodesSearched++;

    const currentPlayer = isMaximizing ? aiPiece : opponentOf(aiPiece);

    // 0. 先检查立即获胜（防止 horizon 效应）
    const columns = board.getAvailableColumns();
    for (const col of columns) {
      const z = board.findDropPosition(col.x, col.y);
      if (z === -1) continue;
      const pos: Position = { x: col.x, y: col.y, z };
      if (WinChecker.quickWouldWinFast(board, pos, currentPlayer)) {
        return isMaximizing ? WIN_SCORE : -WIN_SCORE;
      }
    }

    // 1. stand-pat（始终从 AI 视角评估）
    const standPat = this.evaluator.evaluate(board, aiPiece).finalScore;

    if (isMaximizing) {
      if (standPat >= beta) return beta;
      alpha = Math.max(alpha, standPat);
    } else {
      if (standPat <= alpha) return alpha;
      beta = Math.min(beta, standPat);
    }

    // 2. 生成战术走法: 只涉及高价值棋形的位置
    const tacticalMoves = this.findTacticalMoves(board, currentPlayer);
    if (tacticalMoves.length === 0) return standPat;

    // 3. 递归搜索战术走法
    for (const pos of tacticalMoves) {
      board.setPiece(pos, currentPlayer);
      const score = this.quiescenceSearch(board, alpha, beta, !isMaximizing, aiPiece);
      board.setPiece(pos, 'EMPTY');

      if (isMaximizing) {
        alpha = Math.max(alpha, score);
      } else {
        beta = Math.min(beta, score);
      }
      if (beta <= alpha) break;
    }

    return isMaximizing ? alpha : beta;
  }

  // ==================== 辅助 ====================

  /**
   * 获取排序后的候选列表（根节点用）
   */
  private getSortedCandidates(
    board: Board,
    aiPiece: Player,
    baseline: ThreatReport,
  ): Position[] {
    const raw = board.getAvailableColumns();

    interface Scored {
      x: number;
      y: number;
      prio: number;
    }
    const scored: Scored[] = [];

    for (const c of raw) {
      let priority = 0;
      const z = board.findDropPosition(c.x, c.y);
      if (z === -1) continue;
      const pos: Position = { x: c.x, y: c.y, z };

      // 己方立即获胜
      if (WinChecker.quickWouldWinFast(board, pos, aiPiece)) {
        priority += 10000;
      }
      // 阻挡对手立即获胜
      if (WinChecker.quickWouldWinFast(board, pos, opponentOf(aiPiece))) {
        priority += 5000;
      }
      // 进攻: 己方棋形延伸
      for (const p of baseline.ownPatterns) {
        for (const ext of p.extCells) {
          if (ext.x === pos.x && ext.y === pos.y && ext.z === pos.z) {
            if (p.score >= 500) priority += 1000; // T2-OR 级以上
            else priority += 200;
          }
        }
      }
      // 防守: 阻挡对方棋形延伸
      for (const p of baseline.oppPatterns) {
        for (const ext of p.extCells) {
          if (ext.x === pos.x && ext.y === pos.y && ext.z === pos.z) {
            if (p.score >= 500) priority += 1500; // 阻挡 T2-OR/G3 级以上威胁
            else priority += 500;
          }
        }
      }
      // 位势分 (含 z 层)
      const below = pos.z > 0 ? board.getPiece({ x: pos.x, y: pos.y, z: pos.z - 1 }) : 'EMPTY';
      priority += positionBonus(c.x, c.y, pos.z, below, aiPiece);

      scored.push({ x: c.x, y: c.y, prio: priority });
    }

    scored.sort((a, b) => b.prio - a.prio);
    return scored.map((s) => ({ x: s.x, y: s.y, z: 0 })); // z will be resolved later
  }

  /**
   * 搜索树内部候选排序
   */
  private sortCandidatesForSearch(
    board: Board,
    candidates: { x: number; y: number }[],
    player: Player,
    baseline: ThreatReport,
    isOwnTurn: boolean,
  ): { x: number; y: number }[] {
    const scored: { x: number; y: number; prio: number }[] = [];

    // baseline 始终从 aiPiece 视角计算:
    //   ownPatterns = aiPiece 的棋形, oppPatterns = 对手的棋形
    // 当当前玩家是对手时 (!isOwnTurn), 反转 own/opp
    const extendPatterns = isOwnTurn ? baseline.ownPatterns : baseline.oppPatterns;
    const blockPatterns = isOwnTurn ? baseline.oppPatterns : baseline.ownPatterns;

    for (const c of candidates) {
      let priority = 0;
      const z = board.findDropPosition(c.x, c.y);
      if (z === -1) continue;
      const pos: Position = { x: c.x, y: c.y, z };

      // 杀手走法
      for (let i = 0; i < this.killerMoves.length; i++) {
        const km = this.killerMoves[i];
        if (km && km.x === pos.x && km.y === pos.y && km.z === pos.z) {
          priority += 500;
          break;
        }
      }

      // 历史启发式
      const histKey = `${player}:${pos.x},${pos.y}`;
      priority += this.historyTable.get(histKey) ?? 0;

      // 进攻: 己方棋形延伸 (当前玩家视角)
      for (const p of extendPatterns) {
        for (const ext of p.extCells) {
          if (ext.x === pos.x && ext.y === pos.y && ext.z === pos.z) {
            if (p.score >= 500) priority += 1000;
            else priority += 200;
          }
        }
      }
      // 防守: 阻挡对方棋形延伸
      for (const p of blockPatterns) {
        for (const ext of p.extCells) {
          if (ext.x === pos.x && ext.y === pos.y && ext.z === pos.z) {
            if (p.score >= 500) priority += 1500;
            else priority += 500;
          }
        }
      }

      // 位势分 (含 z 层)
      const below = pos.z > 0 ? board.getPiece({ x: pos.x, y: pos.y, z: pos.z - 1 }) : 'EMPTY';
      priority += positionBonus(c.x, c.y, pos.z, below, player);

      scored.push({ x: c.x, y: c.y, prio: priority });
    }

    scored.sort((a, b) => b.prio - a.prio);
    return scored;
  }

  /**
   * 找到战术走法（安静搜索用）
   * 只考虑涉及高价值棋形的位置
   */
  private findTacticalMoves(board: Board, player: Player): Position[] {
    const report = this.evaluator.evaluate(board, player);
    const posSet = new Set<string>();
    const moves: Position[] = [];
    const ownscore = 100   //  以上才纳入战术走法                                                                                                                                
    const oppscore = 80   // 以上才纳入  

    // 收集己方和对方高价值 pattern 的 extCells
    for (const p of report.ownPatterns) {
      if (p.score >= ownscore) { // T2-OR 级以上
        for (const ext of p.extCells) {
          const key = `${ext.x},${ext.y},${ext.z}`;
          if (!posSet.has(key) && this.isPlayable(ext, board)) {
            posSet.add(key);
            moves.push(ext);
          }
        }
      }
    }
    for (const p of report.oppPatterns) {
      if (p.score >= oppscore) { // G2-S1-R 级以上
        for (const ext of p.extCells) {
          const key = `${ext.x},${ext.y},${ext.z}`;
          if (!posSet.has(key) && this.isPlayable(ext, board)) {
            posSet.add(key);
            moves.push(ext);
          }
        }
      }
    }

    return moves;
  }

  private isPlayable(pos: Position, board: Board): boolean {
    if (pos.z === 0) return true;
    const below: Position = { x: pos.x, y: pos.y, z: pos.z - 1 };
    return board.getPiece(below) !== 'EMPTY';
  }

  private isTimeUp(): boolean {
    if (this.config.timeLimitMs <= 0) return false;
    return (Date.now() - this.startTime) > this.config.timeLimitMs;
  }
}
