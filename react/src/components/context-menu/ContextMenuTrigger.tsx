import { forwardRef, useRef } from "react";
import type { MouseEvent, ReactNode } from "react";

import { cn } from "../../utils.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useContextMenuRoot } from "./types.js";

export interface ContextMenuTriggerProps {
	/** Disables the region: `contextmenu` is left alone and the browser's native menu shows instead. */
	disabled?: boolean;
	/** The wrapped region's content. */
	children?: ReactNode;
	/** Additional CSS classes, merged onto the wrapping element. */
	className?: string;
}

/**
 * The region a right-click opens the menu over.
 *
 * The source declares `ref = $bindable(null)`, so the wrapping element
 * arrives through the ref channel rather than a prop.
 *
 * No `role`, and no `aria-haspopup`/`aria-expanded`/`aria-controls` either,
 * unlike `DropdownMenuTrigger`: `contextmenu` is a pointer gesture with an
 * OS-level keyboard equivalent (the Menu key, Shift+F10), not a role-driven
 * interaction an AT user "activates" via Enter/Space the way a button or
 * link is. There is no ARIA role that describes "right-clickable region",
 * and inventing one (or borrowing `role="button"`) would claim a keyboard/AT
 * interaction model this element doesn't actually offer; the three `aria-*`
 * attributes describe a control a user *activates* to open something, and
 * this wrapping element isn't one.
 */
export const ContextMenuTrigger = forwardRef<HTMLDivElement, ContextMenuTriggerProps>(
	function ContextMenuTrigger({ disabled = false, children, className }, forwardedRef) {
		// `ContextMenu` only ever mounts this alongside `ContextMenuContent`
		// under its own context, so there is no standalone-usage fallback to
		// design for.
		const ctx = useContextMenuRoot();

		// A plain ref, not `useElementRef` (the exception convention C-1
		// carves out): this element is rendered unconditionally and the node
		// is only ever read inside an event handler, never by an effect keyed
		// on its arrival.
		const node = useRef<HTMLDivElement | null>(null);
		const ref = useComposedRefs(node, forwardedRef);

		// How the keyboard path (the Menu key, Shift+F10) is told apart from a
		// real right-click: both dispatch the same `contextmenu` event — there
		// is no separate keyboard event to listen for — but `event.button`
		// reports which mouse button actually fired it, and a
		// keyboard-synthesized `contextmenu` reports `0` (the same value a
		// synthetic/keyboard-sourced event always carries), never `2` (the
		// right mouse button). That is not an inference about where the
		// pointer probably wasn't — it is what the event states about its own
		// origin — so it holds even for a genuine right-click at the literal
		// viewport corner, unlike a coordinate-based guess. The keyboard path
		// still has no real pointer position to open at, so it falls back to
		// this region's own rect, same as before.
		function handleContextMenu(event: MouseEvent<HTMLDivElement>): void {
			if (disabled) return;
			event.preventDefault();
			const isKeyboardInvoked = event.button !== 2;
			if (isKeyboardInvoked && node.current) {
				const rect = node.current.getBoundingClientRect();
				ctx.openAt(rect.left, rect.top);
			} else {
				ctx.openAt(event.clientX, event.clientY);
			}
		}

		return (
			<div
				ref={ref}
				className={cn("ft-context-menu-trigger", className)}
				onContextMenu={handleContextMenu}
			>
				{children}
			</div>
		);
	}
);

ContextMenuTrigger.displayName = "ContextMenuTrigger";
