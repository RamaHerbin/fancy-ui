<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import type { AccordionOrientation, AccordionType, AccordionValue } from "./accordion-core.js";

	export interface AccordionOwnProps {
		/** `"single"` keeps one item open at a time, `"multiple"` lets any number be. Defaults to `"single"`. */
		type?: AccordionType;
		/**
		 * The open item, bindable. A string for `type="single"` (`""` when none is
		 * open), a string array for `type="multiple"`.
		 */
		value?: AccordionValue;
		/** Called with the new value each time an item toggles. A string for `"single"`, an array for `"multiple"`. */
		onValueChange?: (value: AccordionValue) => void;
		/** With `type="single"`, lets the open item be closed again. Without it one item stays open once opened. Ignored for `"multiple"`. */
		collapsible?: boolean;
		/** Disables every item. */
		disabled?: boolean;
		/** The axis the items stack on, and which arrow-key pair moves focus. Defaults to `"vertical"`. */
		orientation?: AccordionOrientation;
		/** The `AccordionItem`s. */
		children?: Snippet;
		/** Additional CSS classes. */
		class?: string;
		/** Element reference. */
		ref?: HTMLDivElement | null;
	}

	/** Native `<div>` attributes and listeners are forwarded to the root. */
	export type AccordionProps = AccordionOwnProps &
		Omit<HTMLAttributes<HTMLDivElement>, keyof AccordionOwnProps>;
</script>

<script lang="ts">
	import { setContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import {
		canClose,
		navigationTarget,
		openValues,
		targetIndex,
		toggleItem,
		valueFor,
	} from "./accordion-core.js";
	import { ACCORDION_KEY, type AccordionContext } from "./types.js";

	let {
		type = "single",
		value = $bindable(),
		onValueChange,
		collapsible = false,
		disabled = false,
		orientation = "vertical",
		children,
		class: className,
		ref = $bindable(null),
		...rest
	}: AccordionProps = $props();

	// SSR-stable, like every compound here: trigger and region ids must agree on
	// the first server-rendered paint so `aria-controls` and `aria-labelledby`
	// are right before hydration.
	const uid = $props.id();

	const open = $derived(openValues(type, value));

	/** The enabled triggers of THIS accordion in screen order, read fresh on every key. */
	function enabledTriggers(): HTMLButtonElement[] {
		if (!ref) return [];
		return Array.from(
			ref.querySelectorAll<HTMLButtonElement>("[data-ft-accordion-trigger]:not(:disabled)")
		).filter((button) => button.closest("[data-ft-accordion]") === ref);
	}

	const context: AccordionContext = {
		get type() {
			return type;
		},
		get orientation() {
			return orientation;
		},
		get disabled() {
			return disabled;
		},
		isOpen: (itemValue) => open.includes(itemValue),
		isLocked: (itemValue) => open.includes(itemValue) && !canClose(type, collapsible),
		// The only place `value` changes. A plain function, not an `$effect`:
		// writing `value` from an effect would read and write the same state in
		// one pass and fight a caller's own `bind:value`.
		toggle(itemValue) {
			const next = toggleItem(type, collapsible, open, itemValue);
			if (next === null) return;
			const emitted = valueFor(type, next);
			value = emitted;
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
			buttons[index].focus();
			return true;
		},
	};

	setContext(ACCORDION_KEY, context);
</script>

<div
	{...rest}
	bind:this={ref}
	class={cn("ft-accordion w-full", className)}
	data-ft-accordion=""
	data-orientation={orientation}
	data-disabled={disabled ? "" : undefined}
>
	{#if children}
		{@render children()}
	{/if}
</div>
