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

/**
 * The option values the core was last handed. Every field is compared by
 * identity, which is what makes a re-sync a real change rather than one more
 * evaluation of `options()` — that getter returns a fresh object every call.
 */
interface AppliedOptions {
	anchor: FloatOptions["anchor"];
	placement: FloatOptions["placement"];
	offset: FloatOptions["offset"];
	padding: FloatOptions["padding"];
	matchWidth: FloatOptions["matchWidth"];
	enabled: FloatOptions["enabled"];
}

function snapshot(options: FloatOptions): AppliedOptions {
	return {
		anchor: options.anchor,
		placement: options.placement,
		offset: options.offset,
		padding: options.padding,
		matchWidth: options.matchWidth,
		enabled: options.enabled,
	};
}

function unchanged(applied: AppliedOptions | null, next: FloatOptions): boolean {
	return (
		applied !== null &&
		applied.anchor === next.anchor &&
		applied.placement === next.placement &&
		applied.offset === next.offset &&
		applied.padding === next.padding &&
		applied.matchWidth === next.matchWidth &&
		applied.enabled === next.enabled
	);
}

export interface UseFloatResult {
	/** The placement as actually resolved — flipped when the requested side ran out of room. */
	readonly placement: FloatPlacement;
}

type FloatHandle = { update(options: FloatOptions): void; destroy(): void };

/**
 * Positions `node` with `position: fixed` against `options().anchor`, using
 * the `float` core. Mirrors `useAnchorPosition`'s shape: one watcher mounts
 * and destroys the core, a second re-syncs whenever an option that affects
 * geometry changes — `anchor` included — and the resolved placement is
 * returned rather than discarded.
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
	/** What the core currently holds; `null` whenever there is no core. */
	let applied: AppliedOptions | null = null;

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
			const initial = options();
			applied = snapshot(initial);
			const h = float(node, initial);
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
				applied = null;
			});
		},
		{ flush: "post", immediate: true }
	);

	// Re-sync on a real geometry change — `anchor` among them, which is the one
	// place this parts from `useAnchorPosition`. The Svelte action's parameter
	// is a single `$derived` object, and Svelte re-runs `update()` whenever it
	// changes; an anchor that moves while the float stays open (a caret-anchored
	// menu whose token shifts) changes nothing the core can hear for itself —
	// neither the scroll/resize listeners nor the `ResizeObserver`, which never
	// observes a getter anchor — so without this the float hangs over the old
	// anchor.
	//
	// What keeps that from turning any dependency the caller reads inside
	// `options()` into a full `sync()` is the identity check below: the getter
	// and the fixed-rect forms of the anchor union are rebuilt on every
	// evaluation, so the source alone is not evidence of a change. A caller
	// whose anchor is a stable value — an element ref, or a getter held in a
	// `computed` — re-evaluates to the same identity and is skipped.
	//
	// `enabled` sits HERE rather than in the attach watcher above, where
	// `useAnchorPosition` keeps its own: float's core owns the option
	// natively — `sync()` unlistens and strips the styles it wrote — so
	// toggling it goes through `update()`, which is what the Svelte action
	// does too. Tearing the core down instead would be an invented behaviour.
	watch(
		[
			() => options().anchor,
			() => options().placement,
			() => options().offset,
			() => options().padding,
			() => options().matchWidth,
			() => options().enabled,
		],
		() => {
			const node = readEl();
			// No core yet, or no element any more: the attach watcher is the one
			// that creates and destroys, and when a float unmounts its options
			// usually change in the very same flush. Re-positioning a node that
			// has already left is a write to something about to be dropped.
			if (!handle || !node) return;
			const next = options();
			if (unchanged(applied, next)) return;
			applied = snapshot(next);
			handle.update(next);
			readPlacement(node);
		},
		{ flush: "post" }
	);

	onScopeDispose(() => {
		observer?.disconnect();
		observer = null;
		handle?.destroy();
		handle = null;
		applied = null;
	});

	return result as Readonly<Ref<UseFloatResult>>;
}
