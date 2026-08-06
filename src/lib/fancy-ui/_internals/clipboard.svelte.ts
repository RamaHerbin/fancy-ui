/**
 * Copy-to-clipboard state helper.
 *
 * Wraps the async clipboard write in a `$state`-backed `copied` flag that falls
 * back to `false` on its own, so a button can show a transient "Copied!" label
 * without owning a timer. Nothing is scheduled at construction, and the
 * clipboard API is only touched inside `copy()`, which keeps the factory safe
 * to call during SSR.
 */

export interface CopyState {
	/** True from a successful copy until `resetMs` has elapsed. */
	readonly copied: boolean;
	/** Writes `text` to the clipboard. Resolves false instead of throwing. */
	copy(text: string): Promise<boolean>;
	/** Cancels a pending reset. Call from the consumer's teardown. */
	destroy(): void;
}

export function createCopy(resetMs = 2000): CopyState {
	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	function clearTimer() {
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
			try {
				await navigator.clipboard.writeText(text);
			} catch {
				// Denied permission, insecure context, or a user-agent that rejects
				// writes outside a user gesture.
				return false;
			}
			copied = true;
			// A re-copy restarts the window rather than inheriting the old deadline.
			clearTimer();
			timer = setTimeout(() => {
				copied = false;
				timer = undefined;
			}, resetMs);
			return true;
		},

		destroy() {
			clearTimer();
		},
	};
}
