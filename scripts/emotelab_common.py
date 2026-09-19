"""Shared paths and helpers for EmoteLab skill scripts."""
import glob
import json
import os
import sys

# EmoteLab install dir (Steam). Override with env EMOTELAB_INSTALL.
INSTALL_CANDIDATES = [
    r"E:\steam\steamapps\common\EmoteLab",
    r"C:\Program Files (x86)\Steam\steamapps\common\EmoteLab",
    r"D:\steam\steamapps\common\EmoteLab",
    r"E:\SteamLibrary\steamapps\common\EmoteLab",
    r"D:\SteamLibrary\steamapps\common\EmoteLab",
]

APP_ID = "4301100"
MODEL_NAME = "CoffeeBean"  # built-in Spine model id


def install_dir():
    env = os.environ.get("EMOTELAB_INSTALL")
    if env and os.path.isdir(env):
        return env
    for c in INSTALL_CANDIDATES:
        if os.path.isdir(c):
            return c
    raise SystemExit("EmoteLab install dir not found; set EMOTELAB_INSTALL env var.")


def user_data_dir():
    """Documents\\EmoteLab - user characters, exports."""
    docs = os.path.join(os.path.expanduser("~"), "Documents")
    # OneDrive-redirected Documents fallback
    if not os.path.isdir(os.path.join(docs, "EmoteLab")):
        od = os.path.join(os.path.expanduser("~"), "OneDrive", "Documents")
        if os.path.isdir(os.path.join(od, "EmoteLab")):
            docs = od
    return os.path.join(docs, "EmoteLab")


def builtin_samples_dir():
    return os.path.join(
        install_dir(), "EmoteLab_Data", "StreamingAssets", "BuiltInModelCharacters", MODEL_NAME
    )


def characters_dir():
    return os.path.join(user_data_dir(), "Characters", MODEL_NAME)


def export_dir():
    return os.path.join(user_data_dir(), "Export")


def exe_path():
    return os.path.join(install_dir(), "EmoteLab.exe")


def load_character(path):
    with open(path, encoding="utf-8-sig") as f:
        return json.load(f)


def save_character(data, name, out_dir=None):
    """Write character JSON in the layout EmoteLab expects: <Name>/<Name>.json"""
    d = out_dir or characters_dir()
    folder = os.path.join(d, name)
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, name + ".json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    return path


def list_sample_characters():
    out = {}
    for p in glob.glob(os.path.join(builtin_samples_dir(), "*", "*.json")):
        name = os.path.basename(os.path.dirname(p))
        out[name] = p
    return out


def list_user_characters():
    out = {}
    for p in glob.glob(os.path.join(characters_dir(), "*", "*.json")):
        name = os.path.basename(os.path.dirname(p))
        out[name] = p
    return out


def skel_file():
    """Path of the newest Spine skeleton shipped with the game (for catalog rebuild)."""
    aa = os.path.join(install_dir(), "EmoteLab_Data", "StreamingAssets", "aa", "StandaloneWindows64")
    return os.path.join(aa, "localmodelgroup_assets_all_a3314e06ec8d50150357c6a3048fe0df.bundle")
