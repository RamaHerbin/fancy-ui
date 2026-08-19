<script lang="ts" module>
	export interface AutocompleteProps {
		/** Candidate strings offered as the user types. Advisory only — any text is a valid value, matched or not. */
		suggestions: string[];
		/** The free-text value. Bindable. */
		value?: string;
		/** Called with the new value on every keystroke. */
		onValueChange?: (value: string) => void;
		/** Called only when a suggestion is committed via click or Enter — never fires from plain typing. */
		onSelect?: (suggestion: string) => void;
		/** Shown while the field is empty. */
		placeholder?: string;
		/** Blocks focus and typing; excluded from form submission. Overridden by a surrounding FormField. */
		disabled?: boolean;
		/** Native `required`. Overridden by a surrounding FormField. */
		required?: boolean;
		/** Drives the error border and `aria-invalid`. Overridden by a surrounding FormField. */
		invalid?: boolean;
		/** Element id. Overridden by a surrounding FormField's own `controlId`. */
		id?: string;
		/** Native `name`, read on form submission — the visible value doubles as the submitted one, unlike Combobox. */
		name?: string;
		/** Accessible name — for a control with no visible Label next to it. */
		label?: string;
		/** Characters required before suggestions appear. */
		minLength?: number;
		/** Maximum number of suggestions shown at once. */
		maxSuggestions?: number;
		/** Additional CSS classes. */
		class?: string;
		/** Bindable reference to the input element. */
		ref?: HTMLInputElement | null;
	}
</script>

<script lang="ts">
	import { setContext, onDestroy } from "svelte";
	import { cn } from "$lib/utils.js";
	import { getField } from "../_internals/field.svelte.js";
	import { createListbox } from "../_internals/listbox.svelte.js";
	import { AUTOCOMPLETE_KEY, type AutocompleteContext } from "./types.js";
	import AutocompletePanel from "./AutocompletePanel.svelte";

	let {
		suggestions,
		value = $bindable(""),
		onValueChange,
		onSelect,
		placeholder,
		disabled = false,
		required = false,
		invalid = false,
		id,
		name,
		label,
		minLength = 1,
		maxSuggestions = 8,
		class: className,
		ref = $bindable(null),
	}: AutocompleteProps = $props();

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

	let open = $state(false);

	// Computed as a plain function, not only through the `$derived` below, so
	// it can also be called directly from handlers that just wrote `value` in
	// the same pass (see `handleInput`) — reading the memoized
	// `filteredSuggestions` there instead would mean reading a derived in the
	// same synchronous call that wrote its own dependency, which risks seeing
	// the pre-write list.
	function computeSuggestions(text: string): string[] {
		if (text.length < minLength) return [];
		const q = text.toLowerCase();
		return suggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, maxSuggestions);
	}

	const filteredSuggestions = $derived(computeSuggestions(value));

	const listbox = createListbox({
		// Recomputes directly for the same reason `Combobox` does — `move` can
		// run synchronously from `handleInput`, in the same pass that just
		// wrote `value`, and this must see that keystroke's result.
		count: () => computeSuggestions(value).length,
		loop: true,
	});

	onDestroy(listbox.destroy);

	// If the suggestions the panel is showing become empty while it's open —
	// the `suggestions` prop changes out from under an open panel, or `value`
	// is set programmatically to something shorter than `minLength` — the
	// panel closes itself rather than sit open and empty. Reads
	// `filteredSuggestions`, writes `open`: two different pieces of state, not
	// the same one read and written in one effect.
	$effect(() => {
		if (filteredSuggestions.length === 0) {
			open = false;
		}
	});

	function optionId(index: number): string {
		return `${panelId}-option-${index}`;
	}

	// The only place a suggestion becomes the value. A plain function, not an
	// `$effect`, so it doesn't fight a caller's own `bind:value` write.
	function commit(suggestion: string) {
		value = suggestion;
		open = false;
		onValueChange?.(suggestion);
		onSelect?.(suggestion);
	}

	function handleInput(event: Event & { currentTarget: HTMLInputElement }) {
		if (effectiveDisabled) return;
		const next = event.currentTarget.value;
		value = next;
		onValueChange?.(next);
		open = computeSuggestions(next).length > 0;
		// No row auto-highlights on typing — only an explicit arrow key does,
		// so Enter right after typing never silently swaps in a suggestion the
		// user never navigated to.
		listbox.setActive(-1);
	}

	function handleFocus() {
		if (effectiveDisabled) return;
		if (computeSuggestions(value).length > 0) open = true;
	}

	function handleBlur() {
		// Free text needs no resolution on the way out, unlike Combobox — every
		// value is already valid, and arrowing never wrote into the field, so
		// there is nothing to revert. Blur only has to close the panel.
		open = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (effectiveDisabled) return;
		switch (event.key) {
			case "ArrowDown":
				if (!open) {
					if (computeSuggestions(value).length > 0) {
						event.preventDefault();
						open = true;
						listbox.moveToEdge("first");
					}
					return;
				}
				event.preventDefault();
				listbox.move(1);
				break;
			case "ArrowUp":
				if (!open) return;
				event.preventDefault();
				listbox.move(-1);
				break;
			case "Enter": {
				if (!open) return;
				const active = filteredSuggestions[listbox.activeIndex];
				if (active) {
					event.preventDefault();
					commit(active);
				}
				break;
			}
		}
	}

	const context: AutocompleteContext = {
		get panelId() {
			return panelId;
		},
		get inputRef() {
			return ref;
		},
		get suggestions() {
			return filteredSuggestions;
		},
		get query() {
			return value;
		},
		get activeIndex() {
			return listbox.activeIndex;
		},
		optionId,
		isActive(index: number) {
			return index === listbox.activeIndex;
		},
		select: commit,
		close() {
			open = false;
		},
	};
	setContext(AUTOCOMPLETE_KEY, context);

	// A count, not the contents — see the panel's own note on why the list
	// itself is never read out loud.
	const resultsMessage = $derived(
		filteredSuggestions.length === 1 ? "1 suggestion" : `${filteredSuggestions.length} suggestions`
	);

	const classes = $derived(
		cn(
			"ft-autocomplete w-full rounded-[8px] border border-input bg-background px-[12px] py-[9px] text-[13px] text-foreground transition-colors",
			"placeholder:text-muted-foreground",
			"focus-visible:outline-none",
			"disabled:cursor-not-allowed disabled:opacity-50",
			effectiveInvalid && "border-destructive/50",
			className
		)
	);
</script>

<div class="ft-autocomplete-wrapper relative">
	<input
		bind:this={ref}
		type="text"
		role="combobox"
		id={effectiveId}
		{name}
		{placeholder}
		{value}
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

	<!-- Always mounted, whether or not the panel is open — see Combobox's
	     identical note. Content is a count, never the suggestion text itself. -->
	<div class="sr-only" role="status" aria-live="polite">{open ? resultsMessage : ""}</div>
</div>

{#if open}
	<AutocompletePanel />
{/if}

<style>
	.ft-autocomplete:focus-visible {
		--ft-field-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
		border-color: var(--ft-field-accent);
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-field-accent) 25%, transparent);
	}
</style>
