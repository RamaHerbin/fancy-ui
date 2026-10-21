/**
 * Preview-health sweep: every shipped component page, every preview stage.
 *
 * Run it through playwright.preview-health.config.ts (`pnpm test:preview-health`),
 * never through the default config: it builds the site and serves the
 * production preview, and walks one page per registry slug with status "done".
 *
 * Per page:
 *   - api.github.com is stubbed (the header star count would otherwise log a
 *     rate-limit 403 on every page), and so is the hosting platform's
 *     analytics script, which only exists in production;
 *   - the hero spinner (DemoRenderer's loading state) must be gone within 8 s;
 *   - every [data-thumb-stage] (0 = hero, 1+ = examples) is probed for a
 *     resolution error, an empty stage, a collapsed layout and a canvas that
 *     never got sized;
 *   - pixel check: fewer than 0.4 % of pixels differing from the stage
 *     background by more than 24 (RGB sum) is INVISIBLE. The share is taken
 *     over the demo's footprint (the box around every visible descendant),
 *     so a lone switch or icon button is judged on itself rather than on an
 *     empty 300 px stage, and a footprint whose content is contrasting text
 *     passes on that text. Every visible canvas must also pass the same check
 *     inside its own box, against the background behind it, so a canvas
 *     drawing black on black is caught even when a border or caption lifts
 *     the total. EXPECTED_QUIET stages skip the size and pixel checks;
 *   - a failing stage is re-probed once after 2 s before it is reported
 *     (slow first frames under SwiftShader, entrance animations);
 *   - console errors outside the project's allowlist and uncaught exceptions
 *     fail the page.
 *
 * Every failure carries exactly one class (see preview-health.shared.ts). The
 * reporter merges them into test-results/preview-health.json and prints a
 * summary grouped by class.
 */

import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { collectErrors } from "../../examples/consumers/smoke-helpers";
import { loadDoneSlugs } from "../../scripts/lib/load-registry.mjs";
import { THUMB_HINTS } from "../../scripts/lib/thumb-hints.mjs";
import {
	FAILURES_ATTACHMENT,
	type FailureClass,
	type PreviewFailure,
} from "./preview-health.shared";

const SLUGS = await loadDoneSlugs();

/** The hero spinner must be gone within this budget… */
const SPINNER_TIMEOUT = 8_000;
/** …or within this extra grace, which only earns a "slow" note (see the spinner wait below). */
const SPINNER_GRACE = 15_000;
const EXAMPLES_TIMEOUT = 10_000;
/** Lets the hero settle after its spinner goes away (entrance animations, first frames). */
const HERO_SETTLE = 1_200;
/** Per-stage settle once scrolled into view (scroll-triggered reveals, canvas resize). */
const STAGE_SETTLE = 500;
/** Wait before the one re-probe a failing stage gets. */
const RECHECK_DELAY = 2_000;
/** A stage (or canvas) passes the pixel check when at least this share of its pixels stands out. */
const MIN_INK_RATIO = 0.004;
/** RGB-sum distance from the background beyond which a pixel counts as ink. */
const INK_DISTANCE = 24;
/** Smallest box, in CSS px, that counts as something a visitor can see. */
const MIN_VISIBLE = 8;

/**
 * Stages that are near empty by design: the size (COLLAPSE) and pixel
 * (INVISIBLE) checks are skipped for them, every other probe still runs.
 * Keyed by slug, listing stage indexes (0 = hero, 1+ = examples in order).
 *   glowing-effect s0  the glow only shows around the pointer
 *   ripple s0          faint rings, by design below the ink threshold
 *   fluid-cursor s2–3  the fluid only shows once the pointer moves
 *   meteors s0         a few 1–3 px streaks on an empty sky
 */
const EXPECTED_QUIET: Readonly<Record<string, readonly number[]>> = {
	"glowing-effect": [0],
	ripple: [0],
	"fluid-cursor": [2, 3],
	meteors: [0],
};

/**
 * Console errors each project tolerates, documented one by one. Anything not
 * matched here fails the page as CONSOLE. WebGL/three.js messages are only
 * tolerated without a GPU: with SwiftShader they are real failures.
 */
const CONSOLE_ALLOWLIST: Readonly<Record<string, readonly RegExp[]>> = {
	gpu: [],
	"gpu-light-rm": [],
	"no-gpu": [
		// No GPU at all: three.js and raw WebGL report the missing context.
		/THREE\./,
		/WebGL/i,
		/webgpu/i,
	],
};

/** Matches what DemoRenderer and ExamplesSection print when a preview does not resolve. */
const RESOLVE_ERROR = /No preview available|Component not found|No module found|Failed to load/;
/** A crash that comes from a missing GPU rather than from the page. */
const GPU_MESSAGE = /THREE\.|WebGL|webgpu|GPU/i;
/** The hosting platform's analytics script: served in production only, a 404 under `vite preview`. */
const ANALYTICS_SCRIPT = /\/insights\/script\.js(\?.*)?$/;

const OUT_DIR = join("test-results", "preview-health");

type Rgb = [number, number, number];

interface CanvasInfo {
	width: number;
	height: number;
	/** Visible box, clipped by every overflow ancestor, relative to the stage. */
	x: number;
	y: number;
	boxWidth: number;
	boxHeight: number;
	parentVisible: boolean;
	offscreen: boolean;
	context: string | null;
	/** First opaque background behind the canvas. */
	background: Rgb;
}

interface StageProbe {
	text: string;
	children: number;
	visible: number;
	biggest: string;
	/** A short sample of visible text that contrasts with the stage background, or "". */
	legibleText: string;
	/** Bounding box of every visible descendant, relative to the stage: the demo's own footprint. */
	footprint: { x: number; y: number; width: number; height: number } | null;
	canvases: CanvasInfo[];
	background: Rgb;
}

interface InkReading {
	stage: number;
	footprint: number;
	canvases: number[];
}

/**
 * Tag every canvas with the context type it asked for, so the probe can tell a
 * GPU canvas from a 2D one without calling getContext itself (which would bind
 * a context the component might not have asked for yet).
 */
function tagCanvasContexts() {
	type Tagged = HTMLCanvasElement & { __phContext?: string; __phOffscreen?: boolean };
	const proto = HTMLCanvasElement.prototype as unknown as {
		getContext: (this: Tagged, type: string, ...rest: unknown[]) => unknown;
		transferControlToOffscreen?: (this: Tagged) => unknown;
	};
	const getContext = proto.getContext;
	proto.getContext = function (type, ...rest) {
		const ctx = getContext.call(this, type, ...rest);
		this.__phContext = type;
		return ctx;
	};
	const transfer = proto.transferControlToOffscreen;
	if (transfer) {
		proto.transferControlToOffscreen = function () {
			this.__phOffscreen = true;
			return transfer.call(this);
		};
	}
}

/** Everything the layout and pixel probes need, read in one pass inside the page. */
function probeStage(stage: Element, minVisible: number): StageProbe {
	type Tagged = HTMLCanvasElement & { __phContext?: string; __phOffscreen?: boolean };
	type Rgb = [number, number, number];
	const stageRect = stage.getBoundingClientRect();

	// Computed colours can come back as oklch(); a 1×1 canvas resolves them to sRGB.
	const swatch = document.createElement("canvas");
	swatch.width = 1;
	swatch.height = 1;
	const swatchCtx = swatch.getContext("2d", { willReadFrequently: true });
	const toRgb = (color: string): { rgb: Rgb; alpha: number } => {
		if (!swatchCtx) return { rgb: [255, 255, 255], alpha: 1 };
		swatchCtx.clearRect(0, 0, 1, 1);
		swatchCtx.fillStyle = "#000";
		swatchCtx.fillStyle = color;
		swatchCtx.fillRect(0, 0, 1, 1);
		const [r, g, b, a] = swatchCtx.getImageData(0, 0, 1, 1).data;
		return { rgb: [r, g, b], alpha: a / 255 };
	};
	const backgroundOf = (start: Element): Rgb => {
		for (let el: Element | null = start; el; el = el.parentElement) {
			const { rgb, alpha } = toRgb(getComputedStyle(el).backgroundColor);
			if (alpha > 0.5) return rgb;
		}
		return [255, 255, 255];
	};
	const distance = (a: Rgb, b: Rgb) =>
		Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

	// The part of an element's box that survives every clipping ancestor up to the stage.
	const clippedRect = (el: Element) => {
		const r = el.getBoundingClientRect();
		let left = r.left;
		let top = r.top;
		let right = r.right;
		let bottom = r.bottom;
		for (let p = el.parentElement; p; p = p.parentElement) {
			const cs = getComputedStyle(p);
			if (p === stage || /hidden|clip|auto|scroll/.test(cs.overflow)) {
				const pr = p.getBoundingClientRect();
				left = Math.max(left, pr.left);
				top = Math.max(top, pr.top);
				right = Math.min(right, pr.right);
				bottom = Math.min(bottom, pr.bottom);
			}
			if (p === stage) break;
		}
		return {
			x: left - stageRect.left,
			y: top - stageRect.top,
			width: Math.max(0, right - left),
			height: Math.max(0, bottom - top),
		};
	};
	const shown = (el: Element) => {
		const cs = getComputedStyle(el);
		return cs.display !== "none" && cs.visibility !== "hidden";
	};
	const opacityUpToStage = (el: Element) => {
		let o = 1;
		for (let p: Element | null = el; p && p !== stage; p = p.parentElement) {
			o *= Number(getComputedStyle(p).opacity);
		}
		return o;
	};

	const background = backgroundOf(stage);
	let visible = 0;
	let biggest = { width: 0, height: 0, tag: "" };
	let legibleText = "";
	let fp: { left: number; top: number; right: number; bottom: number } | null = null;
	for (const el of stage.querySelectorAll("*")) {
		if (!shown(el)) continue;
		const box = clippedRect(el);
		if (box.width * box.height > biggest.width * biggest.height) {
			biggest = { width: box.width, height: box.height, tag: el.tagName.toLowerCase() };
		}
		if (box.width < minVisible || box.height < minVisible) continue;
		visible++;
		fp = fp
			? {
					left: Math.min(fp.left, box.x),
					top: Math.min(fp.top, box.y),
					right: Math.max(fp.right, box.x + box.width),
					bottom: Math.max(fp.bottom, box.y + box.height),
				}
			: { left: box.x, top: box.y, right: box.x + box.width, bottom: box.y + box.height };
		if (legibleText) continue;
		const ownText = [...el.childNodes]
			.filter((n) => n.nodeType === Node.TEXT_NODE)
			.map((n) => n.textContent ?? "")
			.join("")
			.trim();
		if (!ownText) continue;
		const { rgb, alpha } = toRgb(getComputedStyle(el).color);
		if (alpha < 0.5 || opacityUpToStage(el) < 0.5) continue;
		if (distance(rgb, backgroundOf(el)) > 24 * 3) legibleText = ownText.slice(0, 40);
	}

	const canvases: CanvasInfo[] = [...stage.querySelectorAll("canvas")]
		.filter((c) => shown(c))
		.map((c) => {
			const tagged = c as Tagged;
			const box = clippedRect(c);
			const parent = c.parentElement ? clippedRect(c.parentElement) : { width: 0, height: 0 };
			return {
				width: c.width,
				height: c.height,
				x: Math.round(box.x),
				y: Math.round(box.y),
				boxWidth: Math.round(box.width),
				boxHeight: Math.round(box.height),
				parentVisible: parent.width >= minVisible && parent.height >= minVisible,
				offscreen: tagged.__phOffscreen === true,
				context: tagged.__phContext ?? null,
				background: c.parentElement ? backgroundOf(c.parentElement) : background,
			};
		});

	return {
		text: (stage as HTMLElement).innerText ?? "",
		children: stage.children.length,
		visible,
		biggest: `${biggest.tag || "none"} ${Math.round(biggest.width)}×${Math.round(biggest.height)}`,
		legibleText,
		footprint: fp
			? { x: fp.left, y: fp.top, width: fp.right - fp.left, height: fp.bottom - fp.top }
			: null,
		canvases,
		background,
	};
}

/** Canvases whose visible box is big enough to be judged. */
const shownCanvases = (probe: StageProbe) =>
	probe.canvases.filter((c) => c.boxWidth >= MIN_VISIBLE && c.boxHeight >= MIN_VISIBLE);

/**
 * Share of ink in the stage screenshot, in the demo's footprint and inside
 * each shown canvas box, decoded by the page itself (no image dependency).
 */
async function readInk(
	page: Page,
	png: Buffer,
	probe: StageProbe,
	threshold: number
): Promise<InkReading> {
	const canvases = shownCanvases(probe).map((c) => ({
		x: c.x,
		y: c.y,
		width: c.boxWidth,
		height: c.boxHeight,
		background: c.background,
	}));
	return page.evaluate(
		async ({ b64, background, footprint, canvases, threshold }) => {
			const img = new Image();
			img.src = `data:image/png;base64,${b64}`;
			await img.decode();
			const canvas = document.createElement("canvas");
			canvas.width = img.naturalWidth;
			canvas.height = img.naturalHeight;
			const ctx = canvas.getContext("2d", { willReadFrequently: true });
			if (!ctx || canvas.width === 0 || canvas.height === 0) {
				return { stage: 0, footprint: 0, canvases: [] };
			}
			ctx.drawImage(img, 0, 0);
			const ratio = (x: number, y: number, w: number, h: number, bg: number[]) => {
				const x0 = Math.max(0, Math.floor(x));
				const y0 = Math.max(0, Math.floor(y));
				const x1 = Math.min(canvas.width, Math.ceil(x + w));
				const y1 = Math.min(canvas.height, Math.ceil(y + h));
				if (x1 <= x0 || y1 <= y0) return 0;
				const data = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
				let ink = 0;
				for (let i = 0; i < data.length; i += 4) {
					const d =
						Math.abs(data[i] - bg[0]) +
						Math.abs(data[i + 1] - bg[1]) +
						Math.abs(data[i + 2] - bg[2]);
					if (d > threshold) ink++;
				}
				return ink / (data.length / 4);
			};
			return {
				stage: ratio(0, 0, canvas.width, canvas.height, background),
				footprint: footprint
					? ratio(footprint.x, footprint.y, footprint.width, footprint.height, background)
					: 0,
				canvases: canvases.map((c) => ratio(c.x, c.y, c.width, c.height, c.background)),
			};
		},
		{
			b64: png.toString("base64"),
			background: probe.background,
			footprint: probe.footprint,
			canvases,
			threshold,
		}
	);
}

/** Rest the pointer on a point, or sweep it across the stage (same moves as the thumbnails). */
async function applyHint(
	page: Page,
	stage: Locator,
	hint: { hover?: [number, number]; sweep?: boolean }
) {
	const box = await stage.boundingBox();
	if (!box) return;
	const at = (fx: number, fy: number): [number, number] => [
		box.x + box.width * fx,
		box.y + box.height * fy,
	];
	if (hint.sweep) {
		await page.mouse.move(...at(0.15, 0.7));
		await page.mouse.move(...at(0.5, 0.35), { steps: 18 });
		await page.mouse.move(...at(0.72, 0.55), { steps: 12 });
	} else if (hint.hover) {
		await page.mouse.move(...at(0.2, 0.2));
		await page.mouse.move(...at(...hint.hover), { steps: 12 });
		await page.waitForTimeout(350);
	}
}

const pct = (ratio: number) => `${(ratio * 100).toFixed(3)} %`;

/** The one class a stage failure carries; resolution outranks layout, layout outranks pixels. */
function classifyStage(
	probe: StageProbe,
	ink: InkReading,
	quiet: boolean
): { class: FailureClass; detail: string } | null {
	const resolveError = probe.text.match(RESOLVE_ERROR);
	if (resolveError) return { class: "RESOLVE", detail: `stage shows "${resolveError[0]}"` };
	if (probe.children === 0) return { class: "RESOLVE", detail: "stage never received an element" };
	if (!quiet && probe.visible === 0) {
		return {
			class: "COLLAPSE",
			detail: `no descendant reaches ${MIN_VISIBLE}×${MIN_VISIBLE} px (largest: ${probe.biggest}; ink ${pct(ink.stage)})`,
		};
	}
	for (const c of probe.canvases) {
		const boxShown = c.boxWidth >= MIN_VISIBLE && c.boxHeight >= MIN_VISIBLE;
		if (boxShown && (c.width === 0 || c.height === 0)) {
			return {
				class: "UNSIZED_CANVAS",
				detail: `canvas bitmap ${c.width}×${c.height} in a ${c.boxWidth}×${c.boxHeight} box`,
			};
		}
		if (!boxShown && c.parentVisible) {
			return {
				class: "UNSIZED_CANVAS",
				detail: `canvas box ${c.boxWidth}×${c.boxHeight} inside a visible parent`,
			};
		}
		// A canvas no one asked a context of is an idle layer (an HDR overlay on a
		// display that cannot use it), transparent by construction.
		if (
			boxShown &&
			!c.offscreen &&
			c.context !== null &&
			c.width === 300 &&
			c.height === 150 &&
			(c.boxWidth > 310 || c.boxHeight > 160)
		) {
			return {
				class: "UNSIZED_CANVAS",
				detail: `canvas stuck at the 300×150 default in a ${c.boxWidth}×${c.boxHeight} box`,
			};
		}
	}
	if (quiet) return null;
	if (ink.footprint < MIN_INK_RATIO && !probe.legibleText) {
		return {
			class: "INVISIBLE",
			detail: `${pct(ink.footprint)} of the demo (${pct(ink.stage)} of the stage) differs from the stage background rgb(${probe.background.join(", ")})`,
		};
	}
	for (const [i, c] of shownCanvases(probe).entries()) {
		const ratio = ink.canvases[i] ?? 0;
		if (ratio < MIN_INK_RATIO) {
			return {
				class: "INVISIBLE",
				detail: `${pct(ratio)} of a ${c.boxWidth}×${c.boxHeight} canvas differs from the background behind it rgb(${c.background.join(", ")})`,
			};
		}
	}
	return null;
}

function isGpuCanvas(probe: StageProbe | null) {
	return !!probe?.canvases.some((c) => c.offscreen || /webgl|webgpu/i.test(c.context ?? ""));
}

function saveScreenshot(testInfo: TestInfo, slug: string, stage: number, png: Buffer) {
	const file = join(OUT_DIR, testInfo.project.name, `${slug}-s${stage}.png`);
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, png);
	return relative(process.cwd(), file);
}

test.describe("preview health", () => {
	test.beforeEach(async ({ page }, testInfo) => {
		const theme = (testInfo.project.metadata as { theme?: string }).theme ?? "dark";
		await page.addInitScript((value) => {
			try {
				localStorage.setItem("fancy-ui-theme", value);
			} catch {
				/* storage blocked */
			}
		}, theme);
		await page.addInitScript(tagCanvasContexts);
		await page.route("https://api.github.com/**", (route) =>
			route.fulfill({ json: { stargazers_count: 0 } })
		);
		await page.route(ANALYTICS_SCRIPT, (route) =>
			route.fulfill({ body: "", contentType: "text/javascript" })
		);
	});

	for (const slug of SLUGS) {
		test(slug, async ({ page }, testInfo) => {
			const project = testInfo.project.name;
			const noGpu = project === "no-gpu";
			const allow = CONSOLE_ALLOWLIST[project] ?? [];
			const hint = THUMB_HINTS[slug] ?? {};
			const quietStages = EXPECTED_QUIET[slug] ?? [];
			const failures: PreviewFailure[] = [];
			/** Informational findings that do not fail the page. */
			const notes: string[] = [];
			const crashes: string[] = [];
			const failedUrls: string[] = [];
			const errors = collectErrors(page);
			page.on("pageerror", (e) => crashes.push(String(e)));
			// Console "Failed to load resource" lines carry no URL; keep them to name the culprit.
			page.on("response", (r) => {
				if (r.status() >= 400) failedUrls.push(`${r.status()} ${r.url()}`);
			});

			const fail = (failure: PreviewFailure) => {
				failures.push(failure);
				testInfo.annotations.push({
					type: failure.class,
					description: `${failure.stage === null ? "page" : `s${failure.stage}`}: ${failure.detail}`,
				});
			};

			try {
				let loaded = false;
				// A refused connection is the server restarting, not the page: retry it a few
				// times before calling the page stuck.
				for (let attempt = 1; !loaded; attempt++) {
					try {
						await page.goto(`/docs/components/${slug}`, { waitUntil: "load", timeout: 45_000 });
						loaded = true;
					} catch (err) {
						const message = String(err).split("\n")[0];
						if (/ERR_CONNECTION_REFUSED/.test(message) && attempt < 4) {
							await page.waitForTimeout(5_000);
							continue;
						}
						fail({ class: "STUCK", stage: null, detail: `page did not load: ${message}` });
						break;
					}
				}

				if (loaded) {
					const stages = page.locator("[data-thumb-stage]");
					const hero = stages.first();
					const spinner = hero.locator(":scope > div.h-64 > div.animate-spin");
					let heroReady = true;
					const waitStarted = Date.now();
					try {
						await expect(spinner).toHaveCount(0, { timeout: SPINNER_TIMEOUT });
					} catch {
						// SwiftShader compiles shaders on the main thread, so a WebGL-heavy page can
						// hold the import past 8 s now and then. A spinner that clears within the
						// grace is reported as slow (informational); one that does not is STUCK.
						try {
							await expect(spinner).toHaveCount(0, { timeout: SPINNER_GRACE });
							notes.push(
								`hero spinner cleared after ${((Date.now() - waitStarted) / 1000).toFixed(1)} s`
							);
						} catch {
							heroReady = false;
							fail({
								class: "STUCK",
								stage: 0,
								detail: `hero spinner still showing after ${(SPINNER_TIMEOUT + SPINNER_GRACE) / 1000} s`,
							});
						}
					}

					// Examples load lazily and all at once; give them a bounded wait before probing.
					const count = await stages.count();
					await expect
						.poll(
							() => stages.evaluateAll((els) => els.slice(1).every((el) => el.children.length > 0)),
							{ timeout: EXAMPLES_TIMEOUT }
						)
						.toBe(true)
						.catch(() => {
							/* the empty stages are reported as RESOLVE below */
						});
					await page.waitForTimeout(HERO_SETTLE);

					for (let i = heroReady ? 0 : 1; i < count; i++) {
						const stage = stages.nth(i);
						const hinted = (hint.stage ?? 0) === i;
						await stage.evaluate((el) => el.scrollIntoView({ block: "center" }));
						await page.mouse.move(0, 0);
						await page.waitForTimeout(hinted && hint.delay ? hint.delay : STAGE_SETTLE);
						if (hinted) await applyHint(page, stage, hint);

						const quiet = quietStages.includes(i);
						const read = async () => {
							const probe = await stage.evaluate(probeStage, MIN_VISIBLE);
							const png = await stage.screenshot({ type: "png", animations: "allow" });
							const ink = await readInk(page, png, probe, INK_DISTANCE);
							return { probe, png, verdict: classifyStage(probe, ink, quiet) };
						};
						let { probe, png, verdict } = await read();
						// Slow first frames (SwiftShader, entrance animations, a resize observer that
						// has not fired yet) get one second look before the stage is reported.
						if (verdict && verdict.class !== "RESOLVE") {
							await page.waitForTimeout(RECHECK_DELAY);
							({ probe, png, verdict } = await read());
						}
						if (verdict) {
							const gpuOnly = noGpu && isGpuCanvas(probe);
							fail({
								class: gpuOnly ? "GPU_ONLY" : verdict.class,
								stage: i,
								detail: gpuOnly ? `${verdict.class}: ${verdict.detail}` : verdict.detail,
								screenshot: saveScreenshot(testInfo, slug, i, png),
							});
							await testInfo.attach(`s${i}-${verdict.class}`, {
								body: png,
								contentType: "image/png",
							});
						}
					}
				}
			} finally {
				for (const crash of crashes) {
					const gpu = noGpu && GPU_MESSAGE.test(crash);
					fail({
						class: gpu ? "GPU_ONLY" : "CRASH",
						stage: null,
						detail: gpu ? `CRASH: ${crash}` : crash,
					});
				}
				const crashSet = new Set(crashes);
				for (const message of errors) {
					if (crashSet.has(message)) continue;
					if (allow.some((re) => re.test(message))) continue;
					const urls = /Failed to load resource/.test(message) ? ` [${failedUrls.join(", ")}]` : "";
					fail({ class: "CONSOLE", stage: null, detail: `${message.slice(0, 400)}${urls}` });
				}
				await testInfo.attach(FAILURES_ATTACHMENT, {
					body: JSON.stringify({ failures, notes }),
					contentType: "application/json",
				});
			}

			expect(
				failures.map((f) => `${f.class} ${f.stage === null ? "page" : `s${f.stage}`}: ${f.detail}`),
				`${slug} previews are healthy`
			).toEqual([]);
		});
	}
});
