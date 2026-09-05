import { forwardRef, useContext, useEffect, useRef } from "react";
import type { FocusEvent, KeyboardEvent, ReactNode } from "react";
import { cn } from "../../utils.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { TABS_KEY } from "./types.js";
import "./tabs-trigger.css";

export interface TabsTriggerProps {
	/** This trigger's value — which `TabsContent` it activates. */
	value: string;
	/** Disables just this trigger. A disabled trigger is skipped by the arrows and Home/End. */
	disabled?: boolean;
	/** The trigger's content, typically the tab's label. */
	children?: ReactNode;
	/** Additional CSS classes. */
	className?: string;
}

/**
 * One tab in a `TabsList`.
 *
 * The element arrives through the ref channel rather than a `ref` prop, per
 * PORTING.md — the Svelte source declares `ref = $bindable(null)`. Rest props
 * are not spread, for the same reason as on the root.
 */
export const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(
	({ value, disabled = false, children, className }, forwardedRef) => {
		// Undefined outside a Tabs root: the trigger then has no selection or
		// roving order to take part in, and renders as a plain, always-tabbable,
		// permanently-unselected button rather than throwing — same degradation
		// as ToggleGroupItem/RadioGroupItem.
		const context = useContext(TABS_KEY);

		// The click handler moves DOM focus to this very button, so the component
		// needs the node itself even when the consumer passes no ref.
		const innerRef = useRef<HTMLButtonElement | null>(null);
		const setRef = useComposedRefs(forwardedRef, innerRef);

		const isDisabled = disabled;
		const isSelected = context?.isSelected(value) ?? false;
		const variant = context?.variant ?? "underline";
		const orientation = context?.orientation ?? "horizontal";
		// `undefined` outside a Tabs root leaves the native default (a plain
		// button is already in the tab order on its own); inside one, exactly
		// the trigger holding the roving position gets 0 and every other gets -1.
		const tabIndexAttr = context ? (context.focusedValue === value ? 0 : -1) : undefined;

		// Geometry, not just colour, branches on variant: the mockup gives the
		// segmented pill a tighter box than the underline tab — 6px/12px versus
		// 8px/13px — not merely a different background.
		//
		// Neither branch paints the selection's *shape* any more: the segmented
		// pill's fill and the underline bar are both drawn by `TabsList`'s single
		// sliding indicator, which can travel between triggers in a way a
		// per-trigger background never could. What stays here is the part a
		// screen reader and a forced-colors user rely on — `aria-selected` below,
		// and the selected trigger's own foreground colour.
		//
		// `ft-tabs-trigger-selected` carries no rules of its own now. It stays in
		// the class string because it is a published styling hook, and dropping it
		// would silently break any consumer targeting it.
		const classes = cn(
			"ft-tabs-trigger inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap px-[14px] font-medium transition-colors",
			"focus-visible:outline-none",
			"disabled:pointer-events-none disabled:opacity-50",
			variant === "segmented"
				? cn(
						"rounded-md py-[6px] text-[12px]",
						isSelected ? "text-accent-foreground" : "text-muted-foreground hover:text-foreground"
					)
				: cn(
						"py-2 text-[13px]",
						isSelected
							? "ft-tabs-trigger-selected text-foreground"
							: "text-muted-foreground hover:text-foreground"
					),
			className
		);

		// Whether this trigger holds real DOM focus right now. Refs, not state —
		// only the two effects below ever read them, and nothing needs to
		// re-render when they change.
		const hasDomFocusRef = useRef(false);
		// Tracks the disabled transition across renders so the effect below can
		// tell "just became disabled" apart from "already was" or "just became
		// enabled".
		const wasDisabledRef = useRef(false);
		// Set by the capture effect below, consumed by the reclaim effect below
		// it — the bridge the Svelte source builds with `$effect.pre`.
		const reclaimPendingRef = useRef(false);

		// The Svelte source captures `document.activeElement` in an `$effect.pre`,
		// which runs BEFORE the DOM patch for that flush: in a real browser,
		// setting the native `disabled` attribute on a focused control forces an
		// immediate blur as part of applying that same patch, so a post-patch read
		// would see `<body>` and the reclaim below would never fire. React has no
		// pre-mutation phase for a function component, so the sample is kept
		// continuously instead — `handleFocus`/`handleBlur` maintain it, and
		// `handleBlur` deliberately ignores the one blur that arrives with
		// `disabled` already applied, because that blur IS the forced one this
		// branch exists for. jsdom reproduces neither the forced blur nor that
		// event (see `internals/menu.ts`'s note on the same limitation), which is
		// why `document.activeElement` is still consulted as well: between them
		// the two terms are correct in a browser and under jsdom alike, and
		// neither can produce a false positive.
		useIsomorphicLayoutEffect(() => {
			const nowDisabled = isDisabled;
			const justDisabled = nowDisabled && !wasDisabledRef.current;
			wasDisabledRef.current = nowDisabled;
			if (!justDisabled) return;
			const node = innerRef.current;
			reclaimPendingRef.current =
				hasDomFocusRef.current || (node !== null && document.activeElement === node);
			hasDomFocusRef.current = false;
		}, [isDisabled]);

		// Joins the roving-focus order whenever this trigger is enabled, and
		// leaves it in every other case: disabled from the start, or going
		// disabled mid-session. The effect's cleanup — run on unmount, and again
		// before each re-run when `value` or `isDisabled` changes — unregisters
		// the value the previous run added.
		//
		// The dependency list holds the two commands themselves, never the
		// context object: the root rebuilds that object on every render, so
		// depending on it would re-run this effect (unregister, then register) on
		// every root render. `register`/`unregister` are identity-stable by
		// contract for exactly this reason.
		const register = context?.register;
		const unregister = context?.unregister;
		useEffect(() => {
			if (!register || !unregister || isDisabled) return;
			// Captured locally: `value` inside the returned cleanup would otherwise
			// read whatever the prop is *when the effect next re-runs*, not what it
			// was when this run registered.
			const registeredValue = value;
			register(registeredValue);
			return () => unregister(registeredValue);
		}, [register, unregister, isDisabled, value]);

		// This trigger just became disabled while it held real DOM focus. Hand
		// focus to whichever trigger inherits the roving position, guarded so a
		// trigger that never had focus can never steal it from wherever the user
		// actually is.
		//
		// It waits for `focusedValue` to stop naming this very trigger, which is
		// the observable that says the registry has already dropped it: the
		// unregister above is a state update, so it lands one render later than
		// the commit that disabled this button — where the Svelte source gets the
		// same ordering for free, because its cleanup runs in a pass that has
		// already completed. Nothing in this branch writes that registry itself.
		//
		// Once the registry has answered, the flag is consumed BEFORE the answer
		// is acted on — the Svelte source clears `hadFocusBeforeDisabling`
		// unconditionally, ahead of its own `next !== null` test. Leaving it
		// armed through an empty registry would let a later re-enable (which
		// makes `focusedValue` name a trigger again) fire this effect long after
		// the user has moved focus somewhere else entirely, dragging it back into
		// the tablist. The Svelte source cannot reach that state; neither may
		// this one.
		const focusedValue = context?.focusedValue ?? null;
		const focusElement = context?.focusElement;
		useEffect(() => {
			if (!reclaimPendingRef.current || !isDisabled || !focusElement) return;
			// Still the roving position: the registry has not dropped this value
			// yet, so there is no inheritor to name. Keep waiting.
			if (focusedValue === value) return;
			reclaimPendingRef.current = false;
			if (focusedValue === null) return;
			focusElement(focusedValue);
		}, [isDisabled, focusedValue, focusElement, value]);

		// The native `disabled` attribute below is the real gate, but a synthetic
		// click fired straight at the element — as a test does — walks straight
		// past it, so the handler repeats the guard itself.
		function handleClick() {
			if (isDisabled) return;
			context?.select(value);
			// A native <button> is only guaranteed to take focus on click in some
			// browsers (macOS Safari notably does not, by default), so the roving
			// tab stop is moved here explicitly rather than left to an incidental
			// focus event — the same reasoning as ToggleGroupItem's click handler.
			context?.focus(value);
			innerRef.current?.focus();
		}

		// Keeps the roving tabindex following real DOM focus even when focus
		// arrives some other way than this trigger's own click/keydown handlers
		// below — Shift+Tab back out of the panel, for instance.
		function handleFocus() {
			hasDomFocusRef.current = true;
			if (isDisabled) return;
			context?.focus(value);
		}

		function handleBlur(event: FocusEvent<HTMLButtonElement>) {
			// A browser force-blurs a focused control the instant its `disabled`
			// attribute is set, and that blur arrives with the attribute already
			// applied. It is precisely the case the reclaim above exists for, so it
			// must not clear the flag; every other blur does.
			if (event.currentTarget.disabled) return;
			hasDomFocusRef.current = false;
		}

		function handleKeydown(event: KeyboardEvent<HTMLButtonElement>) {
			if (!context || isDisabled) return;
			const horizontal = context.orientation === "horizontal";
			switch (event.key) {
				case "ArrowRight":
					if (!horizontal) return;
					event.preventDefault();
					context.move(value, 1);
					break;
				case "ArrowLeft":
					if (!horizontal) return;
					event.preventDefault();
					context.move(value, -1);
					break;
				case "ArrowDown":
					if (horizontal) return;
					event.preventDefault();
					context.move(value, 1);
					break;
				case "ArrowUp":
					if (horizontal) return;
					event.preventDefault();
					context.move(value, -1);
					break;
				case "Home":
					event.preventDefault();
					context.moveToEdge("first");
					break;
				case "End":
					event.preventDefault();
					context.moveToEdge("last");
					break;
				// Enter/Space need no case here: a native <button> already fires a
				// click for both, and handleClick selects — in both activation
				// modes, since manual activation only withholds selection from the
				// *arrow* keys, not from an explicit activation key.
			}
		}

		return (
			<button
				ref={setRef}
				type="button"
				role="tab"
				data-ft-tabs-trigger=""
				data-value={value}
				data-orientation={orientation}
				data-variant={variant}
				id={context?.triggerId(value)}
				className={classes}
				disabled={isDisabled}
				aria-selected={isSelected}
				aria-controls={context?.panelId(value)}
				tabIndex={tabIndexAttr}
				onClick={handleClick}
				onFocus={handleFocus}
				onBlur={handleBlur}
				onKeyDown={handleKeydown}
			>
				{children}
			</button>
		);
	}
);

TabsTrigger.displayName = "TabsTrigger";
