<script lang="ts" module>
	import type { ComboboxOption } from "./types.js";

	export type { ComboboxOption };

	export interface ComboboxProps {
		/** The closed set of selectable options. A value outside this list is never valid. */
		options: ComboboxOption[];
		/** The selected option's value, or "" when nothing is selected. Bindable. */
		value?: string;
		/** Called with the new value whenever the selection commits — a row click, Enter on the active row, or a caller writing `value` never fires this itself. */
		onValueChange?: (value: string) => void;
		/** Shown while the field is empty and nothing is selected. */
		placeholder?: string;
		/** Blocks focus and typing; excluded from form submission. Overridden by a surrounding FormField. */
		disabled?: boolean;
		/** Native `required`. Overridden by a surrounding FormField. */
		required?: boolean;
		/** Drives the error border and `aria-invalid`. Overridden by a surrounding FormField. */
		invalid?: boolean;
		/** Element id. Overridden by a surrounding FormField's own `controlId`. */
		id?: string;
		/** Native `name` — submitted via a hidden input carrying `value`, since the visible field displays the option's label, not its value. */
		name?: string;
		/** Accessible name — for a control with no visible Label next to it. */
		label?: string;
		/** Matches an option against the current query. Default: case-insensitive substring match on `label`. */
		filter?: (option: ComboboxOption, query: string) => boolean;
		/** Shown in the panel when no option matches the current query. */
		emptyMessage?: string;
		/** Additional CSS classes. */
		class?: string;
		/** Bindable reference to the input element. */
		ref?: HTMLInputElement | null;
	}
</script>

<script lang="ts">
	import { setContext, untrack, onDestroy } from "svelte";
	import { cn } from "$lib/utils.js";
	import { getField } from "../_internals/field.svelte.js";
	import { createListbox } from "../_internals/listbox.svelte.js";
	import { defaultFilter } from "./match.js";
	import { COMBOBOX_KEY, type ComboboxContext } from "./types.js";
	import ComboboxPanel from "./ComboboxPanel.svelte";

	let {
		options,
		value = $bindable(""),
		onValueChange,
		placeholder,
		disabled = false,
		required = false,
		invalid = false,
		id,
		name,
		label,
		filter,
		emptyMessage = "No results",
		class: className,
		ref = $bindable(null),
	}: ComboboxProps = $props();

	// Undefined outside a FormField — every derived below then falls back to
	// this component's own props instead of the context, so the control works
	// standalone exactly as it does wrapped. Same convention as Input.
	const field = getField();

	const uid = $props.id();
	const effectiveId = $derived(field?.controlId ?? id ?? `${uid}-input`);
	const effectiveDisabled = $derived(field?.disabled ?? disabled);
	const effectiveRequired = $derived(field?.required ?? required);
	const effectiveInvalid = $derived(field?.invalid ?? invalid);
	const panelId = `${uid}-listbox`;

	function findOption(val: string): ComboboxOption | undefined {
		return options.find((o) => o.value === val);
	}

	function matches(option: ComboboxOption, q: string): boolean {
		return filter ? filter(option, q) : defaultFilter(option.label, q);
	}

	// Filtering is computed as a plain function, not only as the `$derived`
	// below, so it can also be called directly from handlers that just wrote
	// `query` in the same pass (see `handleInput`) — reading the memoized
	// `filteredOptions` there instead would mean reading a derived in the same
	// synchronous call that wrote its own dependency, which risks seeing the
	// pre-write list. Calling this function fresh sidesteps that entirely.
	function computeFilteredOptions(q: string): ComboboxOption[] {
		// While the visible text still equals the selected option's own label —
		// true both before the user has touched the field at all and right
		// after a fresh selection — nothing is filtered out, so opening the
		// panel browses the whole list rather than the one row that happens to
		// still be typed in. The moment the visible text diverges from that
		// label, real filtering kicks in.
		const selectedLabel = findOption(value)?.label ?? "";
		if (q === selectedLabel) return options;
		return options.filter((o) => matches(o, q));
	}

	// The label of the currently selected option is also the field's resting
	// text — computed once here, not through an `$effect`, so it is correct
	// on the very first server-rendered paint too, not just after hydration.
	let query = $state(findOption(value)?.label ?? "");
	let open = $state(false);

	const filteredOptions = $derived(computeFilteredOptions(query));

	const listbox = createListbox({
		// These recompute the filtered list directly, the same way
		// `computeFilteredOptions` is called from handlers, rather than reading
		// the `filteredOptions` derived above — `move`/`moveToEdge` can be
		// called synchronously from `handleInput`, in the same pass that just
		// wrote `query`, and these callbacks must see that keystroke's result.
		count: () => computeFilteredOptions(query).length,
		enabled: (i) => !computeFilteredOptions(query)[i]?.disabled,
		loop: true,
	});

	onDestroy(listbox.destroy);

	// Re-syncs the visible text whenever `value` changes for a reason other
	// than this component's own `selectOption`/`resolveAndClose` below — those
	// already set `query` themselves, synchronously, so in practice this only
	// has real work to do when a caller changes `value` from outside (an
	// initial `bind:value`, or a later external write). `options` is read
	// through `untrack` so a caller that recreates its options array on every
	// render (a fresh array literal, a re-translated label set) does not
	// retrigger this and stomp whatever the user is mid-typing — only `value`
	// itself does.
	$effect(() => {
		const current = value;
		query = untrack(() => findOption(current)?.label ?? "");
	});

	function optionId(index: number): string {
		return `${panelId}-option-${index}`;
	}

	function openPanel() {
		if (effectiveDisabled) return;
		open = true;
		// `open` is not a dependency of `filteredOptions`, so reading it here
		// (unlike inside `handleInput`) never risks the pre-write-derived trap
		// above — nothing this function writes invalidates it first.
		const selectedIndex = filteredOptions.findIndex((o) => o.value === value);
		listbox.setActive(selectedIndex >= 0 ? selectedIndex : filteredOptions.length > 0 ? 0 : -1);
	}

	// The single place `value` and `query` change together as a direct
	// consequence of the user picking a row — a plain function, not an
	// `$effect`, so it doesn't fight a caller's own `bind:value` write.
	function selectOption(option: ComboboxOption) {
		if (effectiveDisabled || option.disabled) return;
		value = option.value;
		query = option.label;
		open = false;
		onValueChange?.(option.value);
	}

	// A closed set has to resolve on the way out: whatever is left in the
	// field either names a real option (already handled by `selectOption`) or
	// it doesn't, and in that case the field reverts to the last valid
	// selection's label — or clears, when there wasn't one. Escape, an
	// outside click (both via `dismissable` on the panel) and a plain blur all
	// funnel through this one function, so every way of leaving the field
	// agrees on the same outcome.
	function resolveAndClose() {
		if (!open) return;
		open = false;
		query = findOption(value)?.label ?? "";
	}

	function handleInput(event: Event & { currentTarget: HTMLInputElement }) {
		if (effectiveDisabled) return;
		query = event.currentTarget.value;
		open = true;
		listbox.moveToEdge("first");
	}

	function handleFocus() {
		openPanel();
	}

	function handleBlur() {
		resolveAndClose();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (effectiveDisabled) return;
		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				if (!open) {
					openPanel();
					return;
				}
				listbox.move(1);
				break;
			case "ArrowUp":
				event.preventDefault();
				if (!open) {
					openPanel();
					return;
				}
				listbox.move(-1);
				break;
			case "Home":
				if (!open) return;
				event.preventDefault();
				listbox.moveToEdge("first");
				break;
			case "End":
				if (!open) return;
				event.preventDefault();
				listbox.moveToEdge("last");
				break;
			case "Enter": {
				if (!open) return;
				const active = filteredOptions[listbox.activeIndex];
				if (active) {
					event.preventDefault();
					selectOption(active);
				}
				break;
			}
		}
	}

	const context: ComboboxContext = {
		get panelId() {
			return panelId;
		},
		get inputRef() {
			return ref;
		},
		get options() {
			return filteredOptions;
		},
		get query() {
			return query;
		},
		get activeIndex() {
			return listbox.activeIndex;
		},
		get emptyMessage() {
			return emptyMessage;
		},
		optionId,
		isActive(index: number) {
			return index === listbox.activeIndex;
		},
		selectOption,
		close: resolveAndClose,
	};
	setContext(COMBOBOX_KEY, context);

	// A count, not the contents — see the panel's own note on why the list
	// itself is never read out loud.
	const resultsMessage = $derived(
		filteredOptions.length === 1 ? "1 result" : `${filteredOptions.length} results`
	);

	const classes = $derived(
		cn(
			"ft-combobox w-full rounded-[8px] border border-input bg-background px-[12px] py-[9px] text-[13px] text-foreground transition-colors",
			"placeholder:text-muted-foreground",
			"focus-visible:outline-none",
			"disabled:cursor-not-allowed disabled:opacity-50",
			effectiveInvalid && "border-destructive/50",
			className
		)
	);
</script>

<div class="ft-combobox-wrapper relative">
	<input
		bind:this={ref}
		type="text"
		role="combobox"
		id={effectiveId}
		{placeholder}
		value={query}
		disabled={effectiveDisabled}
		required={effectiveRequired}
		aria-invalid={effectiveInvalid ? "true" : undefined}
		aria-describedby={field?.describedBy}
		aria-label={field?.labelId ? undefined : label}
		aria-expanded={open}
		aria-haspopup="listbox"
		aria-autocomplete="list"
		aria-controls={open ? panelId : undefined}
		aria-activedescendant={open && listbox.activeIndex >= 0
			? optionId(listbox.activeIndex)
			: undefined}
		class={classes}
		oninput={handleInput}
		onfocus={handleFocus}
		onblur={handleBlur}
		onkeydown={handleKeydown}
	/>

	<!-- The visible input displays the option's *label*, so it cannot also
	     carry `name` without submitting the label text instead of the actual
	     value — this hidden input carries the real submission pair instead,
	     the same reason a native `<select>` submits its `value` and not its
	     displayed text. `required` stays off it (a `type="hidden"` input is
	     barred from constraint validation in every browser) and lives on the
	     visible input above instead, where a real validation UI can attach to
	     it. -->
	{#if name}
		<input type="hidden" {name} {value} disabled={effectiveDisabled} />
	{/if}

	<!-- Always mounted, whether or not the panel is open — an element that
	     only appears at the same moment its own text does usually goes
	     unannounced. Content is a count, never the option list itself, so
	     fast typing doesn't turn into a screen reader narrating every
	     keystroke's worth of rows. -->
	<div class="sr-only" role="status" aria-live="polite">{open ? resultsMessage : ""}</div>
</div>

{#if open}
	<ComboboxPanel />
{/if}

<style>
	.ft-combobox:focus-visible {
		--ft-field-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
		border-color: var(--ft-field-accent);
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-field-accent) 25%, transparent);
	}
</style>
