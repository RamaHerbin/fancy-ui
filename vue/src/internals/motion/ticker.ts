/**
 * Shared frame ticker — one requestAnimationFrame loop for every ambient effect.
 *
 * Each subscriber hands in a frame callback and, optionally, the element it
 * animates. The ticker parks a subscriber while that element is out of view,
 * while the document is hidden, or while the caller paused it, and stops the
 * underlying frame request altogether when nobody is live. N effects on a page
 * therefore cost one callback per frame, and an idle page costs none.
 *
 * Out of scope on purpose: reduced motion, pixel ratio and resize handling stay
 * with the caller.
 *
 * Nothing here touches `window` or `document` at module evaluation time — safe
 * under SSR. Globals are read inside functions, behind `typeof` guards.
 */

export interface TickerOptions {
	/** Observed element: the subscriber is parked while it is out of view. No el = no IO gate (fixed full-viewport effects). */
	el?: Element;
	/** dt in seconds (clamped to MAX_DT = 0.064, 0 on the first frame and on every resume), now = rAF timestamp. */
	onFrame(dt: number, now: number): void;
	/** Optional throttle, e.g. 30 for pulse-beam. Default: every frame. */
	fps?: number;
	/** IO rootMargin. Default "256px". */
	rootMargin?: string;
}

export interface TickerSubscription {
	setPaused(paused: boolean): void;
	readonly paused: boolean;
	unsubscribe(): void;
}

interface Entry {
	onFrame: (dt: number, now: number) => void;
	minDelta: number;
	paused: boolean;
	offscreen: boolean;
	lastRun: number;
	lastNow: number | undefined;
	io: IntersectionObserver | null;
}

const MAX_DT = 0.064;
const DEFAULT_ROOT_MARGIN = "256px";

const entries = new Set<Entry>();
let rafId: number | null = null;
let listening = false;

function docHidden(): boolean {
	return typeof document !== "undefined" && document.hidden === true;
}

function live(e: Entry): boolean {
	return !e.paused && !e.offscreen && !docHidden();
}

function tick(now: number) {
	let liveCount = 0;
	for (const e of entries) if (live(e)) liveCount++;
	if (liveCount === 0) {
		rafId = null;
		return;
	}
	rafId = requestAnimationFrame(tick);
	for (const e of entries) {
		// A callback earlier in this pass may have parked or removed this entry.
		if (!entries.has(e) || !live(e)) continue;
		if (now - e.lastRun < e.minDelta) continue;
		const dt = e.lastNow === undefined ? 0 : Math.min((now - e.lastNow) / 1000, MAX_DT);
		e.lastRun = now;
		e.lastNow = now;
		e.onFrame(dt, now);
	}
}

function ensureRunning() {
	if (rafId !== null) return;
	if (typeof requestAnimationFrame !== "function") return;
	if (entries.size === 0 || docHidden()) return;
	rafId = requestAnimationFrame(tick);
}

function stop() {
	if (rafId !== null && typeof cancelAnimationFrame === "function") cancelAnimationFrame(rafId);
	rafId = null;
}

function onVisibility() {
	for (const e of entries) e.lastNow = undefined;
	if (docHidden()) stop();
	else ensureRunning();
}

function addListener() {
	if (listening || typeof document === "undefined") return;
	document.addEventListener("visibilitychange", onVisibility);
	listening = true;
}

function removeListener() {
	if (!listening) return;
	if (typeof document !== "undefined")
		document.removeEventListener("visibilitychange", onVisibility);
	listening = false;
}

const INERT: TickerSubscription = {
	setPaused() {},
	get paused() {
		return true;
	},
	unsubscribe() {},
};

/** Subscribe a frame callback. Returns an inert handle where there is no rAF (SSR). */
export function subscribe(opts: TickerOptions): TickerSubscription {
	if (typeof requestAnimationFrame !== "function") return INERT;

	const entry: Entry = {
		onFrame: opts.onFrame,
		minDelta: opts.fps && opts.fps > 0 ? 1000 / opts.fps - 2 : 0,
		paused: false,
		offscreen: false,
		lastRun: -Infinity,
		lastNow: undefined,
		io: null,
	};
	entries.add(entry);
	addListener();

	if (opts.el && typeof IntersectionObserver !== "undefined") {
		const io = new IntersectionObserver(
			(records) => {
				const last = records[records.length - 1];
				if (!last) return;
				const offscreen = !last.isIntersecting;
				if (offscreen === entry.offscreen) return;
				entry.offscreen = offscreen;
				if (offscreen) entry.lastNow = undefined;
				else ensureRunning();
			},
			{ rootMargin: opts.rootMargin ?? DEFAULT_ROOT_MARGIN, threshold: 0 }
		);
		io.observe(opts.el);
		entry.io = io;
	}

	ensureRunning();

	return {
		setPaused(paused) {
			if (!entries.has(entry) || entry.paused === paused) return;
			entry.paused = paused;
			if (paused) entry.lastNow = undefined;
			else ensureRunning();
		},
		get paused() {
			return entry.paused;
		},
		unsubscribe() {
			if (!entries.delete(entry)) return;
			entry.io?.disconnect();
			entry.io = null;
			if (entries.size === 0) {
				stop();
				removeListener();
			}
		},
	};
}

/** Test hook: number of live subscriptions. */
export function tickerSubscriberCount(): number {
	return entries.size;
}

/** Test hook: drop every subscriber and the frame request. */
export function resetTickerForTests(): void {
	for (const e of entries) e.io?.disconnect();
	entries.clear();
	stop();
	removeListener();
}
