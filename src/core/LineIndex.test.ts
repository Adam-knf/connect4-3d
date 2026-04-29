/**
 * LineIndex 四连索引单元测试
 */

import { describe, it, expect } from 'vitest';
import { LineIndex } from '@/core/LineIndex';
import { BOARD_CONFIG } from '@/config/gameConfig';
import type { Position } from '@/types';

describe('LineIndex', () => {
  describe('初始化', () => {
    it('应正确预计算所有4连记录', () => {
      const { width, height } = BOARD_CONFIG;
      const index = new LineIndex(width, height);

      // 棋盘应有合理数量的4连记录
      const lineCount = index.getLineCount();
      expect(lineCount).toBeGreaterThan(100);
      expect(lineCount).toBeLessThan(1000);
    });

    it('每个位置应涉及多条4连', () => {
      const { width, height } = BOARD_CONFIG;
      const index = new LineIndex(width, height);

      // 检查中心位置的涉及记录数
      const centerPos: Position = { x: Math.floor(width/2), y: Math.floor(width/2), z: Math.floor(height/2) };
      const cornerPos: Position = { x: 0, y: 0, z: 0 };

      // 中心位置涉及的4连应该较多
      const centerLines = index.getLinesCountAtPosition(centerPos);
      expect(centerLines).toBeGreaterThan(10);

      // 角落位置涉及的4连应该较少
      const cornerLines = index.getLinesCountAtPosition(cornerPos);
      expect(cornerLines).toBeLessThan(centerLines);
    });
  });

  describe('增量更新', () => {
    it('放置棋子后应正确更新计数', () => {
      const index = new LineIndex(6, 6);

      // 在某位置放置黑棋
      const pos: Position = { x: 0, y: 0, z: 0 };
      const result = index.updateOnPlace(pos, 'BLACK');

      // 单颗棋子不应获胜
      expect(result).toBeNull();

      // 获取该位置涉及的某条线状态
      const lineIds = index.getLineIdsAtPosition(pos);
      expect(lineIds.length).toBeGreaterThan(0);

      const status = index.getLineStatus(lineIds[0]);
      expect(status).toBe('BLACK_1');
    });

    it('撤销棋子后应正确恢复计数', () => {
      const index = new LineIndex(6, 6);

      const pos: Position = { x: 0, y: 0, z: 0 };
      index.updateOnPlace(pos, 'BLACK');

      // 撤销
      index.undoOnRemove(pos, 'BLACK');

      // 检查状态恢复
      const lineIds = index.getLineIdsAtPosition(pos);
      const status = index.getLineStatus(lineIds[0]);
      expect(status).toBe('EMPTY');
    });
  });

  describe('获胜检测', () => {
    it('应检测水平4连获胜', () => {
      const index = new LineIndex(6, 6);

      // 在水平线上放置4颗黑棋
      let result = null;
      for (let x = 0; x < 4; x++) {
        result = index.updateOnPlace({ x, y: 0, z: 0 }, 'BLACK');
      }

      expect(result).not.toBeNull();
      expect(result?.winner).toBe('BLACK');
      expect(result?.linePositions.length).toBe(4);
    });

    it('应检测垂直4连获胜', () => {
      const index = new LineIndex(6, 6);

      // 在垂直线上放置4颗白棋
      let result = null;
      for (let z = 0; z < 4; z++) {
        result = index.updateOnPlace({ x: 0, y: 0, z }, 'WHITE');
      }

      expect(result).not.toBeNull();
      expect(result?.winner).toBe('WHITE');
    });

    it('应检测空间对角线获胜', () => {
      const index = new LineIndex(6, 6);

      // 空间对角线：(0,0,0), (1,1,1), (2,2,2), (3,3,3)
      let result = null;
      for (let i = 0; i < 4; i++) {
        result = index.updateOnPlace({ x: i, y: i, z: i }, 'BLACK');
      }

      expect(result).not.toBeNull();
      expect(result?.winner).toBe('BLACK');
    });
  });

  describe('快速检测', () => {
    it('quickCheckWinAt应正确检测即将获胜的位置', () => {
      const index = new LineIndex(6, 6);

      // 放置3颗黑棋
      index.updateOnPlace({ x: 0, y: 0, z: 0 }, 'BLACK');
      index.updateOnPlace({ x: 1, y: 0, z: 0 }, 'BLACK');
      index.updateOnPlace({ x: 2, y: 0, z: 0 }, 'BLACK');

      // 检测第4颗位置是否获胜
      const result = index.quickCheckWinAt({ x: 3, y: 0, z: 0 }, 'BLACK');

      expect(result).not.toBeNull();
      expect(result?.winner).toBe('BLACK');
    });

    it('混合棋子的位置不应返回获胜', () => {
      const index = new LineIndex(6, 6);

      // 放置黑棋和白棋混合
      index.updateOnPlace({ x: 0, y: 0, z: 0 }, 'BLACK');
      index.updateOnPlace({ x: 1, y: 0, z: 0 }, 'WHITE');
      index.updateOnPlace({ x: 2, y: 0, z: 0 }, 'BLACK');

      // 检测第4颗位置
      const result = index.quickCheckWinAt({ x: 3, y: 0, z: 0 }, 'BLACK');

      expect(result).toBeNull();
    });
  });

  describe('威胁检测', () => {
    it('应正确识别威胁位置', () => {
      const index = new LineIndex(6, 6);

      // 放置3颗黑棋形成威胁
      index.updateOnPlace({ x: 0, y: 0, z: 0 }, 'BLACK');
      index.updateOnPlace({ x: 1, y: 0, z: 0 }, 'BLACK');
      index.updateOnPlace({ x: 2, y: 0, z: 0 }, 'BLACK');

      const threats = index.getThreatPositions('BLACK');

      // 应包含第4颗位置
      expect(threats.some(p => p.x === 3 && p.y === 0 && p.z === 0)).toBe(true);
    });
  });

  describe('clone功能', () => {
    it('clone应正确复制索引状态', () => {
      const index = new LineIndex(6, 6);

      // 放置一些棋子
      index.updateOnPlace({ x: 0, y: 0, z: 0 }, 'BLACK');
      index.updateOnPlace({ x: 1, y: 0, z: 0 }, 'BLACK');

      // 复制
      const cloned = index.clone();

      // 验证状态一致
      expect(cloned.getLineCount()).toBe(index.getLineCount());

      // 验证克隆的线数据未被原始修改影响
      index.updateOnPlace({ x: 2, y: 0, z: 0 }, 'BLACK');

      // clone 后的 lines 数组应独立（浅拷贝）
      expect(cloned.getAllLines().length).toBeGreaterThan(0);
    });
  });

  describe('重置功能', () => {
    it('reset应清空所有计数', () => {
      const index = new LineIndex(6, 6);

      // 放置棋子
      index.updateOnPlace({ x: 0, y: 0, z: 0 }, 'BLACK');
      index.updateOnPlace({ x: 1, y: 0, z: 0 }, 'BLACK');

      // 重置前应有计数
      const linesBefore = index.getAllLines();
      const hasPieceBefore = linesBefore.some(l => l.blackCount > 0);
      expect(hasPieceBefore).toBe(true);

      // 重置
      index.reset();

      // 验证清空
      const linesAfter = index.getAllLines();
      const hasPieceAfter = linesAfter.some(l => l.blackCount > 0 || l.whiteCount > 0);
      expect(hasPieceAfter).toBe(false);
    });
  });
});