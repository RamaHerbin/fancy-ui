import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";

import { cn } from "../../utils.js";
import { useField } from "../../internals/field.js";
import { useListbox } from "../../internals/listbox.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useFancyId } from "../../internals/use-id.js";
import { AUTOCOMPLETE_KEY, type AutocompleteContext } from "./types.js";
import { AutocompletePanel } from "./AutocompletePanel.js";
import "./autocomplete.css";

export interface AutocompleteProps {
	/** Candidate strings offered as the user types. Advisory only — any text is a valid value, matched or not. */
	suggestions: string[];
	/** The free-text value. */
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
	className?: string;
}

export const Autocomplete = forwardRef<HTMLInputElement, AutocompleteProps>(function Autocomplete(
	{
		suggestions,
		value: valueProp,
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
		className,
	},
	forwardedRef
) {
	// Undefined outside a FormField — every derived below then falls back to
	// this component's own props instead of the context, so the control works
	// standalone exactly as it does wrapped. Same convention as Input.
	const field = useField();

	const uid = useFancyId();
	const effectiveId = field?.controlId ?? id ?? `${uid}-input`;
	const effectiveDisabled = field?.disabled ?? disabled;
	const effectiveRequired = field?.required ?? required;
	const effectiveInvalid = field?.invalid ?? invalid;
	const panelId = `${uid}-listbox`;

	// The Svelte source's `value` is `$bindable("")`: a consumer can bind it,
	// or hand it a plain value and let the component keep writing its own
	// copy. React has no such channel, so the prop SEEDS this copy and re-seeds
	// it whenever the consumer actually changes it — which is exactly what a
	// non-bound `$bindable` prop does, and is what keeps "a plain `value` plus
	// `onValueChange`" a working combination rather than a frozen field. A
	// consumer that does drive `value` from `onValueChange` is fully
	// controlled; one that never updates it still gets a typeable input.
	const [value, setValue] = useState(valueProp ?? "");
	const [seededFrom, setSeededFrom] = useState(valueProp);
	if (valueProp !== seededFrom) {
		setSeededFrom(valueProp);
		setValue(valueProp ?? "");
	}

	const [open, setOpen] = useState(false);

	// Convention C-1: the panel anchors against, and excludes from
	// outside-click dismissal, the NODE — so the input is published as state,
	// not as a ref nobody would be re-rendered by.
	const [inputNode, setInputNode] = useElementRef<HTMLInputElement>();
	const inputRef = useComposedRefs(setInputNode, forwardedRef);

	// Computed as a plain function, not only through the memo below, so it can
	// also be called directly from handlers that just wrote `value` in the same
	// pass (see `handleInput`) — reading the memoized `filteredSuggestions`
	// there instead would mean reading this render's list in a handler that has
	// already superseded it.
	const computeSuggestions = useCallback(
		(text: string): string[] => {
			if (text.length < minLength) return [];
			const q = text.toLowerCase();
			return suggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, maxSuggestions);
		},
		[suggestions, minLength, maxSuggestions]
	);

	const filteredSuggestions = useMemo(
		() => computeSuggestions(value),
		[computeSuggestions, value]
	);

	const listbox = useListbox({ count: filteredSuggestions.length, loop: true });

	// If the suggestions the panel is showing become empty while it's open —
	// the `suggestions` prop changes out from under an open panel, or `value`
	// is set programmatically to something shorter than `minLength` — the
	// panel closes itself rather than sit open and empty. Reads the filtered
	// length, writes `open`: two different pieces of state, not the same one
	// read and written in one effect.
	useEffect(() => {
		if (filteredSuggestions.length === 0) setOpen(false);
	}, [filteredSuggestions.length]);

	const optionId = useCallback((index: number) => `${panelId}-option-${index}`, [panelId]);

	// The only place a suggestion becomes the value. A plain function, not an
	// effect, so it doesn't fight a caller's own controlled write.
	const commit = useCallback(
		(suggestion: string) => {
			setValue(suggestion);
			setOpen(false);
			onValueChange?.(suggestion);
			onSelect?.(suggestion);
		},
		[onValueChange, onSelect]
	);

	const close = useCallback(() => {
		setOpen(false);
	}, []);

	function handleInput(event: ChangeEvent<HTMLInputElement>) {
		if (effectiveDisabled) return;
		const next = event.currentTarget.value;
		setValue(next);
		onValueChange?.(next);
		setOpen(computeSuggestions(next).length > 0);
		// No row auto-highlights on typing — only an explicit arrow key does,
		// so Enter right after typing never silently swaps in a suggestion the
		// user never navigated to.
		listbox.setActive(-1);
	}

	function handleFocus() {
		if (effectiveDisabled) return;
		if (computeSuggestions(value).length > 0) setOpen(true);
	}

	function handleBlur() {
		// Free text needs no resolution on the way out, unlike Combobox — every
		// value is already valid, and arrowing never wrote into the field, so
		// there is nothing to revert. Blur only has to close the panel.
		setOpen(false);
	}

	function handleKeydown(event: KeyboardEvent<HTMLInputElement>) {
		if (effectiveDisabled) return;
		switch (event.key) {
			case "ArrowDown":
				if (!open) {
					if (computeSuggestions(value).length > 0) {
						event.preventDefault();
						setOpen(true);
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

	// A plain object rebuilt when its inputs change — the rebuild is what makes
	// the panel re-render. The Svelte side gets the same liveness from getters.
	const context = useMemo<AutocompleteContext>(
		() => ({
			open,
			panelId,
			inputRef: inputNode,
			suggestions: filteredSuggestions,
			query: value,
			activeIndex: listbox.activeIndex,
			optionId,
			isActive: (index: number) => index === listbox.activeIndex,
			select: commit,
			close,
		}),
		[open, panelId, inputNode, filteredSuggestions, value, listbox.activeIndex, optionId, commit, close]
	);

	// A count, not the contents — see the panel's own note on why the list
	// itself is never read out loud.
	const resultsMessage =
		filteredSuggestions.length === 1
			? "1 suggestion"
			: `${filteredSuggestions.length} suggestions`;

	const classes = cn(
		"ft-autocomplete w-full rounded-[8px] border border-input bg-background px-[12px] py-[9px] text-[13px] text-foreground transition-colors",
		"placeholder:text-muted-foreground",
		"focus-visible:outline-none",
		"disabled:cursor-not-allowed disabled:opacity-50",
		effectiveInvalid && "border-destructive/50",
		className
	);

	return (
		<AUTOCOMPLETE_KEY.Provider value={context}>
			<div className="ft-autocomplete-wrapper relative">
				<input
					ref={inputRef}
					type="text"
					role="combobox"
					id={effectiveId}
					name={name}
					placeholder={placeholder}
					value={value}
					disabled={effectiveDisabled}
					required={effectiveRequired}
					aria-invalid={effectiveInvalid ? "true" : undefined}
					aria-describedby={field?.describedBy}
					aria-label={field?.labelId ? undefined : label}
					aria-expanded={open}
					aria-haspopup="listbox"
					aria-autocomplete="list"
					aria-controls={open ? panelId : undefined}
					aria-activedescendant={
						open && listbox.activeIndex >= 0 ? optionId(listbox.activeIndex) : undefined
					}
					className={classes}
					onChange={handleInput}
					onFocus={handleFocus}
					onBlur={handleBlur}
					onKeyDown={handleKeydown}
				/>

				{/* Always mounted, whether or not the panel is open — see Combobox's
				    identical note. Content is a count, never the suggestion text itself. */}
				<div className="sr-only" role="status" aria-live="polite">
					{open ? resultsMessage : ""}
				</div>
			</div>

			{/*
				Rendered unconditionally where the source has `{#if open}`: the panel
				owns its own `usePresence` clock, so it is what keeps the list on
				screen for the length of the exit — the job Svelte's outro-delayed
				branch destruction did. The gate has not disappeared, it has moved
				one level down. Hoisting it here as well would mean the panel's
				`Portal` mounting in the same commit as the surface, which resolves
				its container a layout effect too late and skips the entrance
				outright (the same reason `DialogSurface` hoists its own `Portal`).
			*/}
			<AutocompletePanel />
		</AUTOCOMPLETE_KEY.Provider>
	);
});

Autocomplete.displayName = "Autocomplete";
