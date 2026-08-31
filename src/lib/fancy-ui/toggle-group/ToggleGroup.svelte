<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface ToggleGroupProps {
		/** Whether one item can be active at a time, or several. Defaults to `"single"`. */
		type?: "single" | "multiple";
		/**
		 * The active value(s), bindable — a string when `type="single"`, an
		 * array of strings when `type="multiple"`.
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
		children?: Snippet;
		/** Additional CSS classes */
		class?: string;
		/** Element reference */
		ref?: HTMLDivElement | null;
		/**
		 * Plays the matching interface cue through the sound controller. Off by
		 * default; only audible once the user has enabled sound.
		 */
		sound?: boolean;
	}
</script>

<script lang="ts">
	import { setContext, untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { sound as soundFx } from "../sound/sound.svelte.js";
	import { TOGGLE_GROUP_KEY, type ToggleGroupContext } from "./types.js";

	let {
		type = "single",
		value = $bindable(""),
		onValueChange,
		disabled = false,
		size = "md",
		orientation = "horizontal",
		label,
		children,
		class: className,
		ref = $bindable(null),
		sound = false,
	}: ToggleGroupProps = $props();

	// The public prop is a string or an array depending on `type`; everything
	// below works off one normalised shape so `isSelected`/`toggle` never
	// have to branch on which one they were handed. A plain function, not
	// only the `$derived` below: `toggle` calls this itself, synchronously,
	// in the same breath as the write that follows it, and a derived read at
	// that point cannot be trusted to already reflect a prop this same
	// component is chained to through more than one bindable hop — see the
	// note on `toggle`.
	function toArray(current: string | string[]): string[] {
		if (type === "single") {
			// A single-select group has at most one active value, whatever
			// shape arrives — a caller handing it an array anyway (leftover
			// state from a `type` prop that used to be `"multiple"`, say)
			// gets just the first entry rather than every item lighting up
			// as selected at once.
			if (Array.isArray(current)) return current.length > 0 ? [current[0]] : [];
			return current === "" ? [] : [current];
		}
		return Array.isArray(current) ? current : current === "" ? [] : [current];
	}

	const selected = $derived.by(() => toArray(value));

	// Values currently taking part in roving focus. A disabled item never
	// appears here — see ToggleGroupItem's registration effect — so this
	// list doubles as "mounted and enabled, in the order each one arrived".
	// A plain $state array rather than a Set: Svelte's deep proxy tracks
	// push/splice on arrays, but a bare `$state(new Set())` would not
	// notify subscribers on `.add`/`.delete`.
	let registeredOrder = $state<string[]>([]);

	let focusedValueState = $state<string | null>(null);

	function isSelected(itemValue: string): boolean {
		return selected.includes(itemValue);
	}

	function commit(next: string[]) {
		if (type === "single") {
			value = next[0] ?? "";
			onValueChange?.(next[0] ?? "");
		} else {
			value = next;
			onValueChange?.(next);
		}
	}

	function toggle(itemValue: string) {
		if (disabled) return;
		// Read fresh, not through `selected`: this function's own write, two
		// lines down, changes the very prop `selected` is derived from, and a
		// consumer chained to `value` through a second `bind:` hop (a wrapper
		// component forwarding its own bindable, as the compound's test
		// harness does) can still be looking at the derived's pre-write
		// snapshot at this point in the tick. `value` itself never lies.
		const current = toArray(value);
		const isOn = current.includes(itemValue);
		if (sound) soundFx.play(type === "multiple" ? (isOn ? "toggle-off" : "toggle-on") : "select");
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
	// `$effect` — first to register on mount, then again as that same
	// effect's cleanup, to unregister. The *entire* body has to run inside
	// `untrack`, not just the `includes`/`indexOf` lookup: `.push()` and
	// `.splice()` also read the proxy to do their job, so untracking only the
	// lookup still leaves the mutating call itself tracked. Whichever read
	// is left outside `untrack` is enough — the calling effect ends up
	// depending on the array its own call just mutated, sees itself as stale
	// the instant the write lands, and its cleanup (unregister) and body
	// (register) alternate forever until Svelte throws
	// `effect_update_depth_exceeded`. Wrapping the whole call is what a
	// command invoked from inside an effect needs: nothing it does should be
	// attributed to that effect as a dependency. Other consumers — the
	// `focusedValue` getter below, read from each item's own `$derived` — are
	// untouched by this and still react normally when the array changes.
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
	 * The item buttons in actual DOM order, filtered to the enabled ones.
	 * Queried fresh on every call instead of cached, so a reordered or
	 * newly-mounted item is correct on the very next arrow press even though
	 * nothing about mounting or registration told this component the order
	 * had changed.
	 */
	function orderedEnabledButtons(): HTMLButtonElement[] {
		if (!ref) return [];
		return Array.from(
			ref.querySelectorAll<HTMLButtonElement>("[data-ft-toggle-item]:not(:disabled)")
		);
	}

	function goTo(button: HTMLButtonElement) {
		const nextValue = button.dataset.value;
		if (nextValue === undefined) return;
		focusedValueState = nextValue;
		button.focus();
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

	const context: ToggleGroupContext = {
		get type() {
			return type;
		},
		get value() {
			return selected;
		},
		get disabled() {
			return disabled;
		},
		get size() {
			return size;
		},
		get orientation() {
			return orientation;
		},
		isSelected,
		toggle,
		register,
		unregister,
		get focusedValue() {
			// Always read `registeredOrder` so this recomputes when an item
			// registers, unregisters, or flips disabled — including when the
			// item that currently holds the roving position is the one that
			// disappears.
			const order = registeredOrder;
			if (focusedValueState !== null && order.includes(focusedValueState)) {
				return focusedValueState;
			}
			if (order.length === 0) return null;
			// Prefer the selected item so Tab lands on the active choice;
			// otherwise the first item to have registered.
			return order.find((v) => selected.includes(v)) ?? order[0];
		},
		focus,
		move,
		moveToEdge,
	};

	setContext(TOGGLE_GROUP_KEY, context);
</script>

<div
	bind:this={ref}
	class={cn(
		"ft-toggle-group border-border bg-background inline-flex w-fit border",
		orientation === "vertical" ? "flex-col" : "flex-row",
		className
	)}
	data-orientation={orientation}
	role="group"
	aria-label={label}
>
	{#if children}
		{@render children()}
	{/if}
</div>

<style>
	/*
	 * Exact rail padding/gap/radius from the mockup — not expressible as a
	 * single Tailwind utility. The fill is `bg-background`, not `bg-muted`:
	 * this app's dark theme has `--muted` *lighter* than `--card` (0.15 vs
	 * 0.1 lightness), so a muted fill on a card-nested rail reads as raised,
	 * the opposite of the mockup's recessed strip. `--background` is the
	 * darkest token in dark mode and ties `--card` in light mode, so it can
	 * only ever read as recessed or flush with its surroundings — never
	 * inverted — at the cost of no visible fill contrast on a bare page in
	 * light mode, where the 1px border alone carries the shape.
	 */
	.ft-toggle-group {
		border-radius: 0.5rem; /* 8px */
		padding: 3px;
		gap: 2px;
	}
</style>
