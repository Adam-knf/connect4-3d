/**
 * 叉子检测器 — 多条威胁线交汇于同一可下空位
 * 基于 ai-evaluation-v2.md §5.2
 *
 * 核心思路: 按 extCell 聚类 pattern，同一空位 ≥2 条有价值 line → Cross
 */

import type { Position } from '@/types';
import type { Board } from '@/core/Board';
import type { Pattern } from './PatternMatcher';
import { CrossType, CROSS_SCORES, PatternType } from './scores';

// ==================== CrossResult ====================

export interface CrossResult {
  type: CrossType;
  position: Position;
  patterns: Pattern[];
  score: number;
}

// ==================== 辅助 ====================

function posKey(p: Position): string {
  return `${p.x},${p.y},${p.z}`;
}

/**
 * 判定单条 pattern 是否"有价值"（参与 Cross 的最低门槛）
 * T2-HR 及以上、G2-S2-R 及以上均可参与 Cross（CROSS-WEAK 需要 T2-HR 级）
 */
function isValuable(p: Pattern): boolean {
  const t = p.type;
  return (
    t === PatternType.WIN ||
    t === PatternType.T3_OR || t === PatternType.T3_OP || t === PatternType.T3_OD ||
    t === PatternType.T3_HR || t === PatternType.T3_HD ||
    t === PatternType.T2_OR || t === PatternType.T2_OP || t === PatternType.T2_HR ||
    t === PatternType.G3_S1_R || t === PatternType.G3_S1_D ||
    t === PatternType.G2_S1_R || t === PatternType.G2_S2_R
  );
}

// ==================== CrossDetector ====================

export class CrossDetector {
  /**
   * 从 pattern 列表中检测所有叉子
   */
  static detect(patterns: Pattern[], board: Board): CrossResult[] {
    // 1. 筛选有价值 pattern
    const valuable = patterns.filter(isValuable);
    if (valuable.length < 2) return [];

    // 2. 按 extCell 聚类
    const cluster = new Map<string, Pattern[]>();
    for (const p of valuable) {
      for (const cell of p.extCells) {
        // 验证交汇点可下
        if (!CrossDetector.isPlayableAt(cell, board)) continue;
        const key = posKey(cell);
        if (!cluster.has(key)) cluster.set(key, []);
        cluster.get(key)!.push(p);
      }
    }

    // 3. 判定 Cross 类型
    const results: CrossResult[] = [];
    for (const [key, pats] of cluster) {
      if (pats.length < 2) continue;

      // 去重: 同一 lineId 只留一次
      const unique = new Map<number, Pattern>();
      for (const p of pats) {
        if (!unique.has(p.lineId)) unique.set(p.lineId, p);
      }
      if (unique.size < 2) continue;

      const uniquePats = [...unique.values()];
      const crossType = CrossDetector.classify(uniquePats);

      const [x, y, z] = key.split(',').map(Number);
      results.push({
        type: crossType,
        position: { x, y, z },
        patterns: uniquePats,
        score: CROSS_SCORES[crossType],
      });
    }

    return results;
  }

  /**
   * 根据交汇 pattern 组合判定叉子类型
   */
  private static classify(patterns: Pattern[]): CrossType {
    // 统计各等级 pattern 数量
    let t3Count = 0;  // T3-* 或 G3-*
    let t2HighCount = 0;  // T2-OR / G2-S1
    let t2LowCount = 0;   // T2-HR / G2-S2 等

    for (const p of patterns) {
      const t = p.type;
      if (
        t === PatternType.T3_OR || t === PatternType.T3_OP || t === PatternType.T3_OD ||
        t === PatternType.T3_HR || t === PatternType.T3_HD ||
        t === PatternType.G3_S1_R || t === PatternType.G3_S1_D
      ) {
        t3Count++;
      } else if (
        t === PatternType.T2_OR || t === PatternType.T2_OP ||
        t === PatternType.G2_S1_R
      ) {
        t2HighCount++;
      } else {
        t2LowCount++;
      }
    }

    // WIN 或 2+ T3 → CROSS-WIN
    if (t3Count >= 2) return CrossType.CROSS_WIN;
    for (const p of patterns) {
      if (p.type === PatternType.WIN) return CrossType.CROSS_WIN;
    }

    // 2+ T2-OR → CROSS-STRONG
    if (t2HighCount >= 2) return CrossType.CROSS_STRONG;
    // T3 + T2-high → CROSS-STRONG
    if (t3Count >= 1 && t2HighCount >= 1) return CrossType.CROSS_STRONG;

    // T2-high + T2-low → CROSS-MODERATE
    if (t2HighCount >= 1 && t2LowCount >= 1) return CrossType.CROSS_MODERATE;

    // 2+ T2-low → CROSS-WEAK
    if (t2LowCount >= 2) return CrossType.CROSS_WEAK;

    return CrossType.CROSS_WEAK;
  }

  /**
   * 判断空位是否可立即下（与 PatternMatcher 逻辑一致）
   */
  private static isPlayableAt(pos: Position, board: Board): boolean {
    if (pos.z === 0) return true;
    const below: Position = { x: pos.x, y: pos.y, z: pos.z - 1 };
    return board.getPiece(below) !== 'EMPTY';
  }
}
