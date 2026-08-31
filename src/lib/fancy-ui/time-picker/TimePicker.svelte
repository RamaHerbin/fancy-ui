<script lang="ts" module>
	export interface TimePickerProps {
		/** The selected time, or `null` for none; bindable. Always "HH:mm", 24-hour — see the README. */
		value?: string | null;
		/** Called with the new value whenever a slot is picked. */
		onValueChange?: (value: string | null) => void;
		/** Minutes between generated slots. Defaults to 30. See the README for what happens when it doesn't divide the hour evenly. */
		step?: number;
		/** Earliest selectable slot ("HH:mm", inclusive). */
		min?: string;
		/** Latest selectable slot ("HH:mm", inclusive). */
		max?: string;
		/** Display only — the trigger and slot labels use a 12-hour clock with AM/PM when true. The value stays "HH:mm" either way. */
		hour12?: boolean;
		/** Blocks opening the panel; excluded from form submission. Overridden by a surrounding FormField. */
		disabled?: boolean;
		/** Marks the field required for the surrounding form. Overridden by a surrounding FormField. */
		required?: boolean;
		/** Drives the error border and `aria-invalid`. Overridden by a surrounding FormField. */
		invalid?: boolean;
		/** Element id. Overridden by a surrounding FormField's own `controlId`. */
		id?: string;
		/** Native `name` — when set, a hidden input carries the "HH:mm" value so the control participates in real form submission. */
		name?: string;
		/** Accessible name — for a control with no visible Label next to it. */
		label?: string;
		/** Shown in the trigger while no time is selected. */
		placeholder?: string;
		/** BCP 47 locale for slot and trigger-label formatting. Defaults to the runtime's own locale. */
		locale?: string;
		/** Additional CSS classes, merged onto the trigger button. */
		class?: string;
		/** Bindable reference to the trigger button. */
		ref?: HTMLButtonElement | null;
		/**
		 * Plays the matching interface cue through the sound controller. Off by
		 * default; only audible once the user has enabled sound.
		 */
		sound?: boolean;
	}
</script>

<script lang="ts">
	import { onDestroy, setContext, tick } from "svelte";
	import { cn } from "$lib/utils.js";
	import { getField } from "../_internals/field.svelte.js";
	import { createListbox } from "../_internals/listbox.svelte.js";
	import { filterByBounds, formatSlotLabel, generateSlots, nearestIndex } from "./time-utils.js";
	import { TIME_PICKER_KEY, type TimePickerContext } from "./types.js";
	import TimePickerPanel from "./TimePickerPanel.svelte";
	import { sound as soundFx } from "../sound/sound.svelte.js";

	let {
		value = $bindable(null),
		onValueChange,
		step = 30,
		min,
		max,
		hour12 = false,
		disabled = false,
		required = false,
		invalid = false,
		id,
		name,
		label,
		placeholder = "Select a time",
		locale,
		class: className,
		ref = $bindable(null),
		sound = false,
	}: TimePickerProps = $props();

	// Undefined outside a FormField — every derived below then falls back to
	// this component's own props instead of the context, so the control works
	// standalone exactly as it does wrapped. The root is a real `<button>`, a
	// labelable element, so a wrapping FormField's own `<Label for>` targets
	// `controlId` directly.
	const field = getField();

	const effectiveId = $derived(field?.controlId ?? id);
	const effectiveDisabled = $derived(field?.disabled ?? disabled);
	const effectiveRequired = $derived(field?.required ?? required);
	const effectiveInvalid = $derived(field?.invalid ?? invalid);

	// `$props.id()`, not `_internals/id.js`'s `uid()`: this seeds the panel and
	// option ids, which must already agree with themselves on the very first
	// server-rendered paint.
	const uid = $props.id();
	const panelId = `${uid}-listbox`;
	function optionId(index: number): string {
		return `${uid}-option-${index}`;
	}

	let open = $state(false);
	let panelRef: HTMLDivElement | null = $state(null);

	const slots = $derived(filterByBounds(generateSlots(step), min, max));
	const selectedIndex = $derived(value ? slots.indexOf(value) : -1);

	function labelFor(slot: string): string {
		return formatSlotLabel(slot, hour12, locale);
	}

	// The single place `value` changes, in either direction (bind:value or
	// onValueChange) — a plain function, not an `$effect`, so it never reads
	// and writes `value` in the same reactive pass and never fights a
	// caller's own `bind:value` write.
	/** Returns true when the value actually changed (and a `select` cue played). */
	function setValue(next: string | null): boolean {
		if (value === next) return false;
		value = next;
		if (sound) soundFx.play("select");
		onValueChange?.(next);
		return true;
	}

	function commitIndex(index: number): boolean {
		const slot = slots[index];
		if (!slot) return false;
		return setValue(slot);
	}

	function scrollActiveIntoView(index: number): void {
		const row = panelRef?.querySelector<HTMLElement>(`#${CSS.escape(optionId(index))}`);
		row?.scrollIntoView?.({ block: "nearest" });
	}

	const listbox = createListbox({
		count: () => slots.length,
		onActiveChange: scrollActiveIntoView,
	});

	onDestroy(() => listbox.destroy());

	function openPanel(): void {
		if (effectiveDisabled) return;
		open = true;
		if (sound) soundFx.play("open");
		const index = nearestIndex(slots, value);
		if (index === -1) return;
		listbox.setActive(index);
		// Always scrolled into view on open, not only relying on
		// `onActiveChange` — that callback only fires when the index actually
		// *changes*, and a reopen can land on the same index a previous
		// session left active, which must still be visible the instant the
		// panel appears rather than only after the next arrow press.
		tick().then(() => scrollActiveIntoView(index));
	}

	// `reason` distinguishes a commit-flavoured close (a slot was just picked)
	// from a plain dismiss (Escape, an outside click, or the trigger toggling
	// the panel shut with nothing committed). Only a dismiss plays the `close`
	// cue — a commit already played `select` inside `setValue` above, and the
	// contract is one cue per interaction, never both.
	function closePanel(reason: "commit" | "dismiss" = "dismiss"): void {
		open = false;
		if (sound && reason === "dismiss") soundFx.play("close");
	}

	function commitActiveAndClose(): void {
		const committed = listbox.activeIndex !== -1 && commitIndex(listbox.activeIndex);
		closePanel(committed ? "commit" : "dismiss");
	}

	function handleTriggerClick(): void {
		if (effectiveDisabled) return;
		if (open) closePanel();
		else openPanel();
		// Deliberate, not incidental: a plain `<button>` is only guaranteed to
		// take focus on click in some browsers (macOS Safari notably does not,
		// by default) — the same reason ToggleGroupItem's own click handler
		// does this. Focus needs to be on the trigger for the keyboard
		// interactions below (arrows, Home/End, Enter) to have anything to
		// attach to right after a mouse open.
		ref?.focus();
	}

	// No Escape handling here on purpose — `TimePickerPanel`'s own
	// `dismissable` already closes on Escape (and an outside click) via the
	// document-level listener it owns; a second listener here would be the
	// exact bug this wave already had to remove once. Because Escape only
	// ever closes and closing never itself writes `value`, "Escape closes
	// without committing" falls out for free.
	function handleTriggerKeydown(event: KeyboardEvent): void {
		if (effectiveDisabled) return;

		if (!open) {
			switch (event.key) {
				case "Enter":
				case " ":
				case "ArrowDown":
				case "ArrowUp":
					event.preventDefault();
					openPanel();
					return;
				default:
					return;
			}
		}

		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				listbox.move(1);
				return;
			case "ArrowUp":
				event.preventDefault();
				listbox.move(-1);
				return;
			case "Home":
				event.preventDefault();
				listbox.moveToEdge("first");
				return;
			case "End":
				event.preventDefault();
				listbox.moveToEdge("last");
				return;
			case "Enter":
			case " ":
				event.preventDefault();
				commitActiveAndClose();
				return;
		}
	}

	const context: TimePickerContext = {
		get open() {
			return open;
		},
		get panelId() {
			return panelId;
		},
		get slots() {
			return slots;
		},
		get activeIndex() {
			return listbox.activeIndex;
		},
		labelFor,
		get triggerRef() {
			return ref;
		},
		optionId,
		isSelected(index: number) {
			return index === selectedIndex;
		},
		isActive(index: number) {
			return index === listbox.activeIndex;
		},
		setActive(index: number) {
			listbox.setActive(index);
		},
		commit(index: number) {
			const committed = commitIndex(index);
			closePanel(committed ? "commit" : "dismiss");
		},
		// `dismissable` calls `onDismiss()` with zero arguments, so the default
		// parameter above already resolves this to a plain dismiss — no wrapper
		// needed to keep a stray argument from becoming the reason.
		close: closePanel,
	};
	setContext(TIME_PICKER_KEY, context);

	const triggerLabel = $derived(value ? labelFor(value) : undefined);

	const classes = $derived(
		cn(
			"ft-time-picker-trigger flex w-full items-center justify-between gap-2 rounded-[8px] border border-input bg-background px-[12px] py-[9px] text-left text-[13px] text-foreground transition-colors",
			"focus-visible:outline-none",
			"disabled:cursor-not-allowed disabled:opacity-50",
			effectiveInvalid && "border-destructive/50",
			className
		)
	);
</script>

<button
	bind:this={ref}
	id={effectiveId}
	type="button"
	role="combobox"
	aria-haspopup="listbox"
	aria-expanded={open}
	aria-controls={open ? panelId : undefined}
	aria-activedescendant={open && listbox.activeIndex !== -1
		? optionId(listbox.activeIndex)
		: undefined}
	aria-invalid={effectiveInvalid ? "true" : undefined}
	aria-required={effectiveRequired ? "true" : undefined}
	aria-describedby={field?.describedBy}
	aria-label={label}
	disabled={effectiveDisabled}
	class={classes}
	onclick={handleTriggerClick}
	onkeydown={handleTriggerKeydown}
>
	<span class={triggerLabel ? undefined : "text-muted-foreground"}>
		{triggerLabel ?? placeholder}
	</span>
	<span aria-hidden="true" class="text-muted-foreground">◷</span>
</button>

{#if name}
	<input type="hidden" {name} value={value ?? ""} disabled={effectiveDisabled} />
{/if}

{#if open}
	<TimePickerPanel bind:ref={panelRef} />
{/if}

<style>
	.ft-time-picker-trigger:focus-visible {
		--ft-field-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
		border-color: var(--ft-field-accent);
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-field-accent) 25%, transparent);
	}
</style>
