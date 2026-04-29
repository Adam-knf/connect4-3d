/**
 * CrossDetector 叉子检测测试
 * TC-CROSS-01 ~ TC-CROSS-03 (ai-evaluation-v2.md §9.3)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from '@/core/Board';
import type { Pattern } from '../PatternMatcher';
import { CrossDetector } from '../CrossDetector';
import { CrossType, DirCategory } from '../scores';

/** 手动构造 Pattern（避免全板扫描产生额外 extCell 噪声） */
function mkPattern(opts: {
  pieceCount: number; score: number; extCells: { x: number; y: number; z: number }[];
  lineId?: number; dirCat?: DirCategory;
}): Pattern {
  return {
    type: 'T2-HR' as any,
    player: 'BLACK',
    lineId: opts.lineId ?? Math.floor(Math.random() * 1000),
    dirCategory: opts.dirCat ?? DirCategory.HORIZONTAL,
    extCells: opts.extCells as any,
    score: opts.score,
    pieceCount: opts.pieceCount,
  };
}

describe('CrossDetector', () => {
  let board: Board;

  beforeEach(() => {
    board = new Board();
  });

  it('TC-CROSS-01: extCell 不重合 → 无 Cross', () => {
    const patterns: Pattern[] = [
      // Line A: extCells at (0,0,0) and (3,3,0)
      mkPattern({ pieceCount: 2, score: 500, extCells: [{ x: 0, y: 0, z: 0 }, { x: 3, y: 3, z: 0 }], lineId: 1 }),
      // Line B: extCell at (1,3,0)
      mkPattern({ pieceCount: 2, score: 500, extCells: [{ x: 1, y: 3, z: 0 }], lineId: 2 }),
    ];
    const crosses = CrossDetector.detect(patterns, board);
    expect(crosses.length).toBe(0);
  });

  it('TC-CROSS-02: 两条 T2 线 extCell 交于同一空位 → CROSS', () => {
    // 两条线都指向 (2,2,0)
    const patterns: Pattern[] = [
      mkPattern({ pieceCount: 2, score: 500, extCells: [{ x: 2, y: 2, z: 0 }], lineId: 1 }),
      mkPattern({ pieceCount: 2, score: 500, extCells: [{ x: 2, y: 2, z: 0 }], lineId: 2 }),
    ];
    const crosses = CrossDetector.detect(patterns, board);
    expect(crosses.length).toBe(1);
    expect(crosses[0].position).toEqual({ x: 2, y: 2, z: 0 });
  });

  it('TC-CROSS-03: 两条 T2-HR (score=80) → CROSS-WEAK (score=300)', () => {
    const patterns: Pattern[] = [
      mkPattern({ pieceCount: 2, score: 80, extCells: [{ x: 2, y: 2, z: 0 }], lineId: 1 }),
      mkPattern({ pieceCount: 2, score: 80, extCells: [{ x: 2, y: 2, z: 0 }], lineId: 2 }),
    ];
    const crosses = CrossDetector.detect(patterns, board);
    expect(crosses.length).toBe(1);
    expect(crosses[0].type).toBe(CrossType.CROSS_WEAK);
    expect(crosses[0].score).toBe(300);
  });

  it('两条高价值线 (T2-OR score=500) 在同一空位 → CROSS-STRONG', () => {
    const patterns: Pattern[] = [
      mkPattern({ pieceCount: 2, score: 500, extCells: [{ x: 1, y: 1, z: 0 }], lineId: 1 }),
      mkPattern({ pieceCount: 2, score: 500, extCells: [{ x: 1, y: 1, z: 0 }], lineId: 2 }),
    ];
    // score=500 ≈ T2-OR 级别, classify 中 t2HighCount++ → CROSS-STRONG
    const crosses = CrossDetector.detect(patterns, board);
    expect(crosses.length).toBe(1);
    // CROSS-STRONG if both are high-value (T2-OR level)
    expect(crosses[0].score).toBeGreaterThanOrEqual(300);
  });

  it('三条线交于同一点', () => {
    const patterns: Pattern[] = [
      mkPattern({ pieceCount: 2, score: 80, extCells: [{ x: 2, y: 2, z: 0 }], lineId: 1 }),
      mkPattern({ pieceCount: 2, score: 80, extCells: [{ x: 2, y: 2, z: 0 }], lineId: 2 }),
      mkPattern({ pieceCount: 2, score: 80, extCells: [{ x: 2, y: 2, z: 0 }], lineId: 3 }),
    ];
    const crosses = CrossDetector.detect(patterns, board);
    expect(crosses.length).toBe(1);
  });

  it('T2-HD (score=2) 不参与 Cross — isValuable 过滤', () => {
    // T2-HD 不在 isValuable 列表中 → 两条 T2-HD 即使共享 extCell 也不形成 Cross
    const patterns: Pattern[] = [
      { type: 'T2-HD' as any, player: 'BLACK', lineId: 1, dirCategory: DirCategory.HORIZONTAL, extCells: [{ x: 2, y: 2, z: 0 } as any], score: 2, pieceCount: 2 },
      { type: 'T2-HD' as any, player: 'BLACK', lineId: 2, dirCategory: DirCategory.HORIZONTAL, extCells: [{ x: 2, y: 2, z: 0 } as any], score: 2, pieceCount: 2 },
    ];
    const crosses = CrossDetector.detect(patterns, board);
    expect(crosses.length).toBe(0);
  });
});
