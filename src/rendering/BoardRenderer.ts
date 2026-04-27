/**
 * BoardRenderer 棋盘渲染器
 * 渲染底座网格、线框、坐标系统
 * 坐标系统：Three.js标准（Y轴向上）
 */

import * as THREE from 'three';
import type { Position, Player } from '@/types';
import { BOARD_CONFIG, RENDER_CONFIG, PIECE_CONFIG } from '@/config/gameConfig';
import type { ThemeConfig } from '@/types/theme';

/**
 * 棋盘渲染器类
 * 坐标系统：X=宽度, Y=高度(层叠), Z=深度
 */
export class BoardRenderer {
  /** Three.js 场景 */
  private scene: THREE.Scene | null = null;

  /** 棋盘高度（层数） */
  private boardHeight: number;

  /** 底座网格组 */
  private baseGrid: THREE.Group;

  /** 线框组 */
  private gridLines: THREE.Group;

  /** 棋子Mesh映射 (position key -> mesh) */
  private pieces: Map<string, THREE.Mesh>;

  /** 预览棋子Mesh */
  private previewPiece: THREE.Mesh | null = null;

  /** 高亮格子Mesh */
  private highlightCell: THREE.Mesh | null = null;

  /** 竖直空间网格线组 */
  private verticalLines: THREE.Group | null = null;

  /** 是否启用高亮显示（点击时临时禁用） */
  private highlightEnabled: boolean = true;

  /** 棋子材质 */
  private blackPieceMaterial: THREE.MeshStandardMaterial;
  private whitePieceMaterial: THREE.MeshStandardMaterial;

  /** 棋子几何体 */
  private pieceGeometry: THREE.CylinderGeometry;

  // ========== Phase 7 主题化属性 ==========

  /** 当前主题配置 */
  private currentTheme: ThemeConfig | null = null;

  /** 主题化高亮颜色 */
  private themeCellHighlightColor: number = RENDER_CONFIG.cellHighlight.color;
  private themeVerticalLineColor: number = RENDER_CONFIG.verticalHighlight.color;
  private themeVerticalLineOpacity: number = RENDER_CONFIG.verticalHighlight.opacity;
  private themeVerticalLineEmissive: number = RENDER_CONFIG.verticalHighlight.emissiveIntensity;

  /** 主题化预览棋子透明度 */
  private themePreviewOpacity: number = PIECE_CONFIG.previewOpacity;

  /** 主题化棋子颜色 */
  private themeBlackPieceColor: number = RENDER_CONFIG.pieceBlack.color;
  private themeWhitePieceColor: number = RENDER_CONFIG.pieceWhite.color;

  /** 主题化棋子材质参数 */
  private themePieceMetalness: number = 0.0;
  private themePieceRoughness: number = 0.4;

  /**
   * 构造函数
   * @param boardHeight 棋盘高度（根据难度动态）
   */
  constructor(boardHeight: number = BOARD_CONFIG.height) {
    this.boardHeight = boardHeight;
    this.baseGrid = new THREE.Group();
    this.gridLines = new THREE.Group();
    this.verticalLines = null;  // 悬停时动态创建
    this.pieces = new Map();

    // 创建棋子材质（塑料质感）
    this.blackPieceMaterial = new THREE.MeshStandardMaterial({
      color: RENDER_CONFIG.pieceBlack.color,
      metalness: RENDER_CONFIG.pieceBlack.metalness,
      roughness: RENDER_CONFIG.pieceBlack.roughness,
    });

    this.whitePieceMaterial = new THREE.MeshStandardMaterial({
      color: RENDER_CONFIG.pieceWhite.color,
      metalness: RENDER_CONFIG.pieceWhite.metalness,
      roughness: RENDER_CONFIG.pieceWhite.roughness,
    });

    // 创建棋子几何体（乐高式圆柱）
    // CylinderGeometry 默认 Y 轴向上，正好匹配我们的坐标系统
    this.pieceGeometry = new THREE.CylinderGeometry(
      PIECE_CONFIG.radius,   // 顶部半径
      PIECE_CONFIG.radius,   // 底部半径
      PIECE_CONFIG.height,   // 高度（Y轴方向）
      32,                    // 圆周分段数
      1                      // 高度分段数
    );
  }

  /**
   * 初始化渲染器
   * @param scene Three.js场景
   */
  init(scene: THREE.Scene): void {
    this.scene = scene;

    // 创建底座网格
    this.createBaseGrid();

    // 创建线框
    this.createGridLines();

    // 添加到场景
    scene.add(this.baseGrid);
    scene.add(this.gridLines);

    console.log('✅ BoardRenderer initialized');
  }

  /**
   * 创建底座网格
   * 半透明底座面板 + 各层切片
   */
  private createBaseGrid(): void {
    const cellSize = BOARD_CONFIG.cellSize;
    const cellHeight = BOARD_CONFIG.cellHeight;
    const width = BOARD_CONFIG.width;

    // 底座面板（底层 y=0）
    const baseGeometry = new THREE.BoxGeometry(
      width * cellSize,       // X方向宽度
      cellHeight * 0.1,       // Y方向厚度（很薄）
      width * cellSize        // Z方向深度
    );

    const baseMaterial = new THREE.MeshStandardMaterial({
      color: RENDER_CONFIG.baseColor,
      metalness: 0.0,
      roughness: 0.9,
      transparent: true,
      opacity: RENDER_CONFIG.baseOpacity,
    });

    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    baseMesh.position.set(
      width * cellSize / 2,   // X: 棋盘中心
      -cellHeight * 0.05,     // Y: 略低于底层
      width * cellSize / 2    // Z: 棋盘中心
    );
    baseMesh.receiveShadow = true;
    this.baseGrid.add(baseMesh);

    // 创建各层的切片面板（半透明参考面）
    for (let layer = 0; layer < this.boardHeight; layer++) {
      const sliceGeometry = new THREE.BoxGeometry(
        width * cellSize,
        cellHeight * 0.02,     // 很薄的切片
        width * cellSize
      );

      const sliceMaterial = new THREE.MeshStandardMaterial({
        color: RENDER_CONFIG.gridColor,
        metalness: 0.0,
        roughness: 0.9,
        transparent: true,
        opacity: 0.1,
      });

      const sliceMesh = new THREE.Mesh(sliceGeometry, sliceMaterial);
      sliceMesh.position.set(
        width * cellSize / 2,
        layer * cellHeight + cellHeight * 0.01,  // Y: 层高度
        width * cellSize / 2
      );
      this.baseGrid.add(sliceMesh);
    }
  }

  /**
   * 创建网格线框
   * 只保留底部网格线（简化视觉）
   * Y轴向上坐标系统
   */
  private createGridLines(): void {
    const cellSize = BOARD_CONFIG.cellSize;
    const width = BOARD_CONFIG.width;

    // 线框材质
    const lineMaterial = new THREE.LineBasicMaterial({
      color: RENDER_CONFIG.gridColor,
      transparent: true,
      opacity: RENDER_CONFIG.gridOpacity,
    });

    // 底座层网格线（y=0）- 只保留底部
    for (let i = 0; i <= width; i++) {
      // X方向横线（沿X轴，Z从0到width）
      const xLineGeometry = new THREE.BufferGeometry();
      const xLinePoints = [
        new THREE.Vector3(i * cellSize, 0, 0),
        new THREE.Vector3(i * cellSize, 0, width * cellSize),
      ];
      xLineGeometry.setFromPoints(xLinePoints);
      const xLine = new THREE.Line(xLineGeometry, lineMaterial);
      this.gridLines.add(xLine);

      // Z方向竖线（沿Z轴，X从0到width）
      const zLineGeometry = new THREE.BufferGeometry();
      const zLinePoints = [
        new THREE.Vector3(0, 0, i * cellSize),
        new THREE.Vector3(width * cellSize, 0, i * cellSize),
      ];
      zLineGeometry.setFromPoints(zLinePoints);
      const zLine = new THREE.Line(zLineGeometry, lineMaterial);
      this.gridLines.add(zLine);
    }

    // 删除了顶层网格线和垂直柱线（简化视觉）
  }

  /**
   * 编码位置为唯一键
   */
  private encodePosition(pos: Position): string {
    return `${pos.x},${pos.y},${pos.z}`;
  }

  /**
   * 添加棋子（带下落动画）
   * @param pos 放置位置（x, z 是棋盘平面坐标，y 是层高度）
   * @param player 玩家类型
   * @returns 棋子Mesh和动画Promise
   */
  addPiece(pos: Position, player: Player): { mesh: THREE.Mesh; animation: Promise<void> } {
    if (!this.scene) {
      throw new Error('BoardRenderer not initialized');
    }

    const cellSize = BOARD_CONFIG.cellSize;
    const cellHeight = BOARD_CONFIG.cellHeight;
    const material = player === 'BLACK' ? this.blackPieceMaterial : this.whitePieceMaterial;

    // 创建棋子Mesh（CylinderGeometry 默认Y轴向上，不需要旋转）
    const mesh = new THREE.Mesh(this.pieceGeometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // 设置位置（从上方15单位开始下落）
    // pos.x = X坐标, pos.y = Z坐标（棋盘深度）, pos.z = Y坐标（层高度）
    const targetY = pos.z * cellHeight + PIECE_CONFIG.height / 2;
    mesh.position.set(
      pos.x * cellSize + cellSize / 2,              // X: 格子中心
      this.boardHeight * cellHeight + 15,           // Y: 下落起点（上方）
      pos.y * cellSize + cellSize / 2               // Z: 格子中心（深度）
    );

    // 添加到场景和映射
    this.scene.add(mesh);
    this.pieces.set(this.encodePosition(pos), mesh);

    // 创建下落动画Promise
    const animation = this.animatePieceDrop(mesh, targetY);

    return { mesh, animation };
  }

  /**
   * 棋子下落动画
   * 使用真实物理模拟（重力 + 弹跳压缩变形）
   * @param mesh 棋子Mesh
   * @param targetY 目标Y位置（高度）
   */
  private animatePieceDrop(mesh: THREE.Mesh, targetY: number): Promise<void> {
    return new Promise((resolve) => {
      const startY = mesh.position.y;
      const duration = PIECE_CONFIG.dropDuration;
      const decay = PIECE_CONFIG.bounceDecay;
      const bounceCount = PIECE_CONFIG.bounceCount;

      // 计算时间分配：下落 + 弹跳
      const fallDistance = startY - targetY;
      const bounceHeights: number[] = [];
      for (let i = 0; i < bounceCount; i++) {
        bounceHeights.push(fallDistance * Math.pow(decay, i + 1));
      }

      // 下落时间（自由落体：t = sqrt(2h/g)，假设g=1单位）
      const fallTime = Math.sqrt(2 * fallDistance);
      const bounceTimes = bounceHeights.map(h => 2 * Math.sqrt(2 * h));  // 上升+下落
      const totalTime = fallTime + bounceTimes.reduce((a, b) => a + b, 0);
      const timeScale = duration / totalTime;  // 时间缩放因子

      const scaledFallTime = fallTime * timeScale;
      const scaledBounceTimes = bounceTimes.map(t => t * timeScale);

      const startTime = performance.now();

      const animate = () => {
        const elapsed = performance.now() - startTime;

        let y: number;
        let scaleY = 1;

        if (elapsed < scaledFallTime) {
          // 下落阶段：二次函数自由落体
          const progress = elapsed / scaledFallTime;
          y = startY - fallDistance * progress * progress;

          // 下落时轻微拉伸（加速效果）
          scaleY = 1 + progress * 0.1;

        } else {
          // 弹跳阶段
          const bounceElapsed = elapsed - scaledFallTime;
          let accumulatedTime = 0;

          y = targetY;

          for (let i = 0; i < bounceCount; i++) {
            const bounceTime = scaledBounceTimes[i];

            if (bounceElapsed < accumulatedTime + bounceTime) {
              const bounceProgress = (bounceElapsed - accumulatedTime) / bounceTime;
              const bounceHeight = bounceHeights[i];

              // 正弦波形弹跳
              y = targetY + bounceHeight * Math.sin(Math.PI * bounceProgress);

              // 接触地面时压缩（bounceProgress接近0或1时）
              const compression = Math.abs(Math.sin(Math.PI * bounceProgress));
              scaleY = Math.max(0.85, 1 - compression * 0.15);
              break;
            }

            accumulatedTime += bounceTime;
          }
        }

        mesh.position.y = Math.max(targetY, y);
        mesh.scale.y = scaleY;
        mesh.scale.x = mesh.scale.z = 1 / Math.sqrt(scaleY);

        if (elapsed < duration) {
          requestAnimationFrame(animate);
        } else {
          mesh.position.y = targetY;
          mesh.scale.set(1, 1, 1);
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  /**
   * 显示预览棋子（悬停时）
   * @param x X坐标
   * @param y Z坐标（棋盘深度）
   * @param z Y坐标（层高度）
   * @param player 当前玩家
   */
  showPreviewPiece(x: number, y: number, z: number, player: Player): void {
    // 移除旧的预览棋子
    this.clearPreviewPiece();

    // 如果高亮被禁用，不显示预览棋子
    if (!this.highlightEnabled) return;

    const cellSize = BOARD_CONFIG.cellSize;
    const cellHeight = BOARD_CONFIG.cellHeight;
    const material = player === 'BLACK' ? this.blackPieceMaterial : this.whitePieceMaterial;

    // 创建半透明预览棋子（使用主题化透明度）
    const previewOpacity = this.themePreviewOpacity;
    const previewMaterial = material.clone();
    previewMaterial.transparent = true;
    previewMaterial.opacity = previewOpacity;

    const mesh = new THREE.Mesh(this.pieceGeometry, previewMaterial);
    mesh.position.set(
      x * cellSize + cellSize / 2,
      z * cellHeight + PIECE_CONFIG.height / 2,   // Y: 层高度
      y * cellSize + cellSize / 2                // Z: 深度
    );

    this.previewPiece = mesh;
    if (this.scene) {
      this.scene.add(mesh);
    }
  }

  /**
   * 清除预览棋子
   */
  clearPreviewPiece(): void {
    if (this.previewPiece && this.scene) {
      this.scene.remove(this.previewPiece);
      this.previewPiece.geometry.dispose();
      (this.previewPiece.material as THREE.Material).dispose();
      this.previewPiece = null;
    }
  }

  /**
   * 高亮指定列（底座格子高亮 + 竖直空间网格线 + 目标层额外高亮）
   * @param x X坐标
   * @param y Z坐标（棋盘深度）
   * @param z Y坐标（目标层，虚影棋子位置）
   * @param hasPreview 是否有预览棋子（高亮更明显）
   */
  highlightColumn(x: number, y: number, z?: number, hasPreview: boolean = false): void {
    // 如果高亮被禁用，不显示
    if (!this.highlightEnabled) {
      this.clearHighlight();
      return;
    }

    // 移除旧的高亮
    this.clearHighlight();

    const cellSize = BOARD_CONFIG.cellSize;
    const cellHeight = BOARD_CONFIG.cellHeight;
    // 使用主题化颜色（Phase 7）
    const themeColors = this.getThemeHighlightColors();
    const cellColor = themeColors.cellColor;
    const cellOpacity = this.currentTheme?.board.highlight?.cellHighlight.opacity ?? RENDER_CONFIG.cellHighlight.opacity;
    const cellEmissive = this.currentTheme?.board.highlight?.cellHighlight.emissiveIntensity ?? RENDER_CONFIG.cellHighlight.emissiveIntensity;

    // 创建高亮格子（更明显）
    const highlightGeometry = new THREE.BoxGeometry(
      cellSize,
      cellHeight * 0.1,
      cellSize
    );

    const highlightMaterial = new THREE.MeshStandardMaterial({
      color: cellColor,
      transparent: true,
      opacity: hasPreview ? cellOpacity * 1.5 : cellOpacity,
      emissive: cellColor,
      emissiveIntensity: hasPreview ? cellEmissive * 1.5 : cellEmissive,
    });

    const mesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
    mesh.position.set(
      x * cellSize + cellSize / 2,
      -cellHeight * 0.05,
      y * cellSize + cellSize / 2
    );

    this.highlightCell = mesh;
    if (this.scene) {
      this.scene.add(mesh);
    }

    // 显示竖直空间网格线 + 目标层额外高亮
    this.highlightVerticalColumn(x, y, z, hasPreview);
  }

  /**
   * 显示竖直空间网格线（悬停时浮现）+ 目标层额外高亮
   * @param x X坐标
   * @param y Z坐标（棋盘深度）
   * @param z Y坐标（目标层，虚影棋子位置）
   * @param hasPreview 是否有预览棋子
   */
  private highlightVerticalColumn(x: number, y: number, z?: number, hasPreview: boolean = false): void {
    // 移除旧的竖直网格线
    this.clearVerticalLines();

    if (!this.scene) return;

    const cellSize = BOARD_CONFIG.cellSize;
    const cellHeight = BOARD_CONFIG.cellHeight;
    // 使用主题化颜色（Phase 7）
    const themeColors = this.getThemeHighlightColors();
    const verticalColor = themeColors.verticalColor;
    const verticalOpacity = themeColors.verticalOpacity;
    const verticalEmissive = themeColors.verticalEmissive;

    // 创建竖直网格线组
    this.verticalLines = new THREE.Group();

    // 竖直网格线材质（禁用深度测试避免被遮挡）
    const lineMaterial = new THREE.LineBasicMaterial({
      color: verticalColor,
      transparent: true,
      opacity: verticalOpacity,
      depthTest: false,
    });

    // 创建 4 条竖直边线（格子四周）
    const corners = [
      { dx: 0, dz: 0 },
      { dx: 1, dz: 0 },
      { dx: 0, dz: 1 },
      { dx: 1, dz: 1 },
    ];

    corners.forEach(({ dx, dz }) => {
      const lineGeometry = new THREE.BufferGeometry();
      const linePoints = [
        new THREE.Vector3(
          (x + dx) * cellSize,
          0,
          (y + dz) * cellSize
        ),
        new THREE.Vector3(
          (x + dx) * cellSize,
          this.boardHeight * cellHeight,
          (y + dz) * cellSize
        ),
      ];
      lineGeometry.setFromPoints(linePoints);
      const line = new THREE.Line(lineGeometry, lineMaterial);
      this.verticalLines!.add(line);
    });

    // 目标层额外高亮（格子边框发光）
    if (z !== undefined && hasPreview) {
      // 目标层发光面板
      const targetHighlightGeometry = new THREE.BoxGeometry(
        cellSize,
        cellHeight * 0.1,
        cellSize
      );
      const targetHighlightMaterial = new THREE.MeshStandardMaterial({
        color: verticalColor,
        transparent: true,
        opacity: verticalOpacity * 1.5,  // 更明显
        emissive: verticalColor,
        emissiveIntensity: verticalEmissive * 1.5,
        depthTest: false,  // 禁用深度测试
      });
      const targetHighlight = new THREE.Mesh(targetHighlightGeometry, targetHighlightMaterial);
      targetHighlight.position.set(
        x * cellSize + cellSize / 2,
        z * cellHeight,
        y * cellSize + cellSize / 2
      );
      this.verticalLines!.add(targetHighlight);

      // 目标层水平边框（4条）
      const targetLineMaterial = new THREE.LineBasicMaterial({
        color: verticalColor,
        transparent: true,
        opacity: verticalOpacity * 2,  // 更明显
        depthTest: false,
      });

      // X方向两条
      for (let dz = 0; dz <= 1; dz++) {
        const hLineGeometry = new THREE.BufferGeometry();
        const hLinePoints = [
          new THREE.Vector3(x * cellSize, z * cellHeight, (y + dz) * cellSize),
          new THREE.Vector3((x + 1) * cellSize, z * cellHeight, (y + dz) * cellSize),
        ];
        hLineGeometry.setFromPoints(hLinePoints);
        const hLine = new THREE.Line(hLineGeometry, targetLineMaterial);
        this.verticalLines!.add(hLine);
      }

      // Z方向两条
      for (let dx = 0; dx <= 1; dx++) {
        const hLineGeometry = new THREE.BufferGeometry();
        const hLinePoints = [
          new THREE.Vector3((x + dx) * cellSize, z * cellHeight, y * cellSize),
          new THREE.Vector3((x + dx) * cellSize, z * cellHeight, (y + 1) * cellSize),
        ];
        hLineGeometry.setFromPoints(hLinePoints);
        const hLine = new THREE.Line(hLineGeometry, targetLineMaterial);
        this.verticalLines!.add(hLine);
      }
    }

    // 顶层发光面板
    const topHighlightGeometry = new THREE.BoxGeometry(
      cellSize,
      cellHeight * 0.05,
      cellSize
    );
    const topHighlightMaterial = new THREE.MeshStandardMaterial({
      color: verticalColor,
      transparent: true,
      opacity: verticalOpacity * 0.5,
      emissive: verticalColor,
      emissiveIntensity: verticalEmissive * 0.5,
    });
    const topHighlight = new THREE.Mesh(topHighlightGeometry, topHighlightMaterial);
    topHighlight.position.set(
      x * cellSize + cellSize / 2,
      this.boardHeight * cellHeight,
      y * cellSize + cellSize / 2
    );
    this.verticalLines.add(topHighlight);

    this.scene.add(this.verticalLines);
  }

  /**
   * 清除竖直空间网格线
   */
  private clearVerticalLines(): void {
    if (this.verticalLines && this.scene) {
      this.verticalLines.children.forEach(child => {
        if (child instanceof THREE.Line) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        } else if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
      this.scene.remove(this.verticalLines);
      this.verticalLines = null;
    }
  }

  /**
   * 清除高亮（底部格子 + 竖直网格线）
   */
  clearHighlight(): void {
    // 清除底部格子高亮
    if (this.highlightCell && this.scene) {
      this.scene.remove(this.highlightCell);
      this.highlightCell.geometry.dispose();
      (this.highlightCell.material as THREE.Material).dispose();
      this.highlightCell = null;
    }
    // 清除竖直网格线
    this.clearVerticalLines();
  }

  /**
   * 显示获胜连线高亮
   * @param positions 连线位置列表
   */
  showWinLine(positions: Position[]): void {
    console.log(`[WinHighlight] Highlighting ${positions.length} positions:`, positions);
    positions.forEach(pos => {
      const key = this.encodePosition(pos);
      const mesh = this.pieces.get(key);
      if (mesh) {
        // 克隆材质以避免影响其他棋子（材质是共享的）
        const currentMaterial = mesh.material as THREE.MeshStandardMaterial;
        const clonedMaterial = currentMaterial.clone();
        clonedMaterial.emissive = new THREE.Color(0x4ade80);  // 胜利绿色
        clonedMaterial.emissiveIntensity = 2;
        mesh.material = clonedMaterial;
      }
    });
  }

  /**
   * 显示失败连线高亮
   * @param positions 连线位置列表
   */
  showLoseLine(positions: Position[]): void {
    console.log(`[LoseHighlight] Highlighting ${positions.length} positions:`, positions);
    positions.forEach(pos => {
      const key = this.encodePosition(pos);
      const mesh = this.pieces.get(key);
      if (mesh) {
        // 克隆材质以避免影响其他棋子（材质是共享的）
        const currentMaterial = mesh.material as THREE.MeshStandardMaterial;
        const clonedMaterial = currentMaterial.clone();
        clonedMaterial.emissive = new THREE.Color(0xff6b4a);  // 失败红色
        clonedMaterial.emissiveIntensity = 1.5;
        mesh.material = clonedMaterial;
      }
    });
  }

  /**
   * 清除胜利/失败高亮效果
   * 恢复棋子材质到原始状态
   */
  clearWinHighlight(): void {
    const blackMaterial = this.blackPieceMaterial;
    const whiteMaterial = this.whitePieceMaterial;

    this.pieces.forEach((mesh) => {
      const currentMaterial = mesh.material as THREE.MeshStandardMaterial;
      // 检查是否是克隆的材质（有发光效果）
      if (currentMaterial.emissiveIntensity > 0) {
        // 从材质颜色推断棋子类型（克隆材质保留了原始颜色）
        const colorHex = currentMaterial.color.getHex();
        const isBlack = colorHex === blackMaterial.color.getHex();
        mesh.material = isBlack ? blackMaterial : whiteMaterial;
        // 清理克隆的材质
        currentMaterial.dispose();
      }
    });
    console.log('[WinHighlight] Cleared all win/lose highlights');
  }

  /**
   * 清除所有棋子
   */
  clearPieces(): void {
    const scene = this.scene;
    if (scene) {
      this.pieces.forEach(mesh => {
        scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
    }
    this.pieces.clear();
    this.clearPreviewPiece();
    this.clearHighlight();
  }

  /**
   * 清理所有渲染对象
   */
  dispose(): void {
    this.clearPieces();

    // 清理底座网格
    this.baseGrid.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    });
    if (this.scene) {
      this.scene.remove(this.baseGrid);

      // 清理线框
      this.gridLines.children.forEach(child => {
        if (child instanceof THREE.Line) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
      this.scene.remove(this.gridLines);
    }

    // 清理材质
    this.blackPieceMaterial.dispose();
    this.whitePieceMaterial.dispose();
    this.pieceGeometry.dispose();
  }

  /**
   * 获取棋盘高度
   */
  getBoardHeight(): number {
    return this.boardHeight;
  }

  /**
   * 更新棋盘高度（难度改变时调用）
   * 重新创建底座网格和线框以匹配新高度
   * @param newHeight 新的棋盘高度
   */
  updateBoardHeight(newHeight: number): void {
    if (newHeight === this.boardHeight) return;

    console.log(`[BoardRenderer] Updating board height: ${this.boardHeight} -> ${newHeight}`);
    this.boardHeight = newHeight;

    // 重新创建底座网格和线框
    if (this.scene) {
      // 移除旧的底座网格
      this.baseGrid.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
      this.scene.remove(this.baseGrid);

      // 移除旧的线框
      this.gridLines.children.forEach(child => {
        if (child instanceof THREE.Line) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
      this.scene.remove(this.gridLines);

      // 创建新的 Group
      this.baseGrid = new THREE.Group();
      this.gridLines = new THREE.Group();

      // 重新创建网格
      this.createBaseGrid();
      this.createGridLines();

      // 添加到场景
      this.scene.add(this.baseGrid);
      this.scene.add(this.gridLines);
    }
  }

  /**
   * 获取所有棋子Mesh列表（用于射线检测）
   */
  getPieceMeshes(): THREE.Mesh[] {
    return Array.from(this.pieces.values());
  }

  /**
   * 设置高亮是否启用（点击时临时禁用）
   * @param enabled 是否启用
   */
  setHighlightEnabled(enabled: boolean): void {
    this.highlightEnabled = enabled;
    if (!enabled) {
      this.clearPreviewPiece();
      this.clearHighlight();
    }
  }

  /**
   * 获取高亮是否启用
   */
  isHighlightEnabled(): boolean {
    return this.highlightEnabled;
  }

  // ========== Phase 7 主题化方法 ==========

  /**
   * 应用主题配置
   * 从 ThemeConfig 读取棋盘材质颜色，替代硬编码 gameConfig
   * @param theme 主题配置
   */
  applyTheme(theme: ThemeConfig): void {
    console.log(`[BoardRenderer] Applying theme: ${theme.id}`);
    this.currentTheme = theme;

    // 应用棋盘底座颜色
    if (theme.board.geometry) {
      this.applyBaseGridTheme(theme.board.geometry.color, theme.board.geometry.opacity ?? 1.0);
    }

    // 应用网格颜色
    this.applyGridLinesTheme(theme.board.grid.color, theme.board.grid.opacity);

    // 应用高亮颜色
    if (theme.board.highlight) {
      this.themeCellHighlightColor = theme.board.highlight.cellHighlight.color;
      this.themeVerticalLineColor = theme.board.highlight.verticalHighlight.color;
      this.themeVerticalLineOpacity = theme.board.highlight.verticalHighlight.opacity;
      this.themeVerticalLineEmissive = theme.board.highlight.verticalHighlight.emissiveIntensity;
    }

    // 应用预览棋子透明度
    if (theme.board.highlight?.previewHighlight) {
      this.themePreviewOpacity = theme.board.highlight.previewHighlight.opacity;
    }

    // 应用棋子颜色和材质参数
    this.applyPieceTheme(theme);

    console.log(`[BoardRenderer] Theme ${theme.id} applied`);
  }

  /**
   * 应用底座网格主题
   * @param color 底座颜色
   * @param opacity 透明度
   */
  private applyBaseGridTheme(color: number, opacity: number): void {
    console.log(`[BoardRenderer.applyBaseGridTheme] Applying color: #${color.toString(16)}, opacity: ${opacity}`);

    // 更新底座面板材质
    this.baseGrid.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial;

        // 底座面板位置是负数（y = -cellHeight * 0.05）
        if (child.position.y < 0) {
          console.log(`[BoardRenderer] Updating base panel, current color: #${material.color.getHex().toString(16)}`);
          material.color.setHex(color);
          material.opacity = opacity;
          material.needsUpdate = true;
          console.log(`[BoardRenderer] Base panel color updated to: #${color.toString(16)}`);
        }
      }
    });
  }

  /**
   * 应用网格线框主题
   * @param color 网格颜色
   * @param opacity 网格透明度
   */
  private applyGridLinesTheme(color: number, opacity: number): void {
    console.log(`[BoardRenderer.applyGridLinesTheme] Applying color: #${color.toString(16)}, opacity: ${opacity}`);

    // 更新网格线材质
    this.gridLines.children.forEach((child) => {
      if (child instanceof THREE.Line) {
        const material = child.material as THREE.LineBasicMaterial;
        material.color.setHex(color);
        material.opacity = opacity;
        material.needsUpdate = true;
      }
    });

    console.log(`[BoardRenderer] Grid lines updated`);
  }

  /**
   * 应用棋子主题
   * @param theme 主题配置
   */
  private applyPieceTheme(theme: ThemeConfig): void {
    // 经典主题：使用几何体棋子
    if (theme.pieces.black.geometry) {
      this.themeBlackPieceColor = theme.pieces.black.geometry.color;
      this.themePieceMetalness = theme.pieces.black.material?.metalness ?? 0.0;
      this.themePieceRoughness = theme.pieces.black.material?.roughness ?? 0.4;
    }

    if (theme.pieces.white.geometry) {
      this.themeWhitePieceColor = theme.pieces.white.geometry.color;
    }

    // 更新材质颜色和参数
    this.blackPieceMaterial.color.setHex(this.themeBlackPieceColor);
    this.blackPieceMaterial.metalness = this.themePieceMetalness;
    this.blackPieceMaterial.roughness = this.themePieceRoughness;

    this.whitePieceMaterial.color.setHex(this.themeWhitePieceColor);
    this.whitePieceMaterial.metalness = this.themePieceMetalness;
    this.whitePieceMaterial.roughness = this.themePieceRoughness;

    // 更新已存在棋子的材质（需要克隆避免共享材质影响）
    this.pieces.forEach((mesh) => {
      const isBlack = (mesh.material as THREE.MeshStandardMaterial).color.getHex() === RENDER_CONFIG.pieceBlack.color;
      // 更新为新的材质
      mesh.material = isBlack ? this.blackPieceMaterial : this.whitePieceMaterial;
    });
  }

  /**
   * 获取当前主题配置
   */
  getCurrentTheme(): ThemeConfig | null {
    return this.currentTheme;
  }

  /**
   * 获取主题化高亮颜色（供 highlightColumn 使用）
   */
  getThemeHighlightColors(): {
    cellColor: number;
    verticalColor: number;
    verticalOpacity: number;
    verticalEmissive: number;
  } {
    return {
      cellColor: this.themeCellHighlightColor,
      verticalColor: this.themeVerticalLineColor,
      verticalOpacity: this.themeVerticalLineOpacity,
      verticalEmissive: this.themeVerticalLineEmissive,
    };
  }

  /**
   * 获取主题化预览棋子透明度
   */
  getThemePreviewOpacity(): number {
    return this.themePreviewOpacity;
  }
}