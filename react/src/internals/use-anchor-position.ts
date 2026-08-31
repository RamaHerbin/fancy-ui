// React binding for `attachAnchorPosition`. The core in `anchor-position.ts`
// owns the geometry and the listeners; this file owns nothing but the
// lifecycle and the one piece of state twelve anchored surfaces all need —
// the placement as it ACTUALLY resolved, after a flip and after a clamp.
//
// Usage:
//   const [panel, panelRef] = useElementRef<HTMLDivElement>();
//   const { side, align } = useAnchorPosition(panel, { anchor: triggerEl, side: "bottom" });
//   <div ref={panelRef} style={{ transformOrigin: originFor(side, align) }} />

import { useCallback, useRef, useState } from "react";
import { attachAnchorPosition } from "./anchor-position.js";
import type { Align, AnchorPositionHandle, Side } from "./anchor-position.js";
import { useIsomorphicLayoutEffect } from "./dom/ssr.js";
import type { ElementRef } from "./dom/types.js";
import { useEventCallback } from "./dom/use-event-callback.js";
import { useLiveRef } from "./dom/use-live-ref.js";

export interface UseAnchorPositionOptions {
	/**
	 * The anchor. A node, a ref, or a getter for a moving/virtual target —
	 * the getter form is what a context-menu-style caller with no real
	 * element to point at reaches for.
	 */
	anchor: ElementRef<HTMLElement> | HTMLElement | null | (() => HTMLElement | null);
	/** Side of the anchor to place the element on. Defaults to "bottom". */
	side?: Side;
	/** Alignment along the cross axis of `side`. Defaults to "center". */
	align?: Align;
	/** Gap in pixels between the anchor and the element. Defaults to the core's 8. */
	offset?: number;
	/** Stop positioning without unmounting. Default true. */
	enabled?: boolean;
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

/**
 * Positions `node` with `position: fixed` against a live anchor, and returns
 * the placement as ACTUALLY resolved — flipped and/or clamped.
 *
 * The element comes in as the NODE, never a ref (convention C-1): every
 * anchored surface is conditionally rendered, so a `useRef` read inside a
 * `[]`-deps effect would still be null when that effect fires and the
 * position would never be applied.
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
	node: HTMLElement | null,
	options: UseAnchorPositionOptions
): ResolvedPlacement {
	const { side = "bottom", align = "center", offset, enabled = true } = options;

	const [placement, setPlacement] = useState<ResolvedPlacement>(() => ({ side, align }));

	// The anchor and the three geometry options are read through live refs so
	// the attach effect can stay keyed on `[node, enabled]` alone: a changed
	// `side` must recompute, never tear the scroll and resize listeners down
	// and build them again.
	const anchorRef = useLiveRef(options.anchor);
	const sideRef = useLiveRef(side);
	const alignRef = useLiveRef(align);
	const offsetRef = useLiveRef(offset);

	const resolveAnchor = useCallback((): HTMLElement | null => {
		const anchor = anchorRef.current;
		if (!anchor) return null;
		if (typeof anchor === "function") return anchor();
		// `"current" in x` rather than `instanceof HTMLElement`: the check must
		// not touch a browser global, and an element has no `current`.
		if ("current" in anchor) return anchor.current;
		return anchor;
	}, [anchorRef]);

	const onPlacement = useEventCallback(options.onPlacement);

	// One identity for the life of the component, which is what makes the
	// core's `onPlacement`-identity reset branch unreachable from here.
	const handlePlacement = useCallback(
		(nextSide: Side, nextAlign: Align) => {
			// A fresh object only when a value actually moved, so a scroll storm
			// that keeps resolving to the same placement produces zero re-renders.
			setPlacement((prev) =>
				prev.side === nextSide && prev.align === nextAlign
					? prev
					: { side: nextSide, align: nextAlign }
			);
			onPlacement(nextSide, nextAlign);
		},
		[onPlacement]
	);

	const handleRef = useRef<AnchorPositionHandle | null>(null);
	// The geometry AND the anchor the live handle was last given. `null` while
	// nothing is attached; it is what keeps the update effect below from
	// spending a second layout read on the commit that just attached.
	//
	// `anchor` is the RESOLVED element, never the `anchor` option itself. The
	// option is routinely an inline arrow rebuilt on every render (a virtual
	// anchor's `() => root.anchorRef`), so its identity says nothing about
	// whether the surface still points at the same thing; the element it
	// resolves to says exactly that.
	const appliedRef = useRef<{
		side: Side;
		align: Align;
		offset: number | undefined;
		anchor: HTMLElement | null;
	} | null>(null);

	// A layout effect, not a passive one: a position applied after paint is a
	// visible jump from (0, 0).
	useIsomorphicLayoutEffect(() => {
		if (!node || !enabled) return;

		const handle = attachAnchorPosition(node, {
			anchor: resolveAnchor,
			side: sideRef.current,
			align: alignRef.current,
			offset: offsetRef.current,
			onPlacement: handlePlacement,
		});
		handleRef.current = handle;
		appliedRef.current = {
			side: sideRef.current,
			align: alignRef.current,
			offset: offsetRef.current,
			anchor: resolveAnchor(),
		};

		return () => {
			handleRef.current = null;
			appliedRef.current = null;
			handle.destroy();
		};
	}, [node, enabled, resolveAnchor, handlePlacement, sideRef, alignRef, offsetRef]);

	useIsomorphicLayoutEffect(() => {
		const handle = handleRef.current;
		const applied = appliedRef.current;
		if (!handle || !applied) return;
		// Resolved here rather than compared as an option, so a surface
		// retargeted from one anchor onto another recomputes even though the
		// three geometry options never moved. Without it the panel stays pinned
		// where the previous anchor stood until a scroll or a resize happens to
		// fire, which for a surface over a static page is never.
		const nextAnchor = resolveAnchor();
		if (
			applied.side === side &&
			applied.align === align &&
			applied.offset === offset &&
			applied.anchor === nextAnchor
		) {
			return;
		}

		appliedRef.current = { side, align, offset, anchor: nextAnchor };
		handle.update({
			anchor: resolveAnchor,
			side,
			align,
			offset,
			onPlacement: handlePlacement,
		});
		// `options.anchor` is listed for its CHANGES, not its value: the effect
		// reads the anchor through `resolveAnchor`'s live ref, and a new anchor
		// option is the only signal React gives that the resolved element may
		// have moved. An inline arrow's fresh identity re-runs this for one
		// pointer comparison and no layout read.
	}, [node, side, align, offset, options.anchor, resolveAnchor, handlePlacement]);

	return placement;
}
