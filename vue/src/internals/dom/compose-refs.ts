import type { Ref } from "vue";

/** What Vue passes to a function `ref`: the element, the exposed instance, or null. */
export type ComposableRefTarget = Element | { $el?: unknown } | null;

/** Anything that can sit in a template's `ref` attribute: a callback ref or a plain ref sink. */
export type RefLike<T> = ((el: T | null) => void) | Ref<T | null> | undefined | null;

/**
 * Merges any number of ref sinks into ONE function ref, and adapts Vue's loose
 * `ref` callback signature (`Element | ComponentPublicInstance | null`) to the
 * `(node: HTMLElement | null) => void` shape the framework-free cores use.
 * Skips nullish entries.
 *
 * Call it ONCE in `setup`. Its identity must not change between renders, or Vue
 * detaches and reattaches the node on every patch — which, for a node carrying a
 * presence leg, throws the in-flight animation away.
 */
export function composeRefs<T extends HTMLElement>(
	...refs: Array<RefLike<T>>
): (el: ComposableRefTarget) => void {
	return (el) => {
		const node = el as T | null;
		for (const ref of refs) {
			if (ref == null) continue;
			if (typeof ref === "function") {
				ref(node);
			} else {
				ref.value = node;
			}
		}
	};
}
