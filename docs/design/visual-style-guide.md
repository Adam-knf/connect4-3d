# 3D四子棋视觉风格指南

## 基本信息
- **项目名称**：3D四子棋（Connect Four 3D）
- **设计风格**：极简工业风格
- **设计目标**：简约但有辨识度，支持视角切换，胜负特效略复杂
- **创建日期**：2026-04-22

---

## 风格定位

### 极简工业风格

**核心理念**：
- 深色背景 → 3D元素突出，视角切换不干扰
- 几何线条 → 简约但有辨识度
- 柔和光泽 → 棋子质感，不浮夸
- 对比色棋子 → 清晰区分双方

**为什么选择这个风格**：
1. 3D游戏需要深色背景让元素更突出
2. 视角切换时背景干净不干扰观察
3. 工业感有辨识度，不落入常见游戏风格
4. 简约符合需求，但细节精致不廉价

---

## 配色方案

### 主题色板

| 色彩角色 | CSS变量 | 色值 | 用途 |
|----------|---------|------|------|
| 背景主色 | `--bg-primary` | `#0a0a0f` | 3D场景背景、主菜单背景 |
| 背景次色 | `--bg-secondary` | `#151520` | UI卡片背景、面板背景 |
| 卡片背景 | `--bg-card` | `#1a1a28` | 按钮、选项卡片 |
| 文字主色 | `--fg-primary` | `#e8e8ec` | 标题、主要文字 |
| 文字次色 | `--fg-secondary` | `#8888a0` | 说明文字、次要信息 |
| 文字辅助 | `--fg-muted` | `#55556a` | 提示文字、标签 |
| 边框色 | `--border` | `#2a2a3a` | 所有边框线条 |

### 强调色板

| 色彩角色 | CSS变量 | 值 | 用途 |
|----------|---------|------|------|
| 玩家强调 | `--accent-player` | `#3d9eff` | 玩家回合指示、玩家按钮 |
| 对手强调 | `--accent-opponent` | `#ff6b4a` | AI回合指示、失败特效 |
| 胜利色 | `--accent-win` | `#4ade80` | 胜利连线高亮、胜利文字 |
| 特效金 | `--accent-gold` | `#fbbf24` | 胜利粒子、特效 |

### 棋子颜色

| 角色 | CSS变量 | 色值 | Three.js颜色 |
|------|---------|------|--------------|
| 黑棋（玩家） | `--piece-black` | `#1a1a2e` | `Color(0.1, 0.1, 0.18)` |
| 白棋（AI） | `--piece-white` | `#f0f0f5` | `Color(0.94, 0.94, 0.96)` |

---

## 字体系统

### Display Font: Space Mono

**特点**：等宽字体，技术感强，辨识度高

**使用场景**：
- 游戏标题：CONNECT FOUR 3D
- HUD数值：步数、用时、胜率数字
- 难度标签：简单、中等、困难
- 战绩数字：5胜、2负、71%

**CSS规范**：
```css
font-family: 'Space Mono', monospace;
letter-spacing: 0.1em;  /* 增加字间距提升辨识度 */
```

### Body Font: DM Sans

**特点**：现代几何无衬线，阅读友好

**使用场景**：
- 按钮文字：开始游戏、再来一局
- 说明文字：适合新手、有挑战
- 菜单选项：先手黑棋、后手白棋
- 提示信息：此处无法放置、AI思考中

**CSS规范**：
```css
font-family: 'DM Sans', sans-serif;
font-weight: 400;  /* 正文 */
font-weight: 500;  /* 按钮 */
```

---

## 3D场景视觉

### 棋盘材质

**网格线框**：
```
材质类型：LineBasicMaterial
颜色：#2a2a3a (淡灰色)
透明度：0.6（半透明，不遮挡棋子）
线宽：1px
```

**底座面板**：
```
材质类型：MeshStandardMaterial
颜色：#151520（背景次色）
金属度：0.0
粗糙度：0.9（哑光）
透明度：0.3（半透明）
```

**Three.js代码示例**：
```typescript
// 网格线框
const gridMaterial = new THREE.LineBasicMaterial({
  color: 0x2a2a3a,
  transparent: true,
  opacity: 0.6
});

// 底座面板
const baseMaterial = new THREE.MeshStandardMaterial({
  color: 0x151520,
  metalness: 0,
  roughness: 0.9,
  transparent: true,
  opacity: 0.3
});
```

### 棋子材质

**形状：乐高式圆柱体**

```
形状：CylinderGeometry
- 底部直径：格子尺寸 × 0.8
- 高度：与直径相等（1:1比例）
- 可稳定堆叠，物理感强
```

**黑棋（玩家）**：
```
材质类型：MeshStandardMaterial
基础颜色：#1a1a2e（深色）
金属度：0.0（塑料质感）
粗糙度：0.4（光滑塑料表面）
形状：圆柱体，直径=高度
```

**白棋（AI）**：
```
材质类型：MeshStandardMaterial
基础颜色：#f0f0f5（浅色）
金属度：0.0
粗糙度：0.4
形状：圆柱体，直径=高度
```

**Three.js代码示例**：
```typescript
// 黑棋材质（塑料质感）
const blackPieceMaterial = new THREE.MeshStandardMaterial({
  color: 0x1a1a2e,
  metalness: 0.0,
  roughness: 0.4  // 光滑塑料
});

// 白棋材质
const whitePieceMaterial = new THREE.MeshStandardMaterial({
  color: 0xf0f0f5,
  metalness: 0.0,
  roughness: 0.4
});

// 棋子几何体（圆柱形）
const cellSize = 1;  // 格子单位尺寸
const pieceRadius = cellSize * 0.4;
const pieceHeight = cellSize * 0.8;  // 高度与直径相等
const pieceGeometry = new THREE.CylinderGeometry(
  pieceRadius,      // 顶部半径
  pieceRadius,      // 底部半径
  pieceHeight,      // 高度
  32,               // 圆周分段数
  1                 // 高度分段数
);
```

**堆叠榫合特效（待实现）**：
- 棋子落下与其他棋子接触时
- 触发气体喷出粒子效果
- 时间点：下落动画结束瞬间

### 光照设置

```
环境光：
- 类型：AmbientLight
- 颜色：#ffffff（白色）
- 强度：0.4（柔和）

主光源：
- 类型：DirectionalLight
- 颜色：#ffffff
- 强度：0.6
- 位置：(5, 10, 7)（右上前方）
- 投射阴影：开启

补充光：
- 类型：DirectionalLight
- 颜色：#3d9eff（蓝色补光）
- 强度：0.2
- 位置：(-5, 5, -5)（左后方）
```

**Three.js代码示例**：
```typescript
// 环境光
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

// 主光源
const mainLight = new THREE.DirectionalLight(0xffffff, 0.6);
mainLight.position.set(5, 10, 7);
mainLight.castShadow = true;
scene.add(mainLight);

// 补充光（蓝色）
const fillLight = new THREE.DirectionalLight(0x3d9eff, 0.2);
fillLight.position.set(-5, 5, -5);
scene.add(fillLight);
```

---

## UI视觉规范

### 主菜单

**布局**：
- 垂直居中排列
- 大标题 + 小副标题 + 按钮组 + 难度选择
- 居中对齐

**标题样式**：
```css
.menu-logo {
  font-family: 'Space Mono', monospace;
  font-size: 2.5rem;
  letter-spacing: 0.15em;
  color: #e8e8ec;
}
```

**按钮样式**：
```css
.btn {
  font-family: 'DM Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 500;
  padding: 16px 24px;
  border-radius: 8px;
  border: 1px solid #2a2a3a;
  background: #1a1a28;
  color: #e8e8ec;
}

.btn-primary {
  background: #3d9eff;
  border-color: #3d9eff;
  color: white;
}

.btn-primary:hover {
  background: #5aa8ff;
  box-shadow: 0 4px 20px rgba(61, 158, 255, 0.3);
}
```

**难度选项样式**：
```css
.difficulty-option {
  padding: 16px 24px;
  border: 1px solid #2a2a3a;
  border-radius: 8px;
  background: #1a1a28;
}

.difficulty-option.selected {
  border-color: #3d9eff;
  background: rgba(61, 158, 255, 0.1);
}
```

### 游戏 HUD

**布局**：
- 三栏布局：左侧信息 / 中间回合指示 / 右侧时间
- 底部固定，不遮挡棋盘

**回合指示样式**：
```css
.turn-indicator {
  font-family: 'Space Mono', monospace;
  font-size: 1rem;
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid #3d9eff;
  background: rgba(61, 158, 255, 0.2);
  color: #3d9eff;
}

/* AI回合时 */
.turn-indicator.ai-turn {
  border-color: #ff6b4a;
  background: rgba(255, 107, 74, 0.2);
  color: #ff6b4a;
}
```

**AI思考提示**：
```css
.ai-thinking {
  font-size: 0.8rem;
  color: #8888a0;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}
```

### 战绩面板

**布局**：
- 三列卡片：简单/中等/困难
- 展示胜场、败场、胜率

**卡片样式**：
```css
.stat-card {
  background: #151520;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #2a2a3a;
}

.stat-win {
  color: #4ade80;  /* 胜利绿色 */
}

.stat-loss {
  color: #ff6b4a;  /* 失败红色 */
}

.stat-rate {
  color: #e8e8ec;
  text-align: center;
}
```

---

## 胜负特效规范

### 胜利特效序列

| 序号 | 特效内容 | 时长 | 参数 |
|------|----------|------|------|
| 1 | 连线高亮发光 | 0.5s | emissiveColor=#4ade80, intensity=2 |
| 2 | 棋盘旋转展示 | 1.5s | 绕Y轴旋转360度，速度匀速 |
| 3 | 粒子爆炸效果 | 1s | 金色粒子#fbbf24，向外扩散 |
| 4 | 显示结果文字 | 0.5s | "胜利！" 大字居中 |
| 5 | 弹出选项按钮 | 持续 | "再来一局" / "返回主菜单" |

### 失败特效序列

| 序号 | 特效内容 | 时长 | 参数 |
|------|----------|------|------|
| 1 | 连线高亮发光 | 0.5s | emissiveColor=#ff6b4a, intensity=1.5 |
| 2 | 粒子飘落效果 | 1s | 灰色粒子#55556a，向下飘落 |
| 3 | 显示结果文字 | 0.5s | "失败..." 小字居中 |
| 4 | 弹出选项按钮 | 持续 | 同上 |

### Three.js特效代码示例

**连线高亮**：
```typescript
// 高亮获胜连线
function highlightWinLine(positions: Position[]) {
  positions.forEach(pos => {
    const piece = getPieceMesh(pos);
    if (piece) {
      piece.material = piece.material.clone();
      piece.material.emissive = new THREE.Color(0x4ade80);  // 胜利绿色
      piece.material.emissiveIntensity = 2;
    }
  });
}
```

**粒子爆炸**：
```typescript
// 胜利粒子爆炸
function createWinParticles(center: Vector3) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(500 * 3);
  const colors = new Float32Array(500 * 3);

  for (let i = 0; i < 500; i++) {
    // 随机位置
    positions[i * 3] = center.x + Math.random() * 2 - 1;
    positions[i * 3 + 1] = center.y + Math.random() * 2 - 1;
    positions[i * 3 + 2] = center.z + Math.random() * 2 - 1;

    // 金色
    colors[i * 3] = 0.98;     // R
    colors[i * 3 + 1] = 0.75; // G
    colors[i * 3 + 2] = 0.14; // B
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.1,
    vertexColors: true,
    transparent: true,
    opacity: 1
  });

  return new THREE.Points(geometry, material);
}
```

---

## 交互视觉反馈

### 鼠标悬停

**可放置位置高亮规则**：
- 鼠标悬停在底座格子或已有棋子顶部 → 对应列高亮
- 高亮方式：在该列顶层位置显示半透明预览棋子
- 预览棋子颜色随当前玩家变化

**点击触发棋子下落**：
- 左键点击高亮位置 → 从棋盘顶部上方15单位高度掉落棋子
- 棋子下落到该列最底层可用位置（重力规则）

```typescript
function highlightColumn(x: number, y: number) {
  // 计算该列顶层可用位置
  const topZ = findTopEmptyCell(x, y);

  // 在该位置显示半透明预览棋子
  const previewPiece = new THREE.Mesh(
    pieceGeometry,
    new THREE.MeshStandardMaterial({
      color: currentPlayer === 'BLACK' ? 0x1a1a2e : 0xf0f0f5,
      transparent: true,
      opacity: 0.4
    })
  );
  previewPiece.position.set(x, y, topZ);
  scene.add(previewPiece);
}
```

**棋子下落起点**：
```typescript
// 棋子从棋盘上方15单位高度开始下落
const dropStartHeight = boardHeight + 15;  // boardHeight是棋盘实际高度
piece.position.z = dropStartHeight;
```

### 棋子下落动画

```typescript
// 棋子下落动画（从上方15单位落到底层目标位置）
async function animatePieceDrop(
  piece: THREE.Mesh,
  targetZ: number,
  duration: number = 500
) {
  const startZ = boardHeight + 15;  // 从顶部上方15高度开始
  piece.position.z = startZ;

  const startTime = performance.now();

  while (performance.now() - startTime < duration) {
    const progress = (performance.now() - startTime) / duration;
    piece.position.z = startZ - (startZ - targetZ) * easeOutBounce(progress);
    await new Promise(resolve => requestAnimationFrame(resolve));
  }

  piece.position.z = targetZ;

  // 下落结束时触发堆叠榫合特效（待实现：气体喷出）
}
```

// 缓动函数（弹跳效果）
function easeOutBounce(t: number): number {
  if (t < 1 / 2.75) {
    return 7.5625 * t * t;
  } else if (t < 2 / 2.75) {
    return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
  } else if (t < 2.5 / 2.75) {
    return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
  } else {
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  }
}
```

---

## CSS Variables 完整定义

```css
:root {
  /* 背景色 */
  --bg-primary: #0a0a0f;
  --bg-secondary: #151520;
  --bg-card: #1a1a28;

  /* 文字色 */
  --fg-primary: #e8e8ec;
  --fg-secondary: #8888a0;
  --fg-muted: #55556a;

  /* 强调色 */
  --accent-player: #3d9eff;
  --accent-opponent: #ff6b4a;
  --accent-win: #4ade80;
  --accent-gold: #fbbf24;

  /* 边框色 */
  --border: #2a2a3a;

  /* 棋子色 */
  --piece-black: #1a1a2e;
  --piece-white: #f0f0f5;

  /* 光晕色 */
  --glow-blue: rgba(61, 158, 255, 0.3);
  --glow-red: rgba(255, 107, 74, 0.3);
  --glow-green: rgba(74, 222, 128, 0.3);

  /* 字体 */
  --font-display: 'Space Mono', monospace;
  --font-body: 'DM Sans', sans-serif;

  /* 间距 */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 48px;

  /* 圆角 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}
```

---

## 风格总结

### 核心原则

1. **深色优先**：背景永远深色，让3D元素突出
2. **几何简约**：形状简洁，避免复杂装饰
3. **对比清晰**：棋子、状态、按钮都有明确对比色
4. **细节精致**：光泽、阴影、动画都有精细参数

### 视觉记忆点

- **深色背景 + 柔和光泽球体棋子** = 工业感辨识度
- **Space Mono 等宽字体** = 技术感辨识度
- **蓝色玩家 + 红色AI 强调色** = 双方清晰区分
- **金色胜利粒子 + 绿色连线** = 胜利成就感

---

**版本**：v1.0
**最后更新**：2026-04-22