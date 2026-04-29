import { describe, it } from 'vitest';
import { Board } from '@/core/Board';
import { ThreatEvaluator } from '../../ThreatEvaluator';
import { PatternMatcher } from '../../PatternMatcher';

describe('STACK ANALYSIS: why (2,2,1) scores same as (1,2,0)', () => {
  it('trace all 13 directions through (2,2,1) vs (1,2,0)', () => {
    const board = new Board();
    board.setPiece({x:2,y:2,z:0}, 'BLACK'); // player move

    // Position A: stacked (2,2,1)
    const posA = {x:2, y:2, z:1};
    // Position B: open (1,2,0)
    const posB = {x:1, y:2, z:0};

    // Check all lines through each position
    for (const [label, pos] of [['STACKED (2,2,1)', posA], ['OPEN (1,2,0)', posB]] as const) {
      console.log(`\n=== ${label} ===`);
      const board2 = board.clone();
      board2.setPiece(pos, 'WHITE');

      const lineIds = board2.getLineIdsAtPosition(pos);
      let ownLines = 0, oppLines = 0, mixLines = 0, emptyLines = 0;
      let ownScore = 0, oppScore = 0;

      for (const lid of lineIds) {
        const rec = board2.getLineRecord(lid);
        if (!rec) continue;
        const { own, opp } = PatternMatcher.classifyBoth(rec, board2, 'WHITE');
        if (own) { ownLines++; ownScore += own.score; }
        if (opp) { oppLines++; oppScore += opp.score; }
        if (!own && !opp && rec.blackCount > 0 && rec.whiteCount > 0) mixLines++;
        if (!own && !opp && rec.blackCount === 0 && rec.whiteCount === 0) emptyLines++;
      }

      console.log(`  own patterns: ${ownLines} (score=${ownScore})`);
      console.log(`  opp patterns: ${oppLines} (score=${oppScore})`);
      console.log(`  MIX lines: ${mixLines}`);
      console.log(`  empty lines: ${emptyLines}`);
      console.log(`  total lines: ${lineIds.length}`);

      // Classify the vertical line specifically
      const vertLineIds = board2.getLineIdsAtPosition(pos).filter(lid => {
        const rec = board2.getLineRecord(lid);
        return rec && rec.direction.x === 0 && rec.direction.y === 0 && rec.direction.z === 1;
      });
      for (const vlid of vertLineIds) {
        const rec = board2.getLineRecord(vlid);
        if (!rec) continue;
        const pieces = rec.positions.map(p => board2.getPiece(p));
        console.log(`  VERTICAL line: ${pieces.map(p => p[0]).join(',')} blackCount=${rec.blackCount} whiteCount=${rec.whiteCount}`);
        const { own, opp } = PatternMatcher.classifyBoth(rec, board2, 'WHITE');
        console.log(`    classifyBoth: own=${own?.type ?? 'null'}, opp=${opp?.type ?? 'null'}`);
      }
    }
  });

  it('compare: (2,2) center clean vs (2,2) stacked vs (1,2) adjacent — natural scores', () => {
    // 3 separate boards to avoid contamination
    const results: any[] = [];
    
    // Board 1: Stacked — Player at (2,2,0), AI at (2,2,1)
    {
      const b = new Board();
      b.setPiece({x:2,y:2,z:0}, 'BLACK');
      b.setPiece({x:2,y:2,z:1}, 'WHITE');
      const r = ThreatEvaluator.evaluate(b, 'WHITE');
      results.push({label: '(2,2,1) stacked', own: r.ownScore, opp: r.oppScore, final: r.finalScore,
        ownPatterns: r.ownPatterns.map(p => p.type), oppPatterns: r.oppPatterns.map(p => p.type)});
    }
    
    // Board 2: Open center — Player at (1,1,0), AI at (2,2,0)  (different game, but for comparison)
    {
      const b = new Board();
      b.setPiece({x:1,y:1,z:0}, 'BLACK');
      b.setPiece({x:2,y:2,z:0}, 'WHITE');
      const r = ThreatEvaluator.evaluate(b, 'WHITE');
      results.push({label: '(2,2,0) clean center', own: r.ownScore, opp: r.oppScore, final: r.finalScore,
        ownPatterns: r.ownPatterns.map(p => p.type), oppPatterns: r.oppPatterns.map(p => p.type)});
    }

    // Board 3: Adjacent open — Player at (2,2,0), AI at (1,2,0)
    {
      const b = new Board();
      b.setPiece({x:2,y:2,z:0}, 'BLACK');
      b.setPiece({x:1,y:2,z:0}, 'WHITE');
      const r = ThreatEvaluator.evaluate(b, 'WHITE');
      results.push({label: '(1,2,0) adjacent open', own: r.ownScore, opp: r.oppScore, final: r.finalScore,
        ownPatterns: r.ownPatterns.map(p => p.type), oppPatterns: r.oppPatterns.map(p => p.type)});
    }

    // Board 4: Player at (2,2,0), AI at (2,2,1) but with evaluation from AI perspective
    // Already done above

    // Board 5: What about vertical potential? (2,2,1) has B below → vertical is MIX
    // (1,2,0) has all 13 directions open → more potential
    {
      const b = new Board();
      b.setPiece({x:2,y:2,z:0}, 'BLACK');
      b.setPiece({x:1,y:2,z:0}, 'WHITE');
      // Now count how many "open directions" (not MIX) exist
      const pos = {x:1,y:2,z:0};
      const lineIds = b.getLineIdsAtPosition(pos);
      let openDirs = 0, blockedDirs = 0;
      for (const lid of lineIds) {
        const rec = b.getLineRecord(lid);
        if (!rec) continue;
        if (rec.blackCount > 0 && rec.whiteCount > 0) blockedDirs++;
        else openDirs++;
      }
      console.log(`\n(1,2,0): ${openDirs} open directions, ${blockedDirs} blocked (total ${lineIds.length})`);
    }
    {
      const b = new Board();
      b.setPiece({x:2,y:2,z:0}, 'BLACK');
      b.setPiece({x:2,y:2,z:1}, 'WHITE');
      const pos = {x:2,y:2,z:1};
      const lineIds = b.getLineIdsAtPosition(pos);
      let openDirs = 0, blockedDirs = 0;
      for (const lid of lineIds) {
        const rec = b.getLineRecord(lid);
        if (!rec) continue;
        if (rec.blackCount > 0 && rec.whiteCount > 0) blockedDirs++;
        else openDirs++;
      }
      console.log(`(2,2,1): ${openDirs} open directions, ${blockedDirs} blocked (total ${lineIds.length})`);
    }

    for (const r of results) {
      console.log(`\n${r.label}: own=${r.own} opp=${r.opp} final=${r.final}`);
      console.log(`  ownPatterns: ${r.ownPatterns.join(',') || 'none'}`);
      console.log(`  oppPatterns: ${r.oppPatterns.join(',') || 'none'}`);
    }
  });
});
