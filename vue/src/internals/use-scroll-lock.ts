import { onBeforeUnmount, onMounted, watch } from "vue";
import { lockScroll } from "./scroll-lock.js";

/**
 * Acquires the scroll lock while mounted and `enabled()` (default true), and
 * releases it on unmount.
 *
 * TIMING RULE FOR CALLERS: pass `() => presence.mounted` — the value that
 * stays true through the WHOLE exit — and NEVER `() => open`. `lockScroll`'s
 * entire reason for existing is release timing: acquiring/releasing keyed on
 * `open` releases the instant `open` flips, leaving the page scrollable
 * under a scrim that is still on screen during its own exit animation.
 *
 * `onBeforeUnmount`, never `onUnmounted`: the DOM is still attached at that
 * point, which is what the Svelte action's `destroy()` guaranteed.
 */
export function useScrollLock(enabled: () => boolean = () => true): void {
	let release: (() => void) | null = null;

	onMounted(() => {
		if (enabled()) release = lockScroll();
	});

	watch(
		enabled,
		(on) => {
			if (on && !release) {
				release = lockScroll();
			} else if (!on && release) {
				release();
				release = null;
			}
		},
		{ flush: "post" },
	);

	onBeforeUnmount(() => {
		release?.();
		release = null;
	});
}
