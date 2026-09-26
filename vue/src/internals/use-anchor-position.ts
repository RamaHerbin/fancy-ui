// Vue binding for the `anchorPosition` core in `anchor-position.ts`. The core
// owns the geometry and the listeners; this file owns nothing but the
// lifecycle and the one piece of state twelve anchored surfaces all need —
// the placement as it ACTUALLY resolved, after a flip and after a clamp.
//
// Usage:
//   const panel = useTemplateRef<HTMLDivElement>("panel");
//   const placement = useAnchorPosition(panel, () => ({ anchor: trigger, side: "bottom" }));
//   <div ref="panel" :style="{ transformOrigin: originFor(placement.side, placement.align) }" />
//
// The return value is a ref: read it as `placement.value.side` in script and
// as `placement.side` in a template, where Vue unwraps it. Destructuring it
// gives two `undefined`s.

import { isRef, onScopeDispose, shallowRef, watch, type Ref, type WatchSource } from "vue";
import { anchorPosition } from "./anchor-position.js";
import type { Align, AnchorPositionOptions, Side } from "./anchor-position.js";

export interface UseAnchorPositionOptions {
	/** A node, a ref, or a getter for a moving/virtual target. Keeps the Svelte getter. */
	anchor: WatchSource<HTMLElement | null> | HTMLElement;
	/** Side of the anchor to place the element on. Defaults to "bottom". */
	side?: Side;
	/** Alignment along the cross axis of `side`. Defaults to "center". */
	align?: Align;
	/** Gap in pixels between the anchor and the element. Defaults to the core's 8. */
	offset?: number;
	/** Stop positioning without unmounting. Default true. */
	enabled?: boolean;
	/**
	 * Bumped to force a recompute when geometry moved but no option did —
	 * only `ContextMenuContent` passes one.
	 */
	recomputeKey?: string | number;
	/**
	 * Fires on first placement, then only when the resolved side or align
	 * actually changes. Most consumers want the RETURN VALUE instead; this is
	 * for the caller that has to publish the placement somewhere other than
	 * its own render — a submenu telling its parent context which way it
	 * opened.
	 */
	onPlacement?: (side: Side, align: Align) => void;
}

export interface ResolvedPlacement {
	readonly side: Side;
	readonly align: Align;
}

type AnchorPositionHandle = { update(options: AnchorPositionOptions): void; destroy(): void };

/**
 * Positions `node` with `position: fixed` against a live anchor, using the
 * `anchorPosition` core. Returns the placement as ACTUALLY resolved —
 * flipped and/or clamped.
 *
 * The initial value is the REQUESTED side and align, not a hardcoded
 * "bottom"/"center" — seeding with anything else shows as a one-frame
 * transform-origin jump on every open, when only a real flip may move the
 * origin.
 *
 * SSR-safe: nothing runs. The element renders unpositioned, exactly as under
 * an un-run Svelte action.
 */
export function useAnchorPosition(
	el: WatchSource<HTMLElement | null>,
	options: () => UseAnchorPositionOptions
): Readonly<Ref<ResolvedPlacement>> {
	const placement = shallowRef<ResolvedPlacement>({
		side: options().side ?? "bottom",
		align: options().align ?? "center",
	});

	function handlePlacement(side: Side, align: Align): void {
		const prev = placement.value;
		if (prev.side !== side || prev.align !== align) {
			placement.value = { side, align };
		}
		options().onPlacement?.(side, align);
	}

	// The core's `anchor` is a getter, and this one re-reads `options()` on
	// every call: whichever of the three accepted forms the caller passed,
	// and whichever value that form holds right now, is resolved at the
	// moment the core asks. `isRef` is the discriminator rather than a
	// `.value` probe — an anchor may legitimately be an `<input>`, which has
	// a `value` of its own — and it is safe on the server, where the core
	// never calls this at all.
	function resolveAnchor(): HTMLElement | null {
		const anchor = options().anchor;
		if (typeof anchor === "function") return anchor();
		if (isRef(anchor)) return anchor.value;
		return anchor;
	}

	function buildOptions(): AnchorPositionOptions {
		const o = options();
		return {
			anchor: resolveAnchor,
			side: o.side,
			align: o.align,
			offset: o.offset,
			onPlacement: handlePlacement,
		};
	}

	let handle: AnchorPositionHandle | null = null;
	/**
	 * The anchor element the core last positioned against, compared by
	 * identity; `undefined` whenever there is no core.
	 */
	let appliedAnchor: HTMLElement | null | undefined = undefined;

	function sync(): void {
		if (!handle) return;
		appliedAnchor = resolveAnchor();
		handle.update(buildOptions());
	}

	// Attach/detach, keyed on the node and on `enabled`. `onPlacement` is
	// never watched — it is a stable local closure — and `anchor` has its own
	// watcher below.
	//
	// `immediate` is present so a source that is already non-null in setup —
	// a getter over a node this composable did not create — still arms; the
	// body returns early on `null`, which is what every template ref and
	// every server render hands it, so nothing is read from the DOM there.
	watch(
		[el, () => options().enabled ?? true] as const,
		([node, enabled], _prev, onCleanup) => {
			if (!node || !enabled) return;
			appliedAnchor = resolveAnchor();
			const result = anchorPosition(node, buildOptions());
			handle = (result ?? {}) as AnchorPositionHandle;
			onCleanup(() => {
				handle?.destroy();
				handle = null;
				appliedAnchor = undefined;
			});
		},
		{ flush: "post", immediate: true }
	);

	// Recompute on a real geometry change.
	watch(
		[
			() => options().side,
			() => options().align,
			() => options().offset,
			() => options().recomputeKey,
		],
		sync,
		{ flush: "post" }
	);

	// Recompute when the RESOLVED anchor changes while the node stays mounted
	// — a ref or getter retargeted to another element. The core re-reads
	// `anchor()` on every recompute, but nothing it listens to (scroll,
	// resize) fires on a retarget, so without this the panel stays over the
	// old element. The source is the resolved element, not `options().anchor`:
	// a getter rebuilt on every `options()` call is not evidence of a change.
	// The identity check against what the core last used skips the redundant
	// update when the anchor arrives in the same flush as the attach.
	watch(
		resolveAnchor,
		(next) => {
			if (!handle || next === appliedAnchor) return;
			sync();
		},
		{ flush: "post" }
	);

	onScopeDispose(() => {
		handle?.destroy();
		handle = null;
		appliedAnchor = undefined;
	});

	return placement as Readonly<Ref<ResolvedPlacement>>;
}
