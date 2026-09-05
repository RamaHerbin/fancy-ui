import { forwardRef, useEffect, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import { cn } from "../../utils.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useNavigationMenuContext, useNavigationMenuItemContext } from "./types.js";
import "./navigation-menu-trigger.css";

export interface NavigationMenuTriggerProps {
	/** The trigger's label. */
	children?: ReactNode;
	/** Additional CSS classes. */
	className?: string;
}

export const NavigationMenuTrigger = forwardRef<HTMLButtonElement, NavigationMenuTriggerProps>(
	function NavigationMenuTrigger({ children, className }, forwardedRef) {
		const item = useNavigationMenuItemContext();
		const root = useNavigationMenuContext();

		// A plain ref rather than `useElementRef`: the button is never
		// conditionally rendered — convention C-1's hazard — and the node is
		// only ever read from inside a click handler, by which time it is long
		// since attached. A ref keeps the handlers below free of an extra
		// render at mount.
		const buttonRef = useRef<HTMLButtonElement | null>(null);
		// Convention C-2: composed at the top of the body.
		const setButtonRef = useComposedRefs(buttonRef, forwardedRef);

		const isOpen = root.value === item.value;
		const tabIndexAttr = root.focusedValue === item.value ? 0 : -1;

		const { registerTrigger } = root;
		useEffect(() => registerTrigger(item.value), [registerTrigger, item.value]);

		// Click is immediate, no hover-intent delay — an explicit click is
		// already the user's decision, there is no "did they mean it" travel to
		// protect against the way there is for a pointer merely passing over
		// the row.
		function handleClick() {
			root.toggle(item.value);
			root.focus(item.value);
			// Deliberate, not incidental, the same reasoning as ToggleGroupItem:
			// a plain `<button>` is only guaranteed to take focus on click in
			// some browsers (macOS Safari notably does not, by default).
			// Without this, clicking a trigger would open its panel but leave
			// the roving tab stop — and DOM focus — wherever it last was.
			buttonRef.current?.focus();
		}

		function handlePointerEnter() {
			root.scheduleOpen(item.value);
		}

		function handlePointerLeave() {
			root.scheduleClose();
		}

		// There is deliberately no focus handler opening the panel here. A
		// keyboard user tabbing *past* a trigger on their way elsewhere must
		// not open it — only Enter/Space/ArrowDown, an explicit request, does
		// that. It also happens to be exactly what keeps Escape well-behaved:
		// closing returns focus to this trigger (see `close()`), and if focus
		// opened the panel, that same programmatic refocus would reopen it
		// immediately — the pointer-and-keyboard fight the panel's own test
		// file pins down.
		function handleKeydown(event: KeyboardEvent<HTMLButtonElement>) {
			switch (event.key) {
				case "Enter":
				case " ":
				case "ArrowDown":
					event.preventDefault();
					root.open(item.value);
					root.focus(item.value);
					root.requestFocus(item.value);
					break;
				case "ArrowRight":
					event.preventDefault();
					root.move(item.value, 1);
					break;
				case "ArrowLeft":
					event.preventDefault();
					root.move(item.value, -1);
					break;
				case "Home":
					event.preventDefault();
					root.moveToEdge("first");
					break;
				case "End":
					event.preventDefault();
					root.moveToEdge("last");
					break;
			}
		}

		const classes = cn(
			"ft-navigation-menu-trigger text-muted-foreground inline-flex cursor-pointer items-center gap-1 rounded-[8px] px-[14px] py-[8px] text-[13px] font-medium transition-colors",
			"hover:bg-accent hover:text-accent-foreground focus-visible:outline-none",
			isOpen && "bg-accent text-accent-foreground",
			className
		);

		return (
			<button
				ref={setButtonRef}
				type="button"
				id={item.triggerId}
				data-ft-nav-trigger=""
				data-value={item.value}
				className={classes}
				aria-expanded={isOpen}
				aria-controls={isOpen ? item.contentId : undefined}
				tabIndex={tabIndexAttr}
				onClick={handleClick}
				onPointerEnter={handlePointerEnter}
				onPointerLeave={handlePointerLeave}
				onKeyDown={handleKeydown}
			>
				{children}
				<span className="ft-navigation-menu-caret" aria-hidden="true">
					▾
				</span>
			</button>
		);
	}
);

NavigationMenuTrigger.displayName = "NavigationMenuTrigger";
