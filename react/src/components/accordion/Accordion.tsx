import { forwardRef, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "../../utils.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useFancyId } from "../../internals/use-id.js";
import {
	canClose,
	navigationTarget,
	openValues,
	targetIndex,
	toggleItem,
	valueFor,
} from "./accordion-core.js";
import type { AccordionOrientation, AccordionType, AccordionValue } from "./accordion-core.js";
import { ACCORDION_KEY } from "./types.js";
import type { AccordionContext } from "./types.js";

interface AccordionOwnProps {
	/** `"single"` keeps one item open at a time, `"multiple"` lets any number be. Defaults to `"single"`. */
	type?: AccordionType;
	/**
	 * The open item. A string for `type="single"` (`""` when none is open), a
	 * string array for `type="multiple"`. Passing it makes the accordion
	 * controlled, the React counterpart of the Svelte source's `$bindable`; omit
	 * it to let the root own its value and report every change through
	 * `onValueChange`.
	 */
	value?: AccordionValue;
	/** The value an uncontrolled accordion starts with. */
	defaultValue?: AccordionValue;
	/** Called with the new value each time an item toggles. A string for `"single"`, an array for `"multiple"`. */
	onValueChange?: (value: AccordionValue) => void;
	/** With `type="single"`, lets the open item be closed again. Without it one item stays open once opened. Ignored for `"multiple"`. */
	collapsible?: boolean;
	/** Disables every item. */
	disabled?: boolean;
	/** The axis the items stack on, and which arrow-key pair moves focus. Defaults to `"vertical"`. */
	orientation?: AccordionOrientation;
	/** The `AccordionItem`s. */
	children?: ReactNode;
	/** Additional CSS classes. */
	className?: string;
}

/** Native `<div>` attributes and listeners are forwarded to the root. */
export interface AccordionProps
	extends Omit<ComponentPropsWithoutRef<"div">, keyof AccordionOwnProps>, AccordionOwnProps {}

/**
 * The root of the accordion compound: it owns which items are open and the id
 * pair every trigger/region couple is wired up with. The element arrives
 * through the ref channel rather than a `ref` prop, per PORTING.md.
 */
export const Accordion = forwardRef<HTMLDivElement, AccordionProps>(
	(
		{
			type = "single",
			value: valueProp,
			defaultValue,
			onValueChange,
			collapsible = false,
			disabled = false,
			orientation = "vertical",
			children,
			className,
			...rest
		},
		forwardedRef
	) => {
		// The root queries its own subtree when a navigation key is pressed.
		const rootRef = useRef<HTMLDivElement | null>(null);
		const setRootRef = useComposedRefs(forwardedRef, rootRef);

		// SSR-stable, like every compound here: trigger and region ids must agree
		// on the first server-rendered paint so `aria-controls` and
		// `aria-labelledby` are right before hydration.
		const uid = useFancyId();

		// Controlled when `value` is passed, with a local copy as the fallback;
		// `onValueChange` fires either way.
		const [uncontrolledValue, setUncontrolledValue] = useState<AccordionValue | undefined>(
			defaultValue
		);
		const isControlled = valueProp !== undefined;
		const value = isControlled ? valueProp : uncontrolledValue;
		const open = openValues(type, value);

		/** The enabled triggers of THIS accordion in screen order, read fresh on every key. */
		function enabledTriggers(): HTMLButtonElement[] {
			const root = rootRef.current;
			if (!root) return [];
			return Array.from(
				root.querySelectorAll<HTMLButtonElement>("[data-ft-accordion-trigger]:not(:disabled)")
			).filter((button) => button.closest("[data-ft-accordion]") === root);
		}

		const context: AccordionContext = {
			type,
			orientation,
			disabled,
			isOpen: (itemValue) => open.includes(itemValue),
			isLocked: (itemValue) => open.includes(itemValue) && !canClose(type, collapsible),
			// The only place the value changes.
			toggle(itemValue) {
				const next = toggleItem(type, collapsible, open, itemValue);
				if (next === null) return;
				const emitted = valueFor(type, next);
				if (!isControlled) setUncontrolledValue(emitted);
				onValueChange?.(emitted);
			},
			triggerId: (itemValue) => `${uid}-trigger-${itemValue}`,
			contentId: (itemValue) => `${uid}-content-${itemValue}`,
			navigate(origin, key) {
				const target = navigationTarget(orientation, key);
				if (!target) return false;
				const buttons = enabledTriggers();
				const index = targetIndex(
					buttons.length,
					buttons.indexOf(origin as HTMLButtonElement),
					target
				);
				if (index < 0) return false;
				buttons[index]?.focus();
				return true;
			},
		};

		return (
			<ACCORDION_KEY.Provider value={context}>
				<div
					{...rest}
					ref={setRootRef}
					className={cn("ft-accordion w-full", className)}
					data-ft-accordion=""
					data-orientation={orientation}
					data-disabled={disabled ? "" : undefined}
				>
					{children}
				</div>
			</ACCORDION_KEY.Provider>
		);
	}
);
Accordion.displayName = "Accordion";
