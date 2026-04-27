# Blender 动画制作指南 - Black Cat 模型

## 基本信息

- **目标模型**：`public/assets/testcat/black_cat.glb`
- **目标动画**：呼吸（Idle）、悬停（Hover）
- **预计耗时**：2-3 小时（首次）
- **创建日期**：2026-04-27

---

## 第一部分：下载和安装 Blender

### 1.1 下载

访问官网：https://www.blender.org/download/

或直接下载（Linux）：
```bash
# 方法1：通过 snap 安装（推荐）
sudo snap install blender

# 方法2：下载官方包
wget https://www.blender.org/download/release/Blender4.2/blender-4.2.1-linux-x64.tar.xz
tar -xf blender-4.2.1-linux-x64.tar.xz
```

### 1.2 启动

```bash
# snap 安装后直接运行
blender

# 或官方包
./blender-4.2.1-linux-x64/blender
```

### 1.3 首次启动设置

1. 语言设置：Edit → Preferences → Interface → Language → 简体中文（可选）
2. 保存设置：点击左下角「保存用户设置」

---

## 第二部分：导入模型

### 2.1 打开模型文件

```
File → Import → glTF 2.0 (.glb/.gltf)
→ 选择 public/assets/testcat/black_cat.glb
→ 点击「Import glTF 2.0」
```

### 2.2 导入后的界面

你会看到：
- **中央**：猫咪模型（灰色/橙色）
- **右侧 Outliner 面板**：层级树（所有节点）
- **底部时间轴**：动画时间线

---

## 第三部分：界面基础操作

### 3.1 视图控制

| 操作 | 鼠标/键盘 | 说明 |
|------|-----------|------|
| 旋转视角 | 鼠标中键拖拽 | 围绕模型旋转 |
| 平移视角 | Shift + 鼠标中键拖拽 | 平移画面 |
| 缩放 | 鼠标滚轮 | 放大/缩小 |
| 正视图 | 数字键 1 | 从正面看 |
| 侧视图 | 数字键 3 | 从侧面看 |
| 顶视图 | 数字键 7 | 从顶部看 |
| 四视图 | Ctrl + Alt + Q | 同时显示四个视角 |

### 3.2 模式切换（关键）

左上角有模式下拉菜单：

| 模式 | 用途 |
|------|------|
| **Object Mode** | 选择/移动整个物体 |
| **Edit Mode** | 编辑网格顶点（不要用） |
| **Pose Mode** | 编辑骨骼姿态（动画制作用这个！） |

**重要**：做动画时必须切换到 **Pose Mode**

### 3.3 选择和变换

| 操作 | 快捷键 | 说明 |
|------|--------|------|
| 选择 | 鼠标左键 | 单选物体/骨骼 |
| 多选 | Shift + 左键 | 加选 |
| 全选 | A | 选择全部 |
| 取消选择 | Alt + A | 清空选择 |
| 移动 | G | Grab（移动） |
| 旋转 | R | Rotate（旋转） |
| 缩放 | S | Scale（缩放） |
| 精确控制 | G/R/S 后输入数值 | 如 R → X → 15（绕X轴旋转15度） |

### 3.4 关键帧操作

| 操作 | 快捷键 | 说明 |
|------|--------|------|
| 插入关键帧 | I | 弹出菜单选「Rotation」或「LocRot」 |
| 删除关键帧 | Alt + I | 删除当前选中帧 |
| 复制关键帧 | Ctrl + C | 复制当前帧 |
| 粘贴关键帧 | Ctrl + V | 粘贴到当前位置 |

---

## 第四部分：理解骨骼层级

### 4.1 查看 Outliner 面板

右侧 Outliner 面板显示所有节点。black_cat 的关键骨骼：

```
Armature.001（骨架根节点）
├── _rootJoint
    ├── joint1_00（尾巴根部）
    │   ├── joint2_032
    │       ├── joint3_033
    │           ├── joint4_034（尾巴末端）
    ├── r_handTop_01（右前腿）
    ├── l_handTop_06（左前腿）
    ├── waist_011（腰部）
    │   ├── back3_012
    │       ├── back2_013
    │           ├── back1_014
    │               ├── neck_015（脖子）
    │                   ├── head_016（头部）
    │                       ├── r_ear_017（右耳朵）
    │                       ├── l_ear_019（左耳朵）
    ├── hip_021（臀部）
    │   ├── rLeg_Top_022（右后腿）
    │   ├── lLeg_Top_027（左后腿）
```

### 4.2 呼吸动画需要的骨骼

| 骨骼名称 | 作用 | 动画动作 |
|----------|------|----------|
| `back3_012` | 背部上段 | 微微起伏（呼吸） |
| `back2_013` | 背部中段 | 微微起伏 |
| `back1_014` | 背部下段 | 微微起伏 |
| `joint1_00` ~ `joint4_034` | 尾巴（4节） | 轻微左右摆动 |
| `r_ear_017`、`l_ear_019` | 耳朵 | 微微抖动 |

### 4.3 悬停动画需要的骨骼

| 骨骼名称 | 作用 | 动画动作 |
|----------|------|----------|
| `head_016` | 头部 | 抬起看向观察者 |
| `neck_015` | 脖子 | 配合头部抬起 |
| `r_ear_017`、`l_ear_019` | 耳朵 | 前倾（警觉姿态） |
| `joint1_00` | 尾巴根部 | 竖起 |

---

## 第五部分：制作呼吸动画（Idle）

### 5.1 准备工作

1. 切换到 **Pose Mode**（左上角下拉菜单）
2. 切换到 **侧视图**（数字键 3）方便观察脊柱
3. 确认底部时间轴显示帧数（默认 0-250 帧）

### 5.2 设置动画时长

呼吸动画周期：2秒 = 48帧（24fps）

底部时间轴区域：
```
Start: 1
End: 48
```

### 5.3 第1帧：初始姿态

1. 在 Outliner 中选择 `back3_012`
2. 确认骨骼处于默认姿态
3. 按 **I** → 选择 **Rotation**
4. 在第1帧插入关键帧

**提示**：同时选中 back3、back2、back1（Shift 多选），一次性插入关键帧

### 5.4 第24帧：最大起伏（吸气）

1. 时间轴拖到 **帧24**
2. 选择 `back3_012`（背部上段）
3. 按 **R** → **X** → 输入 **5**（绕X轴旋转5度，轻微后仰）
4. 按 **I** → 插入关键帧

5. 选择 `back2_013`（背部中段）
6. 按 **R** → **X** → 输入 **3**
7. 按 **I** → 插入关键帧

8. 选择 `back1_014`（背部下段）
9. 按 **R** → **X** → 输入 **2**
10. 按 **I** → 插入关键帧

### 5.5 第48帧：回到初始姿态

**方法A：复制第1帧**
1. 选择帧1的关键帧（点击时间轴上的菱形标记）
2. **Ctrl + C** 复制
3. 拖到帧48
4. **Ctrl + V** 粘贴

**方法B：直接插入**
1. 拖到帧48
2. 选中 back3、back2、back1
3. 将旋转值设回 0（按 R → X → 0）
4. 按 **I** → 插入关键帧

### 5.6 添加尾巴摆动

尾巴需要逐节设置，形成波浪效果：

1. 帧1：选择 `joint1_00`（尾巴根部），按 **I** → Rotation
2. 帧12：`joint1_00` → **R → Z → 8**（绕Z轴旋转8度），按 I
3. 帧24：`joint1_00` → **R → Z → 0**，按 I
4. 帧36：`joint1_00` → **R → Z → -8**，按 I
5. 帧48：复制帧1

**尾巴后续关节**（joint2、joint3、joint4）：
- 每个关节延迟2-3帧
- 旋转幅度逐渐增大：joint1=8°，joint2=12°，joint3=16°，joint4=20°

**快速方法**：只做 joint1 和 joint4，中间自动过渡

### 5.7 添加耳朵抖动

1. 帧1：选择 `r_ear_017`、`l_ear_019`，按 **I** → Rotation
2. 帧16：按 **R → Z → 3**，按 I
3. 帧32：按 **R → Z → -3**，按 I
4. 帧48：复制帧1

### 5.8 预览动画

1. 点击时间轴左下角的 **播放按钮**（或按空格键）
2. 观察模型动画是否流畅
3. 如果穿模或动作不自然，调整关键帧数值

### 5.9 创建动画动作（Action）

**重要**：需要把动画保存为独立的 Action

1. 顶部菜单 → **Action** 下拉框
2. 点击 **+ New** 创建新 Action
3. 命名为 **Idle** 或 **breathing**
4. 这会在导出时生成独立的动画片段

---

## 第六部分：制作悬停动画（Hover）

### 6.1 创建新 Action

1. 顶部 Action 下拉框 → **+ New**
2. 命名为 **Hover**

### 6.2 动画时长

悬停动画周期：0.8秒 ≈ 20帧

时间轴设置：
```
Start: 1
End: 20
```

### 6.3 第1帧：初始姿态

1. 选择 `head_016`、`neck_015`、`r_ear_017`、`l_ear_019`、`joint1_00`
2. 按 **I** → Rotation

### 6.4 第10帧：警觉姿态

**头部抬起**：
1. 选择 `head_016`
2. 按 **R → X → -15**（绕X轴旋转-15度，头部抬起）
3. 按 **I** → 插入关键帧

**脖子配合**：
1. 选择 `neck_015`
2. 按 **R → X → -8**
3. 按 **I** → 插入关键帧

**耳朵前倾**：
1. 选择 `r_ear_017`、`l_ear_019`
2. 按 **R → X → -20**（耳朵向前倾斜）
3. 按 **I** → 插入关键帧

**尾巴竖起**：
1. 选择 `joint1_00`
2. 按 **R → Z → -30**（尾巴根部向上翘）
3. 按 **I** → 插入关键帧

### 6.5 第20帧：回到初始

复制帧1的关键帧到帧20

### 6.6 添加轻微晃动（可选）

在帧5、帧15添加轻微变化，模拟猫咪观察时的晃动：
- `head_016`：R → Y → 5（轻微左右看）
- 帧10：R → Y → -5

### 6.7 预览和调整

播放动画，检查：
- 头部抬起是否自然
- 耳朵前倾角度是否合适
- 尾巴竖起会不会穿模

---

## 第七部分：导出模型

### 7.1 导出设置

```
File → Export → glTF 2.0 (.glb/.gltf)
```

**重要设置**：

| 设置项 | 值 | 说明 |
|--------|-----|------|
| Format | **GLB** | 单文件，方便加载 |
| Include | ✅ Animations | 必须勾选！ |
| Shape Keys | ❌ 不勾选 | 本模型不需要 |
| Skinning | ✅ 勾选 | 骨骼动画必须 |
| Bone Directions | Preserve | 保持骨骼方向 |

### 7.2 导出路径

导出到：
```
public/assets/themes/cat/cat.glb
```

（建议创建 themes/cat 目录，正式使用）

### 7.3 导出文件命名

```
cat_with_animations.glb
```

---

## 第八部分：验证导出结果

### 8.1 检查动画数量

```bash
cd /home/ubuntu/Project/connect4-3d

node -e "
const fs = require('fs');
const buffer = fs.readFileSync('public/assets/themes/cat/cat.glb');
const chunkLength = buffer.readUInt32LE(12);
const json = JSON.parse(buffer.slice(20, 20 + chunkLength).toString());
console.log('Animations:', json.animations ? json.animations.length : 0);
if (json.animations) {
  json.animations.forEach(a => console.log('  -', a.name));
}
"
```

### 8.2 在测试页面验证

修改测试页面加载新模型：
```javascript
// 在 test-cat-models.html 中添加新按钮
<button class="model-btn" data-model="cat_with_animations.glb">cat_anim</button>
```

或直接替换文件名。

### 8.3 检查动画效果

在浏览器中：
1. 切换到新模型
2. 点击内置动画按钮
3. 观察 Idle 和 Hover 动画是否正常播放
4. 检查穿模情况

---

## 第九部分：常见问题

### Q1：骨骼旋转后模型变形/穿模

**原因**：旋转角度过大，或旋转轴不对

**解决**：
- 减小旋转角度（如 15° → 8°）
- 确认旋转轴（X轴通常是前后，Z轴是左右）
- 观察骨骼层级，避免子骨骼反向旋转

### Q2：导出后动画丢失

**原因**：没有创建 Action，或导出时未勾选 Animations

**解决**：
1. 确认顶部 Action 下拉框显示 Idle、Hover 名称
2. 导出时勾选「Include: Animations」
3. 每个骨骼的动画都要在该 Action 下录制

### Q3：动画播放不流畅

**原因**：关键帧间隔不均匀，或曲线不够平滑

**解决**：
- 使用 Graph Editor（图表编辑器）查看曲线
- 调整关键帧插值类型：Right Click → Interpolation Mode → Bezier

### Q4：找不到骨骼节点

**原因**：Outliner 层级折叠

**解决**：
1. Outliner 面板展开 Armature.001
2. 继续展开 _rootJoint
3. 使用搜索框输入骨骼名称

---

## 附录：关键帧数值参考

### 呼吸动画（Idle）参考值

| 骨骼 | 帧1 | 帧24 | 帧48 |
|------|-----|------|------|
| back3_012 | RotX: 0° | RotX: 5° | RotX: 0° |
| back2_013 | RotX: 0° | RotX: 3° | RotX: 0° |
| back1_014 | RotX: 0° | RotX: 2° | RotX: 0° |
| joint1_00 | RotZ: 0° | RotZ: 8° | RotZ: 0° |
| r_ear_017 | RotZ: 0° | RotZ: 3° | RotZ: 0° |

### 悬停动画（Hover）参考值

| 骨骼 | 帧1 | 帧10 | 帧20 |
|------|-----|------|------|
| head_016 | RotX: 0° | RotX: -15° | RotX: 0° |
| neck_015 | RotX: 0° | RotX: -8° | RotX: 0° |
| r_ear_017 | RotX: 0° | RotX: -20° | RotX: 0° |
| joint1_00 | RotZ: 0° | RotZ: -30° | RotZ: 0° |

---

**文档版本**：v1.0
**最后更新**：2026-04-27