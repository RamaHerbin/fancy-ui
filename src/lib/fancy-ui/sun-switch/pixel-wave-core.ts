// pixel-wave-core.ts — framework-free "pixel wave" theme transition.
// No framework imports, no module-scope window/document access, no build-time env.
// Byte-identical copies live in the React and Vue packages: edit here, copy there.
//
// `pixelWave({ origin, apply })` calls `apply()` exactly once and reveals the new
// state from `origin` through a grid-aligned staircase led by a dithered halo:
// - document mode + View Transitions: `apply` runs inside `startViewTransition`,
//   `::view-transition-new(root)` is clipped by the staircase each frame and the
//   halo is painted on a fixed canvas that renders live above the snapshots;
// - `contained` mode: a static copy of `scope` taken before `apply` (inert, hidden
//   from assistive tech) keeps the old look outside the front, clipped by an
//   even-odd staircase hole each frame; the halo is painted above it;
// - no View Transitions (or no `path()` clip for the copy): `apply` runs
//   synchronously and a canvas paints a sheet of the old colour with a staircase
//   hole, the live element drawn onto it, plus the halo;
// - reduced motion: `apply` only.
// On HDR displays (WebGPU + `(dynamic-range: high)`) the halo squares are drawn
// again above SDR white on a WebGPU canvas laid over the halo canvas.
// A second call while a wave runs skips the running wave first (its own `apply`
// still runs, once), then applies the new state instantly.

import {
	SUN_PALETTE,
	coverRadiusCells,
	easeInOutCubic,
	gridOffset,
	paintHalo,
	paintSheet,
	parseInk,
	staircaseHoleClip,
	staircasePolygon,
	staircaseRows,
	type Ctx2D,
	type SunPalette,
} from "./sun-switch-core.js";
import { startSunHdr, sunHdrAvailable, type SunHdrLayer } from "./sun-switch-hdr.js";

export const WAVE_ATTR = "data-fancy-sun-waving";
export const WAVE_NAME = "fancy-sun-wave";
export const LIVE_NAME = "fancy-sun-live";
export const WAVE_HDR_NAME = "fancy-sun-wave-hdr";
export const LIVE_HDR_NAME = "fancy-sun-live-hdr";
export const WAVE_STYLE_ID = "fancy-sun-wave-styles";
export const HALO_ATTR = "data-fancy-sun-halo";
export const HALO_HDR_ATTR = "data-fancy-sun-halo-hdr";
export const SHEET_ATTR = "data-fancy-sun-sheet";
export const GHOST_ATTR = "data-fancy-sun-ghost";

/** Largest backing store (device px) the wave canvas may use; some engines refuse
 * bigger canvases (no context at all). */
export const MAX_WAVE_CANVAS_PIXELS = 16_000_000;

/** Backing-store scale of the halo / sheet canvas: an integer from 1 to 2 (the dots
 * are whole cells, drawn crisp with `image-rendering: pixelated`), dropping to 1 when
 * the canvas would exceed `MAX_WAVE_CANVAS_PIXELS`. */
export function waveCanvasDpr(devicePixelRatio: number, W: number, H: number): number {
	const raw = devicePixelRatio > 0 ? devicePixelRatio : 1;
	const dpr = Math.min(2, Math.max(1, Math.floor(raw)));
	return W * H * dpr * dpr > MAX_WAVE_CANVAS_PIXELS ? 1 : dpr;
}

/** View-transition rules, scoped to `html[data-fancy-sun-waving]` so other view
 * transitions on the page keep their own animations. */
export const WAVE_CSS = `html[${WAVE_ATTR}]::view-transition-group(root),
html[${WAVE_ATTR}]::view-transition-old(root),
html[${WAVE_ATTR}]::view-transition-new(root),
html[${WAVE_ATTR}]::view-transition-group(${WAVE_NAME}),
html[${WAVE_ATTR}]::view-transition-new(${WAVE_NAME}),
html[${WAVE_ATTR}]::view-transition-group(${LIVE_NAME}),
html[${WAVE_ATTR}]::view-transition-new(${LIVE_NAME}),
html[${WAVE_ATTR}]::view-transition-group(${WAVE_HDR_NAME}),
html[${WAVE_ATTR}]::view-transition-new(${WAVE_HDR_NAME}),
html[${WAVE_ATTR}]::view-transition-group(${LIVE_HDR_NAME}),
html[${WAVE_ATTR}]::view-transition-new(${LIVE_HDR_NAME}) {
	animation: none;
	mix-blend-mode: normal;
}
html[${WAVE_ATTR}]::view-transition-old(${WAVE_NAME}),
html[${WAVE_ATTR}]::view-transition-old(${LIVE_NAME}),
html[${WAVE_ATTR}]::view-transition-old(${WAVE_HDR_NAME}),
html[${WAVE_ATTR}]::view-transition-old(${LIVE_HDR_NAME}) {
	display: none;
}
html[${WAVE_ATTR}]::view-transition-new(root) {
	clip-path: polygon(0 0, 0 0, 0 0);
}
`;

export type PixelWaveMode = "document" | "contained";

export interface PixelWaveOptions {
	/** Wave origin: viewport px (document) or scope-local px (contained). */
	origin: { x: number; y: number };
	/** Flips the state synchronously. Called exactly once; errors are reported, not thrown. */
	apply: () => void;
	mode?: PixelWaveMode;
	/** The element the wave covers in contained mode (positioned, overflow hidden). */
	scope?: HTMLElement | null;
	/** Element kept live during the wave (named `fancy-sun-live`, kept out of the sheet). */
	live?: HTMLElement | null;
	/** A second live element, drawn above `live` (the switch's HDR canvas), named
	 * `fancy-sun-live-hdr` during a view transition. */
	liveHdr?: HTMLElement | null;
	/** HDR displays: the halo also glows above SDR white on a WebGPU canvas. Default true. */
	hdr?: boolean;
	/** Colour of the old-state sheet. Default: first opaque background from scope/body up. */
	fill?: string;
	cell?: number;
	dot?: number;
	haloCells?: number;
	duration?: number;
	palette?: SunPalette;
	ease?: (t: number) => number;
	/** Default: `prefers-reduced-motion` read at call time. */
	reducedMotion?: boolean;
	/** Called every frame with the outer halo radius (cells) and progress t in [0, 1]. */
	onFront?: (R: number, t: number) => void;
	/** Clock in ms (tests). Default `performance.now()`. */
	now?: () => number;
}

const adopted = new WeakMap<Document, CSSStyleSheet>();

/** Injects `WAVE_CSS` once per document: adopted style sheet when supported,
 * otherwise a `<style id="fancy-sun-wave-styles">` in `<head>`. */
export function ensureWaveStyles(doc: Document): void {
	const d = doc as Document & { adoptedStyleSheets?: CSSStyleSheet[] };
	const Sheet = doc.defaultView?.CSSStyleSheet;
	if (Array.isArray(d.adoptedStyleSheets) && typeof Sheet === "function") {
		const existing = adopted.get(doc);
		if (existing && d.adoptedStyleSheets.includes(existing)) return;
		try {
			const sheet = existing ?? new Sheet();
			if (!existing) sheet.replaceSync(WAVE_CSS);
			d.adoptedStyleSheets = [...d.adoptedStyleSheets, sheet];
			adopted.set(doc, sheet);
			return;
		} catch {
			// fall through to the <style> element
		}
	}
	if (doc.getElementById(WAVE_STYLE_ID)) return;
	const el = doc.createElement("style");
	el.id = WAVE_STYLE_ID;
	el.textContent = WAVE_CSS;
	(doc.head ?? doc.documentElement).append(el);
}

/** Whether `doc.startViewTransition` exists. A function, never a module constant. */
export function supportsViewTransition(doc: Document): boolean {
	return typeof (doc as { startViewTransition?: unknown }).startViewTransition === "function";
}

/**
 * The colour `el` visibly sits on: computed backgrounds from `el` up to `<html>`,
 * translucent layers composited over the first opaque one (white if none).
 * A colour that cannot be parsed counts as opaque.
 */
export function firstOpaqueBackground(el: Element): string {
	const win = el.ownerDocument.defaultView;
	if (!win) return "#fff";
	const layers: { r: number; g: number; b: number; a: number }[] = [];
	let base: string | null = null;
	for (let n: Element | null = el; n; n = n.parentElement) {
		const bg = win.getComputedStyle(n).backgroundColor;
		if (!bg) continue;
		const p = parseInk(bg);
		if (!p) {
			if (bg === "transparent") continue;
			base = bg;
			break;
		}
		if (p.a >= 1) {
			base = bg;
			layers.push(p);
			break;
		}
		if (p.a > 0) layers.push(p);
	}
	if (layers.length === 0) return base ?? "#fff";
	const top = layers[0];
	if (layers.length === 1 && top && top.a >= 1) return base ?? "#fff";
	// Unparseable opaque base under translucent layers: keep the base.
	if (base && !parseInk(base)) return base;
	let c = { r: 255, g: 255, b: 255 };
	for (let i = layers.length - 1; i >= 0; i--) {
		const l = layers[i];
		if (!l) continue;
		c = {
			r: l.r * l.a + c.r * (1 - l.a),
			g: l.g * l.a + c.g * (1 - l.a),
			b: l.b * l.a + c.b * (1 - l.a),
		};
	}
	return `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`;
}

/** Minimum time between two theme flips: at most 3 full-page flips a second
 * (photosensitivity). Shared by every switch on the page. */
export const MIN_FLIP_MS = 334;

let lastFlipAt = -Infinity;

/** Milliseconds before the next flip may start, page-wide (0 = now). */
export function flipWait(now: number): number {
	return Math.max(0, lastFlipAt + MIN_FLIP_MS - now);
}

/** Records that a flip started at `now`. */
export function markFlip(now: number): void {
	lastFlipAt = now;
}

/** Forgets the last flip (tests). */
export function resetFlipGate(): void {
	lastFlipAt = -Infinity;
}

interface ActiveWave {
	skip(): void;
}

let active: ActiveWave | null = null;

/** Whether a wave is running (waves are global: one at a time). */
export function isWaving(): boolean {
	return active !== null;
}

interface ViewTransitionLike {
	ready: Promise<unknown>;
	finished: Promise<unknown>;
	skipTransition(): void;
}

function report(error: unknown) {
	if (typeof console !== "undefined") console.error(error);
}

/**
 * Runs one wave. Always calls `apply` exactly once and never rejects; the promise
 * resolves once every canvas, attribute and view-transition name is cleaned up.
 */
export function pixelWave(o: PixelWaveOptions): Promise<void> {
	let applied = false;
	const runApply = () => {
		if (applied) return;
		applied = true;
		try {
			o.apply();
		} catch (error) {
			report(error);
		}
	};

	if (active) {
		active.skip();
		runApply();
		return Promise.resolve();
	}

	const doc = typeof document === "undefined" ? null : document;
	const win = doc?.defaultView ?? null;
	if (!doc || !win || !doc.body) {
		runApply();
		return Promise.resolve();
	}
	const reduced =
		o.reducedMotion ??
		(typeof win.matchMedia === "function" &&
			win.matchMedia("(prefers-reduced-motion: reduce)").matches);
	if (reduced) {
		runApply();
		return Promise.resolve();
	}

	const html = doc.documentElement;
	const cell = o.cell && o.cell > 0 ? o.cell : 5;
	const dot = Math.min(o.dot && o.dot > 0 ? o.dot : 4, cell);
	const halo = o.haloCells !== undefined && o.haloCells >= 0 ? o.haloCells : 9;
	const duration = o.duration !== undefined && o.duration >= 0 ? o.duration : 1300;
	const palette = o.palette ?? SUN_PALETTE;
	const ease = o.ease ?? easeInOutCubic;
	const now = o.now ?? (() => win.performance.now());
	const scope = (o.mode ?? "document") === "contained" ? (o.scope ?? null) : null;
	const contained = (o.mode ?? "document") === "contained";

	let W: number;
	let H: number;
	let boxLeft = 0;
	let boxTop = 0;
	if (scope) {
		const r = scope.getBoundingClientRect();
		boxLeft = r.left + scope.clientLeft;
		boxTop = r.top + scope.clientTop;
		W = scope.clientWidth;
		H = scope.clientHeight;
	} else {
		W = win.innerWidth;
		H = win.innerHeight;
	}
	const origin = { x: o.origin.x, y: o.origin.y };
	const ox = gridOffset(origin.x - cell / 2, cell);
	const oy = gridOffset(origin.y - cell / 2, cell);
	const tx = (origin.x - ox) / cell;
	const ty = (origin.y - oy) / cell;
	const cover = coverRadiusCells(origin, W, H, cell, halo);
	const dpr = waveCanvasDpr(win.devicePixelRatio, W, H);

	const useVT = !contained && supportsViewTransition(doc) && typeof html.animate === "function";
	const sheetColor = useVT ? "" : (o.fill ?? firstOpaqueBackground(scope ?? doc.body));
	// Contained: a copy of the scope's old content, taken before `apply`.
	const ghost = scope && !useVT ? makeGhost(scope, W, H, sheetColor) : null;

	const canvas = doc.createElement("canvas");
	canvas.setAttribute(HALO_ATTR, "");
	if (!useVT && !ghost) canvas.setAttribute(SHEET_ATTR, "");
	canvas.setAttribute("aria-hidden", "true");
	canvas.width = Math.max(1, Math.round(W * dpr));
	canvas.height = Math.max(1, Math.round(H * dpr));
	const cs = canvas.style;
	cs.position = scope ? "absolute" : "fixed";
	cs.left = "0";
	cs.top = "0";
	cs.width = `${W}px`;
	cs.height = `${H}px`;
	cs.pointerEvents = "none";
	cs.zIndex = "2147483647";
	cs.margin = "0";
	cs.padding = "0";
	cs.border = "0";
	cs.imageRendering = "pixelated";

	// HDR: a WebGPU canvas over the halo canvas, same box; the halo squares are
	// drawn there again at `haloGlow(D) ×` their colour once the device is up.
	let hdrCanvas: HTMLCanvasElement | null = null;
	let hdrLayer: SunHdrLayer | null = null;
	if (o.hdr !== false && sunHdrAvailable()) {
		hdrCanvas = doc.createElement("canvas");
		hdrCanvas.setAttribute(HALO_HDR_ATTR, "");
		hdrCanvas.setAttribute("aria-hidden", "true");
		hdrCanvas.width = canvas.width;
		hdrCanvas.height = canvas.height;
		hdrCanvas.style.cssText = cs.cssText;
	}

	// Sheet path: the live element (a canvas) is drawn onto the sheet where the
	// sheet is opaque, so it shows on the old colour instead of in a hole.
	let liveDraw: { el: HTMLCanvasElement; x: number; y: number; w: number; h: number } | null = null;
	if (!useVT && !ghost && o.live && o.live.tagName === "CANVAS") {
		const lr = o.live.getBoundingClientRect();
		liveDraw = {
			el: o.live as HTMLCanvasElement,
			x: (lr.left - boxLeft) * dpr,
			y: (lr.top - boxTop) * dpr,
			w: lr.width * dpr,
			h: lr.height * dpr,
		};
	}

	const hasRaf = typeof win.requestAnimationFrame === "function";
	const request = (cb: () => void): number =>
		hasRaf ? win.requestAnimationFrame(cb) : (win.setTimeout(cb, 16) as unknown as number);
	const cancelFrame = (id: number) => {
		if (!id) return;
		if (hasRaf) win.cancelAnimationFrame(id);
		else win.clearTimeout(id);
	};

	let ctx: Ctx2D | null = null;
	let raf = 0;
	let t0: number | null = null;
	let clipping = useVT;
	let prevAnim: Animation | null = null;
	let lastPoly = "";
	/** The live element's own inline transition name, restored on cleanup. */
	let liveName = "";
	let livePriority = "";
	let liveHdrName = "";
	let liveHdrPriority = "";
	let vt: ViewTransitionLike | null = null;
	let loopDone = false;
	let vtDone = !useVT;
	let done = false;
	let resolve: () => void = () => {};
	const promise = new Promise<void>((r) => {
		resolve = r;
	});

	const wave: ActiveWave = {
		skip() {
			runApply();
			clipping = false;
			prevAnim?.cancel();
			prevAnim = null;
			if (vt) {
				try {
					vt.skipTransition();
				} catch {
					// already finished
				}
			}
			cleanup();
		},
	};

	function cleanup() {
		if (done) return;
		done = true;
		cancelFrame(raf);
		raf = 0;
		canvas.remove();
		hdrCanvas?.remove();
		hdrLayer?.destroy();
		hdrLayer = null;
		ghost?.remove();
		if (useVT) {
			html.removeAttribute(WAVE_ATTR);
			if (o.live) {
				if (liveName) o.live.style.setProperty("view-transition-name", liveName, livePriority);
				else o.live.style.removeProperty("view-transition-name");
			}
			if (o.liveHdr) {
				if (liveHdrName)
					o.liveHdr.style.setProperty("view-transition-name", liveHdrName, liveHdrPriority);
				else o.liveHdr.style.removeProperty("view-transition-name");
			}
		}
		if (active === wave) active = null;
		resolve();
	}

	function maybeFinish() {
		if (loopDone && vtDone) cleanup();
	}

	function frame() {
		raf = 0;
		if (done) return;
		const n = now();
		if (t0 === null) t0 = n;
		const t = duration > 0 ? Math.min(1, Math.max(0, (n - t0) / duration)) : 1;
		const R = ease(t) * cover;
		const rows = staircaseRows(tx, ty, R - halo + 0.5, cell, ox, oy);
		if (ghost) ghost.style.setProperty("clip-path", staircaseHoleClip(rows, W, H));
		if (ctx) {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			if (!useVT && !ghost) {
				paintSheet(ctx, sheetColor, W, H, dpr, rows, null);
				if (liveDraw) drawLive(ctx, liveDraw);
			}
			const glow = hdrLayer?.sink ?? null;
			glow?.clear();
			paintHalo(ctx, { cx: tx, cy: ty, R, halo, cell, dot, ox, oy, W, H, palette, dpr, glow });
			hdrLayer?.render(canvas.width, canvas.height, Math.max(1, Math.round(dot * dpr)));
		}
		const poly = clipping && vt ? staircasePolygon(rows) : "";
		if (clipping && vt && poly !== lastPoly) {
			try {
				const keyframes = [{ clipPath: poly }, { clipPath: poly }];
				// Update the running clip in place; create one only when needed.
				if (!(prevAnim && setKeyframes(prevAnim, keyframes))) {
					const a = html.animate(keyframes, {
						duration: 1e6,
						fill: "forwards",
						pseudoElement: "::view-transition-new(root)",
					});
					prevAnim?.cancel();
					prevAnim = a;
				}
				lastPoly = poly;
			} catch {
				// Pseudo-element animation unsupported: flip now, keep the halo sweep.
				clipping = false;
				prevAnim?.cancel();
				prevAnim = null;
				try {
					vt.skipTransition();
				} catch {
					// already finished
				}
			}
		}
		if (o.onFront) {
			try {
				o.onFront(R, t);
			} catch (error) {
				report(error);
			}
		}
		if (done) return;
		if (t < 1) {
			raf = request(frame);
		} else {
			prevAnim?.finish();
			loopDone = true;
			maybeFinish();
		}
	}

	active = wave;
	if (ghost && scope) scope.append(ghost);
	(scope ?? doc.body).append(canvas);
	if (hdrCanvas) {
		canvas.after(hdrCanvas);
		void startSunHdr(hdrCanvas).then((layer) => {
			if (done) layer?.destroy();
			else hdrLayer = layer;
		});
	}
	try {
		ctx =
			typeof canvas.getContext === "function"
				? (canvas.getContext("2d") as unknown as Ctx2D | null)
				: null;
	} catch {
		ctx = null;
	}

	if (useVT) {
		ensureWaveStyles(doc);
		if (o.live) {
			liveName = o.live.style.getPropertyValue("view-transition-name");
			livePriority = o.live.style.getPropertyPriority("view-transition-name");
			o.live.style.setProperty("view-transition-name", LIVE_NAME);
		}
		if (o.liveHdr) {
			liveHdrName = o.liveHdr.style.getPropertyValue("view-transition-name");
			liveHdrPriority = o.liveHdr.style.getPropertyPriority("view-transition-name");
			o.liveHdr.style.setProperty("view-transition-name", LIVE_HDR_NAME);
		}
		canvas.style.setProperty("view-transition-name", WAVE_NAME);
		hdrCanvas?.style.setProperty("view-transition-name", WAVE_HDR_NAME);
		html.setAttribute(WAVE_ATTR, "");
		try {
			const start = (doc as unknown as { startViewTransition(cb: () => void): ViewTransitionLike })
				.startViewTransition;
			vt = start.call(doc, runApply);
		} catch (error) {
			report(error);
			vt = null;
		}
		if (!vt) {
			runApply();
			cleanup();
			return promise;
		}
		const settleVT = () => {
			vtDone = true;
			maybeFinish();
		};
		vt.finished.then(settleVT, settleVT);
		vt.ready.then(
			() => {
				if (!done) raf = request(frame);
			},
			() => {
				loopDone = true;
				maybeFinish();
			}
		);
	} else {
		runApply();
		// First frame painted synchronously, in the same task as `apply`, so the
		// new state never shows uncovered for a frame.
		frame();
	}
	return promise;
}

/** `effect.setKeyframes(keyframes)` on a running animation; false when unsupported. */
function setKeyframes(anim: Animation, keyframes: Keyframe[]): boolean {
	const effect = anim.effect as { setKeyframes?: (k: Keyframe[]) => void } | null | undefined;
	if (!effect || typeof effect.setKeyframes !== "function") return false;
	try {
		effect.setKeyframes(keyframes);
		return true;
	} catch {
		return false;
	}
}

/** Draws the live canvas onto the sheet, only where the sheet is opaque. */
function drawLive(
	ctx: Ctx2D,
	d: { el: HTMLCanvasElement; x: number; y: number; w: number; h: number }
): void {
	const c = ctx as Ctx2D & {
		globalCompositeOperation?: string;
		drawImage?: (img: HTMLCanvasElement, x: number, y: number, w: number, h: number) => void;
	};
	if (typeof c.drawImage !== "function" || !(d.w > 0 && d.h > 0)) return;
	try {
		c.globalCompositeOperation = "source-atop";
		c.drawImage(d.el, d.x, d.y, d.w, d.h);
	} catch {
		// a zero-size or tainted source: the sheet stays plain
	} finally {
		c.globalCompositeOperation = "source-over";
	}
}

/** Elements that would load, play or reconnect if copied into the page. */
const GHOST_DROP = "iframe, object, embed, video, audio, script";

/**
 * A static copy of `scope` laid over its padding box: the old look kept outside
 * the front in contained mode. Inert and hidden from assistive tech, no ids or
 * form names (no duplicate ids, no radio-group interplay), canvases copied pixel
 * for pixel. Null when the engine cannot clip it with `path()`.
 */
function makeGhost(
	scope: HTMLElement,
	W: number,
	H: number,
	background: string
): HTMLElement | null {
	const win = scope.ownerDocument.defaultView;
	const css = win?.CSS as { supports?: (p: string, v: string) => boolean } | undefined;
	try {
		if (!css?.supports?.("clip-path", 'path(evenodd, "M0 0H1V1H0Z")')) return null;
		const ghost = scope.cloneNode(true) as HTMLElement;
		for (const el of Array.from(ghost.querySelectorAll(GHOST_DROP))) el.remove();
		for (const el of [ghost, ...Array.from(ghost.querySelectorAll("[id], [name]"))]) {
			el.removeAttribute("id");
			el.removeAttribute("name");
		}
		const from = Array.from(scope.querySelectorAll("canvas"));
		const to = Array.from(ghost.querySelectorAll("canvas"));
		from.forEach((src, i) => {
			const dst = to[i];
			if (!dst) return;
			try {
				dst.width = src.width;
				dst.height = src.height;
				dst.getContext("2d")?.drawImage(src, 0, 0);
			} catch {
				// an unreadable canvas stays blank
			}
		});
		ghost.setAttribute(GHOST_ATTR, "");
		ghost.setAttribute("aria-hidden", "true");
		ghost.setAttribute("inert", "");
		const gs = ghost.style;
		gs.position = "absolute";
		gs.left = "0";
		gs.top = "0";
		gs.right = "auto";
		gs.bottom = "auto";
		gs.width = `${W}px`;
		gs.height = `${H}px`;
		gs.minWidth = "0";
		gs.minHeight = "0";
		gs.maxWidth = "none";
		gs.maxHeight = "none";
		gs.margin = "0";
		gs.borderStyle = "none";
		gs.boxSizing = "border-box";
		gs.transform = "none";
		gs.transition = "none";
		gs.overflow = "hidden";
		gs.pointerEvents = "none";
		gs.zIndex = "2147483646";
		if (background) gs.backgroundColor = background;
		gs.setProperty("clip-path", staircaseHoleClip([], W, H));
		return ghost;
	} catch {
		return null;
	}
}
