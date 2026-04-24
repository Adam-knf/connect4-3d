/**
 * Board 单元测试
 */

import { describe, it, expect } from 'vitest';
import { Board } from '@/core/Board';
import { BOARD_CONFIG } from '@/config/gameConfig';

describe('Board', () => {
  describe('初始化', () => {
    it('应创建符合配置尺寸的空棋盘', () => {
      const board = new Board();
      const size = board.getSize();

      expect(size.width).toBe(BOARD_CONFIG.width);
      expect(size.height).toBe(BOARD_CONFIG.height);
    });

    it('应支持自定义高度（8层）', () => {
      const board = new Board(8);
      const size = board.getSize();

      expect(size.height).toBe(8);
    });

    it('初始状态应为空', () => {
      const board = new Board();

      expect(board.getPieceCount()).toBe(0);
      expect(board.isFull()).toBe(false);
    });

    it('所有位置初始应为EMPTY', () => {
      const board = new Board();
      const { width, height } = board.getSize();

      for (let x = 0; x < width; x++) {
        for (let y = 0; y < width; y++) {
          for (let z = 0; z < height; z++) {
            expect(board.getPiece({ x, y, z })).toBe('EMPTY');
          }
        }
      }
    });
  });

  describe('重力规则放置', () => {
    it('棋子应落到最底层(z=0)', () => {
      const board = new Board();
      const result = board.placePiece(0, 0, 'BLACK');

      expect(result).not.toBeNull();
      expect(result?.pos.z).toBe(0);
    });

    it('棋子应堆叠在已有棋子上方', () => {
      const board = new Board();

      // 第一颗棋子落到z=0
      board.placePiece(0, 0, 'BLACK');
      // 第二颗棋子落到z=1
      const result = board.placePiece(0, 0, 'WHITE');

      expect(result?.pos.z).toBe(1);
    });

    it('已满的列应返回null', () => {
      const board = new Board(6);
      const { height } = board.getSize();

      // 填满一列
      for (let i = 0; i < height; i++) {
        board.placePiece(0, 0, i % 2 === 0 ? 'BLACK' : 'WHITE');
      }

      // 第height+1颗棋子无法放置
      const result = board.placePiece(0, 0, 'BLACK');
      expect(result).toBeNull();
    });

    it('应正确计算findDropPosition', () => {
      const board = new Board();

      expect(board.findDropPosition(0, 0)).toBe(0);

      board.placePiece(0, 0, 'BLACK');
      expect(board.findDropPosition(0, 0)).toBe(1);

      board.placePiece(0, 0, 'WHITE');
      expect(board.findDropPosition(0, 0)).toBe(2);
    });

    it('无效坐标应返回-1', () => {
      const board = new Board();

      expect(board.findDropPosition(-1, 0)).toBe(-1);
      expect(board.findDropPosition(6, 0)).toBe(-1);
    });
  });

  describe('棋子计数', () => {
    it('应正确统计棋子数量', () => {
      const board = new Board();

      expect(board.getPieceCount()).toBe(0);

      board.placePiece(0, 0, 'BLACK');
      expect(board.getPieceCount()).toBe(1);

      board.placePiece(1, 1, 'WHITE');
      expect(board.getPieceCount()).toBe(2);
    });
  });

  describe('可用列查询', () => {
    it('初始状态所有列都可用', () => {
      const board = new Board();
      const { width } = board.getSize();
      const columns = board.getAvailableColumns();

      expect(columns.length).toBe(width * width);
    });

    it('填满一列后该列应不可用', () => {
      const board = new Board(6);
      const { width, height } = board.getSize();

      // 填满(0,0)列
      for (let i = 0; i < height; i++) {
        board.placePiece(0, 0, 'BLACK');
      }

      const columns = board.getAvailableColumns();
      expect(columns.length).toBe(width * width - 1);
      expect(columns.find(c => c.x === 0 && c.y === 0)).toBeUndefined();
    });
  });

  describe('清空与复制', () => {
    it('clear应清空棋盘', () => {
      const board = new Board();
      board.placePiece(0, 0, 'BLACK');
      board.placePiece(1, 1, 'WHITE');

      board.clear();

      expect(board.getPieceCount()).toBe(0);
      expect(board.getPiece({ x: 0, y: 0, z: 0 })).toBe('EMPTY');
    });

    it('clone应复制棋盘状态', () => {
      const board = new Board();
      board.placePiece(0, 0, 'BLACK');
      board.placePiece(1, 1, 'WHITE');

      const clone = board.clone();

      expect(clone.getPieceCount()).toBe(2);
      expect(clone.getPiece({ x: 0, y: 0, z: 0 })).toBe('BLACK');
      expect(clone.getPiece({ x: 1, y: 1, z: 0 })).toBe('WHITE');
    });

    it('clone修改不影响原棋盘', () => {
      const board = new Board();
      board.placePiece(0, 0, 'BLACK');

      const clone = board.clone();
      clone.placePiece(0, 0, 'WHITE');

      // 原棋盘z=1应为EMPTY，clone应为WHITE
      expect(board.getPiece({ x: 0, y: 0, z: 1 })).toBe('EMPTY');
      expect(clone.getPiece({ x: 0, y: 0, z: 1 })).toBe('WHITE');
    });
  });

  describe('边界检测', () => {
    it('isValidPosition应正确判断边界', () => {
      const board = new Board();
      const { width, height } = board.getSize();

      expect(board.isValidPosition({ x: 0, y: 0, z: 0 })).toBe(true);
      expect(board.isValidPosition({ x: width - 1, y: width - 1, z: height - 1 })).toBe(true);
      expect(board.isValidPosition({ x: -1, y: 0, z: 0 })).toBe(false);
      expect(board.isValidPosition({ x: width, y: 0, z: 0 })).toBe(false);
      expect(board.isValidPosition({ x: 0, y: 0, z: height })).toBe(false);
    });
  });

  describe('棋盘满检测', () => {
    it('isFull应正确判断', () => {
      const board = new Board(6);
      const { width, height } = board.getSize();
      const total = width * width * height;

      // 填满棋盘
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < width; y++) {
          for (let i = 0; i < height; i++) {
            board.placePiece(x, y, i % 2 === 0 ? 'BLACK' : 'WHITE');
          }
        }
      }

      expect(board.getPieceCount()).toBe(total);
      expect(board.isFull()).toBe(true);
    });
  });
});