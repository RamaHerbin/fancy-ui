#!/usr/bin/env node
/**
 * Visual parity diff -- scores the shots written by scripts/parity/capture.mjs.
 *
 *   node scripts/parity/diff.mjs [--out .parity] [--only slug-a,slug-b]
 *        [--threshold 24] [--no-triptych]
 *   node scripts/parity/diff.mjs --compare-runs <dirA> <dirB> [--threshold 24]
 *   node scripts/parity/diff.mjs --self-check [--out .parity] [--file shot.png]
 *
 * Default mode: for every <slug>/<theme>-<t>[-hover].png that Svelte and at
 * least one port have, the ratio of pixels whose largest channel delta
 * exceeds the threshold, Svelte↔React and Svelte↔Vue. Writes
 *   <out>/scores.json      { [slug]: { [theme]: { [t]: { react, vue } } }, worst: { react, vue } }
 *   <out>/triptych/<slug>-<theme>-<t>[-hover].png
 *                          [Svelte | React | Vue | heatmap of the larger delta], 8 px gutters
 * and prints the table worst first. A missing port scores null.
 *
 * --compare-runs diffs two capture runs of the same stages file by file (a
 * determinism check: two runs should score ~0). --self-check proves the
 * metric itself: a shot against itself must score 0, against a copy shifted
 * by one pixel more than 0.
 *
 * The pixel math runs in Chromium's canvas (getImageData), as encodeWebp in
 * scripts/lib/stage-capture.mjs does -- no image dependency. Shots of
 * different sizes are compared over their union; a pixel only one of them
 * covers counts as different.
 */

import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");

const PORTS = ["react", "vue"];
const GUTTER = 8;

function parseArgs(argv) {
	const args = {
		out: join(repoRoot, ".parity"),
		only: null,
		threshold: 24,
		triptych: true,
		compare: null,
		selfCheck: false,
		file: null,
	};
	for (let i = 0; i < argv.length; i++) {
		const flag = argv[i];
		const value = argv[i + 1];
		if (flag === "--no-triptych") args.triptych = false;
		else if (flag === "--self-check") args.selfCheck = true;
		else if (flag === "--compare-runs") {
			if (!value || !argv[i + 2]) throw new Error("--compare-runs needs two directories");
			args.compare = [resolve(value), resolve(argv[i + 2])];
			i += 2;
		} else if (flag === "--out") ((args.out = resolve(value)), i++);
		else if (flag === "--file") ((args.file = resolve(value)), i++);
		else if (flag === "--only") ((args.only = new Set(value.split(",").map((s) => s.trim()))), i++);
		else if (flag === "--threshold") ((args.threshold = Number(value)), i++);
		else throw new Error(`unknown flag ${flag}`);
	}
	return args;
}

/** Every .png under dir, as paths relative to it. */
function listPngs(dir) {
	if (!existsSync(dir)) return [];
	const out = [];
	const walk = (d) => {
		for (const name of readdirSync(d)) {
			const p = join(d, name);
			if (statSync(p).isDirectory()) walk(p);
			else if (name.endsWith(".png")) out.push(relative(dir, p));
		}
	};
	walk(dir);
	return out.sort();
}

const b64 = (path) => (path && existsSync(path) ? readFileSync(path).toString("base64") : null);

/**
 * In-page toolkit, installed once in a blank page: decode, compare, compose.
 * Self-contained -- serialised into the page.
 */
function installToolkit() {
	const decode = async (data) => {
		const img = new Image();
		img.src = `data:image/png;base64,${data}`;
		await img.decode();
		const canvas = document.createElement("canvas");
		canvas.width = img.naturalWidth;
		canvas.height = img.naturalHeight;
		const ctx = canvas.getContext("2d", { willReadFrequently: true });
		ctx.drawImage(img, 0, 0);
		return { img, data: ctx.getImageData(0, 0, canvas.width, canvas.height) };
	};

	/** Largest channel delta per pixel over the union of both sizes (255 where only one covers). */
	const deltaMap = (a, b, w, h) => {
		const out = new Uint8Array(w * h);
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				const inA = x < a.width && y < a.height;
				const inB = x < b.width && y < b.height;
				if (!inA || !inB) {
					out[y * w + x] = 255;
					continue;
				}
				const i = (y * a.width + x) * 4;
				const j = (y * b.width + x) * 4;
				let m = 0;
				for (let c = 0; c < 4; c++) {
					const d = Math.abs(a.data[i + c] - b.data[j + c]);
					if (d > m) m = d;
				}
				out[y * w + x] = m;
			}
		}
		return out;
	};

	const ratio = (delta, threshold) => {
		let n = 0;
		for (let i = 0; i < delta.length; i++) if (delta[i] > threshold) n++;
		return n / delta.length;
	};

	const pct = (r) => (r == null ? "missing" : `${(r * 100).toFixed(2)}%`);

	const label = (ctx, x, y, text) => {
		ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
		const w = ctx.measureText(text).width + 12;
		ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
		ctx.fillRect(x + 6, y + 6, w, 20);
		ctx.fillStyle = "#fff";
		ctx.textBaseline = "middle";
		ctx.fillText(text, x + 12, y + 16);
	};

	window.__parity = {
		/** Scores and (optionally) a triptych PNG for one Svelte shot and its ports. */
		async compare({ svelte, ports, threshold, gutter, compose }) {
			const s = await decode(svelte);
			const decoded = {};
			for (const [fw, data] of Object.entries(ports))
				decoded[fw] = data ? await decode(data) : null;
			let w = s.data.width;
			let h = s.data.height;
			for (const d of Object.values(decoded)) {
				if (!d) continue;
				w = Math.max(w, d.data.width);
				h = Math.max(h, d.data.height);
			}
			const scores = {};
			const deltas = [];
			for (const [fw, d] of Object.entries(decoded)) {
				if (!d) {
					scores[fw] = null;
					continue;
				}
				const delta = deltaMap(s.data, d.data, w, h);
				scores[fw] = ratio(delta, threshold);
				deltas.push(delta);
			}
			if (!compose) return { scores };

			const fws = Object.keys(decoded);
			const panels = 2 + fws.length;
			const canvas = document.createElement("canvas");
			canvas.width = panels * w + (panels - 1) * gutter;
			canvas.height = h;
			const ctx = canvas.getContext("2d");
			ctx.fillStyle = "#3a3a3a";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			const x0 = (i) => i * (w + gutter);

			ctx.drawImage(s.img, x0(0), 0);
			label(ctx, x0(0), 0, "Svelte");
			fws.forEach((fw, i) => {
				const d = decoded[fw];
				const x = x0(i + 1);
				if (d) ctx.drawImage(d.img, x, 0);
				else {
					ctx.fillStyle = "#222";
					ctx.fillRect(x, 0, w, h);
				}
				label(ctx, x, 0, `${fw === "react" ? "React" : "Vue"} ${pct(scores[fw])}`);
			});

			// Heatmap: the larger port delta in red over a dimmed grey Svelte frame.
			const heat = ctx.createImageData(w, h);
			for (let y = 0; y < h; y++) {
				for (let x = 0; x < w; x++) {
					const p = y * w + x;
					let m = 0;
					for (const delta of deltas) if (delta[p] > m) m = delta[p];
					const o = p * 4;
					if (m > threshold) {
						heat.data[o] = 255;
						heat.data[o + 1] = Math.round(200 * (1 - m / 255));
						heat.data[o + 2] = 40;
					} else {
						let lum = 0;
						if (x < s.data.width && y < s.data.height) {
							const i = (y * s.data.width + x) * 4;
							lum =
								0.299 * s.data.data[i] + 0.587 * s.data.data[i + 1] + 0.114 * s.data.data[i + 2];
						}
						const g = Math.round(lum * 0.22 + m * 2);
						heat.data[o] = g;
						heat.data[o + 1] = g;
						heat.data[o + 2] = g;
					}
					heat.data[o + 3] = 255;
				}
			}
			ctx.putImageData(heat, x0(panels - 1), 0);
			label(ctx, x0(panels - 1), 0, `diff > ${threshold}`);
			const url = canvas.toDataURL("image/png");
			return { scores, png: url.slice(url.indexOf(",") + 1) };
		},

		/** The ratio between a shot and itself, and between it and a 1 px right shift. */
		async selfCheck({ shot, threshold }) {
			const s = await decode(shot);
			const { width, height } = s.data;
			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext("2d", { willReadFrequently: true });
			// Repeat the first column so the shift adds no foreign edge.
			ctx.drawImage(s.img, 0, 0);
			ctx.drawImage(s.img, 1, 0);
			const shifted = ctx.getImageData(0, 0, width, height);
			return {
				identical: ratio(deltaMap(s.data, s.data, width, height), threshold),
				shifted: ratio(deltaMap(s.data, shifted, width, height), threshold),
			};
		},
	};
}

async function withToolkit(fn) {
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.evaluate(installToolkit);
		return await fn(page);
	} finally {
		await browser.close();
	}
}

const fmt = (r) => (r == null ? "      -" : `${(r * 100).toFixed(3).padStart(6)}%`);

async function scoreRun(args) {
	const shotsDir = join(args.out, "shots");
	const svelteDir = join(shotsDir, "svelte");
	const shots = listPngs(svelteDir).filter((p) => !args.only || args.only.has(dirname(p)));
	if (shots.length === 0) throw new Error(`no Svelte shots under ${svelteDir}`);
	const tripDir = join(args.out, "triptych");
	if (args.triptych) mkdirSync(tripDir, { recursive: true });

	const scores = {};
	const rows = [];
	await withToolkit(async (page) => {
		for (const rel of shots) {
			const slug = dirname(rel);
			const [, theme, t] = rel.slice(slug.length + 1, -4).match(/^(light|dark)-(.+)$/) ?? [];
			if (!theme) continue;
			const ports = Object.fromEntries(PORTS.map((fw) => [fw, b64(join(shotsDir, fw, rel))]));
			if (PORTS.every((fw) => !ports[fw])) continue;
			const { scores: s, png } = await page.evaluate((input) => window.__parity.compare(input), {
				svelte: b64(join(svelteDir, rel)),
				ports,
				threshold: args.threshold,
				gutter: GUTTER,
				compose: args.triptych,
			});
			if (png)
				writeFileSync(join(tripDir, `${slug}-${theme}-${t}.png`), Buffer.from(png, "base64"));
			((scores[slug] ??= {})[theme] ??= {})[t] = s;
			rows.push({ slug, theme, t, ...s });
			process.stdout.write(`\r  ${rows.length} compared`);
		}
	});
	process.stdout.write("\n");

	// Keep earlier slugs when --only narrowed the run.
	const scoresPath = join(args.out, "scores.json");
	let previous = {};
	if (args.only) {
		try {
			previous = JSON.parse(readFileSync(scoresPath, "utf8"));
			delete previous.worst;
		} catch {
			/* first run */
		}
	}
	const all = { ...previous, ...scores };
	const worst = {};
	for (const fw of PORTS) {
		let best = null;
		for (const [slug, themes] of Object.entries(all)) {
			for (const [theme, moments] of Object.entries(themes)) {
				for (const [t, s] of Object.entries(moments)) {
					if (s[fw] != null && (!best || s[fw] > best.ratio))
						best = { slug, theme, t, ratio: s[fw] };
				}
			}
		}
		worst[fw] = best;
	}
	const sortedSlugs = Object.keys(all).sort();
	const output = Object.fromEntries(sortedSlugs.map((s) => [s, all[s]]));
	output.worst = worst;
	writeFileSync(scoresPath, `${JSON.stringify(output, null, "\t")}\n`);

	const peak = (r) => Math.max(r.react ?? -1, r.vue ?? -1);
	rows.sort((a, b) => peak(b) - peak(a) || a.slug.localeCompare(b.slug));
	const width = Math.max(4, ...rows.map((r) => r.slug.length));
	console.log(`${"slug".padEnd(width)}  theme  ${"t".padEnd(10)}    react      vue`);
	for (const r of rows) {
		console.log(
			`${r.slug.padEnd(width)}  ${r.theme.padEnd(5)}  ${r.t.padEnd(10)}  ${fmt(r.react)}  ${fmt(r.vue)}`
		);
	}
	console.log(`\nscores -> ${scoresPath}${args.triptych ? `\ntriptychs -> ${tripDir}` : ""}`);
}

async function compareRuns(args) {
	const [a, b] = args.compare.map((d) => join(d, "shots"));
	const inB = new Set(listPngs(b));
	const common = listPngs(a).filter((p) => inB.has(p));
	if (common.length === 0) throw new Error(`no shots in common between ${a} and ${b}`);
	const rows = await withToolkit(async (page) => {
		const out = [];
		for (const rel of common) {
			const { scores } = await page.evaluate((input) => window.__parity.compare(input), {
				svelte: b64(join(a, rel)),
				ports: { run2: b64(join(b, rel)) },
				threshold: args.threshold,
				gutter: GUTTER,
				compose: false,
			});
			out.push({ rel, ratio: scores.run2 });
		}
		return out;
	});
	rows.sort((x, y) => y.ratio - x.ratio || x.rel.localeCompare(y.rel));
	const width = Math.max(...rows.map((r) => r.rel.length));
	for (const r of rows)
		console.log(`${r.rel.padEnd(width)}  ${fmt(r.ratio)}  (${r.ratio.toFixed(6)})`);
	const max = rows[0].ratio;
	console.log(`\n${rows.length} shot(s) compared, worst ratio ${max.toFixed(6)}`);
	return max;
}

async function selfCheck(args) {
	const file =
		args.file ?? listPngs(join(args.out, "shots")).map((p) => join(args.out, "shots", p))[0];
	if (!file)
		throw new Error(`no shot to self-check under ${join(args.out, "shots")} (pass --file)`);
	const result = await withToolkit((page) =>
		page.evaluate((input) => window.__parity.selfCheck(input), {
			shot: b64(file),
			threshold: args.threshold,
		})
	);
	console.log(`self-check on ${file}`);
	console.log(`  vs itself        ${result.identical.toFixed(6)}  (expect 0)`);
	console.log(`  vs 1 px shift    ${result.shifted.toFixed(6)}  (expect > 0)`);
	if (result.identical !== 0 || !(result.shifted > 0)) {
		console.error("self-check FAILED");
		process.exitCode = 1;
	} else console.log("self-check ok");
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.selfCheck) await selfCheck(args);
	else if (args.compare) await compareRuns(args);
	else await scoreRun(args);
}

main().catch((err) => {
	console.error(`parity diff: ${err.message}`);
	process.exit(1);
});
