/**
 * StoryThread engine — framework-free, byte-identical in the Svelte, React and
 * Vue trees (see shared-cores.json).
 *
 * The component renders the markup; this module drives everything that moves:
 *
 * - the layout: horizontal (a sticky viewport whose track pans as the page
 *   scrolls vertically) or vertical (a plain stack),
 * - the thread: one smooth curve per segment through the centres of the
 *   `[data-story-node]` anchors, drawn into the component's <svg> as a faint
 *   ghost plus a bright copy uncovered by a mask whose stroke-dashoffset
 *   follows the reading position,
 * - the head: a glowing dot at the tip of every segment that is drawing,
 * - the nodes: `data-reached` on each anchor the tip has passed,
 * - the horizontal inputs: sideways wheel, mouse drag, arrow keys, and
 *   panning to whatever receives focus.
 *
 * Expected markup:
 *   root        .st-root            the scroll spacer (height set here)
 *     viewport  .st-viewport        sticky window onto the track
 *       track   .st-track           panned with translate3d
 *         svg   .st-svg             filled here, aria-hidden
 *         …content holding [data-story-node="<id>"] anchors
 *
 * Per-frame output goes straight to the DOM (attributes, `d`, transforms),
 * never through framework state. No browser global is touched at import time.
 */

export type StoryThreadAxis = "x" | "y";
export type StoryThreadLayout = "auto" | "horizontal" | "vertical";
export type StoryThreadDash = "dotted" | "dashed" | "solid";

export interface StoryThreadSegment {
	/** Node ids the segment runs through, in order. */
	nodes: string[];
	/** Stroke and head colour of the drawn part. Any CSS colour. */
	color?: string;
}

export interface StoryThreadPoint {
	x: number;
	y: number;
}

/** [start, end] of a segment along the scroll axis. */
export type StoryThreadSpan = [number, number];

export interface StoryThreadOptions {
	layout: StoryThreadLayout;
	/** Segments to draw; empty means one segment through every node in DOM order. */
	segments: StoryThreadSegment[];
	/** Where the tip sits in the viewport, 0..1 along the scroll axis. */
	lead: number;
	/** Curve tension, 0 (straight lines) .. 1. */
	tension: number;
	dash: StoryThreadDash;
	/** Draw the glowing head at each segment's tip. */
	head: boolean;
	/** No smooth scrolling for the arrow keys. */
	reducedMotion: boolean;
	/** Called once each time the tip moves past a node going forward. */
	onReach?: (id: string) => void;
}

export interface StoryThreadCore {
	update(options: Partial<StoryThreadOptions>): void;
	/** Re-read the nodes and the geometry (after content changed). */
	refresh(): void;
	destroy(): void;
}

export const STORY_THREAD_DEFAULTS = {
	layout: "auto",
	lead: 0.7,
	tension: 0.55,
	dash: "dotted",
	head: true,
} as const;

/** Viewport size at which `layout="auto"` turns horizontal. */
export const STORY_THREAD_HORIZONTAL_QUERY = "(min-width: 900px) and (min-height: 520px)";

const SVG_NS = "http://www.w3.org/2000/svg";
/** Elements a mouse drag never starts from. */
const NO_DRAG = "a, button, input, textarea, select, label, [contenteditable], [data-no-drag]";
/** Spacing, px of path length, between the samples that map axis → length. */
const SAMPLE_STEP = 6;

function clamp(n: number, lo: number, hi: number): number {
	return Math.max(lo, Math.min(hi, n));
}

/**
 * Cubic curve through `pts` with tangents flat along `axis`: each control
 * point sits `tension` of the way to the neighbour along the scroll axis.
 * Empty string under two points.
 */
export function curvePath(pts: StoryThreadPoint[], axis: StoryThreadAxis, tension = 0.55): string {
	if (pts.length < 2) return "";
	const r = (n: number) => Math.round(n * 100) / 100;
	let d = `M ${r(pts[0].x)} ${r(pts[0].y)}`;
	for (let i = 1; i < pts.length; i++) {
		const q = pts[i - 1];
		const p = pts[i];
		if (axis === "x") {
			const dx = (p.x - q.x) * tension;
			d += ` C ${r(q.x + dx)} ${r(q.y)} ${r(p.x - dx)} ${r(p.y)} ${r(p.x)} ${r(p.y)}`;
		} else {
			const dy = (p.y - q.y) * tension;
			d += ` C ${r(q.x)} ${r(q.y + dy)} ${r(p.x)} ${r(p.y - dy)} ${r(p.x)} ${r(p.y)}`;
		}
	}
	return d;
}

/**
 * The segments to draw: the given ones, or one through every node in
 * document order. Ids that are not on the page are dropped; a segment left
 * with fewer than two points is dropped too.
 */
export function resolveSegments(
	segments: StoryThreadSegment[],
	order: string[],
	points: Record<string, StoryThreadPoint>
): { ids: string[]; points: StoryThreadPoint[]; color?: string }[] {
	const source = segments.length > 0 ? segments : [{ nodes: order }];
	const out: { ids: string[]; points: StoryThreadPoint[]; color?: string }[] = [];
	for (const seg of source) {
		const ids = seg.nodes.filter((id) => points[id] !== undefined);
		if (ids.length < 2) continue;
		out.push({ ids, points: ids.map((id) => points[id]), color: seg.color });
	}
	return out;
}

/** A segment's extent along the scroll axis, from its first to its last point. */
export function segmentSpan(points: StoryThreadPoint[], axis: StoryThreadAxis): StoryThreadSpan {
	return [points[0][axis], points[points.length - 1][axis]];
}

/** Drawn fraction of a segment, 0..1, for the tip at `tip` along the axis. */
export function spanProgress(tip: number, span: StoryThreadSpan): number {
	return clamp((tip - span[0]) / Math.max(1, span[1] - span[0]), 0, 1);
}

/** Where the tip is, along the axis, in track coordinates. */
export function tipPosition(pos: number, viewport: number, lead: number): number {
	return pos + viewport * clamp(lead, 0, 1);
}

/**
 * Tip of the thread in the horizontal layout. It starts `lead` of the way
 * across the viewport and reaches the end of the track exactly when the pan
 * does, so the last node is always drawn by the end of the story. A track
 * that does not overflow is drawn whole.
 */
export function panTip(
	pan: number,
	maxPan: number,
	viewportWidth: number,
	trackWidth: number,
	lead: number
): number {
	if (maxPan <= 0) return trackWidth;
	const start = viewportWidth * clamp(lead, 0, 1);
	return start + (clamp(pan, 0, maxPan) / maxPan) * (trackWidth - start);
}

/** Height of the scroll spacer that lets vertical scrolling pan the whole track. */
export function spacerHeight(
	trackWidth: number,
	viewportWidth: number,
	viewportHeight: number
): number {
	return Math.max(0, trackWidth - viewportWidth) + viewportHeight;
}

/** Pan offset, px, for a reader who has scrolled `scrolled` px into the spacer. */
export function clampPan(scrolled: number, trackWidth: number, viewportWidth: number): number {
	return clamp(scrolled, 0, Math.max(0, trackWidth - viewportWidth));
}

/** Scroll distance of one arrow-key press. */
export function keyStep(viewportWidth: number, dir: 1 | -1): number {
	return dir * viewportWidth * 0.85;
}

/** `stroke-dasharray` of the visible strokes; `null` draws a solid line. */
export function dashPattern(dash: StoryThreadDash): string | null {
	if (dash === "dashed") return "10 12";
	if (dash === "dotted") return "0.5 11";
	return null;
}

/** Ids of the nodes the tip has passed (a node exactly at the tip counts). */
export function reachedIds(
	points: Record<string, StoryThreadPoint>,
	tip: number,
	axis: StoryThreadAxis
): Set<string> {
	const out = new Set<string>();
	for (const id of Object.keys(points)) if (points[id][axis] <= tip) out.add(id);
	return out;
}

/**
 * Path length at which the curve reaches `at` along the axis, interpolated
 * between samples `[length, axisCoordinate]` taken along the path. The curve
 * is assumed to move forward along the axis, which it does when its nodes do.
 */
export function lengthAtAxis(samples: [number, number][], at: number): number {
	if (samples.length === 0) return 0;
	if (at <= samples[0][1]) return samples[0][0];
	const last = samples[samples.length - 1];
	if (at >= last[1]) return last[0];
	let lo = 0;
	let hi = samples.length - 1;
	while (hi - lo > 1) {
		const mid = (lo + hi) >> 1;
		if (samples[mid][1] <= at) lo = mid;
		else hi = mid;
	}
	const [l0, a0] = samples[lo];
	const [l1, a1] = samples[hi];
	return a1 === a0 ? l0 : l0 + ((at - a0) / (a1 - a0)) * (l1 - l0);
}

let instances = 0;

interface DrawnSegment {
	ids: string[];
	span: StoryThreadSpan;
	length: number;
	samples: [number, number][];
	/** The mask path: its dashoffset uncovers the bright stroke. */
	mask: SVGPathElement;
	head: SVGGElement;
	headX: number;
	headY: number;
	shown: boolean;
	drawn: number;
}

/** Nearest ancestor that scrolls vertically, or null for the window. */
function scrollParent(el: HTMLElement): HTMLElement | null {
	let node = el.parentElement;
	while (node && node !== document.body && node !== document.documentElement) {
		const oy = getComputedStyle(node).overflowY;
		if (oy === "auto" || oy === "scroll" || oy === "overlay") return node;
		node = node.parentElement;
	}
	return null;
}

export function createStoryThread(
	root: HTMLElement,
	viewport: HTMLElement,
	track: HTMLElement,
	svg: SVGSVGElement,
	initial: Partial<StoryThreadOptions> = {}
): StoryThreadCore {
	const opts: StoryThreadOptions = {
		layout: STORY_THREAD_DEFAULTS.layout,
		segments: [],
		lead: STORY_THREAD_DEFAULTS.lead,
		tension: STORY_THREAD_DEFAULTS.tension,
		dash: STORY_THREAD_DEFAULTS.dash,
		head: STORY_THREAD_DEFAULTS.head,
		reducedMotion: false,
		...initial,
	};
	const uid = `st${++instances}`;
	const win = root.ownerDocument.defaultView ?? window;
	const scroller = scrollParent(root);
	const query = win.matchMedia ? win.matchMedia(STORY_THREAD_HORIZONTAL_QUERY) : null;

	let axis: StoryThreadAxis = "y";
	let nodes: Record<string, HTMLElement> = {};
	let points: Record<string, StoryThreadPoint> = {};
	let drawn: DrawnSegment[] = [];
	let reached = new Set<string>();
	let primed = false;
	let frame = 0;
	let measureFrame = 0;
	let pan = -1;
	let maxPan = 0;
	let viewW = 0;
	let viewH = 0;
	let trackLength = 0;
	let destroyed = false;

	const horizontal = () =>
		opts.layout === "horizontal" || (opts.layout === "auto" && (query?.matches ?? false));

	/** Visible box of the scroller, in client coordinates. */
	function scrollerBox(): { top: number; height: number; width: number } {
		if (!scroller) return { top: 0, height: win.innerHeight, width: win.innerWidth };
		const r = scroller.getBoundingClientRect();
		return {
			top: r.top + scroller.clientTop,
			height: scroller.clientHeight,
			width: scroller.clientWidth,
		};
	}

	function scrollBy(dy: number, smooth = false): void {
		const behavior: ScrollBehavior = smooth && !opts.reducedMotion ? "smooth" : "auto";
		if (scroller) scroller.scrollBy({ top: dy, behavior });
		else win.scrollBy({ top: dy, behavior });
	}

	function el<K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, string>) {
		const node = root.ownerDocument.createElementNS(SVG_NS, name) as SVGElementTagNameMap[K];
		for (const k of Object.keys(attrs)) node.setAttribute(k, attrs[k]);
		return node;
	}

	function measure(): void {
		measureFrame = 0;
		if (destroyed) return;
		const isH = horizontal();
		axis = isH ? "x" : "y";
		root.dataset.layout = isH ? "horizontal" : "vertical";
		const box = scrollerBox();
		root.style.setProperty("--st-vh", `${box.height}px`);

		// Read the anchors with the track at rest so their offsets are layout ones.
		track.style.transform = "";
		const trackRect = track.getBoundingClientRect();
		const trackW = track.offsetWidth;
		const trackH = track.offsetHeight;
		viewW = isH ? viewport.clientWidth || box.width : box.width;
		viewH = box.height;
		maxPan = isH ? Math.max(0, trackW - viewW) : 0;
		trackLength = trackW;
		root.style.height = isH ? `${spacerHeight(trackW, viewW, viewH)}px` : "";

		nodes = {};
		points = {};
		const order: string[] = [];
		for (const node of Array.from(track.querySelectorAll<HTMLElement>("[data-story-node]"))) {
			const id = node.dataset.storyNode;
			if (!id || nodes[id]) continue;
			const r = node.getBoundingClientRect();
			nodes[id] = node;
			points[id] = {
				x: r.left - trackRect.left + r.width / 2,
				y: r.top - trackRect.top + r.height / 2,
			};
			order.push(id);
		}

		svg.setAttribute("viewBox", `0 0 ${Math.max(1, trackW)} ${Math.max(1, trackH)}`);
		svg.setAttribute("width", String(Math.max(1, trackW)));
		svg.setAttribute("height", String(Math.max(1, trackH)));
		while (svg.firstChild) svg.removeChild(svg.firstChild);
		const defs = el("defs", {});
		svg.appendChild(defs);
		const ghosts = el("g", { class: "st-ghosts" });
		const brights = el("g", { class: "st-brights" });
		const heads = el("g", { class: "st-heads" });
		svg.append(ghosts, brights, heads);
		const dash = dashPattern(opts.dash);

		drawn = resolveSegments(opts.segments, order, points).map((seg, i) => {
			const d = curvePath(seg.points, axis, opts.tension);
			const colour: Record<string, string> = seg.color ? { style: `--st-seg: ${seg.color}` } : {};
			const ghost = el("path", {
				class: "st-ghost",
				d,
				...(dash ? { "stroke-dasharray": dash } : {}),
			});
			const maskId = `${uid}-m${i}`;
			const mask = el("mask", { id: maskId, maskUnits: "userSpaceOnUse" });
			const maskPath = el("path", { class: "st-mask", d });
			mask.appendChild(maskPath);
			defs.appendChild(mask);
			const bright = el("path", {
				class: "st-bright",
				d,
				mask: `url(#${maskId})`,
				...(dash ? { "stroke-dasharray": dash } : {}),
				...colour,
			});
			const glowId = `${uid}-g${i}`;
			const glow = el("radialGradient", { id: glowId, class: "st-glow", ...colour });
			glow.append(
				el("stop", { class: "st-glow-core", offset: "0" }),
				el("stop", { class: "st-glow-edge", offset: "1" })
			);
			defs.appendChild(glow);
			const head = el("g", { class: "st-head", ...colour });
			head.append(
				el("circle", { class: "st-head-glow", r: "18", fill: `url(#${glowId})` }),
				el("circle", { class: "st-head-dot", r: "3.5" })
			);
			ghosts.appendChild(ghost);
			brights.appendChild(bright);
			heads.appendChild(head);

			const length = typeof bright.getTotalLength === "function" ? bright.getTotalLength() : 0;
			const samples: [number, number][] = [];
			if (length > 0 && typeof bright.getPointAtLength === "function") {
				const n = Math.max(2, Math.ceil(length / SAMPLE_STEP));
				let prev = -Infinity;
				for (let k = 0; k <= n; k++) {
					const l = (length * k) / n;
					// Keep the axis coordinate monotonic so the lookup is a search.
					prev = Math.max(prev, bright.getPointAtLength(l)[axis]);
					samples.push([l, prev]);
				}
			}
			maskPath.setAttribute("stroke-dasharray", `${length} ${length + 1}`);
			maskPath.setAttribute("stroke-dashoffset", String(length));
			return {
				ids: seg.ids,
				span: segmentSpan(seg.points, axis),
				length,
				samples,
				mask: maskPath,
				head,
				headX: NaN,
				headY: NaN,
				shown: false,
				drawn: -1,
			};
		});
		pan = -1;
		paint();
	}

	function paint(): void {
		frame = 0;
		if (destroyed) return;
		const box = scrollerBox();
		let tip: number;
		if (axis === "x") {
			const scrolled = box.top - root.getBoundingClientRect().top;
			const next = clampPan(scrolled, maxPan + viewW, viewW);
			if (next !== pan) {
				pan = next;
				track.style.transform = `translate3d(${-pan}px, 0, 0)`;
			}
			tip = panTip(pan, maxPan, viewW, trackLength, opts.lead);
		} else {
			if (track.style.transform) track.style.transform = "";
			const pos = box.top - track.getBoundingClientRect().top;
			tip = tipPosition(pos, viewH, opts.lead);
		}

		for (const seg of drawn) {
			const p = spanProgress(tip, seg.span);
			const len = p >= 1 ? seg.length : p <= 0 ? 0 : lengthAtAxis(seg.samples, tip);
			if (Math.abs(len - seg.drawn) > 0.25) {
				seg.drawn = len;
				seg.mask.setAttribute("stroke-dashoffset", String(seg.length - len));
			}
			const show = opts.head && p > 0 && p < 1 && seg.length > 0;
			if (show !== seg.shown) {
				seg.shown = show;
				seg.head.toggleAttribute("data-visible", show);
			}
			if (show) {
				const pt = seg.mask.getPointAtLength(len);
				if (pt.x !== seg.headX || pt.y !== seg.headY) {
					seg.headX = pt.x;
					seg.headY = pt.y;
					seg.head.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
				}
			}
		}

		const next = reachedIds(points, tip, axis);
		for (const id of Object.keys(nodes)) {
			const was = reached.has(id);
			const now = next.has(id);
			if (was === now && primed) continue;
			nodes[id].toggleAttribute("data-reached", now);
			if (now && !was && primed) opts.onReach?.(id);
		}
		reached = next;
		primed = true;
	}

	function schedulePaint(): void {
		if (!frame && !destroyed) frame = win.requestAnimationFrame(paint);
	}

	function scheduleMeasure(): void {
		if (measureFrame || destroyed) return;
		if (frame) {
			win.cancelAnimationFrame(frame);
			frame = 0;
		}
		measureFrame = win.requestAnimationFrame(measure);
	}

	// Inputs that only make sense while the track runs sideways.
	function onWheel(e: WheelEvent): void {
		if (axis !== "x" || e.ctrlKey) return;
		if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
		const atStart = pan <= 0 && e.deltaX < 0;
		const atEnd = pan >= maxPan && e.deltaX > 0;
		if (atStart || atEnd) return;
		e.preventDefault();
		scrollBy(e.deltaX);
	}

	let drag: { x: number; id: number; moved: boolean } | null = null;
	function onPointerDown(e: PointerEvent): void {
		if (axis !== "x" || e.pointerType !== "mouse" || e.button !== 0) return;
		if ((e.target as Element | null)?.closest?.(NO_DRAG)) return;
		drag = { x: e.clientX, id: e.pointerId, moved: false };
	}
	function onPointerMove(e: PointerEvent): void {
		if (!drag || e.pointerId !== drag.id) return;
		if (e.buttons === 0) return endDrag();
		const dx = e.clientX - drag.x;
		if (!drag.moved && Math.abs(dx) < 3) return;
		if (!drag.moved) {
			drag.moved = true;
			root.dataset.dragging = "";
			root.setPointerCapture?.(e.pointerId);
		}
		drag.x = e.clientX;
		scrollBy(-dx);
	}
	function endDrag(): void {
		if (drag && root.hasPointerCapture?.(drag.id)) root.releasePointerCapture(drag.id);
		drag = null;
		delete root.dataset.dragging;
	}

	function onKeyDown(e: KeyboardEvent): void {
		if (axis !== "x" || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
		if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
		const t = e.target as Element | null;
		if (t?.closest?.("input, textarea, select, [contenteditable]")) return;
		e.preventDefault();
		scrollBy(keyStep(viewW, e.key === "ArrowRight" ? 1 : -1), true);
	}

	// The track is panned by a transform, so the browser cannot scroll a
	// focused element into view on its own: move the reading position to it.
	function onFocusIn(e: FocusEvent): void {
		if (axis !== "x") return;
		const t = e.target as HTMLElement | null;
		if (!t || t === root || t === viewport) return;
		const r = t.getBoundingClientRect();
		const v = viewport.getBoundingClientRect();
		if (r.left >= v.left && r.right <= v.right) return;
		const at = r.left - track.getBoundingClientRect().left;
		const target = clampPan(at - viewW * 0.1, maxPan + viewW, viewW);
		viewport.scrollLeft = 0;
		scrollBy(target - pan);
	}

	const scrollTarget: EventTarget = scroller ?? win;
	scrollTarget.addEventListener("scroll", schedulePaint, { passive: true });
	win.addEventListener("resize", scheduleMeasure);
	root.addEventListener("wheel", onWheel, { passive: false });
	root.addEventListener("pointerdown", onPointerDown);
	root.addEventListener("pointermove", onPointerMove);
	root.addEventListener("pointerup", endDrag);
	root.addEventListener("pointercancel", endDrag);
	root.addEventListener("keydown", onKeyDown);
	root.addEventListener("focusin", onFocusIn);
	query?.addEventListener?.("change", scheduleMeasure);

	const resize = typeof ResizeObserver === "function" ? new ResizeObserver(scheduleMeasure) : null;
	resize?.observe(track);
	if (scroller) resize?.observe(scroller);
	// Content changes re-measure; the <svg> this module redraws does not.
	const mutations =
		typeof MutationObserver === "function"
			? new MutationObserver((records) => {
					if (records.some((r) => !svg.contains(r.target))) scheduleMeasure();
				})
			: null;
	mutations?.observe(track, {
		childList: true,
		subtree: true,
		attributeFilter: ["data-story-node"],
	});
	void root.ownerDocument.fonts?.ready?.then(scheduleMeasure);

	measure();

	return {
		update(next) {
			const geometry =
				(next.layout !== undefined && next.layout !== opts.layout) ||
				(next.tension !== undefined && next.tension !== opts.tension) ||
				(next.dash !== undefined && next.dash !== opts.dash) ||
				(next.segments !== undefined && next.segments !== opts.segments);
			Object.assign(opts, next);
			if (geometry) scheduleMeasure();
			else schedulePaint();
		},
		refresh: scheduleMeasure,
		destroy() {
			destroyed = true;
			if (frame) win.cancelAnimationFrame(frame);
			if (measureFrame) win.cancelAnimationFrame(measureFrame);
			scrollTarget.removeEventListener("scroll", schedulePaint);
			win.removeEventListener("resize", scheduleMeasure);
			root.removeEventListener("wheel", onWheel);
			root.removeEventListener("pointerdown", onPointerDown);
			root.removeEventListener("pointermove", onPointerMove);
			root.removeEventListener("pointerup", endDrag);
			root.removeEventListener("pointercancel", endDrag);
			root.removeEventListener("keydown", onKeyDown);
			root.removeEventListener("focusin", onFocusIn);
			query?.removeEventListener?.("change", scheduleMeasure);
			resize?.disconnect();
			mutations?.disconnect();
			while (svg.firstChild) svg.removeChild(svg.firstChild);
			track.style.transform = "";
			root.style.height = "";
			root.style.removeProperty("--st-vh");
			delete root.dataset.layout;
			delete root.dataset.dragging;
			for (const id of Object.keys(nodes)) nodes[id].removeAttribute("data-reached");
		},
	};
}
