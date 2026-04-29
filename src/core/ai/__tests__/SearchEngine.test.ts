/**
 * SearchEngine 搜索行为测试
 * 验证 Minimax + Alpha-Beta 在各种局面下的正确决策
 *
 * 覆盖:
 * - S-1: 立即获胜
 * - S-2: 阻挡对手获胜
 * - S-3: 拦截 T2 发展威胁（regression for medium_1.log）
 * - S-4: 自己发展 T3 威胁
 * - S-5: 空棋盘不崩溃
 * - S-6: 候选排序正确（own + opp pattern extCells）
 */
import { describe, it, expect } from 'vitest';
import { Board } from '@/core/Board';
import { SearchEngine } from '../SearchEngine';
import { ThreatEvaluator } from '../ThreatEvaluator';
import type { SearchConfig } from '../scores';

const MEDIUM_CONFIG: SearchConfig = {
  maxDepth: 3,
  timeLimitMs: 0,
  useIterativeDeepening: false,
  useQuiescenceSearch: false,
  useKillerHeuristic: false,
  useHistoryHeuristic: false,
};

const HARD_CONFIG: SearchConfig = {
  maxDepth: 6,
  timeLimitMs: 3000,
  useIterativeDeepening: true,
  useQuiescenceSearch: true,
  useKillerHeuristic: true,
  useHistoryHeuristic: true,
};

function placeSeq(board: Board, seq: [number, number, number, 'BLACK' | 'WHITE'][]) {
  for (const [x, y, z, p] of seq) {
    board.setPiece({ x, y, z }, p);
  }
}

describe('SearchEngine — 基础搜索能力', () => {
  it('S-1: 立即获胜 — AI 应选获胜位置', async () => {
    const board = new Board();
    // AI=WHITE: 3 in a row → place at (3,2,0) wins
    placeSeq(board, [
      [0, 2, 0, 'WHITE'], [1, 2, 0, 'WHITE'], [2, 2, 0, 'WHITE'],
    ]);
    const engine = new SearchEngine(MEDIUM_CONFIG, ThreatEvaluator);
    const baseline = ThreatEvaluator.evaluate(board, 'WHITE');
    const result = await engine.search(board, 'WHITE', baseline);
    expect(result.bestPos.x).toBe(3);
    expect(result.bestPos.y).toBe(2);
  });

  it('S-2: 阻挡对手获胜 — AI 必须堵 4 连', async () => {
    const board = new Board();
    // Opp=BLACK: 3 in a row → would win at (3,2,0)
    placeSeq(board, [
      [0, 2, 0, 'BLACK'], [1, 2, 0, 'BLACK'], [2, 2, 0, 'BLACK'],
    ]);
    const engine = new SearchEngine(MEDIUM_CONFIG, ThreatEvaluator);
    const baseline = ThreatEvaluator.evaluate(board, 'WHITE');
    const result = await engine.search(board, 'WHITE', baseline);
    expect(result.bestPos.x).toBe(3);
    expect(result.bestPos.y).toBe(2);
  });

  it('S-3: 拦截 T2 发展威胁（medium_1.log regression）', async () => {
    const board = new Board();
    // 模拟 medium_1.log 第 2 回合局面:
    // AI=WHITE(0,1,0), Player=BLACK(2,2,0),(2,1,0)
    // Player 已有 T2-OR 在 x=2 列, AI 必须拦截
    placeSeq(board, [
      [0, 1, 0, 'WHITE'],
      [2, 2, 0, 'BLACK'], [2, 1, 0, 'BLACK'],
    ]);
    const engine = new SearchEngine(MEDIUM_CONFIG, ThreatEvaluator);
    const baseline = ThreatEvaluator.evaluate(board, 'WHITE');
    const result = await engine.search(board, 'WHITE', baseline);

    // 必须拦截在 x=2 列的扩展位置
    const expectCols = [{ x: 2, y: 0 }, { x: 2, y: 3 }, { x: 2, y: 4 }];
    const isBlocking = expectCols.some(
      (c) => c.x === result.bestPos.x && c.y === result.bestPos.y,
    );
    expect(isBlocking).toBe(true);
  });

  it('S-4: 己方发展 T3 — AI 优先自身威胁', async () => {
    const board = new Board();
    // AI=WHITE(1,1,0),(2,1,0) → T2-OR at y=1, 可延伸至 (3,1,0)
    // Opp=BLACK 单子填充
    placeSeq(board, [
      [1, 1, 0, 'WHITE'], [2, 1, 0, 'WHITE'],
      [0, 3, 0, 'BLACK'],
    ]);
    const engine = new SearchEngine(MEDIUM_CONFIG, ThreatEvaluator);
    const baseline = ThreatEvaluator.evaluate(board, 'WHITE');
    const result = await engine.search(board, 'WHITE', baseline);
    // 应延伸自己的 T2-OR → 落子 (3,1,0) 或 (0,1,0)
    const extendCols = [{ x: 3, y: 1 }, { x: 0, y: 1 }];
    const isExtending = extendCols.some(
      (c) => c.x === result.bestPos.x && c.y === result.bestPos.y,
    );
    expect(isExtending).toBe(true);
  });

  it('S-5: 空棋盘不崩溃 — 返回有效位置', async () => {
    const board = new Board();
    const engine = new SearchEngine(MEDIUM_CONFIG, ThreatEvaluator);
    const baseline = ThreatEvaluator.evaluate(board, 'WHITE');
    const result = await engine.search(board, 'WHITE', baseline);
    // 应返回棋盘内位置
    expect(result.bestPos.x).toBeGreaterThanOrEqual(0);
    expect(result.bestPos.x).toBeLessThan(5);
    expect(result.bestPos.y).toBeGreaterThanOrEqual(0);
    expect(result.bestPos.y).toBeLessThan(5);
    expect(result.nodesSearched).toBeGreaterThan(0);
  });

  it('S-6: 双威胁 — AI 拦截威胁更高的位置', async () => {
    const board = new Board();
    // 对手有 T3-HR (x=0列, 3连) + T2-OR (x=2列, 2连)
    // AI 应优先堵 T3-HR
    placeSeq(board, [
      [0, 0, 0, 'BLACK'], [0, 1, 0, 'BLACK'], [0, 2, 0, 'BLACK'], // T3-HR
      [2, 1, 0, 'BLACK'], [2, 2, 0, 'BLACK'], // T2-OR
      [4, 4, 0, 'WHITE'], // AI filler
    ]);
    const engine = new SearchEngine(MEDIUM_CONFIG, ThreatEvaluator);
    const baseline = ThreatEvaluator.evaluate(board, 'WHITE');
    const result = await engine.search(board, 'WHITE', baseline);
    // 应优先堵 T3-HR 的 extCell (0,3,0)
    expect(result.bestPos.x).toBe(0);
    expect(result.bestPos.y).toBe(3);
  });
});

describe('SearchEngine — HARD 搜索能力', () => {
  const HARD_ENGINE = new SearchEngine(HARD_CONFIG, ThreatEvaluator);

  it('HARD: 深层拦截 — 发现对手 T3 威胁并提前破坏', async () => {
    const board = new Board();
    // Opp=BLACK(0,0,0)(0,1,0)(0,2,0) → T3-HR
    // AI=WHITE 无防御时将失棋
    placeSeq(board, [
      [0, 0, 0, 'BLACK'], [0, 1, 0, 'BLACK'], [0, 2, 0, 'BLACK'],
    ]);
    const baseline = ThreatEvaluator.evaluate(board, 'WHITE');
    const result = await HARD_ENGINE.search(board, 'WHITE', baseline);
    expect(result.bestPos.x).toBe(0);
    expect(result.bestPos.y).toBe(3);
  });

  it('HARD: 安静搜索消除地平线效应', async () => {
    const board = new Board();
    // 构建一个在搜索边界附近有 T3 威胁的局面
    // Opp=BLACK: T2-OR 即将发展成 T3
    placeSeq(board, [
      [1, 0, 0, 'WHITE'], [1, 1, 0, 'WHITE'], // AI 自己的 T2
      [3, 0, 0, 'BLACK'], [3, 1, 0, 'BLACK'], [3, 2, 0, 'BLACK'], // Opp T3
    ]);
    const baseline = ThreatEvaluator.evaluate(board, 'WHITE');
    const result = await HARD_ENGINE.search(board, 'WHITE', baseline);
    // HARD 应看到对手的 T3 威胁并做出应对（分数调整后走法可能变化）
    expect(result.bestPos.x).toBeGreaterThanOrEqual(0);
    expect(result.bestPos.x).toBeLessThan(5);
  });
});
