# AI评估系统重构 - 测试交接文档

## 文档信息
- **版本号**: v1.0
- **创建日期**: 2026-04-24
- **作者**: Dev Agent
- **交接目标**: 🧪 QA Agent
- **前置依赖文档**:
  - `docs/architecture/ai-evaluation-refactor-design.md` v2.0
  - `docs/architecture/architecture.md` v1.3

---

## 一、变更概述

### 1.1 重构内容
AI评估系统从简单搜索深度+失误率模式，重构为**分层评估架构**：

```
难度 = 搜索深度 + 失误率 + 能力开放度
- EASY: 简化威胁检测 + 可关键失误
- MEDIUM: 完整威胁检测 + 关键时刻不失误
- HARD: 完整检测 + Minimax搜索 + 不失误
```

### 1.2 解决的问题
| 问题 | 解决方案 |
|------|----------|
| AI三连不去接第四步 | 分层评估优先检测立即获胜 |
| 用户两连AI不来堵 | 防守权重翻倍（THREE_BLOCK=300 > THREE_OWN=150） |
| EASY过难 | EASY只检测readyEnds>0的威胁，且关键时刻可能失误 |

---

## 二、运行环境

### 2.1 基本环境
- **Node.js版本**: v18+ (推荐v22)
- **依赖安装**: `npm install`
- **构建命令**: `npm run build`
- **测试命令**: `npm run test`

### 2.2 测试限制说明
- AIPlayer测试依赖浏览器API（`window.requestIdleCallback`）
- StatsStore测试依赖浏览器API（`localStorage`）
- **核心逻辑测试可在Node.js运行**: Board, WinChecker, LineIndex, GameState

---

## 三、代码变更清单

### 3.1 修改文件
| 文件 | 变更内容 |
|------|----------|
| `src/config/aiConfig.ts` | 新增分层配置 `DIFFICULTY_CONFIGS`、评分常量 `EVAL_SCORES` |
| `src/types/index.ts` | 新增接口 `EvaluationLayerConfig`、`DifficultyConfig`、`LineRecord` |
| `src/core/LineIndex.ts` | 导出 `LineRecord` 类型、新增 `getLineRecord()` 方法 |
| `src/core/Board.ts` | 新增 `getLineIdsAtPosition()`、`getLineRecord()` 委托方法 |
| `src/core/AIPlayer.ts` | 完整重构：`layeredEvaluate()`、`evaluateLayer1()`、`evaluateLayer2()` |

---

## 四、验证方法

### 4.1 构建验证
```bash
npm run build
# 预期输出：编译成功，无错误
```

### 4.2 核心逻辑测试
```bash
npm run test -- src/core/Board.test.ts src/core/WinChecker.test.ts src/core/LineIndex.test.ts src/core/GameState.test.ts
# 预期输出：52 tests passed
```

### 4.3 手动验证（浏览器运行）

#### 验证场景1：AI立即获胜
```javascript
// 在浏览器控制台执行
const game = window.game;
// 观察AI是否能立即完成4连获胜
// 预期：AI选择获胜位置（score=10000）
```

#### 验证场景2：EASY不防守立体威胁
```javascript
// 设置EASY难度，让用户形成向上方向的3连威胁
// 预期：EASY可能不立即防守（因为readyEnds=0）
// 对比MEDIUM/HARD：应该立即防守
```

#### 验证场景3：防守优先进攻
```javascript
// 用户形成2连威胁，AI同时有3连机会
// 预期：MEDIUM/HARD优先防守用户威胁（THREE_BLOCK=300 > THREE_OWN=150）
```

#### 验证场景4：EASY关键时刻失误
```javascript
// 设置EASY难度，用户即将获胜，AI有获胜机会
// 预期：约30%概率AI选择次优（不阻挡/不获胜）
// 对比MEDIUM/HARD：100%选择获胜/阻挡
```

---

## 五、评分规则说明

### 5.1 新评分常量
| 威胁类型 | 己方分数 | 对方分数 | 说明 |
|----------|----------|----------|------|
| 立即获胜 | WIN=10000 | BLOCK_WIN=5000 | 最高优先级 |
| 3连威胁 | THREE_OWN=150 | THREE_BLOCK=300 | 防守优先 |
| 双威胁 | DOUBLE_OWN=500 | DOUBLE_BLOCK=1000 | 极高优先级 |
| 2连威胁 | TWO_OWN=20 | TWO_BLOCK=40 | 防守优先 |

### 5.2 防守优先原则
**对方威胁分数 = 己方进攻分数 × 2**

原因：
- 不防守 → 对方下一步获胜 → 游戏结束
- 进攻但对方防守 → 双方继续博弈

---

## 六、难度配置矩阵

| 配置项 | EASY | MEDIUM | HARD |
|--------|------|--------|------|
| 搜索深度 | 1 | 2 | 4 |
| 失误率 | 30% | 10% | 0% |
| Layer 0（立即胜负） | ✓ | ✓ | ✓ |
| Layer 1（3连威胁） | ✓简化 | ✓完整 | ✓完整 |
| Layer 2（双威胁+2连） | ✗ | ✓ | ✓ |
| Layer 3（Minimax） | ✗ | ✗ | ✓ |
| 关键时刻不失误 | ✗ | ✓ | ✓ |

### 6.1 EASY简化规则
- 只检测 `readyEnds > 0` 的威胁（可立即下）
- 不检测需等待下层的立体向上威胁

---

## 七、常见问题排查

### 问题1：AI仍然不防守某些威胁
- 检查威胁是否 `readyEnds > 0`（EASY只检测可立即下）
- 检查是否在关键时刻（WIN/BLOCK_WIN）EASY可能失误

### 问题2：AI决策时间过长
- HARD深度=4可能较慢，已使用 `requestIdleCallback` 非阻塞
- 检查浏览器控制台是否有 `[AI Debug]` 日志输出

### 问题3：分数不符合预期
- 检查 `[AI Debug]` 日志中的 Layer分数
- Layer1+Layer2分数可能叠加，检查总分计算

---

## 八、交接确认

- [x] 构建成功（`npm run build`）
- [x] 核心逻辑测试通过（52 tests）
- [ ] 手动验证待QA确认（需浏览器环境）
- [ ] 集成测试待QA执行

---

**文档版本**: v1.0
**最后更新**: 2026-04-24