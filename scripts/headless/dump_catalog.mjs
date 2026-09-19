// Dump the authoritative parts catalog from the game's Spine skeleton.
// Skin names look like:  A_FacialFeatures/Brows[DefaultOn]/Brows1
// (category / slotKey[requirement] / value). Outputs JSON to stdout:
//   { "SlotKey": { "values": [...], "requirement": {...} } }
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
const require_ = createRequire(import.meta.url);
const spine = require_("@esotericsoftware/spine-canvas");
const { execSync } = require_("node:child_process");

const INSTALL_CANDIDATES = [
  "E:\\steam\\steamapps\\common\\EmoteLab",
  "C:\\Program Files (x86)\\Steam\\steamapps\\common\\EmoteLab",
  "C:\\Program Files\\Steam\\steamapps\\common\\EmoteLab",
  "D:\\steam\\steamapps\\common\\EmoteLab",
  "E:\\SteamLibrary\\steamapps\\common\\EmoteLab",
  "D:\\SteamLibrary\\steamapps\\common\\EmoteLab",
];
const GAME = process.env.EMOTELAB_INSTALL
  || INSTALL_CANDIDATES.find((p) => fs.existsSync(p))
  || INSTALL_CANDIDATES[0];
if (!fs.existsSync(GAME)) {
  console.error(
    "找不到 EmoteLab 安装目录。已试过:\n  " + INSTALL_CANDIDATES.join("\n  ") + "\n" +
    "请设置环境变量 EMOTELAB_INSTALL 指向游戏目录。");
  process.exit(1);
}
const SKEL_BUNDLE = path.join(GAME, "EmoteLab_Data", "StreamingAssets", "aa", "StandaloneWindows64",
  "localmodelgroup_assets_all_a3314e06ec8d50150357c6a3048fe0df.bundle");

const TMP = path.join(os.tmpdir(), "emotelab_headless_assets");
fs.mkdirSync(TMP, { recursive: true });
const skelPath = path.join(TMP, "model.skel");
if (!fs.existsSync(skelPath)) {
  const py = `
import UnityPy, os
env = UnityPy.load(r'${SKEL_BUNDLE.replace(/\\/g, "\\\\")}')
skel = None
for obj in env.objects:
    if obj.type.name == 'TextAsset':
        d = obj.read()
        s = d.m_Script
        b = s.encode('utf-8','surrogateescape') if isinstance(s,str) else bytes(s)
        if d.m_Name.endswith('.skel') and (skel is None or len(b) > len(skel)): skel = b
open(r'${skelPath.replace(/\\/g, "\\\\")}','wb').write(skel)
`;
  fs.writeFileSync(path.join(TMP, "extract_skel.py"), py);
  execSync(`python "${path.join(TMP, "extract_skel.py")}"`);
}

const atlas = new spine.TextureAtlas(fs.readFileSync(path.join(TMP, "model.atlas"), "utf-8"));
const sd = new spine.SkeletonBinary(new spine.AtlasAttachmentLoader(atlas)).readSkeletonData(
  new Uint8Array(fs.readFileSync(skelPath)));

const out = {};
for (const skin of sd.skins) {
  // Category may itself contain a slash: "F_Accessory/EarAccessory/
  // EarringLeft[DefaultOff]/EarringALeft1". Anchoring the first segment with
  // [^/]+ silently skipped all 48 of those skins (6 slot groups: Earring L/R
  // and Piercing A/B L/R), so the catalog had no earbobs or piercings at all.
  const m = skin.name.match(/^(.+)\/([^/[]+)\[([^\]]+)\]\/(.+)$/);
  if (!m) continue;
  const [, , slotKey, req, value] = m;
  const e = (out[slotKey] = out[slotKey] || { values: [], requirement: {} });
  if (!e.values.includes(value)) e.values.push(value);
  e.requirement[value] = req; // Required | DefaultOn | DefaultOff
}
console.log(JSON.stringify(out, null, 1));
