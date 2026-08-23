<script lang="ts" module>
	import type { Side, Align } from "../_internals/anchor-position.js";
	import type { SelectOption } from "./types.js";

	export type { SelectOption };

	export interface SelectProps {
		/** The options to choose from, in order. */
		options: SelectOption[];
		/** The selected value, bindable. `""` means nothing is selected. */
		value?: string;
		/** Called with the new value whenever the selection changes. */
		onValueChange?: (value: string) => void;
		/** Shown in the trigger while nothing is selected. */
		placeholder?: string;
		/** Blocks opening and excludes the control from form submission. Overridden by a surrounding FormField. */
		disabled?: boolean;
		/** Marks the control required. Overridden by a surrounding FormField. */
		required?: boolean;
		/** Drives the error border and `aria-invalid`. Overridden by a surrounding FormField. */
		invalid?: boolean;
		/** Element id. Overridden by a surrounding FormField's own `controlId`. */
		id?: string;
		/** Native `name`. When set, a hidden input carries the value so the control participates in form submission. */
		name?: string;
		/** Accessible name — for a control with no visible Label next to it. */
		label?: string;
		/** Side of the trigger to place the panel on. */
		side?: Side;
		/** Alignment along the trigger's cross axis. */
		align?: Align;
		/** Additional CSS classes, merged onto the trigger. */
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
	import { onDestroy, setContext } from "svelte";
	import { cn } from "$lib/utils.js";
	import { getField } from "../_internals/field.svelte.js";
	import { createListbox } from "../_internals/listbox.svelte.js";
	import { SELECT_KEY, type SelectContext } from "./types.js";
	import SelectPanel from "./SelectPanel.svelte";
	import { sound as soundFx } from "../sound/sound.svelte.js";

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
		side = "bottom",
		align = "start",
		class: className,
		ref = $bindable(null),
		sound = false,
	}: SelectProps = $props();

	// Undefined outside a FormField — every derived below then falls back to
	// this component's own props instead of the context, so the control works
	// standalone exactly as it does wrapped. The root is a real `<button>`, a
	// labelable element, so a wrapping FormField's own `<Label for>` targets
	// `controlId` directly — there is no `labelId`/`aria-labelledby` path to
	// wire here the way a `role="radiogroup"` root would need.
	const field = getField();

	const effectiveId = $derived(field?.controlId ?? id);
	const effectiveDisabled = $derived(field?.disabled ?? disabled);
	const effectiveRequired = $derived(field?.required ?? required);
	const effectiveInvalid = $derived(field?.invalid ?? invalid);

	// `$props.id()`, not `_internals/id.js`'s `uid()`: this seeds the panel and
	// option ids, which must already agree with themselves on the very first
	// server-rendered paint (the closed trigger renders with no `aria-controls`
	// at all, but the ids it would point to once open still have to be stable
	// across hydration, not generated fresh client-side).
	const uid = $props.id();
	const panelId = `${uid}-listbox`;
	function optionId(index: number): string {
		return `${uid}-option-${index}`;
	}

	let open = $state(false);
	let panelRef: HTMLDivElement | null = $state(null);

	const selectedIndex = $derived(options.findIndex((o) => o.value === value));
	const selectedOption = $derived(selectedIndex === -1 ? undefined : options[selectedIndex]);

	function isOptionEnabled(index: number): boolean {
		return !options[index]?.disabled;
	}

	// The one place `value` changes, in either direction (bind:value or
	// onValueChange) — a plain function, not an `$effect`, so it never reads
	// and writes `value` in the same reactive pass and never fights a
	// caller's own `bind:value` write.
	/** Returns true when the value actually changed (and a `select` cue played). */
	function setValue(next: string): boolean {
		if (value === next) return false;
		value = next;
		if (sound) soundFx.play("select");
		onValueChange?.(next);
		return true;
	}

	function commitIndex(index: number): boolean {
		const option = options[index];
		if (!option || option.disabled) return false;
		return setValue(option.value);
	}

	// The single hook the listbox core calls whenever the active index moves,
	// for any reason (arrow keys, Home/End, a pointer hover, typeahead). What
	// "active" means depends entirely on whether the panel is open: while
	// open it is only a highlight, scrolled into view but never written to
	// `value` until something commits it (Enter, Tab, a click). While closed,
	// there is no highlight to show — the only way this callback fires at all
	// is closed-state typeahead, and a native `<select>` commits that
	// immediately rather than merely remembering it, so this does too.
	function handleActiveChange(index: number): void {
		if (!open) {
			commitIndex(index);
			return;
		}
		const row = panelRef?.querySelector<HTMLElement>(`#${CSS.escape(optionId(index))}`);
		row?.scrollIntoView?.({ block: "nearest" });
	}

	const listbox = createListbox({
		count: () => options.length,
		enabled: isOptionEnabled,
		onActiveChange: handleActiveChange,
	});

	onDestroy(() => listbox.destroy());

	// If `options` shrinks while the panel is open, a previously-valid
	// `activeIndex` can end up pointing past the end of the new, shorter
	// array. Nothing else re-checks this: the listbox module only reacts to
	// explicit move/typeahead/setActive calls, not to `options.length`
	// changing out from under it between them. Left uncorrected,
	// `aria-activedescendant` below would keep citing an option id with no
	// matching row left in the DOM — the same "attribute pointing at
	// nothing" failure this wave already had to rule out for `aria-controls`
	// while closed.
	$effect(() => {
		if (listbox.activeIndex !== -1 && listbox.activeIndex >= options.length) {
			listbox.setActive(-1);
		}
	});

	function openPanel(fallbackEdge: "first" | "last"): void {
		if (effectiveDisabled) return;
		open = true;
		if (sound) soundFx.play("open");
		if (selectedIndex !== -1 && isOptionEnabled(selectedIndex)) {
			listbox.setActive(selectedIndex);
		} else {
			listbox.moveToEdge(fallbackEdge);
		}
	}

	// `reason` distinguishes a commit-flavoured close (a value was just
	// picked — by click, Enter/Space, Tab, or closed-state typeahead) from a
	// plain dismiss (Escape, an outside click, or the trigger toggling the
	// panel shut with nothing highlighted). Only a dismiss plays the `close`
	// cue — a commit already played `select` inside `setValue`/`commitIndex`
	// above, and the contract is one cue per interaction, never both.
	function closePanel(reason: "commit" | "dismiss" = "dismiss"): void {
		open = false;
		if (sound && reason === "dismiss") soundFx.play("close");
	}

	function commitActiveAndClose(): void {
		// The close reason follows the ACTUAL outcome: re-committing the value
		// that is already selected changes nothing, so it closes like a dismiss
		// and is not swallowed into silence.
		const committed = listbox.activeIndex !== -1 && commitIndex(listbox.activeIndex);
		closePanel(committed ? "commit" : "dismiss");
	}

	function handleTriggerClick(): void {
		if (effectiveDisabled) return;
		if (open) {
			closePanel();
		} else {
			openPanel("first");
		}
	}

	function labelAt(index: number): string {
		return options[index]?.label ?? "";
	}

	// A single, non-modified character — Space excluded, since it is handled
	// as its own key below (both "open" and "commit", depending on `open`).
	function isTypeaheadKey(event: KeyboardEvent): boolean {
		return (
			event.key.length === 1 &&
			event.key !== " " &&
			!event.ctrlKey &&
			!event.metaKey &&
			!event.altKey
		);
	}

	// No Escape handling here on purpose — `SelectPanel`'s own `dismissable`
	// already closes on Escape (and an outside click) via the document-level
	// listener it owns; a second listener here would be the exact bug this
	// wave already had to remove once. Because Escape only ever closes and
	// closing never itself writes `value`, "Escape closes without changing
	// the value" falls out for free: nothing in this component's own keydown
	// handling below writes `value` for any key other than Enter/Space/Tab.
	function handleTriggerKeydown(event: KeyboardEvent): void {
		if (effectiveDisabled) return;

		if (!open) {
			switch (event.key) {
				case "Enter":
				case " ":
				case "ArrowDown":
					event.preventDefault();
					openPanel("first");
					return;
				case "ArrowUp":
					event.preventDefault();
					openPanel("last");
					return;
				default:
					// Typing while closed selects by typeahead without opening —
					// what a native <select> does. `handleActiveChange` above is
					// what turns the resulting highlight into a real commit while
					// `open` is false.
					if (isTypeaheadKey(event)) listbox.typeahead(event.key, labelAt);
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
			case "Tab":
				// Chosen behaviour (documented in the README): Tab commits the
				// highlighted option, exactly like Enter, but is never
				// prevented — focus still moves on to the next control the
				// browser would have picked anyway. The alternative (close
				// without committing) would silently discard a highlight the
				// user very likely meant to pick, for no benefit over this one.
				commitActiveAndClose();
				return;
			default:
				if (isTypeaheadKey(event)) listbox.typeahead(event.key, labelAt);
				return;
		}
	}

	const context: SelectContext = {
		get open() {
			return open;
		},
		get panelId() {
			return panelId;
		},
		get options() {
			return options;
		},
		get value() {
			return value;
		},
		get activeIndex() {
			return listbox.activeIndex;
		},
		get side() {
			return side;
		},
		get align() {
			return align;
		},
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
		// Wrapped so a caller passing an event object can never leak it in as `reason`.
		close: () => closePanel("dismiss"),
	};
	setContext(SELECT_KEY, context);

	const classes = $derived(
		cn(
			"ft-select-trigger flex w-full items-center justify-between gap-2 rounded-[8px] border border-input bg-background px-[12px] py-[9px] text-left text-[13px] text-foreground transition-colors",
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
	<span class={cn("truncate", !selectedOption && "text-muted-foreground")}>
		{selectedOption?.label ?? placeholder ?? ""}
	</span>
	<span aria-hidden="true" class="ft-select-caret text-muted-foreground text-[9px]">▼</span>
</button>

{#if name}
	<input type="hidden" {name} {value} disabled={effectiveDisabled} />
{/if}

{#if open}
	<SelectPanel bind:ref={panelRef} />
{/if}

<style>
	.ft-select-trigger:focus-visible {
		--ft-field-accent: var(
			--ft-accent,
			light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
		);
		border-color: var(--ft-field-accent);
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-field-accent) 25%, transparent);
	}
</style>
