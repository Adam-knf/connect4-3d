# Phase 6 UI层测试交接文档 v1.0

## 基本信息
- **文档版本**：v1.0
- **创建日期**：2026-04-24
- **作者**：Dev Agent
- **交接目标**：🧪 QA Agent
- **前置依赖**：
  - requirements.md v1.4
  - architecture.md v1.3
  - Phase 5 QA验收通过（qa-report-phase5-v1.2.md）

---

## 实现概述

Phase 6 UI层实现了4个任务：

| ID | 任务 | 实现文件 | 状态 |
|----|------|----------|------|
| T6-3 | StatsStore战绩存储 | `src/core/StatsStore.ts` | ✅ |
| T6-1 | GameUI信息面板 | `src/ui/GameUI.ts` | ✅ |
| T6-2 | MenuUI主菜单 | `src/ui/MenuUI.ts` | ✅ |
| T6-4 | 战绩展示UI | 集成到GameUI和MenuUI | ✅ |

---

## 运行环境

- **Node版本**：18+
- **依赖安装**：`npm install`
- **启动命令**：`npm run dev`
- **端口**：http://localhost:3000

---

## 代码变更

### 新增文件
- `src/core/StatsStore.ts` - 战绩存储模块
- `src/ui/GameUI.ts` - HUD信息面板
- `src/ui/MenuUI.ts` - 主菜单

### 修改文件
- `src/main.ts` - 集成UI模块

---

## 接口调用方法

### StatsStore 战绩存储

```typescript
import { StatsStore } from '@/core/StatsStore';

// 创建实例
const statsStore = new StatsStore();

// 更新战绩（游戏结束时调用）
statsStore.update('MEDIUM', 'WIN');  // 中等难度获胜
statsStore.update('HARD', 'LOSS');   // 困难难度失败

// 获取完整战绩数据
const stats = statsStore.getStats();
// 返回：{ easy: { wins, losses, rate }, medium: {...}, hard: {...}, total: {...} }

// 清空战绩
statsStore.clear();
```

### GameUI 信息面板

```typescript
import { GameUI } from '@/ui/GameUI';

// 创建实例
const gameUI = new GameUI(statsStore);
gameUI.init();

// 显示/隐藏
gameUI.show();
gameUI.hide();

// 更新信息
gameUI.updateTurn('BLACK', false);      // 黑方回合，非AI
gameUI.updateTurn('WHITE', true);       // 白方回合，AI思考中
gameUI.updateSteps(12);                 // 步数
gameUI.updateDifficulty('MEDIUM');      // 难度

// 计时器
gameUI.startTimer();                    // 开始计时
gameUI.stopTimer();                     // 停止计时

// AI思考提示
gameUI.showAIThinking();                // 显示"AI思考中..."
gameUI.hideAIThinking();                // 隐藏提示

// 战绩刷新
gameUI.refreshStats();                  // 更新战绩显示
```

### MenuUI 主菜单

```typescript
import { MenuUI } from '@/ui/MenuUI';

// 创建实例
const menuUI = new MenuUI(statsStore);
menuUI.init();

// 设置开始游戏回调
menuUI.setStartGameCallback((difficulty, order) => {
  // 开始游戏逻辑
});

// 显示/隐藏
menuUI.show();                          // 显示主菜单
menuUI.hide();                          // 隐藏主菜单
```

---

## 程序运行顺序

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 预期输出：
# ✓ Server running at http://localhost:3000
# ✓ 主菜单显示，可选择难度和先后手

# 3. 构建检查
npm run build

# 预期输出：
# ✓ TypeScript编译成功
# ✓ Vite构建完成

# 4. 测试运行
npm run test

# 预期输出：
# 1 failed | 69 passed (70 tests)
# 失败的是AI性能测试（已知问题）
```

---

## 验证方法

### 成功标志

1. **构建成功**：`npm run build` 无错误
2. **主菜单显示**：
   - 启动后显示主菜单面板
   - 可选择难度（简单/中等/困难）
   - 可选择先后手（先手/后手/随机）
   - 可查看战绩面板
3. **游戏流程**：
   - 点击"开始游戏"进入游戏
   - HUD面板显示在底部
   - 显示回合、步数、难度、用时
   - AI回合时显示"AI思考中..."
4. **战绩记录**：
   - 游戏结束后战绩更新
   - 点击"战绩"按钮可查看统计
   - localStorage持久化存储

### 失败排查

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 主菜单不显示 | DOM容器不存在 | 检查 `menu-ui` 容器是否在HTML中 |
| HUD不更新 | GameState未触发 | 确保回调正确绑定 |
| 战绩不更新 | localStorage失败 | 检查浏览器localStorage权限 |
| 样式异常 | CSS变量未加载 | 检查样式注入函数 |

---

## 功能验收清单

### F-007 战绩记录（本地）

- [ ] 简单难度胜败场正确记录
- [ ] 中等难度胜败场正确记录
- [ ] 困难难度胜败场正确记录
- [ ] 胜率计算正确（wins/(wins+losses)）
- [ ] localStorage持久化生效
- [ ] 页面刷新后战绩保留

### F-009 UI信息面板

- [ ] 当前回合显示正确（黑方/白方）
- [ ] AI思考提示显示（AI回合时）
- [ ] 步数实时更新
- [ ] 难度显示正确
- [ ] 用时计时器工作
- [ ] 战绩按钮可点击

### F-005 游戏流程（主菜单）

- [ ] 主菜单显示
- [ ] 难度选择生效
- [ ] 先后手选择生效
- [ ] 开始游戏按钮工作
- [ ] 战绩查看面板显示

---

## 待QA测试用例

1. **主菜单交互测试**
   - 点击各难度选项，检查选中状态
   - 点击各先后手选项，检查选中状态
   - 点击"查看战绩"按钮，检查面板显示
   - 点击"开始游戏"按钮，检查进入游戏

2. **HUD面板测试**
   - 开始游戏后HUD显示
   - 玩家回合显示"黑方回合"
   - AI回合显示"白方回合"+"AI思考中..."
   - 步数随落子递增
   - 用时计时器正常工作

3. **战绩记录测试**
   - 完成一局简单难度获胜，检查战绩更新
   - 完成一局中等难度失败，检查战绩更新
   - 刷新页面，检查战绩保留
   - 多局游戏后检查总计数据

---

## 文档状态

- [x] Phase 6 UI层代码实现完成
- [x] 构建成功（无TypeScript错误）
- [x] 69个单元测试通过
- [ ] QA验收待进行
- [ ] AI性能测试失败（已知问题，单独处理）

---

**版本**：v1.0
**最后更新**：2026-04-24