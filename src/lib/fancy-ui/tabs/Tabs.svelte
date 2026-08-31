<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface TabsProps {
		/** The active tab's value, bindable. */
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
		children?: Snippet;
		/** Additional CSS classes. */
		class?: string;
		/** Element reference. */
		ref?: HTMLDivElement | null;
		/**
		 * Plays the select cue through the sound controller. Off by default;
		 * only audible once the user has enabled sound.
		 */
		sound?: boolean;
	}
</script>

<script lang="ts">
	import { setContext, untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { TABS_KEY, type TabsContext } from "./types.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";

	let {
		value = $bindable(""),
		onValueChange,
		orientation = "horizontal",
		activation = "automatic",
		variant = "underline",
		children,
		class: className,
		ref = $bindable(null),
		sound = false,
	}: TabsProps = $props();

	// SSR-stable: `_internals/id.js`'s `uid()` is client-only, and trigger/panel
	// ids must already agree on the very first server-rendered paint so
	// `aria-controls`/`aria-labelledby` are correct before hydration.
	const uid = $props.id();

	function isSelected(itemValue: string): boolean {
		return value === itemValue;
	}

	// The only place `value` changes. A plain function, not an `$effect` —
	// writing `value` there would mean reading and writing the same state in
	// one pass, and would fight a caller's own `bind:value` write.
	function select(itemValue: string) {
		const changed = value !== itemValue;
		value = itemValue;
		if (sound && changed) soundFx.play("select");
		onValueChange?.(itemValue);
	}

	// Values currently taking part in roving focus. A disabled trigger never
	// appears here — see TabsTrigger's registration effect — so this list
	// doubles as "mounted and enabled, in the order each one arrived". Used
	// only as the pre-interaction tabbable fallback; `move`/`moveToEdge`
	// below re-query the live DOM instead of trusting this order, exactly
	// like ToggleGroup.
	let registeredOrder = $state<string[]>([]);

	let focusedValueState = $state<string | null>(null);

	// Both functions are commands, invoked from a TabsTrigger's own
	// `$effect` — first to register on mount, then again as that same
	// effect's cleanup, to unregister. The *entire* body has to run inside
	// `untrack`, not just the `includes`/`indexOf` lookup: `.push()` and
	// `.splice()` also read the proxy to do their job, so untracking only the
	// lookup still leaves the mutating call itself tracked, and the calling
	// effect ends up depending on the very array its own call mutates —
	// register/unregister then alternate forever until Svelte throws
	// `effect_update_depth_exceeded`. See ToggleGroup's identical note; this
	// codebase has already shipped that infinite loop once.
	function register(itemValue: string) {
		untrack(() => {
			if (!registeredOrder.includes(itemValue)) registeredOrder.push(itemValue);
		});
	}

	function unregister(itemValue: string) {
		untrack(() => {
			const index = registeredOrder.indexOf(itemValue);
			if (index !== -1) registeredOrder.splice(index, 1);
		});
	}

	function focus(itemValue: string) {
		focusedValueState = itemValue;
	}

	/**
	 * The trigger buttons in actual DOM order, filtered to the enabled ones.
	 * Queried fresh on every call instead of cached, so a reordered or
	 * newly-mounted trigger is correct on the very next arrow press even
	 * though nothing about mounting or registration told this component the
	 * order had changed.
	 */
	function orderedEnabledButtons(): HTMLButtonElement[] {
		if (!ref) return [];
		return Array.from(
			ref.querySelectorAll<HTMLButtonElement>("[data-ft-tabs-trigger]:not(:disabled)")
		);
	}

	function goTo(button: HTMLButtonElement) {
		const nextValue = button.dataset.value;
		if (nextValue === undefined) return;
		focusedValueState = nextValue;
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
		goTo(buttons[nextIndex]);
	}

	function moveToEdge(edge: "first" | "last") {
		const buttons = orderedEnabledButtons();
		if (buttons.length === 0) return;
		goTo(edge === "first" ? buttons[0] : buttons[buttons.length - 1]);
	}

	// Deliberately does not call `select` — unlike `goTo`, which arrow-key
	// navigation drives and which fuses focus with selection under automatic
	// activation. This is used to *reclaim* DOM focus after a trigger
	// disappears out from under it (going disabled), and disabling the
	// selected trigger must not change the selection or the visible panel —
	// only where DOM focus lands.
	function focusElement(itemValue: string) {
		const button = orderedEnabledButtons().find((el) => el.dataset.value === itemValue);
		if (!button) return;
		focusedValueState = itemValue;
		button.focus();
	}

	const context: TabsContext = {
		get value() {
			return value;
		},
		get orientation() {
			return orientation;
		},
		get activation() {
			return activation;
		},
		get variant() {
			return variant;
		},
		isSelected,
		select,
		register,
		unregister,
		get focusedValue() {
			// Always read `registeredOrder` so this recomputes when a trigger
			// registers, unregisters, or flips disabled — including when the
			// trigger that currently holds the roving position is the one that
			// disappears.
			const order = registeredOrder;
			if (focusedValueState !== null && order.includes(focusedValueState)) {
				return focusedValueState;
			}
			if (order.length === 0) return null;
			// Prefer the selected tab so Tab lands on the active one;
			// otherwise the first trigger to have registered.
			return order.find((v) => v === value) ?? order[0];
		},
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

	setContext(TABS_KEY, context);
</script>

<div bind:this={ref} class={cn("ft-tabs", className)} data-orientation={orientation}>
	{#if children}
		{@render children()}
	{/if}
</div>

<style>
	/*
	 * Declared once, here, on the compound's actual root — TabsList and
	 * TabsTrigger both read `var(--ft-nav-accent)` without redeclaring the
	 * fallback. Svelte's style scoping only affects selector matching, not
	 * custom-property inheritance, so this still cascades to both of them in
	 * the live DOM.
	 */
	.ft-tabs {
		--ft-nav-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
	}
</style>
