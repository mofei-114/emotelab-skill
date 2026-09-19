# EmoteLab 表情包 Skill

用 EmoteLab（Steam 游戏「捏捏表情包」）自动捏角色并导出整套表情包。
**不需要 GUI 操作** —— 直接读游戏资源离线渲染，零抢屏，可与游戏自身导出产物逐帧比对。

---

## 1. 前置条件

| 需要 | 说明 |
|---|---|
| **Windows** | 渲染器与路径探测目前只做了 Windows 方案 |
| **EmoteLab（Steam）** | App ID `4301100`。装在哪个盘都行，脚本会自动找 |
| **Node.js ≥ 18** | 无头渲染器用它（开发环境为 v24） |
| **Python 3.8+** | 角色生成脚本用它 |
| **ffmpeg** | 导出 GIF/APNG 用，能跑 `ffmpeg -version` 即可 |
| Python 包 `UnityPy` | 首次解包骨架用：`pip install UnityPy` |

**游戏目录**：脚本会在几个常见 Steam 位置自动查找。找不到就设环境变量：

```powershell
$env:EMOTELAB_INSTALL = "D:\Steam\steamapps\common\EmoteLab"
```

> ⚠️ **必须先做的一步**：在游戏里**打开过一次你要导出的角色**。
> 游戏会为它生成运行时贴图缓存（`文档\EmoteLab\Texture Cache`）。
> 没有这个缓存，渲染会报 `no texture cache`。

---

## 2. 快速开始

```powershell
# 0) node 依赖（本仓库已内含 node_modules；换 Node 大版本或换平台时才需要重装）
cd scripts\headless
npm install
cd ..

# 1) 看能捏哪些部件
python generate_character.py --list-slots

# 2) 生成角色（会写进 文档\EmoteLab\Characters\CoffeeBean\<名字>\）
python generate_character.py --name MyChar --base SampleCharacter1 `
  --set Eye=Eye2 --color hair=#3a302e

# 3) 先出单张静态图确认外貌 —— 别一上来就跑整套
cd headless
node render_headless.mjs "$env:USERPROFILE\Documents\EmoteLab\Characters\CoffeeBean\MyChar\MyChar.json" `
  preview.png --size 500

# 4) 满意后再批量导出（示例：300px 头肩取景、透明背景、16.7fps，共 191 个表情）
node render_headless.mjs "$env:USERPROFILE\Documents\EmoteLab\Characters\CoffeeBean\MyChar\MyChar.json" `
  --all-emotes --out-dir out --size 300 --zoom 0.34 --fps 16.7
```

`--all-emotes` 会先打印内存预估；跑完输出 `{ok, failed, total}` 与逐条进度。

---

## 3. 完整文档

**所有细节都在 [`SKILL.md`](SKILL.md)**：部件速查、配色陷阱、骨架能力上限、
参数表、故障排查。这份 README 只负责让你把环境装起来。

几个最容易踩的点（详见 SKILL.md）：

- **滑条值的单位是「秒」，不是 0..1**，先查 `references/slider-ranges.csv`
- **加任何部件后，必须确认对应 `SlotGroup` 存在**，否则会回落到骨架默认色
- **同一族部件（`HairBangLeft/Right/Middle` 等）的 tint 必须相同**，否则渲成一块补丁 ——
  用 `python scripts/check_group_families.py <角色.json>` 检查
- **别用参考图直接取固有色**：参考图泡在环境光里，量到的是光照不是材质

---

## 4. 目录结构

```
SKILL.md                    完整操作手册（先读这个）
README.md                   本文件
references/
  parts-catalog.json        部件词典
  slot-groups.csv           槽位中英文名
  sliders.csv               滑条名
  slider-ranges.csv         滑条取值范围（值是秒）
  animations.csv            191 个表情动画表
  sample-characters.txt     内置角色速查
scripts/
  emotelab_common.py        路径与角色读写
  generate_character.py     角色生成（核心）
  check_group_families.py   检查同族 tint 一致性
  build_catalog.py          重建部件词典
  vdesktop.py               独立虚拟桌面 GUI 自动化（兜底方案）
  headless/
    render_headless.mjs     无头渲染 PNG/GIF/APNG/WebP
    dump_catalog.mjs        从骨架导出部件词典
    dump_slider_ranges.mjs  从骨架导出滑条范围
    node_modules/           node 依赖（含 canvas 原生模块）
```

---

## 5. 常见问题

**渲染报 `no texture cache`**
→ 在游戏里打开一次该角色，让游戏生成贴图缓存。

**`找不到 EmoteLab 安装目录`**
→ 设 `EMOTELAB_INSTALL` 环境变量，见第 1 节。

**`canvas` 报模块版本不匹配 / 装不上**
→ 仓库里的 `canvas` 是**原生模块**，按 Windows x64 + Node 24 编译。
换 Node 大版本或换平台后，删掉 `scripts/headless/node_modules` 重新 `npm install`。

**导出的 GIF 颜色跳来跳去**
→ 已修（改用 ffmpeg 自适应调色板，跳色降到无损地板）。
确认 ffmpeg 在 PATH 里 —— 没有时会自动回落到内置编码器，画质会明显差一些。

**某片区域颜色像贴了块补丁**
→ 配色组同族值不一致，跑 `python scripts/check_group_families.py <角色.json>`。

**某个"特效"不该全程都有**
→ 先确认是不是看错：很多特效（如怒气蒸汽）只在部分帧出现，
渲染器已忠实还原。验证要用**角色身上绝对不存在的探针色**染色后再数像素，
不要用肉眼或颜色阈值（SKILL.md 故障排查里有完整方法）。
