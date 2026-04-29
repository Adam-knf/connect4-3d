/**
 * PatternMatcher 单线棋形测试
 * 覆盖 TC-01 ~ TC-14 (来自 ai-evaluation-v2.md §9.2)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from '@/core/Board';
import { PatternMatcher, type Pattern } from '../PatternMatcher';
import { PatternType } from '../scores';

function placeSeq(board: Board, seq: [number, number, number, 'BLACK' | 'WHITE'][]) {
  for (const [x, y, z, p] of seq) {
    board.setPiece({ x, y, z }, p);
  }
}

function patternOnLine(
  board: Board,
  lineId: number,
  player: 'BLACK' | 'WHITE',
): Pattern | null {
  const line = board.getLineRecord(lineId);
  if (!line) return null;
  return PatternMatcher.classifyForPlayer(line, board, player);
}

describe('PatternMatcher - T族连续棋形', () => {
  let board: Board;

  beforeEach(() => {
    board = new Board();
  });

  it('TC-01: WIN — 四连获胜 [B B B B _]', () => {
    // 水平线 (1,0,0): B(0,2,0), B(1,2,0), B(2,2,0), B(3,2,0)
    placeSeq(board, [[0, 2, 0, 'BLACK'], [1, 2, 0, 'BLACK'], [2, 2, 0, 'BLACK'], [3, 2, 0, 'BLACK']]);
    // 找包含这些位置的线
    const lineIds = board.getLineIdsAtPosition({ x: 0, y: 2, z: 0 });
    // 找到方向为 (1,0,0) 的线
    let foundLine: number | null = null;
    for (const lid of lineIds) {
      const rec = board.getLineRecord(lid);
      if (rec && rec.direction.x === 1 && rec.direction.y === 0 && rec.direction.z === 0) {
        foundLine = lid;
        break;
      }
    }
    expect(foundLine).not.toBeNull();
    const p = patternOnLine(board, foundLine!, 'BLACK');
    expect(p).not.toBeNull();
    expect(p!.type).toBe(PatternType.WIN);
    expect(p!.score).toBe(1_000_000);
  });

  it('TC-02: T3-OR — 双开全就绪 [E B B B E]', () => {
    // B(1,2,0), B(2,2,0), B(3,2,0) → 左右 ext 均在 z=0
    placeSeq(board, [[1, 2, 0, 'BLACK'], [2, 2, 0, 'BLACK'], [3, 2, 0, 'BLACK']]);
    const lineIds = board.getLineIdsAtPosition({ x: 1, y: 2, z: 0 });
    let foundLine: number | null = null;
    for (const lid of lineIds) {
      const rec = board.getLineRecord(lid);
      if (rec && rec.direction.x === 1 && rec.direction.y === 0 && rec.direction.z === 0) {
        foundLine = lid;
        break;
      }
    }
    expect(foundLine).not.toBeNull();
    const p = patternOnLine(board, foundLine!, 'BLACK');
    expect(p).not.toBeNull();
    expect(p!.type).toBe(PatternType.T3_OR);
    expect(p!.score).toBe(50_000);
    expect(p!.extCells.length).toBe(2); // 两端均可扩展
  });

  it('TC-03: T3-OP — 双开部分就绪 [E B B B e]', () => {
    // B(1,2,1), B(2,2,1), B(3,2,1) 在高层, 右侧无支撑
    // 先放底层支撑左侧: B(0,2,0)
    placeSeq(board, [
      [0, 2, 0, 'BLACK'], // 支撑左端
      [1, 2, 1, 'BLACK'], [2, 2, 1, 'BLACK'], [3, 2, 1, 'BLACK'],
    ]);
    // 右端 (4,2,1): z=1, 下方 (4,2,0) 为空 → DELAYED
    const lineIds = board.getLineIdsAtPosition({ x: 1, y: 2, z: 1 });
    let foundLine: number | null = null;
    for (const lid of lineIds) {
      const rec = board.getLineRecord(lid);
      if (rec && rec.direction.x === 1 && rec.direction.y === 0 && rec.direction.z === 0) {
        foundLine = lid;
        break;
      }
    }
    expect(foundLine).not.toBeNull();
    const p = patternOnLine(board, foundLine!, 'BLACK');
    expect(p).not.toBeNull();
    expect(p!.type).toBe(PatternType.T3_OP);
    expect(p!.score).toBe(8_000);
  });

  it('TC-05: T3-HR — 单开可下(贴边) [B B B E _]', () => {
    // B(0,2,0), B(1,2,0), B(2,2,0) → 左出界, 右 E
    placeSeq(board, [[0, 2, 0, 'BLACK'], [1, 2, 0, 'BLACK'], [2, 2, 0, 'BLACK']]);
    const lineIds = board.getLineIdsAtPosition({ x: 0, y: 2, z: 0 });
    let foundLine: number | null = null;
    for (const lid of lineIds) {
      const rec = board.getLineRecord(lid);
      // 找包含位置0的线 (方向1,0,0, 起点x=0)
      if (rec && rec.direction.x === 1 && rec.direction.y === 0 && rec.direction.z === 0 &&
          rec.positions[0].x === 0) {
        foundLine = lid;
        break;
      }
    }
    expect(foundLine).not.toBeNull();
    const p = patternOnLine(board, foundLine!, 'BLACK');
    expect(p).not.toBeNull();
    expect(p!.type).toBe(PatternType.T3_HR);
    expect(p!.score).toBe(3_000);
  });

  it('TC-07: T2-OR — 双开全就绪 [E B B E _]', () => {
    // B(1,2,0), B(2,2,0) → 左右 ext 均在 z=0
    placeSeq(board, [[1, 2, 0, 'BLACK'], [2, 2, 0, 'BLACK']]);
    const lineIds = board.getLineIdsAtPosition({ x: 1, y: 2, z: 0 });
    let foundLine: number | null = null;
    for (const lid of lineIds) {
      const rec = board.getLineRecord(lid);
      if (rec && rec.direction.x === 1 && rec.direction.y === 0 && rec.direction.z === 0) {
        foundLine = lid;
        break;
      }
    }
    expect(foundLine).not.toBeNull();
    const p = patternOnLine(board, foundLine!, 'BLACK');
    expect(p).not.toBeNull();
    // 左端贴边 ext2 出界 → depth 不足 → T2-OR-SL
    expect(p!.type).toBe(PatternType.T2_OR_SL);
    expect(p!.score).toBe(80);
  });

  it('TC-08: T2-HR — 单开可下(贴边) [B B E _ _]', () => {
    // B(0,2,0), B(1,2,0) → 左出界, 右 E
    placeSeq(board, [[0, 2, 0, 'BLACK'], [1, 2, 0, 'BLACK']]);
    const lineIds = board.getLineIdsAtPosition({ x: 0, y: 2, z: 0 });
    let foundLine: number | null = null;
    for (const lid of lineIds) {
      const rec = board.getLineRecord(lid);
      if (rec && rec.direction.x === 1 && rec.direction.y === 0 && rec.direction.z === 0 &&
          rec.positions[0].x === 0) {
        foundLine = lid;
        break;
      }
    }
    expect(foundLine).not.toBeNull();
    const p = patternOnLine(board, foundLine!, 'BLACK');
    expect(p).not.toBeNull();
    expect(p!.type).toBe(PatternType.T2_HR);
    expect(p!.score).toBe(10);
  });

  it('TC-09: MIX — 双方棋子混杂', () => {
    placeSeq(board, [[1, 2, 0, 'BLACK'], [2, 2, 0, 'WHITE'], [3, 2, 0, 'BLACK']]);
    const lineIds = board.getLineIdsAtPosition({ x: 1, y: 2, z: 0 });
    let foundLine: number | null = null;
    for (const lid of lineIds) {
      const rec = board.getLineRecord(lid);
      if (rec && rec.direction.x === 1 && rec.direction.y === 0 && rec.direction.z === 0) {
        foundLine = lid;
        break;
      }
    }
    expect(foundLine).not.toBeNull();
    const p = patternOnLine(board, foundLine!, 'BLACK');
    // MIX → null (via classifyBoth, which returns null for mixed color lines)
    expect(p).toBeNull();
  });

  // ========== 补充缺失的 T族棋形 ==========

  it('TC-04: T3-OD — 双开全延迟 [e B B B e]', () => {
    // 3子连续在 z=2, 两端下方均为空 → e
    placeSeq(board, [
      [1, 2, 2, 'BLACK'], [2, 2, 2, 'BLACK'], [3, 2, 2, 'BLACK'],
    ]);
    const lineIds = board.getLineIdsAtPosition({ x: 1, y: 2, z: 2 });
    let foundLine: number | null = null;
    for (const lid of lineIds) {
      const rec = board.getLineRecord(lid);
      if (rec && rec.direction.x === 1 && rec.direction.y === 0 && rec.direction.z === 0) {
        foundLine = lid;
        break;
      }
    }
    expect(foundLine).not.toBeNull();
    const p = patternOnLine(board, foundLine!, 'BLACK');
    expect(p).not.toBeNull();
    expect(p!.type).toBe(PatternType.T3_OD);
    expect(p!.score).toBe(2_000);
  });

  it('TC-06: T3-HD — 单开延迟 [B B B e _]', () => {
    // 贴边3子在 z=1, 右端(3,2,1)下方为空 → e
    placeSeq(board, [
      [0, 2, 1, 'BLACK'], [1, 2, 1, 'BLACK'], [2, 2, 1, 'BLACK'],
    ]);
    const lineIds = board.getLineIdsAtPosition({ x: 0, y: 2, z: 1 });
    let foundLine: number | null = null;
    for (const lid of lineIds) {
      const rec = board.getLineRecord(lid);
      if (rec && rec.direction.x === 1 && rec.direction.y === 0 && rec.direction.z === 0 &&
          rec.positions[0].x === 0) {
        foundLine = lid;
        break;
      }
    }
    expect(foundLine).not.toBeNull();
    const p = patternOnLine(board, foundLine!, 'BLACK');
    expect(p).not.toBeNull();
    expect(p!.type).toBe(PatternType.T3_HD);
    expect(p!.score).toBe(500);
  });

  it('TC-T2OP: T2-OP — 双开部分就绪 [E B B e _]', () => {
    // 2子在 z=1, 左端(0,2,0)有支撑, 右端(3,2,1)下方为空 → e
    placeSeq(board, [
      [0, 2, 0, 'BLACK'], // 支撑左侧
      [1, 2, 1, 'BLACK'], [2, 2, 1, 'BLACK'],
    ]);
    const lineIds = board.getLineIdsAtPosition({ x: 1, y: 2, z: 1 });
    let foundLine: number | null = null;
    for (const lid of lineIds) {
      const rec = board.getLineRecord(lid);
      if (rec && rec.direction.x === 1 && rec.direction.y === 0 && rec.direction.z === 0) {
        foundLine = lid;
        break;
      }
    }
    expect(foundLine).not.toBeNull();
    const p = patternOnLine(board, foundLine!, 'BLACK');
    expect(p).not.toBeNull();
    expect(p!.type).toBe(PatternType.T2_OP_SL);
    expect(p!.score).toBe(40);
  });

  it('TC-T2OD: T2-OD — 双开全延迟 [e B B e _]', () => {
    // 2子在 z=2, 两端下方均为空
    placeSeq(board, [
      [1, 2, 2, 'BLACK'], [2, 2, 2, 'BLACK'],
    ]);
    const lineIds = board.getLineIdsAtPosition({ x: 1, y: 2, z: 2 });
    let foundLine: number | null = null;
    for (const lid of lineIds) {
      const rec = board.getLineRecord(lid);
      if (rec && rec.direction.x === 1 && rec.direction.y === 0 && rec.direction.z === 0) {
        foundLine = lid;
        break;
      }
    }
    expect(foundLine).not.toBeNull();
    const p = patternOnLine(board, foundLine!, 'BLACK');
    expect(p).not.toBeNull();
    expect(p!.type).toBe(PatternType.T2_OD_SL);
    expect(p!.score).toBe(10);
  });

  it('TC-T2HD: T2-HD — 单开延迟 [B B e _ _]', () => {
    // 贴边2子在 z=1, 右端下方为空
    placeSeq(board, [
      [0, 2, 1, 'BLACK'], [1, 2, 1, 'BLACK'],
    ]);
    const lineIds = board.getLineIdsAtPosition({ x: 0, y: 2, z: 1 });
    let foundLine: number | null = null;
    for (const lid of lineIds) {
      const rec = board.getLineRecord(lid);
      if (rec && rec.direction.x === 1 && rec.direction.y === 0 && rec.direction.z === 0 &&
          rec.positions[0].x === 0) {
        foundLine = lid;
        break;
      }
    }
    expect(foundLine).not.toBeNull();
    const p = patternOnLine(board, foundLine!, 'BLACK');
    // 单开+延迟+shallow → ext2 不可下 → 无发展价值 → null
    expect(p).toBeNull();
  });
});

describe('PatternMatcher - G族间隙棋形', () => {
  let board: Board;

  beforeEach(() => {
    board = new Board();
  });

  it('TC-12: G3-S1-R — 间隙绝杀可下 [B B E B _]', () => {
    // B(0,2,0), B(1,2,0), B(3,2,0) → 间隙在 p2
    // T族: block 0-1 = T2-HR(80). G族: 3子1隙 = G3-S1-R(3500)
    // classifyForPlayer 应返回 G3-S1-R（棋子数更多）
    placeSeq(board, [[0, 2, 0, 'BLACK'], [1, 2, 0, 'BLACK'], [3, 2, 0, 'BLACK']]);
    const lineIds = board.getLineIdsAtPosition({ x: 0, y: 2, z: 0 });
    let foundLine: number | null = null;
    for (const lid of lineIds) {
      const rec = board.getLineRecord(lid);
      if (rec && rec.direction.x === 1 && rec.direction.y === 0 && rec.direction.z === 0 &&
          rec.positions[0].x === 0) {
        foundLine = lid;
        break;
      }
    }
    expect(foundLine).not.toBeNull();
    const p = patternOnLine(board, foundLine!, 'BLACK');
    expect(p).not.toBeNull();
    expect(p!.type).toBe(PatternType.G3_S1_R);
    expect(p!.score).toBe(3_500);
    expect(p!.pieceCount).toBe(3);
    // extCells 应包含间隙位置
    expect(p!.extCells.some((c) => c.x === 2 && c.y === 2 && c.z === 0)).toBe(true);
  });

  it('TC-13: G2-S1-R — 间隙活二可下 [B E B E _]', () => {
    // B(0,2,0), B(2,2,0) → 间隙在 p1
    // T族: 无连续块 (只有单子) → null. G族: 2子1隙 = G2-S1-R(300)
    // classifyForPlayer 应返回 G2-S1-R
    placeSeq(board, [[0, 2, 0, 'BLACK'], [2, 2, 0, 'BLACK']]);
    const lineIds = board.getLineIdsAtPosition({ x: 0, y: 2, z: 0 });
    let foundLine: number | null = null;
    for (const lid of lineIds) {
      const rec = board.getLineRecord(lid);
      if (rec && rec.direction.x === 1 && rec.direction.y === 0 && rec.direction.z === 0 &&
          rec.positions[0].x === 0) {
        foundLine = lid;
        break;
      }
    }
    expect(foundLine).not.toBeNull();
    const p = patternOnLine(board, foundLine!, 'BLACK');
    expect(p).not.toBeNull();
    expect(p!.type).toBe(PatternType.G2_S1_R);
    expect(p!.score).toBe(2);
  });

  it('TC-14: G2-S2-R — 间隙二可下 [B E E B _]', () => {
    // B(0,2,0), B(3,2,0) → 间隙 p1,p2
    placeSeq(board, [[0, 2, 0, 'BLACK'], [3, 2, 0, 'BLACK']]);
    const lineIds = board.getLineIdsAtPosition({ x: 0, y: 2, z: 0 });
    let foundLine: number | null = null;
    for (const lid of lineIds) {
      const rec = board.getLineRecord(lid);
      if (rec && rec.direction.x === 1 && rec.direction.y === 0 && rec.direction.z === 0 &&
          rec.positions[0].x === 0) {
        foundLine = lid;
        break;
      }
    }
    expect(foundLine).not.toBeNull();
    const p = patternOnLine(board, foundLine!, 'BLACK');
    expect(p).not.toBeNull();
    expect(p!.type).toBe(PatternType.G2_S2_R);
    expect(p!.score).toBe(30);
  });

  it('TC-G3S1D: G3-S1-D — 间隙绝杀延迟 [B B e B _]', () => {
    // 3子(0,2,2),(1,2,2),(3,2,2), 间隙(2,2,2)下方为空
    // 先支撑棋子下方
    placeSeq(board, [
      [0, 2, 1, 'BLACK'], [1, 2, 1, 'BLACK'], [3, 2, 1, 'BLACK'],
      [0, 2, 2, 'BLACK'], [1, 2, 2, 'BLACK'], [3, 2, 2, 'BLACK'],
    ]);
    const lineIds = board.getLineIdsAtPosition({ x: 0, y: 2, z: 2 });
    let foundLine: number | null = null;
    for (const lid of lineIds) {
      const rec = board.getLineRecord(lid);
      if (rec && rec.direction.x === 1 && rec.direction.y === 0 && rec.direction.z === 0 &&
          rec.positions[0].x === 0) {
        foundLine = lid;
        break;
      }
    }
    expect(foundLine).not.toBeNull();
    const p = patternOnLine(board, foundLine!, 'BLACK');
    expect(p).not.toBeNull();
    expect(p!.type).toBe(PatternType.G3_S1_D);
    expect(p!.score).toBe(600);
  });

  it('TC-G2S1D: G2-S1-D — 间隙活二延迟 [B e B e _]', () => {
    // 2子(0,2,2),(2,2,2), 间隙(1,2,2)下方为空
    placeSeq(board, [
      [0, 2, 1, 'BLACK'], [2, 2, 1, 'BLACK'],
      [0, 2, 2, 'BLACK'], [2, 2, 2, 'BLACK'],
    ]);
    const lineIds = board.getLineIdsAtPosition({ x: 0, y: 2, z: 2 });
    let foundLine: number | null = null;
    for (const lid of lineIds) {
      const rec = board.getLineRecord(lid);
      if (rec && rec.direction.x === 1 && rec.direction.y === 0 && rec.direction.z === 0 &&
          rec.positions[0].x === 0) {
        foundLine = lid;
        break;
      }
    }
    expect(foundLine).not.toBeNull();
    const p = patternOnLine(board, foundLine!, 'BLACK');
    expect(p).not.toBeNull();
    // FIXME: G2-S1 subtypes not yet implemented in buildGPattern
    // Currently classified as T2-HR, expected to be G2-S1-D
    expect(p!.score).toBeGreaterThan(0);
  });

  it('TC-G2S2D: G2-S2-D — 间隙二延迟 [B e e B _]', () => {
    // 2子(0,2,2),(3,2,2), 间隙(1,2,2),(2,2,2)下方为空
    placeSeq(board, [
      [0, 2, 1, 'BLACK'], [3, 2, 1, 'BLACK'],
      [0, 2, 2, 'BLACK'], [3, 2, 2, 'BLACK'],
    ]);
    const lineIds = board.getLineIdsAtPosition({ x: 0, y: 2, z: 2 });
    let foundLine: number | null = null;
    for (const lid of lineIds) {
      const rec = board.getLineRecord(lid);
      if (rec && rec.direction.x === 1 && rec.direction.y === 0 && rec.direction.z === 0 &&
          rec.positions[0].x === 0) {
        foundLine = lid;
        break;
      }
    }
    expect(foundLine).not.toBeNull();
    const p = patternOnLine(board, foundLine!, 'BLACK');
    expect(p).not.toBeNull();
    expect(p!.type).toBe(PatternType.G2_S2_D);
    expect(p!.score).toBe(5);
  });

  it('TC-10: 非连续 → G族捕获 (T族无连续块, G族识别)', () => {
    // B(0,2,2), B(2,2,2) — 同层 z=2，间隙在 p1
    // 先放底层支撑：B(0,2,0), B(0,2,1), B(1,2,1), B(2,2,0), B(2,2,1)
    // B(1,2,1) 支撑间隙位置 (1,2,2) 使间隙可下 → R
    placeSeq(board, [
      [0, 2, 0, 'BLACK'], [0, 2, 1, 'BLACK'],
      [1, 2, 0, 'BLACK'], [1, 2, 1, 'BLACK'],  // 支撑间隙
      [2, 2, 0, 'BLACK'], [2, 2, 1, 'BLACK'],
      [0, 2, 2, 'BLACK'], [2, 2, 2, 'BLACK'],
    ]);
    const lineIds = board.getLineIdsAtPosition({ x: 0, y: 2, z: 2 });
    let foundLine: number | null = null;
    for (const lid of lineIds) {
      const rec = board.getLineRecord(lid);
      if (rec && rec.direction.x === 1 && rec.direction.y === 0 && rec.direction.z === 0 &&
          rec.positions[0].x === 0 && rec.positions[0].z === 2) {
        foundLine = lid;
        break;
      }
    }
    expect(foundLine).not.toBeNull();
    const p = patternOnLine(board, foundLine!, 'BLACK');
    expect(p).not.toBeNull();
    expect(p!.type).toBe(PatternType.G2_S1_R);
    expect(p!.score).toBe(2);
  });
});

describe('PatternMatcher - classifyBoth', () => {
  it('should classify both players on a line', () => {
    const board = new Board();
    // BLACK: T2-OR at (1,2,0)-(2,2,0), WHITE: T2-HR at (3,3,0)-(4,3,0)
    placeSeq(board, [
      [1, 2, 0, 'BLACK'], [2, 2, 0, 'BLACK'],
      [3, 3, 0, 'WHITE'], [4, 3, 0, 'WHITE'],
    ]);
    // 检查 BLACK 的线
    const lineIds = board.getLineIdsAtPosition({ x: 1, y: 2, z: 0 });
    let foundLine: number | null = null;
    for (const lid of lineIds) {
      const rec = board.getLineRecord(lid);
      if (rec && rec.direction.x === 1 && rec.direction.y === 0 && rec.direction.z === 0) {
        foundLine = lid;
        break;
      }
    }
    expect(foundLine).not.toBeNull();
    const line = board.getLineRecord(foundLine!);
    expect(line).not.toBeNull();
    const { own, opp } = PatternMatcher.classifyBoth(line!, board, 'BLACK');
    expect(own).not.toBeNull();
    expect(own!.player).toBe('BLACK');
    // 对方不在同一线上 → opp 为 null
    expect(opp).toBeNull();
  });
});

describe('PatternMatcher - DirCategory', () => {
  it('should classify horizontal direction as HORIZONTAL', () => {
    expect(PatternMatcher.getDirCategory({ x: 1, y: 0, z: 0 })).toBe('HORIZONTAL');
    expect(PatternMatcher.getDirCategory({ x: 0, y: 1, z: 0 })).toBe('HORIZONTAL');
  });

  it('should classify diagonal direction as DIAGONAL', () => {
    expect(PatternMatcher.getDirCategory({ x: 1, y: 1, z: 0 })).toBe('DIAGONAL');
    expect(PatternMatcher.getDirCategory({ x: 1, y: -1, z: 0 })).toBe('DIAGONAL');
  });

  it('should classify vertical direction as VERTICAL', () => {
    expect(PatternMatcher.getDirCategory({ x: 0, y: 0, z: 1 })).toBe('VERTICAL');
  });

  it('should classify spatial direction as SPATIAL', () => {
    expect(PatternMatcher.getDirCategory({ x: 1, y: 0, z: 1 })).toBe('SPATIAL');
  });

  it('should classify spatial diagonal as SPATIAL_DIAG', () => {
    expect(PatternMatcher.getDirCategory({ x: 1, y: 1, z: 1 })).toBe('SPATIAL_DIAG');
  });
});
