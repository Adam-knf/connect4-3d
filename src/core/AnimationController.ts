/**
 * AnimationController 动画控制器（Phase 7 模块16）
 * 统一控制循环动画（呼吸）和触发动画（悬停/下落/对抗/胜负）
 *
 * 核心职责：
 * - 循环动画（Idle）：requestAnimationFrame 每帧更新活跃棋子列表
 * - 触发动画（Hover/Fall/Impact/Win/Lose）：事件触发时播放
 * - 区分己方/对方：根据棋子所属玩家判断
 * - 动画参数从 ThemeConfig 读取（代码动画为主）
 */

import * as THREE from 'three';
import type { ThemeConfig, AnimationSpec, CodeAnimationConfig, PieceMesh } from '@/types/theme';
import type { Player, Position } from '@/types';

/**
 * 动画控制器接口（architecture.md 模块16）
 */
export interface IAnimationController {
  // 循环动画
  startIdleAnimation(piece: PieceMesh): void;
  stopIdleAnimation(piece: PieceMesh): void;
  updateAllIdle(deltaTime: number): void;

  // 触发动画（持续型）
  playHoverAnimation(piece: PieceMesh, isOwn: boolean): void;
  stopHoverAnimation(piece: PieceMesh): void;

  // 触发动画（一次性）
  playFallAnimation(piece: PieceMesh, isOwnBase: boolean): Promise<void>;
  playImpactAnimation(piece: PieceMesh, isOwn: boolean): Promise<void>;
  playWinAnimation(piece: PieceMesh): void;
  playLoseAnimation(piece: PieceMesh): void;

  // 批量胜负动画
  playWinAnimationForAll(winner: Player): void;
  playLoseAnimationForAll(loser: Player): void;

  // 状态切换动画
  switchToSleep(piece: PieceMesh): void;
  switchToActive(piece: PieceMesh): void;

  // 重置
  clearAllAnimations(): void;
}

/**
 * 活跃动画信息
 */
interface ActiveAnimation {
  piece: PieceMesh;
  startTime: number;
  phase: number;  // 动画相位（用于同步）
}

/**
 * 触发动画信息
 */
interface TriggeredAnimation {
  piece: PieceMesh;
  startTime: number;
  duration: number;
  config: AnimationSpec;
  resolve?: () => void;
}

/**
 * 动画控制器
 * 提供统一的动画执行引擎
 */
export class AnimationController implements IAnimationController {
  /** 当前主题配置 */
  private theme: ThemeConfig | null = null;

  /** 活跃呼吸动画列表 */
  private idleAnimations: Map<string, ActiveAnimation> = new Map();

  /** 悬停动画列表 */
  private hoverAnimations: Map<string, ActiveAnimation> = new Map();

  /** 触发动画列表（一次性） */
  private triggeredAnimations: Map<string, TriggeredAnimation> = new Map();

  /** 胜负动画列表（持续性） */
  private winLoseAnimations: Map<string, ActiveAnimation> = new Map();

  /** 动画帧回调引用 */
  private animationFrameId: number | null = null;

  /** 上一次更新时间 */
  private lastUpdateTime: number = 0;

  /**
   * 设置主题配置
   * @param theme 主题配置
   */
  setTheme(theme: ThemeConfig): void {
    this.theme = theme;
    console.log(`[AnimationController] Theme set: ${theme.id}`);
  }

  /**
   * 编码位置为唯一键
   */
  private encodePosition(pos: Position): string {
    return `${pos.x},${pos.y},${pos.z}`;
  }

  // ==================== 循环动画 ====================

  /**
   * 启动呼吸动画
   * @param piece 棋子Mesh
   */
  startIdleAnimation(piece: PieceMesh): void {
    if (!this.theme?.animations.hasIdleAnimation) {
      // 主题无呼吸动画
      return;
    }

    const key = this.encodePosition(piece.position);
    if (this.idleAnimations.has(key)) {
      return;  // 已在播放
    }

    this.idleAnimations.set(key, {
      piece,
      startTime: performance.now(),
      phase: Math.random() * Math.PI * 2,  // 随机相位避免同步
    });

    console.log(`[AnimationController] Idle started: (${piece.position.x},${piece.position.y},${piece.position.z})`);
  }

  /**
   * 停止呼吸动画
   * @param piece 棋子Mesh
   */
  stopIdleAnimation(piece: PieceMesh): void {
    const key = this.encodePosition(piece.position);
    const anim = this.idleAnimations.get(key);

    if (anim) {
      // 恢复原始状态
      this.resetPieceTransform(piece);
      this.idleAnimations.delete(key);
    }
  }

  /**
   * 更新所有呼吸动画
   * @param _deltaTime 时间增量（毫秒）- 未使用，保留用于接口一致性
   */
  updateAllIdle(_deltaTime: number): void {
    if (!this.theme?.animations.idleAnimation) {
      return;
    }

    const currentTime = performance.now();
    const idleConfig = this.theme.animations.idleAnimation;

    this.idleAnimations.forEach((anim) => {
      const elapsed = currentTime - anim.startTime + anim.phase;
      this.applyCodeAnimation(anim.piece.mesh, idleConfig.codeAnimation, elapsed, idleConfig.duration);
    });

    // 同时更新胜负动画
    this.updateWinLoseAnimations(currentTime);
  }

  // ==================== 触发动画（持续型） ====================

  /**
   * 播放悬停动画
   * @param piece 棋子Mesh
   * @param isOwn 是否己方棋子
   */
  playHoverAnimation(piece: PieceMesh, isOwn: boolean): void {
    if (!this.theme) {
      return;
    }

    const key = this.encodePosition(piece.position);

    // 先停止呼吸动画
    this.stopIdleAnimation(piece);

    // TODO: 获取悬停动画配置（用于后续扩展，如即时应用动画）
    // const hoverConfig = isOwn ? this.theme.animations.hover.own : this.theme.animations.hover.opponent;

    this.hoverAnimations.set(key, {
      piece,
      startTime: performance.now(),
      phase: 0,
    });

    console.log(`[AnimationController] Hover started: (${piece.position.x},${piece.position.y},${piece.position.z}), isOwn=${isOwn}`);
  }

  /**
   * 停止悬停动画
   * @param piece 棋子Mesh
   */
  stopHoverAnimation(piece: PieceMesh): void {
    const key = this.encodePosition(piece.position);
    const anim = this.hoverAnimations.get(key);

    if (anim) {
      // 恢复原始状态
      this.resetPieceTransform(piece);
      this.hoverAnimations.delete(key);

      // 重新启动呼吸动画（如果棋子是顶层活跃状态）
      if (piece.state === 'IDLE') {
        this.startIdleAnimation(piece);
      }

      console.log(`[AnimationController] Hover stopped: (${piece.position.x},${piece.position.y},${piece.position.z})`);
    }
  }

  /**
   * 更新悬停动画（持续型）
   */
  private updateHoverAnimations(currentTime: number): void {
    if (!this.theme) {
      return;
    }

    this.hoverAnimations.forEach((anim) => {
      const isOwn = anim.piece.isOwn;
      const hoverConfig = isOwn ? this.theme!.animations.hover.own : this.theme!.animations.hover.opponent;
      const elapsed = currentTime - anim.startTime;

      // 悬停动画持续播放，每次循环
      this.applyCodeAnimation(anim.piece.mesh, hoverConfig.codeAnimation, elapsed, hoverConfig.duration);
    });
  }

  // ==================== 触发动画（一次性） ====================

  /**
   * 播放下落动画
   * @param piece 棋子Mesh
   * @param isOwnBase 底部是否己方棋子（用于机甲举盾/举剑）
   */
  playFallAnimation(piece: PieceMesh, isOwnBase: boolean): Promise<void> {
    if (!this.theme) {
      return Promise.resolve();
    }

    const key = this.encodePosition(piece.position);
    const fallConfig = isOwnBase ? this.theme.animations.fall.own : this.theme.animations.fall.opponent;

    return new Promise((resolve) => {
      this.triggeredAnimations.set(key, {
        piece,
        startTime: performance.now(),
        duration: fallConfig.duration,
        config: fallConfig,
        resolve,
      });

      console.log(`[AnimationController] Fall started: (${piece.position.x},${piece.position.y},${piece.position.z}), isOwnBase=${isOwnBase}`);
    });
  }

  /**
   * 播放对抗动画
   * @param piece 棋子Mesh
   * @param isOwn 是否承接己方棋子
   */
  playImpactAnimation(piece: PieceMesh, isOwn: boolean): Promise<void> {
    if (!this.theme) {
      return Promise.resolve();
    }

    const key = this.encodePosition(piece.position);
    const impactConfig = isOwn ? this.theme.animations.impact.own : this.theme.animations.impact.opponent;

    // 先停止悬停动画（如果在播放）
    this.stopHoverAnimation(piece);
    // 先停止呼吸动画
    this.stopIdleAnimation(piece);

    return new Promise((resolve) => {
      this.triggeredAnimations.set(key, {
        piece,
        startTime: performance.now(),
        duration: impactConfig.duration,
        config: impactConfig,
        resolve,
      });

      console.log(`[AnimationController] Impact started: (${piece.position.x},${piece.position.y},${piece.position.z}), isOwn=${isOwn}`);
    });
  }

  /**
   * 播放胜利动画
   * @param piece 棋子Mesh
   */
  playWinAnimation(piece: PieceMesh): void {
    if (!this.theme) {
      return;
    }

    const key = this.encodePosition(piece.position);

    // TODO: 获取胜利动画配置（用于后续扩展，如即时应用动画）
    // const winConfig = this.theme.animations.win;

    // 先停止其他动画
    this.stopIdleAnimation(piece);
    this.stopHoverAnimation(piece);

    this.winLoseAnimations.set(key, {
      piece,
      startTime: performance.now(),
      phase: 0,
    });

    console.log(`[AnimationController] Win animation started: (${piece.position.x},${piece.position.y},${piece.position.z})`);
  }

  /**
   * 播放失败动画
   * @param piece 棋子Mesh
   */
  playLoseAnimation(piece: PieceMesh): void {
    if (!this.theme) {
      return;
    }

    const key = this.encodePosition(piece.position);

    // TODO: 获取失败动画配置（用于后续扩展，如即时应用动画）
    // const loseConfig = this.theme.animations.lose;

    // 先停止其他动画
    this.stopIdleAnimation(piece);
    this.stopHoverAnimation(piece);

    this.winLoseAnimations.set(key, {
      piece,
      startTime: performance.now(),
      phase: 0,
    });

    console.log(`[AnimationController] Lose animation started: (${piece.position.x},${piece.position.y},${piece.position.z})`);
  }

  // ==================== 批量胜负动画 ====================

  /**
   * 播放胜利动画（所有己方棋子）
   * @param winner 获胜玩家
   */
  playWinAnimationForAll(winner: Player): void {
    // 此方法需要 PieceRenderer 提供所有棋子列表
    // 在集成时实现
    console.log(`[AnimationController] Win animation for all: ${winner}`);
  }

  /**
   * 播放失败动画（所有对方棋子）
   * @param loser 失败玩家
   */
  playLoseAnimationForAll(loser: Player): void {
    console.log(`[AnimationController] Lose animation for all: ${loser}`);
  }

  /**
   * 设置所有棋子列表（供批量动画使用）
   * @param pieces 所有棋子列表
   * @param playerPiece 当前玩家棋子类型
   */
  setAllPiecesForWinLose(pieces: PieceMesh[], playerPiece: Player): void {
    const winner = playerPiece;

    pieces.forEach(piece => {
      if (piece.player === winner) {
        this.playWinAnimation(piece);
      } else {
        this.playLoseAnimation(piece);
      }
    });
  }

  // ==================== 状态切换动画 ====================

  /**
   * 切换为休眠姿态
   * @param piece 棋子Mesh
   */
  switchToSleep(piece: PieceMesh): void {
    // 停止所有动画
    this.stopIdleAnimation(piece);
    this.stopHoverAnimation(piece);

    console.log(`[AnimationController] Switched to sleep: (${piece.position.x},${piece.position.y},${piece.position.z})`);
  }

  /**
   * 切换为活跃姿态
   * @param piece 棋子Mesh
   */
  switchToActive(piece: PieceMesh): void {
    // 启动呼吸动画
    this.startIdleAnimation(piece);

    console.log(`[AnimationController] Switched to active: (${piece.position.x},${piece.position.y},${piece.position.z})`);
  }

  // ==================== 更新逻辑 ====================

  /**
   * 更新胜负动画
   */
  private updateWinLoseAnimations(currentTime: number): void {
    if (!this.theme) {
      return;
    }

    this.winLoseAnimations.forEach((anim) => {
      const elapsed = currentTime - anim.startTime;
      const config = anim.piece.state === 'WIN' ? this.theme!.animations.win : this.theme!.animations.lose;

      // 胜负动画循环播放
      this.applyCodeAnimation(anim.piece.mesh, config.codeAnimation, elapsed, config.duration);
    });
  }

  /**
   * 更新触发动画（一次性）
   * 检查是否完成，完成后调用 resolve
   */
  private updateTriggeredAnimations(currentTime: number): void {
    const completedKeys: string[] = [];

    this.triggeredAnimations.forEach((anim, key) => {
      const elapsed = currentTime - anim.startTime;
      const progress = elapsed / anim.duration;

      if (progress >= 1) {
        // 动画完成
        this.resetPieceTransform(anim.piece);
        completedKeys.push(key);

        if (anim.resolve) {
          anim.resolve();
        }

        // 完成后恢复呼吸动画（如果棋子是顶层）
        if (anim.piece.state === 'IDLE' || anim.piece.state === 'IMPACT') {
          this.startIdleAnimation(anim.piece);
        }
      } else {
        // 继续播放
        this.applyCodeAnimation(anim.piece.mesh, anim.config.codeAnimation, elapsed, anim.duration);
      }
    });

    // 清理完成的动画
    completedKeys.forEach(key => this.triggeredAnimations.delete(key));
  }

  /**
   * 主更新循环（外部调用）
   */
  update(): void {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;

    // 更新呼吸动画
    this.updateAllIdle(deltaTime);

    // 更新悬停动画
    this.updateHoverAnimations(currentTime);

    // 更新触发动画
    this.updateTriggeredAnimations(currentTime);
  }

  // ==================== 代码动画应用 ====================

  /**
   * 应用代码动画
   * @param mesh 目标Mesh
   * @param config 动画配置
   * @param elapsed 已过时间（毫秒）
   * @param duration 动画时长（毫秒）
   */
  private applyCodeAnimation(mesh: THREE.Object3D, config: CodeAnimationConfig | undefined, elapsed: number, duration: number): void {
    if (!config) {
      return;
    }

    const progress = (elapsed % duration) / duration;
    const t = Math.sin(progress * Math.PI * 2);  // 正弦波形

    // 缩放动画
    if (config.scale) {
      const intensity = config.scale.intensity;
      const scale = 1 + t * intensity;
      mesh.scale.y = scale;
      mesh.scale.x = mesh.scale.z = 1 / Math.sqrt(scale);  // 保持体积
    }

    // 旋转动画
    if (config.rotation) {
      const axis = config.rotation.axis;
      const angle = (config.rotation.angle ?? 15) * t * (Math.PI / 180);
      mesh.rotation[axis] = angle;
    }

    // 位置动画
    if (config.position) {
      const intensity = config.position.intensity;
      const offset = t * intensity;

      switch (config.position.pattern) {
        case 'bounce':
          mesh.position.y += offset * mesh.position.y * 0.1;  // 原位置基础上偏移
          break;
        case 'shake':
          mesh.position.x += offset * 0.1;
          mesh.position.z += Math.sin(elapsed * 0.01) * 0.05;
          break;
        case 'offset':
          mesh.position.y += offset;
          break;
      }
    }

    // 材质动画
    if (config.material && mesh instanceof THREE.Mesh) {
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (material) {
        switch (config.material.pattern) {
          case 'emissive_pulse':
            if (config.material.color) {
              material.emissive.setHex(config.material.color);
            }
            const emissiveIntensity = (config.material.intensity ?? 0.2) * (0.5 + t * 0.5);
            material.emissiveIntensity = emissiveIntensity;
            break;
          case 'color_shift':
            // 颜色渐变（暂不实现）
            break;
          case 'texture_switch':
            // 纹理切换（暂不实现）
            break;
        }
      }
    }
  }

  /**
   * 恢复棋子原始变换
   * @param piece 棋子Mesh
   */
  private resetPieceTransform(piece: PieceMesh): void {
    piece.mesh.scale.set(1, 1, 1);
    piece.mesh.rotation.set(0, 0, 0);

    // 重置材质发光
    if (piece.mesh instanceof THREE.Mesh) {
      const material = piece.mesh.material as THREE.MeshStandardMaterial;
      if (material && material.emissive) {
        material.emissiveIntensity = 0;
      }
    }
  }

  // ==================== 重置 ====================

  /**
   * 清除所有动画
   */
  clearAllAnimations(): void {
    // 恢复所有棋子原始状态
    this.idleAnimations.forEach(anim => this.resetPieceTransform(anim.piece));
    this.hoverAnimations.forEach(anim => this.resetPieceTransform(anim.piece));
    this.triggeredAnimations.forEach(anim => this.resetPieceTransform(anim.piece));
    this.winLoseAnimations.forEach(anim => this.resetPieceTransform(anim.piece));

    // 清空列表
    this.idleAnimations.clear();
    this.hoverAnimations.clear();
    this.triggeredAnimations.clear();
    this.winLoseAnimations.clear();

    console.log('[AnimationController] All animations cleared');
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.clearAllAnimations();
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    console.log('[AnimationController] Disposed');
  }
}