/**
 * Board 棋盘状态管理
 * 三维数组存储棋盘状态，重力规则放置棋子
 * 集成四连索引（LineIndex）优化连线检测
 */

import type { Player, Position, WinResult, LineRecord } from '@/types';
import { BOARD_CONFIG } from '@/config/gameConfig';
import { LineIndex } from './LineIndex';

/**
 * 棋盘类
 * 管理三维棋盘状态，实现重力规则
 */
export class Board {
  /** 三维数组存储棋盘状态 [x][y][z] */
  private grid: Player[][][];

  /** 棋盘宽度（长宽） */
  private width: number;

  /** 棋盘高度（层数） */
  private height: number;

  /** 已放置的棋子数量 */
  private pieceCount: number = 0;

  /** 四连索引表（优化连线检测） */
  private lineIndex: LineIndex;

  /**
   * 构造函数
   * @param height 棋盘高度（由 GameState.getBoardHeight() 根据难度计算传入）
   */
  constructor(height?: number) {
    this.width = BOARD_CONFIG.width;
    this.height = height ?? BOARD_CONFIG.height;

    // 初始化三维数组，全部为 EMPTY
    this.grid = this.createEmptyGrid();

    // 初始化四连索引表
    this.lineIndex = new LineIndex(this.width, this.height);

    // 设置棋子状态回调（用于计算开放端）
    this.lineIndex.setGetPieceAt(this.getPiece.bind(this));
  }

  /**
   * 创建空的三维数组
   */
  private createEmptyGrid(): Player[][][] {
    const grid: Player[][][] = [];

    for (let x = 0; x < this.width; x++) {
      grid[x] = [];
      for (let y = 0; y < this.width; y++) {
        grid[x][y] = [];
        for (let z = 0; z < this.height; z++) {
          grid[x][y][z] = 'EMPTY';
        }
      }
    }

    return grid;
  }

  /**
   * 获取棋盘尺寸
   */
  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /**
   * 获取指定位置的棋子
   * @param pos 位置坐标
   */
  getPiece(pos: Position): Player {
    if (!this.isValidPosition(pos)) {
      return 'EMPTY';
    }
    return this.grid[pos.x][pos.y][pos.z];
  }

  /**
   * 判断位置是否有效
   * @param pos 位置坐标
   */
  isValidPosition(pos: Position): boolean {
    return (
      pos.x >= 0 && pos.x < this.width &&
      pos.y >= 0 && pos.y < this.width &&
      pos.z >= 0 && pos.z < this.height
    );
  }

  /**
   * 根据重力规则计算棋子最终落点
   * 棋子从顶层(z=height-1)开始，落到该列最底层可用位置
   * @param x X坐标
   * @param y Y坐标
   * @returns 最终落点Z坐标，-1表示该列已满
   */
  findDropPosition(x: number, y: number): number {
    // 检查坐标是否有效
    if (x < 0 || x >= this.width || y < 0 || y >= this.width) {
      return -1;
    }

    // 从底层向上查找第一个空位
    for (let z = 0; z < this.height; z++) {
      if (this.grid[x][y][z] === 'EMPTY') {
        return z;
      }
    }

    // 该列已满
    return -1;
  }

  /**
   * 放置棋子（重力规则）
   * @param x X坐标
   * @param y Y坐标
   * @param player 玩家类型
   * @returns 成功放置返回最终位置和胜负结果，失败返回null
   */
  placePiece(x: number, y: number, player: Player): { pos: Position; winResult: WinResult | null } | null {
    // 计算落点
    const z = this.findDropPosition(x, y);
    if (z === -1) {
      return null; // 该列已满
    }

    const pos = { x, y, z };

    // 放置棋子到三维数组
    this.grid[x][y][z] = player;
    this.pieceCount++;

    // 更新四连索引，检测是否获胜
    const winResult = this.lineIndex.updateOnPlace(pos, player);

    return { pos, winResult };
  }

  /**
   * 直接在指定位置放置棋子（用于AI模拟等）
   * @param pos 位置坐标
   * @param player 玩家类型
   * @returns 是否成功
   */
  setPiece(pos: Position, player: Player): boolean {
    if (!this.isValidPosition(pos)) {
      return false;
    }
    if (this.grid[pos.x][pos.y][pos.z] !== 'EMPTY' && player !== 'EMPTY') {
      return false; // 位置已有棋子
    }

    const wasEmpty = this.grid[pos.x][pos.y][pos.z] === 'EMPTY';
    const oldPlayer = this.grid[pos.x][pos.y][pos.z];

    // 更新三维数组
    this.grid[pos.x][pos.y][pos.z] = player;

    // 更新棋子计数
    if (wasEmpty && player !== 'EMPTY') {
      this.pieceCount++;
    } else if (!wasEmpty && player === 'EMPTY') {
      this.pieceCount--;
    }

    // 更新四连索引
    if (player !== 'EMPTY') {
      this.lineIndex.updateOnPlace(pos, player);
    } else if (oldPlayer !== 'EMPTY') {
      this.lineIndex.undoOnRemove(pos, oldPlayer);
    }

    return true;
  }

  /**
   * 获取所有可放置的列（未满的列）
   * @returns 可放置的(x,y)坐标列表
   */
  getAvailableColumns(): { x: number; y: number }[] {
    const columns: { x: number; y: number }[] = [];

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.width; y++) {
        if (this.findDropPosition(x, y) !== -1) {
          columns.push({ x, y });
        }
      }
    }

    return columns;
  }

  /**
   * 检查棋盘是否已满
   */
  isFull(): boolean {
    return this.pieceCount >= this.width * this.width * this.height;
  }

  /**
   * 获取已放置棋子数量
   */
  getPieceCount(): number {
    return this.pieceCount;
  }

  /**
   * 清空棋盘
   */
  clear(): void {
    this.grid = this.createEmptyGrid();
    this.pieceCount = 0;
    this.lineIndex.reset();
  }

  /**
   * 复制棋盘状态（用于AI模拟）
   * @returns 新的Board实例
   */
  clone(): Board {
    const newBoard = new Board(this.height);
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.width; y++) {
        for (let z = 0; z < this.height; z++) {
          newBoard.grid[x][y][z] = this.grid[x][y][z];
        }
      }
    }
    newBoard.pieceCount = this.pieceCount;
    // 复制四连索引状态（clone 已经设置了 getPieceAt 回调）
    newBoard.lineIndex = this.lineIndex.clone();
    // 设置回调（指向新棋盘的 getPiece）
    newBoard.lineIndex.setGetPieceAt(newBoard.getPiece.bind(newBoard));
    return newBoard;
  }

  /**
   * 获取整个棋盘状态（用于渲染）
   * @returns 三维数组副本
   */
  getGrid(): Player[][][] {
    return this.grid.map(xLayer =>
      xLayer.map(yLayer =>
        yLayer.slice()
      )
    );
  }

  /**
   * 获取某列顶层棋子的位置
   * @param x X坐标
   * @param y Y坐标
   * @returns 顶层棋子位置，若该列空则返回null
   */
  getTopPiece(x: number, y: number): Position | null {
    for (let z = this.height - 1; z >= 0; z--) {
      if (this.grid[x][y][z] !== 'EMPTY') {
        return { x, y, z };
      }
    }
    return null;
  }

  /**
   * 获取某列顶层可用位置（用于预览棋子）
   * @param x X坐标
   * @param y Y坐标
   * @returns 顶层可用位置，若该列已满则返回null
   */
  getTopEmptyPosition(x: number, y: number): Position | null {
    const z = this.findDropPosition(x, y);
    if (z === -1) {
      return null;
    }
    return { x, y, z };
  }

  // ==================== 四连索引相关方法 ====================

  /**
   * 获取四连索引实例
   */
  getLineIndex(): LineIndex {
    return this.lineIndex;
  }

  /**
   * 快速检测指定位置放置后是否获胜（使用四连索引）
   * @param pos 放置位置
   * @param player 玩家类型
   * @returns 如果放置后形成4连返回获胜结果
   */
  quickWouldWinAt(pos: Position, player: Player): WinResult | null {
    if (this.grid[pos.x][pos.y][pos.z] !== 'EMPTY') {
      return null;
    }
    return this.lineIndex.quickCheckWinAt(pos, player);
  }

  /**
   * 检测当前棋盘是否有获胜连线（使用四连索引）
   * @returns 胜负结果或null
   */
  checkWinWithIndex(): WinResult | null {
    return this.lineIndex.checkWin();
  }

  /**
   * 获取指定玩家的威胁位置列表
   * @param player 玩家类型
   * @returns 威胁位置列表
   */
  getThreatPositions(player: Player): Position[] {
    return this.lineIndex.getThreatPositions(player);
  }

  /**
   * 获取当前局势评估分数（用于AI评估）
   * @param player 当前玩家（AI视角）
   * @param debug 是否输出调试信息
   * @returns 评估分数
   */
  getEvaluationScore(player: Player, debug: boolean = false): number {
    return this.lineIndex.getEvaluationScore(player, debug);
  }

  /**
   * 获取位置涉及的4连ID列表（委托给LineIndex）
   * @param pos 位置坐标
   * @returns 4连ID列表
   */
  getLineIdsAtPosition(pos: Position): number[] {
    return this.lineIndex.getLineIdsAtPosition(pos);
  }

  /**
   * 获取指定4连的完整记录（委托给LineIndex）
   * @param lineId 4连ID
   * @returns 4连记录或null
   */
  getLineRecord(lineId: number): LineRecord | null {
    return this.lineIndex.getLineRecord(lineId);
  }

  /**
   * 获取所有4连记录（用于全局评估）
   * @returns 所有4连记录数组
   */
  getAllLineRecords(): LineRecord[] {
    return this.lineIndex.getAllLines();
  }
}