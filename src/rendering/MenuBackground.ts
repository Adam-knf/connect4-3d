/**
 * MenuBackground — 主菜单 3D 背景渲染
 * 左(白猫) / 中(经典黑白棋子上下重叠) / 右(黑机甲)，各带舞台灯光
 */

import * as THREE from 'three';
import { ThemeLoader } from '@/core/ThemeLoader';
import { CLASSIC_THEME } from '@/config/themes/classicTheme';
import { CAT_THEME, CAT_COLORS } from '@/config/themes/catTheme';
import { MECHA_THEME, MECHA_COLORS } from '@/config/themes/mechaTheme';

const CAT_SCALE = 0.02;
const MECHA_SCALE = 0.8;
const CLASSIC_SCALE = 2.5;

/** 创建一个舞台灯光组：多角度照射 */
function stageLights(color: number, intensity: number, target: THREE.Vector3): THREE.DirectionalLight[] {
  const lights: THREE.DirectionalLight[] = [];
  const angles = [
    { x: 2, y: 5, z: 3 },    // 上前方
    { x: -2, y: 3, z: -2 },   // 后侧方
    { x: 0, y: 2, z: -3 },    // 后方补光
    { x: 3, y: 2, z: 0 },     // 右侧
    { x: -3, y: 2, z: 0 },    // 左侧
  ];
  for (const a of angles) {
    const l = new THREE.DirectionalLight(color, intensity / angles.length);
    l.position.copy(target).add(new THREE.Vector3(a.x, a.y, a.z));
    lights.push(l);
  }
  return lights;
}

export class MenuBackground {
  private scene: THREE.Scene | null = null;
  private loader: ThemeLoader;
  private container = new THREE.Group();

  constructor(loader: ThemeLoader) {
    this.loader = loader;
    this.container.name = 'MenuBackground';
    this.container.visible = false;
  }

  async init(scene: THREE.Scene): Promise<void> {
    this.scene = scene;
    scene.add(this.container);

    // 环境光
    this.container.add(new THREE.AmbientLight(0xffffff, 0.2));

    // 加载模型
    try {
      await Promise.all([
        this.loadCat(),
        this.loadCenterPieces(),
        this.loadMecha(),
      ]);
    } catch (e) {
      console.warn('[MenuBackground] Load failed:', e);
    }
  }

  show(): void { this.container.visible = true; }
  hide(): void { this.container.visible = false; }

  dispose(): void {
    if (this.scene) this.scene.remove(this.container);
    this.container.traverse((n) => {
      if (n instanceof THREE.Mesh) {
        n.geometry.dispose();
        const m = n.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m.dispose();
      }
    });
  }

  // ---- 模型 ----

  /** 左：白猫 + 暖色舞台灯 */
  private async loadCat(): Promise<void> {
    const model = await this.loader.loadModel(CAT_THEME.pieces.white.model!.path);
    this.fixClone(model);
    this.loader.applyColorToModel(model, CAT_COLORS.WHITE_CAT, CAT_THEME.pieces.white.material);
    model.scale.setScalar(CAT_SCALE);
    model.position.set(-1.8, 1, 2);
    // model.rotation.y = 0.3 + Math.PI;  // 水平180°，正面朝向用户
    model.rotation.y = 4;
    model.castShadow = true;
    this.container.add(model);

    for (const l of stageLights(CAT_THEME.environment.lighting.fill.color, 2.0, model.position)) {
      this.container.add(l);
    }
  }

  /** 右：黑机甲 + 冷色舞台灯 */
  private async loadMecha(): Promise<void> {
    const model = await this.loader.loadModel(MECHA_THEME.pieces.black.model!.path);
    this.fixClone(model);
    this.loader.applyColorToModel(model, MECHA_COLORS.BLACK_MECHA, MECHA_THEME.pieces.black.material);
    model.scale.setScalar(MECHA_SCALE);
    model.position.set(6.8, 1, 2);
    model.rotation.y = -0.3;
    model.castShadow = true;
    this.container.add(model);

    for (const l of stageLights(MECHA_THEME.environment.lighting.fill.color, 2.4, model.position)) {
      this.container.add(l);
    }
  }

  /** 中：经典黑白棋子上下重叠 + 白光舞台灯 */
  private async loadCenterPieces(): Promise<void> {
    const geom = new THREE.CylinderGeometry(0.4, 0.4, 0.72, 32);
    const blackMat = new THREE.MeshStandardMaterial({
      color: CLASSIC_THEME.pieces.black.geometry!.color,
      metalness: CLASSIC_THEME.pieces.black.material!.metalness,
      roughness: CLASSIC_THEME.pieces.black.material!.roughness,
    });
    const whiteMat = new THREE.MeshStandardMaterial({
      color: CLASSIC_THEME.pieces.white.geometry!.color,
      metalness: CLASSIC_THEME.pieces.white.material!.metalness,
      roughness: CLASSIC_THEME.pieces.white.material!.roughness,
    });

    const black = new THREE.Mesh(geom, blackMat);
    black.position.set(0, 0.4, 0);
    black.castShadow = true;
    const white = new THREE.Mesh(geom, whiteMat);
    white.position.set(0, -0.4, 0);
    white.castShadow = true;

    const group = new THREE.Group();
    group.add(black);
    group.add(white);
    group.position.set(2.5, 6, 2.5);
    group.rotation.x = -0.15;
    group.scale.setScalar(CLASSIC_SCALE);
    this.container.add(group);

    for (const l of stageLights(0xffffff, 1.6, group.position)) {
      this.container.add(l);
    }
  }

  // ---- 工具 ----

  private fixClone(model: THREE.Group): void {
    const boneMap = new Map<string, THREE.Bone>();
    const skinned: THREE.SkinnedMesh[] = [];
    model.traverse((n) => {
      if (n instanceof THREE.Bone) boneMap.set(n.name, n);
      else if (n instanceof THREE.Mesh) {
        const m = n.material;
        if (Array.isArray(m)) n.material = m.map((x) => x.clone());
        else n.material = m.clone();
        if (n instanceof THREE.SkinnedMesh) skinned.push(n);
      }
    });
    for (const sm of skinned) {
      const bones = sm.skeleton.bones.map((b) => boneMap.get(b.name) || b);
      sm.skeleton = new THREE.Skeleton(bones, sm.skeleton.boneInverses);
      sm.bind(sm.skeleton, sm.bindMatrix);
    }
  }
}
