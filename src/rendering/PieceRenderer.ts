/**
 * PieceRenderer 棋子渲染器（Phase 7 模块17）
 * 根据主题渲染棋子（几何体/GLB模型），管理棋子 Mesh 池
 *
 * 核心职责：
 * - 预创建棋子 Mesh 池（黑/白各一套活跃+休眠）
 * - 经典主题使用 CylinderGeometry
 * - 猫咪/机甲主题使用 GLB 模型（通过 ThemeLoader 加载）
 * - 支持活跃↔休眠姿态切换
 */

import * as THREE from 'three';
import type { ThemeConfig, PieceMesh } from '@/types/theme';
import type { Position, Player } from '@/types';
import { BOARD_CONFIG, PIECE_CONFIG } from '@/config/gameConfig';
import { ThemeLoader } from '@/core/ThemeLoader';
import type { PieceState } from '@/types/theme';

/**
 * 棋子渲染器接口（architecture.md 模块17）
 */
export interface IPieceRenderer {
  init(scene: THREE.Scene, theme: ThemeConfig): Promise<void>;
  addPiece(pos: Position, player: Player, isTop: boolean): PieceMesh;
  removePiece(pos: Position): void;
  updatePieceState(pos: Position, state: PieceState): void;
  getPieceMesh(pos: Position): PieceMesh | null;
  getAllPieceMeshes(): PieceMesh[];
  clearAll(): void;
}

/**
 * 棋子Mesh缓存结构
 */
interface PieceMeshCache {
  piece: PieceMesh;
  activeMesh: THREE.Object3D;   // 活跃姿态Mesh
  sleepMesh: THREE.Object3D | null;  // 休眠姿态Mesh（可选）
}

/**
 * 棋子渲染器
 * 实现主题化的棋子渲染，支持几何体和 GLB 模型两种模式
 */
export class PieceRenderer implements IPieceRenderer {
  /** Three.js 场景 */
  private scene: THREE.Scene | null = null;

  /** 素材加载器 */
  private loader: ThemeLoader;

  /** 当前主题配置 */
  private currentTheme: ThemeConfig | null = null;

  /** 棋子Mesh缓存（位置键 → Mesh缓存） */
  private pieceCache: Map<string, PieceMeshCache> = new Map();

  /** 经典主题几何体（复用） */
  private classicGeometry: THREE.CylinderGeometry | null = null;

  /** 经典主题材质 */
  private classicBlackMaterial: THREE.MeshStandardMaterial | null = null;
  private classicWhiteMaterial: THREE.MeshStandardMaterial | null = null;

  /** GLB 模型缓存（主题级别） */
  private modelCache: Map<string, THREE.Group> = new Map();

  /** 当前玩家（用于判断己方/对方） */
  private currentPlayer: Player = 'BLACK';

  /**
   * 构造函数
   * @param loader 素材加载器
   */
  constructor(loader: ThemeLoader) {
    this.loader = loader;
  }

  /**
   * 根据主题初始化渲染器
   * @param scene Three.js 场景
   * @param theme 主题配置
   */
  async init(scene: THREE.Scene, theme: ThemeConfig): Promise<void> {
    this.scene = scene;
    this.currentTheme = theme;

    console.log(`[PieceRenderer] Initializing with theme: ${theme.id}`);

    // 根据主题类型初始化棋子渲染方式
    switch (theme.id) {
      case 'CLASSIC':
        await this.initClassicTheme(theme);
        break;
      case 'CAT':
        await this.initGLBTheme(theme);
        break;
      case 'MECHA':
        await this.initGLBTheme(theme);
        break;
      default:
        // 默认使用经典主题几何体
        await this.initClassicTheme(theme);
    }

    console.log(`[PieceRenderer] Initialized for theme: ${theme.id}`);
  }

  /**
   * 初始化经典主题（几何体棋子）
   * @param theme 主题配置
   */
  private async initClassicTheme(theme: ThemeConfig): Promise<void> {
    // 创建棋子几何体（复用）
    this.classicGeometry = new THREE.CylinderGeometry(
      PIECE_CONFIG.radius,
      PIECE_CONFIG.radius,
      PIECE_CONFIG.height,
      32,
      1
    );

    // 创建材质（苹果风格）
    const blackConfig = theme.pieces.black;
    const whiteConfig = theme.pieces.white;

    this.classicBlackMaterial = new THREE.MeshStandardMaterial({
      color: blackConfig.geometry?.color ?? 0x1d1d1f,
      metalness: blackConfig.material?.metalness ?? 0.0,
      roughness: blackConfig.material?.roughness ?? 0.4,
      // 边缘光晕效果（通过 emissive 实现）
      emissive: blackConfig.emissiveGlow?.color ?? 0x3d3d42,
      emissiveIntensity: blackConfig.emissiveGlow?.intensity ?? 0.15,
    });

    this.classicWhiteMaterial = new THREE.MeshStandardMaterial({
      color: whiteConfig.geometry?.color ?? 0xf5f5f7,
      metalness: whiteConfig.material?.metalness ?? 0.0,
      roughness: whiteConfig.material?.roughness ?? 0.4,
      emissive: whiteConfig.emissiveGlow?.color ?? 0xffffff,
      emissiveIntensity: whiteConfig.emissiveGlow?.intensity ?? 0.2,
    });

    console.log('[PieceRenderer] Classic theme initialized');
  }

  /**
   * 初始化 GLB 主题（猫咪/机甲）
   * @param theme 主题配置
   */
  private async initGLBTheme(theme: ThemeConfig): Promise<void> {
    // 预加载活跃姿态模型（黑白共用同一模型，运行时改色）
    const blackActiveModel = theme.pieces.black.model;
    // TODO: 白棋使用同一模型路径（配置中 path 相同），保留用于后续可能的差异化处理
    // const whiteActiveModel = theme.pieces.white.model;

    if (blackActiveModel?.path) {
      try {
        // 加载模型（黑白共用，后续改色）
        const model = await this.loader.loadModel(blackActiveModel.path);
        this.modelCache.set(`active_black_${theme.id}`, model.clone());

        // 白棋共用同一模型，只是颜色不同
        this.modelCache.set(`active_white_${theme.id}`, model.clone());

        console.log(`[PieceRenderer] Active model loaded: ${blackActiveModel.path}`);
      } catch (error) {
        console.warn(`[PieceRenderer] Failed to load active model: ${blackActiveModel.path}`, error);
        // 加载失败时使用经典几何体作为 fallback
        await this.initClassicTheme(theme);
        return;
      }
    }

    // 预加载休眠姿态模型
    const blackSleepModel = theme.pieces.black.sleepModel;
    // TODO: 白棋使用同一模型路径，保留用于后续可能的差异化处理
    // const whiteSleepModel = theme.pieces.white.sleepModel;

    if (blackSleepModel?.path) {
      try {
        const model = await this.loader.loadModel(blackSleepModel.path);
        this.modelCache.set(`sleep_black_${theme.id}`, model.clone());
        this.modelCache.set(`sleep_white_${theme.id}`, model.clone());

        console.log(`[PieceRenderer] Sleep model loaded: ${blackSleepModel.path}`);
      } catch (error) {
        console.warn(`[PieceRenderer] Failed to load sleep model: ${blackSleepModel.path}`, error);
        // 休眠模型加载失败不影响主要功能
      }
    }

    console.log(`[PieceRenderer] GLB theme ${theme.id} initialized`);
  }

  /**
   * 编码位置为唯一键
   */
  private encodePosition(pos: Position): string {
    return `${pos.x},${pos.y},${pos.z}`;
  }

  /**
   * 添加棋子到场景
   * @param pos 放置位置
   * @param player 玩家类型
   * @param isTop 是否顶层
   * @returns 棋子Mesh包装
   */
  addPiece(pos: Position, player: Player, isTop: boolean): PieceMesh {
    if (!this.scene || !this.currentTheme) {
      throw new Error('[PieceRenderer] Not initialized');
    }

    const key = this.encodePosition(pos);
    const initialState: PieceState = isTop ? 'IDLE' : 'SLEEP';

    // 创建棋子Mesh
    const mesh = this.createPieceMesh(player, initialState);

    // 设置位置
    const cellSize = BOARD_CONFIG.cellSize;
    const cellHeight = BOARD_CONFIG.cellHeight;
    mesh.position.set(
      pos.x * cellSize + cellSize / 2,
      pos.z * cellHeight + PIECE_CONFIG.height / 2,
      pos.y * cellSize + cellSize / 2
    );

    // 添加到场景
    this.scene.add(mesh);

    // 创建 PieceMesh 包装
    const pieceMesh: PieceMesh = {
      mesh,
      position: pos,
      player,
      state: initialState,
      isActive: isTop,
      isOwn: player === this.currentPlayer,  // 己方判断
    };

    // 缓存
    this.pieceCache.set(key, {
      piece: pieceMesh,
      activeMesh: mesh,
      sleepMesh: null,  // 休眠Mesh在需要时创建
    });

    console.log(`[PieceRenderer] Piece added: (${pos.x},${pos.y},${pos.z}), player=${player}, state=${initialState}`);

    return pieceMesh;
  }

  /**
   * 创建棋子Mesh
   * @param player 玩家类型
   * @param state 棋子状态
   */
  private createPieceMesh(player: Player, state: PieceState): THREE.Object3D {
    if (!this.currentTheme) {
      throw new Error('[PieceRenderer] No theme set');
    }

    switch (this.currentTheme.id) {
      case 'CLASSIC':
        return this.createClassicMesh(player);
      case 'CAT':
      case 'MECHA':
        return this.createGLBMesh(player, state);
      default:
        return this.createClassicMesh(player);
    }
  }

  /**
   * 创建经典主题棋子Mesh（几何体）
   * @param player 玩家类型
   */
  private createClassicMesh(player: Player): THREE.Mesh {
    if (!this.classicGeometry) {
      throw new Error('[PieceRenderer] Classic geometry not initialized');
    }

    const material = player === 'BLACK'
      ? this.classicBlackMaterial!
      : this.classicWhiteMaterial!;

    const mesh = new THREE.Mesh(this.classicGeometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  /**
   * 创建 GLB 主题棋子Mesh
   * @param player 玩家类型
   * @param state 棋子状态
   */
  private createGLBMesh(player: Player, state: PieceState): THREE.Group {
    if (!this.currentTheme) {
      throw new Error('[PieceRenderer] No theme set');
    }

    const themeId = this.currentTheme.id;
    const useSleep = state === 'SLEEP' && this.modelCache.has(`sleep_${player}_${themeId}`);
    const cacheKey = useSleep ? `sleep_${player}_${themeId}` : `active_${player}_${themeId}`;

    const cachedModel = this.modelCache.get(cacheKey);
    if (!cachedModel) {
      // 模型未缓存，使用经典几何体 fallback
      console.warn(`[PieceRenderer] Model not cached: ${cacheKey}, using classic fallback`);
      return this.createClassicMesh(player) as unknown as THREE.Group;
    }

    // 克隆模型
    const model = cachedModel.clone();

    // 应用颜色和材质参数
    const pieceConfig = player === 'BLACK' ? this.currentTheme.pieces.black : this.currentTheme.pieces.white;
    const color = this.loader.getPieceColor(themeId, player as 'BLACK' | 'WHITE');

    this.loader.applyColorToModel(model, color, pieceConfig.material);

    // 应用缩放和旋转
    const modelConfig = useSleep ? pieceConfig.sleepModel : pieceConfig.model;
    if (modelConfig) {
      model.scale.setScalar(modelConfig.scale);
      if (modelConfig.rotation) {
        model.rotation.set(
          modelConfig.rotation.x,
          modelConfig.rotation.y,
          modelConfig.rotation.z
        );
      }
    }

    model.castShadow = true;
    model.receiveShadow = true;

    return model;
  }

  /**
   * 移除棋子
   * @param pos 棋子位置
   */
  removePiece(pos: Position): void {
    const key = this.encodePosition(pos);
    const cache = this.pieceCache.get(key);

    if (cache && this.scene) {
      this.scene.remove(cache.piece.mesh);
      this.pieceCache.delete(key);
      console.log(`[PieceRenderer] Piece removed: (${pos.x},${pos.y},${pos.z})`);
    }
  }

  /**
   * 更新棋子状态（切换活跃/休眠姿态）
   * @param pos 棋子位置
   * @param state 新状态
   */
  updatePieceState(pos: Position, state: PieceState): void {
    const key = this.encodePosition(pos);
    const cache = this.pieceCache.get(key);

    if (!cache) {
      console.warn(`[PieceRenderer] No piece at (${pos.x},${pos.y},${pos.z})`);
      return;
    }

    const oldState = cache.piece.state;

    // 经典主题无休眠姿态变化
    if (this.currentTheme?.id === 'CLASSIC') {
      cache.piece.state = state;
      cache.piece.isActive = state === 'IDLE';
      return;
    }

    // GLB 主题：切换姿态
    if ((oldState === 'IDLE' && state === 'SLEEP') || (oldState === 'SLEEP' && state === 'IDLE')) {
      this.switchPieceMesh(cache, state);
    }

    cache.piece.state = state;
    cache.piece.isActive = state === 'IDLE';
    console.log(`[PieceRenderer] State updated: (${pos.x},${pos.y},${pos.z}) ${oldState} → ${state}`);
  }

  /**
   * 切换棋子Mesh（活跃↔休眠）
   * @param cache 棋子缓存
   * @param state 目标状态
   */
  private switchPieceMesh(cache: PieceMeshCache, state: PieceState): void {
    if (!this.scene || !this.currentTheme) {
      return;
    }

    const player = cache.piece.player;
    // TODO: 用于后续日志输出或位置验证
    // const pos = cache.piece.position;

    // 移除旧 Mesh
    this.scene.remove(cache.piece.mesh);

    // 创建新姿态 Mesh
    const newMesh = this.createGLBMesh(player, state);
    newMesh.position.copy(cache.piece.mesh.position);

    // 添加到场景
    this.scene.add(newMesh);

    // 更新缓存
    cache.piece.mesh = newMesh;
    if (state === 'SLEEP') {
      cache.sleepMesh = newMesh;
    } else {
      cache.activeMesh = newMesh;
    }
  }

  /**
   * 获取指定位置的棋子Mesh
   * @param pos 棋子位置
   */
  getPieceMesh(pos: Position): PieceMesh | null {
    const key = this.encodePosition(pos);
    const cache = this.pieceCache.get(key);
    return cache?.piece ?? null;
  }

  /**
   * 获取所有棋子Mesh
   */
  getAllPieceMeshes(): PieceMesh[] {
    return Array.from(this.pieceCache.values()).map(cache => cache.piece);
  }

  /**
   * 设置当前玩家（用于判断己方/对方）
   * @param player 当前玩家棋子类型
   */
  setCurrentPlayer(player: Player): void {
    this.currentPlayer = player;

    // 更新所有棋子的 isOwn 标志
    this.pieceCache.forEach(cache => {
      cache.piece.isOwn = cache.piece.player === player;
    });
  }

  /**
   * 清空所有棋子
   */
  clearAll(): void {
    if (this.scene) {
      this.pieceCache.forEach(cache => {
        this.scene!.remove(cache.piece.mesh);
      });
    }
    this.pieceCache.clear();
    console.log('[PieceRenderer] All pieces cleared');
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.clearAll();

    // 清理几何体和材质
    if (this.classicGeometry) {
      this.classicGeometry.dispose();
      this.classicGeometry = null;
    }
    if (this.classicBlackMaterial) {
      this.classicBlackMaterial.dispose();
      this.classicBlackMaterial = null;
    }
    if (this.classicWhiteMaterial) {
      this.classicWhiteMaterial.dispose();
      this.classicWhiteMaterial = null;
    }

    // 清理模型缓存
    this.modelCache.clear();

    console.log('[PieceRenderer] Disposed');
  }
}