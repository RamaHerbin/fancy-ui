#!/usr/bin/env node
/**
 * Synthwave DOM scene -- layer asset pipeline.
 *
 * Reads the six chosen raw/fixed sources from `static/synthwave/src/` (a
 * git-ignored raw drop -- see .gitignore) and emits AVIF + WebP renditions
 * at `static/synthwave/<name>-<width>.{avif,webp}` for each width in
 * WIDTHS, skipping any width that would upscale past the source's native
 * size (never upscale).
 *
 * Shells out to the local `ffmpeg`, `cwebp` and `avifenc` binaries -- no
 * new npm dependency, no build-time image plugin. Safe to re-run: outputs
 * are overwritten in place and the working temp dir is wiped on every run
 * (including on failure, via try/finally).
 *
 * Prints a per-file weight table plus the grand total, and exits non-zero
 * if any single output exceeds MAX_ASSET_BYTES or the total exceeds
 * MAX_TOTAL_BYTES.
 *
 * Usage: node scripts/build-synthwave-assets.mjs   (or `pnpm build:assets`)
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const srcDir = join(repoRoot, "static", "synthwave", "src");
const outDir = join(repoRoot, "static", "synthwave");
const tmpDir = join(outDir, ".tmp-build");

const WIDTHS = [1920, 1280, 768];
const MAX_ASSET_BYTES = 200 * 1024;
// 1.8 MB: three new scene plates (mountains-sharp, city, sky-clouds) added for the scene's reference art direction.
const MAX_TOTAL_BYTES = 1.8 * 1024 * 1024;

// Tuned by hand against the 200 KB/asset, 1 MB/total budget. If a future
// source blows the budget, lower these first; only drop a WIDTHS tier
// as a last resort.
const AVIF_QCOLOR = 86;
const AVIF_QALPHA = 93;
const AVIF_YUV = "444";
const WEBP_QUALITY = 91;
const WEBP_ALPHA_QUALITY = 100;

// Six shipped layers out of the eleven raw AI-generated renders (the other
// five -- sky gradient, blank render, particle sheet, and two orphans --
// are handled by CSS or dropped; see the PR description for the inventory).
// `skyline` and `car` point at the hand-fixed intermediates (floor grid
// erased / contact shadow retinted) rather than the raw renders.
const ASSETS = [
	{ name: "sun", file: "ChatGPT Image Jul 30, 2026, 01_00_20 PM (4).png" },
	{ name: "mountains-far", file: "ChatGPT Image Jul 30, 2026, 01_00_19 PM (2).png" },
	{ name: "skyline", file: "skyline.fixed.png" },
	{ name: "palm-back", file: "ChatGPT Image Jul 30, 2026, 01_00_21 PM (5).png" },
	{ name: "palm-front", file: "ChatGPT Image Jul 30, 2026, 01_00_21 PM (6).png" },
	{ name: "car", file: "car.fixed.png" },
	// Three plates cropped from previously unused raw renders (`*.cropped.png`
	// intermediates): a tight ridge strip, an alpha-bbox-trimmed city whose
	// base sits at the image's bottom edge, and the upper 2/3 of the opaque
	// sky plate (its baked-in horizon glow trimmed off).
	{ name: "mountains-sharp", file: "mountains-sharp.cropped.png" },
	{ name: "city", file: "city.cropped.png" },
	{ name: "sky-clouds", file: "sky-clouds.cropped.png" },
];

function pngDimensions(path) {
	const buf = readFileSync(path);
	if (buf.toString("hex", 0, 8) !== "89504e470d0a1a0a") {
		throw new Error(`${path} is not a PNG (bad signature)`);
	}
	return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function run(cmd, args) {
	execFileSync(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
}

function fmtBytes(n) {
	return `${(n / 1024).toFixed(1)} KB`;
}

function main() {
	rmSync(tmpDir, { recursive: true, force: true });
	mkdirSync(tmpDir, { recursive: true });

	const rows = [];
	let total = 0;
	let overBudget = false;

	try {
		for (const asset of ASSETS) {
			const srcPath = join(srcDir, asset.file);
			if (!existsSync(srcPath)) {
				throw new Error(`missing source for "${asset.name}": ${srcPath}`);
			}
			const { width: nativeW, height: nativeH } = pngDimensions(srcPath);

			for (const width of WIDTHS) {
				if (width > nativeW) {
					rows.push({ asset: asset.name, width, format: "-", bytes: "skipped (upscale)" });
					continue;
				}
				const height = Math.round((width * nativeH) / nativeW);
				const resizedPng = join(tmpDir, `${asset.name}-${width}.png`);
				run("ffmpeg", [
					"-y",
					"-loglevel",
					"error",
					"-i",
					srcPath,
					"-vf",
					`scale=${width}:${height}:flags=lanczos`,
					"-pix_fmt",
					"rgba",
					"-frames:v",
					"1",
					resizedPng,
				]);

				const webpOut = join(outDir, `${asset.name}-${width}.webp`);
				run("cwebp", [
					"-q",
					String(WEBP_QUALITY),
					"-alpha_q",
					String(WEBP_ALPHA_QUALITY),
					"-m",
					"6",
					"-quiet",
					resizedPng,
					"-o",
					webpOut,
				]);
				const webpBytes = statSync(webpOut).size;
				rows.push({ asset: asset.name, width, format: "webp", bytes: fmtBytes(webpBytes) });
				total += webpBytes;
				if (webpBytes > MAX_ASSET_BYTES) overBudget = true;

				const avifOut = join(outDir, `${asset.name}-${width}.avif`);
				run("avifenc", [
					"-q",
					String(AVIF_QCOLOR),
					"--qalpha",
					String(AVIF_QALPHA),
					"-s",
					"6",
					"-y",
					AVIF_YUV,
					resizedPng,
					avifOut,
				]);
				const avifBytes = statSync(avifOut).size;
				rows.push({ asset: asset.name, width, format: "avif", bytes: fmtBytes(avifBytes) });
				total += avifBytes;
				if (avifBytes > MAX_ASSET_BYTES) overBudget = true;
			}
		}
	} finally {
		rmSync(tmpDir, { recursive: true, force: true });
	}

	console.table(rows);
	console.log(`total: ${fmtBytes(total)} (budget: ${fmtBytes(MAX_TOTAL_BYTES)})`);

	if (overBudget) {
		console.error("FAIL: at least one output exceeds the 200 KB per-asset budget.");
		process.exit(1);
	}
	if (total > MAX_TOTAL_BYTES) {
		console.error("FAIL: total output size exceeds the 1.8 MB budget.");
		process.exit(1);
	}
}

main();
