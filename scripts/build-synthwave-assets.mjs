#!/usr/bin/env node
/**
 * Synthwave backdrop -- panorama asset pipeline.
 *
 * Reads the single flattened panorama source from `raw-assets/synthwave/`
 * (a git-ignored raw drop kept outside `static/` so the build never copies
 * multi-MB sources into the published output -- see .gitignore) and emits
 * AVIF + WebP
 * renditions at `static/synthwave/<name>-<width>.{avif,webp}` for each
 * width in the entry's `widths` list, skipping any width that would
 * upscale past the source's (post-crop) native size (never upscale).
 *
 * Each ASSETS entry may declare an optional `crop` ({ w, h, x, y }) which
 * is applied via ffmpeg's crop filter before scaling -- used to cut the
 * mobile window (sun + car rear) out of the full panorama.
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
const srcDir = join(repoRoot, "raw-assets", "synthwave");
const outDir = join(repoRoot, "static", "synthwave");
const tmpDir = join(outDir, ".tmp-build");

// 384 KB per rendition: a single rendition reaches each client now (one
// <picture> picks one file), vs ~9 stacked layer files before -- so the
// per-file ceiling can be far above the old 200 KB layer budget while the
// per-client payload still drops.
const MAX_ASSET_BYTES = 384 * 1024;
const MAX_TOTAL_BYTES = 1.6 * 1024 * 1024;

// Tuned against the budgets above. The source is fully opaque (rgb24), so
// no alpha-quality flags are needed. 4:4:4 chroma is kept on purpose: the
// sun's stripe edges and the dark sky gradient band smear at 4:2:0.
const AVIF_QCOLOR = 84;
const AVIF_YUV = "444";
const WEBP_QUALITY = 80;

// One flattened 3:1 panorama replaces the old nine-layer stack. The mobile
// entry re-crops the same source to the right-hand window (full sun disc +
// car rear) before scaling to 768w.
const ASSETS = [
	{
		name: "neon-horizon-drive",
		file: "neon-horizon-drive.png",
		widths: [2172, 1920, 1280],
	},
	{
		name: "neon-horizon-drive-mobile",
		file: "neon-horizon-drive.png",
		widths: [768],
		crop: { w: 1216, h: 724, x: 695, y: 0 },
	},
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
			const native = pngDimensions(srcPath);
			if (asset.crop) {
				const { w, h, x, y } = asset.crop;
				if (x + w > native.width || y + h > native.height) {
					throw new Error(`crop for "${asset.name}" exceeds source bounds`);
				}
			}
			const baseW = asset.crop ? asset.crop.w : native.width;
			const baseH = asset.crop ? asset.crop.h : native.height;

			for (const width of asset.widths) {
				if (width > baseW) {
					rows.push({ asset: asset.name, width, format: "-", bytes: "skipped (upscale)" });
					continue;
				}
				const height = Math.round((width * baseH) / baseW);
				const filters = [];
				if (asset.crop) {
					const { w, h, x, y } = asset.crop;
					filters.push(`crop=${w}:${h}:${x}:${y}`);
				}
				filters.push(`scale=${width}:${height}:flags=lanczos`);
				const resizedPng = join(tmpDir, `${asset.name}-${width}.png`);
				run("ffmpeg", [
					"-y",
					"-loglevel",
					"error",
					"-i",
					srcPath,
					"-vf",
					filters.join(","),
					"-pix_fmt",
					"rgb24",
					"-frames:v",
					"1",
					resizedPng,
				]);

				const webpOut = join(outDir, `${asset.name}-${width}.webp`);
				run("cwebp", ["-q", String(WEBP_QUALITY), "-m", "6", "-quiet", resizedPng, "-o", webpOut]);
				const webpBytes = statSync(webpOut).size;
				rows.push({ asset: asset.name, width, format: "webp", bytes: fmtBytes(webpBytes) });
				total += webpBytes;
				if (webpBytes > MAX_ASSET_BYTES) overBudget = true;

				const avifOut = join(outDir, `${asset.name}-${width}.avif`);
				run("avifenc", ["-q", String(AVIF_QCOLOR), "-s", "6", "-y", AVIF_YUV, resizedPng, avifOut]);
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
		console.error(
			`FAIL: at least one output exceeds the ${fmtBytes(MAX_ASSET_BYTES)} per-asset budget.`
		);
		process.exit(1);
	}
	if (total > MAX_TOTAL_BYTES) {
		console.error(`FAIL: total output size exceeds the ${fmtBytes(MAX_TOTAL_BYTES)} budget.`);
		process.exit(1);
	}
}

main();
