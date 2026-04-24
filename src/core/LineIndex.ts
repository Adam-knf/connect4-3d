/**
 * LineIndex 四连索引表
 * 预计算所有可能的4连组合，提供增量更新和快速查询
 */

import type { Position, Vector3, Player, WinResult, LineRecord } from '@/types';
import { WIN_LINE_LENGTH } from '@/types';

// 导出 LineRecord 类型（供外部使用）
export type { LineRecord } from '@/types';

/**
 * 四连状态
 */
type LineStatus =
  | 'EMPTY'      // 全空
  | 'BLACK_1'    // 黑棋1颗
  | 'BLACK_2'    // 黑棋2颗
  | 'BLACK_3'    // 黑棋3颗（威胁）
  | 'BLACK_4'    // 黑棋4颗（获胜）
  | 'WHITE_1'    // 白棋1颗
  | 'WHITE_2'    // 白棋2颗
  | 'WHITE_3'    // 白棋3颗（威胁）
  | 'WHITE_4'    // 白棋4颗（获胜）
  | 'MIXED';     // 黑白混合（不可能形成连线）

/**
 * 四连索引表类
 * 管理所有可能的4连记录，支持增量更新
 */
export class LineIndex {
  /** 所有4连记录 */
  private lines: LineRecord[];

  /** 位置到4连ID的映射 */
  private posToLineIds: Map<number, number[]>;

  /** 棋盘尺寸 */
  private width: number;
  private height: number;

  /** 获取棋子状态的回调函数（用于计算开放端） */
  private getPieceAt: ((pos: Position) => Player) | null = null;

  /** 更新历史栈（用于回溯） */
  private updateStack: { lineId: number; player: Player; delta: number; oldOpenEnds: number; oldReadyEnds: number }[];

  /**
   * 构造函数
   * @param width 棋盘宽度
   * @param height 棋盘高度
   */
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.lines = [];
    this.posToLineIds = new Map();
    this.updateStack = [];

    this.precomputeLines();
  }

  /**
   * 设置获取棋子状态的回调函数
   * 必须在 Board 创建 LineIndex 后调用，用于计算开放端
   * @param callback 回调函数
   */
  setGetPieceAt(callback: (pos: Position) => Player): void {
    this.getPieceAt = callback;
  }

  /**
   * 计算一条线的开放端信息
   * @param line 4连记录
   * @returns { openEnds: 开放端数量, readyEnds: 可立即下的开放端数量 }
   */
  private calculateOpenEnds(line: LineRecord): { openEnds: number; readyEnds: number } {
    // 没有回调时，返回默认值（初始状态）
    if (!this.getPieceAt) {
      return { openEnds: 2, readyEnds: 0 };
    }

    const dir = line.direction;
    const positions = line.positions;

    // 计算两端的延伸位置
    // 前端：positions[0] 向前延伸一格（-dir）
    // 后端：positions[3] 向后延伸一格（+dir）
    const frontExtend: Position = {
      x: positions[0].x - dir.x,
      y: positions[0].y - dir.y,
      z: positions[0].z - dir.z,
    };
    const backExtend: Position = {
      x: positions[3].x + dir.x,
      y: positions[3].y + dir.y,
      z: positions[3].z + dir.z,
    };

    let openEnds = 0;
    let readyEnds = 0;

    // 检查前端
    if (this.isValidPosition(frontExtend)) {
      const frontPiece = this.getPieceAt(frontExtend);
      if (frontPiece === 'EMPTY') {
        openEnds++;
        // 检查是否可立即下（底层有棋子或本身在底层）
        if (frontExtend.z === 0) {
          readyEnds++;  // 底层位置可以直接下
        } else {
          const belowFront: Position = {
            x: frontExtend.x,
            y: frontExtend.y,
            z: frontExtend.z - 1,
          };
          if (this.getPieceAt(belowFront) !== 'EMPTY') {
            readyEnds++;  // 底层有棋子，可以立即下
          }
        }
      }
    }

    // 检查后端
    if (this.isValidPosition(backExtend)) {
      const backPiece = this.getPieceAt(backExtend);
      if (backPiece === 'EMPTY') {
        openEnds++;
        // 检查是否可立即下
        if (backExtend.z === 0) {
          readyEnds++;  // 底层位置可以直接下
        } else {
          const belowBack: Position = {
            x: backExtend.x,
            y: backExtend.y,
            z: backExtend.z - 1,
          };
          if (this.getPieceAt(belowBack) !== 'EMPTY') {
            readyEnds++;  // 底层有棋子，可以立即下
          }
        }
      }
    }

    return { openEnds, readyEnds };
  }

  /**
   * 预计算所有可能的4连
   */
  private precomputeLines(): void {
    // 正向方向列表（避免重复检测）
    const directions: Vector3[] = [
      // 水平（同层）- 4个
      { x: 1, y: 0, z: 0 },   // 横线
      { x: 0, y: 1, z: 0 },   // 竖线
      { x: 1, y: 1, z: 0 },   // XY对角线
      { x: 1, y: -1, z: 0 },  // XY反对角线
      // 垂直 - 1个
      { x: 0, y: 0, z: 1 },
      // 跨层斜线(XZ) - 只保留向上版本
      { x: 1, y: 0, z: 1 },
      { x: -1, y: 0, z: 1 },
      // 跨层斜线(YZ) - 只保留向上版本
      { x: 0, y: 1, z: 1 },
      { x: 0, y: -1, z: 1 },
      // 空间对角线 - 只保留向上版本
      { x: 1, y: 1, z: 1 },
      { x: -1, y: 1, z: 1 },
      { x: 1, y: -1, z: 1 },
      { x: -1, y: -1, z: 1 },
    ];

    let lineId = 0;

    // 遍历所有起点
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.width; y++) {
        for (let z = 0; z < this.height; z++) {
          // 检测每个方向是否能形成完整4连
          for (const dir of directions) {
            const positions = this.tryCreateLine({ x, y, z }, dir);
            if (positions) {
              // 创建记录（初始状态：开放端2，可立即下0，需要在setGetPieceAt后更新）
              const record: LineRecord = {
                id: lineId,
                positions,
                direction: dir,
                blackCount: 0,
                whiteCount: 0,
                openEnds: 2,  // 默认两端开放
                readyEnds: 0, // 默认不可立即下（需等待棋盘状态）
              };
              this.lines.push(record);

              // 建立位置映射
              for (const pos of positions) {
                const posKey = this.encodePosition(pos);
                if (!this.posToLineIds.has(posKey)) {
                  this.posToLineIds.set(posKey, []);
                }
                this.posToLineIds.get(posKey)!.push(lineId);
              }

              lineId++;
            }
          }
        }
      }
    }
  }

  /**
   * 尝试从起点创建4连
   * @returns 如果能形成完整4连返回位置列表，否则返回null
   */
  private tryCreateLine(start: Position, dir: Vector3): Position[] | null {
    const positions: Position[] = [];

    for (let i = 0; i < WIN_LINE_LENGTH; i++) {
      const pos = {
        x: start.x + dir.x * i,
        y: start.y + dir.y * i,
        z: start.z + dir.z * i,
      };

      if (!this.isValidPosition(pos)) {
        return null;
      }
      positions.push(pos);
    }

    return positions;
  }

  /**
   * 判断位置是否有效
   */
  private isValidPosition(pos: Position): boolean {
    return (
      pos.x >= 0 && pos.x < this.width &&
      pos.y >= 0 && pos.y < this.width &&
      pos.z >= 0 && pos.z < this.height
    );
  }

  /**
   * 编码位置为唯一键
   */
  private encodePosition(pos: Position): number {
    return pos.x * 10000 + pos.y * 100 + pos.z;
  }

  /**
   * 获取位置涉及的4连ID列表
   */
  getLineIdsAtPosition(pos: Position): number[] {
    const posKey = this.encodePosition(pos);
    return this.posToLineIds.get(posKey) || [];
  }

  /**
   * 获取指定4连的完整记录
   * 用于AI分层评估函数查询线的详细信息
   * @param lineId 4连ID
   * @returns 4连记录（如果ID无效返回null）
   */
  getLineRecord(lineId: number): LineRecord | null {
    if (lineId < 0 || lineId >= this.lines.length) {
      return null;
    }
    return this.lines[lineId];
  }

  /**
   * 增量更新：棋子放置时更新涉及的4连
   * 同时更新开放端信息
   * @param pos 放置位置
   * @param player 玩家类型
   * @returns 如果形成4连返回获胜结果，否则返回null
   */
  updateOnPlace(pos: Position, player: Player): WinResult | null {
    const lineIds = this.getLineIdsAtPosition(pos);

    for (const lineId of lineIds) {
      const line = this.lines[lineId];

      // 记录更新历史（用于回溯）
      this.updateStack.push({
        lineId,
        player,
        delta: 1,
        oldOpenEnds: line.openEnds,
        oldReadyEnds: line.readyEnds,
      });

      // 更新计数
      if (player === 'BLACK') {
        line.blackCount++;
      } else if (player === 'WHITE') {
        line.whiteCount++;
      }

      // 重新计算开放端信息
      const openInfo = this.calculateOpenEnds(line);
      line.openEnds = openInfo.openEnds;
      line.readyEnds = openInfo.readyEnds;

      // 检测是否获胜
      if (line.blackCount === WIN_LINE_LENGTH) {
        return {
          winner: 'BLACK',
          linePositions: line.positions,
        };
      }
      if (line.whiteCount === WIN_LINE_LENGTH) {
        return {
          winner: 'WHITE',
          linePositions: line.positions,
        };
      }
    }

    return null;
  }

  /**
   * 回溯更新：撤销棋子放置时恢复涉及的4连
   * 同时重新计算开放端信息
   * @param pos 撤销位置
   * @param player 玩家类型
   */
  undoOnRemove(pos: Position, player: Player): void {
    const lineIds = this.getLineIdsAtPosition(pos);

    for (const lineId of lineIds) {
      const line = this.lines[lineId];

      // 回退计数
      if (player === 'BLACK') {
        line.blackCount--;
      } else if (player === 'WHITE') {
        line.whiteCount--;
      }

      // 重新计算开放端信息（棋盘状态已变化）
      const openInfo = this.calculateOpenEnds(line);
      line.openEnds = openInfo.openEnds;
      line.readyEnds = openInfo.readyEnds;

      // 弹出对应的更新记录
      // 从栈顶找到匹配的记录并移除
      for (let i = this.updateStack.length - 1; i >= 0; i--) {
        const record = this.updateStack[i];
        if (record.lineId === lineId && record.player === player) {
          this.updateStack.splice(i, 1);
          break;
        }
      }
    }
  }

  /**
   * 清空更新栈（用于开始新搜索时）
   */
  clearUpdateStack(): void {
    this.updateStack = [];
  }

  /**
   * 从栈中批量回退最近的更新
   * @param count 回退次数（对应棋子数量）
   */
  undoBatch(count: number): void {
    for (let i = 0; i < count; i++) {
      const record = this.updateStack.pop();
      if (record) {
        const line = this.lines[record.lineId];
        if (record.player === 'BLACK') {
          line.blackCount -= record.delta;
        } else if (record.player === 'WHITE') {
          line.whiteCount -= record.delta;
        }
      }
    }
  }

  /**
   * 检测当前是否有获胜连线
   * @returns 胜负结果或null
   */
  checkWin(): WinResult | null {
    for (const line of this.lines) {
      if (line.blackCount === WIN_LINE_LENGTH) {
        return {
          winner: 'BLACK',
          linePositions: line.positions,
        };
      }
      if (line.whiteCount === WIN_LINE_LENGTH) {
        return {
          winner: 'WHITE',
          linePositions: line.positions,
        };
      }
    }
    return null;
  }

  /**
   * 快速检测指定位置放置后是否获胜
   * 用于AI高频评估
   * @param pos 放置位置
   * @param player 玩家类型
   * @returns 如果放置后形成4连返回获胜结果
   */
  quickCheckWinAt(pos: Position, player: Player): WinResult | null {
    const lineIds = this.getLineIdsAtPosition(pos);

    for (const lineId of lineIds) {
      const line = this.lines[lineId];

      // 检查该线是否可以形成连线（不混合）
      const currentCount = player === 'BLACK' ? line.blackCount : line.whiteCount;
      const otherCount = player === 'BLACK' ? line.whiteCount : line.blackCount;

      // 如果该线已有对方棋子，不可能形成连线
      if (otherCount > 0) continue;

      // 如果放置后达到4连
      if (currentCount + 1 === WIN_LINE_LENGTH) {
        return {
          winner: player,
          linePositions: line.positions,
        };
      }
    }

    return null;
  }

  /**
   * 获取指定玩家的威胁位置（3连+空位）
   * @param player 玩家类型
   * @returns 威胁位置列表
   */
  getThreatPositions(player: Player): Position[] {
    const threats: Position[] = [];

    for (const line of this.lines) {
      const playerCount = player === 'BLACK' ? line.blackCount : line.whiteCount;
      const otherCount = player === 'BLACK' ? line.whiteCount : line.blackCount;

      // 3颗己方棋子 + 无对方棋子 = 威胁线
      if (playerCount === 3 && otherCount === 0) {
        // 找到空位
        for (const pos of line.positions) {
          // 返回空位位置（需要配合外部棋盘状态判断）
          threats.push(pos);
        }
      }
    }

    return threats;
  }

  /**
   * 获取某条线的当前状态
   */
  getLineStatus(lineId: number): LineStatus {
    const line = this.lines[lineId];

    if (line.blackCount === 0 && line.whiteCount === 0) return 'EMPTY';
    if (line.blackCount > 0 && line.whiteCount > 0) return 'MIXED';
    if (line.blackCount === 4) return 'BLACK_4';
    if (line.blackCount === 3) return 'BLACK_3';
    if (line.blackCount === 2) return 'BLACK_2';
    if (line.blackCount === 1) return 'BLACK_1';
    if (line.whiteCount === 4) return 'WHITE_4';
    if (line.whiteCount === 3) return 'WHITE_3';
    if (line.whiteCount === 2) return 'WHITE_2';
    if (line.whiteCount === 1) return 'WHITE_1';

    return 'EMPTY';
  }

  /**
   * 获取所有4连记录
   */
  getAllLines(): LineRecord[] {
    return this.lines;
  }

  /**
   * 获取记录总数
   */
  getLineCount(): number {
    return this.lines.length;
  }

  /**
   * 获取某位置涉及的4连记录数量
   */
  getLinesCountAtPosition(pos: Position): number {
    return this.getLineIdsAtPosition(pos).length;
  }

  /**
   * 重置所有计数（清空棋盘时使用）
   */
  reset(): void {
    for (const line of this.lines) {
      line.blackCount = 0;
      line.whiteCount = 0;
      // 重置开放端为默认值（需要重新计算）
      line.openEnds = 2;
      line.readyEnds = 0;
    }
    this.updateStack = [];
  }

  /**
   * 复制索引（用于AI模拟）
   */
  clone(): LineIndex {
    const newIndex = new LineIndex(this.width, this.height);

    // 复制计数状态和开放端信息
    for (let i = 0; i < this.lines.length; i++) {
      newIndex.lines[i].blackCount = this.lines[i].blackCount;
      newIndex.lines[i].whiteCount = this.lines[i].whiteCount;
      newIndex.lines[i].openEnds = this.lines[i].openEnds;
      newIndex.lines[i].readyEnds = this.lines[i].readyEnds;
    }

    // 复制更新栈
    newIndex.updateStack = this.updateStack.map(r => ({ ...r }));

    // 注意：getPieceAt 回调需要在外部设置（指向新的 Board）

    return newIndex;
  }

  /**
   * 从现有棋盘状态初始化索引
   * @param grid 棋盘三维数组
   */
  initFromGrid(grid: Player[][][]): void {
    // 先重置
    this.reset();

    // 根据棋盘状态更新计数
    for (const line of this.lines) {
      for (const pos of line.positions) {
        const piece = grid[pos.x][pos.y][pos.z];
        if (piece === 'BLACK') {
          line.blackCount++;
        } else if (piece === 'WHITE') {
          line.whiteCount++;
        }
      }
    }
  }

  /**
   * 获取评估分数（用于AI评估函数）
   * 区分"同时多威胁"和"非同时多威胁"
   * - 同时多威胁（多条线共享同一个空位）：正常累加
   * - 非同时多威胁（不同空位）：开根号降低价值
   */
  getEvaluationScore(player: Player, debug: boolean = false): number {
    // 收集威胁线信息
    const playerThreats: { lineScore: number; emptyPos: Position | null; count: number }[] = [];
    const opponentThreats: { lineScore: number; emptyPos: Position | null; count: number }[] = [];

    // 多威胁叠加统计（2连、3连）
    let playerTwoInRow = 0;
    let playerThreeInRow = 0;
    let opponentTwoInRow = 0;
    let opponentThreeInRow = 0;

    for (const line of this.lines) {
      const playerCount = player === 'BLACK' ? line.blackCount : line.whiteCount;
      const opponentCount = player === 'BLACK' ? line.whiteCount : line.blackCount;

      // 己方威胁线
      if (opponentCount === 0 && playerCount > 0 && line.openEnds > 0) {
        const lineScore = this.calculateLineScore(playerCount, line.openEnds, line.readyEnds, true);
        const emptyPos = this.findEmptyPositionInLine(line);
        playerThreats.push({ lineScore, emptyPos, count: playerCount });

        if (playerCount === 2) playerTwoInRow++;
        if (playerCount === 3) playerThreeInRow++;
      }

      // 对方威胁线
      if (playerCount === 0 && opponentCount > 0 && line.openEnds > 0) {
        const lineScore = this.calculateLineScore(opponentCount, line.openEnds, line.readyEnds, false);
        const emptyPos = this.findEmptyPositionInLine(line);
        opponentThreats.push({ lineScore, emptyPos, count: opponentCount });

        if (opponentCount === 2) opponentTwoInRow++;
        if (opponentCount === 3) opponentThreeInRow++;
      }
    }

    // 计算得分：区分同时多威胁和非同时多威胁
    const playerScore = this.calculateThreatGroupScore(playerThreats);
    const opponentScore = this.calculateThreatGroupScore(opponentThreats);

    let score = playerScore - opponentScore;

    // 多威胁叠加加分（2连、3连的特殊情况）
    if (playerTwoInRow >= 2) score += 50 * (playerTwoInRow - 1);
    if (opponentTwoInRow >= 2) score -= 200 * (opponentTwoInRow - 1);
    if (playerThreeInRow >= 2) score += 500;
    if (opponentThreeInRow >= 2) score -= 1000;

    if (debug) {
      console.log(`[LineIndex Debug] 己方威胁线数=${playerThreats.length}, 得分=${playerScore}`);
      console.log(`[LineIndex Debug] 对方威胁线数=${opponentThreats.length}, 扣分=${opponentScore}`);
      console.log(`[LineIndex Debug] 2连: 己方=${playerTwoInRow}, 对方=${opponentTwoInRow}`);
      console.log(`[LineIndex Debug] 3连: 己方=${playerThreeInRow}, 对方=${opponentThreeInRow}`);
      console.log(`[LineIndex Debug] 总分=${score}`);
    }

    return score;
  }

  /**
   * 找出威胁线中的空位位置（需要可立即下的位置）
   */
  private findEmptyPositionInLine(line: LineRecord): Position | null {
    if (!this.getPieceAt) return null;

    // 找readyEnds对应的空位（可立即下）
    for (const pos of line.positions) {
      if (this.getPieceAt(pos) === 'EMPTY') {
        // 检查是否可立即下（z=0或下层有棋子）
        if (pos.z === 0) return pos;
        const below: Position = { x: pos.x, y: pos.y, z: pos.z - 1 };
        if (this.getPieceAt(below) !== 'EMPTY') return pos;
      }
    }

    // 没有readyEnds，返回任意空位
    for (const pos of line.positions) {
      if (this.getPieceAt(pos) === 'EMPTY') return pos;
    }

    return null;
  }

  /**
   * 计算威胁组的得分（区分同时和非同时）
   */
  private calculateThreatGroupScore(threats: { lineScore: number; emptyPos: Position | null; count: number }[]): number {
    if (threats.length === 0) return 0;

    // 按空位位置分组
    const posGroups = new Map<string, number[]>();
    const noPosScores: number[] = [];

    for (const threat of threats) {
      if (threat.emptyPos) {
        const key = `${threat.emptyPos.x},${threat.emptyPos.y},${threat.emptyPos.z}`;
        if (!posGroups.has(key)) posGroups.set(key, []);
        posGroups.get(key)!.push(threat.lineScore);
      } else {
        noPosScores.push(threat.lineScore);
      }
    }

    let score = 0;

    // 同时多威胁（同一空位）：正常累加
    for (const scores of posGroups.values()) {
      const groupSum = scores.reduce((a, b) => a + b, 0);
      score += groupSum;

      // 如果多条线共享同一空位，额外加分（双威胁价值更高）
      if (scores.length >= 2) {
        score += 50 * (scores.length - 1);  // 每多一条共享空位的线加50分
      }
    }

    // 非同时多威胁（不同空位）：开根号
    if (posGroups.size > 1 || noPosScores.length > 0) {
      // 将所有不同空位的组得分开根号处理
      const groupCount = posGroups.size + noPosScores.length;
      if (groupCount > 1) {
        // 非同时威胁的总价值 = √(各组得分之和) × √groupCount
        // 这样可以降低多条独立威胁线的价值
        const allGroupScores = [...Array.from(posGroups.values()).map(s => s.reduce((a, b) => a + b, 0)), ...noPosScores];
        const rawSum = allGroupScores.reduce((a, b) => a + b, 0);
        // 应用开根号折扣：总分 = rawSum × (1 / √groupCount)
        score = Math.round(rawSum / Math.sqrt(groupCount));
      }
    }

    return score;
  }

  /**
   * 计算单条线的评分
   * @param count 棋子数量 (1-4)
   * @param openEnds 开放端数量 (0-2)
   * @param readyEnds 可立即下的开放端数量 (0-2)
   * @param isOwn 是否己方连线
   * @returns 评分
   */
  private calculateLineScore(count: number, openEnds: number, readyEnds: number, isOwn: boolean): number {
    // 两端被挡：无法延伸，价值极低
    if (openEnds === 0) {
      return count === 4 ? 10000 : 0;  // 只有获胜才有价值
    }

    // 基础评分（根据棋子数量）
    const baseScores: Record<number, number> = {
      1: 3,    // 1连：提高基础分（从1提高到3），让潜在威胁更有价值
      2: 10,
      3: 100,
      4: 10000,
    };
    const base = baseScores[count] || 0;

    // 开放端系数（己方连线用正向系数，对方威胁用放大系数）
    // openEnds: 0=被挡, 1=一端开放, 2=两端开放
    // readyEnds: 可立即下的开放端数量

    let multiplier = 1;

    if (openEnds === 2) {
      // 两端开放：根据可立即下数量调整
      if (readyEnds === 2) {
        multiplier = 2.0;   // 两端都可立即下：最高价值
      } else if (readyEnds === 1) {
        multiplier = 1.15;  // 一端可立即下，一端需等待：中高价值（降低，避免过高评价需等待端）
      } else {
        multiplier = 0.4;   // 两端都需等待：较低
      }
    } else if (openEnds === 1) {
      // 一端开放
      if (readyEnds === 1) {
        multiplier = 0.9;   // 可立即下：中等价值
      } else {
        multiplier = 0.3;   // 需等待：很低价值（立体向上方向的价值极低）
      }
    }

    // 对方威胁时，系数放大（更需要关注）
    if (!isOwn && count >= 2) {
      multiplier *= 2;  // 对方威胁扣分放大
    }

    return Math.round(base * multiplier);
  }
}