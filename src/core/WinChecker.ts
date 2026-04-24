/**
 * WinChecker 胜负判定
 * 检测13个方向的4子连线
 * 支持传统扫描和四连索引两种检测方式
 */

import type { Player, Position, WinResult, Vector3 } from '@/types';
import { DIRECTIONS, WIN_LINE_LENGTH } from '@/types';
import { Board } from './Board';

/**
 * 胜负判定类
 * 检测棋盘上的4子连线
 */
export class WinChecker {
  // ==================== 四连索引优化方法（推荐使用） ====================

  /**
   * 使用四连索引快速检测获胜连线
   * 复杂度：O(1) 直接查询索引状态
   * @param board 棋盘实例
   * @returns 胜负判定结果，无获胜则返回null
   */
  static checkWinFast(board: Board): WinResult | null {
    return board.checkWinWithIndex();
  }

  /**
   * 使用四连索引快速检测指定位置放置后是否获胜
   * 复杂度：O(13) 查询该位置涉及的索引
   * 用于AI高频评估
   * @param board 棋盘实例
   * @param pos 放置位置
   * @param player 玩家类型
   * @returns 如果放置后形成4连返回获胜结果
   */
  static quickWouldWinFast(board: Board, pos: Position, player: Player): WinResult | null {
    return board.quickWouldWinAt(pos, player);
  }

  /**
   * 获取指定玩家的威胁位置
   * 使用四连索引快速查询
   * @param board 棋盘实例
   * @param player 玩家类型
   * @returns 威胁位置列表
   */
  static getThreatsFast(board: Board, player: Player): Position[] {
    return board.getThreatPositions(player);
  }

  /**
   * 获取局势评估分数
   * 使用四连索引计算威胁评估
   * @param board 棋盘实例
   * @param player 当前视角玩家
   * @returns 评估分数
   */
  static evaluateFast(board: Board, player: Player): number {
    return board.getEvaluationScore(player);
  }

  // ==================== 传统扫描方法（兼容保留） ====================
  /**
   * 检查是否有获胜连线
   * @param board 棋盘实例
   * @returns 胜负判定结果，无获胜则返回null
   */
  static checkWin(board: Board): WinResult | null {
    // 获取棋盘尺寸
    const { width, height } = board.getSize();

    // 遍历所有位置作为起点
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < width; y++) {
        for (let z = 0; z < height; z++) {
          const player = board.getPiece({ x, y, z });

          // 只有黑棋或白棋才需要检测
          if (player === 'EMPTY') {
            continue;
          }

          // 从该位置检测所有13个方向
          const result = this.checkFromPosition(board, { x, y, z }, player);
          if (result) {
            return result;
          }
        }
      }
    }

    return null;
  }

  /**
   * 从指定位置检测连线
   * @param board 棋盘实例
   * @param startPos 起点
   * @param player 玩家类型
   * @returns 若有连线返回结果，否则返回null
   */
  private static checkFromPosition(
    board: Board,
    startPos: Position,
    player: Player
  ): WinResult | null {
    // 只需要检测正向方向（避免重复检测）
    // 从每个起点只需检测正向方向，因为反向会在其他起点被检测
    const forwardDirections = this.getForwardDirections();

    for (const dir of forwardDirections) {
      const linePositions = this.checkLine(board, startPos, dir, player);
      if (linePositions) {
        return {
          winner: player,
          linePositions,
        };
      }
    }

    return null;
  }

  /**
   * 获取正向方向向量（避免重复检测）
   * 只保留每个方向的正向版本，减少检测次数
   */
  private static getForwardDirections(): Vector3[] {
    // 13个方向的正向版本：
    // 4个水平方向（同层）
    // 1个垂直方向
    // 4个跨层斜线方向（只需检测向上版本）
    // 4个空间对角线方向（只需检测向上版本）
    return [
      // 水平（同层）- 保留正向
      { x: 1, y: 0, z: 0 },   // 横线
      { x: 0, y: 1, z: 0 },   // 竖线
      { x: 1, y: 1, z: 0 },   // XY对角线
      { x: 1, y: -1, z: 0 },  // XY反对角线
      // 垂直 - 只需检测向上
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
  }

  /**
   * 检测某方向的连线
   * @param board 棋盘实例
   * @param startPos 起点
   * @param direction 方向向量
   * @param player 玩家类型
   * @returns 若有4子连线返回位置列表，否则返回null
   */
  private static checkLine(
    board: Board,
    startPos: Position,
    direction: Vector3,
    player: Player
  ): Position[] | null {
    const positions: Position[] = [];

    // 检测连续4格
    for (let i = 0; i < WIN_LINE_LENGTH; i++) {
      const pos: Position = {
        x: startPos.x + direction.x * i,
        y: startPos.y + direction.y * i,
        z: startPos.z + direction.z * i,
      };

      // 检查位置有效性
      if (!board.isValidPosition(pos)) {
        return null;
      }

      // 检查是否为当前玩家的棋子
      if (board.getPiece(pos) !== player) {
        return null;
      }

      positions.push(pos);
    }

    // 找到4子连线
    return positions;
  }

  /**
   * 检查游戏是否平局
   * @param board 棋盘实例
   * @returns 是否平局
   */
  static checkDraw(board: Board): boolean {
    // 棋盘满且无获胜连线
    return board.isFull() && !this.checkWin(board);
  }

  /**
   * 检测指定位置放置棋子后是否获胜
   * 用于AI评估和即时判定
   * @param board 棋盘实例
   * @param pos 放置位置
   * @param player 玩家类型
   * @returns 是否形成获胜连线
   */
  static wouldWin(board: Board, pos: Position, player: Player): WinResult | null {
    // 临时在该位置放置棋子
    const originalPiece = board.getPiece(pos);

    // 如果位置已有棋子且不是EMPTY，无法放置
    if (originalPiece !== 'EMPTY') {
      return null;
    }

    // 临时设置
    board.setPiece(pos, player);

    // 检查是否获胜
    const result = this.checkWin(board);

    // 还原
    board.setPiece(pos, originalPiece);

    return result;
  }

  /**
   * 快速检测指定位置放置棋子后是否获胜（AI高频调用优化版）
   * 只检测以该位置为中心的13方向连线，避免全盘扫描
   * 复杂度：O(13 × 7) ≈ 91次检查，比 wouldWin 提升约30倍
   * @param board 棋盘实例
   * @param pos 放置位置
   * @param player 玩家类型
   * @returns 是否形成获胜连线
   */
  static quickWouldWin(board: Board, pos: Position, player: Player): WinResult | null {
    // 如果位置已有棋子且不是EMPTY，无法放置
    if (board.getPiece(pos) !== 'EMPTY') {
      return null;
    }

    // 临时在该位置放置棋子
    board.setPiece(pos, player);

    // 只检测以该位置为中心的13方向连线
    const result = this.quickCheckWin(board, pos);

    // 还原
    board.setPiece(pos, 'EMPTY');

    return result;
  }

  /**
   * 检测指定玩家在棋盘上的威胁情况
   * 用于AI评估
   * @param board 棋盘实例
   * @param player 玩家类型
   * @returns 所有3子连线（下一步可获胜）的位置列表
   */
  static findThreats(board: Board, player: Player): Position[][] {
    const threats: Position[][] = [];
    const { width, height } = board.getSize();

    // 遍历所有位置作为起点
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < width; y++) {
        for (let z = 0; z < height; z++) {
          if (board.getPiece({ x, y, z }) !== player) {
            continue;
          }

          // 检测各方向的3子连线
          const forwardDirections = this.getForwardDirections();
          for (const dir of forwardDirections) {
            const threat = this.checkThreatLine(board, { x, y, z }, dir, player);
            if (threat) {
              threats.push(threat);
            }
          }
        }
      }
    }

    return threats;
  }

  /**
   * 检测某方向的威胁线（3子连线，第4格为空）
   * @param board 棋盘实例
   * @param startPos 起点
   * @param direction 方向向量
   * @param player 玩家类型
   * @returns 若有3子威胁返回位置列表，否则返回null
   */
  private static checkThreatLine(
    board: Board,
    startPos: Position,
    direction: Vector3,
    player: Player
  ): Position[] | null {
    const positions: Position[] = [];
    let emptyPos: Position | null = null;

    for (let i = 0; i < WIN_LINE_LENGTH; i++) {
      const pos: Position = {
        x: startPos.x + direction.x * i,
        y: startPos.y + direction.y * i,
        z: startPos.z + direction.z * i,
      };

      if (!board.isValidPosition(pos)) {
        return null;
      }

      const piece = board.getPiece(pos);

      if (piece === player) {
        positions.push(pos);
      } else if (piece === 'EMPTY' && !emptyPos) {
        emptyPos = pos;
        positions.push(pos);
      } else {
        return null;
      }
    }

    // 确认是3子+1空
    if (positions.length === WIN_LINE_LENGTH && emptyPos) {
      return positions;
    }

    return null;
  }

  /**
   * 快速检测最近放置的棋子是否获胜
   * 只检测以该位置为中心的连线，减少计算量
   * @param board 棋盘实例
   * @param lastPos 最近放置的位置
   * @returns 胜负判定结果，无获胜则返回null
   */
  static quickCheckWin(board: Board, lastPos: Position): WinResult | null {
    const player = board.getPiece(lastPos);
    if (player === 'EMPTY') {
      return null;
    }

    // 检测所有13个方向
    for (const dir of DIRECTIONS) {
      // 找到该方向上的连线起点
      const linePositions = this.findLineFromCenter(board, lastPos, dir, player);
      if (linePositions && linePositions.length >= WIN_LINE_LENGTH) {
        return {
          winner: player,
          linePositions: linePositions.slice(0, WIN_LINE_LENGTH),
        };
      }
    }

    return null;
  }

  /**
   * 从中心位置向两个方向查找连线
   * @param board 棋盘实例
   * @param centerPos 中心位置
   * @param direction 方向向量
   * @param player 玩家类型
   * @returns 连线位置列表
   */
  private static findLineFromCenter(
    board: Board,
    centerPos: Position,
    direction: Vector3,
    player: Player
  ): Position[] | null {
    const positions: Position[] = [centerPos];

    // 向正方向查找
    for (let i = 1; i < WIN_LINE_LENGTH; i++) {
      const pos: Position = {
        x: centerPos.x + direction.x * i,
        y: centerPos.y + direction.y * i,
        z: centerPos.z + direction.z * i,
      };

      if (!board.isValidPosition(pos) || board.getPiece(pos) !== player) {
        break;
      }
      positions.push(pos);
    }

    // 向反方向查找
    for (let i = 1; i < WIN_LINE_LENGTH; i++) {
      const pos: Position = {
        x: centerPos.x - direction.x * i,
        y: centerPos.y - direction.y * i,
        z: centerPos.z - direction.z * i,
      };

      if (!board.isValidPosition(pos) || board.getPiece(pos) !== player) {
        break;
      }
      positions.unshift(pos);
    }

    return positions.length >= WIN_LINE_LENGTH ? positions : null;
  }
}