/**
 * 威胁评估器 — 全盘局面评估 + 增量评估
 * 基于 ai-evaluation-v2.md §5.3
 *
 * evaluate():       根节点基线评估（每层只调用一次）
 * evaluateIncremental(): 放置棋子后的增量评估（每个候选用，只重算受影响线）
 */

import type { Player, Position, LineRecord } from '@/types';
import type { Board } from '@/core/Board';
import { PatternMatcher, type Pattern } from './PatternMatcher';
import { CrossDetector, type CrossResult } from './CrossDetector';
import {
  DEFENSE_MULTIPLIER,
  DIR_WEIGHTS,
} from './scores';

// ==================== ThreatReport ====================

export interface ThreatReport {
  /** 评估视角：own/opp 基于哪个玩家 */
  aiPlayer: Player;
  ownPatterns: Pattern[];
  oppPatterns: Pattern[];
  ownCrosses: CrossResult[];
  oppCrosses: CrossResult[];
  ownScore: number;
  oppScore: number;
  finalScore: number;
  /** 线级缓存: physKey → ownPattern (用于增量评估快速替换) */
  lineOwnCache: Map<string, Pattern | null>;
  lineOppCache: Map<string, Pattern | null>;
}

// ==================== ThreatEvaluator ====================

export class ThreatEvaluator {
  /**
   * 全盘基线评估（只在根节点调用一次）
   */
  static evaluate(board: Board, player: Player): ThreatReport {
    const allLines = board.getAllLineRecords();

    // 物理线去重: 同一 physKey 只保留棋子数最多的段
    // 如果棋子数相等，优先选非MIX的段（MIX段对双方都无价值）
    const bestSegments = new Map<string, LineRecord>();
    for (const line of allLines) {
      const key = line.physKey;
      const existing = bestSegments.get(key);
      if (!existing) {
        bestSegments.set(key, line);
      } else {
        const curMax = Math.max(line.blackCount, line.whiteCount);
        const existMax = Math.max(existing.blackCount, existing.whiteCount);
        if (curMax > existMax) {
          bestSegments.set(key, line);
        } else if (curMax === existMax) {
          // 棋子数相等时，MIX 段不应覆盖非MIX段
          const curMixed = line.blackCount > 0 && line.whiteCount > 0;
          const existMixed = existing.blackCount > 0 && existing.whiteCount > 0;
          if (existMixed && !curMixed) {
            bestSegments.set(key, line);
          }
        }
      }
    }

    const ownPatterns: Pattern[] = [];
    const oppPatterns: Pattern[] = [];
    const lineOwnCache = new Map<string, Pattern | null>();
    const lineOppCache = new Map<string, Pattern | null>();

    // 扫描所有去重线
    for (const [, line] of bestSegments) {
      const { own, opp } = PatternMatcher.classifyBoth(line, board, player);
      lineOwnCache.set(line.physKey, own);
      lineOppCache.set(line.physKey, opp);
      if (own) ownPatterns.push(own);
      if (opp) oppPatterns.push(opp);
    }

    // 累加纯线分
    let ownScore = 0;
    for (const p of ownPatterns) {
      ownScore += p.score * DIR_WEIGHTS[p.dirCategory];
    }
    let oppScore = 0;
    for (const p of oppPatterns) {
      oppScore += p.score * DIR_WEIGHTS[p.dirCategory];
    }

    // Cross 检测
    const ownCrosses = CrossDetector.detect(ownPatterns, board);
    const oppCrosses = CrossDetector.detect(oppPatterns, board);

    for (const c of ownCrosses) ownScore += c.score;
    for (const c of oppCrosses) oppScore += c.score;

    // 综合分 = 己方攻击分 - 对方防守分 + 位置加分
    // 防守倍率直接在 oppScore 上体现
    const finalScore = ownScore - oppScore * DEFENSE_MULTIPLIER;

    return {
      aiPlayer: player,
      ownPatterns,
      oppPatterns,
      ownCrosses,
      oppCrosses,
      ownScore,
      oppScore,
      finalScore,
      lineOwnCache,
      lineOppCache,
    };
  }

  /**
   * 增量评估: 在 baseline 基础上计算放置 pos 后的新 ThreatReport
   * 只重算受该位置影响的线 (~50条)，不扫全量
   */
  static evaluateIncremental(
    baseline: ThreatReport,
    board: Board,
    pos: Position,
    _player: Player,
  ): ThreatReport {
    const affectedLineIds = board.getLineIdsAtPosition(pos);

    // 收集所有受影响线（不去重physKey，因为同physKey的段可能有不同棋形）
    const allAffectedLines: LineRecord[] = [];
    for (const lid of affectedLineIds) {
      const line = board.getLineRecord(lid);
      if (line) allAffectedLines.push(line);
    }

    // 按 physKey 分组，保留每组的旧 own/opp 用于 delta 计算
    const physKeyGroups = new Map<string, LineRecord[]>();
    for (const line of allAffectedLines) {
      const k = line.physKey;
      if (!physKeyGroups.has(k)) physKeyGroups.set(k, []);
      physKeyGroups.get(k)!.push(line);
    }

    // 移除旧值（每个 physKey 只减一次）
    let ownScoreDelta = 0;
    let oppScoreDelta = 0;
    for (const [key, _lines] of physKeyGroups) {
      const oldOwn = baseline.lineOwnCache.get(key);
      if (oldOwn) {
        ownScoreDelta -= oldOwn.score * DIR_WEIGHTS[oldOwn.dirCategory];
      }
      const oldOpp = baseline.lineOppCache.get(key);
      if (oldOpp) {
        oppScoreDelta -= oldOpp.score * DIR_WEIGHTS[oldOpp.dirCategory];
      }
    }

    // 重新 classify 所有受影响线，然后每 physKey 选最佳（同 evaluate 的 dedup 逻辑）
    const newLineOwnCache = new Map(baseline.lineOwnCache);
    const newLineOppCache = new Map(baseline.lineOppCache);

    for (const [key, lines] of physKeyGroups) {
      let bestOwn: Pattern | null = null;
      let bestOpp: Pattern | null = null;
      let bestOwnScore = -1;
      let bestOppScore = -1;

      for (const line of lines) {
        // BUGFIX: 始终用 baseline.aiPlayer 做 classifyBoth，确保 own/opp 语义一致
        const { own, opp } = PatternMatcher.classifyBoth(line, board, baseline.aiPlayer);

        // 选最佳 own（非null、分数最高的）
        if (own && own.score > bestOwnScore) {
          bestOwn = own;
          bestOwnScore = own.score;
        }
        // 选最佳 opp（非null、分数最高的）
        if (opp && opp.score > bestOppScore) {
          bestOpp = opp;
          bestOppScore = opp.score;
        }
      }

      newLineOwnCache.set(key, bestOwn);
      newLineOppCache.set(key, bestOpp);

      if (bestOwn) ownScoreDelta += bestOwn.score * DIR_WEIGHTS[bestOwn.dirCategory];
      if (bestOpp) oppScoreDelta += bestOpp.score * DIR_WEIGHTS[bestOpp.dirCategory];
    }

    // 重建 pattern 列表（从缓存）
    const newOwnPatterns: Pattern[] = [];
    const newOppPatterns: Pattern[] = [];
    for (const [, p] of newLineOwnCache) {
      if (p) newOwnPatterns.push(p);
    }
    for (const [, p] of newLineOppCache) {
      if (p) newOppPatterns.push(p);
    }

    // 增量 Cross 检测
    const newOwnCrosses = CrossDetector.detect(newOwnPatterns, board);
    const newOppCrosses = CrossDetector.detect(newOppPatterns, board);

    let crossOwnDelta = 0;
    let crossOppDelta = 0;
    for (const c of newOwnCrosses) crossOwnDelta += c.score;
    for (const c of newOppCrosses) crossOppDelta += c.score;
    for (const c of baseline.ownCrosses) crossOwnDelta -= c.score;
    for (const c of baseline.oppCrosses) crossOppDelta -= c.score;

    const newOwnScore = baseline.ownScore + ownScoreDelta + crossOwnDelta;
    const newOppScore = baseline.oppScore + oppScoreDelta + crossOppDelta;

    // 位置加分（AI视角 — 这里暂不加 posBonus，由调用方在顶层加）
    const finalScore =
      newOwnScore - newOppScore * DEFENSE_MULTIPLIER;

    return {
      aiPlayer: baseline.aiPlayer,
      ownPatterns: newOwnPatterns,
      oppPatterns: newOppPatterns,
      ownCrosses: newOwnCrosses,
      oppCrosses: newOppCrosses,
      ownScore: newOwnScore,
      oppScore: newOppScore,
      finalScore,
      lineOwnCache: newLineOwnCache,
      lineOppCache: newLineOppCache,
    };
  }
}
