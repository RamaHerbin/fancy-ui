#!/usr/bin/env node
/**
 * Gallery thumbnails -- static/thumbs/<theme>/<slug>.webp, one per shipped
 * registry entry and theme (dark + light).
 *
 * Consumed by ComponentCard on /docs/components. Each thumbnail is a real
 * capture of the component's own doc-page preview stage (the element marked
 * `data-thumb-stage` in src/routes/docs/components/[slug]/+page.svelte), so
 * the gallery shows what the component actually looks like rather than a
 * placeholder. The stage is forced to a 16:10 box before capture so every
 * card shares one aspect ratio; the demo stays centered by the stage's own
 * flex layout and anything taller is clipped by its overflow-hidden.
 *
 * Unlike scripts/build-og-images.mjs this needs the docs site running, since
 * the demos are live Svelte components. Point it at a dev or preview server:
 *
 *   pnpm build && pnpm preview           # serves on :4173
 *   node scripts/build-component-thumbs.mjs [--base http://localhost:4173]
 *                                          [--only slug-a,slug-b]
 *                                          [--theme dark|light]
 *
 * Playwright only encodes PNG/JPEG, so the PNG capture is re-encoded to WebP
 * by Chromium's own canvas encoder in a blank page -- no image dependency
 * (see scripts/lib/stage-capture.mjs, shared with the Inspiration posters).
 *
 * Animations read the clock, so captures are not byte-stable across runs;
 * regenerate only the slugs that changed with --only. Slugs that cannot be
 * captured (or are listed as `skip` in THUMB_HINTS) are left out of the
 * manifest and ComponentCard renders its generated fallback tile instead.
 *
 * The manifest src/lib/components/docs/thumbs.json lists every slug that has
 * both theme files, so a card never requests an image that does not exist.
 */

import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { applyPointerHint, encodeWebp, newCaptureContext } from "./lib/stage-capture.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const outRoot = join(repoRoot, "static", "thumbs");
const manifestPath = join(repoRoot, "src", "lib", "components", "docs", "thumbs.json");

const THEMES = ["dark", "light"];
const OUT_WIDTH = 720;
const OUT_HEIGHT = 450;
/** CSS width the stage is captured at; rendered at 2x, then downsampled to OUT_WIDTH. */
const STAGE_WIDTH = 600;
const MAX_BYTES = 45 * 1024;
const QUALITY_LADDER = [0.78, 0.7, 0.6, 0.5];
const DEFAULT_DELAY = 1600;
const CONCURRENCY = 4;

/**
 * Per-slug capture tweaks for demos that need a nudge to look like themselves.
 *   delay  -- ms to wait after mount (entrance animations, streaming text)
 *   hover  -- [x, y] as fractions of the stage; the pointer rests there
 *   sweep  -- drag the pointer across the stage right before the capture
 *   stage  -- which [data-thumb-stage] to capture (0 = hero, 1+ = examples),
 *             for bare effects whose hero preview has nothing to decorate
 *   skip   -- leave the slug to the fallback tile
 */
const THUMB_HINTS = {
	"image-trail-cursor": { sweep: true },
	"smooth-cursor": { hover: [0.5, 0.5] },
	"direction-aware-hover": { hover: [0.5, 0.5] },
	"card-spotlight": { hover: [0.4, 0.4] },
	"glare-card": { hover: [0.35, 0.35] },
	// WebGL / pointer-physics demos that render nothing legible headless.
	"displacement-text": { skip: true },
	"fluid-cursor": { skip: true },
	ripple: { skip: true },
	"border-beam": { stage: 1 },
	"glowing-effect": { stage: 1, hover: [0.4, 0.45] },
	"bg-stars": { stage: 1 },
	marquee: { stage: 1 },
	"text-generate-effect": { delay: 3000 },
	"number-ticker": { delay: 2500 },
};

function parseArgs(argv) {
	const args = { base: "http://localhost:4173", only: null, themes: THEMES };
	for (let i = 0; i < argv.length; i++) {
		const flag = argv[i];
		const value = argv[i + 1];
		if (flag === "--base") args.base = value.replace(/\/$/, "");
		else if (flag === "--only") args.only = new Set(value.split(",").map((s) => s.trim()));
		else if (flag === "--theme") args.themes = [value];
		else continue;
		i++;
	}
	return args;
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

async function capture(page, encoder, base, slug) {
	const hint = THUMB_HINTS[slug] ?? {};
	await page.goto(`${base}/docs/components/${slug}`, { waitUntil: "load", timeout: 60_000 });
	// Stage 0 is the hero preview; later ones are the example previews below it.
	const stage = page.locator("[data-thumb-stage]").nth(hint.stage ?? 0);
	await stage.waitFor({ state: "visible", timeout: 20_000 });

	// Force the stage to 16:10 so every card shares one frame.
	await stage.evaluate((el, w) => {
		// A narrower stage than the doc page's keeps the demo large relative to
		// the frame once the card shrinks it to ~300px.
		el.style.width = `${w}px`;
		el.style.minHeight = "0";
		el.style.height = `${Math.round((w * 10) / 16)}px`;
		el.style.marginInline = "auto";
		el.scrollIntoView({ block: "center" });
	}, STAGE_WIDTH);
	await page.mouse.move(0, 0);
	await page.waitForTimeout(hint.delay ?? DEFAULT_DELAY);

	// Fit the demo to the frame: a demo larger than the frame is scaled down
	// rather than cropped, and a small one (a lone button, a switch) is scaled
	// up so it still reads at card size. CSS transforms re-raster, so text
	// stays crisp. Absolutely positioned layers (backgrounds, overlays) already
	// fill the stage and are left alone.
	await stage.evaluate((el) => {
		const kids = [...el.children].filter((c) => getComputedStyle(c).position !== "absolute");
		if (kids.length !== 1) return;
		const child = kids[0];
		const pad = 24;
		const frame = el.getBoundingClientRect();
		const box = child.getBoundingClientRect();
		// A clipping child (a marquee track) is as big as its box, not its content.
		const clips = /hidden|clip/.test(getComputedStyle(child).overflow);
		const cw = clips ? box.width : Math.max(box.width, child.scrollWidth);
		const ch = clips ? box.height : Math.max(box.height, child.scrollHeight);
		if (!cw || !ch) return;
		const fit = Math.min((frame.width - pad * 2) / cw, (frame.height - pad * 2) / ch);
		const scale =
			fit < 1
				? fit
				: Math.max(1, Math.min(2.6, (frame.width * 0.45) / cw, (frame.height * 0.45) / ch));
		if (Math.abs(scale - 1) > 0.02) {
			child.style.transformOrigin = "center";
			child.style.transform = `scale(${scale.toFixed(3)})`;
			child.style.flexShrink = "0";
		}
	});

	await applyPointerHint(page, stage, hint);

	const png = await stage.screenshot({ type: "png", animations: "allow" });
	return encodeWebp(encoder, png, {
		width: OUT_WIDTH,
		height: OUT_HEIGHT,
		maxBytes: MAX_BYTES,
		qualityLadder: QUALITY_LADDER,
	});
}

function formatBytes(n) {
	return `${(n / 1024).toFixed(1)} KB`;
}

function dirBytes(dir) {
	if (!existsSync(dir)) return 0;
	return readdirSync(dir)
		.map((f) => statSync(join(dir, f)).size)
		.reduce((a, b) => a + b, 0);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const { registry } = await loadRegistry();
	const slugs = Object.values(registry)
		.filter((c) => c.status === "done")
		.map((c) => c.slug)
		.sort();

	const targets = slugs.filter(
		(slug) => !THUMB_HINTS[slug]?.skip && (!args.only || args.only.has(slug))
	);
	if (targets.length === 0) throw new Error("nothing to capture");

	// Fail fast if the server is not up rather than timing out 146 times.
	try {
		const res = await fetch(`${args.base}/docs/components`);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
	} catch (err) {
		throw new Error(`docs site not reachable at ${args.base} (${err.message})`);
	}

	const browser = await chromium.launch();
	const failures = [];
	let done = 0;

	try {
		for (const theme of args.themes) {
			const outDir = join(outRoot, theme);
			mkdirSync(outDir, { recursive: true });

			const context = await newCaptureContext(browser, {
				theme,
				localStorage: { "fancy-ui-theme": theme },
			});
			const encoder = await context.newPage();

			const queue = [...targets];
			const worker = async () => {
				const page = await context.newPage();
				for (let slug = queue.shift(); slug; slug = queue.shift()) {
					try {
						const webp = await capture(page, encoder, args.base, slug);
						writeFileSync(join(outDir, `${slug}.webp`), webp);
						done++;
						process.stdout.write(`\r  ${theme}: ${done} captured`);
					} catch (err) {
						failures.push(`${theme}/${slug}: ${err.message.split("\n")[0]}`);
					}
				}
				await page.close();
			};
			await Promise.all(Array.from({ length: CONCURRENCY }, worker));
			await context.close();
			done = 0;
			process.stdout.write("\n");
		}
	} finally {
		await browser.close();
	}

	// The manifest reflects what is on disk, so a partial --only run keeps
	// every earlier capture listed.
	const manifest = {};
	for (const slug of slugs) {
		if (THEMES.every((t) => existsSync(join(outRoot, t, `${slug}.webp`)))) manifest[slug] = true;
	}
	writeFileSync(manifestPath, `${JSON.stringify(manifest, null, "\t")}\n`);

	const total = THEMES.reduce((sum, t) => sum + dirBytes(join(outRoot, t)), 0);
	console.log(
		`thumbs: ${Object.keys(manifest).length}/${slugs.length} slugs in manifest, ${formatBytes(total)} on disk`
	);
	if (failures.length) {
		console.error(`\n${failures.length} capture(s) failed:\n  ${failures.join("\n  ")}`);
		process.exitCode = 1;
	}
}

main().catch((err) => {
	console.error(`build-component-thumbs: ${err.message}`);
	process.exit(1);
});
