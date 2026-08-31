/**
 * Elapsed-time state.
 *
 * Every value is derived from the wall clock (`Date.now() - since`) on each
 * tick rather than accumulated tick by tick, so a throttled background tab
 * that fires one interval instead of sixty still reports the true elapsed
 * duration.
 *
 * Nothing is scheduled at construction time: timers only exist between
 * `start()` and `stop()`, which keeps `createElapsed`/`createNow` safe to
 * build during a render. Consumers start them from an effect — `useElapsed`
 * and `useNow` do this for you.
 */

import { useEffect, useReducer, useRef, useSyncExternalStore } from "react";
import { useConstant, useIsomorphicLayoutEffect } from "./dom/ssr.js";

const MINUTE = 60_000;
const HOUR = 3_600_000;

function pad(value: number): string {
	return value < 10 ? `0${value}` : String(value);
}

/**
 * Format a duration in milliseconds as a compact stopwatch string:
 * `"0s"`, `"42s"`, `"1m 05s"`, `"1h 03m"`. Negative and non-finite input
 * collapses to `"0s"`.
 */
export function formatElapsed(ms: number): string {
	if (!Number.isFinite(ms) || ms <= 0) return "0s";
	const seconds = Math.floor(ms / 1000);
	if (ms < MINUTE) return `${seconds}s`;
	if (ms < HOUR) return `${Math.floor(ms / MINUTE)}m ${pad(seconds % 60)}s`;
	return `${Math.floor(ms / HOUR)}h ${pad(Math.floor((ms % HOUR) / MINUTE))}m`;
}

export interface ElapsedOptions {
	/** Epoch ms the duration is measured from. Defaults to the moment `start()` runs. */
	since?: number;
	/** How often the reported value refreshes. Defaults to 1000. */
	tickMs?: number;
}

export interface ElapsedState {
	readonly ms: number;
	readonly text: string;
	readonly running: boolean;
	/** Start (or restart) ticking. Returns the matching stop function. */
	start(since?: number): () => void;
	stop(): void;
	/**
	 * Subscribe to every change of `ms`/`running`. Not part of the Svelte
	 * source's surface — the React counterpart of the `$state` runes that
	 * made `ms`/`running` reactive there; `useElapsed` is what actually reads
	 * this. Pure factory consumers never need it.
	 */
	subscribe(listener: () => void): () => void;
}

/** Reactive stopwatch: milliseconds since `since`, refreshed every `tickMs`. */
export function createElapsed(opts: ElapsedOptions = {}): ElapsedState {
	const tickMs = opts.tickMs ?? 1000;
	let since = opts.since;
	// A caller-supplied `since` is already in the past, so the first paint
	// shows the real duration instead of zero.
	let ms = since === undefined ? 0 : Math.max(0, Date.now() - since);
	let running = false;
	let timer: ReturnType<typeof setInterval> | undefined;
	const listeners = new Set<() => void>();

	function notify(): void {
		for (const listener of listeners) listener();
	}

	function sync(): void {
		ms = Math.max(0, Date.now() - (since as number));
		notify();
	}

	function stop(): void {
		if (timer !== undefined) {
			clearInterval(timer);
			timer = undefined;
		}
		if (running) {
			running = false;
			notify();
		}
	}

	function start(nextSince?: number): () => void {
		stop();
		since = nextSince ?? since ?? Date.now();
		sync();
		running = true;
		timer = setInterval(sync, tickMs);
		notify();
		return stop;
	}

	return {
		get ms() {
			return ms;
		},
		get text() {
			return formatElapsed(ms);
		},
		get running() {
			return running;
		},
		start,
		stop,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

export interface NowState {
	readonly value: number;
	/** Start refreshing. Returns the matching stop function. */
	start(): () => void;
	stop(): void;
	/** Subscribe to every refresh. See `ElapsedState.subscribe`. */
	subscribe(listener: () => void): () => void;
}

/**
 * A single shared "now" that a whole list can read, so a thread of fifty
 * timestamps costs one interval instead of fifty.
 */
export function createNow(refreshMs = 30_000): NowState {
	let value = Date.now();
	let timer: ReturnType<typeof setInterval> | undefined;
	const listeners = new Set<() => void>();

	function notify(): void {
		for (const listener of listeners) listener();
	}

	function stop(): void {
		if (timer !== undefined) {
			clearInterval(timer);
			timer = undefined;
		}
	}

	function start(): () => void {
		stop();
		value = Date.now();
		timer = setInterval(() => {
			value = Date.now();
			notify();
		}, refreshMs);
		return stop;
	}

	return {
		get value() {
			return value;
		},
		start,
		stop,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

// =============================================================================
// Hooks
// =============================================================================

export interface UseElapsedResult {
	readonly ms: number;
	readonly text: string;
	readonly running: boolean;
	start(since?: number): () => void;
	stop(): void;
}

/**
 * `useElapsed`'s server snapshot, and therefore also the value React reads
 * during the hydration render: a flat zero, which `formatElapsed` renders as
 * `"0s"`.
 *
 * `createElapsed` seeds itself from the wall clock when `since` is given —
 * "a caller-supplied `since` is already in the past, so the first paint shows
 * the real duration instead of zero". On the server that seed is the
 * SERVER's clock, and the hydration render on the client re-runs the same
 * factory against the CLIENT's clock some hundreds of milliseconds later, so
 * the two renders disagree by exactly the transport time and React reports a
 * hydration mismatch on every stopwatch on the page (§7: nothing may differ
 * between a server render and its hydration).
 *
 * Zero is the one value both sides are guaranteed to produce, and it is the
 * value `createElapsed` itself starts at with no `since` at all — so the
 * server HTML ships the honest "not yet counting" label rather than one
 * measured against a clock the client cannot reproduce. This is the same
 * trade `useNow` makes below, with `0` in place of `NaN` because `ms` is
 * documented as a number consumers may do arithmetic with, and because
 * `formatElapsed` collapses both to `"0s"` anyway.
 *
 * DIVERGENCE from Svelte, whose SSR pass ships the server-measured duration.
 */
function getServerElapsed(): number {
	return 0;
}

/**
 * Reactive stopwatch. Built once (`ElapsedOptions` is read only at mount,
 * matching the Svelte source's `createElapsed(opts)` call site — a changed
 * `tickMs`/`since` prop does not retarget a running timer) and subscribed
 * through `useSyncExternalStore`; `text` is derived per render from `ms`,
 * exactly as the source's getter does. Nothing is scheduled by the hook
 * itself — call the returned `start()` from your own effect or handler,
 * same as the Svelte side.
 *
 * A client-only render reads the live value straight away, exactly as
 * before; only a hydration render takes the deterministic seed, and the
 * layout effect below replaces it before the first paint.
 */
export function useElapsed(options: ElapsedOptions = {}): UseElapsedResult {
	const elapsed = useConstant(() => createElapsed(options));
	const ms = useSyncExternalStore(elapsed.subscribe, () => elapsed.ms, getServerElapsed);
	const running = useSyncExternalStore(
		elapsed.subscribe,
		() => elapsed.running,
		// Deterministic on both sides for a different reason: nothing has
		// started the stopwatch by the time the first render runs, so the
		// store's own value is `false` here too.
		() => false
	);

	const rendered = useRef(ms);
	rendered.current = ms;
	const [, bump] = useReducer(bumpReducer, 0);

	useIsomorphicLayoutEffect(() => {
		// React only notices that an external store disagrees with its server
		// snapshot in the passive phase, which is a phase too late: the
		// browser would paint one frame of "0s" over a stopwatch that already
		// knows its real duration. Re-rendering here, in the layout phase,
		// closes that frame. Only a hydrated tree can ever see the gap — a
		// client-only render read the live value to begin with, so the
		// comparison is false and nothing is scheduled.
		if (elapsed.ms !== rendered.current) bump();
	}, [elapsed, bump]);

	useEffect(() => elapsed.stop, [elapsed]);

	return { ms, text: formatElapsed(ms), running, start: elapsed.start, stop: elapsed.stop };
}

/**
 * The one shared clock behind `useNow`.
 *
 * Its listener set and its published value outlive any individual `createNow`
 * instance. That separation is the whole point: a retain count that reaches
 * zero and climbs back to one — which is exactly what StrictMode's
 * mount/teardown/mount rehearsal does — swaps the underlying interval without
 * ever stranding a subscriber on a dead instance, and no consumer holds a
 * reference to an instance that can go stale.
 *
 * Nothing here is touched from a render path: `retain()` is called only from
 * a layout effect and `subscribe()` only from React's own store
 * subscription, so no `Date.now()` and no module-state write happens while
 * rendering (C-7).
 */
const sharedClock = (() => {
	const listeners = new Set<() => void>();
	let clock: NowState | null = null;
	let stopClock: (() => void) | null = null;
	let retained = 0;
	/*
	 * Seeded to `NaN` — the documented "no clock yet" sentinel — never to
	 * `Date.now()`: sampling the wall clock here would be a `Date.now()` read
	 * on a render path (C-7), and a server render could never agree with the
	 * hydration render that follows it. `NaN` is the one value both renders
	 * are guaranteed to produce, `Object.is(NaN, NaN)` is true so
	 * `useSyncExternalStore` sees a stable snapshot, and
	 * `formatRelativeTime` renders a non-finite `now` as the empty string —
	 * so a pre-clock render emits no label rather than the "in 57 years" a
	 * seed of 0 produces for every present-day timestamp. The first retain
	 * replaces it with a real timestamp in the layout phase, before the first
	 * paint.
	 */
	let value = Number.NaN;

	function publish(): void {
		if (clock) value = clock.value;
		for (const listener of listeners) listener();
	}

	return {
		getValue(): number {
			return value;
		},

		subscribe(listener: () => void): () => void {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},

		/**
		 * Keep the interval running for as long as the returned release is
		 * uncalled. Each release is idempotent and belongs to exactly one
		 * retain, so however React interleaves mounts, remounts and
		 * rehearsals, the count cannot drift.
		 */
		retain(refreshMs: number): () => void {
			retained += 1;
			if (retained === 1) {
				// The first consumer to arrive owns the cadence; later ones
				// share the interval already running rather than starting a
				// second.
				clock = createNow(refreshMs);
				clock.subscribe(publish);
				stopClock = clock.start();
				publish();
			}
			let released = false;
			return () => {
				if (released) return;
				released = true;
				retained -= 1;
				if (retained === 0) {
					stopClock?.();
					stopClock = null;
					clock = null;
				}
			};
		},
	};
})();

/**
 * `useNow`'s server snapshot, and therefore also the value React reads
 * during hydration: the `NaN` sentinel, so the two renders cannot disagree.
 * The real clock arrives in the first commit after hydration.
 *
 * DIVERGENCE from Svelte, registered in `migration-matrix.json` and the
 * README: `createNow` seeds itself with `Date.now()` at construction, so a
 * Svelte server render ships real relative labels. React cannot — the client
 * has no way to reproduce the server's timestamp, so any real value here is
 * a hydration mismatch. The sentinel makes the server HTML carry an empty
 * label instead of a wrong one; every consumer fills it in during the layout
 * phase of hydration, before the first paint.
 */
function getServerNow(): number {
	return Number.NaN;
}

function bumpReducer(n: number): number {
	return n + 1;
}

/**
 * A shared "now", refreshed every `refreshMs` (30s by default) and reused by
 * every `useNow` call in the tree — the React-native form of `createNow`'s
 * whole reason for existing: a thread of fifty timestamps shares one
 * interval instead of paying for fifty. The refresh cadence is set by
 * whichever consumer mounts first; a later `useNow` with a different
 * `refreshMs` shares the interval already running rather than starting a
 * second one. The interval stops once the last consumer unmounts.
 *
 * Before the first consumer anywhere on the page has mounted, the clock has
 * no value to give and the hook returns `NaN` — the sentinel a server render
 * and the hydration render that follows it are guaranteed to agree on, and
 * the one `formatRelativeTime` turns into an empty label rather than a wrong
 * one. Callers must therefore either pass the value straight to
 * `formatRelativeTime` (which guards it) or check `Number.isFinite` before
 * doing arithmetic with it. Every later consumer, including one that mounts
 * after the clock has been torn down and rebuilt, renders a real timestamp
 * immediately.
 */
export function useNow(refreshMs = 30_000): number {
	const value = useSyncExternalStore(sharedClock.subscribe, sharedClock.getValue, getServerNow);
	const rendered = useRef(value);
	rendered.current = value;
	const [, bump] = useReducer(bumpReducer, 0);

	useIsomorphicLayoutEffect(() => {
		const release = sharedClock.retain(refreshMs);
		// React subscribes to an external store in the passive phase, which
		// is a phase too late: the browser would paint one frame of the
		// pre-clock sentinel before the clock this effect just started is heard
		// from. Re-rendering here, in the layout phase, closes that frame.
		// Only the first consumer on a page can ever see the gap — from then
		// on the clock's last value survives its interval.
		if (sharedClock.getValue() !== rendered.current) bump();
		return release;
	}, [refreshMs, bump]);

	return value;
}
