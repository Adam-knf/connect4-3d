/**
 * STEP-BY-STEP TRACE: MEDIUM AI 第二步走 (2,2,1) 的完整决策链路
 *
 * 局面: Player=BLACK plays (2,2,0). AI=WHITE responds.
 * 问题: 为什么 AI 走 (2,2,1) 叠高，而不是 (1,2,0) 打开新局面？
 *
 * 追踪路径:
 *   1. ThreatEvaluator.evaluate()      → 全盘基线分
 *   2. getSortedCandidates()           → 候选排序优先级
 *   3. search() root loop              → 根节点 minimax 分数
 *   4. minimax() depth=3               → 递归搜索
 *   5. 最终比较
 */
import { describe, it } from 'vitest';
import { Board } from '@/core/Board';
import { ThreatEvaluator } from '../../ThreatEvaluator';
import { SearchEngine } from '../../SearchEngine';
import { AIPlayerV2 } from '../../AIPlayerV2';
import { positionBonus } from '../../scores';

function log(...args: any[]) { console.log(...args); }

describe('TRACE: why MEDIUM picks (2,2) over (1,2)', () => {
  it('full trace — step 1: baseline evaluation', () => {
    const board = new Board();
    board.setPiece({ x: 2, y: 2, z: 0 }, 'BLACK'); // player first move

    const baseline = ThreatEvaluator.evaluate(board, 'WHITE');
    log('\n══════════ STEP 1: Baseline Evaluation ══════════');
    log('Board: W=none, B=(2,2,0)');
    log(`aiPlayer: ${baseline.aiPlayer}`);
    log(`ownPatterns: ${baseline.ownPatterns.length} (${baseline.ownPatterns.map(p => p.type + ':' + p.score).join(',') || 'none'})`);
    log(`oppPatterns: ${baseline.oppPatterns.length} (${baseline.oppPatterns.map(p => p.type + ':' + p.score).join(',') || 'none'})`);
    log(`ownScore: ${baseline.ownScore}`);
    log(`oppScore: ${baseline.oppScore}`);
    log(`finalScore: ${baseline.finalScore}`);
    log(`lineOwnCache size: ${baseline.lineOwnCache.size}`);
    log(`lineOppCache size: ${baseline.lineOppCache.size}`);
  });

  it('full trace — step 2: EASY evaluateAllCandidates scores', () => {
    const board = new Board();
    board.setPiece({ x: 2, y: 2, z: 0 }, 'BLACK');

    const baseline = ThreatEvaluator.evaluate(board, 'WHITE');
    const candidates = board.getAvailableColumns();

    log('\n══════════ STEP 2: EASY mode — all candidates scored ══════════');

    // 手动模拟 AIPlayerV2.evaluateAllCandidates 的逻辑
    const scored: { x: number; y: number; z: number; final: number; own: number; opp: number; pBonus: number }[] = [];

    for (const col of candidates) {
      const z = board.findDropPosition(col.x, col.y);
      if (z === -1) continue;
      const pos = { x: col.x, y: col.y, z };

      board.setPiece(pos, 'WHITE');
      const report = ThreatEvaluator.evaluateIncremental(baseline, board, pos, 'WHITE');
      board.setPiece(pos, 'EMPTY');

      const below = pos.z > 0 ? board.getPiece({ x: pos.x, y: pos.y, z: pos.z - 1 }) : 'EMPTY';
      const pb = positionBonus(pos.x, pos.y, pos.z, below, 'WHITE');
      const total = report.finalScore + pb;

      scored.push({ x: col.x, y: col.y, z, final: total, own: report.ownScore, opp: report.oppScore, pBonus: pb });
    }

    scored.sort((a, b) => b.final - a.final);
    log('Rank | (x,y) | z | finalScore | ownScore | oppScore | posBonus');
    log('-----|-------|---|------------|----------|----------|----------');
    for (let i = 0; i < Math.min(10, scored.length); i++) {
      const s = scored[i];
      const marker = (s.x === 2 && s.y === 2) ? ' ← STACK' : '';
      log(` ${i + 1}   | (${s.x},${s.y}) | ${s.z} | ${s.final} | ${s.own} | ${s.opp} | ${s.pBonus}${marker}`);
    }

    // 验证 EASY 模式下 AIPlayerV2 实际的选择
    const ai = new AIPlayerV2('EASY');
    ai.setPiece('WHITE');
    const easyResult = ai.calculateBestMoveSync(board);
    log(`\nAIPlayerV2 EASY actual pick: (${easyResult.x}, ${easyResult.y})`);
    log(`Is stacking: ${easyResult.x === 2 && easyResult.y === 2}`);
  });

  it('full trace — step 3: SearchEngine.getSortedCandidates priorities', () => {
    const board = new Board();
    board.setPiece({ x: 2, y: 2, z: 0 }, 'BLACK');

    const baseline = ThreatEvaluator.evaluate(board, 'WHITE');

    log('\n══════════ STEP 3: SearchEngine candidate priorities ══════════');

    // 手动复现 getSortedCandidates 的优先级计算
    const raw = board.getAvailableColumns();
    const scored: { x: number; y: number; z: number; prio: number; pBonus: number; details: string }[] = [];

    for (const c of raw) {
      let priority = 0;
      const z = board.findDropPosition(c.x, c.y);
      if (z === -1) continue;
      const pos = { x: c.x, y: c.y, z };
      const details: string[] = [];

      // Immediate win check
      const winCheck = board.quickWouldWinAt(pos, 'WHITE');
      if (winCheck) { priority += 10000; details.push('WIN+10k'); }

      // Block opponent win
      const blockCheck = board.quickWouldWinAt(pos, 'BLACK');
      if (blockCheck) { priority += 5000; details.push('BLOCK+5k'); }

      // Own pattern extension
      for (const p of baseline.ownPatterns) {
        for (const ext of p.extCells) {
          if (ext.x === pos.x && ext.y === pos.y) {
            if (p.score >= 500) { priority += 1000; details.push('ownExt+1k'); }
            else { priority += 200; details.push('ownExt+200'); }
          }
        }
      }

      // Opponent pattern blocking
      for (const p of baseline.oppPatterns) {
        for (const ext of p.extCells) {
          if (ext.x === pos.x && ext.y === pos.y) {
            if (p.score >= 500) { priority += 1500; details.push('oppBlk+1.5k'); }
            else { priority += 500; details.push('oppBlk+500'); }
          }
        }
      }

      // Position bonus
      const below = pos.z > 0 ? board.getPiece({ x: pos.x, y: pos.y, z: pos.z - 1 }) : 'EMPTY';
      const pb = positionBonus(pos.x, pos.y, pos.z, below, 'WHITE');
      priority += pb;

      scored.push({ x: c.x, y: c.y, z, prio: priority, pBonus: pb, details: details.join(',') || '-' });
    }

    scored.sort((a, b) => b.prio - a.prio);
    log('Rank | (x,y) | z | priority | posBonus | details');
    log('-----|-------|---|----------|----------|--------');
    for (let i = 0; i < Math.min(10, scored.length); i++) {
      const s = scored[i];
      const marker = (s.x === 2 && s.y === 2) ? ' ← STACK' : '';
      log(` ${i + 1}   | (${s.x},${s.y}) | ${s.z} | ${s.prio} | ${s.pBonus} | ${s.details}${marker}`);
    }
  });

  it('full trace — step 4: SearchEngine root loop minimax scores', () => {
    const board = new Board();
    board.setPiece({ x: 2, y: 2, z: 0 }, 'BLACK');

    const baseline = ThreatEvaluator.evaluate(board, 'WHITE');

    log('\n══════════ STEP 4: SearchEngine depth=3 minimax scores ══════════');

    const engine = new SearchEngine({
      maxDepth: 3, timeLimitMs: 0,
      useIterativeDeepening: false, useQuiescenceSearch: false,
      useKillerHeuristic: false, useHistoryHeuristic: false,
    }, ThreatEvaluator);

    // 只看排名前 8 的候选
    const topCols = [{ x: 1, y: 2 }, { x: 2, y: 1 }, { x: 2, y: 3 }, { x: 3, y: 2 }, { x: 2, y: 2 }, { x: 0, y: 2 }, { x: 1, y: 1 }, { x: 2, y: 0 }];

    log('(x,y) | z | rawMinimax | positionBonus | total | notes');
    log('-------|---|------------|---------------|-------|-------');

    for (const col of topCols) {
      const z = board.findDropPosition(col.x, col.y);
      if (z === -1) continue;
      const fullPos = { x: col.x, y: col.y, z };

      // 模拟 search() 根循环
      board.setPiece(fullPos, 'WHITE');

      // 第 1 层 minimax: opponent 回应
      let bestBlackScore = Infinity;
      for (const bc of board.getAvailableColumns()) {
        const bz = board.findDropPosition(bc.x, bc.y);
        if (bz === -1) continue;
        board.setPiece({ x: bc.x, y: bc.y, z: bz }, 'BLACK');

        // 第 2 层: WHITE 回应
        let bestWhiteScore = -Infinity;
        for (const wc of board.getAvailableColumns()) {
          const wz = board.findDropPosition(wc.x, wc.y);
          if (wz === -1) continue;
          const wPos = { x: wc.x, y: wc.y, z: wz };
          board.setPiece(wPos, 'WHITE');

          // 第 3 层: BLACK 回应 → 全盘评估
          let bestBlackFinalScore = Infinity;
          for (const b2c of board.getAvailableColumns()) {
            const b2z = board.findDropPosition(b2c.x, b2c.y);
            if (b2z === -1) continue;
            board.setPiece({ x: b2c.x, y: b2c.y, z: b2z }, 'BLACK');
            // depth=0 — 完整评估
            const leafScore = ThreatEvaluator.evaluate(board, 'WHITE').finalScore;
            board.setPiece({ x: b2c.x, y: b2c.y, z: b2z }, 'EMPTY');
            if (leafScore < bestBlackFinalScore) bestBlackFinalScore = leafScore;
          }

          board.setPiece(wPos, 'EMPTY');
          // 注意: 第 2 层是 WHITE 最大化自己的分数
          if (bestBlackFinalScore > bestWhiteScore) bestWhiteScore = bestBlackFinalScore;
        }

        board.setPiece({ x: bc.x, y: bc.y, z: bz }, 'EMPTY');
        // 第 1 层是 BLACK 最小化 WHITE 的分数
        if (bestWhiteScore < bestBlackScore) bestBlackScore = bestWhiteScore;
      }

      board.setPiece(fullPos, 'EMPTY');

      const below = fullPos.z > 0 ? board.getPiece({ x: fullPos.x, y: fullPos.y, z: fullPos.z - 1 }) : 'EMPTY';
      const pb = positionBonus(fullPos.x, fullPos.y, fullPos.z, below, 'WHITE');
      const total = bestBlackScore + pb;
      const isStack = (col.x === 2 && col.y === 2) ? ' ← STACK' : '';

      log(`(${col.x},${col.y}) | ${z} | ${bestBlackScore} | ${pb} | ${total} |${isStack}`);
    }

    // 实际 SearchEngine 输出
    const result = engine.searchSync(board, 'WHITE', baseline);
    log(`\nSearchEngine actual pick: (${result.bestPos.x}, ${result.bestPos.y})`);
    log(`bestScore: ${result.bestScore}`);
  });

  it('full trace — step 5: what AIPlayerV2 MEDIUM actually does', () => {
    const board = new Board();
    board.setPiece({ x: 2, y: 2, z: 0 }, 'BLACK');

    log('\n══════════ STEP 5: AIPlayerV2 MEDIUM decision ══════════');

    const ai = new AIPlayerV2('MEDIUM');
    ai.setPiece('WHITE');

    // 检查内部状态
    log(`difficulty: ${ai.getDifficulty()}`);
    log(`searchDepth: ${ai.getSearchDepth()}`);
    log(`piece: ${ai.getPiece()}`);

    const result = ai.calculateBestMoveSync(board);
    log(`\nAIPlayerV2 MEDIUM picks: (${result.x}, ${result.y})`);
    log(`score: ${result.score}`);
    log(`Is stacking on player: ${result.x === 2 && result.y === 2}`);
  });
});
