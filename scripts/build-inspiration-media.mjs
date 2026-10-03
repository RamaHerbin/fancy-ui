#!/usr/bin/env node
/**
 * Inspiration posters -- static/inspiration/<slug>.webp, one per published
 * FancyUI entry that has no explicit `media`.
 *
 * Each poster is a real capture of the entry's live demo, mounted alone on the
 * dev-only route /_capture/<slug>, in a `[data-inspiration-stage]` box the size
 * of a gallery card (400x250 CSS px), so the poster matches the live demo that
 * replaces it. It is shot at 1.8x, which is exactly 720x450.
 * That route 404s outside `vite dev`, so point the script at a dev server:
 *
 *   pnpm dev
 *   node scripts/build-inspiration-media.mjs [--base http://localhost:5173]
 *                                            [--only slug-a,slug-b]
 *
 * Per-entry `capture` hints live in the entry file itself:
 *   delay -- ms to wait after mount (default 1600)
 *   hover -- [x, y] fractions of the stage; the pointer rests there
 *   sweep -- drag the pointer across the stage right before the shot
 *   skip  -- never capture
 * and press/click/type steps are marked on the demo's own elements
 * (`data-capture`, see applyStageActions).
 *
 * Entries are loaded without the app's module graph: entry files may only
 * `import type`, which esbuild strips, so each one imports as a data: URL.
 *
 * src/lib/inspiration/media.json is rewritten to list exactly the posters on
 * disk, so a partial --only run keeps every earlier capture listed and a card
 * never requests an image that does not exist.
 */

import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { applyPointerHint, encodeWebp, newCaptureContext } from "./lib/stage-capture.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const entriesDir = join(repoRoot, "src", "lib", "inspiration", "entries");
const outDir = join(repoRoot, "static", "inspiration");
const manifestPath = join(repoRoot, "src", "lib", "inspiration", "media.json");

const OUT_WIDTH = 720;
const OUT_HEIGHT = 450;
/** 400x250 CSS px stage x 1.8 = 720x450, so the encoder never resamples. */
const SCALE = 1.8;
const MAX_BYTES = 60 * 1024;
const QUALITY_LADDER = [0.82, 0.74, 0.66, 0.56, 0.46];
const DEFAULT_DELAY = 1600;
const CONCURRENCY = 3;

function parseArgs(argv) {
	const args = { base: "http://localhost:5173", only: null };
	for (let i = 0; i < argv.length; i++) {
		const flag = argv[i];
		const value = argv[i + 1];
		if (flag === "--base") args.base = value.replace(/\/$/, "");
		else if (flag === "--only") args.only = new Set(value.split(",").map((s) => s.trim()));
		else continue;
		i++;
	}
	return args;
}

async function loadEntries() {
	const { transformWithEsbuild } = await import("vite");
	const files = readdirSync(entriesDir).filter((f) => f.endsWith(".ts"));
	const entries = [];
	for (const file of files.sort()) {
		const path = join(entriesDir, file);
		const { code } = await transformWithEsbuild(readFileSync(path, "utf8"), path, {
			loader: "ts",
		});
		const mod = await import(
			`data:text/javascript;base64,${Buffer.from(code, "utf8").toString("base64")}`
		);
		const entry = mod.default ?? mod.entry;
		if (!entry) throw new Error(`${file} exports neither default nor \`entry\``);
		entries.push(entry);
	}
	return entries;
}

/**
 * Press-, click- and type-driven demos mark the element to act on, so the
 * poster shows the interaction mid-state instead of a resting control:
 *   data-capture="click"           -- click it
 *   data-capture="press"           -- press and hold it through the shot
 *   data-capture="type"            -- type `data-capture-text` into it
 *   data-capture-wait="ms"         -- wait after the action (default 250)
 * Marked elements are acted on in document order.
 */
async function applyStageActions(page, stage) {
	const targets = stage.locator("[data-capture]");
	const count = await targets.count();
	for (let i = 0; i < count; i++) {
		const target = targets.nth(i);
		const action = await target.getAttribute("data-capture");
		const wait = Number((await target.getAttribute("data-capture-wait")) ?? 250);
		if (action === "click") {
			await target.click();
		} else if (action === "press") {
			await target.hover();
			await page.mouse.down();
		} else if (action === "type") {
			await target.click();
			const text = (await target.getAttribute("data-capture-text")) ?? "";
			await page.keyboard.type(text, { delay: 30 });
		}
		await page.waitForTimeout(wait);
	}
}

async function capture(page, encoder, base, entry) {
	const hint = entry.capture ?? {};
	await page.goto(`${base}/_capture/${entry.slug}`, { waitUntil: "load", timeout: 60_000 });
	const stage = page.locator("[data-inspiration-stage]");
	await stage.waitFor({ state: "visible", timeout: 20_000 });
	await page.mouse.move(0, 0);
	await page.waitForTimeout(hint.delay ?? DEFAULT_DELAY);
	await applyPointerHint(page, stage, hint);
	await applyStageActions(page, stage);
	const png = await stage.screenshot({ type: "png", animations: "allow" });
	await page.mouse.up();
	return encodeWebp(encoder, png, {
		width: OUT_WIDTH,
		height: OUT_HEIGHT,
		maxBytes: MAX_BYTES,
		qualityLadder: QUALITY_LADDER,
	});
}

/**
 * Canvas size from a WebP file's header (RIFF container: VP8X, VP8 or VP8L
 * chunk), so the manifest records what is on disk rather than what was asked for.
 */
function readWebpSize(file) {
	const buf = readFileSync(file);
	if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") {
		throw new Error(`${file} is not a WebP file`);
	}
	const chunk = buf.toString("ascii", 12, 16);
	if (chunk === "VP8X") {
		return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
	}
	if (chunk === "VP8 ") {
		return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
	}
	if (chunk === "VP8L") {
		const bits = buf.readUInt32LE(21);
		return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
	}
	throw new Error(`${file}: unknown WebP chunk ${chunk}`);
}

function formatBytes(n) {
	return `${(n / 1024).toFixed(1)} KB`;
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const entries = await loadEntries();
	const eligible = entries.filter(
		(e) => e.origin === "fancyui" && e.status === "published" && !e.media && !e.capture?.skip
	);
	const targets = eligible.filter((e) => !args.only || args.only.has(e.slug));
	if (targets.length === 0) throw new Error("nothing to capture");

	try {
		const res = await fetch(`${args.base}/_capture/${targets[0].slug}`);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
	} catch (err) {
		throw new Error(`dev server not reachable at ${args.base} (${err.message})`);
	}

	mkdirSync(outDir, { recursive: true });
	// The headless shell has no GPU; SwiftShader gives WebGL demos a context.
	const browser = await chromium.launch({
		args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"],
	});
	const failures = [];
	let done = 0;

	try {
		const context = await newCaptureContext(browser, {
			theme: "dark",
			scale: SCALE,
			viewport: { width: 800, height: 600 },
			localStorage: { "fancy-ui-theme": "dark", "fancy-ui-motion": "auto" },
		});
		const encoder = await context.newPage();
		const queue = [...targets];
		const worker = async () => {
			const page = await context.newPage();
			for (let entry = queue.shift(); entry; entry = queue.shift()) {
				try {
					const webp = await capture(page, encoder, args.base, entry);
					writeFileSync(join(outDir, `${entry.slug}.webp`), webp);
					done++;
					process.stdout.write(`\r  ${done}/${targets.length} captured`);
				} catch (err) {
					failures.push(`${entry.slug}: ${err.message.split("\n")[0]}`);
				}
			}
			await page.close();
		};
		await Promise.all(Array.from({ length: CONCURRENCY }, worker));
		await context.close();
		process.stdout.write("\n");
	} finally {
		await browser.close();
	}

	// The manifest reflects what is on disk for entries that still want a poster.
	const manifest = {};
	let total = 0;
	for (const entry of eligible.sort((a, b) => a.slug.localeCompare(b.slug))) {
		const file = join(outDir, `${entry.slug}.webp`);
		if (!existsSync(file)) continue;
		manifest[entry.slug] = readWebpSize(file);
		total += statSync(file).size;
	}
	writeFileSync(manifestPath, `${JSON.stringify(manifest, null, "\t")}\n`);
	console.log(
		`inspiration media: ${Object.keys(manifest).length}/${eligible.length} posters, ${formatBytes(total)}`
	);
	if (failures.length) {
		console.error(`\n${failures.length} capture(s) failed:\n  ${failures.join("\n  ")}`);
		process.exitCode = 1;
	}
}

main().catch((err) => {
	console.error(`build-inspiration-media: ${err.message}`);
	process.exit(1);
});
