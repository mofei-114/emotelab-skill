"""检查 SlotGroup 同族一致性。

背景：官方样例角色中，同一族发片/衣服的 tint 完全相同，这是「整片同色」的前提。
任何一族里出现偏离值，渲染出来就是一块**颜色补丁**盖在正常部件上
（本机实例：HairBangMiddle 偏离同族 47% 亮度，渲成头顶一块紫灰色补丁，
占画面 11.45%，用户直接指出「紫色块一直存在，完全盖过头发一部分区域」）。

用法: python check_group_families.py <角色.json>
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import emotelab_common as ec  # noqa: E402  (需要先插入 sys.path)

# 族的划分以「官方样例里这些组是否恒等」为准 —— BackHair 在官方设计里可以独立
# 染色（SampleCharacter2 的后发是青色、SampleCharacter1 的后发比其它发片深），
# 所以它**不属于**头发主体族，不能拿去和 HairBang* 比。改了族定义后，
# 本机 4 个官方样例全部通过，说明划分是准的。
FAMILIES = {
    '头发主体': ['HairBangLeft', 'HairBangRight', 'HairBangMiddle',
                'FrameHairLeft', 'FrameHairRight', 'SideHair'],
    '头发轮廓': ['HairBangLeftOutline', 'HairBangRightOutline', 'HairBangMiddleOutline',
                'FrameHairLeftOutline', 'FrameHairRightOutline', 'SideHairOutline'],
    '双马尾': ['PigtailLeft', 'PigtailRight'],
    '双马尾轮廓': ['PigtailLeftOutline', 'PigtailRightOutline'],
    '衣服主体': ['OutfitInner', 'OutfitCollar'],
    '衣服轮廓': ['OutfitInnerOutline', 'OutfitCollarOutline', 'OutfitOuterOutline'],
    '领饰轮廓': ['OutfitNeckwearAOutline', 'OutfitNeckwearBOutline', 'OutfitNeckwearCOutline'],
    '挑染': ['HairHighlightLeft1', 'HairHighlightRight1'],
    '挑染轮廓': ['HairHighlightLeft1Outline', 'HairHighlightRight1Outline',
                'HairHighlightLeft2Outline', 'HairHighlightRight2Outline',
                'HairHighlightLeft3Outline', 'HairHighlightRight3Outline',
                'HairHighlightMiddle1Outline', 'HairHighlightMiddle2Outline',
                'HairHighlightMiddle3Outline', 'HairHighlightMiddle4Outline',
                'HairHighlightMiddle5Outline', 'HairHighlightMiddle6Outline'],
    '发夹': ['HairClipLeft', 'HairClipRight'],
    '兽耳': ['AnimalEarLeft', 'AnimalEarRight'],
    '兽耳轮廓': ['AnimalEarLeftOutline', 'AnimalEarRightOutline'],
}

def resolve(path_arg):
    """定位角色 JSON：显式给路径就用它；否则从用户角色目录里找。

    绝不写死某个角色 —— 本机调试时曾把测试角色的绝对路径留在默认值里，
    换台机器必然报错。
    """
    if path_arg:
        return path_arg
    chars = ec.list_user_characters()
    if len(chars) == 1:
        return next(iter(chars.values()))
    if not chars:
        raise SystemExit(
            "没找到任何角色。\n"
            "  用法: python check_group_families.py <角色.json>\n"
            f"  或先在游戏里创建角色（会存到 {ec.characters_dir()}）"
        )
    raise SystemExit(
        "有多个角色，请指定一个：\n  "
        + "\n  ".join(f'python check_group_families.py "{p}"' for p in chars.values())
    )


path = resolve(sys.argv[1] if len(sys.argv) > 1 else None)
d = json.load(open(path, encoding="utf-8"))
groups = {g['Name']: g['TintColor'] for g in d.get('SlotGroups', [])}

print(f'角色: {path}\n')
issues = 0
for fam, names in FAMILIES.items():
    present = [(n, groups[n]) for n in names if n in groups]
    if len(present) < 2:
        continue
    def key(c):
        return (round(c['r'], 3), round(c['g'], 3), round(c['b'], 3))
    vals = {key(c) for _, c in present}
    if len(vals) == 1:
        print(f'  [OK]   {fam:<14} {len(present)} 个组一致 {list(vals)[0]}')
    else:
        issues += 1
        print(f'  [!!]   {fam:<14} 同族值不一致：')
        for n, c in present:
            print(f'           {n:<30} ({c["r"]:.3f},{c["g"]:.3f},{c["b"]:.3f})')
    # alpha 也必须一致（<1 会产生 cross-hatch）
    alphas = {c['a'] for _, c in present}
    if len(alphas) > 1 or (alphas and abs(list(alphas)[0] - 1.0) > 1e-6):
        issues += 1
        print(f'  [!!]   {fam:<14} alpha 异常: {sorted(alphas)}')

print(f'\n{"发现 %d 处问题" % issues if issues else "全部同族一致"}')
