// Vue binding for the `float` core in `float.ts` — the older sibling of
// `anchor-position.ts`/`use-anchor-position.ts`, shaped exactly the same way.
// `float` keeps the three-way anchor union (element | fixed rect | getter),
// which is what caret-following anchoring needs and is why both modules
// exist; do not merge them.
//
// Usage:
//   const el = useTemplateRef<HTMLDivElement>("float");
//   const float = useFloat(el, () => ({ anchor: () => trigger.value?.getBoundingClientRect() ?? null }));
//   <div ref="float" :data-side="float.placement" />
//
// The return value is a ref: read it as `float.value.placement` in script and
// as `float.placement` in a template, where Vue unwraps it. Destructuring it
// gives `undefined`.

import { onScopeDispose, shallowRef, watch, type Ref, type WatchSource } from "vue";
import { float } from "./float.js";
import type { FloatOptions, FloatPlacement } from "./float.js";

const DEFAULT_PLACEMENT: FloatPlacement = "bottom-start";

export interface UseFloatResult {
	/** The placement as actually resolved — flipped when the requested side ran out of room. */
	readonly placement: FloatPlacement;
}

type FloatHandle = { update(options: FloatOptions): void; destroy(): void };

/**
 * Positions `node` with `position: fixed` against `options().anchor`, using
 * the `float` core. Mirrors `useAnchorPosition`'s shape: one watcher mounts
 * and destroys the core, a second re-syncs whenever an option that affects
 * geometry changes, and the resolved placement is returned rather than
 * discarded.
 *
 * The core reports its resolved placement only by writing `data-placement`
 * on the node (it has no callback option — unlike `anchorPosition`'s
 * `onPlacement`, this is the Svelte action's exact surface). A
 * `MutationObserver` on that one attribute is what turns it back into a
 * reactive value; watching the node's identity alone would miss every
 * later flip a scroll or resize triggers.
 */
export function useFloat(
	el: WatchSource<HTMLElement | null>,
	options: () => FloatOptions
): Readonly<Ref<UseFloatResult>> {
	const readEl = (): HTMLElement | null => (typeof el === "function" ? el() : el.value);

	const result = shallowRef<UseFloatResult>({
		placement: options().placement ?? DEFAULT_PLACEMENT,
	});

	let handle: FloatHandle | null = null;
	let observer: MutationObserver | null = null;

	function readPlacement(node: HTMLElement): void {
		const next = (node.dataset.placement as FloatPlacement | undefined) ?? DEFAULT_PLACEMENT;
		if (result.value.placement !== next) {
			result.value = { placement: next };
		}
	}

	// `immediate` is present so a source that is already non-null in setup
	// still arms; the body returns early on `null`, which is what every
	// template ref and every server render hands it.
	watch(
		el,
		(node, _prev, onCleanup) => {
			if (!node) return;
			const h = float(node, options());
			handle = (h ?? {}) as FloatHandle;
			readPlacement(node);

			if (typeof MutationObserver !== "undefined") {
				observer = new MutationObserver(() => readPlacement(node));
				observer.observe(node, { attributes: true, attributeFilter: ["data-placement"] });
			}

			onCleanup(() => {
				observer?.disconnect();
				observer = null;
				handle?.destroy();
				handle = null;
			});
		},
		{ flush: "post", immediate: true }
	);

	// Re-sync on a real geometry change. `anchor` is NOT watched, exactly as
	// in `useAnchorPosition`: the core re-reads a getter anchor on every
	// recompute, and both the getter and the fixed-rect forms of the union
	// are rebuilt on every evaluation of `options()` — watching them would
	// fire this on any unrelated dependency the caller happens to read there,
	// turning one tracked change into a full `sync()`.
	//
	// `enabled` sits HERE rather than in the attach watcher above, where
	// `useAnchorPosition` keeps its own: float's core owns the option
	// natively — `sync()` unlistens and strips the styles it wrote — so
	// toggling it goes through `update()`, which is what the Svelte action
	// does too. Tearing the core down instead would be an invented behaviour.
	watch(
		[
			() => options().placement,
			() => options().offset,
			() => options().padding,
			() => options().matchWidth,
			() => options().enabled,
		],
		() => {
			handle?.update(options());
			const node = readEl();
			if (node) readPlacement(node);
		},
		{ flush: "post" }
	);

	onScopeDispose(() => {
		observer?.disconnect();
		observer = null;
		handle?.destroy();
		handle = null;
	});

	return result as Readonly<Ref<UseFloatResult>>;
}
