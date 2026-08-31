import { forwardRef, useContext, useEffect, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "../../utils.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { TOGGLE_GROUP_KEY } from "./types.js";
import "./toggle-group-item.css";

export interface ToggleGroupItemProps {
	/** This item's value — what gets added to or removed from the group's selection. */
	value: string;
	/** Disables just this item, independent of the group's own `disabled`. */
	disabled?: boolean;
	/** Accessible name, for icon-only content. Falls back to the rendered content. */
	label?: string;
	/** The item's content, typically a glyph or a short label. */
	children?: ReactNode;
	/** Additional CSS classes */
	className?: string;
}

const SIZE_CLASSES: Record<"sm" | "md" | "lg", string> = {
	sm: "h-[26px] min-w-[26px] rounded-[4px] px-2 text-xs",
	md: "h-[30px] min-w-[32px] rounded-[6px] px-2.5 text-sm",
	lg: "h-[34px] min-w-[36px] rounded-[8px] px-3 text-base",
};

/**
 * One toggle in a `ToggleGroup` rail.
 *
 * The element arrives through the ref channel rather than a `ref` prop, per
 * PORTING.md — the Svelte source declares `ref = $bindable(null)`. Rest props
 * are not spread, for the same reason as on the root.
 */
export const ToggleGroupItem = forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
	({ value, disabled = false, label, children, className }, forwardedRef) => {
		// Undefined outside a ToggleGroup: the item then has no selection or
		// roving order to take part in, and renders as a plain, always-tabbable,
		// permanently-unselected button rather than throwing.
		const group = useContext(TOGGLE_GROUP_KEY);

		// The click handler moves DOM focus to this very button, so the
		// component needs the node itself even when the consumer passes no ref.
		const innerRef = useRef<HTMLButtonElement | null>(null);
		const setRef = useComposedRefs(forwardedRef, innerRef);

		const isDisabled = disabled || (group?.disabled ?? false);
		const isSelected = group?.isSelected(value) ?? false;
		const size = group?.size ?? "md";
		// `undefined` outside a group leaves the native default (a plain button is
		// already in the tab order on its own); inside one, exactly the item
		// holding the roving position gets 0 and every other gets -1.
		const tabIndexAttr = group ? (group.focusedValue === value ? 0 : -1) : undefined;

		const classes = cn(
			// No `transition-colors`: the colocated stylesheet puts a `transition`
			// shorthand on this same element, and its rules are unlayered while
			// Tailwind utilities live in `@layer utilities`, so the utility
			// would have been replaced without a trace. The colour channel is
			// re-declared by hand there instead.
			"ft-toggle-group-item inline-flex shrink-0 cursor-pointer items-center justify-center font-medium",
			"focus-visible:outline-none",
			"disabled:pointer-events-none disabled:opacity-50",
			SIZE_CLASSES[size],
			isSelected
				? "bg-secondary text-secondary-foreground"
				: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
			className
		);

		// Joins the roving-focus order whenever this item is enabled, and leaves
		// it in every other case: disabled from the start, or going disabled
		// mid-session. That keeps the group's fallback tabbable position from
		// ever landing on a button that cannot actually take focus. The effect's
		// cleanup — run on unmount, and again before each re-run when `value` or
		// `isDisabled` changes — unregisters the value the previous run added.
		//
		// The dependency list holds the two commands themselves, never the
		// context object: the root rebuilds that object on every render, so
		// depending on it would re-run this effect (unregister, then register)
		// on every root render. `register`/`unregister` are identity-stable by
		// contract for exactly this reason.
		const register = group?.register;
		const unregister = group?.unregister;
		useEffect(() => {
			if (!register || !unregister || isDisabled) return;
			// Captured locally: `value` inside the returned cleanup would otherwise
			// read whatever the prop is *when the effect next re-runs*, not what it
			// was when this run registered.
			const registeredValue = value;
			register(registeredValue);
			return () => unregister(registeredValue);
		}, [register, unregister, isDisabled, value]);

		// The native `disabled` attribute below is the real gate, exactly as in
		// Toggle — but a synthetic event fired directly at the element (as a
		// test does, and as some assistive tech does) can still reach these
		// handlers without going through the browser's own pre-click disabled
		// check, so each one repeats the guard rather than trusting the
		// attribute alone.
		function handleClick() {
			if (isDisabled) return;
			group?.toggle(value);
			// Deliberate, not incidental: a plain `<button>` is only guaranteed
			// to take focus on click in some browsers (macOS Safari notably does
			// not, by default). Without this, a mouse click there would select
			// the item but leave the roving tab stop — and DOM focus — wherever
			// it last was, so the very next Tab lands somewhere the reader did
			// not just interact with. `focus()` on an element already focused is
			// a no-op, so this costs nothing on browsers that would have moved
			// focus here anyway.
			group?.focus(value);
			innerRef.current?.focus();
		}

		function handleFocus() {
			if (isDisabled) return;
			group?.focus(value);
		}

		function handleKeydown(event: KeyboardEvent<HTMLButtonElement>) {
			if (!group || isDisabled) return;
			switch (event.key) {
				case "ArrowRight":
				case "ArrowDown":
					event.preventDefault();
					group.move(value, 1);
					break;
				case "ArrowLeft":
				case "ArrowUp":
					event.preventDefault();
					group.move(value, -1);
					break;
				case "Home":
					event.preventDefault();
					group.moveToEdge("first");
					break;
				case "End":
					event.preventDefault();
					group.moveToEdge("last");
					break;
			}
		}

		return (
			<button
				ref={setRef}
				type="button"
				data-ft-toggle-item=""
				data-value={value}
				data-size={size}
				className={classes}
				disabled={isDisabled}
				aria-pressed={isSelected}
				aria-label={label}
				tabIndex={tabIndexAttr}
				onClick={handleClick}
				onFocus={handleFocus}
				onKeyDown={handleKeydown}
			>
				{children !== undefined ? children : (label ?? value)}
			</button>
		);
	}
);

ToggleGroupItem.displayName = "ToggleGroupItem";
