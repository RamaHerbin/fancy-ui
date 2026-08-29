import { forwardRef, useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { TOGGLE_GROUP_KEY } from "./types.js";
import type { ToggleGroupContext } from "./types.js";
import "./toggle-group.css";

export interface ToggleGroupProps {
	/** Whether one item can be active at a time, or several. Defaults to `"single"`. */
	type?: "single" | "multiple";
	/**
	 * The active value(s) — a string when `type="single"`, an array of strings
	 * when `type="multiple"`. Omit it entirely to let the group own its own
	 * selection and report every change through `onValueChange`.
	 */
	value?: string | string[];
	/** Called with the new value, shaped to match `type`, whenever the selection changes. */
	onValueChange?: (value: string | string[]) => void;
	/** Disables every item in the group. */
	disabled?: boolean;
	/** Sizes every item. */
	size?: "sm" | "md" | "lg";
	/** The rail's stacking axis. Arrow keys work in both pairs regardless — see the README. */
	orientation?: "horizontal" | "vertical";
	/** Accessible name for the group. */
	label?: string;
	/** The `ToggleGroupItem`s. */
	children?: ReactNode;
	/** Additional CSS classes */
	className?: string;
}

/**
 * A rail of mutually-aware toggles with one selection model and one roving
 * tab stop.
 *
 * The root element arrives through the ref channel rather than a `ref` prop,
 * per PORTING.md — the Svelte source declares `ref = $bindable(null)`.
 *
 * Rest props are not spread: the Svelte source reads only these props off
 * `$props()` and has no `...restProps`, so the port carries no wider
 * attribute surface than the component it mirrors.
 */
export const ToggleGroup = forwardRef<HTMLDivElement, ToggleGroupProps>(
	(
		{
			type = "single",
			value: valueProp,
			onValueChange,
			disabled = false,
			size = "md",
			orientation = "horizontal",
			label,
			children,
			className,
		},
		forwardedRef
	) => {
		// The root queries its own subtree in `orderedEnabledButtons`, and the
		// consumer may also want the node. A plain ref rather than
		// `useElementRef`: nothing here is a hook keyed on the node's
		// existence (convention C-1's hazard) — the node is only ever read
		// from inside an event handler, by which time it is long since
		// attached — and a ref keeps every callback below identity-stable.
		const rootRef = useRef<HTMLDivElement | null>(null);
		const setRootRef = useComposedRefs(forwardedRef, rootRef);

		// The Svelte source's `value` is `$bindable("")`: a consumer can bind
		// it, or leave it alone and let the component keep writing its own
		// copy. React has no such channel, so the prop is controlled when it
		// is passed and this local copy takes over when it is not. Either way
		// `onValueChange` fires with the same shape.
		const [uncontrolledValue, setUncontrolledValue] = useState<string | string[]>("");
		const isControlled = valueProp !== undefined;
		const value = isControlled ? valueProp : uncontrolledValue;

		// The public prop is a string or an array depending on `type`; everything
		// below works off one normalised shape so `isSelected`/`toggle` never
		// have to branch on which one they were handed.
		function toArray(current: string | string[]): string[] {
			if (type === "single") {
				// A single-select group has at most one active value, whatever
				// shape arrives — a caller handing it an array anyway (leftover
				// state from a `type` prop that used to be `"multiple"`, say)
				// gets just the first entry rather than every item lighting up
				// as selected at once.
				if (Array.isArray(current)) return current.length > 0 ? [current[0]!] : [];
				return current === "" ? [] : [current];
			}
			return Array.isArray(current) ? current : current === "" ? [] : [current];
		}

		const selected = toArray(value);

		// Values currently taking part in roving focus. A disabled item never
		// appears here — see ToggleGroupItem's registration effect — so this
		// list doubles as "mounted and enabled, in the order each one arrived".
		const [registeredOrder, setRegisteredOrder] = useState<string[]>([]);

		const [focusedValueState, setFocusedValueState] = useState<string | null>(null);

		function isSelected(itemValue: string): boolean {
			return selected.includes(itemValue);
		}

		function commit(next: string[]) {
			if (type === "single") {
				const shaped = next[0] ?? "";
				if (!isControlled) setUncontrolledValue(shaped);
				onValueChange?.(shaped);
			} else {
				if (!isControlled) setUncontrolledValue(next);
				onValueChange?.(next);
			}
		}

		function toggle(itemValue: string) {
			if (disabled) return;
			const current = toArray(value);
			const isOn = current.includes(itemValue);
			if (type === "single") {
				// Activating the already-active item clears the selection instead of
				// no-op-ing — the one state a native radio group can't express, and
				// the brief this component follows asks for it explicitly.
				commit(isOn ? [] : [itemValue]);
			} else {
				commit(isOn ? current.filter((v) => v !== itemValue) : [...current, itemValue]);
			}
		}

		// Both functions are commands, invoked from a ToggleGroupItem's own
		// effect — first to register on mount, then again as that same
		// effect's cleanup, to unregister. They are the one part of the
		// context that MUST keep a stable identity across renders: the item
		// lists them in its effect's dependency array, so a fresh function per
		// root render would re-run that effect on every root render, and the
		// re-run's cleanup (unregister) plus body (register) would alternate
		// forever. The updater also returns the array unchanged when there is
		// nothing to do, so a repeated register never schedules a render.
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
		 * The item buttons in actual DOM order, filtered to the enabled ones.
		 * Queried fresh on every call instead of cached, so a reordered or
		 * newly-mounted item is correct on the very next arrow press even though
		 * nothing about mounting or registration told this component the order
		 * had changed.
		 */
		const orderedEnabledButtons = useCallback((): HTMLButtonElement[] => {
			const root = rootRef.current;
			if (!root) return [];
			return Array.from(
				root.querySelectorAll<HTMLButtonElement>("[data-ft-toggle-item]:not(:disabled)")
			);
		}, []);

		const goTo = useCallback((button: HTMLButtonElement) => {
			const nextValue = button.dataset.value;
			if (nextValue === undefined) return;
			setFocusedValueState(nextValue);
			button.focus();
		}, []);

		const move = useCallback(
			(from: string, delta: number) => {
				const buttons = orderedEnabledButtons();
				if (buttons.length === 0) return;
				const fromIndex = buttons.findIndex((el) => el.dataset.value === from);
				const base = fromIndex === -1 ? 0 : fromIndex;
				const nextIndex = (((base + delta) % buttons.length) + buttons.length) % buttons.length;
				goTo(buttons[nextIndex]!);
			},
			[goTo, orderedEnabledButtons]
		);

		const moveToEdge = useCallback(
			(edge: "first" | "last") => {
				const buttons = orderedEnabledButtons();
				if (buttons.length === 0) return;
				goTo(edge === "first" ? buttons[0]! : buttons[buttons.length - 1]!);
			},
			[goTo, orderedEnabledButtons]
		);

		// Recomputed on every render, so it settles the instant an item
		// registers, unregisters, or flips disabled — including when the item
		// that currently holds the roving position is the one that disappears.
		let focusedValue: string | null = null;
		if (focusedValueState !== null && registeredOrder.includes(focusedValueState)) {
			focusedValue = focusedValueState;
		} else if (registeredOrder.length > 0) {
			// Prefer the selected item so Tab lands on the active choice;
			// otherwise the first item to have registered.
			focusedValue = registeredOrder.find((v) => selected.includes(v)) ?? registeredOrder[0]!;
		}

		// Rebuilt on every render rather than memoised, and that rebuild is what
		// re-renders the items — the React counterpart of the Svelte context's
		// live getters. A memo would have to be keyed on `selected`, which is a
		// fresh array each render by construction (its shape depends on `type`),
		// so the memo would either never hit or need a hand-rolled
		// serialisation. Nothing under a toggle rail is expensive enough to buy
		// that back. The two members an item depends on by identity —
		// `register` and `unregister` — are stable regardless.
		const context: ToggleGroupContext = {
			type,
			value: selected,
			disabled,
			size,
			orientation,
			isSelected,
			toggle,
			register,
			unregister,
			focusedValue,
			focus,
			move,
			moveToEdge,
		};

		return (
			<TOGGLE_GROUP_KEY.Provider value={context}>
				<div
					ref={setRootRef}
					className={cn(
						"ft-toggle-group border-border bg-background inline-flex w-fit border",
						orientation === "vertical" ? "flex-col" : "flex-row",
						className
					)}
					data-orientation={orientation}
					role="group"
					aria-label={label}
				>
					{children}
				</div>
			</TOGGLE_GROUP_KEY.Provider>
		);
	}
);

ToggleGroup.displayName = "ToggleGroup";
