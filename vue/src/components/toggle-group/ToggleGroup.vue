<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface ToggleGroupProps {
	/** Whether one item can be active at a time, or several. Defaults to `"single"`. */
	type?: "single" | "multiple";
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
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from "vue";
import { cn } from "../../utils.js";
import { sound as soundFx } from "../../sound/sound.js";
import { TOGGLE_GROUP_KEY, type ToggleGroupContext } from "./types.js";

defineOptions({ name: "ToggleGroup", inheritAttrs: false });

const {
	type = "single",
	onValueChange,
	disabled = false,
	size = "md",
	orientation = "horizontal",
	label,
	class: className,
	sound = false,
} = defineProps<ToggleGroupProps>();

defineSlots<{ default?(): unknown }>();

const value = defineModel<string | string[]>("value", { default: "" });

const el = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: el });

// The public model is a string or an array depending on `type`; everything
// below works off one normalised shape so `isSelected`/`toggle` never have
// to branch on which one they were handed.
function toArray(current: string | string[]): string[] {
	if (type === "single") {
		// A single-select group has at most one active value, whatever shape
		// arrives — a caller handing it an array anyway (leftover state from a
		// `type` prop that used to be `"multiple"`, say) gets just the first
		// entry rather than every item lighting up as selected at once.
		if (Array.isArray(current)) return current.length > 0 ? [current[0]!] : [];
		return current === "" ? [] : [current];
	}
	return Array.isArray(current) ? current : current === "" ? [] : [current];
}

const selected = computed(() => toArray(value.value));

// Values currently taking part in roving focus. A disabled item never
// appears here — see ToggleGroupItem's registration effect — so this list
// doubles as "mounted and enabled, in the order each one arrived".
const registeredOrder = ref<string[]>([]);

const focusedValueState = ref<string | null>(null);

function isSelected(itemValue: string): boolean {
	return selected.value.includes(itemValue);
}

function commit(next: string[]) {
	if (type === "single") {
		value.value = next[0] ?? "";
		onValueChange?.(next[0] ?? "");
	} else {
		value.value = next;
		onValueChange?.(next);
	}
}

function toggle(itemValue: string) {
	if (disabled) return;
	// Read fresh, not through `selected`: this function's own write, two
	// lines down, changes the very model `selected` is derived from.
	const current = toArray(value.value);
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

// Both functions are commands, invoked from a ToggleGroupItem's own mount/
// unmount lifecycle — first to register on mount, then again on unmount to
// unregister. Plain array mutation: nothing here runs inside a watcher keyed
// on `registeredOrder`, so there is no Svelte-style self-triggering loop to
// guard against.
function register(itemValue: string) {
	if (!registeredOrder.value.includes(itemValue)) registeredOrder.value.push(itemValue);
}

function unregister(itemValue: string) {
	const index = registeredOrder.value.indexOf(itemValue);
	if (index !== -1) registeredOrder.value.splice(index, 1);
}

function focus(itemValue: string) {
	focusedValueState.value = itemValue;
}

/**
 * The item buttons in actual DOM order, filtered to the enabled ones.
 * Queried fresh on every call instead of cached, so a reordered or
 * newly-mounted item is correct on the very next arrow press even though
 * nothing about mounting or registration told this component the order had
 * changed.
 */
function orderedEnabledButtons(): HTMLButtonElement[] {
	if (!el.value) return [];
	return Array.from(
		el.value.querySelectorAll<HTMLButtonElement>("[data-ft-toggle-item]:not(:disabled)")
	);
}

function goTo(button: HTMLButtonElement) {
	const nextValue = button.dataset.value;
	if (nextValue === undefined) return;
	focusedValueState.value = nextValue;
	button.focus();
}

function move(from: string, delta: number) {
	const buttons = orderedEnabledButtons();
	if (buttons.length === 0) return;
	const fromIndex = buttons.findIndex((button) => button.dataset.value === from);
	const base = fromIndex === -1 ? 0 : fromIndex;
	const nextIndex = (((base + delta) % buttons.length) + buttons.length) % buttons.length;
	goTo(buttons[nextIndex]!);
}

function moveToEdge(edge: "first" | "last") {
	const buttons = orderedEnabledButtons();
	if (buttons.length === 0) return;
	goTo(edge === "first" ? buttons[0]! : buttons[buttons.length - 1]!);
}

const context: ToggleGroupContext = {
	get type() {
		return type;
	},
	get value() {
		return selected.value;
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
		// registers, unregisters, or flips disabled — including when the item
		// that currently holds the roving position is the one that
		// disappears.
		const order = registeredOrder.value;
		if (focusedValueState.value !== null && order.includes(focusedValueState.value)) {
			return focusedValueState.value;
		}
		if (order.length === 0) return null;
		// Prefer the selected item so Tab lands on the active choice;
		// otherwise the first item to have registered.
		return order.find((v) => selected.value.includes(v)) ?? order[0]!;
	},
	focus,
	move,
	moveToEdge,
};

TOGGLE_GROUP_KEY.provide(context);
</script>

<template>
	<div
		ref="el"
		:class="
			cn(
				'ft-toggle-group border-border bg-background inline-flex w-fit border',
				orientation === 'vertical' ? 'flex-col' : 'flex-row',
				className
			)
		"
		:data-orientation="orientation"
		role="group"
		:aria-label="label"
	>
		<slot />
	</div>
</template>

<style scoped>
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
