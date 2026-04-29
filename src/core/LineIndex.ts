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

  /** 更新历史栈（用于回溯） */
  private updateStack: { lineId: number; player: Player; delta: number }[];

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
              // 创建记录
              const record: LineRecord = {
                id: lineId,
                positions,
                direction: dir,
                blackCount: 0,
                whiteCount: 0,
                physKey: '',
              };
              // 预计算物理线去重键，避免运行时 while 回溯
              record.physKey = LineIndex.computePhysKey(record, this.width, this.height);
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
    let winResult: WinResult | null = null;

    for (const lineId of lineIds) {
      const line = this.lines[lineId];

      // 记录更新历史（用于回溯）
      this.updateStack.push({ lineId, player, delta: 1 });

      // 更新计数
      if (player === 'BLACK') {
        line.blackCount++;
      } else if (player === 'WHITE') {
        line.whiteCount++;
      }

      // 检测是否获胜（不提前 return，确保所有线计数一致）
      // BUGFIX: 提前 return 会导致 undoOnRemove 递减了未递增的线，使计数变为负数
      if (!winResult) {
        if (line.blackCount === WIN_LINE_LENGTH) {
          winResult = {
            winner: 'BLACK',
            linePositions: line.positions,
          };
        } else if (line.whiteCount === WIN_LINE_LENGTH) {
          winResult = {
            winner: 'WHITE',
            linePositions: line.positions,
          };
        }
      }
    }

    return winResult;
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
    }
    this.updateStack = [];
  }

  /**
   * 复制索引（用于AI模拟）
   */
  clone(): LineIndex {
    const newIndex = new LineIndex(this.width, this.height);

    // 复制计数状态
    for (let i = 0; i < this.lines.length; i++) {
      newIndex.lines[i].blackCount = this.lines[i].blackCount;
      newIndex.lines[i].whiteCount = this.lines[i].whiteCount;
    }

    // 复制更新栈
    newIndex.updateStack = this.updateStack.map(r => ({ ...r }));

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
   * 计算物理线的唯一标识（用于去重重叠段）
   * 沿着方向反向走到棋盘边界，得到 canonical 起点
   * 同一物理直线上的所有4连段共享同一个 key
   */
  static getPhysicalLineKey(line: LineRecord, _width?: number, _height?: number): string {
    // v2: 直接返回预计算值，避免运行时 while 回溯
    // 兼容旧调用方式（width/height 参数不再需要，但保留避免编译错误）
    if (line.physKey) return line.physKey;
    // fallback: 旧 LineRecord 无 physKey 时运行时计算（过渡期兼容）
    return LineIndex.computePhysKey(line, _width ?? 5, _height ?? 6);
  }

  /**
   * 计算物理线去重键（v2新增，供预计算使用）
   */
  static computePhysKey(line: LineRecord, width: number, height: number): string {
    const dir = line.direction;
    const firstPos = line.positions[0];
    let sx = firstPos.x;
    let sy = firstPos.y;
    let sz = firstPos.z;
    while (
      sx - dir.x >= 0 && sx - dir.x < width &&
      sy - dir.y >= 0 && sy - dir.y < width &&
      sz - dir.z >= 0 && sz - dir.z < height
    ) {
      sx -= dir.x;
      sy -= dir.y;
      sz -= dir.z;
    }
    return `${dir.x},${dir.y},${dir.z}:${sx},${sy},${sz}`;
  }
}
