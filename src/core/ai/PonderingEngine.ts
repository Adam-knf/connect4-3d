/**
 * PonderingEngine — 玩家回合后台预判计算
 * 基于 ai-evaluation-v2.md §5.6
 *
 * 玩家回合期间，利用空闲时间预计算 AI 对所有可能玩家走法的响应。
 * 玩家落子时优先查缓存，命中则 AI 0ms 响应。
 *
 * 数据共享链:
 *   originalBaseline (400线, 算一次)
 *     ├─→ playerPos(0,0): evaluateIncremental(50线) → playerBaseline₀ → AI.search
 *     ├─→ playerPos(0,1): evaluateIncremental(50线) → playerBaseline₁ → AI.search
 *     └─→ ... 共25个玩家候选
 */

import type { Player, Position } from '@/types';
import type { Board } from '@/core/Board';
import { ThreatEvaluator, type ThreatReport } from './ThreatEvaluator';
import type { AIPlayerV2 } from './AIPlayerV2';
import { positionBonus, opponentOf } from './scores';

// ==================== 类型 ====================

export interface PonderResult {
  playerPos: Position;
  aiResponse: { x: number; y: number };
  score: number;
}

export interface PonderStats {
  cacheSize: number;
  hitRate: number;
  totalTimeMs: number;
}

// ==================== PonderingEngine ====================

export class PonderingEngine {
  private aiPlayer: AIPlayerV2 | null = null;
  private cache = new Map<string, PonderResult>();
  private abortFlag = false;
  private isRunning = false;
  private hits = 0;
  private misses = 0;

  /** 将 AIPlayerV2 实例注入（创建后调用） */
  setAIPlayer(ai: AIPlayerV2): void {
    this.aiPlayer = ai;
  }

  /**
   * 玩家回合开始时调用，启动后台预计算
   * 按优先级排序玩家候选位置，时间片循环逐个预判
   */
  async start(board: Board, playerPiece: Player): Promise<void> {
    if (!this.aiPlayer) return;

    this.abortFlag = false;
    this.isRunning = true;
    this.clearCache(); // 新回合清空旧缓存

    const candidates = board.getAvailableColumns();
    if (candidates.length === 0) {
      this.isRunning = false;
      return;
    }

    // 1. 原始局面基线（一次性计算）
    const aiPiece = opponentOf(playerPiece);
    const originalBaseline = ThreatEvaluator.evaluate(board, aiPiece);

    // 2. 按优先级排序候选
    const sorted = this.sortCandidatesByPriority(board, candidates, playerPiece, originalBaseline);

    // 3. 时间片循环（每16ms让出主线程）
    for (const col of sorted) {
      if (this.abortFlag) break;

      const z = board.findDropPosition(col.x, col.y);
      if (z === -1) continue;
      const pos: Position = { x: col.x, y: col.y, z };

      // 增量评估：模拟玩家下pos后的局面
      board.setPiece(pos, playerPiece);
      const playerBaseline = ThreatEvaluator.evaluateIncremental(
        originalBaseline, board, pos, playerPiece,
      );

      // AI 在玩家下pos后的局面上搜索
      const aiMove = this.aiPlayer.calculateBestMoveSync(
        board, aiPiece, playerBaseline,
      );
      board.setPiece(pos, 'EMPTY');

      this.cache.set(posKey(col), {
        playerPos: pos,
        aiResponse: { x: aiMove.x, y: aiMove.y },
        score: aiMove.score ?? 0,
      });

      // 释放主线程
      await this.nextTick();
    }

    this.isRunning = false;
  }

  /**
   * 玩家落子后调用：停止预判，优先查缓存；miss 则同步计算
   */
  lookupOrCompute(
    board: Board,
    playerPos: { x: number; y: number },
  ): { x: number; y: number } | null {
    this.abort(); // 停止后台计算

    const key = posKey(playerPos);

    // 查缓存
    if (this.cache.has(key)) {
      this.hits++;
      const result = this.cache.get(key)!;
      return result.aiResponse;
    }

    // Cache miss: 同步计算
    this.misses++;
    if (!this.aiPlayer) return null;

    return this.aiPlayer.calculateBestMoveSync(board, opponentOf(this.aiPlayer.getPiece()));
  }

  /**
   * 中断后台预计算（玩家提前落子时调用）
   */
  abort(): void {
    this.abortFlag = true;
    this.isRunning = false;
    // 注意：不清理 cache — 已完成的位置全部保留可用
  }

  /** AI落子后清空缓存（局面已变，cache全废） */
  clearCache(): void {
    this.cache.clear();
  }

  /** 获取统计信息 */
  getStats(): PonderStats {
    const total = this.hits + this.misses;
    return {
      cacheSize: this.cache.size,
      hitRate: total > 0 ? this.hits / total : 0,
      totalTimeMs: 0, // 由外部计时
    };
  }

  get isPondering(): boolean {
    return this.isRunning;
  }

  // ==================== 私有方法 ====================

  /** 按威胁级别排序玩家候选位置 */
  private sortCandidatesByPriority(
    board: Board,
    candidates: { x: number; y: number }[],
    playerPiece: Player,
    baseline: ThreatReport,
  ): { x: number; y: number }[] {
    const scored: { x: number; y: number; prio: number }[] = [];

    for (const col of candidates) {
      let priority = 0;
      const oppPlayer = opponentOf(playerPiece);

      // 玩家能立即赢的位置 → 最高优先（玩家最可能下）
      const z = board.findDropPosition(col.x, col.y);
      if (z !== -1) {
        const pos: Position = { x: col.x, y: col.y, z };
        if (board.quickWouldWinAt(pos, playerPiece)) {
          priority += 10000;
        }
        if (board.quickWouldWinAt(pos, oppPlayer)) {
          priority += 5000; // 对手必胜 → 玩家必堵
        }
      }

      // 对方 T3-OR → 高优先级（对手威胁，玩家需要应对）
      for (const p of baseline.oppPatterns) {
        for (const ext of p.extCells) {
          if (ext.x === col.x && ext.y === col.y) {
            if (p.score >= 50000) priority += 5000;  // T3-OR 级
            else if (p.score >= 500) priority += 1000; // T2-OR 级
          }
        }
      }

      // 位势分 (含 z 层)
      const pz = board.findDropPosition(col.x, col.y);
      const below = (pz !== -1 && pz > 0) ? board.getPiece({ x: col.x, y: col.y, z: pz - 1 }) : 'EMPTY';
      priority += positionBonus(col.x, col.y, Math.max(0, pz), below, playerPiece);

      scored.push({ x: col.x, y: col.y, prio: priority });
    }

    scored.sort((a, b) => b.prio - a.prio);
    return scored.map((s) => ({ x: s.x, y: s.y }));
  }

  private async nextTick(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }
}

// ==================== 工具 ====================

function posKey(pos: { x: number; y: number }): string {
  return `${pos.x},${pos.y}`;
}
