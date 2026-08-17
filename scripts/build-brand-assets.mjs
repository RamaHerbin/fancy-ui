#!/usr/bin/env node
/**
 * Brand asset pipeline -- favicons, touch icon, PWA manifest icons, OG image.
 *
 * Reads the brand mark from `static/favicon.svg` (a four-pointed sparkle on a
 * 32x32 viewBox, CSS-animated for the live favicon) and rasterizes it at fixed
 * sizes via Playwright's bundled Chromium -- no new npm dependency. The
 * animation's `<style>` block is stripped before rendering so every output
 * freezes at the mark's rest position (the keyframes' 0%/100% state), which is
 * deterministic and requires no timing/sleep hacks.
 *
 * Every icon is captured as an exact-size element screenshot (viewport and
 * `#stage` div both set to the target pixel size, deviceScaleFactor 1) so
 * there is no supersample-then-downscale step for icons. og.png follows the
 * same dsf-1 direct-render approach to keep the pipeline uniform and the
 * byte budget comfortable.
 *
 * Emits, all under `static/`:
 *   - apple-touch-icon.png (180x180, solid #050508 -- Apple ignores alpha)
 *   - icon-192.png, icon-512.png (transparent, for site.webmanifest)
 *   - favicon.ico (single 32x32 PNG-in-ICO: hand-rolled ICONDIR +
 *     ICONDIRENTRY wrapping the PNG bytes -- valid in all evergreen browsers)
 *   - og.png (1200x630 social card, static CSS only)
 *   - site.webmanifest
 *
 * Plus `.github/logo.png` (256x256, transparent) for the README -- GitHub
 * sanitizes SVG in markdown, so the readme needs a raster of the same mark.
 *
 * Prints a byte-size table and exits non-zero if og.png exceeds
 * MAX_OG_BYTES or any icon exceeds its entry in ICON_BUDGETS.
 *
 * Usage: node scripts/build-brand-assets.mjs   (or `pnpm build:brand-assets`)
 */

import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const staticDir = join(repoRoot, "static");
const githubDir = join(repoRoot, ".github");

const MAX_OG_BYTES = 300 * 1024;

// Per-asset ceilings rather than one flat number. The mark is a smooth gradient
// under a wide Gaussian halo, which PNG cannot pack anywhere near as tightly as
// the flat shapes an icon set usually carries -- cost scales with area, so a
// single budget would either be slack at 32px or unmeetable at 512px. Each
// entry is roughly 1.4x the current output, tight enough to catch a regression.
const ICON_BUDGETS = {
	"apple-touch-icon.png": 24 * 1024,
	"icon-192.png": 40 * 1024,
	"icon-512.png": 170 * 1024,
	"favicon.ico": 8 * 1024,
	"logo.png": 80 * 1024,
};

// Site palette (src/routes/layout.css has no font-family override, so the
// wordmark uses Tailwind v4's default sans stack; the violet->blue accent
// and grid/glow treatment mirror src/lib/components/landing/HeroSection.svelte).
const BG = "#050508";
const ACCENT_FROM = "#8b5cf6";
const ACCENT_TO = "#3f7df6";
const FONT_STACK =
	'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"';

function loadStaticMark() {
	const raw = readFileSync(join(staticDir, "favicon.svg"), "utf8");
	// Drop the <style>/@keyframes block: the twinkle's 0%/100% state is
	// scale(1)/opacity(1), so the unanimated markup already renders at the
	// intended rest pose.
	const stripped = raw.replace(/<style>[\s\S]*?<\/style>\s*/, "");
	if (stripped === raw) {
		throw new Error(
			"expected a <style> block in static/favicon.svg to strip -- source may have changed"
		);
	}
	return stripped;
}

// The strip footer used to hardcode a component count, which silently drifted
// from the registry. Read the real number instead, the same way
// scripts/build-og-images.mjs loads registry.ts.
async function loadComponentCount() {
	const registryPath = join(repoRoot, "src", "lib", "fancy-ui", "registry.ts");
	try {
		const { transformWithEsbuild } = await import("vite");
		const source = readFileSync(registryPath, "utf8");
		const { code } = await transformWithEsbuild(source, registryPath, { loader: "ts" });
		const { registry } = await import(
			`data:text/javascript;base64,${Buffer.from(code, "utf8").toString("base64")}`
		);
		const count = Object.keys(registry).length;
		if (count === 0) throw new Error("registry is empty");
		return count;
	} catch (err) {
		throw new Error(`could not load registry.ts (${err.message})`);
	}
}

function iconHtml(markSvg, { size, background, scale, transparent }) {
	return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; }
  html, body { width:${size}px; height:${size}px; ${transparent ? "background:transparent;" : ""} }
  #stage {
    width:${size}px; height:${size}px;
    display:flex; align-items:center; justify-content:center;
    background:${transparent ? "transparent" : background};
  }
  #stage svg { display:block; width:${Math.round(size * scale)}px; height:${Math.round(size * scale)}px; }
</style></head>
<body><div id="stage">${markSvg}</div></body></html>`;
}

function ogHtml(markSvg, componentCount) {
	return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:1200px; height:630px; overflow:hidden; }
  body {
    position:relative;
    background:${BG};
    font-family:${FONT_STACK};
  }
  .grid {
    position:absolute; inset:0;
    background-image:
      linear-gradient(rgba(139,92,246,.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(139,92,246,.05) 1px, transparent 1px);
    background-size:64px 64px;
  }
  .glow-a {
    position:absolute; top:-18%; right:-8%; width:60%; height:85%;
    background:radial-gradient(ellipse 50% 40% at 60% 40%, rgba(124,58,237,.35), rgba(63,125,246,.15) 55%, transparent 75%);
    filter:blur(50px);
  }
  .glow-b {
    position:absolute; bottom:-25%; left:-10%; width:50%; height:70%;
    background:radial-gradient(ellipse 50% 40% at 40% 60%, rgba(63,125,246,.22), transparent 70%);
    filter:blur(60px);
  }
  .content {
    position:relative; z-index:1;
    display:flex; flex-direction:column; justify-content:center;
    height:100%; padding:0 90px;
  }
  .brand-row { display:flex; align-items:center; gap:22px; }
  .mark { width:74px; height:74px; flex-shrink:0; }
  .mark svg { display:block; width:100%; height:100%; }
  .wordmark {
    font-size:96px; font-weight:800; letter-spacing:-0.03em;
    background:linear-gradient(180deg,#ffffff,#b8bfd4);
    -webkit-background-clip:text; background-clip:text; color:transparent;
  }
  .tagline {
    margin-top:22px; font-size:30px; font-weight:500; color:#9aa3b2; letter-spacing:-0.01em;
  }
  .strip {
    position:absolute; left:90px; right:90px; bottom:56px;
    display:flex; align-items:center; gap:14px;
    padding-top:22px; border-top:1px solid rgba(255,255,255,.1);
    font-size:20px; font-weight:500; letter-spacing:.02em; color:#7d859c;
  }
  .strip .accent {
    background:linear-gradient(100deg,${ACCENT_FROM},${ACCENT_TO});
    -webkit-background-clip:text; background-clip:text; color:transparent; font-weight:700;
  }
</style></head>
<body>
  <div class="grid"></div>
  <div class="glow-a"></div>
  <div class="glow-b"></div>
  <div class="content">
    <div class="brand-row">
      <div class="mark">${markSvg}</div>
      <div class="wordmark">FancyUI</div>
    </div>
    <div class="tagline">Animated components for Svelte 5</div>
  </div>
  <div class="strip">
    <span class="accent">${componentCount} components</span><span>&middot;</span><span>MIT</span><span>&middot;</span><span>Tailwind CSS v4</span>
  </div>
</body></html>`;
}

// Hand-roll a single-image ICO: 6-byte ICONDIR + 16-byte ICONDIRENTRY
// wrapping a PNG payload verbatim (the "PNG-in-ICO" format every evergreen
// browser accepts).
function pngToIco(pngBuffer, size) {
	const header = Buffer.alloc(6 + 16);
	header.writeUInt16LE(0, 0); // reserved
	header.writeUInt16LE(1, 2); // type: 1 = icon
	header.writeUInt16LE(1, 4); // image count

	const entryOffset = 6;
	header.writeUInt8(size, entryOffset + 0); // width (32 fits in a byte)
	header.writeUInt8(size, entryOffset + 1); // height
	header.writeUInt8(0, entryOffset + 2); // color count: 0 = not palette-based
	header.writeUInt8(0, entryOffset + 3); // reserved
	header.writeUInt16LE(1, entryOffset + 4); // color planes
	header.writeUInt16LE(32, entryOffset + 6); // bits per pixel
	header.writeUInt32LE(pngBuffer.length, entryOffset + 8); // bytes in resource
	header.writeUInt32LE(6 + 16, entryOffset + 12); // offset of image data

	return Buffer.concat([header, pngBuffer]);
}

function fmtBytes(n) {
	return `${(n / 1024).toFixed(1)} KB`;
}

async function main() {
	mkdirSync(staticDir, { recursive: true });
	mkdirSync(githubDir, { recursive: true });
	const markSvg = loadStaticMark();
	const componentCount = await loadComponentCount();

	const browser = await chromium.launch();
	const rows = [];
	let overBudget = false;

	try {
		const context = await browser.newContext({ deviceScaleFactor: 1 });
		const page = await context.newPage();

		async function renderStage(html, size) {
			await page.setViewportSize({ width: size, height: size });
			await page.setContent(html, { waitUntil: "load" });
			const stage = page.locator("#stage");
			return stage.screenshot({ omitBackground: true, type: "png" });
		}

		async function writeIcon(fileName, buf, dir = staticDir) {
			const outPath = join(dir, fileName);
			writeFileSync(outPath, buf);
			const bytes = buf.length;
			const budget = ICON_BUDGETS[fileName];
			if (budget === undefined) throw new Error(`no byte budget declared for ${fileName}`);
			const label = dir === staticDir ? fileName : `.github/${fileName}`;
			rows.push({ file: label, bytes: fmtBytes(bytes), budget: fmtBytes(budget) });
			if (bytes > budget) overBudget = true;
			return outPath;
		}

		// Apple ignores alpha on touch icons, so it gets a solid background.
		const appleTouchIcon = await renderStage(
			iconHtml(markSvg, { size: 180, background: BG, scale: 0.72, transparent: false }),
			180
		);
		await writeIcon("apple-touch-icon.png", appleTouchIcon);

		const icon192 = await renderStage(
			iconHtml(markSvg, { size: 192, background: BG, scale: 0.76, transparent: true }),
			192
		);
		await writeIcon("icon-192.png", icon192);

		const icon512 = await renderStage(
			iconHtml(markSvg, { size: 512, background: BG, scale: 0.76, transparent: true }),
			512
		);
		await writeIcon("icon-512.png", icon512);

		const favicon32 = await renderStage(
			iconHtml(markSvg, { size: 32, background: BG, scale: 0.86, transparent: true }),
			32
		);
		const icoBuf = pngToIco(favicon32, 32);
		await writeIcon("favicon.ico", icoBuf);

		// README mark. Transparent so it sits on GitHub's light and dark themes
		// alike; scaled a touch tighter than the PWA icons because the readme
		// renders it small.
		const readmeLogo = await renderStage(
			iconHtml(markSvg, { size: 256, background: BG, scale: 0.92, transparent: true }),
			256
		);
		await writeIcon("logo.png", readmeLogo, githubDir);

		// og.png: full-page render, not an element screenshot.
		await page.setViewportSize({ width: 1200, height: 630 });
		await page.setContent(ogHtml(markSvg, componentCount), { waitUntil: "load" });
		const ogBuf = await page.screenshot({ type: "png" });
		const ogPath = join(staticDir, "og.png");
		writeFileSync(ogPath, ogBuf);
		rows.push({ file: "og.png", bytes: fmtBytes(ogBuf.length), budget: fmtBytes(MAX_OG_BYTES) });
		if (ogBuf.length > MAX_OG_BYTES) overBudget = true;

		await context.close();
	} finally {
		await browser.close();
	}

	const manifest = {
		name: "FancyUI",
		short_name: "FancyUI",
		icons: [
			{ src: "/icon-192.png", sizes: "192x192", type: "image/png" },
			{ src: "/icon-512.png", sizes: "512x512", type: "image/png" },
		],
		theme_color: "#0a0a0a",
		background_color: "#050508",
		display: "browser",
	};
	writeFileSync(join(staticDir, "site.webmanifest"), `${JSON.stringify(manifest, null, "\t")}\n`);
	rows.push({ file: "site.webmanifest", bytes: "-", budget: "-" });

	console.table(rows);

	if (overBudget) {
		console.error(
			"FAIL: at least one asset exceeds its byte budget -- see the budget column above."
		);
		process.exit(1);
	}
	console.log("OK: all assets within budget.");
}

main();
