# 测试交接文档

**版本**: v2.0
**日期**: 2026-04-26
**作者**: Dev Agent
**交接目标**: QA验证

## 修复内容

### 问题1：再来一局先后手错乱
- **现象**: 选择"先手"开始游戏，点击"再来一局"后有概率变成后手
- **根因**: `main.ts` 的 `restart()` 方法总是使用 `'RANDOM'` 作为先后手参数
- **修复**: 在 GameState 中保存玩家原始的 `order` 选择（FIRST/SECOND/RANDOM），restart 时恢复

### 问题2：开场动画期间操作未屏蔽
- **现象**: 显示"先手（黑棋）/后手（白棋）"提示和镜头缩放时，用户仍可旋转/缩放棋盘、点击下棋
- **根因**: CameraController、InputHandler 和 HUD 按钮未在开场动画期间禁用
- **修复**: 在 startGame() 开场动画期间禁用所有交互，动画完成后启用

## 代码变更

### 新增接口
- `GameStateData.playerOrder: Order` - 玩家的先后手选择

### 新增方法
- `GameState.getPlayerOrder(): Order` - 获取玩家的先后手选择
- `GameController.getPlayerOrder(): Order` - 获取玩家的先后手选择
- `CameraController.setEnabled(enabled: boolean)` - 禁用/启用相机旋转/缩放
- `CameraController.isEnabled(): boolean` - 检查是否启用
- `GameUI.setButtonsEnabled(enabled: boolean)` - 禁用/启用HUD按钮

### 修改方法
- `GameState.restart()` - 同时保存/恢复 `difficulty` 和 `playerOrder`
- `GameState.determineOrder()` - 保存 `order` 到 `playerOrder`
- `GameState.setOrder()` - 保存 `order` 到 `playerOrder`
- `main.restart()` - 使用保存的 `order` 而非 `'RANDOM'`
- `main.startGame()` - 开场动画期间禁用/启用交互

## 运行环境
- Node.js 版本: 18+
- 构建命令: `npm run build`
- 测试命令: `npm run test`
- 启动命令: `npm run dev`（端口3000）

## 验证方法

### 问题1验证步骤
1. 启动游戏，选择难度（如"中等"）
2. 选择"先手"开始游戏
3. 完成一局游戏
4. 点击"再来一局"
5. **验证点**: 再次开始时，应该仍是"先手（黑棋）"，不是随机结果
6. 多次点击"再来一局"，验证每次都是相同顺序

### 问题2验证步骤
1. 启动游戏，选择难度和顺序
2. 点击"开始游戏"
3. **验证点1**: 显示"先手/后手"提示期间（约2秒）：
   - 右键拖拽不应旋转视角
   - 滚轮不应缩放
   - 点击棋盘不应放置棋子
   - HUD"返回菜单"按钮不应响应点击
4. **验证点2**: 动画结束后（提示消失）：
   - 如果玩家先手，可以正常下棋
   - 右键可旋转视角
   - 滚轮可缩放
   - HUD按钮可点击

### 测试用例矩阵

| 场景 | 操作 | 预期结果 |
|------|------|----------|
| 再来一局(先手) | 选择先手→再来一局 | 仍是先手 |
| 再来一局(后手) | 选择后手→再来一局 | 仍是后手 |
| 再来一局(随机) | 选择随机→再来一局 | 每次重新随机 |
| 开场动画期间 | 右键拖拽 | 无响应 |
| 开场动画期间 | 滚轮缩放 | 无响应 |
| 开场动画期间 | 点击棋盘 | 无响应 |
| 开场动画期间 | 点击返回菜单 | 无响应 |
| 动画完成后 | 所有操作 | 正常响应 |

## 失败排查

### 如果"再来一局"仍然随机
- 检查 `GameState.restart()` 日志：应显示保存和恢复的 order
- 检查 `main.restart()` 日志：应显示传递的 order 参数

### 如果开场动画期间仍可操作
- 检查 `CameraController.setEnabled(false)` 是否被调用
- 检查 `inputHandler?.disable()` 是否被调用
- 检查 `gameUI?.setButtonsEnabled(false)` 是否被调用

## 测试结果

- [x] TypeScript 编译通过
- [x] Vite 构建成功
- [x] 核心逻辑测试通过（70/70）
- [ ] 手动验证（待QA）