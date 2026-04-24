# 测试交接文档 v1.1

## 基本信息
- **项目名称**：Connect Four 3D - Phase 3 悬停高亮交互优化
- **开发人员**：Dev Agent + threejs-game skill
- **文档版本**：v1.1
- **创建日期**：2026-04-23
- **交接目标**：🧪 QA Agent
- **前置依赖文档**：
  - requirements.md v1.4
  - architecture.md v1.3
  - hover-highlight-spec.md v1.0

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

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `src/config/gameConfig.ts` | 新增 `verticalHighlight` 和 `cellHighlight` 配置项 |
| `src/types/index.ts` | RenderConfig 类型新增字段 |
| `src/rendering/BoardRenderer.ts` | 简化网格线、新增竖直空间高亮、增强底部格子高亮 |
| `src/ui/InputHandler.ts` | 投影计算悬停检测（穿透棋子） |
| `src/main.ts` | 悬停回调调整 |

---

## 功能验证清单

### 1. 网格线简化
**验证方法**：打开浏览器后观察

| 检查项 | 预期效果 | 验证方式 |
|--------|----------|----------|
| 底部网格线 | 清晰显示 5x5 格子网格 | 视觉检查 |
| 顶层网格线 | 无（已删除） | 视觉检查 |
| 垂直柱线 | 无（已删除） | 视觉检查 |

### 2. 悬停检测（投影计算）
**验证方法**：鼠标移动到棋盘各位置

| 检查项 | 预期效果 | 验证方式 |
|--------|----------|----------|
| 空棋盘悬停 | 正确识别格子坐标 | 观察高亮位置 |
| 悬停在棋子上方 | 穿透检测，识别棋子下方格子 | 放置棋子后悬停在其上方 |
| 边界外悬停 | 不显示高亮 | 鼠标移出棋盘区域 |

### 3. 底部格子高亮
**验证方法**：鼠标悬停在空格子

| 检查项 | 预期效果 | 验证方式 |
|--------|----------|----------|
| 高亮颜色 | #3d9eff（配置色） | 视觉检查 |
| 高亮强度 | 有预览棋子时更明显 | 悬停对比观察 |
| 发光效果 | emissive 发光 | 视觉检查 |

### 4. 竖直空间网格线浮现
**验证方法**：鼠标悬停在任意格子

| 检查项 | 预期效果 | 验证方式 |
|--------|----------|----------|
| 4条竖直边线 | 从底部到顶层的发光线 | 视觉检查 |
| 顶层发光面板 | 顶层位置半透明发光面板 | 视觉检查 |
| 离开时消失 | 移出格子后网格线消失 | 移动鼠标观察 |

### 5. 虚影棋子 + 明显高亮
**验证方法**：悬停在空格子（有可用位置）

| 检查项 | 预期效果 | 验证方式 |
|--------|----------|----------|
| 虚影棋子位置 | 显示在顶层可用空位 | 视觉检查 |
| 虚影棋子颜色 | 根据当前玩家（黑/白） | 交替放置观察 |
| 底部高亮更明显 | emissiveIntensity 更高 | 对比观察 |

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

# 3. 浏览器打开 http://localhost:3000
# 预期：
#   - 棋盘只显示底部网格线
#   - 悬停时竖直网格线浮现
#   - 底部格子高亮发光
#   - 虚影棋子显示在正确位置
```

---

## Console 调试输出

启动后应看到以下输出：

```
🎮 Connect Four 3D - Phase 3 Rendering
✅ BoardRenderer initialized
✅ Phase 3 rendering initialized
```

---

## 配置项说明

新增配置可在 `src/config/gameConfig.ts` 中调整：

```typescript
RENDER_CONFIG.verticalHighlight = {
  color: 0x3d9eff,       // 发光颜色
  opacity: 0.3,          // 透明度
  emissiveIntensity: 0.5, // 发光强度
}

RENDER_CONFIG.cellHighlight = {
  color: 0x3d9eff,       // 发光颜色
  opacity: 0.4,          // 透明度
  emissiveIntensity: 0.8, // 发光强度
}
```

---

## 成功标志

- [x] 构建成功（`npm run build` 无错误）
- [ ] 浏览器中能看到底部网格线
- [ ] 悬停时竖直网格线浮现
- [ ] 底部格子高亮明显
- [ ] 虚影棋子位置正确
- [ ] 穿透检测正常（悬停在棋子上方）

---

## 失败排查

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 网格线不显示 | Scene未初始化 | 检查Console是否有错误 |
| 穿透检测不工作 | 投影计算错误 | 检查 boardHeight/boardWidth 配置 |
| 高亮不消失 | clearHighlight未调用 | 检查悬停回调逻辑 |
| 竖直网格线位置错误 | cellHeight配置错误 | 检查 gameConfig.ts |

---

## 文档状态

- [x] 代码实现完成
- [x] 构建通过
- [ ] 浏览器交互测试（需QA验证）
- [x] 测试交接文档完成

---

**版本**：v1.1
**最后更新**：2026-04-23