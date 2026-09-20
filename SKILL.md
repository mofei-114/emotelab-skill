---
name: emotelab
description: 用 EmoteLab（捏捏表情包）全自动捏人并导出表情包。只要用户提到 EmoteLab、捏捏、捏人、捏表情、表情包、贴纸、Discord/Twitch 表情，或想让 AI 自动捏一个角色、自动出 GIF 表情，就使用本 skill——即使用户没提 EmoteLab 这个名字。
---

# EmoteLab 全自动捏人

给一段文字描述（"橘色猫耳娘"、"黑白丧系兔耳"），生成 EmoteLab 角色并导出表情包图片/GIF。

## 架构（为什么这样设计）

1. **角色 = JSON 文件**。EmoteLab 角色保存在
   `Documents\EmoteLab\Characters\CoffeeBean\<角色名>\<角色名>.json`，
   游戏启动/刷新时自动扫描该目录。**所以"捏人"根本不需要点界面：直接生成 JSON 文件**，
   这是本 skill 最核心的发现。
2. **捏人不需要 GUI，导出也不需要**。`scripts/headless/` 用游戏自带的 Spine 骨架 +
   图集 + 运行时贴图离线渲染，能直接出 PNG/GIF，**零抢屏**（已与游戏导出产物逐帧比对一致）。
   `scripts/vdesktop.py` 的独立虚拟桌面 GUI 路线保留为兜底。
3. **角色文件结构**（已实测验证）：
   - `ActiveSkins.Items`: 槽位→部件（如 `Eye→Eye2`）；**但它只列"可选部件"**，
     `[Required]` 必备部件不在其中（见下条）
   - `SliderConstraints`: 形状滑条。**值是「秒」，不是 0..1**——见下面第 6 条「滑条机制」
   - `SlotGroups[].TintColor/TintBlackColor`: 各部件颜色（Spine tint）
   - 游戏会直接识别新 JSON 并出现在角色列表（已实测）
4. **`[Required]` 皮肤必须自动补齐**（差点漏掉整双手）。骨架里有 5 组
   `xxx[Required]/变体` 皮肤，它们**不会出现在 `ActiveSkins` 里**，但游戏一定会装配：
   `B_HairFront/BaseHair`、`G_Outfit/Hand`、`G_Outfit/Leg`、`A_FacialFeatures/Eye`、
   `G_Outfit/OutfitInner`。其中 `Hand` 组含 34 个槽位（`Hand/Hand_L|R/*` 的手掌手指），
   `Leg` 2 个，`BaseHair` 5 个（含发际线 `Face_Front/Hairline`）。
   **只按 `ActiveSkins` 装配的话角色会完全没有手**——游戏导出图里脸两侧那两只白色小手
   就是这么丢的。规则：某 `[Required]` 组若无任何变体已在 `ActiveSkins` 中命中，
   就加载该组**第一个变体**（`Hand1` 是浅色正常手，`Hand2` 是黑边变体，别选错）。
5. **无头渲染的六个关键坑**（改脚本前务必知道）：
   - 本作 Spine 4.3 里 `attachment.region` **恒为 null**，贴图路径只存在于
     `attachment.sequence.regions`；靠自定义 `findRegion` 回退匹配
     （`X_Color[Skin]` → 图集母版 `Base/X_Color`）才能取到图。
   - **必须实现裁剪附件**（最容易漏、后果最明显）。骨架里有 34 个
     `ClippingAttachment`，侧刘海/瞳孔/提示贴纸都靠它裁形。不处理就会把整张图集
     区域画出来，**侧刘海变成盖住脸的矩形色块**。用 `SkeletonClipping`：
     `clipStart` 之后、`clipEnd(slot)` 之前的所有槽位都要切；裁剪范围**包含
     endSlot 本身**，所以顺序必须是"先画当前槽位，再 `clipEnd(slot)`"。
   - 染色必须**保留图集页自身 alpha**：`multiply` 会连同透明区一起填满，
     导致描边网格变成实心块盖住脸部（用 `destination-in` 还原 alpha）。
   - 染色缓存 key 必须含**图集页身份**：多页共用同一染色颜色时会互相串图。
   - **取景必须量"裁剪后"的几何**：侧刘海网格的原始包围盒远大于实际绘制区域，
     用未裁剪的顶点算包围盒会把画布撑大、角色缩小（实测内容只占 64%）。
     绘制与取景共用同一次带裁剪的遍历（`forEachDrawnSlot`）。
   - **判断"是否被裁掉"只能看缓冲区长度，绝不能看返回值**。
     `clipTrianglesUnpacked()` 结尾是 `return clipOutputItems !== null`，而
     `clipOutputItems` 只在**某个三角形跨越裁剪边界**时才被赋值。网格完全落在
     裁剪区内时走"原样输出"分支、返回 false，但缓冲区里装的是**完整正确**的几何。
     所以 `false` 的含义是"无需切割"，不是"没东西可画"。曾经写成 `if (!any) return null`
     把落在裁剪区内的网格全丢了——瞳孔遮罩覆盖整个眼睛，于是眼睛的亮色层
     （`Eye1_Light_*`）整层消失，**两只眼睛变成扁平的暗色圆盘**。
     正确判据是 `clippedVerticesLength === 0 || clippedTrianglesLength === 0`
     （缓冲区每次调用开头都会清零，不存在脏数据）。
6. **形状滑条 = Spine 4.3 原生 slider 约束**（最容易误判成"滑条没用"）：
   骨架里有 **64 个 `SliderData`**，每个指向一个驱动动画，`SliderPose.time`
   决定停在该动画的哪一刻。其中 **44 个是 `Character/*`**（用户可调的形状滑条，
   指向 `CHAR/<名>` 动画），另外 20 个（`AnimationSlider/*`、`Angle/*`）指向
   `HIDE/<名>` 动画、由表情动画自身驱动 —— **角色 JSON 里只该写前者**。
   - **`SliderConstraints[].Value` 的单位是「秒」，范围 `[0, 该滑条动画的时长]`，
     不是 0..1**。例：`BangLeft_Length=0.6` 表示停在第 0.6 秒（该动画时长 1.0 秒）。
     证据来自反编译游戏 `Assembly-CSharp.dll`（`dnfile` + `dncil` 读 IL）：
     `SliderConstraintManager.ApplySliderConstraint` 里是
     `slider.AppliedPose.Time = data.Value`——**直接赋值，无任何缩放**；
     其逆运算 `UpdateValue` 是 `data.Value = AppliedPose.Time`；
     构造函数里 `MinValue = 0, MaxValue = animation.Duration`。
     旁证：内置角色 `SampleCharacter4` 有 `Character/EarShape2 = 2.0`、
     `SampleCharacter2` 有 `Character/MiddleBang_Shear = 1.413`——
     归一化到 0..1 的滑条**不可能**产生这两个值。
   - 渲染器必须把 JSON 的值写进 `slider.pose.time`，**且必须在 `state.apply()` 之后、
     `updateWorldTransform()` 之前**：前者可能覆盖滑条（表情动画会驱动
     `AnimationSlider/*` 那批），后者才是读取它并应用 `CHAR/` 动画的时机。
     不写的话所有滑条永远停在 `SliderData.setupPose` 的默认值（多为中点），
     角色的形状意图被整个丢弃——`MiddleBang_Length` / `BangLeft_Position` /
     `SideHair_Length` / `EarShape1` 会**怎么调都没有任何变化**。
     `render_headless.mjs` 里是 `applySliders()` 函数；
     参数 `--slider-mode value|scaled|none`，默认 `value`（即上述权威语义）。
   - 常用滑条的动画时长（决定取值范围与中性值）：
     `BangLeft/Right_Position` = 1.0 秒（中性 0.6）；`BangLeft/Right_Length` = 1.0 秒（中性 0.3）；
     `MiddleBang_Length` / `MiddleBang_Shear` / `SideHair_Length` / `BackHair_Length` /
     `FrameHairLeft/Right_Length` = 2.0 秒（中性 1.0）；
     `Brows_Distance` / `Brows_Height` = 1.333 秒（中性 0.667）。

## 骨架能力上限（实测结论，**别再重复试**）

以下由**网格穷举**得出（刘海 348 组、全眼型全眉型、发型 134 组、发色/瞳色/肤色/衣色分档扫描、
服装全件扫描），是**部件库的硬上限**，不是参数没调对：

| 想要的 | 现实 | 证据 |
|---|---|---|
| 一整片盖住整个额头的平刘海 | **不存在这种部件**。`HairBangMiddle1..7` 全是「从发缝垂下的中央帘」，宽度只到两瞳孔内缘；被否决的"锅盖"是靠左右束硬拼的 | Z1：288 组 Middle×Left×Right 全扫 |
| 细长眼 **且** 明显上睫毛 | **不可兼得**。`Eye1/Eye2` 的上睑是一大块波浪黑实体（占掉眼睛上半约 40%，像黑眼罩）；`Eye3` 是唯一无上睑的细长眼，但**没有独立睫毛线**，且睫毛与虹膜同色 | Z2 全眼型 + 染绿探针 |
| 去掉/变细那块黑上睑 | **做不到**。`Eye1_Upperlid` 贴图是纯黑，乘法染色后恒为黑；`Character/Eyelash_Length` 滑条对盖形无作用 | Z2 染 `#00ff00` 实测不变 |
| 更细的眉毛 | 只能换部件，**没有粗细滑条**。`Brows1/2/4` 是细眉（B1 最细），B5/6/8 粗块、B7 平直粗条、B9 多条纹 | Z2 全眉型 |
| 长直侧发 | **`SideHair` 只有 `A4Gradient` 合格**；B1..B8 全是短蓬松/卷，A1 是短款 | Z4：34 种 SideHair |
| 服帖的长框发 | `FrameHairL/R` 选 `B3Gradient`/`B4Gradient`；A 系列偏短、A5~A9 波浪外翘、A11 横过胸口 | Z4：30 组（左右镜像） |
| 呆毛 | `AhogeA3` 是锯齿形最像；**但注意 `AhogeB1/B2` 不是呆毛，是整片大假发**，别用 | Z4 |
| 头发披到身后 | **做不到**，发束只能贴在身体两侧前方 | Z4 |
| 让后发「不平」/ 有层次 | **做不到**。后发全骨架只有 **3 种形状**（`BackHair1/2/3`），**都是一整片平直长发**；`HairHighlight*` 挑染**全部位于 `Hair_Front/`（额前刘海区），没有一件落在后发上**；`*Gradient` 版本对深发色看不出差别。唯一能改的是 `Character/BackHair_Length`，而它**只改长度不改形状** | 本机：3 形状 × 滑条 0.0~2.0 全扫 + 8 个 `HairHighlight` 染绿探针 |
| 露腿 / 换鞋袜 | **做不到**。腿脚全骨架只有 **`Leg1`**（槽位 `Body/Leg_L`、`Body/Leg_R`），**没有鞋/袜/靴部件**，只能改颜色 | 808 个槽位全扫 |
| 腿的颜色「默认就对」 | **不是**。`LegLeft`/`LegRight` 默认 `(1,1,1)` **纯白，比角色皮肤还亮**（皮肤实测 `rgb(254,236,238)`），看着像白裤袜而不是腿。要当肤色用就设成 `(0.96,0.82,0.72)`（= `#F5D1B8`） | 本机：改前后像素采样对比 |
| 把**深色贴图**的部件染白/染亮 | **做不到**。多数衣物饰品是**乘法染色**，只能变暗不能变亮（例：贴图底色深的吊带染不成白色） | Z5 |
| 把**浅色贴图**的部件染深 | 可以，乘法生效。但 `*Gradient` 附件会比 tint **再暗约 35%**（贴图自带烘焙阴影），所以"亮刘海 + 暗侧影"是特性不是 bug | Z3 |
| 让眼睛「有神」 | 只能改**明度**，**改不了结构**（虹膜贴图是平的，没有瞳孔/虹膜环），且上睑那条黑边不可调 —— 只能换眼型 | Z2 + 绿探针 |
| 照着参考图设「固有色」 | **别按参考图整体明度取色**。参考图若泡在环境光里（如紫调），你量到的是**光照**不是固有色；按它取色会渲得整体偏亮偏色，换个背景就露馅 | Z3 |

**两条会让人白忙一场的坑**：

1. **「细长眼」是个陷阱指标**。`Eye3` 在几何上确实最扁，但渲染出来因为失去眼睑/睫毛而
   **空洞无神**，观感反而离参考图更远。选眼型时要看**整体神态**，不要只盯长宽比。
2. **新增任何部件后，必须同时确认对应的 `SlotGroup` 存在**。
   JSON 里没有该组就回落到骨架 setup pose 颜色（表现为**纯白或偏红**）。
   **槽位名方括号里就是组名** —— 例如 `Hair_Back/Pigtail/PigtailA_Color_L[PigtailLeft]`
   对应组 `PigtailLeft`，`Outfit_Front/NeckwearC_Color[OutfitNeckwearC]` 对应 `OutfitNeckwearC`。
   查法（骨架里搜关键词，方括号即组名）：
   ```js
   for (const s of data.slots) if (/Pigtail|Halo|Cape/i.test(s.name)) console.log(s.name);
   ```
   **本机实测：角色普遍缺下面这一批组**（只有加了对应部件才需要现建）：
   `PigtailLeft/Right(+Outline)` · `Ahoge(+Outline)` · `HairbandA~D(+Outline)` ·
   `HornLeft/Right/Middle(+Outline)` · `Halo(+Outline)` · `Tail(+Outline)` · `Hat` ·
   `HeadWingLeft/Right(+Outline)` · `Cape/CapeOutline` · `GloveLeft/Right(+Outline)` ·
   **`OutfitNeckwearA/B/C`（连主体色都缺）** · **`OutfitOuter`（主体色）**。
   → 两条最坑的：**`OutfitNeckwearC` 缺失时胸前蝴蝶结颜色改不动**；
   **`OutfitOuter` 缺失时外套恒为骨架默认的白**，看着像"外套没有颜色"。
   组结构可从 `SampleCharacter2.json` 抄（游戏自带样例，本机在
   `%USERPROFILE%\Documents\EmoteLab\Characters\CoffeeBean\SampleCharacter2\SampleCharacter2.json`）。

---

## 硬性规则

1. **绝不在用户当前桌面点击/移动鼠标/按键**。所有 GUI 操作必须通过 `scripts/vdesktop.py`，
   它在名为 `EmoteLab-Auto` 的独立虚拟桌面上工作，并在每次输入前校验当前桌面。
2. 操作结束后必须执行 `python scripts/vdesktop.py done` 切回用户桌面。
3. **不要尝试 PostMessage/后台消息模拟点击**——Unity 引擎不读窗口消息（已实测无效），只会浪费时间。
4. 部件值必须来自 `references/parts-catalog.json`（`proven` = 内置示例/用户角色用过的可靠值；
   `candidate` = 骨架 skin 全清单，权威但个别值可能依赖前提）。
5. 鼠标坐标基于钉定的 1920×1080 无边框窗口（`vdesktop.py launch` 会自动钉）；若用户屏幕更小，
   按截图实际尺寸等比换算，并始终以最新截图实测为准。

## 工作流

### 第 0 步：先跟用户对齐（**别跳过**）

用户通常只会说「帮我做个表情包」，他**不知道这个 skill 能干什么、需要提供什么**。
直接进入"解析需求"会变成瞎猜，或者问出「你要什么 Eye 部件」这种用户答不上来的问题。
先做下面三件事。

#### 0.1 先讲清楚能做什么、不能做什么

用大白话说，**别用部件名/术语**：

> 我可以用 EmoteLab 的模型给你捏一个 **Q 版角色**，然后导出一整套表情包。
> - **能**：选发型/兽耳/服装、调发色瞳色、调刘海和头发长度；一次导出最多 **191 个表情**
>   （覆盖常见情绪和动作：生气、哭、爱心、比心、点赞、打瞌睡、各种道具…）；
>   输出 GIF 或 PNG，尺寸 112 / 128 / 240 / 300 / 500 px 任选；可批量、可复现。
> - **不能**：它是 **Q 版画风**（大头、大圆眼），**做不了写实或半写实**；
>   只能从游戏现有的部件里挑，**不能自由塑形**；给参考图只能做到
>   **「特征接近」而不是「一模一样」**。
> - **需要你**：电脑上装了 EmoteLab（Steam），并且**在游戏里打开过一次这个角色**
>   （游戏要先生成运行时贴图，否则渲染会报 `no texture cache`）。

**如果用户拿着一张写实/半写实插画说要复刻，现在就说清上限**，别等做完了才说做不到。
这种需求最高只能到「特征可辨的 Q 版」，且要迭代好几轮。

#### 0.2 问清三件事（缺哪问哪，一次别问超过三个）

| 要问的 | 为什么问 | 用户怎么答 |
|---|---|---|
| **角色长什么样** | 决定 base 模板 + 部件 + 配色 | 「有参考图吗？没有的话用文字描述也行（发色/瞳色/兽耳/服装风格）」 |
| **用在哪里** | 决定尺寸规格 | Discord → 128px；Twitch → 112px；微信/QQ 表情 → 240~300px；大图贴纸/头像 → 500px |
| **要多少表情** | 决定批量规模与耗时 | 「先出 3~5 个看看效果，满意了再跑全套 191 个」——**默认建议先试水** |

**关于体积**（会反过来决定尺寸，所以必须在动手前定）：本机实测，300px 头肩 GIF、35 帧、
复杂动画（`Luv-2` / `Dance-1` 这类）：

| 配置 | 体积 |
|---|---|
| 300px / 255 色 | ~890 KB |
| 240px / 255 色 | ~630 KB |
| 240px / 128 色 | ~530 KB |
| 240px / 96 色 | ~470 KB |

**体积对 `--size` 近似平方敏感、对 `--gif-colors` 很不敏感**。要压体积**先降尺寸**，
别先降颜色——降颜色会把 GIF 的跳色问题重新放大（见故障排查）。反过来，**自用**
（QQ / Discord 自定义表情从相册添加）通常没有严格上限，`~890 KB` 完全够用，
**别为了想象中的限制牺牲画质**。只有**投稿**到平台才需要死抠官方上限。

**前置检查**（问完再动手）：`Documents\EmoteLab\Texture Cache` 里有没有该模型的贴图目录。
没有就让用户先在游戏里打开一次角色。

#### 0.3 用户说不出细节时，给选项而不是让他从零描述

用户不知道有哪些部件。**别问"你要什么部件"，直接给方向让他选**：

- **风格方向**：猫耳娘 / 兔耳 / 无兽耳日常 / 恶魔角 / 精灵耳 / 机械风 / 天使光环翅膀…
- **发色**：给几个常见色（黑灰、棕、金、粉、蓝、白）+ 允许直接指定 hex
- **瞳色**：同上（注意参考图的**环境光污染**——紫光下的黑发别当成紫发，见故障排查）
- **服装**：内置 7 套内搭 + 外套/领饰/围巾等配件
- **表情包内容**：如果用户没指定，**主动推荐一套常用的**（下面这些已核对存在；
  完整 191 个清单见 `references/animations.csv`，**别凭印象编动画名**）：
  `Angry` 生气 / `Luv-1` 爱心 / `Cry-1` 哭 / `Laugh` 笑 / `Cheer` 加油 /
  `Sleep-Normal` 睡觉 / `Alert-Heart` 提示爱心 / `Pat` 摸头 / `Point` 指 / `Dance-1` 跳舞。
  再问「够吗？还是全都要」，而不是默认全量跑 191 个（那要 8 分钟 + 峰值 1.1 GB 内存）。

#### 0.4 交付前先给 1~2 张试看，再做全量

用户没看到效果就批量跑 191 个，多半要返工。**先渲染一张静态全身图 + 一个表情 GIF**
给用户确认外貌，确认后再跑批量。这一步能省掉大量重复劳动。

---

### 第 1 步：解析需求

把第 0 步问到的信息**落成具体参数**（若用户一上来就给了完整描述，可跳过第 0 步）：
- **基础模板**：查 `references/sample-characters.txt`（8 个内置角色的部件+发色速查），
  选外观最接近的作 base（发型体系差异大，选好 base 事半功倍）。
- **部件覆盖**：查 `references/parts-catalog.json`。关键词→槽位用中文对照
  `references/slot-groups.csv`（眉毛= Brows、兽耳= AnimalEar、眼镜= Glasses…）。
- **颜色**：通道有 `hair / hair_back / outfit / eye_dark / eye_light / brow / eyelash`，
  指定 `--color hair=#ff8c00`（脚本会保持明暗关系做 HSV 替换）。
- **滑条**：`references/sliders.csv`（滑条中文名，如 `Character/EarShape1` 耳朵形状）。
  **注意取值单位是「秒」不是 0..1**（见架构第 6 条）；不知道时长就先查，
  或用 `--slider` 传值后渲染一张确认。刘海/头发相关滑条见下面「捏脸速查」。
- **要导出的表情**：`references/animations.csv`（中文→动画名，如 生气→ANIM/Angry、
  哭 1→ANIM/Cry-1、爱心 1→ANIM/Luv-1）。

#### 捏脸速查（实战结论，改部件前先看这里）

**刘海 / 中分**（最容易做错的地方）：
- `HairBangMiddle` 本身就是**尖角中分**的形状 —— 只调 `MiddleBang_*` 滑条
  **永远调不出齐平刘海**，想要平刘海必须**把这个 Key 删掉**。
- 要「中分、刘海自分缝两侧垂下遮住额头」：
  `HairBangMiddle2` + `HairBangLeft2` + `HairBangRight2`，
  `BangLeft/Right_Position=0.8`、`BangLeft/Right_Length=0.6`。
- 要「齐平额发盖到眉毛」：删 `HairBangMiddle`，用 `HairBangLeft1`+`HairBangRight1`，
  `Position=0.8`、`Length=0.45~0.6`。
- `BangLeft/Right_Position` **越小越向中间合拢**（0.4 ≈ 合并成一整片、1.0 = 分开露额）。

**长发形状**：`FrameHairL_A2Gradient` + `FrameHairR_A2Gradient` + `SideHairA4Gradient`，
配 `FrameHairLeft/Right_Length=1.3` / `SideHair_Length=1.6` / `BackHair_Length=0.9`
最接近「长直发、服帖、垂到胸前」。

**头发高光 / 反光（`HairShine`）—— 标准流程必加项**

参考图里头发上那道"反光"，来源是 **`HairShine` 槽位**，常用值 **`HairShine1`**
（一次画出两个图形：横贯头顶的波浪笔触 + 右侧小圆点）。
**不是** `HairHighlight*` —— 那批的中文名是"**挑染**"，落在侧发与中缝，不是高光。
（⚠️ 本文件早前写过"HairShine 是星形高光贴纸，不需要就删"——**那是错的**：星形是值 `2`，
值 `1` 才是波浪笔触。装不装也不该随手删，见下。）

- 颜色归 `SlotGroup` **`HairShine`** 管；深色头发上要看得见，tint 必须**明显偏亮**
  （`(1,1,1)` 实测渲出纯白 `#ffffff`）。
- **两个坑会叠加**，缺一个都看不到：
  ① `ActiveSkins` 里要装 `{"Key":"HairShine","Value":"HairShine1"}`；
  ② 该组 `TintColor` 不能是深色 —— 很多角色默认给的是 `#34343A` 量级的暗色，**装了也看不见**。
- 值 `1..7` 形状：`1`=波浪笔触+小圆点 · `2`=四角星+星芒 · `3`=菱形块 · `4`=心形 ·
  `5`=圆团块 · `6`=椭圆气泡 · `7`=大弯笔触+椭圆。带 `Outline` = 同形+深描边
  （描边归 `SlotGroup` `HairShineOutline`，tint 建议 `(0.16,0.16,0.20)`）。
- **缺 `HairShine` 组时它照样显示**，颜色回落到骨架 setup pose 的**纯白**
  —— 即"看得见但**颜色不可控**"。补一条组结构即可：
  ```json
  { "Name": "HairShine", "TintColor": { "r": 1.0, "g": 1.0, "b": 1.0, "a": 1.0 },
    "TintBlackColor": { "r": 0.0, "g": 0.0, "b": 0.0, "a": 1.0 }, "RenderMode": 1 }
  ```
- **`a`(alpha) < 1 在无头渲染器有交叉网格伪影** —— 想柔和请改亮度，别用 alpha。
- **默认就加**：除用户明确说"不要高光"外，每个角色的表情包都装上 `HairShine1` 并把该组
  染亮（深色头发尤其必要，否则整头是一块死黑、没有体积感）。

**眼睛**：`Eye1` 干净；`Eye2` 自带一块**红色眉骨**部件（想避免红块就用 `Eye1`）。

**眼睛配色改哪个组（纯绿探针实测，别猜）**：一只眼从外到内分三层，各归各的 SlotGroup：

| 你看到的 | 归谁管 | 能否调整 |
|---|---|---|
| 最外那圈**黑色上睑/睫毛** | **不归任何可调组** | 贴图本身是纯黑，染色恒为黑，**去不掉也改不细** |
| **虹膜外环** | `EyeDarkLeft/Right`（频道 `eye_dark`） | 可自由调 |
| **虹膜内盘**（最大的那块） | `EyeLightLeft/Right`（频道 `eye_light`） | 可自由调，**想「深邃」改这一支** |
| 白色小高光 | 不归这两组 | 固定白点，不受染色影响 |

- 复现方法：把两组分别染 `#00ff00` 各渲一张 —— 绿只出现在各自那一层，互不重叠。
- 这两层贴图是**近白底**，染色 ≈ **直接指定颜色**，可自由调亮调暗
  （不像衣物/发色那样只能变暗）。固定坐标采样实测：内盘渲染色 = `eye_light` 的 tint，1:1。
- 但**「眼睛空洞无神」基本不是染色问题**，是眼型贴图本身没有瞳孔/虹膜环/放射纹，
  染色救不回来，只能换眼型（见「骨架能力上限」）。

**眉毛**：`Brows3` 最细淡。位置用 `Brows_Distance` / `Brows_Height` 调
（都属 1.333 秒档，中性 0.667）。

**⚠️ 眼睛上方出现红色块 —— 不是渲染 bug**：`Eyelash` / `SkinOutline` 这两个
SlotGroup 在部分角色（S7 派生的 `OrangeCat`/`RefGirl*`）里**根本不存在**，
渲染就回落到骨架 setup pose 的 `(0.541, 0.208, 0.251)`（偏红），
看起来像"眼睛上方糊了块红色"。补上这两个组并染色即可，
组结构可照抄 `SampleCharacter2.json`（它是少数带 `Eyelash` 组的角色）。

#### 服装速查（全量扫描结论，选衣服前先看这里）

**后发 / 侧发 / 发束**（选发型前先看，本机全量扫描结论）：

| 部件 | 可用值 | 说明 |
|---|---|---|
| `BackHair` 后发 | `1` / `2` / `3`（各带 `Gradient` 版） | **只有 3 种**，都是一整片平直长发；`3` 最宽最长，`1` 最短。**没有蓬松/卷曲款** |
| `Character/BackHair_Length` | 滑条 | **只改长度，不改形状**（0.0~2.0 实测等比拉长） |
| `SideHair` 侧发 | `A2G/A3/A4G/A5G/A6G/A8G...` | `A4Gradient` 最合格（长直）；B 系短蓬松 |
| `FrameHairL/R` 框发 | `A2/A2G/A4G/A8G/A10G/B1/B2G/B3G/B4G` | 想服帖选 `B3Gradient`/`B4Gradient` |
| `PigtailLeft/Right` 双马尾 | `A/B/C` 各带 `Color`/`Gradient` | 后发"分束"的唯一手段 |
| `Ponytail` 马尾 | `A` / `B` | 束在脑后，**正面视角基本看不到** |
| `Ahoge` 呆毛 | `A3` | 其余的 `AhogeB1/B2` 是整片假发，别用 |
| 后发**高光/挑染** | **不存在** | `HairHighlight*` 全在 `Hair_Front/`（额前），没有一个落在后发上 |

**衣身** `OutfitInner1..8`：`1/2/3/5/6/7` 都是 V 领 A 字裙，差别只在领口与裙摆；
**只有 `OutfitInner8` 带波浪荷叶裙摆**（chibi 比例下很小，正面常被头发挡）；`OutfitInner3` 最干净。

**领口** `OutfitInnerCollar`（**最影响观感的一件**）：
`1/2/3` 系带领 · `4/5` 荷叶褶边（`4` 蕾丝感最强）· `6` 大平蝴蝶结领 ·
**`6_String` = 全库唯一的「细吊带」** · `7` 宽 V 镶边。
想要吊带/睡裙感，`OutfitInnerCollar6_String` + `NeckwearC2`（胸前小蝴蝶结）是唯一组合。

**颈饰**：`NeckwearA1..6` 全是**低对比胸前垂布**（配白衣几乎看不见）；
`NeckwearB1..7` 全是**厚围巾/大领巾**（轻薄装束一律排除）；
`NeckwearC1..3` 中 **`C2` = 胸前小蝴蝶结**。

**外套** `OutfitOuter1..7`：全是**泡泡袖短外套/披肩**（不透明，套上会盖住胸前的领结/吊带）。
要不要加**取决于参考图有没有外搭** —— 参考图若是「吊带 + 外披开衫」，加一件反而更像；
若是纯吊带，加了只会偏离。**先看清参考图再决定，别默认"露肩=不加"。**
> ⚠️ 角色 JSON 里通常**没有 `OutfitOuter` 主体组**，加了外套也只会渲成骨架默认的白色。
> 想给外套上色，先补组 `OutfitOuter`（主体）+ `OutfitOuterOutline`（描边）。

**⚠️ 细吊带的颜色改不动（实测三轮，别再试）**：`OutfitInnerCollar6_String` 那两根吊带
渲出来是深灰，染不白。证据：

1. 把角色现有 **62 个 `SlotGroup` 全部染纯绿** → 只有吊带和胸前白条**颜色一点没变**；
2. 补 `OutfitInnerCollar` / `OutfitInnerCollarOutline` 组再染 → 与不补**差异像素 0**；
3. 单独改 `OutfitCollar` / `OutfitInner` / `OutfitInnerOutline` → 吊带无变化。

→ 吊带颜色**不归任何能从角色 JSON 设置的组管**，是贴图自带的。
所以「白色细吊带睡衣」只能二选一：**白裙身 + 深灰吊带**，或者**不用吊带款**（改干净的
`OutfitInnerCollar3`，胸前无深色元素，观感更接近"白睡衣"）。

**拼不出来的**：V 领露肩剪裁、透明蕾丝材质、把深色部件染白（见「骨架能力上限」）。

#### 配色规律（决定「自然」还是「糖果贴纸」）

**这是最容易翻车的一环** —— 色值看着都"对"，渲出来却怪。从两张参考图定量提取后，
差异集中在**四个数字**上：

| 指标 | 参考图实测（自然） | 本机翻车案例 |
|---|---|---|
| **深色区面积占比** | **20.5% / 15.7%** | ≈0（描边是白的） |
| 主色明度 | 中位 0.53 ~ 0.88 | 0.90 ~ 0.95（全挤在高位） |
| 主色饱和度 | 中位 0.07 ~ 0.35 | 0.22 ~ 0.29 |
| 高饱和点缀占比 | 9.6% / 12.5% | 大面积 |

**最大的一处是描边**。衣物默认的 `Outfit*Outline` 全是**白色** `(0.992,0.965,0.973)`，
等于把轮廓线抹掉，整件衣服糊成一片亮色 —— "糖果贴纸感"就是这么来的。
参考图里深色区占到 **15~20% 面积**，衣服才立得住。
**改配色时第一个要动的就是 `*Outline`，把它压深**（V≈0.35~0.45）。

> ⚠️ **别只盯饱和度**。本机翻车时主色饱和度（0.22~0.29）其实**低于**参考图 1（0.35），
> 真正的病因是**明度全在 0.9 以上 + 白描边**，画面缺深浅层次。用户的原话是"颜色太奇怪"，
> 而按饱和度去找原因是找错了方向。

**从参考图取配色的正确做法**（**不是**吸管取色）：

1. 跑 `python scripts/analyze_palette.py <参考图>` 拿到那四个数字；
2. 把它们当**约束**，用角色**固有色**去填，而不是抄具体色值；
3. 渲一版对比，不对再调。

实测有效的一档（本机最终采用）：主体 `V=0.85 S=0.11`、描边 `V=0.43`、领饰点缀 `S≈0.33`。

### 第 2 步：生成角色

```bash
cd <skill目录>/scripts
python generate_character.py --name OrangeCat --base SampleCharacter7 \
  --set AnimalEar=AnimalEar7 --set Eye=Eye2 \
  --color hair=#ff8c00 --color eye_light=#7ecfff \
  --slider "Character/EarShape1=0.8"
```

- `--list-slots` 打印部件词典；`--dry-run` 试算。
- 输出文件直接写入 `Documents\EmoteLab\Characters\CoffeeBean\<名>\<名>.json`。
- 同名角色自动加后缀" 2"。
- **生成后必跑** `python check_group_families.py <角色.json>`：确认没有同族 tint 偏离。
  偏离会渲成一块盖在正常部件上的**颜色补丁**（本机踩过，占画面 11.45%，见故障排查）。

**`--color` 与 `--color-mode`（换色时最容易出错的地方）**

通道名用**下划线**：`hair` / `hair_back` / `outfit` / `eye_dark` / `eye_light` / `brow` / `eyelash`
（连字符也接受，但拼错现在会直接报错并给出建议，不再静默失败）。

`--color-mode` 决定**亮度怎么处理**，直接影响"染出来是不是我要的深浅"：

| 模式 | 行为 | 什么时候用 |
|---|---|---|
| `hue`（默认） | **只换色相，保留原部件的明暗层次** | 新旧颜色亮度接近时（如把亮粉染成亮蓝） |
| `full` | **连亮度一起换成目标值** | 要大幅改变深浅时 |

实测对照（目标 `#3a302e` 深棕，源色是 S7 的亮粉 `(0.755,0.168,0.265)`）：

```
hue  -> (0.896,0.598,0.538)   浅橙粉   ← 完全不是深棕，只借了色相
full -> (0.326,0.270,0.259)   深棕     ← 正确
```

> **`hue` 是默认值，但它会让"染深色"失败**——因为原色亮度高，色相换了亮度没换。
> 用户说"头发要黑色/深棕"却出来浅色，就是这个原因。**要改深浅务必显式传 `--color-mode full`。**

- `--force`：跳过部件词典校验（用于词典里还没有的值，会提示"verify in game"）。

### 第 3 步：导出表情

**路线 A（首选）— 无头渲染，零 GUI 零抢屏：**

```bash
cd <skill目录>/scripts/headless
npm install          # 首次: canvas + gifenc + spine-canvas/core 4.3.13（需 node ≥ 18、python + UnityPy）

# 先跑内存预估（不渲染，秒回）：告诉你在本机内存下能一次跑多少张
node render_headless.mjs <角色json> x.png --all-emotes --plan --size 300

# 静态图（整角色）
node render_headless.mjs <角色json> out.png
# 单个表情 GIF
node render_headless.mjs <角色json> out.gif --anim "ANIM/Laugh" --frames 24 --fps 16
# 批量导出（推荐：一次覆盖全部 191 个表情）
node render_headless.mjs <角色json> x.png --all-emotes --out-dir out/ \
  --size 112 --zoom 0.45 --fps 16          # Twitch 动态表情（大头照）
node render_headless.mjs <角色json> x.png --all-emotes --out-dir out/ --only "Angry,Cry-1,Luv-1"
```

**批量前必做：先看内存方案。** `--plan` 只读环境不渲染，直接给出建议批量：

```
固定基线: 430MB | 每表情: 2.4MB | 可用内存: 10181MB
本次安全量: 1507 个 | 预估峰值: 889MB | RSS 护栏: 11345MB
建议: 当前可用内存下可以一次跑完 191 个表情（预估峰值 ~889 MB）
```

实测参考（16GB 机器、191 个表情、32 帧/个）：

| 分辨率 | 峰值 RSS | 全量 191 个耗时 | 总产物 |
|---|---|---|---|
| 112×112 | ~500 MB | 约 3 分钟 | 约 22 MB |
| 300×300 | ~1.1 GB | 约 8 分钟 | 约 61 MB |
| 500×500 | ~650 MB | 约 13 分钟 | 约 128 MB |

**内存安全机制**（不需要手工分批，但知道有这些开关有好处）：

- 渲染器是**单进程顺序**跑的，显存/内存占用有上界，不会随批量数累加。
- `--max-rss-mb N`：RSS 超过该值就**干净地停下**并报告剩余多少个，
  已完成的 GIF 全部保留。默认 = 总内存的 70%。
- 中途停掉后用 `--only "A,B,C"` 续跑剩下的部分即可。

**先决定「全身」还是「大头照」** —— 最容易被忽略、又最影响观感的一项。

`--zoom` 是**中心对称裁切**：`0` = 整角色入画，值越大越近（每边裁掉 `zoom/2`）。
实测画面（`_emotelab_verify\ZOOM_CALIB.png`）：

| `--zoom` | 实际画面 | 适合 |
|---|---|---|
| `0` | **全身**（含腿脚） | 角色立绘、确认设定 |
| `0.2` | 头到腰（半身） | 想看到服装/姿态 |
| `0.3` | **头肩特写**（头到胸口） | 通用表情包 |
| `0.4 ~ 0.5` | **大头照**（脸占满画面） | emoji / 头像 / 小尺寸表情 |
| `> 0.55` | 过紧，切掉头顶或下巴 | 不建议 |

**经验规则**：

- **尺寸越小越要放大**。112 / 128 px 的 emoji 若出全身，脸只有十几像素，没人看得出是谁
  → 小尺寸配 `~0.45` 的大头照。
- **用户说「表情包」时默认给大头照**（`0.4~0.45`）——他要的多半是能看清表情的脸，
  不是全身。若确实要全身，**显式问一句**。
- 让用户确认角色长啥样时用 `--zoom 0` 出全身静态图（对应第 0.4 步的试看）。

**各部位在不同取景下的可见度**（本机实测，**选部件、定配色前先看这张表**）：

| 部位 | 头肩 (0.3~0.35) | 半身 (0.2) | 全身 (0) |
|---|---|---|---|
| 发夹 / 发带 / 兽耳 / 角 / 呆毛 / 眼镜 | ✅ 辨识度高 | ✅ | ✅ |
| 刘海 / 侧发 / 框发 | ✅ | ✅ | ✅ |
| **领子 / 领饰 / 外套肩部** | ✅ **看得见** | ✅ | ✅ |
| 后发主体 | ❌ 被大头挡住 | 部分 | ✅ |
| 衣服下摆 / 裙摆 | ❌ | ✅ | ✅ |
| **腿 / 脚** | ❌ | ❌ | ✅ 但只在底部占很小一条 |

> **两条实战教训**：
> 1. **别想当然认为"服装在头肩取景下看不到"** —— 领子和外套肩部**是看得到的**，
>    服装配色会真实反映在表情包里。本机一度按"看不到"判断，结果给用户做了
>    一批他根本分不出区别的方案，白费一轮。
> 2. **反过来，后发在头肩取景下基本看不到**（被大头挡住），
>    但**侧发和框发的改动看得到** —— 用户说"两边头发改短"时，
>    真正起作用的是 `SideHair_Length` 和 `FrameHair*_Length`。

**目标规格速查**（`--size` 定边长，`--zoom` 定特写程度）：

| 用途 | 参数 | 画面 |
|---|---|---|
| Twitch 动态表情 | `--size 112 --zoom 0.45 --fps 16` | 大头照 |
| Discord 动态表情 | `--size 128 --zoom 0.45 --fps 16` | 大头照 |
| 微信 / QQ 表情 | `--size 240 --zoom 0.40 --fps 16.7` | 大头照 |
| 300px 通用 GIF | `--size 300 --zoom 0.35 --fps 16.7`（对齐游戏 GIF-300px 预设） | 头肩 |
| 大图贴纸 | `--size 500 --zoom 0.45` | 大头照 |
| 半身像 | `--size 500 --zoom 0.2` | 头到腰 |
| 整角色全身像 | `--size 500`（`--zoom` 留空 = 0） | 全身 |

> 游戏内置 GIF 预设的实际帧率是 **16.7fps**（`RecorderFps: 16.7`，即 60ms/帧），
> 见 `StreamingAssets/Config/Export/*.json`；脚本默认 16fps。
> 要与游戏导出完全对齐就显式传 `--fps 16.7`。
>
> **不要拿游戏导出图去"复刻构图"**。那些预设里**只有宽/高/帧率/编码器**，没有任何相机或
> 缩放字段（键只有 `RecorderWidth/Height/Fps/MaxFrameCountEnabled/MaxFrameCount/Encoder`）。
> 游戏导出那种"怼脸"是导出时在编辑器里**手调的相机**，而且可以平移；
> `--zoom` 只能中心对称裁切，**没有平移参数**，复现不了那个构图。
>
> 但**可以**拿游戏导出图**校准"紧度档位"**（不是复刻构图）。实测：游戏自己的表情 GIF
> 对应 `--zoom ≈ 0.34`，与上面 `0.30~0.35 = 头肩` 的区间一致。
> 在该档位下头顶道具（宝石/金币/爱心/星星等）**仍完整在框内**，不会被切。

常用参数：

| 参数 | 默认 | 说明 |
|---|---|---|
| `--anim NAME` | — | 单个动画（`ANIM/Angry` 或 `Angry`） |
| `--frames N` / `--fps F` | 30 / 16 | 帧数与帧率，`--frames-cap` 限制批量时每动画上限 |
| `--size N` | 500 | 输出边长（px） |
| `--zoom F` | 0 | 中心对称裁切（每边裁 `F/2`）：`0`=全身，`0.3`=头肩，`0.45`=大头照；`>0.55` 会切到头顶 |
| `--bg C` | transparent | `transparent` 或 `#rrggbb` |
| `--only "a,b"` | — | 批量模式下只跑列出的动画 |
| `--plan` | — | 只打印内存预估与建议批量，不渲染 |
| `--max-rss-mb N` | 总内存×0.7 | RSS 护栏，超限即干净停止 |
| `--batch-size N` | 自动 | 本次最多渲染几个，其余留给下次 |
| `--seam-eps F` | 0.6 | 相邻三角接缝的重叠像素；出现网格细线就调大 |
| `--tint-cache-mb N` | 256 | 染色页缓存上限；**不要调太小**（见故障排查） |
| `--slider-mode M` | `value` | 滑条值语义：`value`=JSON 值就是秒（权威）；`scaled`=值×时长；`none`=不应用滑条 |
| `--no-frame-content` | 关 | 跳过"按内容取景"那一遍扫描，直接用骨架头部框。**调试用**：出图会留白多，但能区分"取景问题"和"绘制问题" |
| `--all-emotes` / `--out-dir D` | — | 批量导出全部 191 个到目录 D。每动画帧数 = `ceil(时长 × fps)`，上限 `--frames-cap` |
| `--gif-colors N` | 255 | GIF 调色板槽数（ffmpeg `palettegen` 的 `max_colors`）。**降它会重新放大跳色**，优先降 `--size` |
| `--no-ffmpeg-gif` | 关 | 关回内置 `gifenc` 路径（产出与改动前逐字节相同，**对照/排障用**） |
| `--palette-round N` | 1 | `gifenc` 路径的取整档位。**保持 1**：`>1` 会把深色头发染成偏蓝 |
| `--antialias M` | default | **实测在 node-canvas 3.2.3 上是空操作**（`none` 与 `default` 渲染逐字节相同），留作前向兼容 |
| `--webp-lossy` / `--webp-quality N` | 关 / 90 | 输出 `.webp` 时用有损；默认无损 |

> **三种动画格式的帧延迟是统一的**：`8/12/15/16/16.7/24/30 fps` 下，GIF(ffmpeg)、GIF(gifenc)、
> APNG 三条路径的每帧延迟**逐一致**（`--fps 16` → 6cs → 60ms）。这是靠共用同一个
> `csDelay` 保证的，**改动编码分支时不要各自算**（曾经 GIF 60ms、APNG 62.5ms，同一份
> `--fps 16` 差 4%）。故意保留 `--fps 16` 的 62.5→60ms 截断，是为了不改变已有产物的速度。

- **已实测正确**：几何、皮肤装配（含 `[Required]` 自动补齐）、`SlotGroups` 染色、
  **形状滑条（`SliderConstraints` → `SliderPose.time`）**、透明背景、
  **裁剪附件**、批量模式。
  与游戏「导出动画」的 112×112 产物逐帧比对：轮廓 IoU ≈ 0.97（对照：游戏自身
  相邻帧 IoU 也是 0.97~0.99），且逐帧轮廓变化与游戏一致（32/32 帧）。
  渲染同一动画的取景与帧率无关，不会漂移。
- **透明背景**（曾整个坏掉）：`gifenc` 默认把透明索引放在 0 号色，而 0 号色往往是
  不透明色，于是导出的是**黑底**。正确做法是找到或新建一个 alpha=0 的调色板槽位，
  传 `transparent: true, transparentIndex`。校验方法：读回 GIF，
  `im.info['transparency'] == 255`、四角像素 `(0,0,0,0)`。
  游戏原图就是这个规格（见故障排查里的基准）。
- **双色着色（`darkColor`）目前未实现，这是上游行为不是缺陷**：
  `spine-canvas` 的 canvas 渲染器本身就不支持 Spine 双色 tint
  （`dist/SkeletonRenderer.js` 里完全没有 `twoColor`/`darkColor` 相关代码，
  只有 WebGL 路径的 `clipTrianglesRender` 才处理）。角色 JSON 里各 SlotGroup 的
  `TintBlackColor` 会被写进 `pose.darkColor`，但渲染时被忽略。
  已确认这不影响眼睛/高光观感，无需修。
- **表情总数就是 191 个**：骨架共 263 个动画 =
  `ANIM/` **191**（真正的表情，全部会被 `--all-emotes` 导出）
  + `CHAR/` 49（**形状滑条的驱动动画**，如 `CHAR/EarShape1`）。
    注意 **49 ≠ 滑条数**：其中 **44 个**各有对应的 `Character/*` 滑条，
    剩下 5 个（`CHAR/BangSide_Length` / `BangSide_Position` / `BangSide_Shear` /
    `FrameHair_Length` / `Horn_Length`）是**组合驱动**，没有暴露成独立滑条。
  + `HIDE/` 22（部件开关与表情参数驱动，如 `HIDE/Anim_EyeHighlightOff`）。
    另有 **20 个滑条**（`AnimationSlider/*` 16 个 + `Angle/*` 4 个）指向这批动画，
    由表情动画自身驱动，**不是给用户调的**。
  + 1 个无前缀。后两类是**驱动动画，不是独立表情**，不要当成"漏掉的预设"。
  - 对账：**64 个 `SliderData` = 44 个 `Character/*` + 16 个 `AnimationSlider/*` + 4 个 `Angle/*`**；
    前 44 个指 `CHAR/` 动画，后 20 个指 `HIDE/` 动画。
    只有 `Character/*` 是角色 JSON 里该写的（`SliderConstraints`）。
- 全量 191 个表情 @300×300 实测：**191/191 成功、0 失败**，峰值 RSS 1077MB。
- 取景前会先按动画**完整时长**扫一遍包围盒（与 `--frames` 无关），
  因此同一表情在不同帧数下构图一致、且整段动画不会漂移出画。
- 导出尺寸/帧率可对齐游戏内置预设（`StreamingAssets/Config/Export/*.json`：
  GIF-300px-16fps、GIF-500px-16fps、GIF-Discord-AnimatedEmoji 等）。
- 渲染前需**至少用游戏打开过一次该角色**，以生成 `Documents\EmoteLab\Texture Cache`
  里的运行时贴图；否则脚本会报 `no texture cache`。

**路线 B（兜底）— 游戏内 GUI 导出（独立虚拟桌面）：**

```bash
python scripts/vdesktop.py launch          # 建 EmoteLab-Auto 桌面+启动游戏+移窗口+钉 1920x1080
python scripts/vdesktop.py shot shot1.png  # 截图确认加载完成
python scripts/vdesktop.py click 205 145 --shot s2.png   # 点第一个模型 CoffeeBean
# 角色列表出现后，找到目标角色行点击（命中区域比视觉位置低一行，注意实测校准）
python scripts/vdesktop.py click 190 <行y> --shot s3.png
# 右上角第 5 个页签 = 导出面板 (约 x=1380 y=85)，选动画→选格式→导出
python scripts/vdesktop.py done            # 切回用户桌面（必须）
```

- 导出文件落在 `Documents\EmoteLab\Export`，按 `--anim` 选好动画后点导出。
- 每次点击都带 `--shot` 验证结果，界面改版时以实际截图为准重新校准坐标。
- UI 参考（1920×1080）：模型列表首项 (205,145)；角色列表行距 ≈39px、首行 y≈645；
  右侧页签 5 个：服装(1085,85) 妆容(1160,85) 配件(1240,85) 图层(1320,85) 导出(1380,85)。

### 第 4 步：交付

- 把产物复制到用户指定位置（默认给 `Documents\EmoteLab\Export` 下的文件路径）。
- 报告：角色名、部件清单、颜色、导出的表情和文件。

## 故障排查

- **游戏列表没有新角色**：确认路径为 `...\Characters\CoffeeBean\<名>\<名>.json`
  （目录名与文件名必须一致）；重启游戏。
- **部件缺失/位置不对**：该值可能不适用于当前槽位 → 换 `proven` 值重试。
- **角色 JSON 报 unknown value**：跑 `python scripts/build_catalog.py` 重建词典
  （需要 node；词典来自骨架 skin 全清单）。
- **无头渲染报 `no texture cache`**：先在游戏里打开一次该角色，让游戏生成运行时贴图。
- **无头渲染出网格细线**：三角形接缝 → 调大 `--seam-eps`（0.6 → 1.0）。
- **批量渲染把内存吃满 / `createCanvas` 报 out of memory**：
  先跑 `--plan` 看建议批量。历史上这里有两个坑，改代码时别踩回去：
  1. **染色页缓存上限不能低于实际工作集**。一个角色通常需要 ~27 个
     (图集页,颜色) 组合（每张 1024² RGBA = 4MB，合计 ~108MB）。把上限设到
     8 项会**每帧重建被淘汰的页**，这种大块 native 分配的抖动会让**单个动画**
     就吃掉 4GB（实测 4083MB → 调到 256MB 上限后降到 606MB）。
  2. **帧必须流式编码**，不要先把 N 帧的 RGBA 全存进数组再统一编码。
  另配 `--max-rss-mb` 护栏：超限即干净停止并保留已完成的文件。
- **侧刘海/头发变成矩形色块盖住脸**：裁剪附件没生效。确认
  `render_headless.mjs` 里 `forEachDrawnSlot` 仍在调用
  `clipper.clipStart/clipEnd`，且是"先画、后 `clipEnd(slot)`"的顺序。
  这是本项目最容易回归的缺陷，改动绘制循环后务必重渲一张全身图核对。
- **眼睛变成扁平的暗色圆盘（没有黄色/亮色眼球）**：`clipGeometry` 里用返回值
  `!any` 判断"被裁掉"了。返回 false 只表示"没有三角形跨越裁剪边界"，即网格
  完整落在裁剪区内、应当**原样绘制**。改成只看
  `clippedVerticesLength === 0 || clippedTrianglesLength === 0`。
- **GIF 里"所有贴图在反复变颜色，一个颜色跳到另一个又跳回来"（已解决，真根因已量化）**：
  根因不是笼统的"GIF 只有 256 色"，而是**编码器把画面量化成了大片"平台"**。两个因素叠加：
  1. **调色板来源**：旧代码"按出现频率取前 255 个真实颜色"，等于把 255 个槽全给了平坦色块，
     整条抗锯齿混色带**没有自己的表项**，只能吸附到最近的平坦色 → 量化后压成平台。
     实测 300px 一帧 Luv-2：**平坦像素 7069**，而无损渲染只有 **3315**。
  2. **`applyPalette(..., 'rgba4444')` 粗查表**：把 17×17×17 的颜色邻域压成一格，是**平台的
     放大器**。只把查表换成精确最近邻、调色板一个字不改，Luv-2 就从 55.4% 降到 **37.0%**
     （平坦像素 7069 → 3566）。
  平台一旦跨越运动内容，就在两个**相距很远**的表项之间翻槽 —— 这就是看到的"反复变颜色"。
  （顺带：修复前**游戏自己导出的 GIF 比我们还差**，同一动画两帧抖动口径 80% vs 64%，
  所以这不是"我们不如游戏"。）
  **已排除的原因（都做过对照，别再走一遍）**：`--seam-eps` 0→5.0（头发区 std 41.44→41.18，
  无效）、透明 vs 白底（同样跳）、`canvas.antialias='none'`（node-canvas 3.2.3 **完全不生效**，
  两张渲染逐字节相同）、去掉高光槽位（40.30→40.32）、动画颜色关键帧（**全骨架 263 个动画里
  0 条**，已用时间轴 dump 确认）、帧率 12→50fps（总变化量不变）。
  **现行解法（已是默认，别再改回去）**：`.gif` 走 ffmpeg
  `palettegen(max_colors=255) + paletteuse(dither=none)`，自适应调色板把颜色铺满整个分布。
  实测（35 帧 @300px，跳色率 = 平坦像素上相邻帧亮度变化 >6 的占比）：

  | 动画 | 修复前 | 修复后 | 同动画无损 APNG |
  |---|---|---|---|
  | Luv-1 | 29.0% | **12.0%** | 11.4% |
  | Luv-2 | 55.4% | **38.8%** | 39.0% |
  | Angry | 42.9% | **15.9%** | 14.9% |
  | Sleep-Normal | 0.4% | **0.0%** | 0.0% |

  即已降到**无损地板**（差额 ≤0），逐像素误差 p99 从 41 降到 **11**，平坦像素 7069 → 3596。
  **代价是体积约 1.8x**（488KB → 883KB）——多出来的是原本被平台抹掉的渐变细节，不是浪费；
  要压可用 `--gif-colors 192`（-5%）。`--no-ffmpeg-gif` 关回旧 gifenc 路径（产出逐字节不变），
  ffmpeg 缺失或失败时自动回落并打警告。
  **跳色严重程度与动画强相关**：`Sleep-Normal` 这类几乎不跳，`Luv-2` 最重。**别拿单个动画的
  数值当通用结论**，汇报时必须写清是哪个动画、什么口径。
  **已排除的原因（都做过对照，别再走一遍）**：`--seam-eps` 0→5.0（头发区 std 41.44→41.18，
  无效）、透明 vs 白底（同样跳）、`canvas.antialias='none'`（node-canvas 3.2.3 **完全不生效**，
  两张渲染逐字节相同）、去掉高光槽位（40.30→40.32）、动画颜色关键帧（**全骨架 263 个动画里
  0 条**，已用时间轴 dump 确认）、帧率 12→50fps（总变化量不变）、时间滞回 margin 4/8
  （收益 ≤0.4pp，属噪声级）、ffmpeg `stats_mode=diff`/`single`（39.3%/38.0% vs 默认 38.8%，
  无增益）、A→B→A 往复抖动检测（无损 49.2% / 修复后 49.7%，被真实往复运动主导，不可用）。
  **注意别靠近似取整**（`--palette-round`>1）：round=24 会把深色头发**染成偏蓝**，
  round=8 反而升到 71.8%。默认 1。
  **仍然存在的上限**：256 色是 GIF 的硬约束，本方案只是把它用到极限；要**逐位无损**仍得用
  APNG / 动画 WebP（输出名写 `x.apng` / `x.webp`）——但那两种在 Discord 等平台上支持面窄，
  **GIF 仍是兼容性最好的默认**。
  **⚠️ 边缘质量有个必读的隐藏参数**：`paletteuse` 的 `alpha_threshold` **默认 128**，
  它把所有半透明边缘像素（alpha < 128）判成**全透明**，于是轮廓比无损**瘦一圈**。
  实测同一动画对无损 APNG 的 alpha 掩码差：

  | 编码路径 | 掩码差 | 占画面 |
  |---|---|---|
  | 无损 APNG（基准） | 0 px | 0% |
  | ffmpeg 默认 `alpha_threshold=128` | 17355 px | **0.551%** |
  | ffmpeg `alpha_threshold=1` | **0 px** | **0%** |
  | `gifenc` 路径 | 2919 px | 0.093% |

  即**默认值下新路径的边缘质量只有旧路径的 1/6**（这点极易漏掉：跳色率指标看不出来，
  必须单独比 alpha 掩码）。现已在代码里固定 `alpha_threshold=1`，体积只涨 2%
  （883→900 KB），代价是跳色差额从 -0.2pp 升到 **+1.0pp**（仍远在 +5pp 合格线内）。
  **GIF 只有 1-bit alpha，边缘"准"与"稳"不可兼得，取"准"。**
  > 校验方法：把 GIF 与同动画无损 APNG **逐帧比 alpha 掩码**（`(p==0) != (q==0)` 的像素数），
  > 必须为 0。注意 **PIL 与 ffmpeg 解 GIF 结果完全一致**，用哪个都行；
  > 但 **不能只看 `im.info['transparency']`** —— 它只反映全局色表，局部色表的帧报告 `None`，
  > 而且新路径的首帧值是 250、背景索引是 255，与 gifenc 的 0 不同（两种都合法）。
- **改了 `SliderConstraints` 但画面毫无变化 / 刘海怎么调都一样**：
  渲染器没把滑条值写进 `slider.pose.time`。检查 `render_headless.mjs` 里
  `applySliders()` 是否还在，以及是否在 `state.apply()` 之后、
  `updateWorldTransform()` 之前调用（顺序错了也会失效）。
  另外记住**值单位是「秒」不是 0..1**（见架构第 6 条）——
  把 `0.6` 当成 60% 去理解，会得出完全错误的结论。
- **眼睛上方有一块红色 / 眼睑颜色不对**：`Eyelash`（有时还有 `SkinOutline`）
  这个 SlotGroup 在该角色 JSON 里不存在，渲染回落到骨架 setup pose 的偏红色
  `(0.541,0.208,0.251)`。补上该组并染色，结构抄 `SampleCharacter2.json`。
- **眼睛上/下那圈深色环、手上那圈暗红环 —— 先别当 bug 修**：
  - **手部的暗红环是游戏自带画风**，不是回落色。`SampleCharacter1/2/4/7`、`OrangeCat`
    等官方角色渲染出来**全都有**（实测中值 `#541F28` ~ `#30050B`，随各自配色变化）。
    做过 4 组对照（改 `SkinOutline`、补 `Hand`/`HandOutline` 组并染色）——
    暗红像素数与颜色**一个都没变**，说明它不归任何 `SlotGroup` 管，别再查了。
  - 眼睛的**深色外环**是 `EyeDark` 组，属正常虹膜结构，同样不是回落。
- **"这个效果应该只在部分帧出现，怎么全帧都有？"**：先分清是**渲染错**还是**看错**。
  骨架里 **77 个 `ANIM/` 动画**有「附件中途开关」（`AttachmentTimeline` 把槽位置为 `null`
  或换成别的附件），典型如 `ANIM/Angry` 的怒气蒸汽（34 帧里只有 6 帧有）、`ANIM/Alert-*`
  的点击特效、`ANIM/Arrive-Chopstick` 的筷子。**渲染器已忠实实现**（逐帧验证一致）。
  **验证方法（探针法，不要靠肉眼数像素）**：槽位名里的方括号就是组 tag，
  如 `Sticker_Front/AngrySteam1[StickerSteam]` → 把 `StickerSteam` 这个 SlotGroup 染成
  **纯荧光绿** (0,1,0)，渲一遍再逐帧找绿像素。绿不可能来自角色本体，检出即该贴纸。
  实测 `ANIM/Angry`：设计分布 `0000000000000001110000111000000000`，
  渲染分布 `000000000000000111000011100000`（前 30 帧**逐位相同**）。
  > ⚠️ **别用颜色阈值去数"红色/紫色像素"**：本机踩过 —— 把红发夹 `#C2434E` (194,67,78)
  > 误判成怒气蒸汽，得出"30/30 帧都有"的**错误结论**，白折腾一轮。**探针色必须是角色身上
  > 绝对不存在的颜色。**
  > 另注意**单动画模式默认只渲 30 帧**（`--frames` 的默认值），批量模式才按
  > `ceil(时长 × fps)` 出帧 —— 验证前先统一帧数口径，否则会把"参数不同"误判成丢帧。
- **`ANIM/Bug` 头顶那块紫灰色阴影不是 bug**：它是 `Sticker_Back/Face_Shadow[FaceShadow]`
  网格贴纸。全骨架**只有 6 个动画**用它：`Bug`、`Crowbar-1`、`Crowbar-3`、`Knife-2`、
  `Scared-1`、`Scared-2`（其余 185 个动画一帧都没有）。`Bug` 里是全程（34/34 帧）；
  `Scared-1/2` 各只有 4 帧，整个动画就这一下。颜色来自骨架 setup pose `(0.412,0.392,0.553)`，
  官方样例角色渲染同一动画同样如此（**贴图自带放射状细纹，官方也一样，不是渲染伪影**）。
  想调它：建一个 `FaceShadow` SlotGroup 即可（实测 alpha 0.5 明显变淡且保留设计感，
  alpha 0 完全隐藏）。**因为这 6 个动画才用该槽位，改这个组不会波及其它 185 个** ——
  调完只需重渲这 6 个：
  `--only "Bug,Crowbar-1,Crowbar-3,Knife-2,Scared-1,Scared-2"`。
  > 该槽位在这 6 个动画里都有一条 `AlphaTimeline`，但**值恒定 1.0**（`CurveTimeline1` 的
  > `frames` 是 `[time, value, ...]` 交错存储，这里是 `[0.0, 1.0]` = 单个关键帧），
  > 所以**全程满不透明是设计**，不是 alpha 没生效。同一动画里 `EyeHighlight`、`Tear2`、
  > `VIEWPORT` 等槽位的 alpha 确实会降到 0，说明 alpha 通道本身工作正常。
- **头发/衣服上出现一块"颜色补丁"（本该同色的区域里有一块明显不同）**：
  `SlotGroup` **同族值不一致**。官方设计里同一族部件（`HairBangLeft/Right/Middle`、
  `FrameHair*`、`SideHair`）的 tint **必须完全相同**，`*Outline` 族同理；只要有一个偏离，
  渲染出来就是一块盖在正常部件上的补丁。
  **本机真实事故**：`HairBangMiddle` 被设成 (0.338,0.338,0.377)，而同族是 (0.235,0.235,0.255)
  —— **亮了 47%**，渲成头顶一块紫灰色补丁，**占画面 11.45%**（包围盒 x 103~210 / y 0~139），
  颜色恰好等于该组 tint × 贴图色，一眼可辨（用户原话：「紫色块一直存在，完全盖过头发
  一部分区域」）。同族的 `HairBangMiddleOutline` 也一起偏离了。
  **查出方法**：`python scripts/check_group_families.py <角色.json>` —— 逐族比对，
  已用 4 个官方样例校准（样例全部通过 = 族划分可信）。修法：**从同族组读目标值**改回去，
  不要写死数字。
  > `BackHair` / `BackHairOutline` **不属于**头发主体族 —— 官方允许它独立染色
  > （`SampleCharacter2` 的后发是青色、`SampleCharacter1` 的后发比其它发片深），
  > 强行统一反而会改错。校准检查器时就踩过这个坑。
  > 另：**未被 `ActiveSkins` 装备的组不影响渲染**，检查器报出来先核对皮肤列表再动手。
- **眼睛是一团"糊灰盘"、没有神采**：`EyeDark`（外环）与 `EyeLight`（内盘）**都是低饱和灰**、
  明度差又小。官方 4 个样例的眼部**一律是「深色外环 + 高饱和亮内盘」**：

  | 角色 | EyeDark（外环） | EyeLight（内盘） |
  |---|---|---|
  | SampleCharacter1 | (0.229,0.202,**0.525**) 深蓝紫 | (0.762,0.666,**1.000**) 亮紫 |
  | SampleCharacter2 | (0.068,0.266,0.373) 深青 | (0.214,**1.000**,**1.000**) 亮青 |
  | SampleCharacter4 | (0.922,0.599,0.000) 橙 | (1.000,0.950,0.501) 亮黄 |
  | OrangeCat | (0.940,0.531,0.122) 橙 | (1.000,0.896,0.373) 亮黄 |
  | *反例（本机真实事故）* | (0.470,0.420,0.490) 灰紫 | (0.760,0.700,0.780) 浅灰紫 |

  **关键是内盘要够亮够饱和**（官方亮内盘的 B 通道常顶到 1.000）。
  改 `EyeLight` 的效果远大于改 `EyeDark`（见上面「虹膜分层」）。
  > ⚠️ **不要**照抄"把两层反过来用（外环给浅色、内盘给深色）"——那是本文档早期写错的建议，
  > 已被官方数据推翻：4 个样例**全部**是外环深、内盘亮。实测把上表反例角色按 Sample1 的
  > 模式改成 (0.23,0.20,0.53)/(0.76,0.67,1.00) 后，眼睛立刻从"糊灰盘"变成有神的亮紫。
- **导出的 GIF 会闪烁 / 边缘发毛（真实踩过，别再改回去）**：两处根因都在**旧 gifenc 路径**
  里。默认的 ffmpeg `palettegen` 路径不经过这两处，但 `--no-ffmpeg-gif` 或 ffmpeg 缺失回落时
  仍会走到，所以这两条别删。
  1. **`gifenc` 的 `quantize()` 默认 `oneBitAlpha: false`**，会给抗锯齿边缘生成
     **中间 alpha** 的调色板项 —— 实测一张表情 255 项里有 **68 项**带中间 alpha
     （取值 1,2,3,4,5,6,7,9,10,13,18,21…）。GIF 只有一个透明索引，这些项只能被写成
     **不透明色**，于是头发轮廓整圈用硬色；角色一动，边缘像素的最近匹配就在"透明项 /
     这 68 项"之间翻转 → 闪。**必须传 `oneBitAlpha: true`（实测 68 → 0）。**
  2. **调色板要跨帧采样后再 quantize**（现为 6 帧均匀采样）。只从第 0 帧取的话，
     第 0 帧通常是待机姿势，后面才出现的道具（怒气符号/爱心/火）没有自己的颜色，
     会被映射到最近的发色/肤色上，串色且随动作发抖。
  > 改完**务必确认第 0 帧仍是动画的第 0 帧**：采样预热跑掉了若干帧，编码前必须
  > `clearTrack(0)` + `setupPose()` + `setAnimation()` 回绕一次（漏了的话第 0 帧会
  > 变成中间某帧）。校验方法：新旧第 0 帧缩到同尺寸求差异，应 <1%。
- **角色没有手 / 缺腿 / 发际线断裂**：`[Required]` 皮肤没自动加载。
  确认 `render_headless.mjs` 里遍历 `xxx[Required]/变体` 的补装逻辑还在，
  并且控制台有 `required skin auto-loaded: ...` 三行输出。
- **角色在画布里偏小/四周留白过多**：`collectBounds` 量到了未裁剪的几何。
  它必须走 `forEachDrawnSlot`（带裁剪），不能用原始顶点。
- **角色某些部件整块发黑/盖住别的部件**：贴图染色缓存串页或 alpha 丢失（已在
  `render_headless.mjs` 修复：染色缓存按「图集页 + 颜色」做 key，multiply 后用
  `destination-in` 还原 alpha）。若再出现，先确认这两处没被改动。
- **取景太松/太紧 / 表情包看不清脸**：`--zoom 0` 是全身，`0.3` 头肩，`0.45` 大头照
  （实测见第 3 步的对照表）。**112/128 px 一定要配大头照**——出全身的话脸只有十几像素。
  注意 `--zoom` 只能中心对称裁切，想"脸偏左/偏上"做不到（没有平移参数）。
- **`window has no client area`**：切虚拟桌面会让 Unity 窗口最小化（client rect 变 0×0，
  坐标停在 -32000）。`vdesktop.py` 现在每次操作前会自动 `SW_RESTORE`，无需手工处理；
  若仍报错，用 `python scripts/vdesktop.py done` 切回桌面再重新 `launch`。
- **导出按钮是灰的**：导出面板需要动画在播放中才可点。先点播放（约 1194,271），
  再选动画，按钮才会激活。
- **窗口尺寸不对**：`vdesktop.py launch` 会写注册表钉成无边框 1920×1080 并在 `done` 时还原；
  若屏幕分辨率 <1920×1080，按截图实际尺寸等比换算坐标。
- **导出面板找不到**：以截图为准（游戏更新可能改 UI），不要盲点。
- **怎么判断渲染对不对**：拿游戏自己导出的 GIF 当基准最可靠。本机留存的基准是
  `Documents\EmoteLab\Export\OrangeCat_生气_2026-09-18-15-06-47.gif`，其规格为
  **112×112、32 帧、60ms/帧、`transparency=255`、四角 `(0,0,0,0)`、
  中心 `(255,216,167,255)`**。渲染产物读回来对齐这几项即可确认透明与帧率无误；
  构图差异（游戏是怼脸特写）属正常，不要按它去调 `--zoom`。
- **游戏内左侧列表点击命中偏一行**：列表行高 ≈39px，命中区比视觉位置低一行，
  每次点击都要带 `--shot` 复核；选中角色的预览有滞后，**不要**用预览判断颜色，
  需要权威结果就用导出面板产出的文件。

## 文件清单

```
scripts/
  emotelab_common.py        路径与角色读写
  generate_character.py     角色生成（核心）
  build_catalog.py          重建部件词典（调 node dump_catalog.mjs）
  check_group_families.py   检查 SlotGroup 同族 tint 一致性（防"颜色补丁"，已用官方样例校准）
  analyze_palette.py        从参考图提取配色约束（饱和度/明度/描边占比/点缀占比）
  vdesktop.py               独立虚拟桌面 GUI 自动化（launch/click/shot/done）
  headless/
    render_headless.mjs     无头渲染 PNG/GIF（已与游戏导出比对一致）
    dump_catalog.mjs        从骨架导出部件词典
    dump_slider_ranges.mjs  从骨架导出滑条取值范围 → references/slider-ranges.csv
    package.json            node 依赖（canvas + gifenc + spine 4.3.13）
references/
  parts-catalog.json        部件词典（proven + 全量）
  slot-groups.csv           槽位中英文名
  sliders.csv               滑条名 + 多语言显示名
  slider-ranges.csv         滑条取值范围（DurationSeconds = 上限，NeutralValue = 中性值）
                            ★ 传 --slider 之前先查这张表，值是秒不是 0..1
  animations.csv            表情动画表（中文名→ANIM/…）
  sample-characters.txt     内置角色速查
```
