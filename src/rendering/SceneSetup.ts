/**
 * Three.js场景初始化
 * 创建Scene、Camera、Renderer、光照
 * Phase 7 新增：AnimationController集成点
 */

import * as THREE from 'three';
import { CAMERA_CONFIG, LIGHT_CONFIG } from '@/config/gameConfig';
import type { AnimationController } from '@/core/AnimationController';

/**
 * 场景初始化类
 */
export class SceneSetup {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  /** 动画控制器（Phase 7） */
  private animationController: AnimationController | null = null;

  /** 每帧渲染前回调列表 */
  private beforeRenderCallbacks: Array<() => void> = [];

  /** 上一次更新时间（用于计算deltaTime） */
  private lastTime: number = 0;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) || document.body;

    // 检测WebGL支持
    if (!this.isWebGLSupported()) {
      this.showWebGLError();
      throw new Error('WebGL is not supported');
    }

    // 初始化场景
    this.scene = this.createScene();

    // 初始化相机
    this.camera = this.createCamera();

    // 初始化渲染器
    this.renderer = this.createRenderer();

    // 初始化光照
    this.setupLights();

    // 添加到容器
    this.container.appendChild(this.renderer.domElement);

    // 处理窗口大小变化
    this.handleResize();

    // 开始渲染循环
    this.animate();
  }

  /**
   * 检测WebGL支持
   */
  private isWebGLSupported(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return context !== null;
    } catch (e) {
      return false;
    }
  }

  /**
   * 显示WebGL不支持提示
   */
  private showWebGLError(): void {
    const errorElement = document.getElementById('webgl-error');
    if (errorElement) {
      errorElement.style.display = 'block';
    }
  }

  /**
   * 创建场景
   */
  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x3a3a42);  // 钢铁灰背景
    return scene;
  }

  /**
   * 创建相机
   * Y轴向上坐标系统
   */
  private createCamera(): THREE.PerspectiveCamera {
    const aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);

    // 设置初始位置（Y轴向上）
    camera.position.set(
      CAMERA_CONFIG.initialPosition.x,
      CAMERA_CONFIG.initialPosition.y,  // Y: 高度
      CAMERA_CONFIG.initialPosition.z
    );

    // 设置看向棋盘中心
    camera.lookAt(
      CAMERA_CONFIG.lookAt.x,
      CAMERA_CONFIG.lookAt.y,  // Y: 高度中心
      CAMERA_CONFIG.lookAt.z
    );

    return camera;
  }

  /**
   * 创建渲染器
   */
  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    return renderer;
  }

  /**
   * 设置光照
   */
  private setupLights(): void {
    // 环境光
    const ambientLight = new THREE.AmbientLight(
      LIGHT_CONFIG.ambient.color,
      LIGHT_CONFIG.ambient.intensity
    );
    this.scene.add(ambientLight);

    // 主光源（带阴影）
    const mainLight = new THREE.DirectionalLight(
      LIGHT_CONFIG.main.color,
      LIGHT_CONFIG.main.intensity
    );
    mainLight.position.set(
      LIGHT_CONFIG.main.position.x,
      LIGHT_CONFIG.main.position.y,
      LIGHT_CONFIG.main.position.z
    );
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    this.scene.add(mainLight);

    // 补充光（蓝色）
    const fillLight = new THREE.DirectionalLight(
      LIGHT_CONFIG.fill.color,
      LIGHT_CONFIG.fill.intensity
    );
    fillLight.position.set(
      LIGHT_CONFIG.fill.position.x,
      LIGHT_CONFIG.fill.position.y,
      LIGHT_CONFIG.fill.position.z
    );
    this.scene.add(fillLight);
  }

  /**
   * 处理窗口大小变化
   */
  private handleResize(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  /**
   * 渲染循环
   * Phase 7 新增：调用 AnimationController.updateAllIdle()
   */
  private animate(): void {
    requestAnimationFrame(() => this.animate());

    // 计算deltaTime
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // 更新动画控制器（呼吸动画等）
    if (this.animationController) {
      this.animationController.updateAllIdle(deltaTime);
    }

    // 每帧渲染前回调（如中心棋子朝向镜头）
    for (const cb of this.beforeRenderCallbacks) {
      cb();
    }

    this.renderer.render(this.scene, this.camera);
  }

  /**
   * 获取场景对象
   */
  getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * 获取相机对象
   */
  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * 获取渲染器对象
   */
  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /**
   * 获取画布元素
   */
  getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  /**
   * 设置动画控制器（Phase 7）
   * @param controller 动画控制器实例
   */
  setAnimationController(controller: AnimationController): void {
    this.animationController = controller;
    console.log('[SceneSetup] AnimationController set');
  }

  /** 设置纯色背景（菜单用） */
  setPlainBackground(color: number): void {
    this.scene.background = new THREE.Color(color);
  }

  /** 注册每帧渲染前回调 */
  onBeforeRender(cb: () => void): void {
    this.beforeRenderCallbacks.push(cb);
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.renderer.dispose();
    this.scene.clear();
  }
}