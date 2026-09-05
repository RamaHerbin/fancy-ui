import { useRef } from "react";
import type { ReactNode } from "react";

import { cn } from "../../utils.js";
import { useMenuItemRef } from "../../internals/menu.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { useMenuContext } from "./types.js";

export interface DropdownMenuItemProps {
	/** Called when the item is selected, by click or (in a real browser) by Enter/Space while it holds focus. */
	onSelect?: () => void;
	/** Disables the item: skipped by keyboard navigation and typeahead, inert to click. */
	disabled?: boolean;
	/** Visual/semantic variant. `"destructive"` renders in the destructive color. */
	variant?: "default" | "destructive";
	/** Display-only keyboard shortcut, rendered as a trailing `<kbd>`. This component binds no global keys for it. */
	shortcut?: string;
	/** Whether selecting the item closes the whole menu. Defaults to true. */
	closeOnSelect?: boolean;
	/** Leading icon. */
	icon?: ReactNode;
	/** The item's label. */
	children?: ReactNode;
	/** Additional CSS classes. */
	className?: string;
}

/**
 * One selectable row.
 *
 * No `forwardRef`: the source exposes no `ref` binding for an item, and the
 * Svelte API surface is the contract, per-component.
 */
export function DropdownMenuItem({
	onSelect,
	disabled = false,
	variant = "default",
	shortcut,
	closeOnSelect = true,
	icon,
	children,
	className,
}: DropdownMenuItemProps) {
	// `DropdownMenuContent`/`DropdownMenuSubContent` always provide this
	// before mounting their children, so there is no standalone-usage
	// fallback to design for.
	const ctx = useMenuContext();

	// A plain ref, not `useElementRef`: no hook here is keyed on the node's
	// existence — it is only ever read from inside an event handler, by which
	// time it is long since attached.
	const itemRef = useRef<HTMLButtonElement | null>(null);
	// Registration happens in the ref callback, replacing the source's
	// per-item mount effect. Order is irrelevant: the core sorts by
	// `compareDocumentPosition` at navigation time.
	const registerRef = useMenuItemRef(ctx.focus);
	const ref = useComposedRefs(itemRef, registerRef);

	const playCue = useSoundCue(ctx.sound);

	// This item's own label — the `<span>{children}</span>` below, nothing
	// else — is already isolated from the icon and the shortcut (both separate
	// `aria-hidden` siblings), so the menu core's typeahead fallback (visible
	// text, skipping `aria-hidden` subtrees) already gets this markup right on
	// its own. `data-typeahead-label` is still there in the core for a
	// consumer hand-building menu items who hasn't marked their own icons
	// `aria-hidden` — this component just doesn't need the escape hatch.

	// A native `disabled` attribute already blocks a real click, and React
	// additionally refuses to deliver `onClick` to a disabled button; the
	// handler guards again rather than trusting either.
	function handleClick(): void {
		if (disabled) return;
		playCue("select");
		// Mouse hover already syncs the menu core's tracked focus position
		// (see `handleMouseEnter` below), and the common `closeOnSelect` path
		// makes this redundant too — closing moves focus back to the trigger
		// regardless. The gap is `closeOnSelect: false` reached by something
		// that skips `mouseenter` entirely, a touch tap being the realistic
		// case: without this, the core's own idea of "focused" stays wherever
		// it last was, and the next arrow key starts from the wrong place even
		// though this row is what the user just interacted with.
		if (itemRef.current) ctx.focus.focusItem(itemRef.current);
		onSelect?.();
		// `silent: true` — this click already played `select` above; closing
		// the menu on top of it must never also play `close`, or one item
		// activation would yield two cues instead of one.
		if (closeOnSelect) ctx.closeAll({ silent: true });
	}

	// Real DOM focus IS the highlight in a `role="menu"` built on the menu
	// core — so, unlike a listbox's rows, hovering an item deliberately moving
	// focus onto it is correct here. There is nothing to cancel: this is the
	// behaviour a mouse user needs to stay in sync with a keyboard user's own
	// arrow-key highlight.
	function handleMouseEnter(): void {
		if (disabled || !itemRef.current) return;
		ctx.focus.focusItem(itemRef.current);
	}

	// No font-size here: it inherits from whichever panel renders this item
	// (`DropdownMenuContent` at 13px, or a `*SubContent` carrying its own
	// family's size through). A hardcoded size here would win over all of
	// them.
	const classes = cn(
		"ft-dropdown-menu-item flex w-full cursor-pointer items-center justify-between gap-[10px] rounded-[6px] px-[10px] py-[7px] text-left text-foreground outline-none",
		"hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
		"disabled:pointer-events-none disabled:opacity-50",
		variant === "destructive" &&
			"text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive",
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
			data-variant={variant}
			className={classes}
			onClick={handleClick}
			onMouseEnter={handleMouseEnter}
		>
			<span className="flex items-center gap-[10px]">
				{icon ? (
					<span className="ft-dropdown-menu-item-icon" aria-hidden="true">
						{icon}
					</span>
				) : null}
				<span>{children}</span>
			</span>
			{/*
				Real DOM text, not CSS `content` — that's what lets it participate
				in the button's accessible name at all — but marked `aria-hidden`
				anyway: raw symbol glyphs like "⌘R" don't announce usefully as
				speech, and this item's own label text already carries the
				meaningful accessible name on its own.
			*/}
			{shortcut ? (
				<kbd
					aria-hidden="true"
					className="ft-dropdown-menu-item-shortcut text-muted-foreground font-mono text-[10px]"
				>
					{shortcut}
				</kbd>
			) : null}
		</button>
	);
}
