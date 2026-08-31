import { useCallback, useEffect, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import { cn } from "../../utils.js";
import { useMenuItemRef } from "../../internals/menu.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useMenuContext, useSubContext } from "./types.js";

export interface DropdownMenuSubTriggerProps {
	/** Disables the row: skipped by keyboard navigation and typeahead, inert to click/hover. */
	disabled?: boolean;
	/** Leading icon. */
	icon?: ReactNode;
	/** The row's label. */
	children?: ReactNode;
	/** Additional CSS classes. */
	className?: string;
}

// Open-intent delay, mirroring `DropdownMenuSub`'s close-intent one: a pointer
// merely passing over this row on its way somewhere else shouldn't pop the
// submenu open.
const OPEN_INTENT_MS = 150;

/**
 * The row that opens a submenu — itself a menu item at the *parent* level.
 *
 * No `forwardRef`: the source exposes no `ref` binding for this row.
 */
export function DropdownMenuSubTrigger({
	disabled = false,
	icon,
	children,
	className,
}: DropdownMenuSubTriggerProps) {
	const parentMenu = useMenuContext();
	const sub = useSubContext();

	const itemRef = useRef<HTMLButtonElement | null>(null);
	const openIntentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	// This row takes part in the parent's arrow-key navigation and typeahead
	// exactly like a `DropdownMenuItem` does, on top of owning its own
	// submenu's open state. Its label span (below) is isolated from the icon
	// and the caret — both `aria-hidden` siblings — so the menu core's
	// typeahead fallback (visible text, skipping `aria-hidden` subtrees)
	// already matches this row correctly.
	const registerRef = useMenuItemRef(parentMenu.focus);
	// The source's registration effect also publishes the element on the sub
	// context; both halves live in the ref callback here, so the release
	// happens before a replacement registers and React's own null call on
	// unmount clears the published element for free.
	const { setTriggerRef } = sub;
	const publishTrigger = useCallback(
		(node: HTMLButtonElement | null): void => {
			setTriggerRef(node);
		},
		[setTriggerRef]
	);
	const ref = useComposedRefs(itemRef, registerRef, publishTrigger);

	const clearOpenIntent = useCallback((): void => {
		if (openIntentTimer.current !== null) {
			clearTimeout(openIntentTimer.current);
			openIntentTimer.current = null;
		}
	}, []);

	// Cancels a pending open-intent timer on unmount, not just on mouseleave —
	// a keyed list reordering can destroy this exact component while the
	// parent context and its siblings stay mounted, and a timer left running
	// past that point would call `sub.openSub()` against a `SubContext` this
	// component no longer owns a row in. Every downstream call along that path
	// happens to guard itself against a stale/detached element, so this was
	// never a crash — but there's no reason to leave a callback armed once the
	// row it belongs to is gone.
	useEffect(() => clearOpenIntent, [clearOpenIntent]);

	function handleClick(): void {
		if (disabled) return;
		// Same reasoning as `DropdownMenuItem`'s own click handler: hover
		// already syncs the parent menu's tracked focus position, but a click
		// reached without one first (a touch tap) wouldn't otherwise.
		if (itemRef.current) parentMenu.focus.focusItem(itemRef.current);
		sub.openSub();
	}

	function handleMouseEnter(): void {
		if (disabled || !itemRef.current) return;
		sub.keepOpen();
		parentMenu.focus.focusItem(itemRef.current);
		clearOpenIntent();
		openIntentTimer.current = setTimeout(() => {
			openIntentTimer.current = null;
			sub.openSub();
		}, OPEN_INTENT_MS);
	}

	function handleMouseLeave(): void {
		clearOpenIntent();
		sub.scheduleClose();
	}

	// ArrowRight always means "into the submenu", regardless of which side it
	// actually rendered on after a flip. Only this row's own ArrowRight is
	// handled here; ArrowLeft belongs to `DropdownMenuSubContent`, on the
	// element it's actually about once focus has moved inside.
	function handleKeydown(event: KeyboardEvent<HTMLButtonElement>): void {
		if (disabled) return;
		if (event.key === "ArrowRight") {
			event.preventDefault();
			sub.openSub();
		}
	}

	// No font-size here — same reasoning as `DropdownMenuItem`'s own classes:
	// it inherits from whichever panel this row renders inside.
	const classes = cn(
		"ft-dropdown-menu-item flex w-full cursor-pointer items-center justify-between gap-[10px] rounded-[6px] px-[10px] py-[7px] text-left text-foreground outline-none",
		"hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
		"disabled:pointer-events-none disabled:opacity-50",
		className
	);

	return (
		<button
			ref={ref}
			type="button"
			role="menuitem"
			tabIndex={-1}
			disabled={disabled}
			aria-disabled={disabled ? "true" : undefined}
			aria-haspopup="menu"
			aria-expanded={sub.open}
			aria-controls={sub.open ? sub.contentId : undefined}
			className={classes}
			onClick={handleClick}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			onKeyDown={handleKeydown}
		>
			<span className="flex items-center gap-[10px]">
				{icon ? (
					<span className="ft-dropdown-menu-item-icon" aria-hidden="true">
						{icon}
					</span>
				) : null}
				<span>{children}</span>
			</span>
			<span
				aria-hidden="true"
				className="ft-dropdown-menu-sub-caret text-muted-foreground text-[10px]"
			>
				{sub.resolvedSide === "left" ? "‹" : "›"}
			</span>
		</button>
	);
}
