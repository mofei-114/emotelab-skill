"""Rebuild the parts catalog (references/parts-catalog.json).

Sources, in order of trust:
  proven    - slot values actually used by built-in sample characters AND any
              user characters found in Documents\\EmoteLab\\Characters (these are
              guaranteed to render).
  candidate - values inferred from attachment-name prefixes inside the game's
              Spine skeleton bundle. Naming is inconsistent across slots, so
              candidates MUST be verified in-game before trusting.

Usage:  python build_catalog.py
"""
import collections
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import emotelab_common as ec

REF_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "references")


def collect_proven():
    """slot -> set(values) from every character JSON on disk (samples + user)."""
    catalog = collections.defaultdict(set)
    sources = dict(ec.list_sample_characters())
    sources.update(ec.list_user_characters())
    for p in sources.values():
        try:
            d = ec.load_character(p)
        except Exception:
            continue
        for it in d["ActiveSkins"]["Items"]:
            catalog[it["Key"]].add(it["Value"])
    return catalog


def collect_candidates(skel_bundle):
    """slot -> set(values) inferred from attachment-name prefixes in the skel."""
    import UnityPy

    env = UnityPy.load(skel_bundle)
    blob = b""
    for obj in env.objects:
        if obj.type.name == "TextAsset":
            d = obj.read()
            if d.m_Name.endswith(".skel"):
                s = d.m_Script
                blob = s.encode("utf-8", "surrogateescape") if isinstance(s, str) else bytes(s)
                if len(blob) > 1_000_000:  # keep the largest (newest) skeleton
                    break
    strings = set(x.decode() for x in re.findall(rb"[ -~]{2,}", blob))
    candidates = collections.defaultdict(set)
    # Prefix families observed in proven data: slot name (+ optional _A/_B series).
    # Only extend slots where at least one proven value exists, matching on that
    # value's own alphabetic prefix — keeps us inside the slot's naming scheme.
    proven = collect_proven()
    for slot, values in proven.items():
        for v in values:
            m = re.match(r"^([A-Za-z]+)", v)
            if not m:
                continue
            prefix = m.group(1)
            for s in strings:
                if s.startswith(prefix) and len(s) <= len(prefix) + 12:
                    tail = s[len(prefix):]
                    # part ids look like: <Prefix><digits>, <Prefix><L>_A<digits>,
                    # <Prefix><L><digits>, optionally suffixed with "Gradient".
                    # The digits are REQUIRED: an earlier version wrote
                    # `[A-Z]?\d*(...)?` where every group was optional, so the
                    # pattern matched the EMPTY string and every bare prefix in
                    # the bundle got collected as a "value" -- that is where the
                    # phantom candidates came from (AnimalEar, Eye, Ear, Horn,
                    # BackHair, HairShine, Mecha, OutfitInner/Outer, NeckwearB/C,
                    # HairbandB, and the lone-letter SideHairA / SideHairB /
                    # AnimalEarA). None of those exist as skins; picking one only
                    # produced "MISSING SKINS".
                    if re.fullmatch(r"(\d+|[A-Z]?\d+)(_A\d+|_B\d+)?(Gradient)?", tail):
                        candidates[slot].add(s)
    return candidates


def collect_skeleton_skins(skel_bundle):
    """slot -> set(values) from the game skeleton via the spine-ts runtime
    (scripts/headless/dump_catalog.mjs). Authoritative and complete."""
    node_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "headless")
    out = subprocess.run(["node", "dump_catalog.mjs"], cwd=node_dir, capture_output=True, text=True)
    if out.returncode != 0:
        raise RuntimeError(out.stderr.strip()[:300])
    data = json.loads(out.stdout)
    return {k: set(v["values"]) for k, v in data.items() if k != "default"}


def main():
    os.makedirs(REF_DIR, exist_ok=True)
    catalog = {}
    for slot, values in sorted(collect_proven().items()):
        catalog[slot] = {"proven": sorted(values), "candidate": []}
    try:
        for slot, values in collect_skeleton_skins(ec.skel_file()).items():
            entry = catalog.setdefault(slot, {"proven": [], "candidate": []})
            entry["candidate"] = sorted(values | set(entry["candidate"]))
    except Exception as e:
        print(f"skeleton catalog extraction skipped: {e}", file=sys.stderr)
    try:
        cand = collect_candidates(ec.skel_file())
        for slot, values in cand.items():
            entry = catalog.setdefault(slot, {"proven": [], "candidate": []})
            entry["candidate"] = sorted(values | set(entry["candidate"]))
    except Exception as e:
        print(f"candidate extraction skipped: {e}", file=sys.stderr)

    out = os.path.join(REF_DIR, "parts-catalog.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=1, ensure_ascii=False)
    n_proven = sum(len(v["proven"]) for v in catalog.values())
    n_cand = sum(len(v["candidate"]) for v in catalog.values())
    print(f"wrote {out}: {len(catalog)} slots, {n_proven} proven values, {n_cand} catalog values")


if __name__ == "__main__":
    main()
