/**
 * Copy-to-clipboard state.
 *
 * Wraps the async clipboard write in a `copied` flag that falls back to
 * `false` on its own, so a button can show a transient "Copied!" label
 * without owning a timer. Nothing is scheduled at construction, and the
 * clipboard API is only touched inside `copy()`, which keeps `createCopy`
 * safe to call during a render.
 */

import { useEffect, useSyncExternalStore } from "react";
import { useConstant } from "./dom/ssr.js";

export interface CopyState {
	/** True from a successful copy until `resetMs` has elapsed. */
	readonly copied: boolean;
	/** Writes `text` to the clipboard. Resolves false instead of throwing. */
	copy(text: string): Promise<boolean>;
	/** Cancels a pending reset. Call from the consumer's teardown. */
	destroy(): void;
	/**
	 * Undoes a `destroy()`, so the instance accepts copies again.
	 *
	 * Not part of the Svelte source's surface, and needed for the same
	 * reason `subscribe` is: Svelte runs a teardown exactly once, at the end
	 * of the owner's life, so `destroyed` there is a one-way latch. React
	 * runs the whole mount/teardown/mount rehearsal in development
	 * StrictMode, which latches `destroyed` on an instance that is about to
	 * be used for real — after which `copy()` returns early forever and
	 * `copied` never flips. `useCopy` pairs `arm()` with `destroy()` in one
	 * effect so the rehearsal is a no-op; a pure-factory consumer that calls
	 * `destroy()` once never touches this.
	 */
	arm(): void;
	/**
	 * Subscribe to every change of `copied`. Not part of the Svelte source's
	 * surface — the React counterpart of the `$state` rune that made `copied`
	 * reactive there; `useCopy` is what actually reads this.
	 */
	subscribe(listener: () => void): () => void;
}

export function createCopy(resetMs = 2000): CopyState {
	let copied = false;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let destroyed = false;
	// A permission prompt can hold a write open for as long as the reader
	// takes to answer it, which is long enough to unmount the owner or start
	// another copy.
	let ticket = 0;
	const listeners = new Set<() => void>();

	function notify(): void {
		for (const listener of listeners) listener();
	}

	function clearTimer(): void {
		if (timer !== undefined) {
			clearTimeout(timer);
			timer = undefined;
		}
	}

	return {
		get copied() {
			return copied;
		},

		async copy(text: string): Promise<boolean> {
			if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return false;
			const mine = ++ticket;
			try {
				await navigator.clipboard.writeText(text);
			} catch {
				// Denied permission, insecure context, or a user-agent that
				// rejects writes outside a user gesture.
				return false;
			}
			// The write landed, so the caller is told so either way; it just no
			// longer owns the flag. Writing it here would either resurrect
			// state on a destroyed helper or arm a timer teardown can no
			// longer cancel.
			if (destroyed || mine !== ticket) return true;
			copied = true;
			notify();
			// A re-copy restarts the window rather than inheriting the old
			// deadline.
			clearTimer();
			timer = setTimeout(() => {
				copied = false;
				timer = undefined;
				notify();
			}, resetMs);
			return true;
		},

		destroy() {
			destroyed = true;
			clearTimer();
		},

		arm() {
			destroyed = false;
		},

		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

// =============================================================================
// Hook
// =============================================================================

export interface UseCopyResult {
	readonly copied: boolean;
	copy(text: string): Promise<boolean>;
}

/**
 * `copied` flips true on a successful `copy()` and resets after `resetMs`.
 * Built once per component instance; `destroy()` — the direct analogue of
 * the source's "call from the consumer's teardown" — runs in the hook's own
 * cleanup, so it can never be forgotten (D-5).
 *
 * The effect arms the instance on the way in and destroys it on the way out,
 * as one pair. StrictMode's mount/teardown/mount rehearsal therefore leaves
 * a live, usable instance behind instead of a permanently destroyed one; a
 * real unmount still ends on `destroy()`, since nothing arms it again.
 */
export function useCopy(resetMs = 2000): UseCopyResult {
	const state = useConstant(() => createCopy(resetMs));
	const copied = useSyncExternalStore(state.subscribe, () => state.copied, () => state.copied);

	useEffect(() => {
		state.arm();
		return state.destroy;
	}, [state]);

	return { copied, copy: state.copy };
}
