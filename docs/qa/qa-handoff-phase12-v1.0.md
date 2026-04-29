# Phase 12 AI评估系统重构 — QA 交接文档 v1.0

## 基本信息

| 项目 | 内容 |
|------|------|
| **文档版本** | v1.0 |
| **交接日期** | 2026-04-28 |
| **交接方** | Dev Agent |
| **接收方** | QA Agent |
| **前置依赖** | `docs/architecture/ai-evaluation-v2.md` v2.0 |

## 变更概要

完全重构 AI 评估架构。旧 `AIPlayer.ts`（v1 分层评估，7 个分散评估函数）已删除，由以下新模块替代：

```
src/core/ai/                          ← 新增目录
├── scores.ts                         # 分数常量 + 难度配置
├── PatternMatcher.ts                 # T族+G族棋形识别（18种棋形）
├── ThreatEvaluator.ts                # 全盘基线评估 + 增量评估
├── CrossDetector.ts                  # 叉子（Cross）检测
├── SearchEngine.ts                   # Minimax + α-β + 迭代加深 + 安静搜索
├── AIPlayerV2.ts                     # AI 决策门面（兼容旧接口）
├── PonderingEngine.ts                # 玩家回合后台预计算
└── __tests__/
    ├── PatternMatcher.test.ts         # 15 tests
    ├── CrossDetector.test.ts          # 6 tests
    ├── ThreatEvaluator.test.ts        # 17 tests
    └── AIPlayerV2.test.ts             # 29 tests
```

修改文件：`GameController.ts`（集成 AIPlayerV2 + PonderingEngine）、`LineIndex.ts`（physKey 预计算优化）、`Board.ts`（移除旧 eval 方法）、`WinChecker.ts`（移除死代码）、`aiConfig.ts`（简化）。

## 测试覆盖

| 类别 | 测试数 | 覆盖内容 |
|------|--------|----------|
| PatternMatcher | 15 | WIN/T3-OR/T3-OP/T3-HR/T2-OR/T2-HR/MIX/G3-S1-R/G2-S1-R/G2-S2-R + DirCategory |
| CrossDetector | 6 | 无Cross/有Cross/CROSS-WEAK/CROSS-STRONG/3线交汇/低分过滤 |
| ThreatEvaluator | 17 | 空棋盘/双方威胁/己方必胜/对手必胜/叉子场景/G族/跨层/增量评估/边界 |
| AIPlayerV2 | 29 | EASY 4项 / MEDIUM 7项 / HARD 8项 / 向下兼容 6项 / 失误率 / 难度切换 |
| 已有测试 | 67 | Board/WinChecker/LineIndex/StatsStore（全部保持通过） |
| **总计** | **134** | 0 failures |

## 验收场景

### 场景1: 浏览器运行验证

```bash
npm run dev
# 浏览器打开 http://localhost:3000
```

**检查项：**
1. [ ] 游戏正常启动，菜单可操作
2. [ ] 选择 EASY / MEDIUM / HARD 难度，开始游戏
3. [ ] AI 正常响应落子（EASY < 1s, MEDIUM ~1s, HARD ~2-3s）
4. [ ] AI 会阻挡玩家的立即获胜（所有难度）
5. [ ] AI 会完成自己的立即获胜（所有难度）
6. [ ] EASY 偶尔走非最优（25% 失误率）
7. [ ] HARD 不走明显失误（0% 失误率 — 注意：受 depth 限制，可能看不到 5+ 步的深层杀招）
8. [ ] 控制台无报错（`npm run dev` 终端输出）

### 场景2: MEDIUM/HARD 行为区分

**布局1 — 叉子构建（MEDIUM 应识别）：**
```
AI=WHITE, 期望 AI 会放在 (2,2,0) 形成叉子:
  W(0,2,0), W(1,2,0)    # Line (1,0,0), extCell (2,2,0)
  W(2,0,0), W(2,1,0)    # Line (0,1,0), extCell (2,2,0)
```

**布局2 — 立即获胜（所有难度）：**
```
AI=WHITE, 期望 AI 立即放在 (3,2,0) 获胜:
  W(0,2,0), W(1,2,0), W(2,2,0)
```

### 场景3: 旧功能回归

1. [ ] 战绩记录（StatsStore）正常读写
2. [ ] 再玩一局正常
3. [ ] 棋盘旋转/视角切换正常
4. [ ] 难度切换正常

## 难度表

| 参数 | EASY | MEDIUM | HARD |
|------|------|--------|------|
| 搜索深度 | 0（纯评估） | 3 | 4-6（迭代加深） |
| 失误率 | 25% | 10% | 0% |
| Alpha-Beta | ✗ | ✓ | ✓ |
| 安静搜索 | ✗ | ✗ | ✓ |
| 迭代加深 | ✗ | ✗ | ✓ |
| 关键时刻0失误 | ✓ | ✓ | ✓ |

## 已知限制

1. **PonderingEngine** 已实现但 GameController 集成 hooks 完整，需浏览器验证异步时序
2. **HARD depth=4-6** 搜索在特定局面可能耗时 ~3s，在 MEDIUM 深度下不会
3. **安静搜索** 仅在 HARD 模式生效，依赖 `quickWouldWinFast` 可用性
4. **Precomputing physKey** 优化了 LineIndex 物理线去重，O(n) 回溯降为 O(1)

## 快速验证命令

```bash
# 全量测试
npm run build && npx vitest run

# 仅 AI 模块测试
npx vitest run src/core/ai/__tests__/

# 查看测试覆盖率（可选）
npx vitest run --coverage 2>/dev/null || true
```

## 异常处理验证

1. [ ] 对手有 WIN 威胁时 AI 是否选择阻挡（而非走闲棋）
2. [ ] 己方有 WIN 机会时 AI 是否立即获胜（而非拖延）
3. [ ] 空棋盘第一手是否合理（非边缘位置）
4. [ ] 满棋盘（平局）不崩溃

## 签字

| 角色 | 签字 | 日期 |
|------|------|------|
| Dev | ✅ 代码交付 | 2026-04-28 |
| QA | ⏳ 待验收 | |
| PM | ⏳ 待确认 | |
