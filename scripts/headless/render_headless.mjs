// Headless EmoteLab character renderer — no game GUI, no screen grabbing.
//
// Renders a character JSON (Documents/EmoteLab/Characters/CoffeeBean/<n>/<n>.json)
// using the game's own Spine 4.3 skeleton + atlas + textures:
//   - single frame:  node render_headless.mjs <char.json> out.png [--bg #4488cc]
//   - one emote:     node render_headless.mjs <char.json> out.gif --anim ANIM/Laugh
//   - ALL emotes:    node render_headless.mjs <char.json> x.png --all-emotes --out-dir out/
//                        [--only "Angry,Cry-1"] [--frames-cap 48] [--fps 16] [--size 500]
//
// Requires: node >= 18, python + UnityPy (skeleton extraction), npm deps in this dir.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const require = createRequire(import.meta.url);
const { createCanvas, loadImage } = require("canvas");
const spine = require("@esotericsoftware/spine-canvas");
const { GIFEncoder, quantize, applyPalette } = require("gifenc");
const { execSync, spawn } = require("node:child_process");

// EmoteLab 安装目录：环境变量优先，其次常见 Steam 位置。
// 不要写死单个路径 —— 这个 skill 要能换机器用（打包给别人时尤其重要）。
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
    "请设置环境变量 EMOTELAB_INSTALL 指向游戏目录，例如:\n" +
    '  $env:EMOTELAB_INSTALL = "D:\\Steam\\steamapps\\common\\EmoteLab"');
  process.exit(1);
}
const AA = path.join(GAME, "EmoteLab_Data", "StreamingAssets", "aa", "StandaloneWindows64");
const SKEL_BUNDLE = path.join(AA, "localmodelgroup_assets_all_a3314e06ec8d50150357c6a3048fe0df.bundle");
// 用户数据目录：Documents 可能被 OneDrive 重定向（逻辑与 emotelab_common.py 一致）
const USER_DATA = (() => {
  const home = os.homedir();
  const docs = path.join(home, "Documents");
  if (fs.existsSync(path.join(docs, "EmoteLab"))) return path.join(docs, "EmoteLab");
  const od = path.join(home, "OneDrive", "Documents");
  if (fs.existsSync(path.join(od, "EmoteLab"))) return path.join(od, "EmoteLab");
  return path.join(docs, "EmoteLab");
})();
const TEX_CACHE = path.join(USER_DATA, "Texture Cache");

const args = process.argv.slice(2);
const charJsonPath = args[0];
const outPath = args[1];
function argVal(name, dflt) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
}
const hasFlag = (name) => args.includes(name);
const animName = argVal("--anim", null);
const allEmotes = hasFlag("--all-emotes");
const outDir = argVal("--out-dir", null);
const onlyList = argVal("--only", null);
const framesCap = parseInt(argVal("--frames-cap", "48"));
const nFrames = Math.max(1, parseInt(argVal("--frames", "30")));
const fps = parseFloat(argVal("--fps", "16"));
const size = parseInt(argVal("--size", "500"));
const bgColor = argVal("--bg", "transparent");
// Screen-space overlap applied to each mesh triangle's clip path to hide the
// antialiasing seams between abutting triangles. 0 disables it.
const SEAM_EPS = parseFloat(argVal("--seam-eps", "0.6"));
// Frame each render on the character's measured extent instead of the skeleton's
// header box (the header reserves far more room than any character fills).
const FRAME_CONTENT = !hasFlag("--no-frame-content");
// Fraction of the framed box cropped away on each side. The game's own emote
// GIFs are head-and-shoulders crops of the full body, so ~0.34 matches the
// built-in GIF presets; 0 keeps the whole character in frame.
const ZOOM = parseFloat(argVal("--zoom", "0"));

// ---------- 1. extract newest .skel + .atlas from the game bundle ----------
const TMP = path.join(os.tmpdir(), "emotelab_headless_assets");
fs.mkdirSync(TMP, { recursive: true });
const skelPath = path.join(TMP, "model.skel");
const atlasPath = path.join(TMP, "model.atlas");
if (!fs.existsSync(skelPath) || !fs.existsSync(atlasPath)) {
  const py = `
import UnityPy, os
env = UnityPy.load(r'${SKEL_BUNDLE.replace(/\\/g, "\\\\")}')
skel, atlas = None, None
for obj in env.objects:
    if obj.type.name == 'TextAsset':
        d = obj.read()
        s = d.m_Script
        b = s.encode('utf-8','surrogateescape') if isinstance(s,str) else bytes(s)
        if d.m_Name.endswith('.skel') and (skel is None or len(b) > len(skel)): skel = b
        elif d.m_Name.endswith('.atlas') and (atlas is None or len(b) > len(atlas)): atlas = b
open(r'${skelPath.replace(/\\/g, "\\\\")}','wb').write(skel)
open(r'${atlasPath.replace(/\\/g, "\\\\")}','wb').write(atlas)
print('extracted', len(skel), len(atlas))
`;
  fs.writeFileSync(path.join(TMP, "extract.py"), py);
  console.error(execSync(`python "${path.join(TMP, "extract.py")}"`).toString().trim());
}

// ---------- 2. textures: newest in-game texture cache ----------
const atlasText = fs.readFileSync(atlasPath, "utf-8");
const pageNames = atlasText.match(/^([^:\n]+\.png)\s*$/gm).map(s => s.trim());
function findTextureDir() {
  let best = null, bestVer = -1, bestScore = -1;
  for (const root of fs.readdirSync(TEX_CACHE)) {
    const m = root.match(/CoffeeBean_V1_(\d+)/);
    const ver = m ? parseInt(m[1]) : -1;
    const rootDir = path.join(TEX_CACHE, root);
    if (!fs.statSync(rootDir).isDirectory()) continue;
    for (const sub of fs.readdirSync(rootDir)) {
      const d = path.join(rootDir, sub);
      if (!fs.statSync(d).isDirectory()) continue;
      const score = pageNames.filter(p => fs.existsSync(path.join(d, p))).length;
      if (score > bestScore || (score === bestScore && score === pageNames.length && ver > bestVer)) {
        best = d; bestVer = ver; bestScore = score;
      }
    }
  }
  if (!best || bestScore < 1) throw new Error("no texture cache; open the character once in EmoteLab");
  return best;
}
const texDir = findTextureDir();

// ---------- 3. skeleton ----------
const charData = JSON.parse(fs.readFileSync(charJsonPath, "utf-8").replace(/^\uFEFF/, ""));
const atlas = new spine.TextureAtlas(atlasText);

// [Skin]-tagged attachments (e.g. "Body/Body_Color[Skin]") have no exact atlas
// region; fall back to the stripped path, then to a last-path-segment match.
class EmoteAttachmentLoader extends spine.AtlasAttachmentLoader {
  findRegion(name, path) {
    let region = this.atlas.findRegion(path);
    if (!region && path.includes("[")) region = this.atlas.findRegion(path.replace(/\[[^\]]+\]$/, ""));
    if (!region) {
      const base = path.replace(/\[[^\]]+\]$/, "").split("/").pop();
      region = this.atlas.regions.find(r => r.name.split("/").pop() === base) || null;
      if (region) console.error(`region fallback: ${path} -> ${region.name}`);
    }
    return region;
  }
}
const skeletonData = new spine.SkeletonBinary(new EmoteAttachmentLoader(atlas)).readSkeletonData(
  new Uint8Array(fs.readFileSync(skelPath)));

// ---------- 4. main ----------
async function main() {
  for (const page of atlas.pages) {
    page.setTexture(new spine.CanvasTexture(await loadImage(path.join(texDir, page.name))));
  }

  const skeleton = new spine.Skeleton(skeletonData);
  const skin = new spine.Skin("character");
  if (skeletonData.defaultSkin) skin.addSkin(skeletonData.defaultSkin);
  const missing = [];
  const loadedSkinNames = new Set();
  for (const it of charData.ActiveSkins.Items) {
    const s = skeletonData.skins.find(x => x.name === it.Value || x.name.endsWith("/" + it.Value));
    if (!s) { missing.push(it.Value); continue; }
    skin.addSkin(s);
    loadedSkinNames.add(s.name);
  }
  if (missing.length) console.error(`MISSING SKINS: ${missing.join(", ")}`);

  // [Required] skins must always be loaded, and the character JSON does NOT
  // list them: it stores only the *choosable* parts. Hand, Leg and BaseHair are
  // declared "G_Outfit/Hand[Required]/Hand1" etc. and are expected to be filled
  // by the game's part system, not by ActiveSkins. Skipping them left every slot
  // they populate empty — 34 hand slots, 2 leg slots and 5 face slots that
  // include "Face_Front/Hairline" — which is why the character had no hands at
  // all: the white paws visible in the game's own exports were simply never
  // attached. Groups already satisfied through ActiveSkins (Eye, OutfitInner)
  // are left alone; otherwise the group's first variant is the default.
  const requiredGroups = new Map();
  for (const sk of skeletonData.skins) {
    const m = sk.name.match(/^(.*)\[Required\]\/(.+)$/);
    if (!m) continue;
    if (!requiredGroups.has(m[1])) requiredGroups.set(m[1], []);
    requiredGroups.get(m[1]).push(sk);
  }
  for (const [grp, variants] of requiredGroups) {
    if (variants.some(v => loadedSkinNames.has(v.name))) continue;
    skin.addSkin(variants[0]);
    loadedSkinNames.add(variants[0].name);
    console.error(`required skin auto-loaded: ${grp} -> ${variants[0].name}`);
  }

  skeleton.skin = skin;
  skeleton.setupPose();

  // tint colors: JSON SlotGroups name == bracket tag in slot names
  const slotsByTag = {};
  for (const s of skeleton.slots) {
    const m = s.data.name.match(/\[([^\]]+)\]$/);
    if (m) (slotsByTag[m[1]] = slotsByTag[m[1]] || []).push(s);
  }
  function applyTints() {
    for (const g of charData.SlotGroups || []) {
      for (const slot of slotsByTag[g.Name] || []) {
        for (const p of [slot.pose, slot.appliedPose]) {
          if (!p) continue;
          if (g.TintColor && p.color) p.color.set(g.TintColor.r, g.TintColor.g, g.TintColor.b, g.TintColor.a ?? 1);
          if (g.TintBlackColor && p.darkColor) p.darkColor.set(g.TintBlackColor.r, g.TintBlackColor.g, g.TintBlackColor.b, g.TintBlackColor.a ?? 1);
        }
      }
    }
  }
  applyTints();

  const state = new spine.AnimationState(new spine.AnimationStateData(skeletonData));

  // Slots masked by a ClippingAttachment (side bangs, eye iris, alert sticker)
  // must have their triangles cut down to the clip polygon. Drawing them whole
  // paints the entire atlas region instead, which is what turned the side bangs
  // into rectangular slabs covering the face.
  const clipper = new spine.SkeletonClipping();

  // ---------- canvas / view ----------
  const canvas = createCanvas(size, size);
  // Anti-aliasing on the per-triangle clip edges is what makes a flat-colour
  // character carry ~4200 distinct colours: every abutting triangle pair leaves a
  // blended seam, and those blends drift as the mesh deforms, so they keep
  // flipping between palette entries ("every texture changes colour back and
  // forth"). "none" tiles the triangles exactly, leaving a few hundred flat
  // colours that fit an exact palette with no error at all. The trade-off is a
  // hard (un-antialiased) silhouette.
  canvas.antialias = argVal("--antialias", "default");
  const ctx = canvas.getContext("2d");
  let scale = 1, EX = 0, FY = 0;
  function setView(bb, pad = 1.06) {
    // ZOOM crops the box symmetrically before framing, i.e. it zooms in.
    const mx = (bb.maxX - bb.minX) * ZOOM / 2, my = (bb.maxY - bb.minY) * ZOOM / 2;
    const minX = bb.minX + mx, maxX = bb.maxX - mx;
    const minY = bb.minY + my, maxY = bb.maxY - my;
    const cx2 = (minX + maxX) / 2, cy2 = (minY + maxY) / 2;
    const span = Math.max(maxX - minX, maxY - minY) * pad || 1000;
    scale = size / span;
    EX = size / 2 - scale * cx2; FY = size / 2 + scale * cy2;
  }
  // Frame the character's actual drawn extent rather than the skeleton header
  // box: the header reserves far more room than any one character fills, which
  // wastes most of the canvas. Falls back to the header box if nothing is bound.
  const HEADER_BB = {
    minX: skeletonData.x, maxX: skeletonData.x + skeletonData.width,
    minY: skeletonData.y, maxY: skeletonData.y + skeletonData.height,
  };
  setView(HEADER_BB);

  // ---------- drawing ----------
  // small page cache (2048 -> 1024) + LRU tinted variants; plain multiply is
  // safe because atlas pages are fully opaque
  const PAGE_WORK = 1024;
  const smallCache = new Map();
  function smallPage(img) {
    let hit = smallCache.get(img);
    if (hit) return hit;
    const pc = createCanvas(PAGE_WORK, PAGE_WORK);
    pc.getContext("2d").drawImage(img, 0, 0, PAGE_WORK, PAGE_WORK);
    hit = pc;
    smallCache.set(img, hit);
    return hit;
  }
  const tintCache = new Map();
  const pageIds = new Map();
  let tintSeq = 0;
  // The tinted-page cache is keyed by (atlas page, colour). A typical character
  // needs ~27 distinct combinations (14 colours spread over several atlas pages),
  // i.e. ~108 MB of 1024^2 RGBA canvases. The cap must sit ABOVE the working set:
  // capping below it makes every frame rebuild the evicted pages, and that churn
  // of large native allocations is what drove RSS to multiple GB per animation.
  // Default to a generous cap that still bounds pathological cases.
  const TINT_CACHE_MAX_BYTES = parseInt(argVal("--tint-cache-mb", "256")) * 1048576;
  let tintCacheBytes = 0;
  function tintedPage(img, c) {
    const base = smallPage(img);
    // Key must include the source page: several atlas pages share one tint
    // colour, and keying on colour alone served another page's pixels.
    let id = pageIds.get(img);
    if (id === undefined) { id = ++tintSeq; pageIds.set(img, id); }
    const key = `${id}|${c.r.toFixed(3)},${c.g.toFixed(3)},${c.b.toFixed(3)}|${base.width}`;
    let hit = tintCache.get(key);
    if (hit) return hit;
    const pc = createCanvas(base.width, base.height);
    const pctx = pc.getContext("2d");
    pctx.drawImage(base, 0, 0);
    pctx.globalCompositeOperation = "multiply";
    pctx.fillStyle = `rgb(${Math.floor(c.r * 255)},${Math.floor(c.g * 255)},${Math.floor(c.b * 255)})`;
    pctx.fillRect(0, 0, base.width, base.height);
    // `multiply` composites source-over, so the opaque fill makes every pixel
    // opaque — that turns ring-shaped outline meshes into solid slabs that cover
    // whatever is behind them. Restore the page's own alpha afterwards.
    pctx.globalCompositeOperation = "destination-in";
    pctx.drawImage(base, 0, 0);
    hit = pc;
    const bytes = base.width * base.height * 4;
    while (tintCache.size && tintCacheBytes + bytes > TINT_CACHE_MAX_BYTES) {
      const oldest = tintCache.keys().next().value;
      tintCacheBytes -= tintCache.get(oldest).__bytes || 0;
      tintCache.delete(oldest);
    }
    hit.__bytes = bytes;
    tintCache.set(key, hit);
    tintCacheBytes += bytes;
    return hit;
  }

  // Push a triangle vertex out along its angle bisector so the clip path grows
  // by `eps` perpendicular to both adjacent edges.
  function dilateVertex(x, y, xa, ya, xb, yb, eps) {
    let ux = x - xa, uy = y - ya, vx = x - xb, vy = y - yb;
    const lu = Math.hypot(ux, uy) || 1, lv = Math.hypot(vx, vy) || 1;
    ux /= lu; uy /= lu; vx /= lv; vy /= lv;
    const sx = ux + vx, sy = uy + vy;
    const s = Math.hypot(sx, sy) / 2;               // cos(half angle)
    const sinHalf = Math.sqrt(Math.max(0, 1 - s * s));
    if (s < 1e-6 || sinHalf < 0.05) return [x, y];  // degenerate corner
    const t = Math.min(eps / sinHalf, eps * 8);
    return [x + (sx / (2 * s)) * t, y + (sy / (2 * s)) * t];
  }

  function drawTriangleOn(ctx2, img, wv, uvs, i0, i1, i2) {
    const width = img.width - 1, height = img.height - 1;
    const x0 = wv[i0 * 2], y0 = wv[i0 * 2 + 1];
    const x1 = wv[i1 * 2], y1 = wv[i1 * 2 + 1];
    const x2 = wv[i2 * 2], y2 = wv[i2 * 2 + 1];
    const u0 = uvs[i0 * 2] * width, v0 = uvs[i0 * 2 + 1] * height;
    const u1 = uvs[i1 * 2] * width, v1 = uvs[i1 * 2 + 1] * height;
    const u2 = uvs[i2 * 2] * width, v2 = uvs[i2 * 2 + 1] * height;
    // Canvas antialiases clip edges, so abutting triangles leave hairline seams
    // (a visible mesh wireframe on transparent exports). Neighbouring triangles
    // share edges, so clipping a sub-pixel-dilated copy overlaps them instead.
    const eps = SEAM_EPS / scale;
    const d0 = dilateVertex(x0, y0, x1, y1, x2, y2, eps);
    const d1 = dilateVertex(x1, y1, x2, y2, x0, y0, eps);
    const d2 = dilateVertex(x2, y2, x0, y0, x1, y1, eps);
    ctx2.beginPath();
    ctx2.moveTo(d0[0], d0[1]); ctx2.lineTo(d1[0], d1[1]); ctx2.lineTo(d2[0], d2[1]); ctx2.closePath();
    const ax = x1 - x0, ay = y1 - y0, bx = x2 - x0, by = y2 - y0;
    const du1 = u1 - u0, dv1 = v1 - v0, du2 = u2 - u0, dv2 = v2 - v0;
    let det = du1 * dv2 - du2 * dv1;
    if (det === 0) return;
    det = 1 / det;
    const a = (dv2 * ax - dv1 * bx) * det;
    const b = (dv2 * ay - dv1 * by) * det;
    const c = (du1 * bx - du2 * ax) * det;
    const d = (du1 * by - du2 * ay) * det;
    const e = x0 - a * u0 - c * v0;
    const f = y0 - b * u0 - d * v0;
    ctx2.save();
    ctx2.transform(a, b, c, d, e, f);
    ctx2.clip();
    ctx2.drawImage(img, 0, 0);
    ctx2.restore();
  }

  // World-space geometry of one slot, or null for attachment kinds we don't draw
  // (clipping/bounding boxes are never painted themselves).
  function slotGeometry(slot, att) {
    let wv, uvs, tris, texImg;
    if (att instanceof spine.RegionAttachment) {
      wv = new Float32Array(8);
      const offsets = att.sequence ? att.getOffsets(slot.appliedPose) : att.offsets;
      att.computeWorldVertices(slot, offsets, wv, 0, 2);
      const region = att.sequence ? att.sequence.regions[att.sequence.resolveIndex(slot.appliedPose)] : att.region;
      if (!region) return null;
      uvs = new Float32Array(8);
      const off8 = new Float32Array(8);
      spine.RegionAttachment.computeUVs(region, 0, 0, 1, 1, 0, att.width, att.height, off8, uvs);
      tris = [0, 1, 2, 2, 3, 0];
      texImg = region.texture?.getImage();
    } else if (att instanceof spine.MeshAttachment) {
      const wvl = att.worldVerticesLength;
      wv = new Float32Array(wvl);
      att.computeWorldVertices(skeleton, slot, 0, wvl, wv, 0, 2);
      if (att.sequence) {
        uvs = att.sequence.getUVs(att.sequence.resolveIndex(slot.appliedPose));
        texImg = att.sequence.regions[att.sequence.resolveIndex(slot.appliedPose)]?.texture?.getImage();
      } else {
        const region = att.region;
        if (!region) return null;
        uvs = new Float32Array(att.regionUVs.length);
        spine.MeshAttachment.computeUVs(region, att.regionUVs, uvs);
        texImg = region.texture?.getImage();
      }
      tris = att.triangles;
    } else {
      return null;
    }
    if (!texImg) return null;
    return { wv, uvs, tris, texImg };
  }

  // Cut geometry down to the active clip polygon. Returns null when the slot is
  // entirely outside it, in which case nothing should be painted.
  function clipGeometry(geo) {
    try {
      clipper.clipTrianglesUnpacked(geo.wv, 0, geo.tris, geo.tris.length, geo.uvs, 2);
    } catch (e) {
      // A degenerate clip polygon can make the clipper's convex decomposition
      // throw. Drawing unclipped beats dropping the slot: an over-drawn sticker
      // reads as a sticker, a vanished one reads as a bug.
      console.error(`clip fallback (${e.message}): drawing unclipped`);
      return geo;
    }
    // Judge by the buffer lengths ONLY — never by the return value.
    // clipTrianglesUnpacked ends with `return clipOutputItems !== null`, and
    // clipOutputItems is assigned only when some triangle actually straddled a
    // clip edge. A mesh lying entirely INSIDE the clip polygon takes the
    // "emit unchanged" branch, leaves clipOutputItems null, and still fills the
    // buffers with the complete, correct geometry — so a false return means
    // "nothing needed cutting", not "nothing survived". Gating on it dropped
    // every mesh fully inside a clip, and since the iris masks span the whole
    // eye, the eye's light layer (Eye1_Light_*) disappeared and both eyes
    // rendered as flat dark discs.
    // The buffers are fully reset at the top of each call, so leftovers are not
    // a hazard either; a zero length is the only genuine "nothing to draw".
    if (clipper.clippedVerticesLength === 0 || clipper.clippedTrianglesLength === 0) return null;
    return {
      wv: clipper.clippedVerticesTyped,
      uvs: clipper.clippedUVsTyped,
      tris: clipper.clippedTrianglesTyped,
      texImg: geo.texImg,
    };
  }

  function drawGeometry(slot, geo) {
    const c = slot.appliedPose.color;
    const { wv, uvs, tris, texImg } = geo;
    const drawImg = (c.r === 1 && c.g === 1 && c.b === 1) ? texImg : tintedPage(texImg, c);
    ctx.globalAlpha = c.a;
    for (let i = 0; i < tris.length; i += 3) {
      drawTriangleOn(ctx, drawImg, wv, uvs, tris[i], tris[i + 1], tris[i + 2]);
    }
    ctx.globalAlpha = 1;
  }

  // Single traversal shared by framing and drawing. Walks the draw order keeping
  // the active clip current, and hands each paintable slot geometry that is
  // already clipped. Framing MUST use this too: the raw bang meshes are far
  // larger than what gets drawn, so measuring them unclipped inflates the view
  // box and shrinks the character.
  function forEachDrawnSlot(cb) {
    clipper.clipEnd();
    for (const slot of skeleton.drawOrder.appliedPose) {
      if (!slot.bone.active) { clipper.clipEnd(slot); continue; }
      const att = slot.appliedPose.attachment;
      if (!att) { clipper.clipEnd(slot); continue; }
      if (att instanceof spine.ClippingAttachment) {
        clipper.clipEnd(slot);
        // SkeletonClipping's convex path needs a real polygon. The game ships a
        // 3-point Alert_Clip (a huge triangle that fully encloses the sticker it
        // "clips"), and feeding that to the clipper routes it through the
        // triangulator, whose degenerate output painted solid stickers as
        // outlines. Such a polygon cannot exclude anything meaningful, so treat
        // it as a no-op and draw the slot unclipped.
        if (att.worldVerticesLength >= 8) clipper.clipStart(skeleton, slot, att);
        continue;
      }
      if (slot.appliedPose.color.a === 0) { clipper.clipEnd(slot); continue; }
      let geo = slotGeometry(slot, att);
      if (geo && clipper.isClipping()) geo = clipGeometry(geo);
      // Consume immediately: clipGeometry returns views the clipper reuses.
      if (geo) cb(slot, geo);
      // A clip stays active *through* its end slot, then closes.
      clipper.clipEnd(slot);
    }
    clipper.clipEnd();
  }

  // Union of the world-space bounds of everything actually painted, used to frame
  // the canvas on the character's real extent (see setView).
  function collectBounds() {
    let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
    forEachDrawnSlot((slot, geo) => {
      const wv = geo.wv;
      for (let i = 0; i < wv.length; i += 2) {
        const x = wv[i], y = wv[i + 1];
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        mnx = Math.min(mnx, x); mxx = Math.max(mxx, x);
        mny = Math.min(mny, y); mxy = Math.max(mxy, y);
      }
    });
    if (!Number.isFinite(mnx) || mxx <= mnx || mxy <= mny) return HEADER_BB;
    return { minX: mnx, maxX: mxx, minY: mny, maxY: mxy };
  }

  // EmoteLab's shape "sliders" are Spine 4.3 slider constraints, not custom
  // data: the skeleton carries 64 SliderData entries, each pointing at a
  // CHAR/<name> animation, and SliderPose.time picks a moment inside it.
  // The character JSON's SliderConstraints list *is* the slider state, so it
  // has to be written into pose.time. Doing nothing leaves every slider at its
  // SliderData setup pose (usually the mid-point) and silently discards the
  // character's whole shape intent -- which is why bang length / side-hair
  // length / ear shape sliders appeared to have no effect at all.
  //
  // The JSON number is ALREADY a time in seconds, not a 0..1 fraction. Verified
  // against the game's own code: SliderConstraintManager.ApplySliderConstraint
  // does `slider.AppliedPose.Time = data.Value` with no scaling at all, and its
  // inverse UpdateValue does `data.Value = AppliedPose.Time`. SavedSliderConstraintData
  // (the on-disk shape of SliderConstraints) stores exactly {Name, Value}.
  // Corroborating data: SampleCharacter4 has Character/EarShape2 = 2.0 and
  // SampleCharacter2 has Character/MiddleBang_Shear = 1.413, neither of which a
  // 0..1 normalised slider could produce.
  const slidersByName = new Map();
  const slidersByLower = new Map();
  for (const c of skeleton.constraints) {
    if (!(c instanceof spine.Slider)) continue;
    slidersByName.set(c.data.name, c);
    slidersByLower.set(c.data.name.toLowerCase(), c);
  }
  const SLIDER_MODE = argVal("--slider-mode", "value");
  const sliderEntries = [];
  for (const sc of charData.SliderConstraints || []) {
    // The game's own Sliders.csv and the skeleton disagree on casing for at
    // least one slider (CSV/JSON "Character/Headwing_Position" vs skeleton
    // "Character/HeadWing_Position"), so match case-insensitively. Report
    // loudly when nothing matches: a dropped slider changes nothing on screen,
    // so silence here is indistinguishable from "the slider had no effect".
    const s = slidersByName.get(sc.Name) || slidersByLower.get(sc.Name.toLowerCase());
    if (!s) {
      const leaf = sc.Name.split("/").pop().toLowerCase();
      const close = [...slidersByName.keys()]
        .filter(n => n.toLowerCase().includes(leaf) || leaf.includes(n.split("/").pop().toLowerCase()))
        .slice(0, 3);
      console.error(`UNKNOWN SLIDER — IGNORED: ${sc.Name}` +
        (close.length ? `  (did you mean: ${close.join(", ")}?)` : ""));
      continue;
    }
    if (s.data.name !== sc.Name) {
      console.error(`slider name case differs: JSON "${sc.Name}" -> skeleton "${s.data.name}"`);
    }
    sliderEntries.push([s, sc.Value]);
  }
  function applySliders() {
    if (SLIDER_MODE === "none") return;
    for (const [s, v] of sliderEntries) {
      const dur = s.data.animation ? s.data.animation.duration : 0;
      s.pose.time = SLIDER_MODE === "scaled" ? v * dur : v;
    }
  }

  function stepAndApply(dt) {
    state.update(dt);
    state.apply(skeleton);
    // Must run after state.apply (the animation owns slider pose.time for any
    // slider it drives) and before updateWorldTransform, which is where
    // Slider.update() reads pose.time and blends the CHAR/ animation in.
    applySliders();
    skeleton.updateWorldTransform(spine.Physics.update);
    applyTints();
  }

  function renderFrame() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, size, size);
    if (bgColor !== "transparent") { ctx.fillStyle = bgColor; ctx.fillRect(0, 0, size, size); }
    ctx.setTransform(scale, 0, 0, -scale, EX, FY);
    forEachDrawnSlot((slot, geo) => drawGeometry(slot, geo));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
  }

  // Render one animation (or setup pose when null) to file.
  async function renderOne(oneAnimName, outFile, frameCount) {
    let a = null;
    if (oneAnimName) {
      a = skeletonData.animations.find(x => x.name === oneAnimName);
      if (!a) throw new Error(`animation '${oneAnimName}' not found`);
      state.clearTrack(0);
      skeleton.setupPose();
      state.setAnimation(0, a, true);
    } else {
      state.clearTrack(0);
    }
    const totalFrames = oneAnimName ? (frameCount || nFrames) : 1;

    // Pass 1: sweep the animation's *full duration* to learn the union of drawn
    // extents, then frame it. Sampling only the frames we intend to output would
    // make the crop depend on --frames, so the same emote would come out framed
    // differently at different frame counts.
    if (FRAME_CONTENT) {
      let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity;
      const duration = a ? Math.max(a.duration, 1 / fps) : 0;
      const steps = a ? Math.max(totalFrames, Math.ceil(duration * fps) + 1) : 1;
      for (let f = 0; f < steps; f++) {
        stepAndApply(1 / fps);
        const b = collectBounds();
        mnx = Math.min(mnx, b.minX); mxx = Math.max(mxx, b.maxX);
        mny = Math.min(mny, b.minY); mxy = Math.max(mxy, b.maxY);
      }
      if (Number.isFinite(mnx) && mxx > mnx && mxy > mny) {
        setView({ minX: mnx, maxX: mxx, minY: mny, maxY: mxy });
      } else {
        setView(HEADER_BB);
      }
      // replay from the start so pass 2 renders frame 0 of the animation
      state.clearTrack(0);
      skeleton.setupPose();
      if (a) state.setAnimation(0, a, true);
    }

    // Encode as we go instead of buffering every frame. Holding all N frames
    // meant N * size^2 * 4 bytes resident (11 MB per emote at 300px, and the
    // native allocations are not reclaimed promptly), which is what made a full
    // --all-emotes run die with "out of memory" after ~35 animations.
    const enc = GIFEncoder();

    // ---- APNG / animated WebP ------------------------------------------------
    // GIF only has 256 palette slots while a rendered frame carries thousands of
    // anti-aliased blend colours, so a mesh that deforms by sub-pixel amounts
    // makes colours jump between palette entries every frame ("every texture
    // keeps changing colour"). That is a property of GIF, not of the renderer.
    // APNG and animated WebP are 24-bit with a real alpha channel, so there is no
    // palette and therefore none of that churn. ffmpeg does the encoding; PNG
    // frames are piped to it so memory stays flat (same reason the GIF path
    // encodes as it goes).
    const outExt = path.extname(outFile).toLowerCase();
    // Frame delay in whole centiseconds. Derived exactly the way gifenc derives
    // it (`Math.round(delay / 10)`, gifenc/src/index.js:100) so the ffmpeg path
    // and the --no-ffmpeg-gif fallback can never drift apart. GIF cannot express
    // a finer unit, so this number is the real playback rate, and sharing it is
    // what keeps a pack that mixes formats in sync: before this, --fps 16 gave
    // GIF 6 cs (60 ms) but APNG 1/16 s (62.5 ms) for the very same call.
    const csDelay = Math.max(1, Math.round(Math.round(1000 / fps) / 10));
    if (outExt === ".webp" || outExt === ".apng") {
      const FFMPEG = process.env.EMOTELAB_FFMPEG || "ffmpeg";
      const args = ["-y", "-hide_banner", "-loglevel", "error",
        "-f", "image2pipe", "-c:v", "png", "-framerate", `100/${csDelay}`, "-i", "-"];
      if (outExt === ".webp") {
        args.push("-c:v", "libwebp_anim", "-loop", "0");
        if (hasFlag("--webp-lossy")) args.push("-q:v", argVal("--webp-quality", "90"));
        else args.push("-lossless", "1");
      } else {
        args.push("-c:v", "apng", "-plays", "0", "-f", "apng");
      }
      args.push("-pix_fmt", "rgba", outFile);
      const ff = spawn(FFMPEG, args, { stdio: ["pipe", "inherit", "inherit"] });
      let spawnErr = null;
      ff.on("error", (e) => { spawnErr = e; });
      const pipe = (buf) => new Promise((res, rej) => {
        if (spawnErr) return rej(spawnErr);
        if (ff.stdin.write(buf)) return res();
        ff.stdin.once("drain", res);
      });
      const done = new Promise((res, rej) => {
        ff.on("close", (code) => code === 0 ? res()
          : rej(new Error(`ffmpeg exited ${code} for ${outFile}`)));
        ff.on("error", rej);
      });
      for (let f = 0; f < totalFrames; f++) {
        stepAndApply(1 / fps);
        renderFrame();
        await pipe(canvas.toBuffer("image/png"));
        if (!oneAnimName) break;
      }
      ff.stdin.end();
      await done;
      return outFile;
    }

    // ---- GIF via ffmpeg palettegen/paletteuse --------------------------------
    // The gifenc path below builds its 255 slots from the MOST FREQUENT colours,
    // i.e. the flat art fills. The whole anti-aliased / gradient range then has
    // no entry of its own and snaps onto whichever flat colour happens to be
    // nearest, which quantisation turns into plateaus: a 300px Luv-2 frame
    // measures 7069 "flat" pixels where the lossless render has only 3315. A
    // plateau that spans content moving under it keeps flipping between two
    // *distant* entries -- exactly the reported "every texture changes colour
    // and jumps back and forth". ffmpeg's palettegen spreads the palette over
    // the whole colour distribution instead of the top of the histogram.
    // Measured, 35 frames @300px, gap = candidate rate - lossless rate on the
    // SAME pixels: Luv-1 +3.8 -> -0.7, Luv-2 -1.2 -> -2.3, Angry +15.7 -> -2.1,
    // Sleep-Normal +0.4 -> 0.0; per-pixel error mean 4.35/p99 41 -> 0.90/11.
    // Cost: ~1.8x the bytes (real gradient detail instead of flat plateaus).
    // Falls through to the gifenc path when ffmpeg is unavailable or fails.
    if (outExt === ".gif" && totalFrames > 1 && !hasFlag("--no-ffmpeg-gif")) {
      const FFMPEG = process.env.EMOTELAB_FFMPEG || "ffmpeg";
      const colors = Math.max(2, Math.min(256, parseInt(argVal("--gif-colors", "255"))));
      const gargs = ["-y", "-hide_banner", "-loglevel", "error",
        "-f", "image2pipe", "-c:v", "png", "-framerate", `100/${csDelay}`, "-i", "-",
        "-filter_complex",
        // alpha_threshold=1 is NOT the default (128) and matters a lot: GIF has
        // one-bit alpha, so every antialiased edge pixel must go fully opaque or
        // fully clear. At the default 128 ffmpeg drops every edge pixel below
        // half opacity, thinning the silhouette — measured against the lossless
        // APNG of the same animation, 17355 pixels differ (0.551% of the frame)
        // versus 2919 (0.093%) for the gifenc path, i.e. 6x the edge error. At 1
        // the mask differs by 0 pixels and the file grows only 2% (883->900 KB).
        `[0:v]split[a][b];[a]palettegen=max_colors=${colors}[p];`
        + `[b][p]paletteuse=dither=none:alpha_threshold=1`,
        "-loop", "0", "-f", "gif", outFile];
      const ff = spawn(FFMPEG, gargs, { stdio: ["pipe", "inherit", "inherit"] });
      // One promise that rejects the moment ffmpeg is unusable (missing binary,
      // EPIPE on stdin...). Raced against every write so a broken pipeline can
      // never leave the render loop waiting on a 'drain' that never comes —
      // that hang ends with an empty event loop and a silent exit 0.
      const ffFail = new Promise((_, rej) => {
        ff.on("error", rej);
        ff.stdin.on("error", rej);
      });
      ffFail.catch(() => {});
      const gpipe = (buf) => Promise.race([ffFail, new Promise((res) => {
        if (ff.stdin.write(buf)) return res();
        ff.stdin.once("drain", res);
      })]);
      const gdone = new Promise((res, rej) => {
        ff.on("close", (code) => code === 0 ? res()
          : rej(new Error(`ffmpeg exited ${code} for ${outFile}`)));
      });
      gdone.catch(() => {});   // the try/catch below only awaits one of the two
      try {
        for (let f = 0; f < totalFrames; f++) {
          stepAndApply(1 / fps);
          renderFrame();
          await gpipe(canvas.toBuffer("image/png"));
          if (!oneAnimName) break;
        }
        ff.stdin.end();
        await gdone;
        return outFile;
      } catch (e) {
        console.error(`ffmpeg GIF path failed (${e.message}) — using the built-in encoder`);
        try { ff.kill(); } catch { /* already gone */ }
        // The encode loop consumed animation time; rewind for the gifenc path.
        state.clearTrack(0);
        skeleton.setupPose();
        if (a) state.setAnimation(0, a, true);
      }
    }

    // Build the colour palette from a sample spread across the WHOLE animation,
    // not from frame 0 alone. Frame 0 is normally the neutral pose, so a prop
    // that only appears later (anger marks, hearts, fire, traffic cones...) had
    // no entry of its own and got mapped onto whichever hair/skin tone happened
    // to be nearest -- the prop then banded and shimmered as it moved.
    // 6 samples cost ~2 MB at 300px and a few extra frames of render time.
    const PAL_SAMPLES = Math.max(1, Math.min(6, totalFrames));
    const acc = new Uint8ClampedArray(PAL_SAMPLES * size * size * 4);
    for (let s = 0; s < PAL_SAMPLES; s++) {
      stepAndApply(1 / fps);
      renderFrame();
      acc.set(ctx.getImageData(0, 0, size, size).data, s * size * size * 4);
    }

    // Round every channel to a multiple of PALETTE_ROUND. Default 1 = no
    // rounding: the art's own colours are kept exactly, which matters because
    // rounding to 16/24 visibly shifts them (the dark hair turned blue at
    // round=24). Rounding is only useful for shrinking the colour count.
    const ROUND = Math.max(1, parseInt(argVal("--palette-round", "1")));
    const roundData = (src) => {
      if (ROUND === 1) {
        // Still binarise alpha: GIF has a single see-through slot, so an
        // in-between alpha would be written out as an opaque colour.
        const d = new Uint8ClampedArray(src);
        const a32 = new Uint32Array(d.buffer);
        for (let i = 0; i < a32.length; i++) {
          const c = a32[i];
          if (((c >> 24) & 0xff) <= 127) a32[i] = c & 0x00ffffff;
          else a32[i] = c | 0xff000000;
        }
        return d;
      }
      const d = new Uint8ClampedArray(src);
      const a32 = new Uint32Array(d.buffer);
      for (let i = 0; i < a32.length; i++) {
        const c = a32[i];
        const al = (c >> 24) & 0xff, b = (c >> 16) & 0xff, g = (c >> 8) & 0xff, r = c & 0xff;
        const ab = al <= 127 ? 0 : 255;
        const rr = Math.min(255, Math.round(r / ROUND) * ROUND);
        const gg = Math.min(255, Math.round(g / ROUND) * ROUND);
        const bb = Math.min(255, Math.round(b / ROUND) * ROUND);
        a32[i] = (ab << 24) | (bb << 16) | (gg << 8) | rr;
      }
      return d;
    };

    // Build the palette from the MOST FREQUENT colours rather than from
    // quantize(). quantize() is a perceptual quantizer: handed 4160 distinct
    // colours it still reproduces only 2.2% of them exactly (measured), so the
    // flat art colours themselves end up approximated, and the ~4000
    // anti-aliasing blends along the mesh's clip edges sit on Voronoi borders.
    // The mesh deforms by sub-pixel amounts every frame, those blends drift, and
    // the nearest-entry flips -- between two *invented* colours, which is what
    // reads as "every texture keeps changing colour and jumping back and forth".
    // Frequency order keeps the real art colours exactly (they cover most of the
    // pixels); the rare blends snap onto them instead.
    const rounded = roundData(acc);
    const freq = new Map();
    {
      const a32 = new Uint32Array(rounded.buffer);
      for (let i = 0; i < a32.length; i++) {
        const c = a32[i];
        freq.set(c, (freq.get(c) || 0) + 1);
      }
    }
    const byFreq = [...freq.entries()].sort((x, y) => y[1] - x[1]).map(([c]) => c);
    let palette, exact;
    if (byFreq.length <= 255) {
      palette = byFreq.map((c) => [c & 0xff, (c >> 8) & 0xff, (c >> 16) & 0xff, (c >> 24) & 0xff]);
      exact = true;
    } else {
      // Keep the 255 most-used colours exactly; the rest are mapped to the
      // nearest by applyPalette().
      palette = byFreq.slice(0, 255)
        .map((c) => [c & 0xff, (c >> 8) & 0xff, (c >> 16) & 0xff, (c >> 24) & 0xff]);
      exact = false;
    }

    // GIF marks exactly one palette slot as see-through. gifenc defaults that to
    // index 0, while the entry we want is wherever it happened to land, so the
    // background came out as a dark block instead of transparent. Point
    // transparency at a real alpha-0 entry (adding one if there is none) and keep
    // it at index 0: gifenc hardcodes the Logical Screen Descriptor's background
    // colour index to 0 and forces dispose=2 ("restore to background") whenever
    // transparency is on, so index 0 must be the transparent one.
    let ti = palette.findIndex((c) => c.length >= 4 && c[3] === 0);
    if (ti < 0) {
      palette = [[0, 0, 0, 0]].concat(palette);
      ti = 0;
    } else if (ti !== 0) {
      const t = palette[ti];
      palette = palette.slice();
      palette.splice(ti, 1);
      palette.unshift(t);
      ti = 0;
    }
    const transparentIndex = ti;
    if (process.env.EMOTELAB_PALETTE_DEBUG) {
      const top = byFreq.length ? `${((freq.get(byFreq[0]) / (PAL_SAMPLES * size * size)) * 100).toFixed(1)}%` : "-";
      console.error(`palette: ${byFreq.length} distinct colours, round=${ROUND}, `
        + `${exact ? "EXACT" : "top-255 by frequency"} -> ${palette.length} entries `
        + `(most common colour covers ${top})`);
    }

    // Rewind so the encode loop below starts at frame 0 again.
    state.clearTrack(0);
    skeleton.setupPose();
    if (a) state.setAnimation(0, a, true);

    for (let f = 0; f < totalFrames; f++) {
      stepAndApply(1 / fps);
      renderFrame();
      const rgba = roundData(ctx.getImageData(0, 0, size, size).data);
      const idx = applyPalette(rgba, palette, "rgba4444");
      enc.writeFrame(idx, size, size, {
        palette,
        delay: Math.round(1000 / fps),
        transparent: true,
        transparentIndex,
      });
      if (!oneAnimName) break;
    }
    if (totalFrames === 1) {
      fs.writeFileSync(outFile, canvas.toBuffer("image/png"));
    } else {
      enc.finish();
      fs.writeFileSync(outFile, Buffer.from(enc.bytes()));
    }
    return outFile;
  }

  if (allEmotes) {
    let names = skeletonData.animations.map(a => a.name).filter(n => n.startsWith("ANIM/"));
    if (onlyList) {
      const wanted = onlyList.split(",").map(s => s.trim()).filter(Boolean)
        .map(s => (s.startsWith("ANIM/") ? s : "ANIM/" + s));
      names = names.filter(n => wanted.includes(n));
    }
    const dir = outDir || path.dirname(outPath || ".");
    fs.mkdirSync(dir, { recursive: true });

    // ---- memory plan -------------------------------------------------------
    // Measured on a 16 GB machine, OrangeCat, 32 frames/emote:
    //   baseline (node + skeleton + 15 decoded 2048^2 atlas pages + the tint
    //   working set)          ~430 MB   <- independent of --size
    //   marginal per emote    ~0.3 MB @112px, ~2.4 MB @300px, ~6 MB @500px
    // The marginal term comes from frames/GIF buffers that the native allocator
    // releases lazily. Model it generously (x~2) rather than pretend it is zero.
    const atlasBytes = atlas.pages.reduce((s, p) => {
      const img = p.texture?.getImage?.();
      return s + (img ? img.width * img.height * 4 : 0);
    }, 0);
    const BASELINE_BYTES = atlasBytes + 190 * 1048576; // + skeleton, canvas, misc
    // 7 x frame size matches the measured 2.4 MB/emote at 300px (0.36 MB/frame).
    const perEmoteBytes = Math.max(0.3 * 1048576, size * size * 4 * 7);
    const totalRam = os.totalmem();
    const freeRam = os.freemem();
    // Plan against a conservative slice of *currently free* RAM. Concurrent apps
    // (browsers, IDEs) reclaim nothing just because we ask, so stay well under.
    const budget = Math.max(512 * 1048576, Math.min(freeRam * 0.45, totalRam * 0.25));
    const usable = budget - BASELINE_BYTES;
    const maxEmotes = Math.max(1, Math.floor(usable / perEmoteBytes));
    const mb = (n) => (n / 1048576).toFixed(0);

    const plan = {
      size,
      zoom: ZOOM,
      fps,
      animations: names.length,
      framesPerEmote: Math.min(framesCap, Math.ceil(2 * fps)),
      atlasMB: +mb(atlasBytes),
      baselineMB: +mb(BASELINE_BYTES),
      perEmoteMB: +(perEmoteBytes / 1048576).toFixed(2),
      totalRamMB: +mb(totalRam),
      freeRamNowMB: +mb(freeRam),
      budgetMB: +mb(budget),
      safeEmotesThisRun: maxEmotes,
      estPeakMB: +mb(BASELINE_BYTES + Math.min(names.length, maxEmotes) * perEmoteBytes),
    };
    // Hard ceiling: abort the batch cleanly if RSS passes it, whatever the model
    // says. Default leaves a wide margin below total RAM.
    const maxRssMB = parseInt(argVal("--max-rss-mb", String(Math.max(768, Math.floor(totalRam / 1048576 * 0.7)))));

    if (hasFlag("--plan")) {
      console.log(JSON.stringify({
        plan: { ...plan, maxRssGuardMB: maxRssMB },
        advice: maxEmotes >= names.length
          ? `当前可用内存下可以一次跑完 ${names.length} 个表情（预估峰值 ~${plan.estPeakMB} MB）`
          : `建议分 ${Math.ceil(names.length / maxEmotes)} 批，每批 ≤ ${maxEmotes} 个；或用 --only 指定片段`,
      }, null, 1));
      return;
    }

    const batchSize = parseInt(argVal("--batch-size", String(maxEmotes)));
    const t0 = Date.now();
    const rssMB = () => (process.memoryUsage().rss / 1048576).toFixed(0);
    let ok = 0;
    let stoppedEarly = null;
    const failed = [];
    console.error(`start rss=${rssMB()}MB plan=${JSON.stringify(plan)}`);
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const file = path.join(dir, name.replace(/\//g, "_") + ".gif");
      const per = Math.max(4, Math.min(framesCap, Math.ceil(
        (skeletonData.animations.find(x => x.name === name)?.duration || 2) * fps)));
      // Stop cleanly when this run has produced its planned share. Re-run with
      // --only "A,B,C" for the next slice; the CLI/SKILL documents the chunks.
      if (ok + failed.length >= batchSize) {
        stoppedEarly = names.length - i;
        console.error(`batch limit reached (${batchSize}); ${stoppedEarly} animation(s) left - re-run with --only or a larger --batch-size`);
        break;
      }
      try {
        await renderOne(name, file, per);
        ok++;
        const rss = +rssMB();
        console.error(`[${i + 1}/${names.length}] ${name} -> ${path.basename(file)} (${((Date.now() - t0) / 1000).toFixed(0)}s, rss=${rss}MB)`);
        // Guard rail: stop before the machine is driven into swap. The native
        // canvases are not released promptly, so RSS creeps up over a long run;
        // bailing out here keeps the box usable and the finished GIFs intact.
        if (rss > maxRssMB) {
          stoppedEarly = names.length - i - 1;
          console.error(`RSS ${rss}MB exceeded --max-rss-mb ${maxRssMB}; stopping with ${stoppedEarly} animation(s) left.`);
          console.error(`Re-run the remainder with --only, or lower --size / raise --max-rss-mb deliberately.`);
          break;
        }
      } catch (e) {
        failed.push(name);
        const st = (e.stack || e.message || String(e)).split("\n").slice(0, 5).join(" | ");
        console.error(`[${i + 1}/${names.length}] FAIL ${name}: ${st}`);
        // An OOM here poisons the process: every later animation fails the same
        // way. Bail out instead of burning time on a cascade of failures.
        if (/out of memory|ENOMEM/i.test(String(e.message || e))) {
          stoppedEarly = names.length - i - 1;
          console.error(`out of memory after ${ok} animation(s); stopping. Lower --size, or run in smaller --only slices.`);
          break;
        }
      }
    }
    console.log(JSON.stringify({
      dir, ok, failed, total: names.length,
      ...(stoppedEarly ? { stoppedEarly, remaining: stoppedEarly } : {}),
      plan,
    }, null, 1));
    return;
  }

  console.log(await renderOne(animName, outPath));
}

main().catch(e => { console.error(e); process.exit(1); });
