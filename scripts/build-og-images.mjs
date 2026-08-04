#!/usr/bin/env node
/**
 * Per-component social cards -- static/og/<slug>.jpg, one per registry entry.
 *
 * Consumed as `og:image` at `/og/<slug>.jpg` by the component doc pages. The
 * frame reuses the brand language of `static/og.png` (see
 * scripts/build-brand-assets.mjs): #050508 field, faint violet grid, two
 * blurred violet/blue glows, the five-circle mark from `static/favicon.svg`,
 * and a white->gray gradient wordmark. Where og.png centers the wordmark,
 * these cards demote it to a top-left lockup and give the stage to the
 * component name so the card stays readable at feed-thumbnail scale.
 *
 * Component metadata comes from `src/lib/fancy-ui/registry.ts`. The source is
 * transpiled in-memory with Vite's transformWithEsbuild (vite is a direct
 * dependency, so it resolves on every supported runtime, Node 20 included --
 * no reliance on Node's native type stripping) and imported as a data: URL,
 * which also sidesteps Windows drive-letter paths being misread as URL
 * schemes by dynamic import(). The registry's only import is `import type`,
 * which erases to nothing, so no bundling is needed. That keeps this script
 * honest about the real module rather than re-implementing a TS parser like
 * scripts/check-registry.mjs has to for its narrower job.
 *
 * Rendering is Playwright's bundled Chromium at 1200x630, deviceScaleFactor 1,
 * captured as JPEG. Nothing in the template reads the clock or a random
 * source, so a given registry produces byte-identical cards.
 *
 * Each file must land under MAX_BYTES; quality steps down through
 * QUALITY_LADDER per file until it fits, and the script exits non-zero if any
 * card is still over budget at the lowest rung.
 *
 * Usage: node scripts/build-og-images.mjs   (or `pnpm build:og`)
 */

import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const staticDir = join(repoRoot, "static");
const outDir = join(staticDir, "og");

const MAX_BYTES = 60 * 1024;
const QUALITY_LADDER = [85, 80, 75];

// Shared with scripts/build-brand-assets.mjs -- keep the two in step.
const BG = "#050508";
const ACCENT_FROM = "#8b5cf6";
const ACCENT_TO = "#3f7df6";
const FONT_STACK =
	'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"';

// Longest names (InteractiveGridPattern, 22 chars) overflow at the display
// size, so the template shrinks the name until it fits the content column.
const NAME_SIZE_MAX = 96;
const NAME_SIZE_MIN = 54;
const NAME_SIZE_STEP = 2;

function loadStaticMark() {
	const raw = readFileSync(join(staticDir, "favicon.svg"), "utf8");
	// Same strip as the brand-asset pipeline: every keyframe's 0%/100% state is
	// the rest pose, so removing the animation freezes the mark deterministically.
	const stripped = raw.replace(/<style>[\s\S]*?<\/style>\s*/, "");
	if (stripped === raw) {
		throw new Error(
			"expected a <style> block in static/favicon.svg to strip -- source may have changed"
		);
	}
	return stripped;
}

async function loadRegistry() {
	const registryPath = join(repoRoot, "src", "lib", "fancy-ui", "registry.ts");
	try {
		const { transformWithEsbuild } = await import("vite");
		const source = readFileSync(registryPath, "utf8");
		const { code } = await transformWithEsbuild(source, registryPath, { loader: "ts" });
		return await import(
			`data:text/javascript;base64,${Buffer.from(code, "utf8").toString("base64")}`
		);
	} catch (err) {
		throw new Error(`could not load registry.ts (${err.message})`);
	}
}

function escapeHtml(text) {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function cardHtml(markSvg, { name, category, description }) {
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
  .lockup {
    position:absolute; z-index:1; top:58px; left:90px;
    display:flex; align-items:center; gap:14px;
  }
  .lockup .mark { width:44px; height:44px; flex-shrink:0; }
  .lockup .mark svg { display:block; width:100%; height:100%; }
  .lockup .wordmark {
    font-size:38px; font-weight:800; letter-spacing:-0.03em;
    background:linear-gradient(180deg,#ffffff,#b8bfd4);
    -webkit-background-clip:text; background-clip:text; color:transparent;
  }
  .content {
    position:absolute; z-index:1; left:90px; right:90px; top:190px;
  }
  .chip {
    display:inline-block;
    padding:9px 22px; border-radius:999px;
    border:1px solid rgba(139,92,246,.4); background:rgba(139,92,246,.12);
    font-size:22px; font-weight:700; letter-spacing:.14em; text-transform:uppercase;
    background-clip:padding-box;
  }
  .chip span {
    background:linear-gradient(100deg,${ACCENT_FROM},${ACCENT_TO});
    -webkit-background-clip:text; background-clip:text; color:transparent;
  }
  .name {
    margin-top:30px;
    font-size:${NAME_SIZE_MAX}px; font-weight:800; letter-spacing:-0.035em; line-height:1.08;
    white-space:nowrap; overflow:hidden;
    background:linear-gradient(180deg,#ffffff,#b8bfd4);
    -webkit-background-clip:text; background-clip:text; color:transparent;
  }
  .description {
    margin-top:26px; max-width:1000px;
    font-size:27px; font-weight:500; line-height:1.45; letter-spacing:-0.01em; color:#9aa3b2;
    display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden;
  }
  .strip {
    position:absolute; z-index:1; left:90px; right:90px; bottom:56px;
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
  <div class="lockup">
    <div class="mark">${markSvg}</div>
    <div class="wordmark">FancyUI</div>
  </div>
  <div class="content">
    <div class="chip"><span>${escapeHtml(category)}</span></div>
    <div class="name">${escapeHtml(name)}</div>
    <div class="description">${escapeHtml(description)}</div>
  </div>
  <div class="strip">
    <span class="accent">Svelte 5</span><span>&middot;</span><span>MIT</span><span>&middot;</span><span>fancy-ui-svelte</span>
  </div>
</body></html>`;
}

// Shrink the display name until it fits the content column. Runs in-page
// because only the browser knows the rendered text metrics; the loop is a
// pure function of the name, so the result is reproducible.
function fitNameInPage({ max, min, step }) {
	const el = document.querySelector(".name");
	const available = el.parentElement.clientWidth;
	let size = max;
	el.style.fontSize = `${size}px`;
	while (el.scrollWidth > available && size > min) {
		size -= step;
		el.style.fontSize = `${size}px`;
	}
	return size;
}

function fmtKb(n) {
	return `${(n / 1024).toFixed(1)} KB`;
}

function dirBytes(dir) {
	return readdirSync(dir)
		.map((f) => statSync(join(dir, f)).size)
		.reduce((a, b) => a + b, 0);
}

async function main() {
	const { registry, categoryLabels } = await loadRegistry();
	const components = Object.values(registry).sort((a, b) => a.slug.localeCompare(b.slug));
	if (components.length === 0) {
		throw new Error("registry is empty -- nothing to render");
	}

	const markSvg = loadStaticMark();

	// Rebuild from scratch so a renamed or removed component cannot leave a
	// stale card behind to be served forever.
	rmSync(outDir, { recursive: true, force: true });
	mkdirSync(outDir, { recursive: true });

	const browser = await chromium.launch();
	const results = [];
	const overBudget = [];
	const shrunk = [];

	try {
		const context = await browser.newContext({ deviceScaleFactor: 1 });
		const page = await context.newPage();
		await page.setViewportSize({ width: 1200, height: 630 });

		for (const component of components) {
			const category = categoryLabels[component.category] ?? component.category;
			await page.setContent(cardHtml(markSvg, { ...component, category }), { waitUntil: "load" });

			const nameSize = await page.evaluate(fitNameInPage, {
				max: NAME_SIZE_MAX,
				min: NAME_SIZE_MIN,
				step: NAME_SIZE_STEP,
			});
			if (nameSize < NAME_SIZE_MAX) shrunk.push(`${component.name} @ ${nameSize}px`);

			let buf = null;
			let quality = null;
			for (const q of QUALITY_LADDER) {
				buf = await page.screenshot({ type: "jpeg", quality: q });
				quality = q;
				if (buf.length <= MAX_BYTES) break;
			}

			writeFileSync(join(outDir, `${component.slug}.jpg`), buf);
			results.push({ slug: component.slug, bytes: buf.length, quality });
			if (buf.length > MAX_BYTES) overBudget.push(component.slug);
		}

		await context.close();
	} finally {
		await browser.close();
	}

	const sorted = [...results].sort((a, b) => a.bytes - b.bytes);
	const smallest = sorted[0];
	const largest = sorted[sorted.length - 1];
	const total = dirBytes(outDir);
	const downgraded = results.filter((r) => r.quality !== QUALITY_LADDER[0]);

	console.log(`Rendered ${results.length} cards -> static/og/`);
	console.log(`  total:    ${fmtKb(total)} (${(total / 1024 / 1024).toFixed(2)} MB)`);
	console.log(`  smallest: ${smallest.slug}.jpg ${fmtKb(smallest.bytes)}`);
	console.log(`  largest:  ${largest.slug}.jpg ${fmtKb(largest.bytes)}`);
	console.log(`  average:  ${fmtKb(total / results.length)}   budget ${fmtKb(MAX_BYTES)}/file`);
	if (shrunk.length) {
		console.log(`  name shrunk to fit (${shrunk.length}): ${shrunk.join(", ")}`);
	}
	if (downgraded.length) {
		console.log(
			`  quality stepped down (${downgraded.length}): ${downgraded.map((r) => `${r.slug}@q${r.quality}`).join(", ")}`
		);
	}

	if (overBudget.length) {
		console.error(
			`FAIL: ${overBudget.length} card(s) over ${fmtKb(MAX_BYTES)} even at quality ${QUALITY_LADDER.at(-1)}: ${overBudget.join(", ")}`
		);
		process.exit(1);
	}
	console.log("OK: every card within budget.");
}

main();
