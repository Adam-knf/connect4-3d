/**
 * PieceStateManager 棋子状态管理器（Phase 7 模块15）
 * 管理每颗棋子的6状态机（Sleep→Idle→Hover→Fall→Impact→Win/Lose）
 *
 * 核心职责：
 * - 管理每颗棋子的状态（活跃/休眠/悬停等）
 * - 触发对应动画
 * - 状态转换由事件驱动（覆盖/悬停/下落）
 */

import type { Position, Player } from '@/types';
import type { PieceState, PieceEvent } from '@/types/theme';

/**
 * 状态变更回调类型
 */
export type StateChangeCallback = (pos: Position, oldState: PieceState, newState: PieceState, event: PieceEvent) => void;

/**
 * 棋子状态缓存结构
 */
interface PieceStateCache {
  pos: Position;
  player: Player;
  state: PieceState;
  isTop: boolean;  // 是否顶层（活跃）
}

/**
 * 棋子状态管理器接口（architecture.md 模块15）
 */
export interface IPieceStateManager {
  getState(pos: Position): PieceState;
  setState(pos: Position, state: PieceState): void;
  processEvent(pos: Position, event: PieceEvent): void;
  getAllActivePieces(): Position[];
  onStateChange(callback: StateChangeCallback): void;
  reset(): void;
}

/**
 * 状态转换规则
 * 定义每个状态对每个事件的转换结果
 */
const STATE_TRANSITIONS: Record<PieceState, Partial<Record<PieceEvent, PieceState>>> = {
  SLEEP: {
    UNCOVERED: 'IDLE',      // 被移除覆盖 → 活跃
  },
  IDLE: {
    COVERED: 'SLEEP',       // 被新棋子覆盖 → 休眠
    HOVER_START: 'HOVER',   // 鼠标悬停开始 → 悬停
    FALL_IMPACT: 'IMPACT',  // 新棋子落在上方 → 对抗
    GAME_WIN: 'WIN',        // 游戏胜利
    GAME_LOSE: 'LOSE',      // 游戏失败
  },
  HOVER: {
    HOVER_END: 'IDLE',      // 鼠标悬停结束 → 活跃
    COVERED: 'SLEEP',       // 被覆盖 → 休眠（先停止悬停动画）
    FALL_IMPACT: 'IMPACT',  // 新棋子落下 → 对抗（先停止悬停动画）
    GAME_WIN: 'WIN',
    GAME_LOSE: 'LOSE',
  },
  FALL: {
    // FALL 状态动画结束后自动回到 IDLE（由 AnimationController 控制）
  },
  IMPACT: {
    // IMPACT 状态动画结束后自动回到 IDLE（由 AnimationController 控制）
  },
  WIN: {
    GAME_RESET: 'IDLE',     // 游戏重置 → 活跃
  },
  LOSE: {
    GAME_RESET: 'IDLE',     // 游戏重置 → 活跃
  },
};

/**
 * 棋子状态管理器
 * 确保每颗棋子在正确的时间点播放正确的动画
 */
export class PieceStateManager implements IPieceStateManager {
  /** 棋子状态缓存（位置键 → 状态信息） */
  private stateCache: Map<string, PieceStateCache> = new Map();

  /** 状态变更回调列表 */
  private changeCallbacks: StateChangeCallback[] = [];

  /** 游戏中是否进行中（游戏进行中不可切换主题） */
  private gameInProgress: boolean = false;

  /**
   * 编码位置为唯一键
   */
  private encodePosition(pos: Position): string {
    return `${pos.x},${pos.y},${pos.z}`;
  }

  /**
   * 获取棋子当前状态
   * @param pos 棋子位置
   */
  getState(pos: Position): PieceState {
    const key = this.encodePosition(pos);
    const cache = this.stateCache.get(key);
    return cache?.state ?? 'IDLE';
  }

  /**
   * 设置棋子状态（直接设置，不经过转换）
   * @param pos 棋子位置
   * @param state 新状态
   */
  setState(pos: Position, state: PieceState): void {
    const key = this.encodePosition(pos);
    const cache = this.stateCache.get(key);
    if (cache) {
      const oldState = cache.state;
      cache.state = state;
      // 触发回调
      this.notifyStateChange(pos, oldState, state, 'MANUAL');
    }
  }

  /**
   * 注册棋子（棋子放置时调用）
   * @param pos 棋子位置
   * @param player 玩家类型
   * @param isTop 是否顶层
   */
  registerPiece(pos: Position, player: Player, isTop: boolean): void {
    const key = this.encodePosition(pos);
    const initialState: PieceState = isTop ? 'IDLE' : 'SLEEP';
    this.stateCache.set(key, {
      pos,
      player,
      state: initialState,
      isTop,
    });
    console.log(`[PieceStateManager] Registered piece at (${pos.x},${pos.y},${pos.z}), state=${initialState}, isTop=${isTop}`);
  }

  /**
   * 处理事件（状态转换入口）
   * @param pos 棋子位置
   * @param event 触发事件
   */
  processEvent(pos: Position, event: PieceEvent): void {
    const key = this.encodePosition(pos);
    const cache = this.stateCache.get(key);

    if (!cache) {
      console.warn(`[PieceStateManager] No piece at (${pos.x},${pos.y},${pos.z}), cannot process event ${event}`);
      return;
    }

    const currentState = cache.state;
    const transition = STATE_TRANSITIONS[currentState]?.[event];

    if (transition === undefined) {
      // 无转换规则，忽略事件
      console.log(`[PieceStateManager] No transition for state=${currentState}, event=${event}`);
      return;
    }

    // 执行状态转换
    const oldState = currentState;
    cache.state = transition;

    console.log(`[PieceStateManager] State transition: (${pos.x},${pos.y},${pos.z}) ${oldState} → ${transition} (event=${event})`);

    // 触发回调
    this.notifyStateChange(pos, oldState, transition, event);
  }

  /**
   * 批量处理事件（用于胜负/重置）
   * @param event 事件类型
   * @param filter 筛选条件（可选）
   */
  processEventForAll(event: PieceEvent, filter?: (cache: PieceStateCache) => boolean): void {
    this.stateCache.forEach((cache) => {
      if (filter && !filter(cache)) {
        return;
      }

      const pos = cache.pos;
      this.processEvent(pos, event);
    });
  }

  /**
   * 处理棋子覆盖事件
   * 新棋子放置时，标记下方棋子为被覆盖
   * @param newPos 新棋子位置
   */
  handlePiecePlaced(newPos: Position): void {
    // 新棋子注册为顶层活跃状态
    const key = this.encodePosition(newPos);
    const cache = this.stateCache.get(key);
    if (cache) {
      cache.isTop = true;
      cache.state = 'FALL';  // 新棋子初始状态为下落
    }

    // 查找同一列下方棋子，标记为被覆盖
    // 位置下方：z - 1（如果存在）
    if (newPos.z > 0) {
      const belowPos: Position = { x: newPos.x, y: newPos.y, z: newPos.z - 1 };
      const belowKey = this.encodePosition(belowPos);
      const belowCache = this.stateCache.get(belowKey);
      if (belowCache) {
        belowCache.isTop = false;
        this.processEvent(belowPos, 'COVERED');
      }
    }
  }

  /**
   * 处理棋子下落完成事件
   * 下落动画结束后，棋子从 FALL 状态转为 IDLE
   * @param pos 棋子位置
   */
  handleFallComplete(pos: Position): void {
    const key = this.encodePosition(pos);
    const cache = this.stateCache.get(key);
    if (cache && cache.state === 'FALL') {
      const oldState = cache.state;
      cache.state = 'IDLE';
      this.notifyStateChange(pos, oldState, 'IDLE', 'FALL_COMPLETE');

      // 触发下方棋子的对抗动画完成回调
      // 对抗动画结束后，下方棋子也从 IMPACT 转为 IDLE
      if (pos.z > 0) {
        const belowPos: Position = { x: pos.x, y: pos.y, z: pos.z - 1 };
        const belowCache = this.stateCache.get(this.encodePosition(belowPos));
        if (belowCache && belowCache.state === 'IMPACT') {
          this.handleImpactComplete(belowPos);
        }
      }
    }
  }

  /**
   * 处理对抗动画完成事件
   * @param pos 棋子位置
   */
  handleImpactComplete(pos: Position): void {
    const key = this.encodePosition(pos);
    const cache = this.stateCache.get(key);
    if (cache && cache.state === 'IMPACT') {
      const oldState = cache.state;
      cache.state = 'IDLE';
      this.notifyStateChange(pos, oldState, 'IDLE', 'IMPACT_COMPLETE');
    }
  }

  /**
   * 处理悬停事件
   * @param x X坐标
   * @param y Y坐标（棋盘深度）
   * @param topZ 该列顶层棋子的Z坐标（如果有棋子）
   */
  handleHover(x: number, y: number, topZ?: number): void {
    // 如果指定了顶层棋子位置，触发该棋子的悬停事件
    if (topZ !== undefined && topZ >= 0) {
      const topPos: Position = { x, y, z: topZ };
      const key = this.encodePosition(topPos);
      const cache = this.stateCache.get(key);

      if (cache && cache.isTop) {
        // 顶层棋子进入悬停状态
        this.processEvent(topPos, 'HOVER_START');
      }
    }
  }

  /**
   * 处理悬停结束事件
   * @param x X坐标
   * @param y Y坐标（棋盘深度）
   * @param topZ 该列顶层棋子的Z坐标
   */
  handleHoverEnd(x: number, y: number, topZ: number): void {
    const topPos: Position = { x, y, z: topZ };
    const key = this.encodePosition(topPos);
    const cache = this.stateCache.get(key);

    if (cache && cache.state === 'HOVER') {
      this.processEvent(topPos, 'HOVER_END');
    }
  }

  /**
   * 处理游戏胜利事件
   * @param winner 获胜玩家
   */
  handleGameWin(winner: Player): void {
    // 所有获胜玩家的棋子转为 WIN 状态
    this.processEventForAll('GAME_WIN', (cache) => cache.player === winner);

    // 所有失败玩家的棋子转为 LOSE 状态
    const loser: Player = winner === 'BLACK' ? 'WHITE' : 'BLACK';
    this.processEventForAll('GAME_LOSE', (cache) => cache.player === loser);

    this.gameInProgress = false;
  }

  /**
   * 处理游戏重置事件
   */
  handleGameReset(): void {
    // 所有棋子恢复为活跃/休眠状态（根据是否顶层）
    this.stateCache.forEach((cache) => {
      const targetState: PieceState = cache.isTop ? 'IDLE' : 'SLEEP';
      if (cache.state !== targetState) {
        const oldState = cache.state;
        cache.state = targetState;
        this.notifyStateChange(cache.pos, oldState, targetState, 'GAME_RESET');
      }
    });

    this.gameInProgress = false;
  }

  /**
   * 处理平局事件
   */
  handleDraw(): void {
    // 平局时所有棋子保持当前状态
    this.gameInProgress = false;
  }

  /**
   * 获取所有活跃棋子（顶层，状态为 IDLE）
   */
  getAllActivePieces(): Position[] {
    const activePieces: Position[] = [];
    this.stateCache.forEach((cache) => {
      if (cache.isTop && cache.state === 'IDLE') {
        activePieces.push(cache.pos);
      }
    });
    return activePieces;
  }

  /**
   * 获取指定棋子的玩家类型
   * @param pos 棋子位置
   */
  getPlayer(pos: Position): Player | null {
    const key = this.encodePosition(pos);
    const cache = this.stateCache.get(key);
    return cache?.player ?? null;
  }

  /**
   * 获取指定棋子是否顶层
   * @param pos 棋子位置
   */
  isTopPiece(pos: Position): boolean {
    const key = this.encodePosition(pos);
    const cache = this.stateCache.get(key);
    return cache?.isTop ?? false;
  }

  /**
   * 获取所有棋子状态缓存（供 AnimationController 使用）
   */
  getAllPieceCaches(): PieceStateCache[] {
    return Array.from(this.stateCache.values());
  }

  /**
   * 注册状态变更回调
   * @param callback 回调函数
   */
  onStateChange(callback: StateChangeCallback): void {
    this.changeCallbacks.push(callback);
  }

  /**
   * 移除状态变更回调
   * @param callback 回调函数
   */
  removeStateChangeCallback(callback: StateChangeCallback): void {
    const index = this.changeCallbacks.indexOf(callback);
    if (index > -1) {
      this.changeCallbacks.splice(index, 1);
    }
  }

  /**
   * 通知状态变更
   */
  private notifyStateChange(pos: Position, oldState: PieceState, newState: PieceState, event: PieceEvent | 'MANUAL' | 'FALL_COMPLETE' | 'IMPACT_COMPLETE'): void {
    for (const callback of this.changeCallbacks) {
      callback(pos, oldState, newState, event as PieceEvent);
    }
  }

  /**
   * 设置游戏进行中状态
   */
  setGameInProgress(inProgress: boolean): void {
    this.gameInProgress = inProgress;
  }

  /**
   * 是否游戏进行中
   */
  isGameInProgress(): boolean {
    return this.gameInProgress;
  }

  /**
   * 重置（清空所有状态）
   */
  reset(): void {
    this.stateCache.clear();
    this.gameInProgress = false;
    console.log('[PieceStateManager] Reset');
  }

  /**
   * 移除指定棋子（清理时使用）
   * @param pos 棋子位置
   */
  removePiece(pos: Position): void {
    const key = this.encodePosition(pos);
    this.stateCache.delete(key);
  }
}