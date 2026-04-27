# Phase 7 主题系统测试交接文档

## 文档信息
- **版本号**: v1.1
- **创建日期**: 2026-04-27
- **作者**: Dev Agent
- **交接目标**: 🧪 QA Agent
- **前置依赖文档**:
  - `docs/architecture/architecture.md` v2.0 — 模块13-19 接口定义
  - `docs/architecture/theme-system-design.md` v2.3 — 完整设计文档
  - `docs/requirements/theme-system-requirements.md` — 需求验收标准

---

## 一、已实现模块清单

### 1.1 新增模块

| 模块 | 文件路径 | 功能 |
|------|----------|------|
| ThemeManager | `src/core/ThemeManager.ts` | 主题注册、切换、回调管理 |
| ThemeLoader | `src/core/ThemeLoader.ts` | GLB模型/纹理/天空盒加载，改色 |
| PieceStateManager | `src/core/PieceStateManager.ts` | 6状态棋子状态机（SLEEP→IDLE→HOVER→FALL→IMPACT→WIN/LOSE） |
| AnimationController | `src/core/AnimationController.ts` | 呼吸/悬停/下落/胜负动画执行引擎 |
| EnvironmentRenderer | `src/rendering/EnvironmentRenderer.ts` | 背景（颜色/渐变/天空盒）、光照渲染 |
| PieceRenderer | `src/rendering/PieceRenderer.ts` | 棋子Mesh池管理（几何体/GLB模型） |
| ThemeSelectUI | `src/ui/ThemeSelectUI.ts` | 主题选择界面+二次确认弹窗 |

### 1.2 集成改造模块（v1.1 补充）

| 模块 | 改造内容 |
|------|----------|
| BoardRenderer | 添加 `applyTheme()` 方法，主题色高亮（己方蓝/对方红） |
| MenuUI | 添加主题切换按钮+回调 `setThemeSelectCallback()` |
| GameController | 添加 `setThemeManager()`、`setPieceStateManager()`、`setAnimationController()` 方法；添加悬停事件触发、胜负状态触发、重启清理 |
| SceneSetup | 添加 `setAnimationController()` 方法，动画循环集成 |
| main.ts | 完整集成流程初始化（ThemeLoader→ThemeManager→AnimationController→PieceStateManager→ThemeSelectUI） |
| theme.ts | PieceMesh 添加 `isOwn` 属性（区分己方/对方动画） |

| 模块 | 改造内容 |
|------|----------|
| BoardRenderer | 添加 `applyTheme()` 方法，主题色高亮（己方蓝/对方红） |
| MenuUI | 添加主题切换按钮+回调 `setThemeSelectCallback()` |
| GameController | 添加 `setThemeManager()`、`setTheme()` 方法 |
| theme.ts | PieceMesh 添加 `isOwn` 属性（区分己方/对方动画） |

---

## 二、运行环境

### 2.1 基本环境
- **Node.js版本**: v18+ (推荐v22)
- **依赖安装**: `npm install`
- **构建命令**: `npm run build`
- **测试命令**: `npm run test`
- **开发服务器**: `npm run dev`（端口3000）

### 2.2 构建验证结果
```
✓ TypeScript编译成功（无错误）
✓ Vite构建成功（dist目录生成）
✓ 114/115测试通过（AIPlayer MEDIUM depth失败是预存问题）
```

---

## 三、接口调用方法

### 3.1 ThemeManager 初始化

```typescript
import { ThemeManager } from '@/core/ThemeManager';
import { classicTheme, catTheme, mechaTheme } from '@/config/themes';

const themeManager = new ThemeManager();

// 注册主题
themeManager.registerTheme(classicTheme);
themeManager.registerTheme(catTheme);
themeManager.registerTheme(mechaTheme);

// 初始化（加载默认主题CLASSIC）
await themeManager.init();

// 切换主题
const success = await themeManager.setTheme('CAT');
// 失败时自动fallback到CLASSIC
```

### 3.2 GameController 主题集成

```typescript
// 在主入口或GameUI初始化中
gameController.setThemeManager(themeManager);

// 用户切换主题
await gameController.setTheme('MECHA');
```

### 3.3 ThemeSelectUI 使用

```typescript
import { ThemeSelectUI } from '@/ui/ThemeSelectUI';

const themeSelectUI = new ThemeSelectUI(themeManager);
themeSelectUI.init();

// 设置回调
themeSelectUI.onSelect((themeId) => {
  gameController.setTheme(themeId);
});

// 显示面板
themeSelectUI.show();
```

---

## 四、程序运行顺序

```bash
# 1. 安装依赖
npm install

# 2. 构建验证
npm run build
# 预期输出：无 TypeScript 编译错误，dist/ 目录生成

# 3. 运行测试
npm run test
# 预期输出：114/115 测试通过
# 注意：AIPlayer.test.ts "难度配置正确" 失败是预存问题（MEDIUM depth=3→4）

# 4. 启动开发服务器
npm run dev
# 预期输出：服务器启动在 http://localhost:3000
```

---

## 五、验证方法

### 5.1 编译验证
- **成功标志**: `npm run build` 无错误输出
- **失败排查**: 检查 TypeScript 类型定义一致性（theme.ts 与各模块）

### 5.2 功能验证（手动测试）

#### 验证场景1：主题切换入口
```
启动游戏 → 主菜单 → 点击「主题切换」按钮
预期：弹出主题选择面板（经典/猫咪/机甲三个卡片）
```

#### 验证场景2：主题切换流程
```
选择非当前主题 → 弹出确认对话框
点击确认 → 主题切换生效 → 面板关闭
点击取消 → 恢复原选中状态 → 弹窗关闭
```

#### 验证场景3：经典主题渲染
```
棋盘网格颜色：#2a2a3a（border）
棋子材质颜色：黑#1d1d1f / 白#f5f5f7
高亮颜色：己方#3d9eff（蓝）/ 对方#ff6b4a（红）
```

#### 验证场景4：猫咪/机甲主题（GLB）
```
目前素材路径是占位符，GLB加载会失败
失败时自动 fallback 到经典几何体
日志输出：[PieceRenderer] Failed to load model, using classic fallback
```

### 5.3 日志验证

关键日志输出：
```
[ThemeManager] Initialized with CLASSIC theme
[ThemeLoader] Model loaded: /path/to/model.glb
[PieceRenderer] Classic theme initialized
[AnimationController] Theme set: CLASSIC
[ThemeSelectUI] Panel shown
```

---

## 六、素材占位符说明

**重要提醒**: 猫咪/机甲主题的 GLB 模型素材路径为占位符，需要后续获取：

| 素材 | 占位符路径 | 需要获取 |
|------|------------|----------|
| 黑猫活跃姿态 | `assets/models/cat_black_active.glb` | 蹲坐猫模型 |
| 黑猫休眠姿态 | `assets/models/cat_black_sleep.glb` | 趴睡猫模型 |
| 黑机甲活跃姿态 | `assets/models/mecha_black_active.glb` | 站立机甲模型 |
| 黑机甲休眠姿态 | `assets/models/mecha_black_sleep.glb` | 收拢机甲模型 |

黑白棋共用同一模型，通过 `ThemeLoader.applyColorToModel()` 运行时改色：
- 黑猫: #1a1a22 / 白猫: #f0e8d8
- 黑机甲: #1a1a2a / 白机甲: #d0d8e8

---

## 七、常见问题排查

| 问题 | 可能原因 | 处理方式 |
|------|----------|----------|
| TypeScript编译失败 | 类型定义不一致 | 检查 theme.ts 与各模块类型引用 |
| GLB模型加载失败 | 素材路径占位符 | 预期行为，检查 fallback 日志 |
| 主题切换无效 | ThemeManager未注册 | 检查 main.ts 初始化流程 |
| 高亮颜色不变 | BoardRenderer.applyTheme未调用 | 检查 GameController.setTheme 流程 |
| 动画不播放 | AnimationController.update未调用 | 检查渲染循环集成 |

---

## 八、已知问题

1. **AIPlayer MEDIUM depth 测试失败**: depth=3→4 不一致，预存问题，不影响主题系统
2. **GLB素材缺失**: 猫咪/机甲主题会 fallback 到经典几何体，待 Phase 8/9 补充素材
3. **动画循环未集成**: AnimationController.update() 需在渲染循环中调用（待集成）

---

## 九、交接确认

- [x] 构建成功（`npm run build`）
- [x] 测试通过（114/115，预存失败不影响）
- [ ] 手动验证待QA确认（需浏览器环境）
- [ ] GLB素材待Phase 8/9补充

---

**文档版本**: v1.0
**最后更新**: 2026-04-27