// Store screenshot framer — deterministic Playwright rendering.
// Design once in vw units (viewport == canvas), render natively per size.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));

const fail = (msg) => {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
};

function readJSON(file, label, hint = "") {
  const abs = path.resolve(DIR, file);
  if (!fs.existsSync(abs)) fail(`${label} not found: ${file}${hint ? `\n  ${hint}` : ""}`);
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch (e) {
    fail(`${label} (${file}) is not valid JSON: ${e.message}`);
  }
}

// Shared safety helpers: slide ids and asset names become file paths; theme
// colors are concatenated straight into CSS, so both must be validated.
const SAFE_ID = /^[a-z0-9][a-z0-9._-]*$/i; // slide id -> "<id>.png"
const SAFE_ASSET = /^[a-z0-9][a-z0-9._-]*\.(png|jpe?g|webp)$/i;
const HEX6 = /^#[0-9a-f]{6}$/i;
const HEX8 = /^#[0-9a-f]{8}$/i;
const isInside = (dir, name) => {
  const rel = path.relative(dir, path.resolve(dir, name));
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
};

// ---- CLI ----
const argv = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);
const deckFile = typeof argv.deck === "string" ? argv.deck : "deck.json";
const deck = readJSON(deckFile, "Deck config", "Copy deck.example.json to deck.json and edit it.");
const devices = readJSON("devices.json", "Device profiles");

const VALID_TREATMENTS = new Set(["bezel", "frameless", "both"]);
const treatmentArg = argv.treatment || "both";
if (!VALID_TREATMENTS.has(treatmentArg)) throw new Error(`Unknown --treatment=${treatmentArg}`);
const TREATMENTS = treatmentArg === "both" ? ["bezel", "frameless"] : [treatmentArg];
const ALL_DIRECTIONS = ["classic", "fancy", "bold"];
const VALID_DIRECTIONS = new Set([...ALL_DIRECTIONS, "both", "all"]);
const directionArg = argv.direction || "all";
if (!VALID_DIRECTIONS.has(directionArg)) throw new Error(`Unknown --direction=${directionArg}`);
const DIRECTIONS =
  directionArg === "all" ? ALL_DIRECTIONS :
  directionArg === "both" ? ["classic", "fancy"] : // legacy alias, pre-bold
  [directionArg];
const dev = devices[deck.device];
if (!dev) throw new Error(`Unknown device "${deck.device}" in deck.json`);
if (!Array.isArray(dev.sizes) || dev.sizes.length === 0) fail(`Device "${deck.device}" has no sizes[]`);
const SIZES = argv.sizes === "all" ? dev.sizes : dev.sizes.filter((s) => s.id === (argv.sizes || "6.9"));
if (SIZES.length === 0) throw new Error(`No matching size for --sizes=${argv.sizes || "6.9"}`);
for (const s of SIZES) {
  if (!Number.isFinite(s.w) || !Number.isFinite(s.h)) {
    fail(`Device "${deck.device}" size "${s.id}" needs numeric w/h (got ${s.w}x${s.h})`);
  }
}

if (typeof deck.appName !== "string" || !deck.appName.trim()) fail("deck.appName is required");
if (typeof deck.locale !== "string" || !/^[a-z0-9._-]+$/i.test(deck.locale)) {
  fail(`deck.locale must be a short path-safe code like "en" (got ${JSON.stringify(deck.locale)})`);
}

const t = deck.theme;
if (!t || typeof t !== "object") fail("deck.theme is missing (need navy, navyDeep, navyLift, ivory, gold, muted).");
const THEME_SPEC = { navy: HEX6, navyDeep: HEX6, ivory: HEX6, gold: HEX6, muted: HEX6, navyLift: HEX8 };
const themeErrors = Object.entries(THEME_SPEC).flatMap(([k, re]) =>
  typeof t[k] === "string" && re.test(t[k])
    ? []
    : [`theme.${k} must be ${re === HEX8 ? "8-digit #RRGGBBAA" : "6-digit #RRGGBB"} hex (got ${JSON.stringify(t[k])})`]
);
if (themeErrors.length) {
  fail(`Bad theme colors (hex only, they are concatenated with alpha suffixes into CSS):\n- ${themeErrors.join("\n- ")}`);
}

const escapeHTML = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const VALID_LAYOUTS = new Set(["device-bottom", "device-top", "two-devices", "no-device"]);
if (!Array.isArray(deck.slides) || deck.slides.length === 0) {
  fail("deck.json must include a non-empty slides[] array");
}

const SCREENS_DIR = path.join(DIR, "screens");
const seenIds = new Set();
const problems = [];
for (const [i, slide] of deck.slides.entries()) {
  const where = `slide[${i}]${slide && typeof slide.id === "string" ? ` "${slide.id}"` : ""}`;
  if (!slide || typeof slide !== "object") {
    problems.push(`${where}: not an object`);
    continue;
  }
  // id: required, filename-safe (becomes "<id>.png"), unique across the deck.
  if (typeof slide.id !== "string" || !SAFE_ID.test(slide.id)) {
    problems.push(`${where}: id must be letters/digits/._- only (it becomes "<id>.png")`);
  } else if (seenIds.has(slide.id)) {
    problems.push(`${where}: duplicate slide id "${slide.id}"`);
  } else {
    seenIds.add(slide.id);
  }
  if (!VALID_LAYOUTS.has(slide.layout)) {
    problems.push(`${where}: unknown layout "${slide.layout}" (expected ${[...VALID_LAYOUTS].join(", ")})`);
  }
  if (slide.features != null && !Array.isArray(slide.features)) {
    problems.push(`${where}: features must be an array of strings`);
  }
  // callout magnifier: single-device layouts only; x/y are % of the screenshot.
  if (slide.callout != null) {
    const c = slide.callout;
    if (slide.layout === "two-devices" || slide.layout === "no-device") {
      problems.push(`${where}: callout only works on device-bottom / device-top layouts`);
    } else if (
      typeof c !== "object" ||
      ![c.x, c.y, c.zoom].every(Number.isFinite) ||
      c.x < 0 || c.x > 100 || c.y < 0 || c.y > 100 ||
      c.zoom < 1.2 || c.zoom > 8
    ) {
      problems.push(`${where}: callout needs numeric x/y (0-100, % of screenshot) and zoom (1.2-8)`);
    } else if (c.label != null && typeof c.label !== "string") {
      problems.push(`${where}: callout.label must be a string`);
    }
  }
  // screenshots: required per layout, safe basename, present on disk.
  const shots = [];
  if (slide.layout !== "no-device") {
    if (!slide.screenshot) problems.push(`${where}: missing screenshot`);
    else shots.push(["screenshot", slide.screenshot]);
  }
  if (slide.layout === "two-devices") {
    if (!slide.screenshotSecondary) problems.push(`${where}: two-devices needs screenshotSecondary`);
    else shots.push(["screenshotSecondary", slide.screenshotSecondary]);
  }
  for (const [field, name] of shots) {
    if (typeof name !== "string" || !SAFE_ASSET.test(name) || !isInside(SCREENS_DIR, name)) {
      problems.push(`${where}: ${field} "${name}" is not a safe png/jpg/webp name inside screens/`);
    } else if (!fs.existsSync(path.join(SCREENS_DIR, name))) {
      problems.push(`${where}: ${field} file not found: screens/${name}`);
    }
  }
}
if (problems.length > 0) {
  fail(`Deck validation failed:\n- ${problems.join("\n- ")}`);
}

// ---- fonts as data URIs (self-hosted, no CDN) ----
const fontFile = (rel) => {
  const abs = path.join(DIR, "node_modules", rel);
  if (!fs.existsSync(abs)) fail(`Font asset missing: ${rel}\n  Run \`npm install\` in the framer dir first.`);
  return `url(data:font/woff2;base64,${fs.readFileSync(abs).toString("base64")}) format("woff2")`;
};
const face = (family, weight, rel) =>
  `@font-face{font-family:"${family}";font-style:normal;font-weight:${weight};font-display:block;src:${fontFile(rel)};}`;
const FONTS = [
  face("Playfair Display", 500, "@fontsource/playfair-display/files/playfair-display-latin-500-normal.woff2"),
  face("Playfair Display", 700, "@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff2"),
  face("Playfair Display", 800, "@fontsource/playfair-display/files/playfair-display-latin-800-normal.woff2"),
  face("Space Grotesk", 600, "@fontsource/space-grotesk/files/space-grotesk-latin-600-normal.woff2"),
  face("Space Grotesk", 700, "@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff2"),
  face("Inter", 500, "@fontsource/inter/files/inter-latin-500-normal.woff2"),
  face("Inter", 600, "@fontsource/inter/files/inter-latin-600-normal.woff2"),
  face("Inter", 700, "@fontsource/inter/files/inter-latin-700-normal.woff2"),
].join("");

const dataURI = (abs) => {
  const ext = path.extname(abs).slice(1);
  return `data:image/${ext};base64,${fs.readFileSync(abs).toString("base64")}`;
};
const screen = (name) => dataURI(path.join(DIR, "screens", name));

// Bezel frame + insets are only needed when a bezel treatment actually renders,
// so a frameless-only run does not require the asset to exist.
const FRAMES_DIR = path.join(DIR, "frames");
let bezelURI = "";
const ins = dev.screenInset || {};
if (TREATMENTS.includes("bezel")) {
  if (typeof dev.bezel !== "string" || !SAFE_ASSET.test(dev.bezel) || !isInside(FRAMES_DIR, dev.bezel)) {
    fail(`Device "${deck.device}" bezel must be a safe image name inside frames/ (got ${JSON.stringify(dev.bezel)})`);
  }
  if (!fs.existsSync(path.join(FRAMES_DIR, dev.bezel))) {
    fail(`Bezel frame not found: frames/${dev.bezel} (needed for --treatment bezel)`);
  }
  const badInset = ["left", "top", "width", "height", "radius"].filter((k) => !Number.isFinite(ins[k]));
  if (badInset.length) {
    fail(`Device "${deck.device}" screenInset needs numeric ${badInset.join(", ")} for bezel rendering`);
  }
  bezelURI = dataURI(path.join(FRAMES_DIR, dev.bezel));
}

// ---- device markup ----
function bezelDevice(shot, cls = "") {
  return `<div class="dev bezel ${cls}">
    <img class="shot" src="${screen(shot)}"/>
    <img class="frame" src="${bezelURI}"/>
  </div>`;
}
function framelessDevice(shot, cls = "") {
  return `<div class="dev frameless ${cls}"><img class="shot" src="${screen(shot)}"/></div>`;
}
const mkDevice = (treatment, shot, cls) =>
  treatment === "bezel" ? bezelDevice(shot, cls) : framelessDevice(shot, cls);

// ---- slide body ----
function fancyAccents() {
  // Editorial dimensionality only — no text chips (they duplicated the eyebrow label).
  return `<div class="fancy-ribbons" aria-hidden="true">
    <span class="ribbon ribbon-a"></span>
    <span class="ribbon ribbon-b"></span>
    <span class="grain"></span>
  </div>`;
}

function caption(s) {
  return `<div class="cap">
    <div class="eyebrow"><span class="tick"></span>${escapeHTML(s.label)}</div>
    <h1>${escapeHTML(s.headline).replace(/\n/g, "<br/>")}</h1>
  </div>`;
}

// Magnifier lens: re-uses the slide screenshot as a zoomed background so tiny UI
// details stay readable at store-preview size. x/y calibrated by eye (% of shot).
function calloutHTML(s) {
  const c = s.callout;
  const lens = `background-image:url(${screen(s.screenshot)});background-size:${c.zoom * 100}% auto;background-position:${c.x}% ${c.y}%;`;
  const label = c.label ? `<span class="callout-label">${escapeHTML(c.label)}</span>` : "";
  return `<div class="callout"><span class="lens" style="${lens}"></span>${label}</div>`;
}

function slideHTML(s, treatment, direction, index) {
  const chrome = direction === "fancy" ? fancyAccents() : "";
  const tone = `tone-${index % 3}`;
  if (s.layout === "no-device") {
    const items = (s.features || [])
      .map((f) => `<li><span class="dot"></span>${escapeHTML(f)}</li>`)
      .join("");
    return `<section class="slide closer ${tone}">
      ${chrome}
      <div class="closer-inner">
        <div class="brand">${escapeHTML(deck.appName)}</div>
        <div class="eyebrow"><span class="tick"></span>${escapeHTML(s.label)}</div>
        <h1>${escapeHTML(s.headline).replace(/\n/g, "<br/>")}</h1>
        <ul class="feat">${items}</ul>
      </div>
    </section>`;
  }
  if (s.layout === "two-devices") {
    return `<section class="slide dev-bottom ${tone}">
      ${chrome}
      ${caption(s)}
      <div class="stage two">
        ${mkDevice(treatment, s.screenshotSecondary, "back")}
        ${mkDevice(treatment, s.screenshot, "front")}
      </div>
    </section>`;
  }
  const order = s.layout === "device-top" ? "dev-top" : "dev-bottom";
  const callout = s.callout ? calloutHTML(s) : "";
  return `<section class="slide ${order} ${tone}">
    ${chrome}
    ${caption(s)}
    <div class="stage"><div class="glow"></div>${mkDevice(treatment, s.screenshot)}${callout}</div>
  </section>`;
}

// ---- page css ----
function css(direction) {
  return `
${FONTS}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:100%;height:100%;}
#canvas{position:relative;overflow:hidden;width:100%;height:100%;
  font-family:"Inter",sans-serif;
  background:
    radial-gradient(120% 80% at 50% -10%, ${t.navyLift} 0%, transparent 55%),
    radial-gradient(90% 55% at 50% 108%, #00000055 0%, transparent 60%),
    linear-gradient(178deg, ${t.navyDeep} 0%, ${t.navy} 42%, ${t.navyDeep} 100%);
}
.slide{position:relative;z-index:2;width:100%;height:100%;display:flex;flex-direction:column;
  align-items:center;padding:11vw 8vw 0;}
.slide.dev-top{flex-direction:column-reverse;padding:0 8vw 11vw;}
.cap{width:100%;text-align:center;flex:0 0 auto;}
.dev-top .cap{padding-bottom:2vw;}
.eyebrow{display:inline-flex;align-items:center;gap:1.6vw;
  font-weight:600;font-size:2.35vw;letter-spacing:.28em;color:${t.gold};
  text-transform:uppercase;}
.eyebrow .tick{width:4.4vw;height:.28vw;background:${t.gold};border-radius:1px;display:inline-block;}
h1{font-family:"Playfair Display",serif;font-weight:700;color:${t.ivory};
  font-size:8.7vw;line-height:1.02;letter-spacing:-.012em;margin-top:2.6vw;}
.stage{position:relative;flex:1 1 auto;width:100%;display:flex;align-items:flex-start;
  justify-content:center;margin-top:5vw;}
.dev-top .stage{align-items:flex-end;margin-top:0;margin-bottom:5vw;}
.glow{position:absolute;top:6%;left:50%;transform:translateX(-50%);
  width:78vw;height:60vw;border-radius:50%;
  background:radial-gradient(circle, ${t.gold}26 0%, transparent 62%);filter:blur(2vw);}
/* device */
.dev{position:relative;}
.dev.bezel{width:74vw;aspect-ratio:1022/2082;filter:drop-shadow(0 4vw 6vw #00000070);}
.dev.bezel .frame{position:absolute;z-index:1;inset:0;width:100%;height:100%;
  pointer-events:none;}
.dev.bezel .shot{position:absolute;z-index:2;left:${ins.left}%;top:${ins.top}%;
  width:${ins.width}%;height:${ins.height}%;object-fit:cover;
  border-radius:${ins.radius / 2}vw;}
.dev.frameless{width:70vw;aspect-ratio:1320/2868;border-radius:6.6vw;overflow:hidden;
  box-shadow:0 3.4vw 6vw #00000075, 0 0 0 .34vw #ffffff14;}
.dev.frameless .shot{width:100%;height:100%;object-fit:cover;display:block;}
/* two devices */
.stage.two{align-items:center;}
.stage.two .dev{position:absolute;}
.stage.two .dev.bezel{width:60vw;}
.stage.two .dev.frameless{width:57vw;}
.stage.two .back{transform:translate(-19vw,-3vw) rotate(-7deg);z-index:1;opacity:.98;}
.stage.two .front{transform:translate(17vw,4vw) rotate(6deg);z-index:2;}
/* closer */
.slide.closer{justify-content:center;padding:0 10vw;
  background:linear-gradient(180deg, #FBF8F2 0%, ${t.ivory} 38%, #EFE8DC 100%);}
.closer-inner{text-align:center;}
.closer .brand{font-family:"Playfair Display",serif;font-weight:800;color:${t.navy};
  font-size:5vw;letter-spacing:-.01em;margin-bottom:6vw;}
.closer .eyebrow{color:${t.gold};}
.closer .eyebrow .tick{background:${t.gold};}
.closer h1{color:${t.navy};font-size:8.4vw;}
.feat{list-style:none;margin-top:7vw;display:inline-flex;flex-direction:column;gap:3.4vw;
  text-align:left;}
.feat li{display:flex;align-items:center;gap:3vw;font-family:"Inter";font-weight:600;
  font-size:4.2vw;color:${t.navy};}
.feat .dot{width:2.6vw;height:2.6vw;flex:0 0 auto;transform:rotate(45deg);
  background:${t.gold};border-radius:.4vw;}
.fancy-ribbons,.fancy-chips{display:none;}
/* callout magnifier — zoomed detail lens, overlaps the device edge */
.callout{position:absolute;z-index:6;display:flex;flex-direction:column;align-items:center;gap:2vw;}
.dev-bottom .callout{right:1vw;top:6%;}
.dev-top .callout{right:1vw;bottom:6%;}
.callout .lens{display:block;width:33vw;height:33vw;border-radius:50%;
  border:.9vw solid ${t.gold};background-color:${t.navyDeep};background-repeat:no-repeat;
  box-shadow:0 2.6vw 5vw #00000066, 0 0 0 .4vw #ffffff1f;}
.callout .callout-label{font-weight:700;font-size:2.5vw;letter-spacing:.06em;color:${t.ivory};
  background:${t.navyDeep}d9;border:.22vw solid ${t.gold}88;padding:1.1vw 2.4vw;border-radius:999px;}

/* fancy direction — civic editorial: ivory material, navy + gold, Playfair. */
#canvas.direction-fancy{font-family:"Inter",sans-serif;
  background:
    radial-gradient(72% 44% at 12% 10%, #FFFFFFcc 0%, transparent 66%),
    radial-gradient(80% 58% at 90% 30%, ${t.gold}33 0%, transparent 58%),
    radial-gradient(94% 66% at 10% 84%, ${t.navy}1f 0%, transparent 62%),
    linear-gradient(135deg, #FBF8F1 0%, ${t.ivory} 46%, #F0E9DC 100%);
}
#canvas.direction-fancy::before{content:"";position:absolute;inset:0;
  background-image:radial-gradient(${t.navy}14 .12vw, transparent .14vw);
  background-size:2.6vw 2.6vw;opacity:.5;mix-blend-mode:multiply;}
#canvas.direction-fancy::after{content:"";position:absolute;left:-16vw;right:-16vw;bottom:-12vw;
  height:34vw;border-radius:50% 50% 0 0;
  background:linear-gradient(90deg, ${t.navy}cc 0%, ${t.navy}99 46%, ${t.gold}aa 100%);
  filter:blur(.2vw);transform:rotate(-4deg);opacity:.9;}
.direction-fancy .slide{align-items:flex-start;padding:7.8vw 7vw 0;overflow:hidden;}
.direction-fancy .slide.dev-top{flex-direction:column-reverse;padding:0 7vw 7.8vw;}
.direction-fancy .cap{position:relative;z-index:4;width:78%;text-align:left;margin-left:1vw;}
.direction-fancy .dev-top .cap{align-self:flex-end;text-align:right;padding-bottom:0;margin-left:0;margin-right:1vw;}
.direction-fancy .eyebrow{gap:1.4vw;color:${t.gold};font-size:2.2vw;letter-spacing:.22em;}
.direction-fancy .eyebrow .tick{width:3.6vw;height:.3vw;background:${t.gold};}
.direction-fancy h1{font-family:"Playfair Display",serif;font-weight:700;color:${t.navy};
  font-size:8.2vw;line-height:1.02;letter-spacing:-.012em;margin-top:2vw;text-wrap:balance;}
.direction-fancy .stage{z-index:3;margin-top:3vw;align-items:center;justify-content:center;}
.direction-fancy .dev-top .stage{margin-bottom:3vw;}
.direction-fancy .glow{display:none;}
.direction-fancy .dev.frameless{width:67vw;border-radius:7.2vw;
  box-shadow:0 3vw 7vw ${t.navy}33, 0 0 0 .42vw #FFFFFFdd;
  transform:translate(3vw,1vw) rotate(-5deg);}
.direction-fancy .tone-1 .dev.frameless{transform:translate(-1vw,1vw) rotate(4deg);}
.direction-fancy .tone-2 .dev.frameless{transform:translate(2vw,0) rotate(-2deg);}
.direction-fancy .dev.bezel{width:70vw;filter:drop-shadow(0 3vw 6vw ${t.navy}55);
  transform:translate(3vw,1vw) rotate(-5deg);}
.direction-fancy .tone-1 .dev.bezel{transform:translate(-1vw,1vw) rotate(4deg);}
.direction-fancy .tone-2 .dev.bezel{transform:translate(2vw,0) rotate(-2deg);}
.direction-fancy .stage.two{margin-top:1vw;justify-content:center;}
.direction-fancy .stage.two .dev.frameless{width:53vw;}
.direction-fancy .stage.two .dev.bezel{width:56vw;}
.direction-fancy .stage.two .back{transform:translate(-17vw,1vw) rotate(-11deg);opacity:.9;}
.direction-fancy .stage.two .front{transform:translate(15vw,4vw) rotate(7deg);}
.direction-fancy .fancy-ribbons{display:block;position:absolute;inset:0;z-index:1;pointer-events:none;}
.direction-fancy .ribbon{position:absolute;display:block;border-radius:999px;
  box-shadow:0 2.4vw 5vw ${t.navy}33;}
.direction-fancy .ribbon-a{width:96vw;height:16vw;left:-18vw;top:36vw;
  background:linear-gradient(100deg, ${t.navyDeep} 0%, ${t.navy} 100%);
  transform:rotate(-21deg);opacity:.92;}
.direction-fancy .ribbon-b{width:74vw;height:12vw;right:-24vw;bottom:19vw;
  background:linear-gradient(100deg, ${t.gold} 0%, #E3C874 100%);
  transform:rotate(24deg);opacity:.95;}
.direction-fancy .grain{position:absolute;inset:2vw;border-radius:7vw;border:.2vw solid #FFFFFF80;
  background:linear-gradient(120deg, #FFFFFF66, #FFFFFF10);backdrop-filter:blur(.5vw);opacity:.35;}
.direction-fancy .closer{background:
  radial-gradient(76% 52% at 14% 18%, ${t.gold}44 0%, transparent 66%),
  radial-gradient(74% 54% at 92% 34%, ${t.navy}22 0%, transparent 62%),
  linear-gradient(135deg, #FBF8F1 0%, ${t.ivory} 100%);
}
.direction-fancy .closer-inner{position:relative;z-index:4;width:100%;text-align:left;}
.direction-fancy .closer .brand{font-family:"Playfair Display",serif;font-weight:800;color:${t.navy};
  font-size:6vw;letter-spacing:-.01em;margin-bottom:4vw;}
.direction-fancy .closer .eyebrow{color:${t.gold};}
.direction-fancy .closer .eyebrow .tick{background:${t.gold};}
.direction-fancy .closer h1{color:${t.navy};font-size:7.7vw;}
.direction-fancy .feat{display:grid;grid-template-columns:1fr 1fr;gap:2vw;margin-top:6vw;width:100%;}
.direction-fancy .feat li{padding:2.4vw 2.5vw;border-radius:3vw;background:#FFFFFFe6;
  color:${t.navy};font-size:3.35vw;box-shadow:0 1vw 3vw ${t.navy}1f;}
.direction-fancy .feat .dot{background:${t.gold};}
.direction-fancy .callout .lens{border-color:${t.navy};background-color:${t.ivory};
  box-shadow:0 2.6vw 5vw ${t.navy}40, 0 0 0 .4vw #FFFFFFcc;}
.direction-fancy .callout .callout-label{color:${t.navy};background:#FFFFFFe6;border-color:${t.navy}55;}

/* bold direction — poster contrast: heavy grotesk type, gold blocks, sticker shadows. */
#canvas.direction-bold{font-family:"Space Grotesk","Inter",sans-serif;
  background:linear-gradient(165deg, ${t.navyDeep} 0%, ${t.navy} 130%);}
#canvas.direction-bold::before{content:"";position:absolute;inset:0;
  background:linear-gradient(115deg, transparent 58%, ${t.gold}30 58.3%, ${t.gold}30 76%, transparent 76.3%);}
#canvas.direction-bold::after{content:"";position:absolute;left:-9vw;bottom:-9vw;width:46vw;height:46vw;
  border-radius:50%;border:1.2vw solid ${t.gold}47;}
.direction-bold .slide{align-items:flex-start;padding:8.6vw 7vw 0;overflow:hidden;}
.direction-bold .slide.dev-top{flex-direction:column-reverse;padding:0 7vw 8.6vw;}
.direction-bold .cap{position:relative;z-index:4;text-align:left;}
.direction-bold .dev-top .cap{padding-bottom:0;}
.direction-bold .eyebrow{background:${t.gold};color:${t.navyDeep};font-weight:700;
  font-size:2.5vw;letter-spacing:.14em;padding:1.2vw 2.6vw;border-radius:1.2vw;gap:0;}
.direction-bold .eyebrow .tick{display:none;}
.direction-bold h1{font-family:"Space Grotesk",sans-serif;font-weight:700;color:${t.ivory};
  font-size:10vw;line-height:.98;letter-spacing:-.03em;margin-top:2.8vw;text-transform:uppercase;}
.direction-bold .glow{display:none;}
.direction-bold .stage{margin-top:4vw;align-items:flex-start;}
.direction-bold .dev-top .stage{align-items:flex-end;margin-top:0;margin-bottom:4vw;}
.direction-bold .dev.frameless{width:78vw;border-radius:7vw;transform:rotate(-2deg);
  box-shadow:1.8vw 1.8vw 0 ${t.gold}, 0 4vw 8vw #00000080;}
.direction-bold .tone-1 .dev.frameless{transform:rotate(2deg);
  box-shadow:-1.8vw 1.8vw 0 ${t.gold}, 0 4vw 8vw #00000080;}
.direction-bold .dev.bezel{width:79vw;transform:rotate(-2deg);
  filter:drop-shadow(1.4vw 1.6vw 0 ${t.gold}) drop-shadow(0 4vw 7vw #000000aa);}
.direction-bold .tone-1 .dev.bezel{transform:rotate(2deg);
  filter:drop-shadow(-1.4vw 1.6vw 0 ${t.gold}) drop-shadow(0 4vw 7vw #000000aa);}
.direction-bold .stage.two{align-items:center;}
.direction-bold .stage.two .dev.frameless{width:55vw;}
.direction-bold .stage.two .dev.bezel{width:58vw;}
.direction-bold .stage.two .back{transform:translate(-18vw,-2vw) rotate(-8deg);opacity:.94;}
.direction-bold .stage.two .front{transform:translate(16vw,4vw) rotate(5deg);}
.direction-bold .callout .lens{border-width:1.1vw;
  box-shadow:1.2vw 1.2vw 0 ${t.navyDeep}, 0 2.6vw 5vw #00000080;}
.direction-bold .closer{justify-content:center;align-items:flex-start;padding:0 8vw;
  background:linear-gradient(165deg, ${t.navyDeep} 0%, ${t.navy} 130%);}
.direction-bold .closer-inner{text-align:left;width:100%;}
.direction-bold .closer .brand{font-family:"Space Grotesk",sans-serif;font-weight:700;
  color:${t.gold};font-size:5vw;letter-spacing:.02em;margin-bottom:5vw;}
.direction-bold .closer h1{color:${t.ivory};font-size:9.2vw;}
.direction-bold .feat{display:flex;flex-direction:column;gap:2.8vw;margin-top:6.4vw;width:100%;}
.direction-bold .feat li{border:.4vw solid ${t.gold}59;border-radius:2.6vw;padding:2.8vw 3.2vw;
  color:${t.ivory};font-family:"Space Grotesk",sans-serif;font-weight:600;font-size:4vw;}
.direction-bold .feat .dot{background:${t.gold};}
`;
}

function pageHTML(s, treatment, direction, index) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css(direction)}</style></head>
<body><div id="canvas" class="direction-${direction}">${slideHTML(s, treatment, direction, index)}</div></body></html>`;
}

function writeShowcase(records) {
  const outRoot = path.join(DIR, "out");
  const rel = (file) => path.relative(outRoot, file).split(path.sep).join("/");
  const renderedAt = new Date().toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
  const sections = DIRECTIONS.map((direction) => {
    const treatments = TREATMENTS.map((treatment) => {
      const sizeRows = SIZES.map((size) => {
        const shots = deck.slides
          .map((slide, index) => {
            const record = records.find(
              (item) =>
                item.direction === direction &&
                item.treatment === treatment &&
                item.sizeId === size.id &&
                item.slideId === slide.id
            );
            if (!record) return "";
            const headline = escapeHTML(slide.headline).replace(/\n/g, " / ");
            return `<a class="shot" href="${rel(record.file)}">
              <img src="${rel(record.file)}" alt="${escapeHTML(`${direction} ${slide.id}`)}"/>
              <span>${String(index + 1).padStart(2, "0")} ${escapeHTML(slide.id)}</span>
              <small>${headline}</small>
            </a>`;
          })
          .join("");

        return `<section class="size-block">
          <div class="row-head">
            <h3>${escapeHTML(size.id)} - ${size.w} x ${size.h}</h3>
            <p>${escapeHTML(direction)} / ${escapeHTML(treatment)} / ${escapeHTML(deck.locale)}</p>
          </div>
          <div class="filmstrip">${shots}</div>
        </section>`;
      }).join("");

      return `<section class="treatment">
        <h3 class="treatment-title">${escapeHTML(treatment)}</h3>
        ${sizeRows}
      </section>`;
    }).join("");

    return `<section class="direction">
      <h2>${escapeHTML(direction)} direction</h2>
      ${treatments}
    </section>`;
  }).join("");

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHTML(deck.appName)} screenshot showcase</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#0b0d12;color:#f7f3ea;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
header{position:sticky;top:0;z-index:2;padding:24px 32px;border-bottom:1px solid #ffffff14;background:#0b0d12ee;backdrop-filter:blur(14px)}
h1,h2,h3,p{margin:0}
h1{font-size:22px;font-weight:750;letter-spacing:0}
.meta{margin-top:8px;color:#aeb6c6;font-size:13px;line-height:1.6}
main{padding:30px 32px 48px}
.direction{margin:0 0 54px}
h2{font-size:26px;color:#ffffff;margin:0 0 18px}
.treatment{margin:0 0 34px}
.treatment-title{font-size:13px;text-transform:uppercase;letter-spacing:.16em;color:#d5b86c;margin:0 0 16px}
.size-block{margin:0 0 28px}
.row-head{display:flex;align-items:baseline;justify-content:space-between;gap:20px;margin:0 0 14px}
.row-head h3{font-size:15px;font-weight:700;color:#ffffff}
.row-head p{font-size:12px;color:#8d96a8;text-transform:uppercase;letter-spacing:.12em}
.filmstrip{display:flex;gap:18px;overflow-x:auto;padding:4px 4px 18px;scroll-snap-type:x mandatory}
.shot{flex:0 0 clamp(170px,18vw,300px);color:inherit;text-decoration:none;scroll-snap-align:start}
.shot img{display:block;width:100%;height:auto;border-radius:18px;background:#151923;box-shadow:0 18px 46px #00000080,0 0 0 1px #ffffff14}
.shot span{display:block;margin-top:10px;font-size:12px;font-weight:700;color:#ffffff}
.shot small{display:block;margin-top:4px;color:#9ea7b9;font-size:12px;line-height:1.35}
@media (max-width:720px){
  header,main{padding-left:18px;padding-right:18px}
  .row-head{display:block}
  .row-head p{margin-top:5px}
  .shot{flex-basis:68vw}
}
</style>
</head>
<body>
<header>
  <h1>${escapeHTML(deck.appName)} screenshot showcase</h1>
  <p class="meta">${escapeHTML(deck.device)} / ${escapeHTML(deck.locale)} / ${records.length} frames / ${DIRECTIONS.join(" vs ")} / generated ${renderedAt}</p>
</header>
<main>${sections}</main>
</body>
</html>`;

  const out = path.join(outRoot, "index.html");
  fs.mkdirSync(outRoot, { recursive: true });
  fs.writeFileSync(out, html);
  return out;
}

// ---- render loop (single browser launch) ----
const browser = await chromium.launch();
const ctx = await browser.newContext({ deviceScaleFactor: 1 });
const page = await ctx.newPage();
let n = 0;
const records = [];
for (const direction of DIRECTIONS) {
  for (const treatment of TREATMENTS) {
    for (const size of SIZES) {
      const outDir = path.join(DIR, "out", direction, treatment, deck.locale, size.id);
      fs.mkdirSync(outDir, { recursive: true });
      await page.setViewportSize({ width: size.w, height: size.h });
      for (const [index, s] of deck.slides.entries()) {
        await page.setContent(pageHTML(s, treatment, direction, index), { waitUntil: "load" });
        await page.evaluate(() => document.fonts.ready);
        const el = page.locator("#canvas");
        const out = path.join(outDir, `${s.id}.png`);
        await el.screenshot({ path: out });
        records.push({ direction, treatment, sizeId: size.id, slideId: s.id, file: out });
        n++;
        process.stdout.write(`\r${direction} ${treatment} ${size.id} ${s.id} (${size.w}x${size.h})   `);
      }
    }
  }
}
await browser.close();
const showcase = writeShowcase(records);
console.log(`\ndone — ${n} frames -> out/`);
console.log(`showcase -> ${showcase}`);
