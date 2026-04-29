import { describe, it, expect } from 'vitest';
import { Board } from '@/core/Board';
import { ThreatEvaluator } from '../../ThreatEvaluator';
import { SearchEngine } from '../../SearchEngine';
import { AIPlayerV2 } from '../../AIPlayerV2';

describe('DEBUG: E-7 score trace', () => {
  it('trace evaluateAllCandidates for E-7', () => {
    const board = new Board();
    board.setPiece({x:0, y:2, z:0}, 'BLACK');
    board.setPiece({x:2, y:2, z:0}, 'BLACK');
    board.setPiece({x:3, y:3, z:0}, 'WHITE');

    const baseline = ThreatEvaluator.evaluate(board, 'WHITE');
    console.log('=== BASELINE ===');
    console.log('oppPatterns:', JSON.stringify(baseline.oppPatterns.map(p => ({type: p.type, score: p.score, extCells: p.extCells}))));
    console.log('ownPatterns:', JSON.stringify(baseline.ownPatterns.map(p => ({type: p.type, score: p.score, extCells: p.extCells}))));
    console.log('finalScore:', baseline.finalScore, 'ownScore:', baseline.ownScore, 'oppScore:', baseline.oppScore);

    const candidates = board.getAvailableColumns();
    for (const col of candidates) {
      const z = board.findDropPosition(col.x, col.y);
      if (z === -1) continue;
      const pos = { x: col.x, y: col.y, z };
      board.setPiece(pos, 'WHITE');
      const report = ThreatEvaluator.evaluateIncremental(baseline, board, pos, 'WHITE');
      board.setPiece(pos, 'EMPTY');
      const score = report.finalScore;
      console.log(`WHITE at (${col.x},${col.y},${z}): finalScore=${score} ownScore=${report.ownScore} oppScore=${report.oppScore}`);
    }

    // Now check what AIPlayerV2 returns
    const ai = new AIPlayerV2('EASY');
    ai.setPiece('WHITE');
    const result = ai.calculateBestMoveSync(board);
    console.log(`\nAIPlayerV2 EASY picks: (${result.x}, ${result.y}), score=${result.score}`);
    expect(true).toBe(true);
  });

  it('trace S-3 scores', () => {
    const board = new Board();
    board.setPiece({x:0, y:1, z:0}, 'WHITE');
    board.setPiece({x:2, y:2, z:0}, 'BLACK');
    board.setPiece({x:2, y:1, z:0}, 'BLACK');

    const baseline = ThreatEvaluator.evaluate(board, 'WHITE');
    console.log('\n=== S-3 BASELINE ===');
    console.log('oppPatterns:', JSON.stringify(baseline.oppPatterns.map(p => ({type: p.type, score: p.score, extCells: p.extCells}))));
    console.log('ownPatterns:', JSON.stringify(baseline.ownPatterns.map(p => ({type: p.type, score: p.score, extCells: p.extCells}))));
    console.log('finalScore:', baseline.finalScore, 'ownScore:', baseline.ownScore, 'oppScore:', baseline.oppScore);

    const candidates = board.getAvailableColumns();
    for (const col of candidates) {
      const z = board.findDropPosition(col.x, col.y);
      if (z === -1) continue;
      const pos = { x: col.x, y: col.y, z };
      board.setPiece(pos, 'WHITE');
      const report = ThreatEvaluator.evaluateIncremental(baseline, board, pos, 'WHITE');
      board.setPiece(pos, 'EMPTY');
      const score = report.finalScore;
      console.log(`WHITE at (${col.x},${col.y},${z}): finalScore=${score} own=${report.ownScore} opp=${report.oppScore}`);
    }
    expect(true).toBe(true);
  });

  it('trace SearchEngine S-3', () => {
    const board = new Board();
    board.setPiece({x:0, y:1, z:0}, 'WHITE');
    board.setPiece({x:2, y:2, z:0}, 'BLACK');
    board.setPiece({x:2, y:1, z:0}, 'BLACK');

    const baseline = ThreatEvaluator.evaluate(board, 'WHITE');
    const engine = new SearchEngine({
      maxDepth: 3,
      timeLimitMs: 0,
      useIterativeDeepening: false,
      useQuiescenceSearch: false,
      useKillerHeuristic: false,
      useHistoryHeuristic: false,
    }, ThreatEvaluator);

    const result = engine.searchSync(board, 'WHITE', baseline);
    console.log(`\nSearchEngine S-3 result: (${result.bestPos.x}, ${result.bestPos.y}, ${result.bestPos.z}), score=${result.bestScore}, nodes=${result.nodesSearched}`);
    console.log(`Expected: (2,0), (2,3), (2,4) — match: ${[{x:2,y:0},{x:2,y:3},{x:2,y:4}].some(c => c.x === result.bestPos.x && c.y === result.bestPos.y)}`);
    expect(true).toBe(true);
  });
});
