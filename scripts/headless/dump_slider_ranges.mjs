// 导出形状滑条的取值范围表 -> references/slider-ranges.csv
//
// 背景：角色 JSON 里 SliderConstraints[].Value 的单位是「秒」，范围是
// [0, 该滑条动画的时长]。这个时长只有骨架里才有，写代码/文档时又需要它，
// 所以导成 CSV 供 generate_character.py 校验、供人和 agent 查表。
//
// 用法: node dump_slider_ranges.mjs [输出路径]
//   默认写到 ../../references/slider-ranges.csv
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const spine = require("@esotericsoftware/spine-canvas");

const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] || path.join(here, "..", "..", "references", "slider-ranges.csv");

const assets = path.join(os.tmpdir(), "emotelab_headless_assets");
const skel = path.join(assets, "model.skel");
const atlasFile = path.join(assets, "model.atlas");
if (!fs.existsSync(skel)) {
  console.error(`缺少 ${skel}；先跑一次 render_headless.mjs 让它自动提取游戏资源。`);
  process.exit(1);
}

const atlas = new spine.TextureAtlas(fs.readFileSync(atlasFile, "utf8"));
const data = new spine.SkeletonBinary(new spine.AtlasAttachmentLoader(atlas))
  .readSkeletonData(new Uint8Array(fs.readFileSync(skel)));

const rows = [];
for (const c of data.constraints) {
  if (c.constructor.name !== "SliderData") continue;
  const anim = c.animation;
  rows.push({
    name: c.name,
    anim: anim ? anim.name : "",
    duration: anim ? anim.duration : 0,
    neutral: c.setupPose ? c.setupPose.time : 0,
  });
}
rows.sort((a, b) => a.name.localeCompare(b.name));

const lines = ["SliderName,Animation,DurationSeconds,NeutralValue"];
for (const r of rows) {
  lines.push([r.name, r.anim, +r.duration.toFixed(4), +r.neutral.toFixed(4)].join(","));
}
fs.writeFileSync(out, lines.join("\n") + "\n", "utf8");
console.log(`-> ${out}  (${rows.length} sliders)`);

const char = rows.filter(r => r.name.startsWith("Character/"));
console.log(`Character/* 滑条 ${char.length} 个；时长分布：`);
const tally = {};
for (const r of char) tally[r.duration] = (tally[r.duration] || 0) + 1;
for (const [d, n] of Object.entries(tally).sort((a, b) => a[0] - b[0])) {
  console.log(`   ${d}s  ×${n}`);
}
