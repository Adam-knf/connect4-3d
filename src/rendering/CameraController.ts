/**
 * CameraController 视角控制器
 * 右键拖拽旋转，角度限制
 * 坐标系统：Three.js标准（Y轴向上）
 */

import * as THREE from 'three';
import type { PerspectiveCamera } from 'three';
import { CAMERA_CONFIG, BOARD_CONFIG, getCameraInitialPosition, getCameraLookAt } from '@/config/gameConfig';

/**
 * 视角控制器类
 * 实现右键拖拽旋转，带角度限制
 * Y轴向上坐标系统
 */
export class CameraController {
  /** 相机对象 */
  private camera: PerspectiveCamera;

  /** 棋盘高度 */
  private boardHeight: number;

  /** 是否正在旋转 */
  private isRotating: boolean;

  /** 上次鼠标位置 */
  private lastMousePos: { x: number; y: number };

  /** 当前方位角（水平旋转，绕Y轴） */
  private azimuth: number;

  /** 当前仰角（从Y轴向下的角度） */
  private polar: number;

  /** 相机到目标的距离 */
  private distance: number;

  /** 目标点（棋盘中心） */
  private target: THREE.Vector3;

  /** 最小仰角 */
  private minPolar: number;

  /** 最大仰角 */
  private maxPolar: number;

  /** 旋转速度 */
  private rotateSpeed: number;

  /** 画布元素 */
  private canvas: HTMLCanvasElement;

  /** 绑定后的事件处理器引用（用于正确解绑） */
  private boundOnMouseDown: (event: MouseEvent) => void;
  private boundOnMouseMove: (event: MouseEvent) => void;
  private boundOnMouseUp: (event: MouseEvent) => void;
  private boundOnWheel: (event: WheelEvent) => void;

  /** 缩放相关 */
  private initialDistance: number;  // 初始距离（最远）
  private minDistance: number;      // 最小距离（最近）

  constructor(
    camera: PerspectiveCamera,
    canvas: HTMLCanvasElement,
    boardHeight: number = BOARD_CONFIG.height
  ) {
    this.camera = camera;
    this.canvas = canvas;
    this.boardHeight = boardHeight;
    this.isRotating = false;
    this.lastMousePos = { x: 0, y: 0 };

    // 保存绑定后的函数引用（用于正确解绑）
    this.boundOnMouseDown = this.onMouseDown.bind(this);
    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnMouseUp = this.onMouseUp.bind(this);
    this.boundOnWheel = this.onWheel.bind(this);

    // 初始化相机参数（Y轴向上坐标系统）
    const initialPos = getCameraInitialPosition(boardHeight);
    const lookAt = getCameraLookAt(boardHeight);
    this.target = new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z);

    // 计算相机到目标的偏移向量
    const offset = new THREE.Vector3(
      initialPos.x - lookAt.x,
      initialPos.y - lookAt.y,  // Y轴是高度
      initialPos.z - lookAt.z
    );
    this.distance = offset.length();
    this.initialDistance = this.distance;  // 保存初始距离
    this.minDistance = this.distance * CAMERA_CONFIG.minDistanceRatio;  // 计算最小距离

    // 方位角（水平旋转角度）
    this.azimuth = Math.atan2(offset.x, offset.z);

    // 仰角（从Y轴向下的角度）
    // polar = 0 表示相机在正上方，polar = π/2 表示相机在水平位置
    this.polar = Math.acos(Math.max(-1, Math.min(1, offset.y / this.distance)));

    // 角度限制
    this.minPolar = CAMERA_CONFIG.minPolarAngle;  // 俯视极限（相机最高）
    this.maxPolar = CAMERA_CONFIG.maxPolarAngle;  // 平视极限（相机水平）
    this.rotateSpeed = CAMERA_CONFIG.rotateSpeed;

    // 设置初始相机位置
    this.updateCameraPosition();

    // 绑定事件（使用保存的引用）
    this.bindEvents();
  }

  /**
   * 绑定鼠标事件
   */
  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.boundOnMouseDown);
    this.canvas.addEventListener('mousemove', this.boundOnMouseMove);
    this.canvas.addEventListener('mouseup', this.boundOnMouseUp);
    this.canvas.addEventListener('mouseleave', this.boundOnMouseUp);
    this.canvas.addEventListener('wheel', this.boundOnWheel, { passive: false });

    // 阻止右键菜单
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /**
   * 鼠标按下
   */
  private onMouseDown(event: MouseEvent): void {
    // 只响应右键
    if (event.button === 2) {
      this.isRotating = true;
      this.lastMousePos = { x: event.clientX, y: event.clientY };
    }
  }

  /**
   * 鼠标移动
   */
  private onMouseMove(event: MouseEvent): void {
    if (!this.isRotating) return;

    const deltaX = event.clientX - this.lastMousePos.x;
    const deltaY = event.clientY - this.lastMousePos.y;

    // 更新方位角（水平旋转）
    // 鼠标往右→azimuth减小→相机绕Y轴顺时针转→棋盘看起来逆时针转（往左）
    // 修正：鼠标往右→azimuth减小→棋盘往右转
    this.azimuth -= deltaX * this.rotateSpeed;

    // 更新仰角（垂直旋转）
    // 鼠标往下→polar增加→相机往下移动→俯视角度增加
    this.polar -= deltaY * this.rotateSpeed;

    // 限制仰角范围
    this.polar = Math.max(this.minPolar, Math.min(this.maxPolar, this.polar));

    this.lastMousePos = { x: event.clientX, y: event.clientY };

    // 更新相机位置
    this.updateCameraPosition();
  }

  /**
   * 鼠标松开
   */
  private onMouseUp(event: MouseEvent): void {
    if (event.button === 2 || event.type === 'mouseleave') {
      this.isRotating = false;
    }
  }

  /**
   * 滚轮缩放
   * 滚轮物理转动90度从最远到最近
   *
   * deltaY 关系说明：
   * - 每次滚轮"点击"（一次滚动单位）约 100 像素
   * - 每次点击约对应 15度 物理转动
   * - 90度物理转动 ≈ 6次点击 ≈ deltaY 600像素
   */
  private onWheel(event: WheelEvent): void {
    event.preventDefault();

    // deltaY 正值表示向下滚动（远离），负值表示向上滚动（拉近）
    const deltaY = event.deltaY;

    // 缩放范围：minDistance 到 initialDistance
    const zoomRange = this.initialDistance - this.minDistance;

    // 90度物理滚动 ≈ deltaY 600像素，映射到整个缩放范围
    // zoomDelta = deltaY像素 * (缩放范围 / 600像素)
    const zoomDelta = deltaY * (zoomRange / 600) * CAMERA_CONFIG.zoomSpeed;

    // 更新距离
    this.distance = Math.max(this.minDistance, Math.min(this.initialDistance, this.distance + zoomDelta));

    // 更新相机位置
    this.updateCameraPosition();
  }

  /**
   * 更新相机位置
   * 球坐标转笛卡尔坐标（Y轴向上）
   */
  private updateCameraPosition(): void {
    // 球坐标转笛卡尔坐标
    // x = distance * sin(polar) * sin(azimuth)
    // y = distance * cos(polar)  （Y轴向上）
    // z = distance * sin(polar) * cos(azimuth)
    const x = this.distance * Math.sin(this.polar) * Math.sin(this.azimuth);
    const y = this.distance * Math.cos(this.polar);  // Y轴高度
    const z = this.distance * Math.sin(this.polar) * Math.cos(this.azimuth);

    // 设置相机位置（相对于目标点）
    this.camera.position.set(
      this.target.x + x,
      this.target.y + y,
      this.target.z + z
    );

    // 相机看向目标
    this.camera.lookAt(this.target);
  }

  /**
   * 重置视角到初始位置（包括缩放）
   */
  reset(): void {
    const initialPos = getCameraInitialPosition(this.boardHeight);
    const lookAt = getCameraLookAt(this.boardHeight);

    this.target.set(lookAt.x, lookAt.y, lookAt.z);

    const offset = new THREE.Vector3(
      initialPos.x - lookAt.x,
      initialPos.y - lookAt.y,
      initialPos.z - lookAt.z
    );
    this.distance = offset.length();
    this.initialDistance = this.distance;  // 重置初始距离
    this.minDistance = this.distance * CAMERA_CONFIG.minDistanceRatio;  // 重置最小距离
    this.azimuth = Math.atan2(offset.x, offset.z);
    this.polar = Math.acos(Math.max(-1, Math.min(1, offset.y / this.distance)));

    this.updateCameraPosition();
  }

  /**
   * 更新棋盘高度（重新计算相机位置）
   */
  updateBoardHeight(boardHeight: number): void {
    this.boardHeight = boardHeight;
    const lookAt = getCameraLookAt(boardHeight);
    this.target.set(lookAt.x, lookAt.y, lookAt.z);

    // 重新计算距离范围
    const initialPos = getCameraInitialPosition(boardHeight);
    const offset = new THREE.Vector3(
      initialPos.x - lookAt.x,
      initialPos.y - lookAt.y,
      initialPos.z - lookAt.z
    );
    this.initialDistance = offset.length();
    this.minDistance = this.initialDistance * CAMERA_CONFIG.minDistanceRatio;

    // 保持当前缩放比例
    const currentRatio = this.distance / this.initialDistance;
    this.distance = this.initialDistance * Math.min(1, Math.max(CAMERA_CONFIG.minDistanceRatio, currentRatio));

    this.updateCameraPosition();
  }

  /**
   * 是否正在旋转
   */
  isDragging(): boolean {
    return this.isRotating;
  }

  /**
   * 播放开场动画（从远处拉近）
   * @param duration 动画持续时间（毫秒）
   * @returns Promise，动画完成时resolve
   */
  playIntroAnimation(duration: number = 2000): Promise<void> {
    return new Promise((resolve) => {
      // 保存目标参数
      const targetDistance = this.distance;
      const targetAzimuth = this.azimuth;
      const targetPolar = this.polar;

      // 起始距离：当前距离的3倍（从极远处开始）
      const startDistance = targetDistance * 3;
      this.distance = startDistance;

      // 起始角度：稍微偏移，增加动感
      const startAzimuth = targetAzimuth + Math.PI * 0.3;
      const startPolar = Math.min(this.maxPolar, targetPolar + 0.2);
      this.azimuth = startAzimuth;
      this.polar = startPolar;

      // 更新初始位置
      this.updateCameraPosition();

      // 动画参数
      const startTime = performance.now();

      // 动画循环
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / duration);

        // 使用缓动函数（ease-out cubic）
        const eased = 1 - Math.pow(1 - progress, 3);

        // 更新参数
        this.distance = startDistance + (targetDistance - startDistance) * eased;
        this.azimuth = startAzimuth + (targetAzimuth - startAzimuth) * eased;
        this.polar = startPolar + (targetPolar - startPolar) * eased;

        // 更新相机位置
        this.updateCameraPosition();

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // 动画完成，确保最终位置精确
          this.distance = targetDistance;
          this.azimuth = targetAzimuth;
          this.polar = targetPolar;
          this.updateCameraPosition();
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  /**
   * 解绑事件（使用保存的函数引用正确解绑）
   */
  dispose(): void {
    this.canvas.removeEventListener('mousedown', this.boundOnMouseDown);
    this.canvas.removeEventListener('mousemove', this.boundOnMouseMove);
    this.canvas.removeEventListener('mouseup', this.boundOnMouseUp);
    this.canvas.removeEventListener('mouseleave', this.boundOnMouseUp);
    this.canvas.removeEventListener('wheel', this.boundOnWheel);

    // 清理状态
    this.isRotating = false;
    this.lastMousePos = { x: 0, y: 0 };
  }
}