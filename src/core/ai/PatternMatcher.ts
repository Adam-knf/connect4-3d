/**
 * 棋形识别器 — T族（连续）+ G族（间隙）
 * 基于 ai-evaluation-v2.md §3.2, §5.1
 *
 * 核心职责: 将一条 LineRecord 分类为标准棋形 Pattern
 * classifyBoth() 一次扫描同时分类双方，避免重复遍历
 */

import type { Player, Position, LineRecord } from '@/types';
import type { Board } from '@/core/Board';
import { PatternType, DirCategory, ATTACK_SCORES } from './scores';

// ==================== Pattern 类型 ====================

export interface Pattern {
  type: PatternType;
  player: Player;
  lineId: number;
  dirCategory: DirCategory;
  /** 可扩展的空位（用于 Cross 检测、威胁评估） */
  extCells: Position[];
  /** 基础分（不含方向权重） */
  score: number;
  /** 棋子数量（用于棋形优先级比较：G3 > T2） */
  pieceCount: number;
}

// ==================== 内部工具类型 ====================

interface BlockInfo {
  startIdx: number;
  endIdx: number;
  length: number;
}


// ==================== PatternMatcher ====================

export class PatternMatcher {
  /**
   * 一次扫描同时分类双方棋形
   * 利用 LineRecord 的 blackCount/whiteCount 避免重复扫描
   */
  static classifyBoth(
    line: LineRecord,
    board: Board,
    aiPlayer: Player,
  ): { own: Pattern | null; opp: Pattern | null } {
    const oppPlayer: Player = aiPlayer === 'BLACK' ? 'WHITE' : 'BLACK';

    // 双方棋子混杂 → MIX，无价值
    if (line.blackCount > 0 && line.whiteCount > 0) {
      return { own: null, opp: null };
    }

    // 空线 → 无价值
    if (line.blackCount === 0 && line.whiteCount === 0) {
      return { own: null, opp: null };
    }

    const dirCat = PatternMatcher.getDirCategory(line.direction);

    // 确定哪方在这条线上有棋子
    const linePlayer: Player = line.blackCount > 0 ? 'BLACK' : 'WHITE';
    const own = (linePlayer === aiPlayer)
      ? PatternMatcher.classifyForPlayer(line, board, aiPlayer, dirCat)
      : null;
    const opp = (linePlayer === oppPlayer)
      ? PatternMatcher.classifyForPlayer(line, board, oppPlayer, dirCat)
      : null;

    return { own, opp };
  }

  /**
   * 分类单方棋形：同时检测 T族和 G族，返回棋子数更多者
   */
  static classifyForPlayer(
    line: LineRecord,
    board: Board,
    player: Player,
    dirCat?: DirCategory,
  ): Pattern | null {
    const positions = line.positions;
    const dirCat2 = dirCat ?? PatternMatcher.getDirCategory(line.direction);

    // 0. MIX 检查：线上有双方棋子 → 无价值
    if (line.blackCount > 0 && line.whiteCount > 0) return null;

    // 1. 找连续块
    const block = PatternMatcher.findConsecutiveBlock(positions, board, player);

    let tPattern: Pattern | null = null;
    let gPattern: Pattern | null = null;

    // 2. T族：连续块长度 >= 2 才触发
    if (block && block.length >= 2) {
      tPattern = PatternMatcher.buildTPattern(
        line, block, positions, board, player, dirCat2,
      );
    }

    // 3. G族：间隙检测（无论是否有连续块都做，因为可能 G族棋子更多）
    gPattern = PatternMatcher.buildGPattern(
      line, positions, board, player, dirCat2,
    );

    // 4. 返回棋子数更多者；相同则 T族优先（连续更强）
    if (!tPattern && !gPattern) return null;
    if (!tPattern) return gPattern;
    if (!gPattern) return tPattern;
    return (gPattern.pieceCount > tPattern.pieceCount) ? gPattern : tPattern;
  }

  /**
   * 获取方向类别
   */
  static getDirCategory(dir: { x: number; y: number; z: number }): DirCategory {
    if (dir.z === 0) {
      if (dir.x !== 0 && dir.y !== 0) return DirCategory.DIAGONAL;
      return DirCategory.HORIZONTAL;
    }
    if (dir.x === 0 && dir.y === 0) return DirCategory.VERTICAL;
    if (dir.x !== 0 && dir.y !== 0) return DirCategory.SPATIAL_DIAG;
    return DirCategory.SPATIAL;
  }

  // ==================== 私有方法 ====================

  /**
   * 在4个位置中找连续己方棋子块
   */
  private static findConsecutiveBlock(
    positions: Position[],
    board: Board,
    player: Player,
  ): BlockInfo | null {
    let bestStart = -1;
    let bestLen = 0;
    let curStart = -1;
    let curLen = 0;

    for (let i = 0; i < positions.length; i++) {
      if (board.getPiece(positions[i]) === player) {
        if (curLen === 0) curStart = i;
        curLen++;
      } else {
        if (curLen > bestLen) {
          bestStart = curStart;
          bestLen = curLen;
        }
        curLen = 0;
      }
    }
    if (curLen > bestLen) {
      bestStart = curStart;
      bestLen = curLen;
    }

    if (bestLen === 0) return null;
    return { startIdx: bestStart, endIdx: bestStart + bestLen - 1, length: bestLen };
  }

  /**
   * 构建 T族 Pattern
   */
  private static buildTPattern(
    line: LineRecord,
    block: BlockInfo,
    positions: Position[],
    board: Board,
    player: Player,
    dirCat: DirCategory,
  ): Pattern | null {
    const dir = line.direction;

    // 左扩展: block.startIdx - 1 沿 -dir（即段前一个位置）
    const leftExt = PatternMatcher.checkExtension(
      positions[block.startIdx], dir, -1, board,
    );
    // 右扩展: block.endIdx + 1 沿 +dir
    const rightExt = PatternMatcher.checkExtension(
      positions[block.endIdx], dir, 1, board,
    );

    const openEnds = leftExt.open + rightExt.open;
    const readyEnds = leftExt.ready + rightExt.ready;

    // 延伸深度：用于判断 SHALLOW。仅在 openEnds===1 时有意义。
    // 唯一开放端若 depth===0 → 填满即 BLK → SHALLOW。
    const leftDepth = leftExt.depth;
    const rightDepth = rightExt.depth;

    // 收集 extCells（实际可扩展的空位坐标）
    const extCells: Position[] = [];
    if (leftExt.pos) extCells.push(leftExt.pos);
    if (rightExt.pos) extCells.push(rightExt.pos);

    // 根据 count + openEnds + readyEnds + depth 确定 PatternType
    const count = block.length;
    const patternType = PatternMatcher.resolveTPatternType(
      count, openEnds, readyEnds, leftDepth, rightDepth,
    );
    if (!patternType) return null;

    const score = ATTACK_SCORES[patternType];
    if (score === 0) return null;

    return {
      type: patternType,
      player,
      lineId: line.id,
      dirCategory: dirCat,
      extCells,
      score,
      pieceCount: count,
    };
  }

  /**
   * 检查扩展端状态
   * @param pos 块边界位置
   * @param dir 线方向
   * @param sign +1(右扩展) 或 -1(左扩展)
   */
  private static checkExtension(
    pos: Position,
    dir: { x: number; y: number; z: number },
    sign: 1 | -1,
    board: Board,
  ): { open: number; ready: number; depth: number; pos: Position | null } {
    const ext1: Position = {
      x: pos.x + dir.x * sign,
      y: pos.y + dir.y * sign,
      z: pos.z + dir.z * sign,
    };

    // 出界 → BLOCKED
    if (!board.isValidPosition(ext1)) {
      return { open: 0, ready: 0, depth: 0, pos: null };
    }

    // 被占 → BLOCKED
    if (board.getPiece(ext1) !== 'EMPTY') {
      return { open: 0, ready: 0, depth: 0, pos: null };
    }

    // 开放 + 就绪状态
    const ready = PatternMatcher.isPlayable(ext1, board) ? 1 : 0;

    // 延伸深度：ext2 有效且可立即下 → 深; e(需堆叠)等同出界/被占 → 浅
    let depth = 0;
    const ext2: Position = {
      x: pos.x + dir.x * sign * 2,
      y: pos.y + dir.y * sign * 2,
      z: pos.z + dir.z * sign * 2,
    };
    if (board.isValidPosition(ext2) && board.getPiece(ext2) === 'EMPTY' && PatternMatcher.isPlayable(ext2, board)) {
      depth = 1;
    }

    return { open: 1, ready, depth, pos: ext1 };
  }

  /**
   * 判断空位是否可立即下
   */
  private static isPlayable(pos: Position, board: Board): boolean {
    if (pos.z === 0) return true;
    const below: Position = { x: pos.x, y: pos.y, z: pos.z - 1 };
    return board.getPiece(below) !== 'EMPTY';
  }

  /**
   * 根据连续数+开放端+就绪端确定 T族棋形类型
   */
  private static resolveTPatternType(
    count: number,
    openEnds: number,
    readyEnds: number,
    leftDepth: number = 0,
    rightDepth: number = 0,
  ): PatternType | null {
    if (count >= 4) return PatternType.WIN;

    if (count === 3) {
      // T3 棋形+两端扩展已占5格，depth不再有区分意义
      if (openEnds === 2) {
        if (readyEnds === 2) return PatternType.T3_OR;
        if (readyEnds === 1) return PatternType.T3_OP;
        return PatternType.T3_OD;
      }
      if (openEnds === 1) {
        if (readyEnds === 1) return PatternType.T3_HR;
        return PatternType.T3_HD;
      }
      return null;
    }

    if (count === 2) {
      const totalDepth = leftDepth + rightDepth; // openEnds=2→0~2, openEnds=1→0~1

      if (openEnds === 2) {
        // 双开：两端都深→可发展到T3-OR，否则仅能到T3-HR
        if (totalDepth >= 1) {
          if (readyEnds === 2) return PatternType.T2_OR;
          if (readyEnds === 1) return PatternType.T2_OP;
          return PatternType.T2_OD;
        }
        // 至少一端浅 → SL 降级
        if (readyEnds === 2) return PatternType.T2_OR_SL;
        if (readyEnds === 1) return PatternType.T2_OP_SL;
        return PatternType.T2_OD_SL;
      }

      if (openEnds === 1) {
        // 单开：深→可发展到T3-HR，浅→填即BLK无价值
        if (totalDepth === 0) return null;
        if (readyEnds === 1) return PatternType.T2_HR;
        return PatternType.T2_HD;
      }
      return null;
    }

    return null;
  }

  /**
   * 构建 G族 Pattern（间隙棋形）
   */
  private static buildGPattern(
    line: LineRecord,
    positions: Position[],
    board: Board,
    player: Player,
    dirCat: DirCategory,
  ): Pattern | null {
    const ownIndices: number[] = [];
    startIdx:Number;
    endIdx:Number;
    let startIdx = -1;
    let endIdx = -1;
    for (let i = 0; i < positions.length; i++) {
      if (board.getPiece(positions[i]) === player) {
        ownIndices.push(i);
        if (startIdx === -1) startIdx = i;
        if (endIdx < i ) endIdx = i;
      }
    }

    if (ownIndices.length < 2) return null;

    // G3-S1: 3子1隙
    if (ownIndices.length === 3) {
      // 找唯一的空位索引
      const allIndices = new Set([0, 1, 2, 3]);
      for (const idx of ownIndices) allIndices.delete(idx);
      const gapIdx = [...allIndices][0]; // 唯一的空位

      // 验证：空位必须在棋子之间（不是端点）
      const minOwn = Math.min(...ownIndices);
      const maxOwn = Math.max(...ownIndices);
      if (gapIdx > minOwn && gapIdx < maxOwn) {
        const gapPos = positions[gapIdx];
        const gapReady = PatternMatcher.isPlayable(gapPos, board);
        const pType = gapReady ? PatternType.G3_S1_R : PatternType.G3_S1_D;

        // extCells: 间隙位置
        const extCells: Position[] = [gapPos];

        // 也加两端的扩展（如果开放）
        const dir = line.direction;
        const leftExt = PatternMatcher.checkExtension(positions[0], dir, -1, board);
        const rightExt = PatternMatcher.checkExtension(positions[3], dir, 1, board);
        if (leftExt.pos) extCells.push(leftExt.pos);
        if (rightExt.pos) extCells.push(rightExt.pos);

        return {
          type: pType,
          player,
          lineId: line.id,
          dirCategory: dirCat,
          extCells,
          score: ATTACK_SCORES[pType],
          pieceCount: 3,
        };
      }
    }

    // G2: 2子有隙
    if (ownIndices.length === 2) {
      const gap = ownIndices[1] - ownIndices[0] - 1; // 之间空位数

      if (gap === 1) {
        // G2-S1: 2子间隔1空
        const gapIdx = ownIndices[0] + 1;
        const gapPos = positions[gapIdx];
        const gapReady = PatternMatcher.isPlayable(gapPos, board);
        pType: PatternType;
        let pType = gapReady ? PatternType.G2_S1_R : PatternType.G2_S1_D;

        const extCells: Position[] = [gapPos];
        const dir = line.direction;
        const leftExt = PatternMatcher.checkExtension(positions[0], dir, -1, board);
        const rightExt = PatternMatcher.checkExtension(positions[3], dir, 1, board);
        if (leftExt.pos) extCells.push(leftExt.pos);
        if (rightExt.pos) extCells.push(rightExt.pos);

        const eLeftExt = PatternMatcher.checkExtension(positions[startIdx], dir, -1, board);
        const eRightExt = PatternMatcher.checkExtension(positions[endIdx], dir, 1, board);

        const openEnds = eLeftExt.open + eRightExt.open;
        const readyEnds = eLeftExt.ready + eRightExt.ready;

        if (openEnds === 2){
          if (readyEnds === 2) {
            pType = gapReady ? PatternType.G2_S1_OR:PatternType.G2_S1_OD;
          }
          if (readyEnds === 1){
            pType = gapReady ? PatternType.G2_S1_HR:PatternType.G2_S1_HD;
          }
        }
        if (openEnds === 1){
          if (readyEnds === 1){
            pType = gapReady ? PatternType.G2_S1_HR:PatternType.G2_S1_HD;
          }
        }

        return {
          type: pType,
          player,
          lineId: line.id,
          dirCategory: dirCat,
          extCells,
          score: ATTACK_SCORES[pType],
          pieceCount: 2,
        };
      }

      if (gap === 2) {
        // G2-S2: 2子间隔2空
        const gapIdx1 = ownIndices[0] + 1;
        const gapIdx2 = ownIndices[0] + 2;
        // 两个间隙中至少一个可立即下即为 R
        const anyReady =
          PatternMatcher.isPlayable(positions[gapIdx1], board) ||
          PatternMatcher.isPlayable(positions[gapIdx2], board);
        const pType = anyReady ? PatternType.G2_S2_R : PatternType.G2_S2_D;

        const extCells: Position[] = [positions[gapIdx1], positions[gapIdx2]];
        const dir = line.direction;
        const leftExt = PatternMatcher.checkExtension(positions[0], dir, -1, board);
        const rightExt = PatternMatcher.checkExtension(positions[3], dir, 1, board);
        if (leftExt.pos) extCells.push(leftExt.pos);
        if (rightExt.pos) extCells.push(rightExt.pos);

        return {
          type: pType,
          player,
          lineId: line.id,
          dirCategory: dirCat,
          extCells,
          score: ATTACK_SCORES[pType],
          pieceCount: 2,
        };
      }
    }

    return null;
  }
}
