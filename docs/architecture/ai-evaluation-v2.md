# AI 评估系统架构设计 v2.0

## 基本信息

| 项目 | 内容 |
|------|------|
| **文档版本** | v2.0 |
| **创建日期** | 2026-04-27 |
| **设计者** | Architect Agent |
| **交接目标** | Dev Agent |
| **前置依赖** | requirements.md v1.4, architecture.md v2.0, `src/types/index.ts` |
| **设计原则** | 基于五子棋成熟AI理论，完全重构评估架构 |

---

## 目录

1. [设计动机](#1-设计动机)
2. [五子棋AI理论映射](#2-五子棋ai理论映射)
3. [棋形分类学](#3-棋形分类学)
4. [系统架构](#4-系统架构)
5. [模块设计](#5-模块设计)
6. [分数体系](#6-分数体系)
7. [难度分级](#7-难度分级)
8. [搜索架构](#8-搜索架构)
9. [测试用例库](#9-测试用例库)
10. [集成方案](#10-集成方案)

---

## 1. 设计动机

### 1.1 现有方案根本性问题

v1 分层评估（AIPlayer.ts, 7个评估函数分散在 Layer0~4）存在：

| 问题 | 根因 | 后果 |
|------|------|------|
| 重复计分 | Layer1/Layer2 独立统计同一3连线 | 双3连得分 800（应为 500-600） |
| Layer3 被抑制 | `layer3Score *= 0.05` when Minimax enabled | MEDIUM/HARD 漏检复杂叉子 |
| 无 readiness 区分 | Layer1/2 只用 `openEnds>0` | 需等3步的威胁与立即可下的威胁等值 |
| 无方向权重 | 13方向线一律等价 | 垂直4步堆叠 vs 水平2步完成的威胁同分 |
| 分数无理论依据 | 凭感觉赋值 | 调参困难，行为不可预测 |

### 1.2 新方案设计目标

1. **可解释**：每种棋形有标准名称和明确分数
2. **可测试**：每种棋形有对应的测试布局
3. **五子棋理论支撑**：借鉴活/眠/冲/叉分类体系
4. **重力感知**：分数反映 readiness 和方向成本
5. **难度可分**：EASY/MEDIUM/HARD 通过搜索深度+失误率区分

---

## 2. 五子棋AI理论映射

### 2.1 经典概念在3D四子棋中的对应

我们借鉴五子棋AI的 **威胁分类 + 空间搜索** 框架，但定义完全独立的概念体系。

五子棋的棋形本质是对 **"连续子数 + 开放端数"** 的编码。我们将这个编码统一为 `T[Count]-[Openness][Readiness]` 格式：

| 棋形码 | 连续子数 | 开放端 | 就绪端 | 含义 |
|--------|---------|--------|--------|------|
| **WIN** | 4 | - | - | 四连获胜 |
| **T3-OR** | 3 | 2(Open) | 2(Ready) | 双端可下的3连 → 绝对必胜 |
| **T3-OP** | 3 | 2(Open) | 1(Partial) | 一端可下，一端等待 |
| **T3-OD** | 3 | 2(Open) | 0(Delayed) | 双端等待 |
| **T3-HR** | 3 | 1(Half) | 1(Ready) | 单端可下的3连 → 必须堵 |
| **T3-HD** | 3 | 1(Half) | 0(Delayed) | 单端等待的3连 |
| **T2-OR** | 2 | 2(Open) | 2(Ready) | 双端可下的2连 → 强力构建 |
| **T2-HR** | 2 | 1(Half) | 1(Ready) | 单端可下的2连 |
| ... | ... | ... | ... | 以此类推到 T2 级别 |

**五子棋术语仅作为理论参考**，代码中只使用上述棋形码，不使用"活三""眠三""冲四"等名称。

参考对应关系（仅供理解，不体现在代码中）：
| 五子棋概念 | 对应我们的棋形码 | 说明 |
|-----------|-----------------|------|
| 活四 | WIN | 两端开放四连 = 已获胜 |
| 冲四 | T3-HR | 一端开放三连 = 对手必堵 |
| 活三 | T2-OR | 双端可下二连 = 一子成T3-HR |
| 双活三 | CROSS-STRONG | 两颗 T2-OR 交汇于同一空位 |
| VCF | 连续 T3-HR 序列 | 连续迫使对手被动防守 |

### 2.2 三个需要特殊适配的差异

#### 差异1: 重力 → 引入 readiness

五子棋任意空位可下。3D四子棋高层空位需底层支撑。

**适配**：每个开放端标注 readiness：
- **READY (R)**: 可立即落子（z=0 或下方有子）
- **DELAYED (D)**: 需等待（下方为空）

威胁价值 = 基础分 × readiness 折扣。

#### 差异2: 13方向 → VERTICAL 单独降权

| 方向类别 | 方向 | 权重 | 理由 |
|----------|------|------|------|
| HORIZONTAL | (1,0,0), (0,1,0) | 1.0× | — |
| DIAGONAL | (1,±1,0) | 1.1× | 斜线棋子跨横竖两方向，连接度更高 |
| VERTICAL | (0,0,1) | 0.3× | 建线全在同一列，对手一次落子可打断整条线；且极其显眼 |
| SPATIAL | (±1,0,±1), (0,±1,±1) | 1.0× | readiness 已处理跨层成本 |
| SPATIAL_DIAG | (±1,±1,±1) | 1.1× | 空间斜线同时跨层+跨列，连接度最高 |

> 为什么 SPATIAL 不扣：跨层带来的铺垫成本已由 readiness 的 `e`(需等待) vs `E`(可立即下) 区分。T3-OR 即使跨层也说明两端已就绪，无需再打折。T3-OD 则无论什么方向都已经被打成 2000。方向权重不应与 readiness 重复计罚。

#### 差异3: 列放置 → cross点必须可下

五子棋 cross 可在任何空位。3D四子棋必须验证 cross 交汇点 `isPlayableAt()`。

---

## 3. 棋形分类学

### 3.1 命名规范

所有棋形遵循统一编码 `T[Count]-[Openness][Readiness]`：

代码中所有棋形遵循两类编码：

**T族 — 连续棋形**：`T[Count]-[Openness][Readiness]`
**G族 — 间隙棋形**：`G[Count]-[GapSize][Readiness]`

| 码位 | 含义 | 取值 |
|------|------|------|
| **Count** | 线上己方棋子总数 | `3`(一步胜), `2`(两步胜), `1`(三步胜) |
| **Openness** (T族) | 连续块开放端数量 | `O`(2端), `H`(1端), `C`(0端, 两端堵死=无价值, 见 BLK) |
| **GapSize** (G族) | 棋子之间的空位数 | `S1`(间隔1空), `S2`(间隔2空) |
| **Readiness** | 扩展点中可立即落子的数量 | `R`(全可下), `P`(部分可下), `D`(全需等) |

> **Readiness 判定差异**：T族看"开放端"的就绪状态；G族看"间隙位置"的就绪状态。

**命名规则**：
- `WIN` 为特殊棋形（4连），不使用前缀
- `BLK` = 双端堵死 (Blocked)
- `MIX` = 线上同时有双方棋子 (Mixed)
- `EMP` = 空线 (Empty)

### 3.2 完整棋形表

#### 3.2.1 扩展点状态模型

PatternMatcher 对连续块的每个扩展端做三步检查，汇总为 `(openEnds, readyEnds)`：

```
检查扩展点 pos（块边界 ± 方向向量）:

  pos 在棋盘范围外?     → BLOCKED (开放端+0, 就绪端+0)
  pos 被对方棋子占据?    → BLOCKED (开放端+0, 就绪端+0)
  pos 被己方棋子占据?    → BLOCKED (开放端+0, 就绪端+0)  // 正常不会发生: findConsecutiveBlock 已扩展到所有连续己方子
  pos 为空 AND 可立即下? → OPEN + READY (开放端+1, 就绪端+1)
  pos 为空 AND 需堆叠?   → OPEN + DELAYED (开放端+1, 就绪端+0)
```

> "被占"和"出界"效果相同，不需要进一步区分。

#### 3.2.2 T族 — 连续棋形（5槽窗口）

5槽符号约定:
- `B` = 己方棋子, `W` = 对方棋子
- `E` = 空 + 可立即下 (Ready)
- `e` = 空 + 需堆叠 (Delayed)
- `_` = 堵死 (出界 / 被占) 或 超出窗口。
<!-- - **延伸深度 (deep)**：单开棋形 (openEnds=1) 需探开放端 ext2 有效性。deep=1(深): ext2 有效且空→能发展两步。deep=0(浅): ext2 出界/被占→填 ext1 即接近无价值。 -->
**延伸深度（deep）**： 对于T2棋形双开棋形，需探开放端ext2有效性。 ext2 deep=2（深）有进一步扩展可能则可发展为T3-O 系列 高价值，否则deep=1 （浅）仅能发展为T3-H系列 中价值。deep=0则说明不是双开，是单开，与前提矛盾
对于T2棋形单开棋形，也许探开放端ext2有效性。ext2 deep=2（深）可发展为T3-H 中价值，deep = 1(浅) 仅能双端堵死的三连，无发展价值。deep=0则说明不是单开，是双堵，与前提矛盾


```
棋形码       5槽布局       连续块    深度    解读
────────────────────────────────────────────────────────────────
WIN          [B B B B _]   (0-3)    —      四连获胜

T3-OR        [E B B B E]   (1-3)    —      两侧E → 双开全就绪
T3-OP        [E B B B e]   (1-3)    —      左E右e → 双开部分就绪
T3-OD        [e B B B e]   (1-3)    —      两侧e → 双开全延迟

T3-HR        [E B B B _]   (1-3)    —    3000(对手必堵)
T3-HR        [B B B E _]   (0-2)    —    3000(对手必堵)
T3-HD        [B B B e _]   (0-2)    —      单开延迟
T3-HD        [e B B B _]   (1-3)    —      单开延迟

T2-OR        [E B B E E]   (1-2)    deep      两侧E → 双开全就绪
T2-OP        [E B B e E]   (1-2)    deep      左E右e → 双开部分就绪
T2-OD        [e B B e E]   (1-2)    deep      两侧e → 双开全延迟

T2-OR-SL        [E B B E _]   (1-2)    shallow      两侧E → 双开全就绪
T2-OP-SL        [E B B e _]   (1-2)    shallow      左E右e → 双开部分就绪
T2-OD-SL        [e B B e _]   (1-2)    shallow      两侧e → 双开全延迟

T2-HR        [B B E E _]  (0-1)    deep      单开深就绪 
T2-HD        [B B e E _]  (0-1)    deep      单开深延迟 

BLK          [B _ _ _ _]   (0)       —      两端均堵 → 0
```

**延伸深度的用途**：
主要用在二连棋形上，因为三连棋形+双端已经涉及了5棋，有完整的筛选能力了。 双连棋形+双端才4棋，后续发展不确定。 

#### 3.2.3 G族 — 间隙棋形（5槽窗口）

G族 Readiness 指**间隙位置**的 E/e 状态。

```
棋形码     5槽布局       子位置    间隙    填隙结果          解读
────────────────────────────────────────────────────────────────────────
G3-S1-R    [B B E B _]   (0,1,3)  p2=E   填E→WIN          一步绝杀 (=T3-HR同级)
G3-S1-R    [B E B B _]   (0,2,3)  p1=E   填E→WIN          对称
G3-S1-R    [_ B B E B]   (1,2,4)  p3=E   填E→WIN          居中版
G3-S1-D    [B B e B _]   (0,1,3)  p2=e   填e→WIN (需等)    延迟绝杀

G2-S1-OR    [E B E B E]   (1,3)    p2=E   填E→T3-OR       双开就绪
G2-S1-OD    [E B e B E]   (1,3)    p2=e   填e→T3-OR(需等)  双开延迟
G2-S1-HR    [B E B E _]   (0,2)    p1=E   填E→T3连续       单开可下
G2-S1-HR    [_ B E B E]   (1,3)    p2=E   填E→T3连续        居中版
G2-S1-HD    [B e B E _]   (0,2)    p1=e   填e→T3连续(需等)  单开延迟
G2-S1-R    [_ B E B _]   (1,3)    p2=E   填E→T3连续        无扩展端可下
G2-S1-D    [_ B e B _]   (1,3)    p2=e   填e→T3连续(需等)  无扩展端延迟

G2-S2-R    [B E E B _]   (0,3)    p1,p2=E 填任意E→G3-S1    两步到WIN
G2-S2-D    [B e e B _]   (0,3)    p1,p2=e 填任意e→G3-S1    延迟
```

**对称性规则**：`[B B E B _]` ≡ `[B E B B _]`，`[B E B E _]` ≡ `[_ B E B E]`

**G2-S1 的双路径威胁** — 以 `[B E B E _]` 为例：
1. 填隙(p1) → `[B B B E _]` → **连续T3**
2. 延伸远端(p3) → `[B E B B _]` → **G3-S1**（再次填隙即WIN）
两条路径都导致下一手产生T3级威胁 → 价值介于 T2-OR 和 T2-HR 之间。

**为什么 G族不能归入 T族**：`[B E B E _]` 中 B 不连续，T族完全忽略（无连续块→EMPTY），漏掉填隙一路到杀的威胁。`[B B E B _]` 中虽有3子但也不连续（p0,p1,p3），T族同样看不到。

#### 3.2.4 棋形识别算法

PatternMatcher 对每条去重后的 LineRecord 执行：

```
classify(line, board, player):
  1. 统计该线: countOwn, countOpp
  2. if countOpp > 0 AND countOwn > 0: return MIX
  3. if countOwn == 0: return EMP (或根据对手棋子返回对方棋形)

  // 连续块检测
  4. blockStart, blockEnd = findConsecutiveBlock(positions, board, player)
  5. if blockLen >= 1:
       // T族: 从连续块边界计算开放端
       openEnds = checkExtension(blockStart, -dir) + checkExtension(blockEnd, +dir)
       readyEnds = countReady(openEnds)
       return TPattern(count=blockLen, openEnds, readyEnds)

  // 无连续块 → 间隙检测
  6. gapInfo = detectGapPattern(positions, board, player)
  7. if gapInfo:
       return GPattern(count=gapInfo.count, gapSize=gapInfo.size, readiness)
  8. return EMP
```

**checkExtension(pos, -dir)**:
```
  ext = pos - dir
  if ext 出界: return 0 (BLOCKED)
  if board.getPiece(ext) != EMPTY: return 0 (BLOCKED)
  return 1 (OPEN)
  // readyEnds additionally checks: ext.z==0 or getPiece(ext.x, ext.y, ext.z-1) != EMPTY
```

**detectGapPattern(positions, board, player)**:
```
  在5槽窗口 (扩展线段两端各1格) 中:
  1. 收集己方棋子的索引列表 ownIndices
  2. if ownIndices.length == 3:
       找唯一空位索引 → 间隙1 → G3-S1 (fill gap → WIN)
  3. if ownIndices.length == 2:
       计算两子间距: gap = ownIndices[1] - ownIndices[0] - 1
       if gap == 1: G2-S1 (1空隔开, fill → T3连续)
       if gap == 2: G2-S2 (2空隔开, fill → G3-S1)
  4. 检查间隙可下性 → R/D
```

#### 3.2.5 棋形递进总图

```
T族 (连续):
  T2-HR → T3-HR → WIN              单侧发展
  T2-OR → T3-OP → T3-OR → WIN          双侧发展

G族 (间隙):
  G2-S2 → G3-S1 → WIN                   两步到胜
  G2-S1 → T3-HR  (填隙→连续T3)
  G2-S1 → G3-S1  (延伸远端→间隙G3)
  G3-S1 → WIN    (填隙→获胜)

跨界:
  [B E B E] → T族忽略（无连续块）, G族见G2-S1
  对手漏堵G2-S1的间隙 → T3 → 下回合WIN

### 3.3 复合棋形：Cross（叉子）

两条以上不同线共享同一 **可下空位** 时构成叉子。我们用 Cross 替代五子棋的"Fork"概念。

| Cross类型 | 构成条件 | 含义 |
|-----------|---------|------|
| **CROSS-WIN** | 2+条 T3级 或 G3级 棋形交汇 | 必胜叉子（一子形成多重必胜威胁） |
| **CROSS-STRONG** | 2+条 T2-OR / G2-S1 交汇 | 强叉子（一子成双 T3 的前一步） |
| **CROSS-MODERATE** | T2-OR + T2-HR / G2-S1 + T2 交汇 | 中等叉子 |
| **CROSS-WEAK** | 2+条 T2-HR / G2-S2 交汇 | 弱叉子 |

**检测方法**: 按可扩展空位聚类。同一空位出现 ≥2 条有价值 pattern 的 extCell → Cross。

---

## 4. 系统架构

### 4.1 模块分层

```
┌──────────────────────────────────────────────┐
│              AIPlayerV2 (门面)                │
│   根据难度组装引擎 + 失误逻辑 + 异步          │
├──────────────────────────────────────────────┤
│                                              │
│  ┌──────────────────┐  ┌──────────────────┐  │
│  │  ThreatEvaluator │  │   SearchEngine   │  │
│  │  (局面评估)       │  │   (博弈树搜索)    │  │
│  │                  │  │                  │  │
│  │  evaluate()      │  │  minimax()       │  │
│  │  evaluateAfter   │  │  quiescenceSrch  │  │
│  │    Place()       │  │  sortMoves()     │  │
│  └────────┬─────────┘  └──────────────────┘  │
│           │                                   │
│  ┌────────▼─────────┐                        │
│  │  PatternMatcher  │                        │
│  │  classifyLine()  │                        │
│  │  isConsecutive() │                        │
│  └────────┬─────────┘                        │
│           │                                   │
│  ┌────────▼─────────┐                        │
│  │   CrossDetector   │                        │
│  │   detect()       │                        │
│  │   clusterByCell()│                        │
│  └──────────────────┘                        │
│                                              │
├──────────────────────────────────────────────┤
│          复用层（现有代码）                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │LineIndex │ │  Board   │ │  WinChecker  │  │
│  │预计算线   │ │setPiece()│ │quickWouldWin │  │
│  │getAllLines│ │findDrop  │ │    Fast      │  │
│  │getPhysical│ │getPiece  │ │              │  │
│  │ LineKey   │ │getAvail  │ │              │  │
│  └──────────┘ └──────────┘ └──────────────┘  │
└──────────────────────────────────────────────┘
```

### 4.2 数据流

```
ThreatEvaluator.evaluate(board, player):          [根节点：全盘基线评估，仅一次]
  1. board.getAllLineRecords()
  2. 物理线去重 (读 line.physKey, 构造时已预计算)
  3. PatternMatcher.classifyBoth() × N             [一次扫双方，过滤零分]
  4. 累加分数 + 方向权重 + CrossDetector
  → baseline ThreatReport

ThreatEvaluator.evaluateIncremental(baseline, ...): [每个候选列, ~25次]
  → 只重算受影响的 ~50 条线 + 增量 Cross
  → delta score

Minimax (MEDIUM/HARD):
  board.setPiece(pos, player)                      [不clone — setPiece]
  score = minimax(board, depth-1, ...)
  board.setPiece(pos, EMPTY)                       [undo 回溯]

→ { bestPosition }                                [返回给 GameController]

> **坑记录：`updateOnPlace` 早期 return 导致 undo 计数错乱**
>
> `board.setPiece(pos, EMPTY)` 内部调 `lineIndex.undoOnRemove(pos, player)`，它会对 `pos` 涉及的**所有**线递减计数。
>
> 但 `lineIndex.updateOnPlace(pos, player)` 发现某线达到4连时会**提前 return**，后续线虽已入栈但未递增计数。
> 于是 `undoOnRemove` 对这些未递增的线也执行了递减，导致计数变为负数（0 → -1）。
>
> 旧版 AIPlayer 每次搜索前 `clone` 棋盘，污染只发生在副本上不影响实盘。
> 新版直接在实盘 `setPiece/undo`，这个计数不平衡就污染了实盘的 LineIndex，造成真实落子时 4 连无法检测。
>
> 修复：`updateOnPlace` 不提前 return，遍历所有线后统一返回 winResult。
> 见 `src/core/LineIndex.ts:285` 的 BUGFIX 注释。

---

## 5. 模块设计

### 5.1 PatternMatcher（棋形识别器）

**文件**: `src/core/ai/PatternMatcher.ts`

#### 职责
将一条 LineRecord 分类为标准棋形 Pattern。

#### 接口

```typescript
enum PatternType {
  WIN = 'WIN',

  // T族 — 连续棋形 (count + openEnds + readyEnds + depth)
  // T3: Three consecutive, one move from winning
  T3_OR = 'T3-OR', T3_OP = 'T3-OP', T3_OD = 'T3-OD',
  T3_HR = 'T3-HR', T3_HD = 'T3-HD',
  // T2: Two consecutive, two moves from winning
  //   _SL (shallow): 至少一端 ext2 出界/block，发展天花板低
  T2_OR = 'T2-OR',   T2_OR_SL = 'T2-OR-SL',
  T2_OP = 'T2-OP',   T2_OP_SL = 'T2-OP-SL',
  T2_OD = 'T2-OD',   T2_OD_SL = 'T2-OD-SL',
  T2_HR = 'T2-HR',   T2_HD = 'T2-HD',

  // G族 — 间隙棋形 (count + gapSize + readiness)
  // G3: Three pieces with gap → fill gap = WIN
  G3_S1_R = 'G3-S1-R', G3_S1_D = 'G3-S1-D',
  // G2: Two pieces with gap → fill gap = T3
  //   按 openEnds/readyEnds 细分: OR(双开全就绪) OD(双开延迟) HR(单开可下) HD(单开延迟) R/D(无扩展端)
  G2_S1_OR = 'G2-S1-OR', G2_S1_OD = 'G2-S1-OD',
  G2_S1_HR = 'G2-S1-HR', G2_S1_HD = 'G2-S1-HD',
  G2_S1_R = 'G2-S1-R',   G2_S1_D = 'G2-S1-D',
  G2_S2_R = 'G2-S2-R',   G2_S2_D = 'G2-S2-D',

  // Special
  BLK = 'BLK',   // Blocked
  MIX = 'MIX',   // Mixed colors
  EMP = 'EMP',   // Empty
}

enum DirCategory {
  HORIZONTAL = 'HORIZONTAL',       // (1,0,0), (0,1,0) z=0 横竖
  DIAGONAL = 'DIAGONAL',           // (1,1,0), (1,-1,0) z=0 斜
  VERTICAL = 'VERTICAL',           // (0,0,±1)
  SPATIAL = 'SPATIAL',             // (±1,0,±1), (0,±1,±1) 空间
  SPATIAL_DIAG = 'SPATIAL_DIAG',   // (±1,±1,±1) 空间对角线
}

interface Pattern {
  type: PatternType;
  player: Player;
  lineId: number;
  dirCategory: DirCategory;
  extCells: Position[];  // 可扩展的空位
  score: number;
}

class PatternMatcher {
  /**
   * 一次扫描同时分类双方棋形。
   * LineRecord 已有 blackCount/whiteCount，避免重复扫描。
   */
  classifyBoth(line: LineRecord, board: Board, aiPlayer: Player):
    { own: Pattern | null; opp: Pattern | null };

  /** 获取方向类别 (dir.z===0 → PLANE; dir===0,0,±1 → VERTICAL; else SPATIAL) */
  static getDirCategory(dir: Vector3): DirCategory;
}
```

#### 核心算法

```
classifyBoth(line, board, aiPlayer):
  1. 利用 LineRecord 的 blackCount/whiteCount 避免重复扫描
  2. if blackCount>0 AND whiteCount>0: own=MIX, opp=MIX
  3. else if blackCount==0 AND whiteCount==0: own=EMP, opp=EMP
  4. else:
       // 连续块检测 (对双方分别做)
       own  = classifyForPlayer(line, board, aiPlayer)
       opp  = classifyForPlayer(line, board, opponent(aiPlayer))
  5. return { own, opp }  // null if no valid pattern (score==0 或 EMP/BLK)

classifyForPlayer(line, board, player):
  blockStart, blockEnd = findConsecutiveBlock(positions, board, player)
  tPattern = null
  if blockLen >= 2:  // count >= 2 才触发 T族 (count=1 无价值)
    openEnds = checkExtension(blockStart, -dir) + checkExtension(blockEnd, +dir)
    tPattern = TPattern(count=blockLen, openEnds, readyEnds)
  // 无连续块或连续块较短 → 也检查间隙（G族可能棋子更多）
  // 例: [B B E B _] → T族见T2(2子), G族见G3-S1(3子) → 应返回G3-S1
  gPattern = detectGapPattern(positions, board, player)
  // 返回棋子总数更多者；棋子数相同则 T 族优先（连续更强）
  if (!tPattern) return gPattern
  if (!gPattern) return tPattern
  return (gPattern.count > tPattern.count) ? gPattern : tPattern
```

### 5.2 CrossDetector（叉子检测器）

**文件**: `src/core/ai/CrossDetector.ts`

#### 职责
检测多条威胁线交汇于同一可下空位的叉子。

#### 接口

```typescript
enum CrossType {
  CROSS_WIN = 'CROSS-WIN',          // 必胜叉子 (2+ T3 级棋形交汇)
  CROSS_STRONG = 'CROSS-STRONG',    // 强叉子 (2+ T2-OR 交汇)
  CROSS_MODERATE = 'CROSS-MODERATE',// 中叉子
  CROSS_WEAK = 'CROSS-WEAK',        // 弱叉子 (2+ T2-HR 交汇)
}

interface CrossResult {
  type: CrossType;
  position: Position;      // 叉子点（交汇空位）
  patterns: Pattern[];     // 参与叉子的线
  score: number;
}

class CrossDetector {
  /** 从 pattern 列表中检测所有叉子 */
  detect(patterns: Pattern[], board: Board): CrossResult[];

  /** 按 extCell 聚类 pattern */
  private clusterByCell(patterns: Pattern[], board: Board): Map<string, Pattern[]>;

  /** 根据交汇的 pattern 组合判定叉子类型 */
  classify(patterns: Pattern[]): CrossType;
}
```

#### 核心算法

```
detect(patterns, board):
  1. 筛选有价值 patterns (score >= 阈值，即 T2-OR 及以上)
  2. 对每条 pattern, 对每个 extCell:
       如果 isPlayableAt(extCell, board):
         clusterMap[posKey(extCell)].push(pattern)
  3. 遍历 clusterMap: 同一位置 ≥2 条 pattern → CrossResult
  4. 返回所有 CrossResult

detectIncremental(baselineCrosses, changedExtCells, allPatterns, board):
  1. 从 baselineCrosses 中移除涉及 changedExtCells 的旧叉子
  2. 仅对 changedExtCells 位置重新聚类 → 新叉子
  3. 合并 (baselineCrosses - 移除的) + 新叉子 → 返回
  // 复杂度从 O(allPatterns × extCells) 降到 O(changedPatterns × extCells)
```

### 5.3 ThreatEvaluator（威胁评估器）

**文件**: `src/core/ai/ThreatEvaluator.ts`

#### 职责
评估完整棋盘局面，输出综合分数和可读报告。

#### 接口

```typescript
interface ThreatReport {
  ownPatterns: Pattern[];        // 己方所有棋形
  oppPatterns: Pattern[];        // 对方所有棋形
  ownCrosses: CrossResult[];        // 己方叉子
  oppCrosses: CrossResult[];        // 对方叉子
  ownScore: number;              // 己方攻击分
  oppScore: number;              // 对方防守扣分
  finalScore: number;            // 综合分
  summary: string;               // 人类可读摘要
}

class ThreatEvaluator {
  /** 全盘基线评估（只在根节点调用一次） */
  evaluate(board: Board, player: Player): ThreatReport;

  /**
   * 增量评估：在已有 baseline 基础上，计算放置一颗棋子后的 delta。
   * 只重算受该位置影响的线（~50条），不扫全量。
   *
   * @param baseline 当前盘面的完整评估报告
   * @param board 棋盘
   * @param pos 落子位置
   * @param player 落子方
   * @returns 放置后的新 ThreatReport（含 score）
   */
  evaluateIncremental(
    baseline: ThreatReport,
    board: Board,
    pos: Position,
    player: Player
  ): ThreatReport;
}
```

#### 评估流程

**全盘基线评估**（每层搜索只调用一次）:

```
evaluate(board, player):
  1. allLines = board.getAllLineRecords()
  2. 物理线去重 → 去重后的线列表 (约200-400条)
  3. ownPatterns = []; oppPatterns = []
     for line in dedupedLines:
       { own, opp } = PatternMatcher.classifyBoth(line, board, player)  // 一次扫描双方
       if own && own.score !== 0: ownPatterns.push(own)      // 过滤零分棋形
       if opp && opp.score !== 0: oppPatterns.push(opp)
  4. 累加 + Cross检测 + 防守倍率
  5. 返回 ThreatReport { patterns, crosses, score }
```

**增量评估**（每个候选列调用，~25次/层）:

```
evaluateIncremental(baseline, board, pos, player):
  1. affectedLineIds = board.getLineIdsAtPosition(pos)  // 只取受影响的线，~50条
  2. 物理线去重 (同上)
  3. 对每条受影响线重新 classify（两侧都要: own + opp）
  4. 从 baseline 中移除旧值，加入新值 → deltaScore
  5. 仅对受影响的 extCells 重做 Cross 检测 → deltaCross
  6. newScore = baseline.score + deltaScore + deltaCross + positionBonus
  7. 返回新 ThreatReport (可复用 baseline 的大部分缓存)
```

**性能对比**:

```
旧方案 (全量 per 候选):  25候选 × 400线 = 10,000 classify/评估
新方案 (增量):           1次全量 (400线) + 25候选 × 50线 = 1,650 classify/评估
                        → ~6× 加速，Minimax depth=4 时差距更明显 (~46,000 vs ~7,000)
```

**Minimax 内的复用**: 搜索树中每层的 baseline 就是父节点放置后的 ThreatReport，不需要每层重新全量评估。

#### 物理线去重 — 预计算键

**优化**: `LineIndex.getPhysicalLineKey()` 每次沿反方向走到棋盘边界。改为在 LineIndex 构造时预计算 `LineRecord.physKey` 字段，去重时直接读。

```typescript
// LineRecord 新增字段 (在 LineIndex.precomputeLines 时填入)
interface LineRecord {
  // ... 现有字段
  physKey: string;  // 预计算的物理线去重键，避免运行时回溯
}

// 去重逻辑简化为:
const bestSegments = new Map<string, LineRecord>();
for (const line of allLines) {
  const count = Math.max(line.blackCount, line.whiteCount);
  const existing = bestSegments.get(line.physKey);
  if (!existing || count > Math.max(existing.blackCount, existing.whiteCount)) {
    bestSegments.set(line.physKey, line);
  }
}
```
**收益**: 每线省去 while 循环回溯（平均3-5步），400线×4=1600次坐标运算→0。

### 5.4 SearchEngine（搜索引擎）

**文件**: `src/core/ai/SearchEngine.ts`

#### 职责
博弈树搜索，找到最优落子。

#### 接口

```typescript
interface SearchConfig {
  maxDepth: number;
  timeLimitMs: number;
  useIterativeDeepening: boolean;
  useQuiescenceSearch: boolean;
  useKillerHeuristic: boolean;
  useHistoryHeuristic: boolean;
}

interface SearchResult {
  bestPos: Position;
  bestScore: number;
  depthReached: number;
  nodesSearched: number;
  timeMs: number;
}

class SearchEngine {
  constructor(config: SearchConfig, evaluator: ThreatEvaluator);

  search(board: Board, player: Player): SearchResult;

  // 内部: Minimax + α-β pruning
  // 内部: quiescenceSearch (安静搜索)
  // 内部: sortMoves (候选排序，含杀手/历史启发式)
}
```

#### 候选排序策略

```typescript
sortMoves(board, candidates, player):
  对每个候选:
    1. 己方立即获胜 → priority += 10000
    2. 阻挡对手立即获胜 → priority += 5000
    3. 历史启发式高分走法 → priority += historyScore
    4. 杀手走法 → priority += killerBonus
    5. 形成叉子 → priority += crossBonus
    6. 中心位置 → priority += positionBonus
  按 priority 降序排列
```

#### 安静搜索 (HARD only)

```
quiescenceSearch(board, alpha, beta, isMaximizing):
  standPat = evaluate(board).score

  // 剪枝检查
  if isMaximizing: if standPat >= beta: return beta; alpha = max(alpha, standPat)
  else:            if standPat <= alpha: return alpha; beta = min(beta, standPat)

  // 只搜索战术走法（涉及 T3-OR/T3-HR/G3-S1 的位置）
  tacticalMoves = getTacticalMoves(board)
  for pos in tacticalMoves:
    score = quiescenceSearch(board.apply(pos), alpha, beta, !isMaximizing)
    // alpha-beta update

  return isMaximizing ? alpha : beta
```

### 5.5 AIPlayerV2（AI决策门面）

**文件**: `src/core/ai/AIPlayerV2.ts`

#### 职责
薄门面，负责：组装引擎 + 失误逻辑 + 异步执行。

#### 接口

```typescript
class AIPlayerV2 {
  constructor(difficulty: Difficulty);

  setDifficulty(d: Difficulty): void;
  setPiece(p: Player): void;
  getDifficulty(): Difficulty;

  /** 异步决策 */
  decide(board: Board): Promise<Position>;

  /** 内部核心 */
  private calculateBestMove(board: Board): Position;
  private shouldMakeMistake(bestScore: number): boolean;
}
```

#### 决策流程

```
calculateBestMove(board):
  1. candidates = board.getAvailableColumns()  // 5×5=25个候选列
  2. 如果只有1个候选 → 直接返回
  3. // 先做一次全盘基线评估（所有难度共享）
     baseline = evaluator.evaluate(board, player)
  4. 按难度选择策略:
     EASY (depth=0, 无搜索):
       for each col in candidates:
         report = pos = board.findDropPosition(col)
         board.setPiece(pos, player)
         report = evaluator.evaluateIncremental(baseline, board, pos, player)
         board.setPiece(pos, EMPTY)  // undo
         score = report.finalScore
       取最高分（含失误率）
     MEDIUM/HARD:
       result = SearchEngine.search(board, player, baseline)
       bestPos = result.bestPos
  5. 失误判断 → 返回 bestPos
```

### 5.6 PonderingEngine（预判计算）

**文件**: `src/core/ai/PonderingEngine.ts`

#### 背景与必要性

AI 在玩家回合期间完全空闲。利用这段时间预先计算 AI 对所有可能玩家走法的响应，可以：
- **消除 AI 响应延迟**：玩家落子后 AI 立即响应（命中缓存）
- **提升体验**：MEDIUM/HARD 搜索耗时 1-3s，预计算可完全隐藏

#### 接口

```typescript
interface PonderResult {
  playerPos: Position;      // 玩家可能下的位置
  aiResponse: Position;     // AI 预计算的应对
  score: number;            // 该应对的评估分
}

class PonderingEngine {
  private aiPlayer: AIPlayerV2;
  private cache: Map<string, PonderResult>;
  private abortController: AbortController | null;
  private priorityQueue: Position[];

  /** 玩家回合开始时调用，启动后台预计算 */
  start(board: Board, playerPiece: Player): void;

  /** 玩家落子后调用，优先查缓存，miss 则同步计算 */
  lookupOrCompute(board: Board, playerPos: Position): Position;

  /** 玩家提前落子时调用，取消后台计算 */
  abort(): void;
}
```

#### 工作流程

```
玩家回合开始:
  1. originalBaseline = evaluator.evaluate(board, aiPiece)  // 原始局面基线（一次性）
  2. playerCandidates = board.getAvailableColumns()         // 25列
  3. 按优先级排序
  4. 时间片循环 (每16ms让出主线程):
     for pos in sorted playerCandidates:
       if abortController.signal.aborted: break

       // 增量评估玩家下pos后的局面 (只重算~50条线，不复算全量)
       board.setPiece(pos, playerPiece)
       playerBaseline = evaluator.evaluateIncremental(
         originalBaseline, board, pos, playerPiece
       )

       // AI在玩家下pos后的局面上搜索（内部复用 playerBaseline，不再全量 evaluate）
       aiMove = aiPlayer.calculateBestMoveWithBaseline(
         board, playerBaseline
       )

       board.setPiece(pos, EMPTY)
       cache.set(key(pos), { playerPos: pos, aiResponse: aiMove })
       await nextTimeSlice()

玩家落子:
  1. abort() → 保留已完成缓存
  2. if cache.has(key): return cached     // 命中
  3. else: 同步计算（同循环内逻辑）       // 未命中
```

**数据共享链**:

```
originalBaseline (400线, 算一次)
  │
  ├─→ playerPos(0,0): evaluateIncremental(50线) → playerBaseline₀
  │     └─→ AI.search(board, playerBaseline₀) → 内部25个AI候选各 evaluateIncremental(50线)
  │
  ├─→ playerPos(0,1): evaluateIncremental(50线) → playerBaseline₁
  │     └─→ AI.search(...)
  │
  └─→ ... 共25个玩家候选

每个玩家候选:
  计算量 = 1次增量(50线) + AI search(25候选 × 50线) = ~1300 classify
  全25个 = ~32,500 classify（对比无共享的 25 × 400 + 25 × 25 × 400 ≈ 260,000）
```

#### 中断机制

```typescript
abort(): void {
  // 1. 设置中断标志 → 循环检测到后停止
  this.abortController?.abort();
  // 2. 撤销当前棋盘 (如果恰好在 setPiece 模拟中)
  //    try/finally: board.setPiece(pos, EMPTY) 保证还原
  // 3. 不清理 cache — 已完成的位置全部保留可用
  //    每个位置是原子完成: 不存在"半成品"缓存
}
```

#### 优先级策略

```
玩家候选排序:
  10000 + 己方能立即赢 (堵)         // 这些是玩家最可能下的
   5000 + 对方形成 T3-OR            // 必胜威胁
   1000 + 中心区域 (距中心≤2)       // 常见位置
      0 + 边缘区域                  // 冷门位置
```

#### 与 GameController 集成

```typescript
// GameController 中的调用点:
onPlayerTurnStart() {
  // 玩家回合开始 → 启动预判
  this.ponderingEngine.start(this.board, this.playerPiece);
}

onPlayerMove(pos: Position) {
  // 玩家落子 → 停止预判 + 查缓存
  this.ponderingEngine.abort();
  const aiMove = this.ponderingEngine.lookupOrCompute(this.board, pos);
  this.executeAIMove(aiMove);
}

onAIMoveComplete() {
  // AI落子后 → 清空旧缓存（局面已变，cache全废）
  this.ponderingEngine.clearCache();
  // 如果游戏未结束 → 下一轮 onPlayerTurnStart 会重新 start
}
```

#### Cache 生命周期

```
  玩家回合开始 ──→ start() 创建新 cache
       │
       ▼
  时间片循环 ──→ 逐个填 cache
       │
       ├── 用户提前落子: abort() → cache 保留已完成的 → 查缓存
       │
       └── 循环自然完成: 25个全算完
       │
       ▼
  AI 落子完成 ──→ clearCache() 清空
       │
       ▼
  下一轮玩家回合 ──→ start() 创建新 cache
```

`clearCache()` 的必要性：AI落子后棋盘状态变化，上一轮基于旧棋盘算出的预判结果全部作废。不清会导致命中过期数据。

#### 性能特征

| 场景 | 玩家思考时间 | 预计算覆盖 | AI响应 |
|------|------------|-----------|--------|
| 快棋 (<2s) | 短 | 部分覆盖 (3-5个候选) | 缓存命中→0ms, miss→正常 |
| 正常 (5-15s) | 中 | 大部分覆盖 (10-15个) | 大概率命中→0ms |
| 长考 (>30s) | 长 | 全部25个候选 | 100%命中→0ms |

---

## 6. 分数体系

### 6.1 设计原则

1. **层级隔离**：高级棋形分数 >> 低级棋形累加和，确保AI优先发展高级威胁而非收集多个低级棋形
2. **防守优先**：对手威胁扣分 = 己方同等威胁加分 × 1.6
3. **可下性区分**：R2 > R1 >> R0（分数比约 100:16:4）
4. **必胜形隔离**：WIN / T3-OR / CROSS-WIN 分数足够大，不会被其他棋形累加超越

### 6.2 完整分数表

#### 己方攻击分

```
棋形             基础分      说明
────────────────────────────────────────────
WIN              1,000,000  立即获胜 → 最高分
T3-OR              100,000  双开全就绪（绝对必胜）
T3-OP                8,000  双开部分就绪
T3-HR                7,000  单开可下 (对手必须堵)
T3-OD                  800  双开全延迟
T3-HD                  500  单开延迟
T2-OR                2,000  双开全就绪-深 (ext2有效, 能到T3-OR)
T2-OR-SL               200  双开全就绪-浅 (至少一端ext2出界/block, 仅能到T3-HR)
T2-OP                  100  双开部分就绪-深
T2-OP-SL                25  双开部分就绪-浅
T2-HR                  120  单开可下-深 (ext2有效, 能到T3-HR)
T2-OD                   20  双开全延迟-深
T2-OD-SL                10  双开全延迟-浅
T2-HD                    8  单开延迟
G3-S1-R              8,000  间隙绝杀可下 (填隙→WIN)
G2-S1-OR             7,000  G2-S1双开可下 (双端开放, 填隙→T3-OR)
G3-S1-D                600  间隙绝杀延迟
G2-S1-HR               300  G2-S1单开可下 (填隙→T3-HR, 或延伸→G3-S1)
G2-S1-OD                30  G2-S1双开延迟
G2-S1-HD                20  G2-S1单开延迟
G2-S2-R                 30  间隙二可下 (填任意→G3-S1)
G2-S2-D                  5  间隙二延迟
G2-S1-R                  2  间隙活二可下 (无扩展端, 仅填隙→T3)
G2-S1-D                  1  间隙活二延迟 (无扩展端, 填隙需等待)
BLK / MIX / EMP          0  堵死/混杂/空线
```

#### 对方防守分 (×1.6)

```
T3-OR            -160,000
T3-OP             -12,800
T3-HR             -11,200
T3-OD              -1,280
T3-HD                -800
T2-OR              -3,200
T2-OR-SL             -320
T2-OP                -160
T2-OP-SL              -40
T2-HR                -192
T2-OD                 -32
T2-OD-SL              -16
T2-HD                 -13
G3-S1-R           -12,800
G2-S1-OR          -11,200
G3-S1-D              -960
G2-S1-HR             -480
G2-S1-OD              -48
G2-S1-HD              -32
G2-S2-R               -48
G2-S2-D                -8
G2-S1-R                -3
G2-S1-D                -2
```

#### 叉子加分

```
叉子类型             加分      对方扣分 (×1.6)
─────────────────────────────────────────────
CROSS-WIN (必胜)     100,000      -160,000
CROSS-STRONG (强)      5,000        -8,000
CROSS-MODERATE (中)    1,500        -2,400
CROSS-WEAK (弱)          300          -480
```

#### 方向权重

```
HORIZONTAL  (1,0,0) (0,1,0)           1.0
DIAGONAL    (1,1,0) (1,-1,0)          1.1  ← 斜线棋子跨横竖两方向，连接度更高
VERTICAL    (0,0,1)                     0.3
SPATIAL     (±1,0,±1) (0,±1,±1)       1.0
SPATIAL_DIAG (±1,±1,±1)                1.1
```

> 设计理由：PLANE 内斜线 (1,1,0) 上的棋子同时参与横竖两个方向的连线机会，连接度高于单方向横竖线，1.1 倍仅微调。SPATIAL = 1.0 理由见 §2.2 差异2。

#### 位置加分

```typescript
CENTER_BONUS = 2 × (maxDist - |x-center| - |y-center|)
// (2,2) on 5x5: 2×(4-0) = 8 (最高)
// (0,0) on 5x5: 2×(4-4) = 0 (最低)
```

### 6.3 分数累加规则

```
finalScore =
    Σ(己方纯线分 × 方向权重)
  + Σ(己方叉子分)
  - Σ(对方纯线分 × 方向权重) × 1.6
  - Σ(对方叉子分) × 1.6
  + 位置加分
```

分数累加时，不重复计同一物理线上的重叠段（物理线去重）。

---

## 7. 难度分级

### 7.1 设计理念

难度 = **视野** + **失误**。不使用"降低评估质量"来制造简单难度（那会产生不可预测的愚蠢行为）。

### 7.2 配置矩阵

| 参数 | EASY | MEDIUM | HARD |
|------|------|--------|------|
| **搜索深度** | 0 (纯评估) | 3 | 4~6 (迭代加深) |
| **失误率** | 25% | 10% | 0% |
| **Alpha-Beta** | ✗ | ✓ | ✓ |
| **候选排序** | ✗ | ✓ | ✓ |
| **安静搜索** | ✗ | ✗ | ✓ |
| **迭代加深** | ✗ | ✗ | ✓ |
| **杀手启发式** | ✗ | ✗ | ✓ |
| **历史启发式** | ✗ | ✗ | ✓ |
| **时间限制** | - | - | 3000ms |
| **关键时刻0失误** | ✓ | ✓ | ✓ |
| **叉子检测** | ✓ | ✓ | ✓ |
| **评估引擎** | 完整 | 完整 | 完整 |

### 7.3 各难度行为

#### EASY — 适合新手

```
策略: 纯评估 + 随机失误
- 对所有候选列评估分数
- 25% 概率从第2-4名中随机选择
- 关键时刻（对手即将赢 / 自己能赢）0% 失误
- 不搜索 → 看不到一步后的威胁组合
- 会给玩家"AI偶尔走错"的感觉
```

#### MEDIUM — 有挑战

```
策略: 中等搜索 (depth=3)
- Minimax alpha-beta, depth=3
- 能看穿对手设陷阱 → 自己应对 → 反制 (1.5回合)
- 10% 非关键时刻失误
- 候选排序加速剪枝
- 防守稳健，能主动构建和识别简单叉子
- 25³=15,625 节点 → α-β 有效 ~125 节点, ~100ms
```

#### HARD — 高难度

```
策略: 迭代加深深度搜索 (depth=4~6)
- 从 depth=2 开始逐层加深
- 每层完成检查 3000ms 时限
- 安静搜索消除地平线效应
- 杀手+历史启发式加速
- 0% 失误，接近最优
```

---

## 8. 搜索架构

### 8.1 Minimax 框架

```
function minimax(board, depth, alpha, beta, isMaximizing):
  // 终止: 深度到0
  if depth == 0:
    if config.useQuiescenceSearch:
      return quiescenceSearch(board, alpha, beta, isMaximizing)
    return evaluator.evaluate(board, player).score

  // 终止: 游戏结束
  winResult = board.checkWinWithIndex()
  if winResult:
    return (winResult.winner == aiPiece) ? WIN_SCORE + depth*1000
                                         : -(WIN_SCORE + depth*1000)

  // 终止: 平局
  if board.isFull(): return 0

  candidates = sortMoves(board, getAvailableColumns(), currentPlayer)

  if isMaximizing:
    maxScore = -Infinity
    for pos in candidates:
      board.setPiece(pos, aiPiece)
      score = minimax(board, depth-1, alpha, beta, false)
      board.setPiece(pos, EMPTY)
      maxScore = max(maxScore, score)
      alpha = max(alpha, score)
      if beta <= alpha: break
    return maxScore
  else:
    minScore = +Infinity
    for pos in candidates:
      board.setPiece(pos, oppPiece)
      score = minimax(board, depth-1, alpha, beta, true)
      board.setPiece(pos, EMPTY)
      minScore = min(minScore, score)
      beta = min(beta, score)
      if beta <= alpha: break
    return minScore
```

### 8.2 迭代加深

```
iterativeDeepening(board, player):
  bestResult = null
  for d = 2 to maxDepth:
    result = alphaBeta(board, d, -Inf, +Inf, player)
    bestResult = result
    if elapsed > timeLimit: break
    // 上一层的最佳走法作为本层的首选候选
  return bestResult
```

### 8.3 安静搜索

防止**地平线效应**：在搜索边界 (depth=0) 时，如果局面存在 T3-OR 威胁（对手下回合即可杀），继续深入搜索直到威胁被解决。

```
quiescenceSearch(board, alpha, beta, isMaximizing, aiPiece):
  // aiPiece: AI 的棋子颜色，用于评估视角
  currentPlayer = isMaximizing ? aiPiece : opponent(aiPiece)

  // 0. 先扫立即获胜（避免 horizon 效应让评估分低估必胜局面）
  for pos in board.getAvailableColumns():
    if WinChecker.quickWouldWinFast(board, pos, currentPlayer):
      return isMaximizing ? WIN_SCORE : -WIN_SCORE

  // 1. stand-pat（始终从 AI 视角评估）
  standPat = evaluator.evaluate(board, aiPiece).score
  if isMaximizing:
    if standPat >= beta: return beta
    alpha = max(alpha, standPat)
  else:
    if standPat <= alpha: return alpha
    beta = min(beta, standPat)

  // 2. 生成战术走法: 只考虑能形成/破坏 T3-OR/T3-HR/G3-S1 的位置
  tacticalMoves = findTacticalMoves(board)
  if tacticalMoves.length == 0: return standPat

  // 3. 递归搜索战术走法
  for pos in tacticalMoves:
    board.setPiece(pos, currentPlayer)
    score = quiescenceSearch(board, alpha, beta, !isMaximizing)
    board.setPiece(pos, EMPTY)
    if isMaximizing: alpha = max(alpha, score)
    else:            beta = min(beta, score)
    if beta <= alpha: break

  return isMaximizing ? alpha : beta
```

---

## 9. 测试用例库

### 9.1 测试框架

每个测试用例包含:
- **布局**: 按顺序放置的棋步列表 `[(x,y,z,player), ...]`
- **期望**: Pattern / Fork / Score 的期望值

测试文件: `src/core/ai/__tests__/ThreatEvaluator.test.ts`

### 9.2 单线棋形测试

以下用例均以 5×5 棋盘为主。符号: `B`=己方, `W`=对方, `E`=空+可下, `e`=空+需等, `_`=堵死/出界。

线方向 (1,0,0)。每个测试展示对应棋形的 **5槽窗口**。

#### TC-01: WIN — 四连获胜

```
5槽 [B B B B _] (块0-3), _ 出界
layout: B(0,2,0), B(1,2,0), B(2,2,0), B(3,2,0)
expect: PatternType=WIN
```

#### TC-02: T3-OR — 双开全就绪（绝对必胜）

```
5槽 [E B B B E] (块1-3), 左右均 E(可下)
layout: B(1,2,0), B(2,2,0), B(3,2,0)
  extCells: (0,2,0) z=0→READY, (4,2,0) z=0→READY
expect: PatternType=T3-OR, score=100000
```

#### TC-03: T3-OP — 双开部分就绪

```
5槽 [E B B B e] (块1-3), 左E可下, 右e需堆叠
layout: B(1,2,1), B(2,2,1), B(3,2,1)
前提: (0,2,0)=B (支撑左侧), (4,2,0)=EMPTY (右侧无支撑)
expect: PatternType=T3-OP, score=8000
```

#### TC-04: T3-OD — 双开全延迟

```
5槽 [e B B B e] (块1-3), 左右均 e(需堆叠)
layout: B(1,2,2), B(2,2,2), B(3,2,2)
前提: (0,2,1)=EMPTY, (4,2,1)=EMPTY
expect: PatternType=T3-OD, score=2000
```

#### TC-05: T3-HR — 单开可下（贴边）

```
5槽 [B B B E _] (块0-2), _ 左出界, 右 E(可下)
layout: B(0,2,0), B(1,2,0), B(2,2,0)
expect: PatternType=T3-HR, score=7000
```

#### TC-06: T3-HD — 单开延迟（贴边+高层）

```
5槽 [B B B e _] (块0-2), _ 左出界, 右 e(需堆叠)
layout: B(0,2,2), B(1,2,2), B(2,2,2)
前提: (3,2,1)=EMPTY
expect: PatternType=T3-HD, score=500
```

#### TC-07: T2-OR — 双开全就绪

```
5槽 [E B B E _] (块1-2), 左右均 E(可下)
layout: B(1,2,0), B(2,2,0)
expect: PatternType=T2-OR-SL, score=200  // 贴边 ext2 出界→shallow
```

#### TC-08: T2-HR — 单开可下（贴边）

```
5槽 [B B E _ _] (块0-1), _ 左出界, 右 E(可下)
layout: B(0,2,0), B(1,2,0)
expect: PatternType=T2-HR, score=120
```

#### TC-09: MIX — 双方棋子混杂

```
5槽 [B W B _ _] 同时有B和W
layout: B(1,2,0), W(2,2,0), B(3,2,0)
expect: PatternType=MIX, score=0
```

#### TC-10: 非连续 → G族捕获

```
5槽 [B E B e _] 二子不连续, T族无法识别
layout: B(0,2,0), B(2,2,1)
T族结果: isConsecutive=false → EMP (无连续块), 总分 0
G族结果: G2-S1 (填隙→T3连续!), 分数 ~300
```

> **注**：TC-11 已移除（T1 族棋形废弃，单子棋形无评估价值）。

#### TC-12: G3-S1-R — 间隙绝杀可下

```
5槽 [B B E B _] (子0,1,3), 间隙p2 z=0可下 → 填隙即WIN
layout: B(0,2,0), B(1,2,0), B(3,2,0)
expect: PatternType=G3-S1-R, score=8000
```

#### TC-13: G2-S1-R — G2-S1可下

```
5槽 [B E B E _] (子0,2), 间隙p1 z=0可下 → 填隙→T3连续
layout: B(0,2,0), B(2,2,0)
expect: PatternType=G2-S1-HR, score=300  // 单开可下
```

#### TC-14: G2-S2-R — 间隙二可下

```
5槽 [B E E B _] (子0,3), 间隙p1,p2 z=0可下 → 填任意→G3-S1
layout: B(0,2,0), B(3,2,0)
expect: PatternType=G2-S2-R, score=30
```

### 9.3 Cross 测试

Cross 检测的核心：两条以上不同方向的线，其 extCell 集合有交集（交汇于同一可下空位）。

#### TC-CROSS-01: CROSS-STRONG

```
构造方法（程序化）:
  1. 选择两条在棋盘上物理交叉的线:
     Line A (对角线 1,1,0): (0,0,0)(1,1,0)(2,2,0)(3,3,0)
     Line B (反对角线 -1,1,0): (3,1,0)(2,2,0)(1,3,0)(0,4,0)
     交汇于 (2,2,0)

  2. 在 Line A 放置连续2子: B(1,1,0), B(2,2,0)
     连续块在(1,1)-(2,2), extCells: (0,0,0)(3,3,0) → T2-OR

  3. 在 Line B 放置连续2子: B(3,1,0), B(2,2,0)
     注意: Line B 方向 (-1,1,0), 连续块在(3,1)-(2,2), 
     extCells: 一端出界, 另一端(1,3,0) → T2-HR

  4. 两条线的 extCell 集合: {(0,0,0),(3,3,0)} ∩ {(1,3,0)} = ∅
     → extCell 不重合 → 不形成 Cross（但共用了棋子位置）

  5. 正确的 CROSS-STRONG 构造需要 extCell 重合:
     调整布局使两条线的 extCell 指向同一空位
     具体构造留给测试实现时程序化完成

验证: CrossDetector.detect() 在 extCell 重合场景下正确输出
      CrossType=CROSS-STRONG, score=5000
```

#### TC-CROSS-02: CROSS-WIN

```
构造: 一条 T3-OR 的 extCell + 一条 T3-HR 的 extCell 重合
验证: CrossType=CROSS-WIN, score=100000
```

#### TC-CROSS-03: CROSS-WEAK

```
构造: 两条 T2-HR 的 extCell 交集非空
验证: CrossType=CROSS-WEAK, score=300
```

测试实现时用程序化方法：创建 Board → 手动放置棋子到指定位置 → 调用 CrossDetector.detect() → 验证结果。



### 9.4 完整局面评估测试

#### TC-FULL-01: 空棋盘

```
layout: 空棋盘
player: BLACK
expect: finalScore 约等于 0 + 中心位置加分 (约8分)
```

#### TC-FULL-02: 双方各有一个 T2-O

```
layout:
  B(1,2,0), B(2,2,0)  → 己方 T2-OR = +500
  W(1,3,0), W(2,3,0)  → 对方 T2-OR = -800
player: BLACK
expect: finalScore ≈ 500 - 800 + position ≈ -300 范围
```

#### TC-FULL-03: 己方必胜 T3-OR

```
layout:
  B(1,2,0), B(2,2,0), B(3,2,0)  → T3-OR = +50000
  W 随机放置 (不形成威胁)
player: BLACK
expect: finalScore ≈ 50000 + position → 显著正值
```

#### TC-FULL-04: 对手必胜 — AI必须防守

```
layout:
  W(1,2,0), W(2,2,0), W(3,2,0)  → 对手 T3-OR
  B 随机放置
player: BLACK
expect: finalScore 显著为负 (≈ -80000)
        AI选择阻塞 W 的 extCell 位置后分数大幅回升
```

### 9.5 难度分级测试

#### TC-DIFF-01: EASY 看不清 cross

```
layout: 布置一个需要2步才能形成的叉子
  例如: 两条 G2-S2，如果AI在正确位置落子则成 CROSS-STRONG
EASY (depth=0, 纯评估):
  expect: AI 不会主动走向叉子点（无搜索，看不到一步后形成的叉子）
MEDIUM (depth=3, α-β):
  expect: AI 选择走向叉子点的位置（能看穿 1.5 回合）
```

#### TC-DIFF-02: HARD 安静搜索有效性

```
layout: 局面存在 T3-OR 但 Minimax 深度刚好到达边界
HARD (安静搜索 ON):
  expect: 正确评估 T3-OR 为极高价值
EASY/MEDIUM (无安静搜索):
  expect: 可能因地平线效应低估威胁
```

---

## 10. 集成方案

### 10.1 文件结构

```
src/core/ai/
  ├── AIPlayerV2.ts          # AI决策门面
  ├── ThreatEvaluator.ts     # 威胁评估器
  ├── PatternMatcher.ts      # 棋形识别器
  ├── CrossDetector.ts       # 叉子检测器
  ├── SearchEngine.ts        # 搜索引擎
  ├── PonderingEngine.ts     # 预判计算(玩家回合后台运算)
  ├── scores.ts              # 分数常量定义
  └── __tests__/
       ├── PatternMatcher.test.ts
       ├── CrossDetector.test.ts
       ├── ThreatEvaluator.test.ts
       └── SearchEngine.test.ts
```

### 10.2 与 GameController 集成

GameController 创建 AIPlayerV2 替代 AIPlayer：

```typescript
// GameController.ts 变更
import { AIPlayerV2 } from '@/core/ai/AIPlayerV2';

// 替换:
// this.aiPlayer = new AIPlayer(difficulty);
// 为:
this.aiPlayer = new AIPlayerV2(difficulty);

// 其他接口不变:
this.aiPlayer.setDifficulty(difficulty);
this.aiPlayer.setPiece(piece);
const pos = await this.aiPlayer.decide(board);
```

### 10.3 与现有类型系统集成

新增类型定义到 `src/types/index.ts` 或独立文件 `src/core/ai/types.ts`：

```typescript
// 新增: AI评估相关类型
export { PatternType, DirCategory, CrossType };
export type { Pattern, CrossResult, ThreatReport, SearchConfig, SearchResult };
```

### 10.4 复用的现有模块

| 模块 | 用法 | 不改动 |
|------|------|--------|
| `LineIndex` | 预计算线、getAllLines、getPhysicalLineKey | 不改 |
| `Board.setPiece()` + undo | AI模拟(放置/回溯，不clone) | 沿用 |
| `Board.clone()` | 根节点快照（备用） | 不改 |
| `Board.getPiece()` | 棋形检测查子 | 不改 |
| `Board.getAvailableColumns()` | 候选生成 | 不改 |
| `Board.checkWinWithIndex()` | 终止检测 | 不改 |
| `WinChecker.quickWouldWinFast()` | Layer0快速胜负 | 不改 |
| `EVAL_SCORES` (aiConfig.ts) | 可逐步废弃，由 scores.ts 替代 | 保留过渡期 |

### 10.5 需要废弃的代码

| 文件 | 函数/类 | 原因 |
|------|---------|------|
| `AIPlayer.ts` | 整个类 | 由 AIPlayerV2 替代 |
| `AIPlayer.ts` | `layeredEvaluate` | 分散在各层的评估合并到 ThreatEvaluator |
| `AIPlayer.ts` | `evaluateLayer1-3` | 由 PatternMatcher + CrossDetector 替代 |
| `AIPlayer.ts` | `evaluateInternalNode` | 不再需要（Minimax 内部不重复评估）|
| `AIPlayer.ts` | `staticEvaluate` | 由 ThreatEvaluator.evaluate 替代 |
| `AIPlayer.ts` | `evaluateOpponentDoubleOpenThreat` | 由 ThreatEvaluator 统一处理 |
| `LineIndex.ts` | `getEvaluationScore` | 评估逻辑移至 ThreatEvaluator（LineIndex 只保存数据）|
| `LineIndex.ts` | `calculateLineScore` | 同上 |
| `LineIndex.ts` | `calculateThreatGroupScore` | 同上 |

---

## 附录A: 与 v1 的关键差异总结

| 方面 | v1 (现有) | v2 (新设计) |
|------|----------|------------|
| 棋形识别 | 分散在 7 个函数中 | 统一 PatternMatcher |
| 叉子检测 | Layer3 取 max + 0.05 抑制 | CrossDetector 按空位聚类 |
| Readiness | Layer1/2 只用 openEnds | 所有棋形区分 R2/R1/R0 |
| 方向权重 | 无（13方向等价） | PLANE 1.0 / SPATIAL 1.0 / VERTICAL 0.3 |
| 分数体系 | 随意赋值 | 五子棋理论支撑 + 层级隔离 |
| 搜索 | Minimax 耦合在 AIPlayer | 独立 SearchEngine，支持迭代加深/安静搜索 |
| 难度区分 | 评估层开关 | 搜索深度 + 失误率（评估引擎始终完整） |
| 可测试性 | 无棋形测试 | 每种棋形有对应测试布局 |

---

## 附录B: 实现优先级

| 优先级 | 模块 | 理由 |
|--------|------|------|
| P0 | `scores.ts` | 所有模块依赖的分数常量 |
| P0 | `PatternMatcher` | 棋形识别是评估的基础 |
| P0 | `ThreatEvaluator` | AIPlayerV2 直接依赖 |
| P1 | `AIPlayerV2` (EASY模式) | 纯评估，验证 PatternMatcher + ThreatEvaluator |
| P1 | `CrossDetector` | 被 ThreatEvaluator 依赖 |
| P2 | `SearchEngine` (MEDIUM) | depth=2 Minimax |
| P2 | `AIPlayerV2` (MEDIUM/HARD) | 完整搜索集成 |
| P3 | 迭代加深 + 安静搜索 | HARD 增强 |
| P3 | 测试套件 | 回归测试 |

---

**文档版本**: v2.0
**最后更新**: 2026-04-27
**状态**: 架构设计完成，待 Dev 评审
