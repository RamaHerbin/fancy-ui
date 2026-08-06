/**
 * Elapsed-time runes.
 *
 * Every value is derived from the wall clock (`Date.now() - since`) on each
 * tick rather than accumulated tick by tick, so a throttled background tab that
 * fires one interval instead of sixty still reports the true elapsed duration.
 *
 * Nothing is scheduled at import or construction time: timers only exist
 * between `start()` and `stop()`, which keeps these safe to build during SSR.
 * Consumers start them from an effect:
 *
 * ```svelte
 * const elapsed = createElapsed();
 * $effect(() => elapsed.start());
 * ```
 */

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
}

/** Reactive stopwatch: milliseconds since `since`, refreshed every `tickMs`. */
export function createElapsed(opts: ElapsedOptions = {}): ElapsedState {
	const tickMs = opts.tickMs ?? 1000;
	let since = opts.since;
	// A caller-supplied `since` is already in the past, so the first paint shows
	// the real duration instead of zero.
	let ms = $state(since === undefined ? 0 : Math.max(0, Date.now() - since));
	let running = $state(false);
	let timer: ReturnType<typeof setInterval> | undefined;

	function sync() {
		ms = Math.max(0, Date.now() - (since as number));
	}

	function stop() {
		if (timer !== undefined) {
			clearInterval(timer);
			timer = undefined;
		}
		running = false;
	}

	function start(nextSince?: number) {
		stop();
		since = nextSince ?? since ?? Date.now();
		sync();
		running = true;
		timer = setInterval(sync, tickMs);
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
	};
}

export interface NowState {
	readonly value: number;
	/** Start refreshing. Returns the matching stop function. */
	start(): () => void;
	stop(): void;
}

/**
 * A single shared "now" that a whole list can read, so a thread of fifty
 * timestamps costs one interval instead of fifty.
 */
export function createNow(refreshMs = 30_000): NowState {
	let value = $state(Date.now());
	let timer: ReturnType<typeof setInterval> | undefined;

	function stop() {
		if (timer !== undefined) {
			clearInterval(timer);
			timer = undefined;
		}
	}

	function start() {
		stop();
		value = Date.now();
		timer = setInterval(() => {
			value = Date.now();
		}, refreshMs);
		return stop;
	}

	return {
		get value() {
			return value;
		},
		start,
		stop,
	};
}
