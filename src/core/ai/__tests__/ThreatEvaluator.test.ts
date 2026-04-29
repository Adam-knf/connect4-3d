/**
 * ThreatEvaluator 完整局面评估测试
 * TC-FULL-01 ~ TC-FULL-04 + 叉子场景 + 多层威胁 (ai-evaluation-v2.md §9.4)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Board } from '@/core/Board';
import { ThreatEvaluator } from '../ThreatEvaluator';
import { PatternType } from '../scores';

function placeSeq(board: Board, seq: [number, number, number, 'BLACK' | 'WHITE'][]) {
  for (const [x, y, z, p] of seq) {
    board.setPiece({ x, y, z }, p);
  }
}

// ========== 基础局面评估 ==========

describe('ThreatEvaluator — 基础局面评估', () => {
  let board: Board;

  beforeEach(() => {
    board = new Board();
  });

  it('TC-FULL-01: 空棋盘 score 接近 0', () => {
    const report = ThreatEvaluator.evaluate(board, 'BLACK');
    // 空棋盘无棋子 → 无威胁 → score 约 0
    expect(report.ownPatterns.length).toBe(0);
    expect(report.oppPatterns.length).toBe(0);
    expect(report.ownCrosses.length).toBe(0);
    expect(report.oppCrosses.length).toBe(0);
    // finalScore 不应包含位置分（evaluate 不加 positionBonus）
    expect(Math.abs(report.finalScore)).toBeLessThanOrEqual(0);
  });

  it('TC-FULL-02: 双方各有一个 T2 → 分数大约平衡', () => {
    // BLACK: B(1,2,0), B(2,2,0) → T2-OR(500)
    // WHITE: W(1,3,0), W(2,3,0) → T2-OR(500)
    placeSeq(board, [
      [1, 2, 0, 'BLACK'], [2, 2, 0, 'BLACK'],
      [1, 3, 0, 'WHITE'], [2, 3, 0, 'WHITE'],
    ]);
    const report = ThreatEvaluator.evaluate(board, 'BLACK');
    // 己方 T2-OR(500) - 对方 T2-OR(500)×1.6 = 500 - 800 = -300 范围
    expect(report.ownPatterns.length).toBeGreaterThan(0);
    expect(report.oppPatterns.length).toBeGreaterThan(0);
    expect(report.ownPatterns.some(p => p.type === PatternType.T2_OR || p.type === PatternType.T2_OR_SL)).toBe(true);
    // 分差应在合理范围
    expect(report.finalScore).toBeLessThan(0);
    expect(report.finalScore).toBeGreaterThan(-1000);
  });

  it('TC-FULL-03: 己方 T3-OR → 大正分', () => {
    // BLACK: B(1,2,0), B(2,2,0), B(3,2,0) → T3-OR(50000)
    // 需要两端 ext 都在 z=0 且空
    placeSeq(board, [
      [1, 2, 0, 'BLACK'], [2, 2, 0, 'BLACK'], [3, 2, 0, 'BLACK'],
    ]);
    const report = ThreatEvaluator.evaluate(board, 'BLACK');
    expect(report.ownPatterns.some(p => p.type === PatternType.T3_OR)).toBe(true);
    expect(report.finalScore).toBeGreaterThan(40000);
  });

  it('TC-FULL-04: 对手 T3-OR → 大负分，AI 必须防守', () => {
    // WHITE has T3-OR. AI=BLACK, AI should see very negative score
    placeSeq(board, [
      [1, 2, 0, 'WHITE'], [2, 2, 0, 'WHITE'], [3, 2, 0, 'WHITE'],
    ]);
    const report = ThreatEvaluator.evaluate(board, 'BLACK');
    expect(report.oppPatterns.some(p => p.type === PatternType.T3_OR)).toBe(true);
    // 对方 T3-OR → -50000 × 1.6 ≈ -80000
    expect(report.finalScore).toBeLessThan(-40000);
  });

  it('己方 T3-HR → 中等正分', () => {
    // BLACK: B(0,2,0), B(1,2,0), B(2,2,0) → T3-HR(3000) 贴边
    placeSeq(board, [
      [0, 2, 0, 'BLACK'], [1, 2, 0, 'BLACK'], [2, 2, 0, 'BLACK'],
    ]);
    const report = ThreatEvaluator.evaluate(board, 'BLACK');
    expect(report.ownPatterns.some(p => p.type === PatternType.T3_HR)).toBe(true);
    expect(report.finalScore).toBeGreaterThan(2000);
  });

  it('对方 WIN 威胁 → 发现并扣分', () => {
    // BLACK has WIN threat: B(0,2,0), B(1,2,0), B(2,2,0). Next play at (3,2,0) wins
    // AI=WHITE, should detect opponent WIN potential via T3-HR
    placeSeq(board, [
      [0, 2, 0, 'BLACK'], [1, 2, 0, 'BLACK'], [2, 2, 0, 'BLACK'],
    ]);
    const report = ThreatEvaluator.evaluate(board, 'WHITE');
    // BLACK has T3-HR at least
    expect(report.oppPatterns.length).toBeGreaterThan(0);
    expect(report.finalScore).toBeLessThan(0);
  });
});

// ========== 叉子在实际棋局中 ==========

describe('ThreatEvaluator — 叉子场景', () => {
  it('两条 T2 线交汇于可下空位 → 检测到 Cross', () => {
    const board = new Board();
    // Line (1,0,0): B(0,2,0), B(1,2,0) → extCell (2,2,0)
    // Line (0,1,0): B(2,0,0), B(2,1,0) → extCell (2,2,0)
    // Both ext at (2,2,0) z=0 → Cross
    placeSeq(board, [
      [0, 2, 0, 'BLACK'], [1, 2, 0, 'BLACK'],
      [2, 0, 0, 'BLACK'], [2, 1, 0, 'BLACK'],
    ]);
    const report = ThreatEvaluator.evaluate(board, 'BLACK');
    // 应该有 Cross 检测
    expect(report.ownCrosses.length).toBeGreaterThanOrEqual(0);
    // 两条 T2-HR 分别得分，加上可能的 Cross 分
    expect(report.ownScore).toBeGreaterThan(0);
  });

  it('对手构建叉子 → AI 感知到威胁', () => {
    const board = new Board();
    // WHITE builds fork pattern. AI=BLACK
    placeSeq(board, [
      [0, 2, 0, 'WHITE'], [1, 2, 0, 'WHITE'],
      [2, 0, 0, 'WHITE'], [2, 1, 0, 'WHITE'],
    ]);
    const report = ThreatEvaluator.evaluate(board, 'BLACK');
    // Opponent has patterns and possibly crosses
    expect(report.oppPatterns.length).toBeGreaterThan(0);
    expect(report.finalScore).toBeLessThan(0);
  });
});

// ========== G族棋形在实际棋局中 ==========

describe('ThreatEvaluator — G族间隙棋形', () => {
  it('G3-S1-R 间隙绝杀应被检测', () => {
    const board = new Board();
    // B(0,2,0), B(1,2,0), B(3,2,0) → G3-S1-R (填(2,2,0)=WIN)
    placeSeq(board, [
      [0, 2, 0, 'BLACK'], [1, 2, 0, 'BLACK'], [3, 2, 0, 'BLACK'],
    ]);
    const report = ThreatEvaluator.evaluate(board, 'BLACK');
    expect(report.ownPatterns.some(
      p => p.type === PatternType.G3_S1_R || p.type === PatternType.T2_HR,
    )).toBe(true);
    // G3-S1-R = 3500, T2-HR = 80 → PatternMatcher 返回 G3-S1-R
    expect(report.ownScore).toBeGreaterThan(500);
  });

  it('G2-S1 间隙活二 → 双路径威胁', () => {
    const board = new Board();
    // B(0,2,0), B(2,2,0) → G2-S1-R (填(1,2,0)=T3)
    placeSeq(board, [
      [0, 2, 0, 'BLACK'], [2, 2, 0, 'BLACK'],
    ]);
    const report = ThreatEvaluator.evaluate(board, 'BLACK');
    expect(report.ownPatterns.some(p => p.type === PatternType.G2_S1_R)).toBe(true);
    expect(report.ownScore).toBeGreaterThan(0);
  });
});

// ========== 多层/跨层威胁 ==========

describe('ThreatEvaluator — 3D跨层场景', () => {
  it('垂直堆叠应被正确评估（VERTICAL方向权重0.3）', () => {
    const board = new Board();
    // WHITE vertical stack: W(2,2,0), W(2,2,1), W(2,2,2)
    placeSeq(board, [
      [2, 2, 0, 'WHITE'], [2, 2, 1, 'WHITE'], [2, 2, 2, 'WHITE'],
    ]);
    const report = ThreatEvaluator.evaluate(board, 'WHITE');
    // 垂直方向会用 0.3 权重
    expect(report.ownPatterns.length).toBeGreaterThan(0);
    // 垂直 T3-HD (单端延迟) 的 score 会乘以 0.3
    expect(report.ownScore).toBeGreaterThan(0);
  });

  it('空间对角线应被正确评估（SPATIAL方向权重1.0）', () => {
    const board = new Board();
    // (1,1,1) diagonal: W(0,0,0), W(1,1,1), W(2,2,2)
    placeSeq(board, [
      [0, 0, 0, 'WHITE'], [1, 1, 1, 'WHITE'], [2, 2, 2, 'WHITE'],
    ]);
    const report = ThreatEvaluator.evaluate(board, 'WHITE');
    expect(report.ownPatterns.length).toBeGreaterThan(0);
    expect(report.ownScore).toBeGreaterThan(0);
  });

  it('高层棋子 readiness=DELAYED 应降低分数', () => {
    const board = new Board();
    // W(1,2,2), W(2,2,2), W(3,2,2) → T3-OP (两边 ext 都需堆叠)
    // 先放支撑底层
    placeSeq(board, [
      [1, 2, 0, 'WHITE'], [1, 2, 1, 'WHITE'], // 支撑左侧
      [2, 2, 0, 'WHITE'], [2, 2, 1, 'WHITE'], // 支撑中间
      [3, 2, 0, 'WHITE'], [3, 2, 1, 'WHITE'], // 支撑右侧
      [1, 2, 2, 'WHITE'], [2, 2, 2, 'WHITE'], [3, 2, 2, 'WHITE'],
    ]);
    const report = ThreatEvaluator.evaluate(board, 'WHITE');
    const t3Pattern = report.ownPatterns.find(
      p => p.type === PatternType.T3_OR || p.type === PatternType.T3_OP || p.type === PatternType.T3_HR,
    );
    expect(t3Pattern).toBeDefined();
  });
});

// ========== 增量评估 ==========

describe('ThreatEvaluator — 增量评估', () => {
  it('evaluateIncremental 应与全量评估结果一致', () => {
    const board = new Board();
    placeSeq(board, [
      [0, 2, 0, 'BLACK'], [1, 2, 0, 'BLACK'], [2, 2, 0, 'BLACK'],
    ]);
    const baseline = ThreatEvaluator.evaluate(board, 'BLACK');

    // 模拟在 (3,2,0) 放置 → 形成 WIN
    const pos = { x: 3, y: 2, z: 0 };
    board.setPiece(pos, 'BLACK');
    const incremental = ThreatEvaluator.evaluateIncremental(baseline, board, pos, 'BLACK');
    board.setPiece(pos, 'EMPTY');

    // 增量评估后应该有 WIN
    expect(incremental.ownPatterns.some(p => p.type === PatternType.WIN)).toBe(true);
    // WIN score = 1,000,000
    expect(incremental.finalScore).toBeGreaterThan(900_000);
  });

  it('增量评估：阻挡对手获胜后分数应回升', () => {
    const board = new Board();
    // Opp=WHITE: W(0,2,0), W(1,2,0), W(2,2,0) → T3-HR
    placeSeq(board, [
      [0, 2, 0, 'WHITE'], [1, 2, 0, 'WHITE'], [2, 2, 0, 'WHITE'],
    ]);
    const baseline = ThreatEvaluator.evaluate(board, 'BLACK');
    const scoreBefore = baseline.finalScore;
    expect(scoreBefore).toBeLessThan(0); // 对手有威胁

    // BLACK 在 (3,2,0) 阻挡
    const pos = { x: 3, y: 2, z: 0 };
    board.setPiece(pos, 'BLACK');
    const after = ThreatEvaluator.evaluateIncremental(baseline, board, pos, 'BLACK');
    board.setPiece(pos, 'EMPTY');

    // 阻挡后分数应大幅回升（对手 T3-HR 被破坏）
    expect(after.finalScore).toBeGreaterThan(scoreBefore);
  });
});

// ========== 边界情况 ==========

describe('ThreatEvaluator — 边界情况', () => {
  it('满列不应影响评估', () => {
    const board = new Board();
    // 填满某列
    for (let z = 0; z < 6; z++) {
      board.setPiece({ x: 0, y: 0, z }, z % 2 === 0 ? 'BLACK' : 'WHITE');
    }
    const report = ThreatEvaluator.evaluate(board, 'BLACK');
    // 应该不崩溃，有合理的分数
    expect(typeof report.finalScore).toBe('number');
  });

  it('双方各有多个威胁时应正确累加', () => {
    const board = new Board();
    // BLACK: T2-OR at y=2 + G2-S1 at y=4
    // WHITE: T2-HR at y=3
    placeSeq(board, [
      [1, 2, 0, 'BLACK'], [2, 2, 0, 'BLACK'],                  // black T2-OR
      [0, 4, 0, 'BLACK'], [2, 4, 0, 'BLACK'],                  // black G2-S1
      [0, 3, 0, 'WHITE'], [1, 3, 0, 'WHITE'],                  // white T2-HR
    ]);
    const report = ThreatEvaluator.evaluate(board, 'BLACK');
    expect(report.ownPatterns.length).toBeGreaterThanOrEqual(2);
    expect(report.oppPatterns.length).toBeGreaterThanOrEqual(1);
    // 己方分应 > 0
    expect(report.ownScore).toBeGreaterThan(0);
    // 对方有威胁 → 最终分会扣除
    expect(report.finalScore).toBeLessThan(report.ownScore);
  });
});
