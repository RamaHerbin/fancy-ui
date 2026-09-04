import { forwardRef, useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useFancyId } from "../../internals/use-id.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { TABS_KEY } from "./types.js";
import type { TabsContext } from "./types.js";
import "./tabs.css";

export interface TabsProps {
	/**
	 * The active tab's value. Passing it makes the selection controlled — the
	 * React counterpart of the Svelte source's `$bindable`; omit it entirely to
	 * let the root own its own selection and report every change through
	 * `onValueChange`.
	 */
	value?: string;
	/** Called with the new value whenever the active tab changes. */
	onValueChange?: (value: string) => void;
	/** The tablist's stacking axis and which arrow-key pair moves it. Defaults to `"horizontal"`. */
	orientation?: "horizontal" | "vertical";
	/**
	 * Whether arrowing to a trigger selects it immediately (`"automatic"`),
	 * or only moves focus, leaving Enter/Space to select (`"manual"`).
	 * Defaults to `"automatic"`.
	 */
	activation?: "automatic" | "manual";
	/** Accent underline, or a segmented pill rail. Defaults to `"underline"`. */
	variant?: "underline" | "segmented";
	/** A `TabsList` and one or more `TabsContent`s. */
	children?: ReactNode;
	/** Additional CSS classes. */
	className?: string;
	/**
	 * Plays the select cue through the sound controller. Off by default;
	 * only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

/**
 * The root of the tabs compound: it owns the active value, the roving-focus
 * position, and the id pair every trigger/panel couple is wired up with.
 *
 * The root element arrives through the ref channel rather than a `ref` prop,
 * per PORTING.md — the Svelte source declares `ref = $bindable(null)`.
 *
 * Rest props are not spread: the Svelte source reads only these props off
 * `$props()` and has no `...restProps`, so the port carries no wider attribute
 * surface than the component it mirrors.
 */
export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
	(
		{
			value: valueProp,
			onValueChange,
			orientation = "horizontal",
			activation = "automatic",
			variant = "underline",
			children,
			className,
			sound = false,
		},
		forwardedRef
	) => {
		// The root queries its own subtree in `orderedEnabledButtons`, and the
		// consumer may also want the node. A plain ref rather than
		// `useElementRef`: nothing here is a hook keyed on the node's existence
		// (convention C-1's hazard) — the node is only ever read from inside an
		// event handler or an effect, by which time it is long since attached —
		// and a ref keeps every callback below identity-stable.
		const rootRef = useRef<HTMLDivElement | null>(null);
		const setRootRef = useComposedRefs(forwardedRef, rootRef);

		// SSR-stable: `internals/use-id.js`'s `uid()` is client-only, and
		// trigger/panel ids must already agree on the very first server-rendered
		// paint so `aria-controls`/`aria-labelledby` are correct before hydration.
		const uid = useFancyId();

		const playCue = useSoundCue(sound);

		// The Svelte source's `value` is `$bindable("")`: a consumer can bind it,
		// or leave it alone and let the component keep writing its own copy.
		// React has no such channel, so the prop is controlled when it is passed
		// and this local copy takes over when it is not. Either way
		// `onValueChange` fires with the same value.
		const [uncontrolledValue, setUncontrolledValue] = useState("");
		const isControlled = valueProp !== undefined;
		const value = isControlled ? valueProp : uncontrolledValue;

		function isSelected(itemValue: string): boolean {
			return value === itemValue;
		}

		// The only place `value` changes.
		//
		// The cue is guarded on an actual move: re-activating the tab that is
		// already active is silent, while `onValueChange` fires either way. The
		// comparison has to happen before the write, exactly as it does in the
		// source, so the guard reads the outgoing value rather than the one it
		// is about to become.
		function select(itemValue: string) {
			const changed = value !== itemValue;
			if (!isControlled) setUncontrolledValue(itemValue);
			if (changed) playCue("select");
			onValueChange?.(itemValue);
		}

		// Values currently taking part in roving focus. A disabled trigger never
		// appears here — see TabsTrigger's registration effect — so this list
		// doubles as "mounted and enabled, in the order each one arrived". Used
		// only as the pre-interaction tabbable fallback; `move`/`moveToEdge`
		// below re-query the live DOM instead of trusting this order, exactly
		// like ToggleGroup.
		const [registeredOrder, setRegisteredOrder] = useState<string[]>([]);

		const [focusedValueState, setFocusedValueState] = useState<string | null>(null);

		// Both functions are commands, invoked from a TabsTrigger's own effect —
		// first to register on mount, then again as that same effect's cleanup,
		// to unregister. They are the one part of the context that MUST keep a
		// stable identity across renders: the trigger lists them in its effect's
		// dependency array, so a fresh function per root render would re-run that
		// effect on every root render, and the re-run's cleanup (unregister) plus
		// body (register) would alternate forever. See the note on
		// `TabsContext.register` — this codebase has already shipped that
		// infinite loop once, on ToggleGroup.
		const register = useCallback((itemValue: string) => {
			setRegisteredOrder((order) => (order.includes(itemValue) ? order : [...order, itemValue]));
		}, []);

		const unregister = useCallback((itemValue: string) => {
			setRegisteredOrder((order) => {
				const index = order.indexOf(itemValue);
				if (index === -1) return order;
				const next = order.slice();
				next.splice(index, 1);
				return next;
			});
		}, []);

		const focus = useCallback((itemValue: string) => {
			setFocusedValueState(itemValue);
		}, []);

		/**
		 * The trigger buttons in actual DOM order, filtered to the enabled ones.
		 * Queried fresh on every call instead of cached, so a reordered or
		 * newly-mounted trigger is correct on the very next arrow press even
		 * though nothing about mounting or registration told this component the
		 * order had changed.
		 */
		const orderedEnabledButtons = useCallback((): HTMLButtonElement[] => {
			const root = rootRef.current;
			if (!root) return [];
			return Array.from(
				root.querySelectorAll<HTMLButtonElement>("[data-ft-tabs-trigger]:not(:disabled)")
			);
		}, []);

		function goTo(button: HTMLButtonElement) {
			const nextValue = button.dataset.value;
			if (nextValue === undefined) return;
			setFocusedValueState(nextValue);
			button.focus();
			// Fused focus+select: with automatic activation, arrowing onto a tab
			// is what activates it — the WAI-ARIA Tabs pattern's default. Manual
			// activation only moves focus here; the trigger's own click handler
			// (which a native button already fires for Enter/Space) selects.
			if (activation === "automatic") select(nextValue);
		}

		function move(from: string, delta: number) {
			const buttons = orderedEnabledButtons();
			if (buttons.length === 0) return;
			const fromIndex = buttons.findIndex((el) => el.dataset.value === from);
			const base = fromIndex === -1 ? 0 : fromIndex;
			const nextIndex = (((base + delta) % buttons.length) + buttons.length) % buttons.length;
			goTo(buttons[nextIndex]!);
		}

		function moveToEdge(edge: "first" | "last") {
			const buttons = orderedEnabledButtons();
			if (buttons.length === 0) return;
			goTo(edge === "first" ? buttons[0]! : buttons[buttons.length - 1]!);
		}

		// Deliberately does not call `select` — unlike `goTo`, which arrow-key
		// navigation drives and which fuses focus with selection under automatic
		// activation. This is used to *reclaim* DOM focus after a trigger
		// disappears out from under it (going disabled), and disabling the
		// selected trigger must not change the selection or the visible panel —
		// only where DOM focus lands.
		//
		// Identity-stable: a trigger reads it from an effect's dependency list.
		const focusElement = useCallback(
			(itemValue: string) => {
				const button = orderedEnabledButtons().find((el) => el.dataset.value === itemValue);
				if (!button) return;
				setFocusedValueState(itemValue);
				button.focus();
			},
			[orderedEnabledButtons]
		);

		// Recomputed on every render, so it settles the instant a trigger
		// registers, unregisters, or flips disabled — including when the trigger
		// that currently holds the roving position is the one that disappears.
		let focusedValue: string | null = null;
		if (focusedValueState !== null && registeredOrder.includes(focusedValueState)) {
			focusedValue = focusedValueState;
		} else if (registeredOrder.length > 0) {
			// Prefer the selected tab so Tab lands on the active one; otherwise
			// the first trigger to have registered.
			focusedValue = registeredOrder.find((v) => v === value) ?? registeredOrder[0]!;
		}

		// Rebuilt on every render rather than memoised, and that rebuild is what
		// re-renders the pieces below — the React counterpart of the Svelte
		// context's live getters. The three members a trigger depends on by
		// identity — `register`, `unregister` and `focusElement` — are stable
		// regardless.
		const context: TabsContext = {
			value,
			orientation,
			activation,
			variant,
			isSelected,
			select,
			register,
			unregister,
			focusedValue,
			focus,
			move,
			moveToEdge,
			focusElement,
			triggerId(itemValue) {
				return `${uid}-trigger-${itemValue}`;
			},
			panelId(itemValue) {
				return `${uid}-panel-${itemValue}`;
			},
		};

		return (
			<TABS_KEY.Provider value={context}>
				<div ref={setRootRef} className={cn("ft-tabs", className)} data-orientation={orientation}>
					{children}
				</div>
			</TABS_KEY.Provider>
		);
	}
);

Tabs.displayName = "Tabs";
