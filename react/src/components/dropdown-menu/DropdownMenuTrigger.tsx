import { forwardRef, useEffect } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import { cn } from "../../utils.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useDropdownMenuRoot } from "./types.js";
import "./dropdown-menu-trigger.css";

export interface DropdownMenuTriggerProps {
	/** Disables the trigger — the menu cannot be opened. */
	disabled?: boolean;
	/** The trigger's content. */
	children?: ReactNode;
	/** Additional CSS classes, merged onto the trigger. */
	className?: string;
}

/**
 * The button that opens the menu.
 *
 * The source declares `ref = $bindable(null)`, so the button element arrives
 * through the ref channel rather than a prop.
 */
export const DropdownMenuTrigger = forwardRef<HTMLButtonElement, DropdownMenuTriggerProps>(
	function DropdownMenuTrigger({ disabled = false, children, className }, forwardedRef) {
		// `DropdownMenu` only ever mounts this alongside `DropdownMenuContent`
		// under its own context, so there is no standalone-usage fallback to
		// design for.
		const ctx = useDropdownMenuRoot();

		// The NODE, not a ref (convention C-1): the publish effect below is
		// keyed on it, so it has to re-run the moment the element appears.
		const [node, setNode] = useElementRef<HTMLButtonElement>();
		const ref = useComposedRefs(setNode, forwardedRef);

		// Keyed on `setTriggerRef`, never on `ctx`: the context object is
		// rebuilt on every root render, and depending on it here would publish
		// null and then the node again on each one. `setTriggerRef` writes a
		// ref and is identity-stable for the life of the root.
		const { setTriggerRef } = ctx;
		useEffect(() => {
			setTriggerRef(node);
			return () => setTriggerRef(null);
		}, [setTriggerRef, node]);

		function handleClick(): void {
			if (disabled) return;
			if (ctx.open) {
				// Focus is already here — it's the element that was just clicked —
				// so there is nothing for a forced `.focus()` to do.
				ctx.close({ returnFocus: false });
			} else {
				ctx.openWithFocus("first");
			}
		}

		function handleKeydown(event: KeyboardEvent<HTMLButtonElement>): void {
			if (disabled) return;
			switch (event.key) {
				case "Enter":
				case " ":
				case "ArrowDown":
					event.preventDefault();
					ctx.openWithFocus("first");
					return;
				case "ArrowUp":
					event.preventDefault();
					ctx.openWithFocus("last");
					return;
			}
		}

		const classes = cn(
			"ft-dropdown-menu-trigger border-border text-foreground hover:bg-accent hover:text-accent-foreground inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border px-[14px] py-[7px] text-[12px] font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--ft-nav-accent)]/35 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
			className
		);

		return (
			<button
				ref={ref}
				id={ctx.triggerId}
				type="button"
				disabled={disabled}
				className={classes}
				aria-haspopup="menu"
				aria-expanded={ctx.open}
				aria-controls={ctx.open ? ctx.contentId : undefined}
				onClick={handleClick}
				onKeyDown={handleKeydown}
			>
				{children}
			</button>
		);
	}
);

DropdownMenuTrigger.displayName = "DropdownMenuTrigger";
