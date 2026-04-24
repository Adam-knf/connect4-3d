# 测试交接文档 v1.0

## 基本信息
- **项目名称**：Connect Four 3D - Phase 3 渲染层
- **开发人员**：Dev Agent + threejs-game skill
- **文档版本**：v1.0
- **创建日期**：2026-04-23
- **交接目标**：🧪 QA Agent
- **前置依赖文档**：
  - requirements.md v1.4
  - architecture.md v1.3
  - visual-style-guide.md v1.0

---

## 运行环境

### 系统要求
- Node.js v18+
- npm v9+

### 依赖安装
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

服务器启动后，浏览器自动打开 `http://localhost:3000`

---

## 实现内容

### 新增文件

| 文件 | 用途 |
|------|------|
| `src/rendering/BoardRenderer.ts` | 棋盘渲染器（底座网格、线框、棋子渲染、下落动画） |
| `src/rendering/CameraController.ts` | 相机控制器（右键拖拽旋转、角度限制） |
| `src/ui/InputHandler.ts` | 输入处理器（左键点击、悬停检测、Raycaster） |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `src/main.ts` | 整合所有渲染组件，添加测试交互 |
| `src/config/gameConfig.ts` | 已有配置，无需修改 |
| `src/rendering/SceneSetup.ts` | 已有场景初始化，无需修改 |

---

## 功能验证清单

### T3-1 BoardRenderer 棋盘渲染
**验证方法**：打开浏览器后观察

| 检查项 | 预期效果 | 验证方式 |
|--------|----------|----------|
| 底座面板 | 深色半透明底座（#151520, opacity 0.3） | 视觉检查 |
| 网格线框 | 淡灰色线框（#2a2a3a, opacity 0.6），覆盖6层高度 | 视觉检查 |
| 各层切片 | 每层有薄的参考切片面板 | 视觉检查 |

### T3-2 棋子渲染与下落动画
**验证方法**：启动后自动添加4个测试棋子

| 检查项 | 预期效果 | 验证方式 |
|--------|----------|----------|
| 棋子形状 | 乐高式圆柱体，直径=高度 | 视觉检查 |
| 黑棋颜色 | #1a1a2e，塑料质感（metalness=0, roughness=0.4） | 视觉检查 |
| 白棋颜色 | #f0f0f5，塑料质感 | 视觉检查 |
| 下落动画 | 从上方15单位高度落下，500ms，带弹跳缓动 | 视觉检查（观察前4个测试棋子） |
| 阴影 | 棋子投射阴影 | 视觉检查 |

### T3-3 悬停高亮交互
**验证方法**：鼠标移动到棋盘格子

| 检查项 | 预期效果 | 验证方式 |
|--------|----------|----------|
| 预览棋子 | 半透明棋子显示在顶层可用位置（opacity 0.4） | 鼠标悬停观察 |
| 列高亮 | 底座格子发光高亮（#3d9eff, emissive） | 鼠标悬停观察 |
| 颜色切换 | 黑/白棋预览颜色根据已放置棋子数量切换 | 点击放置后，再悬停观察颜色变化 |

### T3-4 CameraController 视角控制
**验证方法**：右键拖拽

| 检查项 | 鄭期效果 | 验证方式 |
|--------|----------|----------|
| 右键拖拽 | 视角围绕棋盘中心旋转 | 右键按住拖动 |
| 仰角限制 | 不能翻转超过90度俯视/18度仰视 | 尝试拖拽到极端角度 |
| 松开固定 | 松开后视角保持当前位置 | 松开右键 |

### T3-5 InputHandler 输入处理
**验证方法**：左键点击

| 检查项 | 鄭期效果 | 验证方式 |
|--------|----------|----------|
| 左键点击 | 在点击位置放置棋子 | 左键点击任意空格子 |
| Raycaster检测 | 只有格子位置可点击，边界外不响应 | 点击网格线或边界外 |
| 已满列提示 | 点击已满列时console输出"⚠️ Column is full" | 填满一列后点击该列 |

---

## 程序运行顺序

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev
# 输出：
#   VITE v5.x.x  ready in xxx ms
#   ➜  Local:   http://localhost:3000/
#   ➜  Network: use --host to expose

# 3. 浏览器打开 http://localhost:3000
# 预期：
#   - 看到5x5x6（或更大）的3D棋盘
#   - 自动添加4个测试棋子（每600ms一个）
#   - Console输出：✅ Phase 3 rendering initialized
```

---

## Console 调试输出

启动后应看到以下输出：

```
🎮 Connect Four 3D - Phase 3 Rendering
📊 Board height: 7 (MEDIUM难度)
✅ BoardRenderer initialized
✅ Phase 3 rendering initialized
🖱️ Left-click to place piece, Right-click drag to rotate view
🧪 Adding test pieces...
🎯 Piece placed at (x, y, z)
🎬 Drop animation complete
```

---

## 交互操作说明

### 鼠标操作
- **左键点击**：在悬停高亮的格子放置棋子
- **右键拖拽**：旋转视角观察棋盘
- **鼠标悬停**：显示预览棋子和列高亮

### 调试
浏览器Console中可执行：
```javascript
// 获取游戏实例
window.game

// 添加棋子（测试）
game.testPieceCount  // 查看已放置棋子数量
```

---

## 成功标志

- [x] 构建成功（`npm run build` 无错误）
- [x] 单元测试全部通过（52个）
- [ ] 浏览器中能看到棋盘渲染
- [ ] 右键拖拽能旋转视角
- [ ] 悬停显示预览棋子
- [ ] 点击能放置棋子
- [ ] 下落动画流畅

---

## 失败排查

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 页面空白 | WebGL不支持 | 检查浏览器WebGL支持，页面有提示 |
| 棋子不显示 | Three.js材质问题 | 检查Console是否有错误 |
| 下落动画不流畅 | requestAnimationFrame问题 | 检查浏览器性能 |
| 点击无响应 | Raycaster配置问题 | 检查InputHandler是否正确初始化 |
| 视角不能旋转 | 事件绑定问题 | 检查CameraController事件监听 |

---

## 文档状态

- [x] 代码实现完成
- [x] 构建通过
- [x] 单元测试通过
- [ ] 浏览器交互测试（需QA验证）
- [x] 测试交接文档完成

---

**版本**：v1.0
**最后更新**：2026-04-23