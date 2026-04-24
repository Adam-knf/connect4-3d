/**
 * StatsStore 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StatsStore } from '@/core/StatsStore';

// 清除 localStorage
function clearLocalStorage() {
  localStorage.clear();
}

describe('StatsStore', () => {
  beforeEach(() => {
    clearLocalStorage();
  });

  describe('初始化', () => {
    it('test_new_instance_should_have_zero_stats', () => {
      const store = new StatsStore();
      const stats = store.getStats();

      expect(stats.easy.wins).toBe(0);
      expect(stats.easy.losses).toBe(0);
      expect(stats.easy.rate).toBe(0);
      expect(stats.medium.wins).toBe(0);
      expect(stats.medium.losses).toBe(0);
      expect(stats.medium.rate).toBe(0);
      expect(stats.hard.wins).toBe(0);
      expect(stats.hard.losses).toBe(0);
      expect(stats.hard.rate).toBe(0);
      expect(stats.total.wins).toBe(0);
      expect(stats.total.losses).toBe(0);
      expect(stats.total.rate).toBe(0);
    });

    it('test_load_from localStorage_should_work', () => {
      // 预先设置 localStorage 数据
      localStorage.setItem('connect4_3d_stats', JSON.stringify({
        easy: { wins: 5, losses: 3 },
        medium: { wins: 2, losses: 4 },
        hard: { wins: 1, losses: 6 }
      }));

      const store = new StatsStore();
      const stats = store.getStats();

      expect(stats.easy.wins).toBe(5);
      expect(stats.easy.losses).toBe(3);
      expect(stats.medium.wins).toBe(2);
      expect(stats.medium.losses).toBe(4);
      expect(stats.hard.wins).toBe(1);
      expect(stats.hard.losses).toBe(6);
    });

    it('test_invalid_localStorage_data_should_fallback_to_default', () => {
      localStorage.setItem('connect4_3d_stats', 'invalid-json');

      const store = new StatsStore();
      const stats = store.getStats();

      expect(stats.easy.wins).toBe(0);
      expect(stats.easy.losses).toBe(0);
    });
  });

  describe('更新战绩', () => {
    it('test_win_should_increment_wins', () => {
      const store = new StatsStore();

      store.update('EASY', 'WIN');
      store.update('EASY', 'WIN');

      const stats = store.getStats();
      expect(stats.easy.wins).toBe(2);
      expect(stats.easy.losses).toBe(0);
    });

    it('test_loss_should_increment_losses', () => {
      const store = new StatsStore();

      store.update('MEDIUM', 'LOSS');
      store.update('MEDIUM', 'LOSS');
      store.update('MEDIUM', 'LOSS');

      const stats = store.getStats();
      expect(stats.medium.wins).toBe(0);
      expect(stats.medium.losses).toBe(3);
    });

    it('test_hard_difficulty_should_update_correctly', () => {
      const store = new StatsStore();

      store.update('HARD', 'WIN');
      store.update('HARD', 'LOSS');
      store.update('HARD', 'WIN');

      const stats = store.getStats();
      expect(stats.hard.wins).toBe(2);
      expect(stats.hard.losses).toBe(1);
    });

    it('test_draw_should_not_affect_stats', () => {
      const store = new StatsStore();

      store.update('EASY', 'DRAW');
      store.update('MEDIUM', 'DRAW');
      store.update('HARD', 'DRAW');

      const stats = store.getStats();
      expect(stats.easy.wins).toBe(0);
      expect(stats.easy.losses).toBe(0);
      expect(stats.medium.wins).toBe(0);
      expect(stats.medium.losses).toBe(0);
      expect(stats.hard.wins).toBe(0);
      expect(stats.hard.losses).toBe(0);
    });
  });

  describe('胜率计算', () => {
    it('test_win_rate_should_be_100_percent_when_all_wins', () => {
      const store = new StatsStore();

      store.update('EASY', 'WIN');
      store.update('EASY', 'WIN');
      store.update('EASY', 'WIN');

      const stats = store.getStats();
      expect(stats.easy.rate).toBe(100);
    });

    it('test_win_rate_should_be_0_percent_when_all_losses', () => {
      const store = new StatsStore();

      store.update('EASY', 'LOSS');
      store.update('EASY', 'LOSS');

      const stats = store.getStats();
      expect(stats.easy.rate).toBe(0);
    });

    it('test_win_rate_should_be_50_percent_when_equal_wins_losses', () => {
      const store = new StatsStore();

      store.update('EASY', 'WIN');
      store.update('EASY', 'LOSS');

      const stats = store.getStats();
      expect(stats.easy.rate).toBe(50);
    });

    it('test_win_rate_should_round_correctly', () => {
      const store = new StatsStore();

      // 1 win, 2 losses = 1/3 = 33.33% -> 33%
      store.update('EASY', 'WIN');
      store.update('EASY', 'LOSS');
      store.update('EASY', 'LOSS');

      const stats = store.getStats();
      expect(stats.easy.rate).toBe(33);
    });
  });

  describe('总计数据', () => {
    it('test_total_should_sum_all_difficulties', () => {
      const store = new StatsStore();

      store.update('EASY', 'WIN');
      store.update('EASY', 'WIN');
      store.update('MEDIUM', 'WIN');
      store.update('MEDIUM', 'LOSS');
      store.update('HARD', 'LOSS');

      const stats = store.getStats();

      expect(stats.total.wins).toBe(3); // 2 + 1 + 0
      expect(stats.total.losses).toBe(2); // 0 + 1 + 1
    });

    it('test_total_rate_should_be_accurate', () => {
      const store = new StatsStore();

      // 总计：3 wins, 3 losses = 50%
      store.update('EASY', 'WIN');
      store.update('EASY', 'WIN');
      store.update('MEDIUM', 'WIN');
      store.update('MEDIUM', 'LOSS');
      store.update('MEDIUM', 'LOSS');
      store.update('HARD', 'LOSS');

      const stats = store.getStats();
      expect(stats.total.rate).toBe(50);
    });
  });

  describe('清空战绩', () => {
    it('test_clear_should_reset_all_stats', () => {
      const store = new StatsStore();

      store.update('EASY', 'WIN');
      store.update('MEDIUM', 'WIN');
      store.update('HARD', 'LOSS');

      store.clear();

      const stats = store.getStats();
      expect(stats.easy.wins).toBe(0);
      expect(stats.medium.wins).toBe(0);
      expect(stats.hard.losses).toBe(0);
      expect(stats.total.wins).toBe(0);
    });
  });

  describe('单难度重置', () => {
    it('test_resetDifficulty_should_reset_single_difficulty', () => {
      const store = new StatsStore();

      store.update('EASY', 'WIN');
      store.update('EASY', 'WIN');
      store.update('MEDIUM', 'WIN');
      store.update('HARD', 'LOSS');

      store.resetDifficulty('EASY');

      const stats = store.getStats();
      expect(stats.easy.wins).toBe(0);
      expect(stats.easy.losses).toBe(0);
      expect(stats.medium.wins).toBe(1);
      expect(stats.hard.losses).toBe(1);
    });
  });

  describe('localStorage 持久化', () => {
    it('test_data_should_persist_after_page_reload', () => {
      const store = new StatsStore();
      store.update('EASY', 'WIN');
      store.update('MEDIUM', 'LOSS');

      // 模拟页面刷新（重新创建实例）
      const store2 = new StatsStore();
      const stats = store2.getStats();

      expect(stats.easy.wins).toBe(1);
      expect(stats.medium.losses).toBe(1);
    });
  });

  describe('边界值测试', () => {
    it('test_many_games_should_not_overflow', () => {
      const store = new StatsStore();

      // 进行 100 场游戏
      for (let i = 0; i < 50; i++) {
        store.update('EASY', 'WIN');
      }
      for (let i = 0; i < 50; i++) {
        store.update('EASY', 'LOSS');
      }

      const stats = store.getStats();
      expect(stats.easy.wins).toBe(50);
      expect(stats.easy.losses).toBe(50);
      expect(stats.easy.rate).toBe(50);
    });
  });
});
