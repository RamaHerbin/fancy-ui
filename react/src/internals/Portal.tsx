// Renders children into a different place in the document (defaults to
// <body>) and takes them out again on unmount.
//
// The Svelte counterpart is an action that MOVES an already-rendered node;
// `createPortal` RENDERS INTO the target instead. Same resulting DOM, a
// different route — and two consequences worth stating out loud:
//
//   * There is no "portal before focus-trap" ordering hazard here. React
//     commits portalled children into the container before any effect runs
//     and populates refs before layout effects, so a node is always connected
//     by the time anything focuses it. The Svelte action had to be applied
//     first or `.focus()` was a silent no-op on a detached node.
//   * SYNTHETIC events still bubble through the React tree even though the
//     DOM node lives elsewhere, where a moved node's native events stop at
//     <body>. Inert in practice: `useDismissable` listens natively on
//     `document`, and no compound root that owns a portalled surface renders
//     handlers of its own.
//
// Usage:
//   <Portal><div>…</div></Portal>
//   <Portal target="#modal-root">…</Portal>
//   <Portal target={someElement}>…</Portal>

import { useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { createPortal } from "react-dom";
import { useIsHydrated, useIsomorphicLayoutEffect } from "./dom/ssr.js";

export interface PortalProps {
	/**
	 * Element, CSS selector, or undefined for `document.body`. A selector
	 * matching nothing falls back to `document.body`.
	 */
	target?: HTMLElement | string;
	/** Render children in place instead of portalling. */
	disabled?: boolean;
	children?: ReactNode;
}

/**
 * Resolves a portal target argument to an actual element.
 * Falls back to `document.body` when a string selector matches nothing.
 */
export function resolvePortalTarget(target?: HTMLElement | string): HTMLElement {
	if (target instanceof HTMLElement) {
		return target;
	}

	if (typeof target === "string") {
		const match = document.querySelector<HTMLElement>(target);
		if (match) {
			return match;
		}
	}

	return document.body;
}

/**
 * The mounted target, or `null` on the server and during the hydration
 * render.
 *
 * The gate is what makes a hydration mismatch structurally impossible: the
 * server emits nothing, the hydration render emits nothing, and the target is
 * only resolved once from a layout effect. It costs one extra client render
 * for a surface that is open during SSR — a case that does not occur, since
 * every portalled surface is gated on an `open` that starts false.
 *
 * Never a lazy `useState` initializer reading `document` (convention C-7).
 */
export function usePortalTarget(target?: HTMLElement | string): HTMLElement | null {
	const hydrated = useIsHydrated();
	const [container, setContainer] = useState<HTMLElement | null>(null);

	useIsomorphicLayoutEffect(() => {
		if (!hydrated) return;
		setContainer(resolvePortalTarget(target));
	}, [hydrated, target]);

	return hydrated ? container : null;
}

/**
 * Renders `children` into `target` for as long as it is mounted.
 *
 * SSR-safe: renders `null` on the server and during hydration, then portals.
 */
export function Portal({ target, disabled, children }: PortalProps): ReactElement | null {
	// Above the early returns, always — a conditional hook throws the first
	// time `disabled` flips (convention C-2).
	const container = usePortalTarget(target);

	if (disabled) return <>{children}</>;
	if (!container) return null;

	return createPortal(children, container);
}
