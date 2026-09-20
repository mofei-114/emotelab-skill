"""从参考图提取配色「约束」，而不是抄具体色值。

用法:
    python analyze_palette.py <参考图> [<参考图2> ...]

输出四项关键指标：
    饱和度中位数        —— 决定整体"灰"到什么程度
    明度四分位          —— 决定有没有深浅层次
    深色描边面积占比    —— 自然感的来源；衣物默认白描边是最大的翻车点
    高饱和像素占比      —— 点缀色该占多少

为什么需要它：本机曾把衣物配色调成"糖果贴纸"，事后定量对比才发现
主色饱和度（0.22~0.29）其实低于参考图（0.35），真正的病因是
**明度全挤在 0.9 以上 + 描边是白色**。
"""
import colorsys
import os
import sys
from collections import Counter

try:
    from PIL import Image
except ImportError:
    raise SystemExit("需要 Pillow: pip install Pillow")


def analyze(path):
    im = Image.open(path)
    try:
        im.seek(0)          # 动图只取第一帧
    except EOFError:
        pass
    im = im.convert('RGBA')
    W, H = im.size
    px = im.load()

    cnt = Counter()
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a > 200 and not (r > 245 and g > 245 and b > 245):   # 去掉透明与纯白底
                cnt[(r // 8 * 8, g // 8 * 8, b // 8 * 8)] += 1
    total = sum(cnt.values())
    if not total:
        print(f"{path}: 没有可用像素")
        return

    def hsv(c):
        h, s, v = colorsys.rgb_to_hsv(c[0] / 255, c[1] / 255, c[2] / 255)
        return h * 360, s, v

    sats, vals = [], []
    dark = bright_sat = 0
    for c, k in cnt.items():
        _, s, v = hsv(c)
        sats += [s] * k
        vals += [v] * k
        if v < 0.35:                        # 深色描边/阴影
            dark += k
        if s > 0.5:                         # 高饱和点缀
            bright_sat += k
    sats.sort(); vals.sort()

    def q(arr, p):
        return arr[min(len(arr) - 1, int(len(arr) * p))]

    print(f"=== {os.path.basename(path)}  ({W}x{H}) ===")
    print(f"  饱和度   中位 {q(sats,.5):.2f}   75% {q(sats,.75):.2f}   95% {q(sats,.95):.2f}")
    print(f"  明度     25% {q(vals,.25):.2f}   中位 {q(vals,.5):.2f}   75% {q(vals,.75):.2f}")
    print(f"  深色(V<0.35)面积占比   {100*dark/total:5.1f}%   <- 描边该占多少")
    print(f"  高饱和(S>0.5)面积占比  {100*bright_sat/total:5.1f}%   <- 点缀色该占多少")
    print("  主色 top6:")
    for c, k in cnt.most_common(6):
        h, s, v = hsv(c)
        print(f"    rgb{c!s:<18} {100*k/total:>5.1f}%   H={h:>5.1f} S={s:.2f} V={v:.2f}")
    print()


if len(sys.argv) < 2:
    raise SystemExit(__doc__)
for p in sys.argv[1:]:
    analyze(p)
