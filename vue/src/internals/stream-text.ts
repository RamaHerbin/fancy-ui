/**
 * Text stream
 *
 * The consumer pushes a growing string — the whole text so far, not the delta —
 * and this turns each growth step into a short-lived "fresh" segment so a view
 * can tint what just arrived. After `settleMs` the segment stops being fresh and
 * is merged back into its settled neighbours, so a long stream never accumulates
 * more than a handful of spans.
 *
 * A push that is not a continuation of the current text (a regenerated answer,
 * or chunks arriving out of order) is treated as a replacement: the new text
 * lands already settled, with nothing to animate from.
 *
 * Nothing is scheduled until the first push, so building one during SSR is safe.
 */

import { shallowRef } from "vue";

const DEFAULT_SETTLE_MS = 350;

export interface StreamSegment {
	/** Stable key for a keyed `v-for`; segments keep their id across merges. */
	id: number;
	text: string;
	/** True while the segment is still animating in. */
	fresh: boolean;
}

export interface TextStreamOptions {
	/**
	 * How long a delta stays fresh before it settles, in ms. Pass a getter when
	 * the value can change after construction: it is read once per push, so a
	 * later duration applies to later chunks instead of only to the CSS.
	 */
	settleMs?: number | (() => number);
	/** Set false to skip the animation entirely: every push settles at once. */
	animate?: boolean;
}

export interface TextStream {
	/** The current segments, oldest first. Reactive. */
	readonly segments: StreamSegment[];
	/** The full text pushed so far. Reactive. */
	readonly text: string;
	/** Hand over the whole text so far; the delta is worked out from it. */
	push(fullText: string): void;
	/** Drop everything and start again from `text`, already settled. */
	reset(text?: string): void;
	/**
	 * Settle every currently-fresh segment at once, cancelling their timers.
	 * Not on the Svelte source's surface: it is required of `useTextStream` by
	 * `internals-api.md` §12, so it belongs on the factory that owns `list` and
	 * the timer set rather than being faked from outside.
	 */
	flush(): void;
	/** Cancel pending settle timers. Call from the consumer's teardown. */
	destroy(): void;
}

export function createTextStream(initial = "", opts: TextStreamOptions = {}): TextStream {
	const settleOption = opts.settleMs;
	const settleAt =
		typeof settleOption === "function" ? settleOption : () => settleOption ?? DEFAULT_SETTLE_MS;
	const animate = opts.animate !== false;

	// `list` and `full` are the authoritative copies and are deliberately not
	// reactive: push() reads them but only ever writes the refs below. That
	// keeps push() safe to call from inside a watcher, which would otherwise
	// invalidate itself by reading the same state it writes.
	let list: StreamSegment[] = [];
	let full = "";
	let nextId = 0;
	const timers = new Set<ReturnType<typeof setTimeout>>();

	const view = shallowRef<StreamSegment[]>([]);
	const textView = shallowRef("");

	// Fresh objects on every publish: the keyed each block compares item
	// identity, so reusing them would leave a settled segment rendered as fresh.
	function publish(): void {
		view.value = list.map((s) => ({ ...s }));
		textView.value = full;
	}

	function clearTimers(): void {
		for (const timer of timers) clearTimeout(timer);
		timers.clear();
	}

	/** Fold every run of contiguous settled segments into its first segment. */
	function merge(): void {
		const merged: StreamSegment[] = [];
		for (const seg of list) {
			const last = merged[merged.length - 1];
			if (last && !last.fresh && !seg.fresh) last.text += seg.text;
			else merged.push({ ...seg });
		}
		list = merged;
	}

	function settle(id: number): void {
		const seg = list.find((s) => s.id === id);
		if (!seg) return;
		seg.fresh = false;
		merge();
		publish();
	}

	function reset(text = ""): void {
		clearTimers();
		full = text;
		list = text ? [{ id: nextId++, text, fresh: false }] : [];
		publish();
	}

	function push(fullText: string): void {
		if (fullText === full) return;
		if (!fullText.startsWith(full)) {
			reset(fullText);
			return;
		}

		const seg: StreamSegment = {
			id: nextId++,
			text: fullText.slice(full.length),
			fresh: animate,
		};
		full = fullText;
		list.push(seg);

		if (!animate) {
			merge();
			publish();
			return;
		}

		publish();
		const timer = setTimeout(
			() => {
				timers.delete(timer);
				settle(seg.id);
			},
			Math.max(0, settleAt())
		);
		timers.add(timer);
	}

	/**
	 * Land the whole stream immediately: a consumer that has been told the
	 * response is complete does not want the tail to keep tinting for another
	 * `settleMs`. Cancelling the timers and clearing `fresh` together is what
	 * keeps the two in step — a cleared timer with a still-fresh segment would
	 * leave it tinted for ever.
	 */
	function flush(): void {
		if (timers.size === 0 && !list.some((s) => s.fresh)) return;
		clearTimers();
		for (const seg of list) seg.fresh = false;
		merge();
		publish();
	}

	reset(initial);

	return {
		get segments() {
			return view.value;
		},
		get text() {
			return textView.value;
		},
		push,
		reset,
		flush,
		destroy: clearTimers,
	};
}
