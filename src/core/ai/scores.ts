/**
 * AI 评估分数常量定义
 * 基于 ai-evaluation-v2.md §6.2
 *
 * 设计原则:
 * - 层级隔离: 高级棋形分数 >> 低级累加和
 * - 防守优先: 对方威胁扣分 = 己方同等威胁 × 1.6
 * - 必胜形隔离: WIN / T3-OR / CROSS-WIN 无法被低级累加超越
 */

import type { Player } from '@/types';

// ==================== 棋形枚举 ====================

export enum PatternType {
  WIN = 'WIN',

  // T族 — 连续棋形
  T3_OR = 'T3-OR', T3_OP = 'T3-OP', T3_OD = 'T3-OD',
  T3_HR = 'T3-HR', T3_HD = 'T3-HD',
  T2_OR = 'T2-OR', T2_OR_SL = 'T2-OR-SL', T2_OP = 'T2-OP', T2_OP_SL = 'T2-OP-SL', T2_OD = 'T2-OD', T2_OD_SL = 'T2-OD-SL',
  T2_HR = 'T2-HR', T2_HD = 'T2-HD',

  // G族 — 间隙棋形
  G3_S1_R = 'G3-S1-R', G3_S1_D = 'G3-S1-D',
  G2_S1_OR = 'G2-S1-OR',G2_S1_OD = 'G2-S1-OD',G2_S1_HR = 'G2-S1-HR', G2_S1_HD = 'G2-S1-HD',G2_S1_R = 'G2-S1-R',G2_S1_D = 'G2-S1-D',
  G2_S2_R = 'G2-S2-R', G2_S2_D = 'G2-S2-D',

  // Special
  BLK = 'BLK',
  MIX = 'MIX',
  EMP = 'EMP',
}

export enum DirCategory {
  HORIZONTAL = 'HORIZONTAL',       // (1,0,0), (0,1,0) z=0 横竖
  DIAGONAL = 'DIAGONAL',           // (1,1,0), (1,-1,0) z=0 斜
  VERTICAL = 'VERTICAL',           // (0,0,±1)
  SPATIAL = 'SPATIAL',             // (±1,0,±1), (0,±1,±1) 空间
  SPATIAL_DIAG = 'SPATIAL_DIAG',   // (±1,±1,±1) 空间对角线
}

export enum CrossType {
  CROSS_WIN = 'CROSS-WIN',          // 必胜叉子 (2+ T3级交汇)
  CROSS_STRONG = 'CROSS-STRONG',    // 强叉子 (2+ T2-OR/G2-S1 交汇)
  CROSS_MODERATE = 'CROSS-MODERATE',// 中叉子
  CROSS_WEAK = 'CROSS-WEAK',        // 弱叉子 (2+ T2-HR/G2-S2 交汇)
}

// ==================== 己方攻击分 ====================

export const ATTACK_SCORES: Record<PatternType, number> = {
  [PatternType.WIN]:         1_000_000,
  [PatternType.T3_OR]:         10_0000,
  [PatternType.T3_OP]:           8_000,
  [PatternType.T3_HR]:           7_000,
  [PatternType.T2_OR]:            2_000,
  [PatternType.T3_OD]:            800,
  [PatternType.T3_HD]:             500,
  [PatternType.T2_OR_SL]:           200,
  [PatternType.T2_HR]:             120,
  [PatternType.T2_OP]:             100,
  [PatternType.T2_OP_SL]:           25,
  [PatternType.T2_OD]:              20,
  [PatternType.T2_OD_SL]:           10,
  [PatternType.T2_HD]:               8,
  [PatternType.G3_S1_R]:         8_000,
  [PatternType.G2_S1_OR]:         7_000,
  [PatternType.G3_S1_D]:           600,
  [PatternType.G2_S1_HR]:           300,
  [PatternType.G2_S1_OD]:           30,
  [PatternType.G2_S1_HD]:           20,
  [PatternType.G2_S2_R]:            30,
  [PatternType.G2_S2_D]:            5,
  [PatternType.G2_S1_R]:             2,
  [PatternType.G2_S1_D]:             1,
  [PatternType.BLK]:                 0,
  [PatternType.MIX]:                 0,
  [PatternType.EMP]:                 0,
};

// ==================== 防守倍率 ====================

export const DEFENSE_MULTIPLIER = 1.6;

// ==================== 叉子加分 ====================

export const CROSS_SCORES: Record<CrossType, number> = {
  [CrossType.CROSS_WIN]:     100_000,
  [CrossType.CROSS_STRONG]:    5_000,
  [CrossType.CROSS_MODERATE]:  1_500,
  [CrossType.CROSS_WEAK]:        300,
};

// ==================== 方向权重 ====================

export const DIR_WEIGHTS: Record<DirCategory, number> = {
  [DirCategory.HORIZONTAL]:    1.0,
  [DirCategory.DIAGONAL]:      1.1,  // 斜线棋子跨横竖两方向，连接度更高
  [DirCategory.VERTICAL]:      0.3,  // 同列堆叠，对手一次落子可打断整线
  [DirCategory.SPATIAL]:       1.0,  // readiness E/e 已处理跨层成本
  [DirCategory.SPATIAL_DIAG]:  1.1,
};

// ==================== 位置加分 ====================

/**
 * 位势分：考虑 (x,y) 中心度 + z 层连接潜力。
 *
 * 设计理由（adi §2.2 差异2）：
 * - z=0 是"行动层"——所有新棋子都从这一层开始堆积，连接机会最多
 * - z>0 需要周围同层有棋子才能形成横向/斜向棋形，早期孤立无价值
 * - 对手正上方（z>0 且 below=对手）：垂直方向已变 MIX，13 个方向只剩 12 个可用
 *
 * 分差很小（最大 2-3 分），远低于最小棋形分（T2-HD=15），只影响棋子数≤3 的早期局面。
 */
export function positionBonus(
  x: number, y: number,
  z: number = 0,
  belowPiece: string = 'EMPTY',
  ownPiece: string = 'WHITE',
  width: number = 5,
): number {
  const center = (width - 1) / 2;
  const dist = Math.abs(x - center) + Math.abs(y - center);
  const xyScore = 2 * ((width - 1) - dist);

  // z 层位势: 地面层所有13方向立即可连接；高层需等待同层棋子。
  // 对手正上方垂直方向永久MIX → 只剩12方向可用，自然位势更低。
  let zScore = 0;
  if (z === 0) {
    zScore = 3;  // 行动层，所有方向可立即连接
  } else if (belowPiece !== 'EMPTY') {
    zScore = (belowPiece === ownPiece) ? 1 : -1;  // 己方延伸(+1) > 对手上方(-1)
  }

  return xyScore + zScore;
}

// ==================== 难度配置 ====================

export interface SearchConfig {
  maxDepth: number;
  timeLimitMs: number;
  useIterativeDeepening: boolean;
  useQuiescenceSearch: boolean;
  useKillerHeuristic: boolean;
  useHistoryHeuristic: boolean;
}

export interface DifficultyConfigV2 {
  searchDepth: number;
  mistakeRate: number;
  useAlphaBeta: boolean;
  useCandidateSorting: boolean;
  search: SearchConfig | null;
  criticalNoMistake: boolean;
}

export const DIFFICULTY_CONFIGS: Record<string, DifficultyConfigV2> = {
  EASY: {
    searchDepth: 0,
    mistakeRate: 0.25,
    useAlphaBeta: false,
    useCandidateSorting: false,
    search: null,
    criticalNoMistake: true,
  },
  MEDIUM: {
    searchDepth: 3,
    mistakeRate: 0.10,
    useAlphaBeta: true,
    useCandidateSorting: true,
    search: {
      maxDepth: 3,
      timeLimitMs: 0,
      useIterativeDeepening: false,
      useQuiescenceSearch: false,
      useKillerHeuristic: false,
      useHistoryHeuristic: false,
    },
    criticalNoMistake: true,
  },
  HARD: {
    searchDepth: 4,
    mistakeRate: 0,
    useAlphaBeta: true,
    useCandidateSorting: true,
    search: {
      maxDepth: 4,
      timeLimitMs: 3000,
      useIterativeDeepening: true,
      useQuiescenceSearch: false,
      useKillerHeuristic: true,
      useHistoryHeuristic: true,
    },
    criticalNoMistake: true,
  },
};

// ==================== 工具函数 ====================

export function opponentOf(p: Player): Player {
  if (p === 'BLACK') return 'WHITE';
  if (p === 'WHITE') return 'BLACK';
  return 'EMPTY';
}
