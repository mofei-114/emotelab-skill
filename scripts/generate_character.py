"""Generate an EmoteLab character JSON from a base template + overrides.

EmoteLab characters live at:
  Documents\\EmoteLab\\Characters\\CoffeeBean\\<Name>\\<Name>.json
A character is: ActiveSkins (slot->part value), SliderConstraints (shape
sliders; **value is SECONDS into that slider's animation**, range [0, duration]
-- see references/slider-ranges.csv), SlotGroups (Spine slot tint colors),
IsUsingCustomTexture.

Examples:
  python generate_character.py --name OrangeCat --base SampleCharacter3 ^
      --set AnimalEar=AnimalEar7 --set Eye=Eye2 --color hair=#ff8c00 ^
      --color eye_light=#7ecfff --slider "Character/EarShape1=0.8"

  python generate_character.py --list-slots          # show parts catalog

Note: colour channels use underscores (eye_light, eye_dark, hair_back).
Hyphens are also accepted, but underscores are the documented form.
"""
import argparse
import colorsys
import csv
import difflib
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import emotelab_common as ec

REF_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "references")

# Slot-group name -> color channel keywords (checked in order).
CHANNEL_RULES = [
    ("hair_back", r"BackHair"),
    ("hair", r"Hair|Ahoge|Pigtail|Ponytail|SideHair|FrameHair"),
    ("eye_dark", r"EyeDark"),
    ("eye_light", r"EyeLight"),
    ("brow", r"Brow"),
    ("eyelash", r"Eyelash"),
    ("outfit", r"Outfit|Neckwear|Horn|HairClip|Leg|Cape|Mecha|Hand|Tail|Wing|Antenna|Fin|Gill|Halo|Hat|Glasses|Earring|Piercing|FacialHair|AnimalEar"),
]


def channel_of(group_name):
    for ch, pat in CHANNEL_RULES:
        if re.search(pat, group_name):
            return ch
    return None


def load_catalog():
    p = os.path.join(REF_DIR, "parts-catalog.json")
    if not os.path.isfile(p):
        return {}
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def load_known_sliders():
    """Valid SliderConstraints names, from references/sliders.csv."""
    p = os.path.join(REF_DIR, "sliders.csv")
    if not os.path.isfile(p):
        return set()
    with open(p, encoding="utf-8") as f:
        return {row["SliderName"] for row in csv.DictReader(f) if row.get("SliderName")}


def load_slider_ranges():
    """Slider name -> (duration_seconds, neutral_value), from slider-ranges.csv.

    SliderConstraints[].Value is a TIME IN SECONDS into that slider's CHAR/
    animation -- the valid range is [0, duration] -- NOT a 0..1 fraction.
    Verified against the game's own code (SliderConstraintManager assigns
    Value straight to SliderPose.Time, and its ctor sets MinValue=0 /
    MaxValue=animation.Duration) and against shipped characters
    (SampleCharacter4 has Character/EarShape2 = 2.0 on a 2.0s animation).
    Regenerate the CSV with scripts/headless/dump_slider_ranges.mjs.
    """
    p = os.path.join(REF_DIR, "slider-ranges.csv")
    if not os.path.isfile(p):
        return {}
    out = {}
    with open(p, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            n = row.get("SliderName")
            if not n:
                continue
            try:
                out[n] = (float(row.get("DurationSeconds") or 0),
                          float(row.get("NeutralValue") or 0))
            except ValueError:
                continue
    return out


def pick_base(name):
    sources = ec.list_user_characters()
    sources.update(ec.list_sample_characters())
    if name in sources:
        return ec.load_character(sources[name]), sources[name]
    raise SystemExit(f"base character '{name}' not found. Known: {', '.join(sorted(sources))}")


def hex_to_rgb01(h):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))


def rgb01_to_hex(c):
    return "#%02x%02x%02x" % tuple(max(0, min(255, round(v * 255))) for v in c)


def recolor_group(tint, target_rgb, mode="hue"):
    """Recolour one SlotGroup tint toward `target_rgb`.

    mode="hue"  (default) take the target's HUE only and keep the group's own
                lightness. This preserves the part's shading structure — the
                outline stays darker than the fill, highlights stay lighter —
                which is what you want when the new colour has a similar
                brightness to the old one.
    mode="full" map the target's hue AND lightness, keeping only the original
                lightness *ratio* around its own mid-point. Needed whenever the
                new colour is much darker or lighter than the old one: with
                mode="hue", asking a bright pink (#ff5064, L=0.66) for dark
                brown (#3a302e, L=0.20) returns #f2bfb5 — still bright. The
                target's L becomes the group's new mid-lightness and every
                shade is scaled to match. In this mode the target's saturation
                is used too, otherwise a desaturated target (cool grey-violet,
                S=0.11) inherited the old colour's saturation and came out
                vivid purple.
    """
    r, g, b = tint["r"], tint["g"], tint["b"]
    h0, l0, s0 = colorsys.rgb_to_hls(max(0, min(1, r)), max(0, min(1, g)), max(0, min(1, b)))
    hr, hg, hb = target_rgb
    h1, l1, s1 = colorsys.rgb_to_hls(hr, hg, hb)
    h2, l2, s2 = colorsys.rgb_to_hls(h0, l0, s0)
    if mode == "full":
        # Map the group's lightness onto the target's, preserving how much
        # lighter/darker this group sits relative to a mid-grey baseline.
        # ratio > 1 (a lighter shade) stays lighter than l1; < 1 stays darker.
        ratio = l2 / 0.5 if l2 > 0 else 0.0
        l2 = max(0.0, min(1.0, l1 * ratio))
        # Keep some of the group's own saturation structure (a highlight can be
        # less saturated than its base) but stay near the target's level.
        s2 = min(1.0, max(s1, s2 * s1)) if s1 > 0 else 0.0
    else:
        s2 = max(s1, s2 * 0.7)
    new = colorsys.hls_to_rgb(h1, l2, s2)
    return {"r": new[0], "g": new[1], "b": new[2], "a": tint.get("a", 1.0)}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--name", help="new character name")
    ap.add_argument("--base", default="SampleCharacter1", help="base sample/user character name")
    ap.add_argument("--set", action="append", default=[], metavar="Slot=Value",
                    help="equip part (empty Value removes the slot)")
    ap.add_argument("--slider", action="append", default=[],
                    metavar='"Character/Name=SECONDS"',
                    help="shape slider; the value is a time in seconds within "
                         "that slider's range (see references/slider-ranges.csv)")
    ap.add_argument("--color", action="append", default=[], metavar="channel=#hex",
                    help="channels: hair, hair_back, outfit, eye_dark, eye_light, brow, eyelash")
    ap.add_argument("--color-mode", choices=("hue", "full"), default="hue",
                    help="hue = keep each part's own lightness, swap hue only (default; "
                         "preserves shading, use when the new colour is similar in brightness). "
                         "full = also take the target's lightness, so e.g. dark brown hair "
                         "actually comes out dark instead of pastel")
    ap.add_argument("--list-slots", action="store_true", help="print parts catalog and exit")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--force", action="store_true", help="skip catalog validation")
    args = ap.parse_args()

    catalog = load_catalog()

    if args.list_slots:
        for slot in sorted(catalog):
            e = catalog[slot]
            print(f"{slot}\n  proven:    {' '.join(e['proven']) or '-'}\n  candidate: {' '.join(e['candidate']) or '-'}")
        return

    if not args.name:
        raise SystemExit("--name is required (unless --list-slots)")

    data, base_path = pick_base(args.base)
    changes = []

    # --- parts ---
    def set_part(slot, value):
        items = data["ActiveSkins"]["Items"]
        idx = next((i for i, it in enumerate(items) if it["Key"] == slot), None)
        if value == "":
            if idx is not None:
                del items[idx]
                changes.append(f"removed slot {slot}")
            return
        entry = catalog.get(slot)
        if entry and not args.force:
            ok = value in entry["proven"] or value in entry["candidate"]
            if not ok:
                known = entry["proven"] + entry["candidate"]
                raise SystemExit(f"unknown value '{value}' for slot '{slot}'. Known: {known}\n"
                                 f"(use --force to write it anyway; verify in game)")
            if value in entry["candidate"] and value not in entry["proven"]:
                changes.append(f"NOTE: {slot}={value} is a catalog candidate - verify it renders in game")
        if idx is None:
            items.append({"Key": slot, "Value": value})
        else:
            items[idx]["Value"] = value
        changes.append(f"{slot}={value}")

    for s in args.set:
        slot, _, value = s.partition("=")
        set_part(slot.strip(), value.strip())

    # --- sliders ---
    # Validate against references/sliders.csv. A typo here is otherwise silent:
    # the slider is appended to the JSON, the game ignores an unknown name, and
    # the character simply comes out wrong.
    known_sliders = load_known_sliders()
    slider_ranges = load_slider_ranges()
    for s in args.slider:
        name, _, value = s.partition("=")
        name = name.strip()
        try:
            v = float(value)
        except ValueError:
            raise SystemExit(f"--slider '{s}': value must be a number (a time in seconds, >= 0)")
        if v < 0:
            raise SystemExit(
                f"--slider '{s}': value must be >= 0.\n"
                f"Note: the value is a TIME IN SECONDS into the slider's animation, "
                f"not a 0..1 fraction -- see SKILL.md '滑条机制'."
            )
        # Accept a name from either source: the game's Sliders.csv and the
        # skeleton disagree on casing for at least one slider
        # ("Character/Headwing_Position" vs "Character/HeadWing_Position"),
        # and the renderer matches case-insensitively anyway.
        valid_names = set(known_sliders) | set(slider_ranges)
        if valid_names and name not in valid_names:
            close = difflib.get_close_matches(name, sorted(valid_names), n=3, cutoff=0.5)
            hint = f" Did you mean: {', '.join(close)}?" if close else ""
            raise SystemExit(
                f"unknown slider '{name}'.{hint}\n"
                f"See references/sliders.csv for all {len(known_sliders)} valid names "
                f"(e.g. Character/EarShape1)."
            )
        dur, neutral = slider_ranges.get(name, (0.0, 0.0))
        if dur and v > dur + 1e-6:
            raise SystemExit(
                f"--slider '{name}={v:g}': out of range.\n"
                f"  '{name}' spans 0..{dur:g} seconds (the length of its CHAR/ animation),\n"
                f"  neutral value is {neutral:g}.\n"
                f"  The value is a TIME IN SECONDS, not a 0..1 fraction -- a value like "
                f"{v / dur:.2f} would mean '{v:g}' if it were a fraction.\n"
                f"  See references/slider-ranges.csv for every slider's range."
            )
        entry = next((x for x in data["SliderConstraints"] if x["Name"] == name), None)
        if entry:
            entry["Value"] = v
            changes.append(f"slider {name}={v}")
        else:
            data["SliderConstraints"].append({"Name": name, "Value": v})
            changes.append(f"slider {name}={v} (added)")

    # --- colors ---
    # Channel names use underscores (eye_light). Hyphens are accepted too: the
    # example in this file's docstring used to say "eye-light", and a hyphen
    # silently matched nothing -- channel_of() never returns it -- so the colour
    # was quietly dropped and the character came out unchanged.
    valid_channels = [ch for ch, _ in CHANNEL_RULES]
    color_targets = {}
    for c in args.color:
        ch, _, hexv = c.partition("=")
        ch = ch.strip().replace("-", "_")
        if ch not in valid_channels:
            close = difflib.get_close_matches(ch, valid_channels, n=3, cutoff=0.4)
            hint = f" Did you mean: {', '.join(close)}?" if close else ""
            raise SystemExit(
                f"--color {c}: unknown channel '{ch}'.{hint}\n"
                f"Valid channels: {', '.join(valid_channels)}"
            )
        color_targets[ch] = hex_to_rgb01(hexv)
    if color_targets:
        # Count per channel: `affected` used to be one set shared by every
        # channel and printed once per channel at the end, so all of them
        # reported the same (final, cumulative) number — "recolor hair -> ...
        # (53 slot groups)" even when hair only matched 29.
        affected = {}
        for g in data["SlotGroups"]:
            if "TintColor" not in g:
                continue
            ch = channel_of(g["Name"])
            if ch in color_targets:
                g["TintColor"] = recolor_group(g["TintColor"], color_targets[ch], args.color_mode)
                tb = g.get("TintBlackColor")
                if tb and (tb["r"] or tb["g"] or tb["b"]):
                    tb = dict(tb)
                    base = g["TintColor"]
                    for k in ("r", "g", "b"):
                        tb[k] = min(1.0, tb[k] * (base[k] / max(1e-4, base[k]))) if base[k] else 0.0
                    g["TintBlackColor"] = tb
                affected.setdefault(ch, set()).add(g["Name"])
        for ch, rgb in color_targets.items():
            n = len(affected.get(ch, ()))
            if n == 0:
                changes.append(f"recolor {ch} -> {rgb01_to_hex(rgb)} (no slot group matched; "
                               f"check the channel name)")
            else:
                changes.append(f"recolor {ch} -> {rgb01_to_hex(rgb)} ({n} slot groups)")

    data["IsUsingCustomTexture"] = False

    # --- name & write ---
    name = re.sub(r'[\\/:*?"<>|]', "", args.name).strip()
    existing = set()
    d = ec.characters_dir()
    if os.path.isdir(d):
        existing = set(os.listdir(d))
    final, i = name, 2
    while final in existing and not args.dry_run:
        final = f"{name} {i}"
        i += 1
    print(f"base:    {base_path}")
    for c in changes:
        print(f"  {c}")
    if args.dry_run:
        print("dry run, nothing written")
        return
    path = ec.save_character(data, final)
    print(f"written: {path}")
    print("next: launch EmoteLab, open this character, check for missing/blank parts, then export.")


if __name__ == "__main__":
    main()
