/**
 * AI配置
 * 包含难度配置、评估参数等
 *
 * v2.1 重构：难度配置调整 + 两条2连评分改进
 * - 难度 = 搜索深度 + 失误率
 * - EASY: depth=2, 10%失误（原MEDIUM配置）
 * - MEDIUM: depth=4, 0%失误（原HARD配置）
 * - HARD: depth=6, 0%失误（新设计）
 */

import type { Difficulty, DifficultyConfig } from '@/types';

/**
 * 分层评估评分常量
 * 核心原则：防守分数 > 进攻分数（同一威胁级别）
 */
export const EVAL_SCORES = {
  // Layer 0: 立即胜负
  WIN: 100000,           // 立即获胜 → 最高分
  BLOCK_WIN: 5000,      // 阻挡对方获胜 → 高分

  // Layer 1: 基础威胁（3连）
  THREE_OWN: 150,       // 己方3连威胁 → 进攻分
  THREE_BLOCK: 300,     // 对方3连威胁 → 防守分（防守优先）

  // Layer 2: 双威胁
  DOUBLE_THREAT_OWN: 500,     // 己方双3连威胁（必胜机会）
  DOUBLE_THREAT_BLOCK: 1000,  // 对方双3连威胁（必须阻挡）

  // Layer 2: 两条2连 = 潜在双威胁（v2.1新增）
  POTENTIAL_DOUBLE_OWN: 300,    // 己方两条2连（下一颗必成双3连）
  POTENTIAL_DOUBLE_BLOCK: 600,  // 对方两条2连（防守优先×2）

  // Layer 2: 单条2连（低分）
  TWO_OWN: 20,                // 己方单条2连潜力
  TWO_BLOCK: 40,              // 对方单条2连威胁（防守优先）

  // Layer 3: 潜在叉子（v3.0新增）
  FORK_BASE: 150,             // 基础叉子分（2线交汇）
  FORK_PER_LINE: 100,         // 每多一条线加分
  FORK_WITH_TWO: 250,         // 叉子中有2连时的额外加分
  FORK_DEFENSE_MULTIPLIER: 2, // 防守叉子的分数倍率

  // Layer 5: 位置加分
  CENTER_BONUS: 2,     // 中心位置加分
};

/**
 * 难度配置矩阵（v2.1调整）
 * - EASY = 原MEDIUM配置
 * - MEDIUM = 原HARD配置
 * - HARD = 新设计（深度6层）
 */
export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  EASY: {
    depth: 2,            
    mistakeRate: 0.1,    
    layers: {
      enableImmediateWin: true,
      enableBasicThreat: true,
      basicThreatOnlyImmediate: false,  // 完整检测，不简化
      enableAdvancedThreat: true,       // 启用双威胁检测
      enablePotentialFork: false,       // 不启用潜在叉子检测
      enableMinimaxSearch: false,
    },
    criticalNoMistake: true,  // 关键时刻不失误
  },

  MEDIUM: {
    depth: 4,            
    mistakeRate: 0.15,      
    layers: {
      enableImmediateWin: true,
      enableBasicThreat: true,
      basicThreatOnlyImmediate: false,
      enableAdvancedThreat: true,
      enablePotentialFork: true,      // 启用潜在叉子检测（使用缓存优化）
      enableMinimaxSearch: true,      // 启用深度搜索
    },
    criticalNoMistake: true,
  },

  HARD: {
    depth: 4,            // 新设计
    mistakeRate: 0,
    layers: {
      enableImmediateWin: true,
      enableBasicThreat: true,
      basicThreatOnlyImmediate: false,
      enableAdvancedThreat: true,
      enablePotentialFork: true,      // 启用潜在叉子检测
      enableMinimaxSearch: true,      // 深度搜索
    },
    forkScoreMultiplier: 1.5,         // 叉子分数×1.5
    criticalNoMistake: true,
  },
};

/**
 * AI思考延迟（模拟思考过程）
 */
export const AI_THINK_DELAYS: Record<Difficulty, number> = {
  EASY: 500,    // 500ms（原MEDIUM）
  MEDIUM: 1000, // 1000ms（原HARD）
  HARD: 2000,   // 2000ms（新设计）
};

/**
 * 获取难度完整配置（分层架构）
 */
export function getDifficultyConfig(difficulty: Difficulty): DifficultyConfig {
  return DIFFICULTY_CONFIGS[difficulty];
}

/**
 * 获取AI思考延迟
 */
export function getAIThinkDelay(difficulty: Difficulty): number {
  return AI_THINK_DELAYS[difficulty];
}

// ==================== 旧接口兼容（过渡期） ====================

/**
 * @deprecated 使用 getDifficultyConfig 获取完整配置
 * 仅用于过渡期兼容旧代码
 */
export const EVAL_WEIGHTS = {
  WIN: EVAL_SCORES.WIN,
  BLOCK_WIN: EVAL_SCORES.BLOCK_WIN,
  THREE_IN_ROW: EVAL_SCORES.THREE_OWN,
  TWO_IN_ROW: EVAL_SCORES.TWO_OWN,
  CENTER_POSITION: EVAL_SCORES.CENTER_BONUS,
};

/**
 * @deprecated 使用 getDifficultyConfig 获取完整配置
 * 仅用于过渡期兼容旧代码
 */
export interface AIConfig {
  depth: number;
  mistakeRate: number;
}

/**
 * @deprecated 使用 getDifficultyConfig 替代
 */
export function getAIConfig(difficulty: Difficulty): AIConfig {
  const config = DIFFICULTY_CONFIGS[difficulty];
  return {
    depth: config.depth,
    mistakeRate: config.mistakeRate,
  };
}