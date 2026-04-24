/**
 * WinChecker 单元测试
 */

import { describe, it, expect } from 'vitest';
import { Board } from '@/core/Board';
import { WinChecker } from '@/core/WinChecker';

describe('WinChecker', () => {
  describe('水平连线检测（同层）', () => {
    it('应检测X方向水平连线', () => {
      const board = new Board();

      // 在z=0层放置4颗连续黑棋
      board.placePiece(0, 0, 'BLACK');
      board.placePiece(1, 0, 'BLACK');
      board.placePiece(2, 0, 'BLACK');
      board.placePiece(3, 0, 'BLACK');

      const result = WinChecker.checkWin(board);

      expect(result).not.toBeNull();
      expect(result?.winner).toBe('BLACK');
      expect(result?.linePositions.length).toBe(4);
    });

    it('应检测Y方向水平连线', () => {
      const board = new Board();

      board.placePiece(0, 0, 'WHITE');
      board.placePiece(0, 1, 'WHITE');
      board.placePiece(0, 2, 'WHITE');
      board.placePiece(0, 3, 'WHITE');

      const result = WinChecker.checkWin(board);

      expect(result).not.toBeNull();
      expect(result?.winner).toBe('WHITE');
    });

    it('应检测XY对角线连线', () => {
      const board = new Board();

      board.placePiece(0, 0, 'BLACK');
      board.placePiece(1, 1, 'BLACK');
      board.placePiece(2, 2, 'BLACK');
      board.placePiece(3, 3, 'BLACK');

      const result = WinChecker.checkWin(board);

      expect(result).not.toBeNull();
      expect(result?.winner).toBe('BLACK');
    });

    it('应检测XY反对角线连线', () => {
      const board = new Board();

      board.placePiece(0, 3, 'WHITE');
      board.placePiece(1, 2, 'WHITE');
      board.placePiece(2, 1, 'WHITE');
      board.placePiece(3, 0, 'WHITE');

      const result = WinChecker.checkWin(board);

      expect(result).not.toBeNull();
      expect(result?.winner).toBe('WHITE');
    });
  });

  describe('垂直连线检测', () => {
    it('应检测垂直连线（跨层）', () => {
      const board = new Board();

      // 在同一列堆叠4颗棋子
      board.placePiece(0, 0, 'BLACK');
      board.placePiece(0, 0, 'BLACK');
      board.placePiece(0, 0, 'BLACK');
      board.placePiece(0, 0, 'BLACK');

      const result = WinChecker.checkWin(board);

      expect(result).not.toBeNull();
      expect(result?.winner).toBe('BLACK');
      // 连线位置应为 (0,0,0), (0,0,1), (0,0,2), (0,0,3)
      expect(result?.linePositions.every(p => p.x === 0 && p.y === 0)).toBe(true);
    });
  });

  describe('跨层斜线检测', () => {
    it('应检测XZ平面对角线', () => {
      const board = new Board(6);

      // 构造XZ对角线：(0,0,0), (1,0,1), (2,0,2), (3,0,3)
      // 需要先填充底层让棋子能落到指定位置
      board.setPiece({ x: 0, y: 0, z: 0 }, 'BLACK');
      board.setPiece({ x: 0, y: 0, z: 1 }, 'WHITE'); // 填充z=1让下一颗落到z=1
      board.setPiece({ x: 1, y: 0, z: 0 }, 'WHITE');
      board.setPiece({ x: 1, y: 0, z: 1 }, 'BLACK');
      board.setPiece({ x: 2, y: 0, z: 0 }, 'WHITE');
      board.setPiece({ x: 2, y: 0, z: 1 }, 'WHITE');
      board.setPiece({ x: 2, y: 0, z: 2 }, 'BLACK');
      board.setPiece({ x: 3, y: 0, z: 0 }, 'WHITE');
      board.setPiece({ x: 3, y: 0, z: 1 }, 'WHITE');
      board.setPiece({ x: 3, y: 0, z: 2 }, 'WHITE');
      board.setPiece({ x: 3, y: 0, z: 3 }, 'BLACK');

      const result = WinChecker.checkWin(board);

      expect(result).not.toBeNull();
      expect(result?.winner).toBe('BLACK');
    });

    it('应检测空间对角线（三维全变化）', () => {
      const board = new Board(6);

      // 构造空间对角线：(0,0,0), (1,1,1), (2,2,2), (3,3,3)
      board.setPiece({ x: 0, y: 0, z: 0 }, 'BLACK');
      board.setPiece({ x: 1, y: 1, z: 1 }, 'BLACK');
      board.setPiece({ x: 2, y: 2, z: 2 }, 'BLACK');
      board.setPiece({ x: 3, y: 3, z: 3 }, 'BLACK');

      const result = WinChecker.checkWin(board);

      expect(result).not.toBeNull();
      expect(result?.winner).toBe('BLACK');
    });
  });

  describe('无连线检测', () => {
    it('无连线时应返回null', () => {
      const board = new Board();

      board.placePiece(0, 0, 'BLACK');
      board.placePiece(1, 0, 'BLACK');
      board.placePiece(2, 0, 'BLACK'); // 只有3颗，无连线

      const result = WinChecker.checkWin(board);

      expect(result).toBeNull();
    });

    it('空棋盘应返回null', () => {
      const board = new Board();

      const result = WinChecker.checkWin(board);

      expect(result).toBeNull();
    });

    it('混合棋子无连线应返回null', () => {
      const board = new Board();

      board.placePiece(0, 0, 'BLACK');
      board.placePiece(1, 0, 'WHITE'); // 打断连线
      board.placePiece(2, 0, 'BLACK');
      board.placePiece(3, 0, 'BLACK');

      const result = WinChecker.checkWin(board);

      expect(result).toBeNull();
    });
  });

  describe('平局检测', () => {
    it('非满棋盘不应为平局', () => {
      const board = new Board();

      expect(WinChecker.checkDraw(board)).toBe(false);
    });

    it('满棋盘且有连线不应为平局', () => {
      const board = new Board();

      // 添加连线
      board.placePiece(0, 0, 'BLACK');
      board.placePiece(1, 0, 'BLACK');
      board.placePiece(2, 0, 'BLACK');
      board.placePiece(3, 0, 'BLACK');

      expect(WinChecker.checkDraw(board)).toBe(false);
    });
  });

  describe('快速检测', () => {
    it('quickCheckWin应正确检测最后放置位置的连线', () => {
      const board = new Board();

      board.placePiece(0, 0, 'BLACK');
      board.placePiece(1, 0, 'BLACK');
      board.placePiece(2, 0, 'BLACK');
      const result4 = board.placePiece(3, 0, 'BLACK');

      expect(result4).not.toBeNull();
      expect(result4?.winResult).not.toBeNull();
      expect(result4?.winResult?.winner).toBe('BLACK');
    });

    it('quickCheckWin无连线应返回null', () => {
      const board = new Board();

      const result = board.placePiece(0, 0, 'BLACK');
      expect(result).not.toBeNull();
      expect(result?.winResult).toBeNull();
    });

    it('placePiece应返回获胜结果', () => {
      const board = new Board();

      // 前3颗不获胜
      const r1 = board.placePiece(0, 0, 'BLACK');
      expect(r1?.winResult).toBeNull();
      const r2 = board.placePiece(1, 0, 'BLACK');
      expect(r2?.winResult).toBeNull();
      const r3 = board.placePiece(2, 0, 'BLACK');
      expect(r3?.winResult).toBeNull();

      // 第4颗获胜
      const r4 = board.placePiece(3, 0, 'BLACK');
      expect(r4?.winResult).not.toBeNull();
      expect(r4?.winResult?.winner).toBe('BLACK');
    });
  });

  describe('威胁检测', () => {
    it('应检测3子威胁', () => {
      const board = new Board();

      board.placePiece(0, 0, 'BLACK');
      board.placePiece(1, 0, 'BLACK');
      board.placePiece(2, 0, 'BLACK');

      const threats = WinChecker.findThreats(board, 'BLACK');

      expect(threats.length).toBeGreaterThan(0);
    });
  });

  describe('quickWouldWin（AI高频调用优化）', () => {
    it('应检测可获胜的放置位置', () => {
      const board = new Board();

      // 放置3颗黑棋，第4颗可获胜
      board.placePiece(0, 0, 'BLACK');
      board.placePiece(1, 0, 'BLACK');
      board.placePiece(2, 0, 'BLACK');

      // 检测在 (3, 0) 放置是否获胜
      const result = WinChecker.quickWouldWin(board, { x: 3, y: 0, z: 0 }, 'BLACK');

      expect(result).not.toBeNull();
      expect(result?.winner).toBe('BLACK');
    });

    it('不应改变棋盘状态', () => {
      const board = new Board();

      board.placePiece(0, 0, 'BLACK');
      board.placePiece(1, 0, 'BLACK');
      board.placePiece(2, 0, 'BLACK');

      // 检测前棋盘状态
      const pieceCountBefore = board.getPieceCount();

      // 检测在 (3, 0) 放置是否获胜
      WinChecker.quickWouldWin(board, { x: 3, y: 0, z: 0 }, 'BLACK');

      // 检测后棋盘状态应不变
      expect(board.getPieceCount()).toBe(pieceCountBefore);
      expect(board.getPiece({ x: 3, y: 0, z: 0 })).toBe('EMPTY');
    });

    it('不可获胜位置应返回null', () => {
      const board = new Board();

      board.placePiece(0, 0, 'BLACK');

      const result = WinChecker.quickWouldWin(board, { x: 1, y: 0, z: 0 }, 'BLACK');

      expect(result).toBeNull();
    });

    it('已有棋子位置应返回null', () => {
      const board = new Board();

      board.placePiece(0, 0, 'BLACK');

      const result = WinChecker.quickWouldWin(board, { x: 0, y: 0, z: 0 }, 'BLACK');

      expect(result).toBeNull();
    });

    it('应检测空间对角线获胜', () => {
      const board = new Board(6);

      // 构造空间对角线的前3颗
      board.setPiece({ x: 0, y: 0, z: 0 }, 'BLACK');
      board.setPiece({ x: 1, y: 1, z: 1 }, 'BLACK');
      board.setPiece({ x: 2, y: 2, z: 2 }, 'BLACK');

      // 检测第4颗是否获胜
      const result = WinChecker.quickWouldWin(board, { x: 3, y: 3, z: 3 }, 'BLACK');

      expect(result).not.toBeNull();
      expect(result?.winner).toBe('BLACK');
    });
  });
});