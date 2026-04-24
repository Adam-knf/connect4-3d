# AI评估系统重构设计文档 v2.0

## 基本信息
- **项目名称**：3D四子棋 AI评估系统重构
- **架构师**：Architect Agent
- **文档版本**：v2.0
- **创建日期**：2026-04-24
- **交接目标**：💻 Dev Agent
- **前置依赖**：architecture.md v1.3, ADR-011

---

## 一、问题诊断

### 1.1 用户反馈问题

| 问题 | 现象 | 根因分析 |
|------|------|----------|
| **AI三连不去接第四步** | AI已形成3连，却不下第4步获胜 | `quickWouldWinFast` 返回 WIN=10000，但可能被Alpha-Beta剪枝或候选排序问题 |
| **用户两连AI不来堵** | 用户形成2连威胁，AI不防守 | 2连评分过低，AI优先进攻 |
| **不识别"两条2连"威胁** | 黑3形成两条2连，评分=40分太低 | 两条2连=潜在双威胁，应该给300分 |
| **EASY太简单** | 当前EASY几乎不防守 | 配置过于宽松 |

### 1.2 难度配置调整方案

**用户反馈：**
- 当前EASY太简单 → 应该用当前MEDIUM配置
- 当前MEDIUM才是合理的"简单"难度
- 当前HARD才是合理的"中等"难度
- 需要新增真正的"困难"难度

**调整方案：**

| 当前配置 | 新配置 | 说明 |
|----------|--------|------|
| EASY (depth=1, 30%失误) | 废弃 | 太简单 |
| MEDIUM (depth=2, 10%失误) | **新EASY** | 合理的简单难度 |
| HARD (depth=4, 0%失误) | **新MEDIUM** | 合理的中等难度 |
| 新设计 | **新HARD** | 真正的困难难度 |

---

## 二、评分系统完整设计

### 2.1 评分层级总表

```
┌─────────────────────────────────────────────────────────────┐
│ 评分系统层级设计                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  层级0: 立即胜负                                             │
│  ─────────────────────────────────────────────────────     │
│  WIN               10000    立即获胜                         │
│  BLOCK_WIN          5000    阻挡对方获胜                     │
│                                                             │
│  层级1: 双威胁                                               │
│  ─────────────────────────────────────────────────────     │
│  DOUBLE_THREAT_BLOCK  1000    对方双3连威胁（必败风险）       │
│  POTENTIAL_DOUBLE_BLOCK 600   对方两条2连（潜在双威胁）       │
│  DOUBLE_THREAT_OWN     500    己方双3连威胁（必胜机会）       │
│  POTENTIAL_DOUBLE_OWN  300    己方两条2连（潜在必胜）         │
│                                                             │
│  层级2: 单条威胁                                             │
│  ─────────────────────────────────────────────────────     │
│  THREE_BLOCK          300    对方单条3连                     │
│  THREE_OWN            150    己方单条3连                     │
│  TWO_BLOCK             40    对方单条2连                     │
│  TWO_OWN               20    己方单条2连                     │
│                                                             │
│  层级3: 战略价值                                             │
│  ─────────────────────────────────────────────────────     │
│  CENTER_BONUS           2    中心位置                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 评分设计原则

```
┌─────────────────────────────────────────────────────────────┐
│ 评分设计原则                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  原则1: 防守优先                                             │
│  ─────────────────────                                      │
│  对方威胁分数 = 己方进攻分数 × 2                             │
│                                                             │
│  为什么？                                                    │
│  - 不防守 → 对方下一步获胜 → 游戏结束                        │
│  - 进攻但对方防守 → 双方继续博弈                             │
│                                                             │
│  示例：                                                      │
│  THREE_OWN = 150 → THREE_BLOCK = 300                        │
│  TWO_OWN = 20 → TWO_BLOCK = 40                              │
│                                                             │
│  原则2: 双威胁高分                                           │
│  ─────────────────────                                      │
│  双威胁 = 必胜/必败机会，分数远高于单条威胁                   │
│                                                             │
│  DOUBLE_THREAT_OWN = 500                                    │
│  DOUBLE_THREAT_BLOCK = 1000                                 │
│                                                             │
│  原则3: "两条2连"=潜在双威胁                                  │
│  ─────────────────────                                      │
│  两条2连 ≠ 两个独立2连                                       │
│                                                             │
│  两条2连意味着：                                             │
│  - 再下一颗棋子就能形成真正的双3连威胁                       │
│  - 这是"潜在必胜机会"                                       │
│                                                             │
│  因此：                                                      │
│  POTENTIAL_DOUBLE_OWN = 300（接近双3连威胁的500）            │
│  POTENTIAL_DOUBLE_BLOCK = 600                               │
│                                                             │
│  对比：                                                      │
│  - 单条2连 = 20（低分，对方一步可堵）                        │
│  - 两条2连 = 300（高分，下一颗就成双3连）                    │
│                                                             │
│  原则4: 层级递进                                             │
│  ─────────────────────                                      │
│  WIN > 双威胁 > 单条威胁 > 战略价值                          │
│                                                             │
│  分数差距足够大，确保高层级威胁不会被低层级覆盖               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 "两条2连"威胁详解

```
┌─────────────────────────────────────────────────────────────┐
│ "两条2连"威胁分析                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  实战案例：                                                  │
│  ─────────────────────                                      │
│  黑1(2,2,0) - 中心位置                                       │
│  白1(1,2,0) - 错误！堵错了方向                               │
│  黑2(3,1,0) - XY反对角线                                     │
│                                                             │
│  黑3(1,1,0)时的局面：                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  XY对角线：(1,1,0)-(2,2,0)-(3,3,0)-(4,4,0)          │   │
│  │  黑棋：(1,1,0), (2,2,0) = 2连                       │   │
│  │                                                     │   │
│  │  XY反对角线：(0,4,0)-(1,3,0)-(2,2,0)-(3,1,0)-(4,0,0)│   │
│  │  黑棋：(2,2,0), (3,1,0) = 2连                       │   │
│  │                                                     │   │
│  │  关键点：(2,2,0) 是两条对角线的交点                  │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  当前评分（错误）：                                          │
│  ─────────────────────                                      │
│  aiTwoLines = 2                                             │
│  score = 2 × TWO_OWN = 2 × 20 = 40分                        │
│                                                             │
│  问题：40分太低！被其他候选位置覆盖                          │
│                                                             │
│  正确评分：                                                  │
│  ─────────────────────                                      │
│  aiTwoLines >= 2 → POTENTIAL_DOUBLE_OWN = 300分             │
│                                                             │
│  为什么300分？                                               │
│  ─────────────────────                                      │
│  黑3两条2连 → 黑4下(1,3,0)或(3,3,0) → 形成双3连威胁          │
│                                                             │
│  黑4(1,3,0)：                                               │
│  XY反对角线：(1,3,0)-(2,2,0)-(3,1,0) = 3连                  │
│  XY对角线：(1,1,0)-(2,2,0) = 2连                            │
│                                                             │
│  或黑4(3,3,0)：                                              │
│  XY对角线：(1,1,0)-(2,2,0)-(3,3,0) = 3连                    │
│  XY反对角线：(2,2,0)-(3,1,0) = 2连                          │
│                                                             │
│  白4只能堵一条 → 黑5赢另一条                                 │
│                                                             │
│  结论：两条2连 = 下一颗棋子必成双威胁 = 潜在必胜             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.4 评分对比表

| 威胁类型 | 分数 | 说明 | 变化 |
|----------|------|------|------|
| WIN | 10000 | 立即获胜 | 不变 |
| BLOCK_WIN | 5000 | 阻挡对方获胜 | 不变 |
| DOUBLE_THREAT_BLOCK | 1000 | 对方双3连威胁 | 不变 |
| **POTENTIAL_DOUBLE_BLOCK** | **600** | 对方两条2连 | **新增** |
| DOUBLE_THREAT_OWN | 500 | 己方双3连威胁 | 不变 |
| **POTENTIAL_DOUBLE_OWN** | **300** | 己方两条2连 | **新增** |
| THREE_BLOCK | 300 | 对方单条3连 | 不变 |
| THREE_OWN | 150 | 己方单条3连 | 不变 |
| TWO_BLOCK | 40 | 对方单条2连 | 不变 |
| TWO_OWN | 20 | 己方单条2连 | 不变 |

---

## 三、难度配置矩阵

### 3.1 配置总表

| 配置项 | EASY（简单） | MEDIUM（中等） | HARD（困难） |
|--------|-------------|---------------|-------------|
| **搜索深度** | 2 | 4 | 4 |
| **失误率** | 10% | 0% | 0% |
| **Layer 0（立即胜负）** | ✓ | ✓ | ✓ |
| **Layer 1（3连威胁）** | ✓完整 | ✓完整 | ✓完整 |
| **Layer 2（双威胁+2连）** | ✓基础版 | ✓完整 | ✓增强版 |
| **"两条2连"识别** | ✓ | ✓ | ✓高分 |
| **关键时刻不失误** | ✓ | ✓ | ✓ |
| **预期玩家胜率** | 70% | 50% | 30% |

### 3.2 Layer 2 差异化

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 2（双威胁检测）差异化                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  EASY（基础版）：                                            │
│  ─────────────────────                                      │
│  - 检测双3连威胁（DOUBLE_THREAT）                            │
│  - 检测两条2连（POTENTIAL_DOUBLE = 300）                     │
│  - 检测单条2连                                               │
│  - 10%失误率                                                │
│                                                             │
│  MEDIUM（完整版）：                                          │
│  ─────────────────────                                      │
│  - 同EASY                                                   │
│  - 无失误                                                   │
│                                                             │
│  HARD（增强版）：                                            │
│  ─────────────────────                                      │
│  - 搜索深度保持4层（足够看到黑3两条2连）                      │
│  - 两条2连高分（300/600）                                    │
│  - 无失误                                                   │
│                                                             │
│  HARD的核心改进是评分系统，而非增加搜索深度                   │
│  ─────────────────────────────────────────────────────     │
│  为什么depth=4就够了？                                       │
│  黑2 → 白2 → 黑3 → 黑3评分时两条2连=300分                    │
│  这个高分足以让Alpha-Beta不剪掉正确路线                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 四、核心评估算法

### 4.1 分层评估流程

```
┌─────────────────────────────────────────────────────────────┐
│ 分层评估流程                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  输入: board, pos, config                                    │
│  输出: score                                                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Step 1: Layer 0 - 立即胜负检测                      │   │
│  │                                                     │   │
│  │ if (quickWouldWinFast(pos, AI)):                   │   │
│  │   return WIN = 10000                               │   │
│  │                                                     │   │
│  │ if (quickWouldWinFast(pos, OPPONENT)):             │   │
│  │   return BLOCK_WIN = 5000                          │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                         ↓                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Step 2: Layer 1 - 基础威胁检测                      │   │
│  │                                                     │   │
│  │ 遍历该位置涉及的威胁线：                             │   │
│  │ for lineId in getLineIdsAtPosition(pos):           │   │
│  │   统计3连威胁线数量                                  │   │
│  │   统计2连威胁线数量                                  │   │
│  │                                                     │   │
│  │ 评分：                                              │   │
│  │ THREE_BLOCK = 300 × 对方3连数量                     │   │
│  │ THREE_OWN = 150 × 己方3连数量                       │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                         ↓                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Step 3: Layer 2 - 进阶威胁检测                      │   │
│  │                                                     │   │
│  │ ===== 双3连威胁 =====                               │   │
│  │ if (己方3连威胁线 >= 2):                            │   │
│  │   score += DOUBLE_THREAT_OWN = 500                 │   │
│  │                                                     │   │
│  │ if (对方3连威胁线 >= 2):                            │   │
│  │   score += DOUBLE_THREAT_BLOCK = 1000              │   │
│  │                                                     │   │
│  │ ===== 两条2连 = 潜在双威胁（新增）=====              │   │
│  │ if (己方2连威胁线 >= 2):                            │   │
│  │   score += POTENTIAL_DOUBLE_OWN = 300              │   │
│  │ else:                                              │   │
│  │   score += 己方2连数量 × TWO_OWN = 20               │   │
│  │                                                     │   │
│  │ if (对方2连威胁线 >= 2):                            │   │
│  │   score += POTENTIAL_DOUBLE_BLOCK = 600            │   │
│  │ else:                                              │   │
│  │   score += 对方2连数量 × TWO_BLOCK = 40             │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                         ↓                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Step 4: Layer 3 - 深度搜索（仅HARD）                 │   │
│  │                                                     │   │
│  │ if (config.enableMinimax && depth > 1):            │   │
│  │   模拟放置棋子                                       │   │
│  │   执行Minimax搜索                                    │   │
│  │                                                     │   │
│  │ else:                                              │   │
│  │   返回Layer 1+2的分数                               │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  返回: score                                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 两条2连评分逻辑

```typescript
/**
 * Layer 2: 进阶威胁评估
 * 包含双3连威胁 + "两条2连"潜在双威胁
 */
private evaluateAdvancedThreat(board: Board, pos: Position): number {
  const lineIds = board.getLineIdsAtPosition(pos);

  // 统计威胁线数量
  let aiThreeLines = 0;
  let oppThreeLines = 0;
  let aiTwoLines = 0;
  let oppTwoLines = 0;

  for (const lineId of lineIds) {
    const line = board.getLineRecord(lineId);
    const aiCount = this.aiPiece === 'BLACK' ? line.blackCount : line.whiteCount;
    const oppCount = this.aiPiece === 'BLACK' ? line.whiteCount : line.blackCount;

    // 3连威胁线
    if (aiCount === 3 && oppCount === 0 && line.openEnds > 0) aiThreeLines++;
    if (aiCount === 0 && oppCount === 3 && line.openEnds > 0) oppThreeLines++;

    // 2连威胁线
    if (aiCount === 2 && oppCount === 0 && line.openEnds > 0) aiTwoLines++;
    if (aiCount === 0 && oppCount === 2 && line.openEnds > 0) oppTwoLines++;
  }

  let score = 0;

  // ===== 双3连威胁 =====
  if (aiThreeLines >= 2) {
    score += EVAL_SCORES.DOUBLE_THREAT_OWN;      // 500
  }
  if (oppThreeLines >= 2) {
    score += EVAL_SCORES.DOUBLE_THREAT_BLOCK;    // 1000
  }

  // ===== 两条2连 = 潜在双威胁（新增逻辑）=====
  if (aiTwoLines >= 2) {
    score += EVAL_SCORES.POTENTIAL_DOUBLE_OWN;   // 300
  } else {
    score += aiTwoLines * EVAL_SCORES.TWO_OWN;   // 0或20
  }

  if (oppTwoLines >= 2) {
    score += EVAL_SCORES.POTENTIAL_DOUBLE_BLOCK; // 600
  } else {
    score += oppTwoLines * EVAL_SCORES.TWO_BLOCK; // 0或40
  }

  return score;
}
```

---

## 五、技术实现规格

### 5.1 aiConfig.ts 修改

```typescript
// src/config/aiConfig.ts

/**
 * 评分常量（完整版）
 */
export const EVAL_SCORES = {
  // Layer 0: 立即胜负
  WIN: 10000,
  BLOCK_WIN: 5000,

  // Layer 1: 3连威胁
  THREE_OWN: 150,
  THREE_BLOCK: 300,    // = 150 × 2

  // Layer 2: 双威胁
  DOUBLE_THREAT_OWN: 500,
  DOUBLE_THREAT_BLOCK: 1000,  // = 500 × 2

  // Layer 2: 两条2连 = 潜在双威胁（新增）
  POTENTIAL_DOUBLE_OWN: 300,
  POTENTIAL_DOUBLE_BLOCK: 600,  // = 300 × 2

  // Layer 2: 单条2连
  TWO_OWN: 20,
  TWO_BLOCK: 40,     // = 20 × 2

  // Layer 3: 战略价值
  CENTER_BONUS: 2,
};

/**
 * 难度配置（调整后）
 */
export const AI_CONFIGS: Record<Difficulty, AIConfig> = {
  EASY: {
    depth: 2,          // 原MEDIUM
    mistakeRate: 0.1,  // 原MEDIUM
  },
  MEDIUM: {
    depth: 4,          // 原HARD
    mistakeRate: 0,
  },
  HARD: {
    depth: 4,          // 保持4层，改进评分系统即可
    mistakeRate: 0,
  },
};
```

### 5.2 AIPlayer.ts 修改位置

| 修改位置 | 当前代码 | 改为 |
|----------|----------|------|
| 第340行 | `score += aiTwoLines * EVAL_SCORES.TWO_OWN` | 两条2连判断逻辑 |
| 第341行 | `score += oppTwoLines * EVAL_SCORES.TWO_BLOCK` | 两条2连判断逻辑 |

### 5.3 需新增的方法

无需新增方法，只需修改 `evaluateAdvancedThreat()` 内部的2连评分逻辑。

---

## 六、测试验证

### 6.1 测试案例

| 测试项 | 测试方法 | 验收标准 |
|--------|----------|----------|
| **两条2连高分** | 黑1(2,2,0)，白1(1,2,0)，黑2应选(3,1,0) | AI选择正确的对角线位置 |
| **双3连检测** | 形成双3连威胁局面 | score=500或1000 |
| **防守优先** | 对方形成两条2连 | score=600，高于己方进攻 |
| **单条2连低分** | 单条2连威胁 | score=20或40 |

### 6.2 预期效果

```
┌─────────────────────────────────────────────────────────────┐
│ 预期改进效果                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  问题1: 不识别两条2连                                        │
│  ─────────────────────                                      │
│  改前：两条2连 = 40分                                        │
│  改后：两条2连 = 300分                                       │
│  效果：AI能正确识别潜在双威胁机会                            │
│                                                             │
│  问题2: 防守优先                                             │
│  ─────────────────────                                      │
│  改前：对方两条2连 = 80分                                    │
│  改后：对方两条2连 = 600分                                   │
│  效果：AI优先防守而非进攻                                    │
│                                                             │
│  问题3: 难度命名                                             │
│  ─────────────────────                                      │
│  新EASY = 原MEDIUM配置                                       │
│  新MEDIUM = 原HARD配置                                       │
│  效果：难度命名匹配玩家预期                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 七、ADR 决策记录

### ADR-012：评分系统改进

**状态**：建议采纳

**问题**：两条2连评分过低（40分），导致AI不识别潜在双威胁机会

**决策**：新增 `POTENTIAL_DOUBLE_OWN/BLOCK` 常量，两条2连给300/600分

**理由**：
1. 两条2连 ≠ 两个独立2连
2. 两条2连 = 下一颗棋子必成双3连威胁
3. 应给予接近双3连威胁的分数

---

### ADR-013：难度配置调整

**状态**：建议采纳

**问题**：当前难度命名不符合玩家预期

**决策**：
- 新EASY = 原MEDIUM配置
- 新MEDIUM = 原HARD配置
- 新HARD = 深度4层 + 评分系统升级（两条2连高分）

**理由**：
- 原EASY太简单，几乎没有挑战
- 难度命名应匹配玩家实际体验
- HARD核心改进是评分而非搜索深度

---

## 文档状态

- [x] 问题诊断完成
- [x] 评分系统完整设计
- [x] "两条2连"威胁分析
- [x] 难度配置调整完成
- [x] 核心评估算法设计
- [x] 技术实现规格
- [ ] 已移交给 Dev Agent

---

## 八、v3.0 架构升级：潜在叉子检测

### 8.1 问题回顾

**根本问题**：白1评估时，无法预见黑3会形成潜在叉子威胁。

```
黑1(2,2,0) - 中心位置，多条线交汇点
白1(1,2,0) - 错误！未识别黑棋的潜在叉子
黑2(3,1,0) - XY反对角线2连
黑3(1,1,0) - 形成两条2连（潜在叉子）
黑4 - 形成2连+3连组合威胁 → 白棋必败
```

**为什么depth=4不够？**
- 白1 → 黑2 → 白2 → 黑3 → 白3 → 黑4（需要depth=6）
- depth=6性能无法接受

**解决方案**：不增加搜索深度，而是在静态评估时识别"潜在叉子"模式。

---

### 8.2 潜在叉子定义

**潜在叉子（Potential Fork）**：一个位置是多条"有潜力的线"的交汇点。

**"有潜力的线"条件**：
1. 无对方棋子（`oppCount=0`）
2. 有己方棋子（`playerCount >= 1`）
3. 有开放端（`openEnds > 0`）
4. **棋子连续**（无间隔）← 关键！

**为什么要求连续？**
- `[黑,空,黑,空]` 虽然 `blackCount=2`，但中间有空隙，不是真正的2连威胁
- `[黑,黑,空,空]` 才是连续的2连，有发展潜力

---

### 8.3 评估层级扩展

```
┌─────────────────────────────────────────────────────────────┐
│ v3.0 评估层级                                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Layer 0: 立即胜负        [所有难度]                         │
│  Layer 1: 3连威胁（局部） [所有难度]                         │
│  Layer 2: 双威胁+2连（局部）[所有难度]                       │
│  Layer 3: 潜在叉子（全局）[MEDIUM+HARD]  ← 新增              │
│  Layer 4: Minimax搜索    [MEDIUM+HARD]                      │
│  Layer 5: 位置价值       [所有难度]                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 8.4 Layer 3 评分设计

```typescript
// Layer 3: 潜在叉子评分
FORK_BASE: 150,              // 基础叉子分（2线交汇）
FORK_PER_LINE: 100,          // 每多一条线加分
FORK_WITH_TWO: 250,          // 叉子中有2连时的额外加分
FORK_DEFENSE_MULTIPLIER: 2,  // 防守叉子的分数倍率
```

**评分公式**：
```
叉子分数 = FORK_BASE + FORK_PER_LINE × (线数 - 2)
如果叉子中有2连：叉子分数 += FORK_WITH_TWO
对方叉子：叉子分数 × FORK_DEFENSE_MULTIPLIER
```

**示例**：
- 黑棋在 `(2,2,0)` 有3条有潜力的线交汇，其中1条是2连
- 叉子分数 = 150 + 100×(3-2) + 250 = 500
- 白棋防守分数 = 500 × 2 = **1000分**

---

### 8.5 难度配置调整

```typescript
export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  EASY: {
    depth: 2,
    mistakeRate: 0.1,
    layers: {
      enableLayer0_ImmediateWin: true,
      enableLayer1_BasicThreat: true,
      enableLayer2_AdvancedThreat: true,
      enableLayer3_PotentialFork: false,  // ← 不启用
      enableLayer4_Minimax: false,
      enableLayer5_Position: true,
    },
    criticalNoMistake: true,
  },

  MEDIUM: {
    depth: 3,
    mistakeRate: 0,
    layers: {
      enableLayer0_ImmediateWin: true,
      enableLayer1_BasicThreat: true,
      enableLayer2_AdvancedThreat: true,
      enableLayer3_PotentialFork: true,   // ← 启用
      enableLayer4_Minimax: true,
      enableLayer5_Position: true,
    },
    criticalNoMistake: true,
  },

  HARD: {
    depth: 4,
    mistakeRate: 0,
    layers: {
      enableLayer0_ImmediateWin: true,
      enableLayer1_BasicThreat: true,
      enableLayer2_AdvancedThreat: true,
      enableLayer3_PotentialFork: true,   // ← 启用
      enableLayer4_Minimax: true,
      enableLayer5_Position: true,
    },
    forkScoreMultiplier: 1.5,  // HARD特有：叉子分数×1.5
    criticalNoMistake: true,
  },
};
```

---

### 8.6 核心算法（v3.0 初始设计）

**注意**：此版本已在 v3.1 中改进，见第九章。

```typescript
/**
 * Layer 3: 潜在叉子检测（全局扫描）
 * v3.0 初始实现（已在 v3.1 改进）
 */
private evaluateLayer3_PotentialFork(board: Board): number {
  // 缓存优化
  const boardKey = `${board.getPieceCount()}_${board.getEvaluationScore(this.aiPiece)}`;
  if (this.forkScoreCache.has(boardKey)) {
    return this.forkScoreCache.get(boardKey)!;
  }

  // 增量更新：只扫描有棋子的线
  const allLines = board.getAllLineRecords();
  const relevantLines = allLines.filter(line => 
    line.positions.some(pos => board.getPiece(pos) !== 'EMPTY')
  );
  
  // 位置 → 潜力统计
  const positionStats = new Map<string, {
    aiPotentialLines: number;
    oppPotentialLines: number;
    aiMaxCount: number;
    oppMaxCount: number;
    aiHasTwo: boolean;
    oppHasTwo: boolean;
    aiDiscount: number;    // v3.1 新增
    oppDiscount: number;   // v3.1 新增
  }>();

  // 遍历受影响的4连线
  for (const line of relevantLines) {
    const aiCount = this.aiPiece === 'BLACK' ? line.blackCount : line.whiteCount;
    const oppCount = this.aiPiece === 'BLACK' ? line.whiteCount : line.blackCount;

    // 己方有潜力的线
    if (oppCount === 0 && aiCount >= 1 && line.openEnds > 0) {
      if (this.isConsecutive(board, line, this.aiPiece)) {
        const discount = this.calculateLineDiscount(board, line);  // v3.1 新增
        this.updatePositionStats(positionStats, line.positions, 'ai', aiCount, board, discount);
      }
    }

    // 对方有潜力的线
    if (aiCount === 0 && oppCount >= 1 && line.openEnds > 0) {
      if (this.isConsecutive(board, line, this.opponentPiece)) {
        const discount = this.calculateLineDiscount(board, line);  // v3.1 新增
        this.updatePositionStats(positionStats, line.positions, 'opp', oppCount, board, discount);
      }
    }
  }

  // 计算叉子分数（v3.1 改为取最大值）
  let maxOppForkScore = 0;
  let maxAiForkScore = 0;
  const multiplier = this.config.forkScoreMultiplier || 1.0;

  for (const stats of positionStats.values()) {
    // 对方潜在叉子（防守优先）
    if (stats.oppPotentialLines >= 2) {
      let forkScore = EVAL_SCORES.FORK_BASE;
      forkScore += EVAL_SCORES.FORK_PER_LINE * (stats.oppPotentialLines - 2);
      if (stats.oppHasTwo) {
        forkScore += EVAL_SCORES.FORK_WITH_TWO;
      }
      const discountedScore = forkScore * EVAL_SCORES.FORK_DEFENSE_MULTIPLIER * multiplier * stats.oppDiscount;
      maxOppForkScore = Math.max(maxOppForkScore, discountedScore);
    }

    // 己方潜在叉子
    if (stats.aiPotentialLines >= 2) {
      let forkScore = EVAL_SCORES.FORK_BASE;
      forkScore += EVAL_SCORES.FORK_PER_LINE * (stats.aiPotentialLines - 2);
      if (stats.aiHasTwo) {
        forkScore += EVAL_SCORES.FORK_WITH_TWO;
      }
      const discountedScore = forkScore * multiplier * stats.aiDiscount;
      maxAiForkScore = Math.max(maxAiForkScore, discountedScore);
    }
  }

  const score = maxAiForkScore - maxOppForkScore;
  this.forkScoreCache.set(boardKey, score);
  return score;
}

/**
 * 检查线上的棋子是否连续（无间隔）
 */
private isConsecutive(board: Board, line: LineRecord, player: Player): boolean {
  let state: 'before' | 'in' | 'after' = 'before';
  
  for (const pos of line.positions) {
    const piece = board.getPiece(pos);
    
    if (piece === player) {
      if (state === 'after') return false;  // 中间有空隙后又遇到棋子
      state = 'in';
    } else if (piece === 'EMPTY') {
      if (state === 'in') state = 'after';
    } else {
      return false;  // 对方棋子
    }
  }
  
  return true;
}
```

---

### 8.7 预期效果

| 场景 | v2.0行为 | v3.0行为 |
|------|----------|----------|
| 黑1(2,2,0)后白1评估 | 只看局部，未识别潜在叉子 | 识别(2,2,0)是多线交汇点，给高分防守 |
| 白1选择 | 可能选择(1,2,0)等无效位置 | 选择能破坏叉子的位置 |
| HARD难度 | depth=4，仍无法预见黑4威胁 | 通过潜在叉子检测，depth=4足够 |
| 性能 | - | Layer 3全局扫描，但只在MEDIUM/HARD启用 |

---

### 8.8 ADR-014：潜在叉子检测

**状态**：建议采纳

**问题**：depth=4无法预见黑4的2连+3连组合威胁，depth=6性能无法接受

**决策**：新增Layer 3潜在叉子检测，在静态评估时识别多线交汇的潜在威胁

**理由**：
1. 不增加搜索深度，保持性能
2. 通过模式识别弥补搜索深度不足
3. 只在MEDIUM/HARD启用，保持难度差异化
4. 连续性检查确保评估准确性

**权衡**：
- 优点：depth=4足够，性能可控
- 缺点：全局扫描增加计算量，需要优化

---

## 九、v3.1 架构修复：Layer 3 评估位置与折扣机制

### 9.1 问题发现

**v3.0 实现后发现的问题**：

1. **Minimax 忽略 Layer 1/2/3 分数**
   - 症状：AI 选择 `(3,1,0)` 而不是 `(1,2,0)`（两条2连威胁）
   - 原因：Minimax 返回时只返回 `minimaxScore`，Layer 1/2/3 被丢弃

2. **Layer 3 增量计算误导**
   - 症状：AI 选择 `(2,2,1)` 堆叠在对方棋子上
   - 原因：增量计算（`scoreAfter - scoreBefore`）误认为堆叠能"破坏"叉子

3. **Minimax 叶节点累加导致失去区分度**
   - 症状：所有候选位置分数都是大负数（-1655 到 -2367）
   - 原因：Layer 3 在叶节点累加，所有分支都被扣相同的大量分

### 9.2 修复方案

#### 9.2.1 Minimax 分数修复

```typescript
// 修复前
return minimaxScore;

// 修复后
const totalScore = minimaxScore + layer1Score + layer2Score + layer3Score;
return totalScore;
```

#### 9.2.2 Layer 3 评估位置调整

**关键决策**：Layer 3 只在**顶层候选评估**使用，不在 Minimax 叶节点。

```typescript
// layeredEvaluate 中
if (this.config.layers.enablePotentialFork) {
  // 模拟放置后评估叉子局势（绝对分数，非增量）
  const clonedBoard = board.clone();
  clonedBoard.setPiece(pos, this.aiPiece);
  layer3Score = this.evaluateLayer3_PotentialFork(clonedBoard);
}

// Minimax 叶节点
if (depth === 0) {
  // 不使用 Layer 3，避免所有分支都被扣大量分
  return board.getEvaluationScore(this.aiPiece);
}
```

#### 9.2.3 折扣机制：空位可下性检查

**问题**：线上有不可直接下的空位（z>0 且下方为空），潜力应该折扣。

**解决方案**：

```typescript
/**
 * 计算线的潜力折扣
 * 每个不可直接下的空位折半
 */
private calculateLineDiscount(board: Board, line: LineRecord): number {
  let unplayableCount = 0;
  
  for (const pos of line.positions) {
    const piece = board.getPiece(pos);
    if (piece !== 'EMPTY') continue;
    
    // 检查是否可直接下：z=0 或 下方有棋子
    if (pos.z > 0) {
      const belowPiece = board.getPiece({ x: pos.x, y: pos.y, z: pos.z - 1 });
      if (belowPiece === 'EMPTY') {
        unplayableCount++;
      }
    }
  }
  
  // 每个不可下的空位折半
  return Math.pow(0.5, unplayableCount);
}
```

**应用折扣**：

```typescript
// 遍历线时计算折扣
const discount = this.calculateLineDiscount(board, line);
this.updatePositionStats(positionStats, line.positions, 'ai', aiCount, board, discount);

// 叉子分数应用折扣
const discountedScore = forkScore * multiplier * stats.aiDiscount;
```

#### 9.2.4 叉子分数聚合方式

**修复前**：累加所有叉子位置的分数
```typescript
for (const stats of positionStats.values()) {
  score += forkScore;  // 累加
}
```

**修复后**：取最强叉子
```typescript
let maxAiForkScore = 0;
for (const stats of positionStats.values()) {
  maxAiForkScore = Math.max(maxAiForkScore, forkScore);  // 取最大值
}
const score = maxAiForkScore - maxOppForkScore;
```

#### 9.2.5 性能优化

**缓存机制**：
```typescript
private forkScoreCache = new Map<string, number>();

// 使用缓存
const boardKey = `${board.getPieceCount()}_${board.getEvaluationScore(this.aiPiece)}`;
if (this.forkScoreCache.has(boardKey)) {
  return this.forkScoreCache.get(boardKey)!;
}
```

**增量更新**：
```typescript
// 只扫描有棋子的位置涉及的线，而非全局扫描
const relevantLines = allLines.filter(line => 
  line.positions.some(pos => occupiedPositions.has(`${pos.x},${pos.y},${pos.z}`))
);
```

### 9.3 最终架构

```typescript
// 顶层候选评估
private layeredEvaluate(board: Board, pos: Position): number {
  // Layer 0: 立即胜负
  // Layer 1: 3连威胁
  // Layer 2: 双威胁+2连
  
  // Layer 3: 潜在叉子（评估放置后的局面）
  let layer3Score = 0;
  if (this.config.layers.enablePotentialFork) {
    const clonedBoard = board.clone();
    clonedBoard.setPiece(pos, this.aiPiece);
    layer3Score = this.evaluateLayer3_PotentialFork(clonedBoard);
  }
  
  // Layer 4: Minimax 搜索
  if (this.config.layers.enableMinimaxSearch && this.config.depth > 1) {
    const minimaxScore = this.minimax(...);
    return minimaxScore + layer1Score + layer2Score + layer3Score;
  }
  
  // 无 Minimax 时
  const staticScore = this.staticEvaluate(board, pos);
  return layer1Score + layer2Score + layer3Score + staticScore;
}
```

### 9.4 ADR-015：Layer 3 评估位置与折扣机制

**状态**：已采纳

**问题**：
1. Layer 3 增量计算误导 AI 堆叠
2. Minimax 叶节点累加导致失去区分度
3. 未考虑空位可下性，高估虚空叉子

**决策**：
1. Layer 3 只在顶层候选评估使用，评估放置后的绝对局势
2. 不在 Minimax 叶节点使用 Layer 3
3. 引入折扣机制：不可下空位越多，潜力越低
4. 叉子分数取最大值，而非累加

**理由**：
1. 顶层评估避免增量计算误导
2. 不在叶节点避免所有分支都被扣分
3. 折扣机制正确评估虚空叉子的实际威胁
4. 取最大值避免分数过高

**权衡**：
- 优点：修复了堆叠误判和分数失衡问题
- 缺点：Layer 3 计算量增加（需要为每个候选位置模拟放置）

---

**版本**：v3.1
**创建日期**：2026-04-24
**最后更新**：2026-04-25 01:16