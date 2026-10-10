import { onScopeDispose, watch, type WatchSource } from "vue";
import { dismissable, type DismissableOptions } from "./dismissable.js";

export interface UseDismissableOptions extends DismissableOptions {
	/**
	 * Whether the layer is registered at all. Default true. Composable-level
	 * only — the Svelte source has no such option because an `{#if}` unmounts
	 * the action instead of toggling it.
	 */
	enabled?: boolean;
}

/**
 * Vue counterpart of `use:dismissable`. `active` and `exclude` stay GETTERS
 * (D-V14 / C-2) and are never watched: the core calls them at event time,
 * which is the whole point of the design and the reason a layer that has
 * started closing still answers a stray Escape correctly.
 */
export function useDismissable(
	el: WatchSource<HTMLElement | null>,
	options: () => UseDismissableOptions,
): void {
	let handle: { update?(o: DismissableOptions): void; destroy?(): void } | undefined;

	watch(
		[el, () => options().enabled ?? true] as const,
		([node, isEnabled]) => {
			handle?.destroy?.();
			handle = undefined;
			if (node && isEnabled) {
				handle = dismissable(node, options()) ?? undefined;
			}
		},
		{ flush: "post" },
	);

	// Keyed on the three fields the core actually stores as locals and
	// mutates in `update()`. `handle.update()` still takes the FULL options
	// object — the core replaces `exclude`/`active` wholesale too — but the
	// watcher only needs to fire when one of these three changes.
	watch(
		[() => options().onDismiss, () => options().escape, () => options().outsideClick],
		() => {
			handle?.update?.(options());
		},
		{ flush: "post" },
	);

	onScopeDispose(() => {
		handle?.destroy?.();
		handle = undefined;
	});
}
