/**
 * Elapsed-time state.
 *
 * Every value is derived from the wall clock (`Date.now() - since`) on each
 * tick rather than accumulated tick by tick, so a throttled background tab that
 * fires one interval instead of sixty still reports the true elapsed duration.
 *
 * Nothing is scheduled at import or construction time, and neither factory
 * reads the wall clock there either: timers and `Date.now()` alike only exist
 * between `start()` and `stop()`, which keeps these safe to build during SSR
 * and during the hydration render. Consumers start them from an effect —
 * `useElapsed`/`useNow` in `use-elapsed.ts` do this from `onMounted`.
 */

import { ref } from "vue";

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
	/**
	 * Milliseconds since `since`. `NaN` until `start()` runs when `since` was
	 * supplied at construction (D-V20); `0` until then when it was not.
	 */
	readonly ms: number;
	/** `formatElapsed(ms)`, or `""` while `ms` is the pre-start sentinel. */
	readonly text: string;
	readonly running: boolean;
	/** Start (or restart) ticking. Returns the matching stop function. */
	start(since?: number): () => void;
	stop(): void;
}

/**
 * Reactive stopwatch: milliseconds since `since`, refreshed every `tickMs`.
 *
 * D-V20 (same rule, second site): a caller-supplied `since` is already in the
 * past, and the source seeds `Date.now() - since` so the first paint shows the
 * real duration. Here the constructor runs inside `setup()` — on the server
 * render AND again on the hydration render — so that seed would be a
 * `Date.now()` on a render path (C-7) emitting a duration ("1m 05s") the other
 * side of hydration cannot reproduce, and production hydration does not repair
 * text. The seed is therefore the `NaN` sentinel, exactly as `createNow` does
 * it, and `text` renders a non-finite `ms` as `""` so the pre-start value
 * paints as nothing rather than as a wrong duration. `start()` — which
 * `useElapsed` calls from `onMounted`, never from a render path — takes the
 * first real reading and fills it in before the first paint after mount.
 *
 * Without `since` there is nothing to measure yet and no clock to read, so the
 * seed stays the source's `0`/`"0s"`: identical on both sides of hydration.
 */
export function createElapsed(opts: ElapsedOptions = {}): ElapsedState {
	const tickMs = opts.tickMs ?? 1000;
	let since = opts.since;
	const ms = ref(since === undefined ? 0 : Number.NaN);
	const running = ref(false);
	let timer: ReturnType<typeof setInterval> | undefined;

	function sync() {
		ms.value = Math.max(0, Date.now() - (since as number));
	}

	function stop() {
		if (timer !== undefined) {
			clearInterval(timer);
			timer = undefined;
		}
		running.value = false;
	}

	function start(nextSince?: number) {
		stop();
		since = nextSince ?? since ?? Date.now();
		sync();
		running.value = true;
		timer = setInterval(sync, tickMs);
		return stop;
	}

	return {
		get ms() {
			return ms.value;
		},
		get text() {
			// `formatElapsed` stays verbatim and collapses non-finite input to "0s";
			// the sentinel has to read as "not known yet", so it is caught here.
			return Number.isFinite(ms.value) ? formatElapsed(ms.value) : "";
		},
		get running() {
			return running.value;
		},
		start,
		stop,
	};
}

export interface NowState {
	/** Epoch ms, refreshed every `refreshMs`. `NaN` until `start()` runs (D-V20). */
	readonly value: number;
	/** Start refreshing. Returns the matching stop function. */
	start(): () => void;
	stop(): void;
}

/**
 * A single shared "now" that a whole list can read, so a thread of fifty
 * timestamps costs one interval instead of fifty.
 *
 * D-V20: the seed is the `NaN` sentinel, not `Date.now()`, and it holds
 * everywhere the clock has not started yet — the server render, the hydration
 * render, and a fresh client tree alike. Seeding a real timestamp would put a
 * label on screen that the other side of hydration cannot reproduce, and
 * production hydration does not repair it; reading the clock at construction
 * time would also be a `Date.now()` on a render path, which is forbidden
 * outright. `formatRelativeTime` renders a non-finite `now` as `""`, so the
 * pre-start value paints as nothing rather than as a wrong duration, and
 * `start()` fills in the real timestamp before the first paint after mount.
 */
export function createNow(refreshMs = 30_000): NowState {
	const value = ref(Number.NaN);
	let timer: ReturnType<typeof setInterval> | undefined;

	function stop() {
		if (timer !== undefined) {
			clearInterval(timer);
			timer = undefined;
		}
	}

	function start() {
		stop();
		value.value = Date.now();
		timer = setInterval(() => {
			value.value = Date.now();
		}, refreshMs);
		return stop;
	}

	return {
		get value() {
			return value.value;
		},
		start,
		stop,
	};
}
