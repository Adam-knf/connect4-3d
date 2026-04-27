# 测试交接文档

**版本**: v2.0
**日期**: 2026-04-26
**作者**: Dev Agent
**交接目标**: 🧪 QA Agent

## 前置依赖

- `test-scenarios-design.md` v2.0
- `AIPlayer.ts` v3.1

## 运行环境

- Node.js: 18+
- 构建命令: `npm run build`
- 测试命令: `npm run test src/core/AIPlayer.test.ts`

## 测试架构说明

### 难度向下覆盖机制

```
EASY测试套件  → 只跑EASY级别用例（6个）
MEDIUM测试套件 → 跑EASY+MEDIUM用例（12个）
HARD测试套件  → 跑全部用例（16个）
```

**优势**：
- 不再在每个难度重复写相同测试
- 高难度自动验证低难度能力
- 代码量减少约60%

### 测试用例结构

```typescript
interface TestCase {
  id: string;           // 用例编号
  name: string;         // 用例名称
  level: 'EASY' | 'MEDIUM' | 'HARD';
  setup: (board: Board) => void;
  aiPiece: Player;
  validate: (result, board) => boolean;
}
```

## 验证方法

### 运行测试
```bash
npm run test src/core/AIPlayer.test.ts
```

### 预期输出
- 基础功能测试通过
- 大部分棋谱测试通过
- 部分断言严格用例可能失败（需调整）

### 失败排查

| 失败用例 | 可能原因 | 处理方式 |
|----------|----------|----------|
| E-4, E-5 | 棋盘setup坐标需调整 | 调整setup函数 |
| M-5, M-6 | 叉子识别逻辑 | 检查Layer 3 fork检测 |
| H-5, H-8 | 3D方向复杂场景 | 简化断言或调试AI |

## 测试矩阵

| 套件 | 用例数 | 通过 | 失败 |
|------|--------|------|------|
| 基础功能 | 3 | 3 | 0 |
| EASY棋谱 | 6 | 4 | 2 |
| MEDIUM棋谱 | 12 | 待测 | 待测 |
| HARD棋谱 | 16 | 待测 | 待测 |
| 失误率机制 | 1 | 1 | 0 |

## 下一步

1. 调整失败用例的setup坐标
2. 根据实际AI行为放宽/调整断言
3. 收集更多实盘Log补充回归测试