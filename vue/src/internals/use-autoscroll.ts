// Vue binding for the `autoscroll` core in `autoscroll.ts`.
//
// "Stuck" is a pure function of the distance from the bottom, recomputed on
// every scroll event. There is no programmatic-scroll flag to get out of
// sync: whatever the scrollbar says is the truth. It stays a closure
// variable inside the core — never Vue state — for exactly that reason.
//
// Usage:
//   const el = useTemplateRef<HTMLDivElement>("scroller");
//   useAutoscroll(el, () => ({ pinOnConnect: true, onStickChange: (s) => (stuck.value = s) }));

import { onScopeDispose, watch, type WatchSource } from "vue";
import { autoscroll } from "./autoscroll.js";
import type { AutoscrollOptions } from "./autoscroll.js";

type AutoscrollHandle = { update(options: AutoscrollOptions): void; destroy(): void };

/**
 * Keeps `node` pinned to its bottom edge while content streams in. Mounts
 * and destroys the core in a post-flush watcher — `pinOnConnect`'s jump
 * writes `scrollTop`, and a post-paint write is a visible jump — and
 * re-syncs whenever an option that changes the pinning rules changes.
 */
export function useAutoscroll(
	el: WatchSource<HTMLElement | null>,
	options: () => AutoscrollOptions = () => ({})
): void {
	let handle: AutoscrollHandle | null = null;

	// `immediate` is present so a source that is already non-null in setup
	// still arms; the body returns early on `null`, which is what every
	// template ref and every server render hands it.
	watch(
		el,
		(node, _prev, onCleanup) => {
			if (!node) return;
			const h = autoscroll(node, options());
			handle = (h ?? {}) as AutoscrollHandle;
			onCleanup(() => {
				handle?.destroy();
				handle = null;
			});
		},
		{ flush: "post", immediate: true }
	);

	watch(
		[() => options().enabled, () => options().bottomThreshold],
		() => {
			handle?.update(options());
		},
		{ flush: "post" }
	);

	onScopeDispose(() => {
		handle?.destroy();
		handle = null;
	});
}
