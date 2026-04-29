/**
 * CORRECT 3-ply manual minimax trace (matches SearchEngine depth=2 internally)
 *
 * Search path for MEDIUM (searchDepth=3):
 *   Root: WHITE places → minimax(depth=2, isMaximizing=false)
 *     L2: BLACK places → minimax(depth=1, isMaximizing=true)
 *       L1: WHITE places → minimax(depth=0,isMax=false) → evaluate()
 *
 * Only trace (1,2) vs (2,2) and their top BLACK responses.
 */
import { describe, it } from 'vitest';
import { Board } from '@/core/Board';
import { ThreatEvaluator } from '../../ThreatEvaluator';
import { SearchEngine } from '../../SearchEngine';
import { positionBonus } from '../../scores';

function log(...args: any[]) { console.log(...args); }

describe('CORRECT 3-ply trace: (1,2) vs (2,2)', () => {
  it('manual minimax for (1,2)', () => {
    const board = new Board();
    board.setPiece({ x: 2, y: 2, z: 0 }, 'BLACK');

    const baseline = ThreatEvaluator.evaluate(board, 'WHITE');

    // Root: WHITE(1,2,0)
    const rootZ = board.findDropPosition(1, 2);
    board.setPiece({ x: 1, y: 2, z: rootZ }, 'WHITE');
    const afterRoot = ThreatEvaluator.evaluateIncremental(baseline, board, { x: 1, y: 2, z: rootZ }, 'WHITE');

    log('\n=== WHITE(1,2,0) root ===');
    log(`afterPlace: ownScore=${afterRoot.ownScore} oppScore=${afterRoot.oppScore}`);
    log(`ownPatterns: ${afterRoot.ownPatterns.map(p => p.type+':'+p.score)}`);
    log(`oppPatterns: ${afterRoot.oppPatterns.map(p => p.type+':'+p.score)}`);

    // Level 2: BLACK minimizes. Check specific BLACK responses.
    const blackCandidates = [
      { x: 2, y: 2 }, // stack above own piece
      { x: 2, y: 1 }, // adjacent to own T2
      { x: 0, y: 1 },
    ];

    let bestBlackScore = Infinity;
    let bestBlackPos: any = null;

    for (const bc of blackCandidates) {
      const bz = board.findDropPosition(bc.x, bc.y);
      if (bz === -1) continue;
      board.setPiece({ x: bc.x, y: bc.y, z: bz }, 'BLACK');

      // Level 1: WHITE maximizes
      let bestWhiteScore = -Infinity;
      const whiteCandidates = [
        { x: 1, y: 1 }, { x: 1, y: 3 }, { x: 0, y: 2 },
        { x: 3, y: 2 }, { x: 2, y: 3 },
      ];
      for (const wc of whiteCandidates) {
        const wz = board.findDropPosition(wc.x, wc.y);
        if (wz === -1) continue;
        board.setPiece({ x: wc.x, y: wc.y, z: wz }, 'WHITE');

        // Depth 0: full evaluate
        const leafScore = ThreatEvaluator.evaluate(board, 'WHITE').finalScore;
        board.setPiece({ x: wc.x, y: wc.y, z: wz }, 'EMPTY');

        if (leafScore > bestWhiteScore) bestWhiteScore = leafScore;
      }

      board.setPiece({ x: bc.x, y: bc.y, z: bz }, 'EMPTY');

      log(`  BLACK(${bc.x},${bc.y},${bz}): WHITE_best = ${bestWhiteScore}`);
      if (bestWhiteScore < bestBlackScore) {
        bestBlackScore = bestWhiteScore;
        bestBlackPos = bc;
      }
    }

    board.setPiece({ x: 1, y: 2, z: rootZ }, 'EMPTY');
    log(`  → minimax rawScore = ${bestBlackScore} (BLACK best at ${bestBlackPos?.x},${bestBlackPos?.y})`);

    const pb = positionBonus(1, 2, rootZ, 'EMPTY', 'WHITE');
    log(`  → + positionBonus(${pb}) = ${bestBlackScore + pb}`);
  });

  it('manual minimax for (2,2)', () => {
    const board = new Board();
    board.setPiece({ x: 2, y: 2, z: 0 }, 'BLACK');

    const baseline = ThreatEvaluator.evaluate(board, 'WHITE');

    // Root: WHITE(2,2,1)
    const rootZ = board.findDropPosition(2, 2);
    board.setPiece({ x: 2, y: 2, z: rootZ }, 'WHITE');
    const afterRoot = ThreatEvaluator.evaluateIncremental(baseline, board, { x: 2, y: 2, z: rootZ }, 'WHITE');

    log('\n=== WHITE(2,2,1) root ===');
    log(`afterPlace: ownScore=${afterRoot.ownScore} oppScore=${afterRoot.oppScore}`);
    log(`ownPatterns: ${afterRoot.ownPatterns.map(p => p.type+':'+p.score)}`);
    log(`oppPatterns: ${afterRoot.oppPatterns.map(p => p.type+':'+p.score)}`);

    // Level 2: BLACK minimizes
    const blackCandidates = [
      { x: 1, y: 2 }, { x: 2, y: 1 }, { x: 2, y: 3 },
      { x: 3, y: 2 }, { x: 0, y: 2 },
    ];

    let bestBlackScore = Infinity;
    let bestBlackPos: any = null;

    for (const bc of blackCandidates) {
      const bz = board.findDropPosition(bc.x, bc.y);
      if (bz === -1) continue;
      board.setPiece({ x: bc.x, y: bc.y, z: bz }, 'BLACK');

      // Level 1: WHITE maximizes
      let bestWhiteScore = -Infinity;
      const whiteCandidates = [
        { x: 1, y: 2 }, { x: 2, y: 1 }, { x: 2, y: 3 },
        { x: 3, y: 2 }, { x: 0, y: 2 },
        { x: 1, y: 1 }, { x: 3, y: 3 },
      ];
      for (const wc of whiteCandidates) {
        const wz = board.findDropPosition(wc.x, wc.y);
        if (wz === -1) continue;
        board.setPiece({ x: wc.x, y: wc.y, z: wz }, 'WHITE');

        // Depth 0: full evaluate
        const leafScore = ThreatEvaluator.evaluate(board, 'WHITE').finalScore;
        board.setPiece({ x: wc.x, y: wc.y, z: wz }, 'EMPTY');

        if (leafScore > bestWhiteScore) bestWhiteScore = leafScore;
      }

      board.setPiece({ x: bc.x, y: bc.y, z: bz }, 'EMPTY');

      log(`  BLACK(${bc.x},${bc.y},${bz}): WHITE_best = ${bestWhiteScore}`);
      if (bestWhiteScore < bestBlackScore) {
        bestBlackScore = bestWhiteScore;
        bestBlackPos = bc;
      }
    }

    board.setPiece({ x: 2, y: 2, z: rootZ }, 'EMPTY');
    log(`  → minimax rawScore = ${bestBlackScore} (BLACK best at ${bestBlackPos?.x},${bestBlackPos?.y})`);

    const below = board.getPiece({ x: 2, y: 2, z: rootZ - 1 });
    const pb = positionBonus(2, 2, rootZ, below, 'WHITE');
    log(`  → + positionBonus(${pb}) = ${bestBlackScore + pb}`);
  });

  it('SearchEngine actual result for reference', () => {
    const board = new Board();
    board.setPiece({ x: 2, y: 2, z: 0 }, 'BLACK');

    const engine = new SearchEngine({
      maxDepth: 3, timeLimitMs: 0,
      useIterativeDeepening: false, useQuiescenceSearch: false,
      useKillerHeuristic: false, useHistoryHeuristic: false,
    }, ThreatEvaluator);
    const baseline = ThreatEvaluator.evaluate(board, 'WHITE');
    const result = engine.searchSync(board, 'WHITE', baseline);
    log(`\nSearchEngine: (${result.bestPos.x},${result.bestPos.y}) bestScore=${result.bestScore} nodes=${result.nodesSearched}`);
  });

  it('compare: evaluate the two final board states directly', () => {
    log('\n=== Direct comparison of 2-move board states ===');

    // State A: Player(2,2,0) + AI(1,2,0)
    const boardA = new Board();
    boardA.setPiece({ x: 2, y: 2, z: 0 }, 'BLACK');
    boardA.setPiece({ x: 1, y: 2, z: 0 }, 'WHITE');
    const evalA = ThreatEvaluator.evaluate(boardA, 'WHITE');
    log(`Board A [B(2,2,0), W(1,2,0)]:`);
    log(`  ownPatterns: ${evalA.ownPatterns.map(p => p.type+':'+p.score).join(',') || 'none'}`);
    log(`  oppPatterns: ${evalA.oppPatterns.map(p => p.type+':'+p.score).join(',') || 'none'}`);
    log(`  finalScore: ${evalA.finalScore}`);

    // State B: Player(2,2,0) + AI(2,2,1)
    const boardB = new Board();
    boardB.setPiece({ x: 2, y: 2, z: 0 }, 'BLACK');
    boardB.setPiece({ x: 2, y: 2, z: 1 }, 'WHITE');
    const evalB = ThreatEvaluator.evaluate(boardB, 'WHITE');
    log(`Board B [B(2,2,0), W(2,2,1)]:`);
    log(`  ownPatterns: ${evalB.ownPatterns.map(p => p.type+':'+p.score).join(',') || 'none'}`);
    log(`  oppPatterns: ${evalB.oppPatterns.map(p => p.type+':'+p.score).join(',') || 'none'}`);
    log(`  finalScore: ${evalB.finalScore}`);
  });
});
