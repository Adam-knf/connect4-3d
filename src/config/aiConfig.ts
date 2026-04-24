/**
 * AI配置
 * 包含难度配置、评估参数等
 */

import type { Difficulty, AIConfig } from '@/types';

/**
 * 各难度AI配置
 */
export const AI_CONFIGS: Record<Difficulty, AIConfig> = {
  EASY: {
    depth: 1,          // 搜索深度 1步
    mistakeRate: 0.3,  // 30%失误率
  },
  MEDIUM: {
    depth: 2,          // 搜索深度 2步
    mistakeRate: 0.1,  // 10%失误率
  },
  HARD: {
    depth: 3,          // 搜索深度 3步（降低以避免阻塞）
    mistakeRate: 0,    // 0%失误率
  },
};

/**
 * AI思考延迟（模拟思考过程）
 */
export const AI_THINK_DELAYS: Record<Difficulty, number> = {
  EASY: 300,    // 300ms
  MEDIUM: 800,  // 800ms
  HARD: 1500,   // 1500ms
};

/**
 * 评估函数权重
 */
export const EVAL_WEIGHTS = {
  WIN: 10000,           // 能获胜 → 最高分
  BLOCK_WIN: 5000,      // 阻挡对方获胜 → 高分
  THREE_IN_ROW: 100,    // 3子连线潜力 → 中高分
  TWO_IN_ROW: 10,       // 2子连线潜力 → 低分
  CENTER_POSITION: 2,   // 中心位置 → 略加分（降低，避免过度偏向中心）
};

/**
 * 获取难度配置
 */
export function getAIConfig(difficulty: Difficulty): AIConfig {
  return AI_CONFIGS[difficulty];
}

/**
 * 获取AI思考延迟
 */
export function getAIThinkDelay(difficulty: Difficulty): number {
  return AI_THINK_DELAYS[difficulty];
}