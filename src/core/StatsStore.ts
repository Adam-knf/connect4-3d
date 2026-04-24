/**
 * StatsStore 战绩存储
 * 使用 localStorage 持久化存储战绩数据
 */

import type { Difficulty, GameResult, GameStats, DifficultyStats, StatsStorage } from '@/types';
import { STORAGE_KEYS } from '@/types';

/**
 * 默认战绩数据
 */
const DEFAULT_STATS: StatsStorage = {
  easy: { wins: 0, losses: 0 },
  medium: { wins: 0, losses: 0 },
  hard: { wins: 0, losses: 0 },
};

/**
 * 战绩存储类
 * 管理各难度的胜负记录
 */
export class StatsStore {
  /** 战绩数据 */
  private stats: StatsStorage;

  /**
   * 构造函数
   * 从 localStorage 加载已有数据
   */
  constructor() {
    this.stats = this.loadFromStorage();
  }

  /**
   * 从 localStorage 加载战绩数据
   */
  private loadFromStorage(): StatsStorage {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STATS);
      if (data) {
        const parsed = JSON.parse(data) as StatsStorage;
        // 验证数据结构
        if (
          parsed &&
          typeof parsed.easy === 'object' &&
          typeof parsed.medium === 'object' &&
          typeof parsed.hard === 'object'
        ) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[StatsStore] Failed to load stats from localStorage:', e);
    }
    return { ...DEFAULT_STATS };
  }

  /**
   * 保存战绩数据到 localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(this.stats));
    } catch (e) {
      console.warn('[StatsStore] Failed to save stats to localStorage:', e);
    }
  }

  /**
   * 计算胜率
   * @param wins 胜场
   * @param losses 败场
   * @returns 胜率（百分比，0-100）
   */
  private calculateRate(wins: number, losses: number): number {
    const total = wins + losses;
    if (total === 0) return 0;
    return Math.round((wins / total) * 100);
  }

  /**
   * 获取难度键名（小写）
   */
  private getDifficultyKey(difficulty: Difficulty): keyof StatsStorage {
    switch (difficulty) {
      case 'EASY':
        return 'easy';
      case 'MEDIUM':
        return 'medium';
      case 'HARD':
        return 'hard';
    }
  }

  /**
   * 更新战绩
   * @param difficulty 难度
   * @param result 游戏结果
   */
  update(difficulty: Difficulty, result: GameResult): void {
    const key = this.getDifficultyKey(difficulty);

    if (result === 'WIN') {
      this.stats[key].wins++;
    } else if (result === 'LOSS') {
      this.stats[key].losses++;
    }
    // DRAW 不计入胜负

    this.saveToStorage();
    console.log(`[StatsStore] Updated ${difficulty} stats: wins=${this.stats[key].wins}, losses=${this.stats[key].losses}`);
  }

  /**
   * 获取完整战绩数据（包含胜率计算）
   */
  getStats(): GameStats {
    return {
      easy: {
        wins: this.stats.easy.wins,
        losses: this.stats.easy.losses,
        rate: this.calculateRate(this.stats.easy.wins, this.stats.easy.losses),
      },
      medium: {
        wins: this.stats.medium.wins,
        losses: this.stats.medium.losses,
        rate: this.calculateRate(this.stats.medium.wins, this.stats.medium.losses),
      },
      hard: {
        wins: this.stats.hard.wins,
        losses: this.stats.hard.losses,
        rate: this.calculateRate(this.stats.hard.wins, this.stats.hard.losses),
      },
      total: {
        wins: this.stats.easy.wins + this.stats.medium.wins + this.stats.hard.wins,
        losses: this.stats.easy.losses + this.stats.medium.losses + this.stats.hard.losses,
        rate: this.calculateRate(
          this.stats.easy.wins + this.stats.medium.wins + this.stats.hard.wins,
          this.stats.easy.losses + this.stats.medium.losses + this.stats.hard.losses
        ),
      },
    };
  }

  /**
   * 获取单难度战绩
   * @param difficulty 难度
   */
  getDifficultyStats(difficulty: Difficulty): DifficultyStats {
    const key = this.getDifficultyKey(difficulty);
    return {
      wins: this.stats[key].wins,
      losses: this.stats[key].losses,
      rate: this.calculateRate(this.stats[key].wins, this.stats[key].losses),
    };
  }

  /**
   * 清空战绩数据
   */
  clear(): void {
    this.stats = { ...DEFAULT_STATS };
    this.saveToStorage();
    console.log('[StatsStore] Stats cleared');
  }

  /**
   * 重置单难度战绩
   * @param difficulty 难度
   */
  resetDifficulty(difficulty: Difficulty): void {
    const key = this.getDifficultyKey(difficulty);
    this.stats[key] = { wins: 0, losses: 0 };
    this.saveToStorage();
  }
}