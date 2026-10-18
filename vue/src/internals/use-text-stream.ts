// Vue binding for the `createTextStream` state in `stream-text.ts`. The
// factory owns the segments and the settle timers; this file owns nothing but
// pushing the growing text in from a reactive source and disposing the
// pending timers when the owning scope ends.

import { onScopeDispose } from "vue";
import { createTextStream } from "./stream-text.js";
import type { StreamSegment, TextStreamOptions } from "./stream-text.js";

export interface UseTextStreamOptions extends TextStreamOptions {}

/**
 * What `useTextStream` hands back — the surface `internals-api.md` §12
 * specifies: `{ text, segments, push, flush, reset, done }`. `destroy()` is
 * absent because the composable owns it (D-V12); calling it from outside
 * would leave the last delta rendered as permanently fresh.
 */
export interface UseTextStream {
	/** The full text pushed so far. Reactive. */
	readonly text: string;
	/** The current segments, oldest first. Reactive. */
	readonly segments: StreamSegment[];
	/** Hand over the whole text so far; the delta is worked out from it. */
	push(fullText: string): void;
	/** Settle every currently-fresh segment at once, cancelling their timers. */
	flush(): void;
	/** Drop everything and start again from `text`, already settled. */
	reset(text?: string): void;
	/** True once nothing in `segments` is still animating in. Reactive. */
	readonly done: boolean;
}

/**
 * `createTextStream`, built once from the initial text (already settled) and
 * disposed when the owning scope ends. Push subsequent growth with `push()`
 * yourself — `StreamText.vue` does this from a `flush: 'post'` watcher over
 * its `text` prop.
 *
 * `flush()` and `done` are not on the Svelte factory's surface; §12 requires
 * them here, and the React counterpart implements the same pair, so a
 * consumer told "the response is complete" can land the tail at once and a
 * caller can tell when the last chunk has finished animating. `done` is a
 * getter over the published segments rather than a stored flag, so it tracks
 * every settle without a second source of truth. React's extra `resume()` is
 * deliberately not ported: it exists only to survive StrictMode replaying an
 * effect around a live stream, which has no Vue equivalent.
 */
export function useTextStream(initial = "", opts: UseTextStreamOptions = {}): UseTextStream {
	const stream = createTextStream(initial, opts);
	onScopeDispose(() => stream.destroy());
	return {
		get segments() {
			return stream.segments;
		},
		get text() {
			return stream.text;
		},
		get done() {
			return !stream.segments.some((s) => s.fresh);
		},
		push: stream.push,
		flush: stream.flush,
		reset: stream.reset,
	};
}
