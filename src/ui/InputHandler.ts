/**
 * InputHandler 输入处理器
 * 左键点击放置棋子、右键旋转视角、Raycaster检测
 */

import * as THREE from 'three';
import type { PerspectiveCamera } from 'three';
import { BOARD_CONFIG } from '@/config/gameConfig';

/**
 * 点击回调类型
 */
export type ClickCallback = (x: number, y: number) => void;

/**
 * 悬停回调类型
 */
export type HoverCallback = (x: number, y: number) => void;

/**
 * 右键状态回调类型（按下/松开）
 */
export type RightButtonCallback = (isPressed: boolean) => void;

/**
 * 输入处理器类
 */
export class InputHandler {
  /** 相机对象 */
  private camera: PerspectiveCamera;

  /** 场景对象 */
  private scene: THREE.Scene;

  /** 画布元素 */
  private canvas: HTMLCanvasElement;

  /** Raycaster */
  private raycaster: THREE.Raycaster;

  /** 鼠标位置 */
  private mouse: THREE.Vector2;

  /** 可点击的网格对象（底座格子） */
  private clickableMeshes: THREE.Mesh[];

  /** 点击回调 */
  private onClick: ClickCallback | null = null;

  /** 悬停回调 */
  private onHover: HoverCallback | null = null;

  /** 右键状态回调 */
  private onRightButton: RightButtonCallback | null = null;

  /** 是否启用（全局） */
  private enabled: boolean;

  /** 点击是否禁用（单独控制左键点击，不影响右键和悬停） */
  private clickDisabled: boolean;

  /** 当前悬停位置 */
  private currentHover: { x: number; y: number } | null = null;

  /** 棋盘宽度 */
  private boardWidth: number = BOARD_CONFIG.width;

  /** 棋子Mesh列表（用于检测棋子遮挡） */
  private pieceMeshes: THREE.Mesh[] = [];

  /** 绑定后的事件处理器引用（用于正确解绑） */
  private boundHandleClick: (event: MouseEvent) => void;
  private boundHandleMouseMove: (event: MouseEvent) => void;
  private boundHandleMouseDown: (event: MouseEvent) => void;
  private boundHandleMouseUp: (event: MouseEvent) => void;

  /**
   * 构造函数
   * @param camera 相机对象
   * @param scene 场景对象
   * @param canvas 画布元素
   */
  constructor(
    camera: PerspectiveCamera,
    scene: THREE.Scene,
    canvas: HTMLCanvasElement
  ) {
    this.camera = camera;
    this.scene = scene;
    this.canvas = canvas;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clickableMeshes = [];
    this.enabled = true;
    this.clickDisabled = true;  // 默认禁用点击，进入玩家回合才启用

    // 保存绑定后的函数引用（用于正确解绑）
    this.boundHandleClick = this.handleClick.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);

    // 绑定事件
    this.bindEvents();
  }

  /**
   * 绑定鼠标事件
   */
  private bindEvents(): void {
    this.canvas.addEventListener('click', this.boundHandleClick);
    this.canvas.addEventListener('mousemove', this.boundHandleMouseMove);
    this.canvas.addEventListener('mousedown', this.boundHandleMouseDown);
    this.canvas.addEventListener('mouseup', this.boundHandleMouseUp);
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /**
   * 处理鼠标按下事件
   */
  private handleMouseDown(event: MouseEvent): void {
    // 右键按下时禁用高亮
    if (event.button === 2 && this.onRightButton) {
      this.onRightButton(true);
    }
  }

  /**
   * 处理鼠标松开事件
   */
  private handleMouseUp(event: MouseEvent): void {
    // 右键松开时恢复高亮并刷新
    if (event.button === 2 && this.onRightButton) {
      this.onRightButton(false);
    }
  }

  /**
   * 创建可点击的底座格子网格
   * @param boardWidth 棋盘宽度
   * @param _boardHeight 棋盘高度（未使用，保留接口兼容）
   */
  createClickableGrid(boardWidth: number, _boardHeight: number): void {
    // 更新棋盘尺寸配置
    this.boardWidth = boardWidth;

    // 清除旧的网格（现在只需要底座格子用于点击）
    this.clickableMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.clickableMeshes = [];

    // 只创建底座格子（用于点击检测）
    // 悬停检测现在使用投影计算，不需要这些网格
    const cellSize = BOARD_CONFIG.cellSize;
    const cellHeight = BOARD_CONFIG.cellHeight;

    for (let x = 0; x < boardWidth; x++) {
      for (let z = 0; z < boardWidth; z++) {
        const geometry = new THREE.BoxGeometry(cellSize, cellHeight * 0.1, cellSize);
        const material = new THREE.MeshBasicMaterial({
          visible: false,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
          x * cellSize + cellSize / 2,
          -cellHeight * 0.05,
          z * cellSize + cellSize / 2
        );
        mesh.userData = { x, y: z, type: 'baseCell' };

        this.scene.add(mesh);
        this.clickableMeshes.push(mesh);
      }
    }
  }

  /**
   * 处理点击事件
   * 使用投影计算穿透棋子
   */
  private handleClick(event: MouseEvent): void {
    if (!this.enabled) return;
    if (this.clickDisabled) return;  // 点击被屏蔽时忽略左键
    if (event.button !== 0) return;  // 只响应左键

    // 更新鼠标位置
    this.updateMousePosition(event);

    // 使用投影计算获取点击位置
    const clickPos = this.getHoverPositionByProjection();

    if (clickPos && this.onClick) {
      // 点击时先清除悬停状态（禁用高亮）
      this.currentHover = null;
      this.onClick(clickPos.x, clickPos.y);
    }
  }

  /**
   * 处理鼠标移动事件
   * 使用投影计算穿透棋子
   */
  private handleMouseMove(event: MouseEvent): void {
    if (!this.enabled) return;

    // 更新鼠标位置
    this.updateMousePosition(event);

    // 使用投影计算（穿透棋子检测）
    const hoverPos = this.getHoverPositionByProjection();

    if (hoverPos) {
      const { x, y } = hoverPos;

      // 检查是否与上次悬停位置不同
      if (!this.currentHover || this.currentHover.x !== x || this.currentHover.y !== y) {
        this.currentHover = { x, y };
        if (this.onHover) {
          this.onHover(x, y);
        }
      }
    } else {
      // 鼠标移出棋盘
      if (this.currentHover) {
        this.currentHover = null;
        if (this.onHover) {
          this.onHover(-1, -1);
        }
      }
    }
  }

  /**
   * 刷新当前悬停状态（点击后调用，重新触发悬停回调）
   */
  refreshHoverState(): void {
    if (!this.enabled) return;

    // 强制重新触发悬停回调
    if (this.currentHover && this.onHover) {
      this.onHover(this.currentHover.x, this.currentHover.y);
    } else if (this.onHover) {
      this.onHover(-1, -1);
    }
  }

  /**
   * 通过投影计算获取悬停位置（穿透棋子）
   * 改用底座平面投影，并检测棋子遮挡
   */
  private getHoverPositionByProjection(): { x: number; y: number } | null {
    const cellSize = BOARD_CONFIG.cellSize;

    // 创建射线
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 方案B：先检测是否有棋子被射线击中
    if (this.pieceMeshes.length > 0) {
      const pieceIntersects = this.raycaster.intersectObjects(this.pieceMeshes);
      if (pieceIntersects.length > 0) {
        const hitPiece = pieceIntersects[0].object;
        // 从棋子位置推断格子坐标
        const gridX = Math.floor((hitPiece.position.x - cellSize / 2) / cellSize + 0.5);
        const gridZ = Math.floor((hitPiece.position.z - cellSize / 2) / cellSize + 0.5);

        if (gridX >= 0 && gridX < this.boardWidth && gridZ >= 0 && gridZ < this.boardWidth) {
          return { x: gridX, y: gridZ };
        }
      }
    }

    // 方案A：用底座平面（Y=0）做投影计算，确保各种视角都能检测
    const basePlaneY = 0;
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -basePlaneY);

    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersectPoint);

    if (!intersectPoint) {
      return null;
    }

    // 将交点映射到格子坐标
    const gridX = Math.floor(intersectPoint.x / cellSize);
    const gridZ = Math.floor(intersectPoint.z / cellSize);

    // 检查是否在棋盘范围内
    if (gridX >= 0 && gridX < this.boardWidth && gridZ >= 0 && gridZ < this.boardWidth) {
      return { x: gridX, y: gridZ };
    }

    return null;
  }

  /**
   * 更新棋子Mesh列表（用于遮挡检测）
   * @param meshes 棋子Mesh数组
   */
  updatePieceMeshes(meshes: THREE.Mesh[]): void {
    this.pieceMeshes = meshes;
  }

  /**
   * 更新鼠标位置（转换为标准化坐标）
   */
  private updateMousePosition(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * 设置点击回调
   */
  setClickCallback(callback: ClickCallback): void {
    this.onClick = callback;
  }

  /**
   * 设置悬停回调
   */
  setHoverCallback(callback: HoverCallback): void {
    this.onHover = callback;
  }

  /**
   * 设置右键状态回调
   */
  setRightButtonCallback(callback: RightButtonCallback): void {
    this.onRightButton = callback;
  }

  /**
   * 启用输入处理
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * 禁用输入处理
   */
  disable(): void {
    this.enabled = false;
    // 清除悬停状态
    if (this.currentHover && this.onHover) {
      this.currentHover = null;
      this.onHover(-1, -1);
    }
  }

  /**
   * 是否启用
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 启用左键点击（进入玩家回合时调用）
   */
  enableClick(): void {
    this.clickDisabled = false;
    console.log('[InputHandler] Click enabled');
  }

  /**
   * 禁用左键点击（点击确认可下后立即调用，防止连点）
   */
  disableClick(): void {
    this.clickDisabled = true;
    console.log('[InputHandler] Click disabled');
  }

  /**
   * 点击是否启用
   */
  isClickEnabled(): boolean {
    return !this.clickDisabled;
  }

  /**
   * 获取当前悬停位置
   */
  getHoverPosition(): { x: number; y: number } | null {
    return this.currentHover;
  }

  /**
   * 清理资源（使用保存的函数引用正确解绑）
   */
  dispose(): void {
    this.canvas.removeEventListener('click', this.boundHandleClick);
    this.canvas.removeEventListener('mousemove', this.boundHandleMouseMove);
    this.canvas.removeEventListener('mousedown', this.boundHandleMouseDown);
    this.canvas.removeEventListener('mouseup', this.boundHandleMouseUp);

    this.clickableMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.clickableMeshes = [];
    this.pieceMeshes = [];
    this.enabled = false;
  }
}