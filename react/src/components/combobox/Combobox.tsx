import { forwardRef, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";

import { cn } from "../../utils.js";
import { useConstant } from "../../internals/dom/ssr.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useEventCallback } from "../../internals/dom/use-event-callback.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { useField } from "../../internals/field.js";
import { createListbox } from "../../internals/listbox.js";
import { useFancyId } from "../../internals/use-id.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { ComboboxPanel } from "./ComboboxPanel.js";
import { defaultFilter } from "./match.js";
import { COMBOBOX_KEY } from "./types.js";
import type { ComboboxContext, ComboboxOption } from "./types.js";
import "./combobox.css";

export type { ComboboxOption };

export interface ComboboxProps {
	/** The closed set of selectable options. A value outside this list is never valid. */
	options: ComboboxOption[];
	/**
	 * The selected option's value, or "" when nothing is selected.
	 *
	 * Controlled when passed: the caller owns it and writes the value back
	 * from `onValueChange`. Left out entirely, the component keeps its own
	 * copy and still reports every change — the React spelling of the
	 * source's `$bindable("")`.
	 */
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
	className?: string;
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

function findOption(options: ComboboxOption[], val: string): ComboboxOption | undefined {
	return options.find((o) => o.value === val);
}

/**
 * The filtered list, as a pure module-level function rather than only as the
 * memo below, so it can also be called directly from handlers that just wrote
 * `query` in the same pass (see `handleInput`) — reading the memoized
 * `filteredOptions` there instead would mean reading a value computed from
 * the pre-write render.
 *
 * While the visible text still equals the selected option's own label — true
 * both before the user has touched the field at all and right after a fresh
 * selection — nothing is filtered out, so opening the panel browses the whole
 * list rather than the one row that happens to still be typed in. The moment
 * the visible text diverges from that label, real filtering kicks in.
 */
function computeFilteredOptions(
	options: ComboboxOption[],
	value: string,
	filter: ((option: ComboboxOption, query: string) => boolean) | undefined,
	q: string
): ComboboxOption[] {
	const selectedLabel = findOption(options, value)?.label ?? "";
	if (q === selectedLabel) return options;
	return options.filter((o) => (filter ? filter(o, q) : defaultFilter(o.label, q)));
}

// -1 is the value the listbox starts at on both sides, so the server render
// and the hydration render agree that nothing is active.
const activeIndexServerSnapshot = () => -1;

/**
 * A text input over a closed set of options, with a portalled listbox panel.
 *
 * The input element arrives through the ref channel rather than a `ref` prop,
 * per PORTING.md — the Svelte source declares `ref = $bindable(null)`.
 *
 * Rest props are not spread: the source reads only these props off `$props()`
 * and has no `...restProps`, so the port carries no wider attribute surface
 * than the component it mirrors.
 */
export const Combobox = forwardRef<HTMLInputElement, ComboboxProps>(function Combobox(
	{
		options,
		value: valueProp,
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
		className,
		sound = false,
	},
	forwardedRef
) {
	// Undefined outside a FormField — every `effective*` below then falls back
	// to this component's own props instead of the context, so the control
	// works standalone exactly as it does wrapped. Same convention as Input.
	const field = useField();

	const uid = useFancyId();
	const effectiveId = field?.controlId ?? id ?? `${uid}-input`;
	const effectiveDisabled = field?.disabled ?? disabled;
	const effectiveRequired = field?.required ?? required;
	const effectiveInvalid = field?.invalid ?? invalid;
	const panelId = `${uid}-listbox`;

	const playCue = useSoundCue(sound);

	// The source's `value = $bindable("")`: a consumer can bind it, or hand it
	// a plain value and let the component keep writing its own copy. React has
	// no such channel, so the prop SEEDS this copy and re-seeds it whenever the
	// consumer actually changes it — which is exactly what a non-bound
	// `$bindable` prop does, and is what keeps "a plain `value` plus
	// `onValueChange`" a working combination rather than a field that reverts
	// to the seed on the next blur. A consumer that does drive `value` from
	// `onValueChange` is fully controlled.
	const [value, setValueState] = useState(valueProp ?? "");
	const [lastValueProp, setLastValueProp] = useState(valueProp);
	if (lastValueProp !== valueProp) {
		setLastValueProp(valueProp);
		setValueState(valueProp ?? "");
	}

	// The label of the currently selected option is also the field's resting
	// text — computed here as the initial state, not through an effect, so it
	// is correct on the very first server-rendered paint too, not just after
	// hydration.
	const [query, setQueryState] = useState(() => findOption(options, value)?.label ?? "");

	// The same string, written SYNCHRONOUSLY. `handleInput` writes the query
	// and then calls `listbox.moveToEdge` in the same turn, and the listbox's
	// `count`/`enabled` callbacks must see that keystroke's result — a live
	// ref (an insertion effect, i.e. the next commit) would still be holding
	// the pre-keystroke text. This is the React shape of the source's own note
	// about not reading a derived in the pass that wrote its dependency.
	const queryRef = useRef(query);
	const setQuery = useCallback((next: string) => {
		queryRef.current = next;
		setQueryState(next);
	}, []);

	const [open, setOpen] = useState(false);

	const filteredOptions = useMemo(
		() => computeFilteredOptions(options, value, filter, query),
		[options, value, filter, query]
	);

	// Read by the listbox callbacks below, which run outside React's render
	// pass. Only `query` needs the synchronous ref above; these three change
	// exclusively through a re-render.
	const optionsRef = useLiveRef(options);
	const valueRef = useLiveRef(value);
	const filterRef = useLiveRef(filter);

	// The framework-free core rather than `useListbox`: `count` and `enabled`
	// stay real getters here, exactly as in the source, which is what lets
	// `handleInput` write the query and navigate the *new* list in one turn.
	const listbox = useConstant(() =>
		createListbox({
			count: () =>
				computeFilteredOptions(
					optionsRef.current,
					valueRef.current,
					filterRef.current,
					queryRef.current
				).length,
			enabled: (i) =>
				!computeFilteredOptions(
					optionsRef.current,
					valueRef.current,
					filterRef.current,
					queryRef.current
				)[i]?.disabled,
			loop: true,
		})
	);

	useEffect(() => () => listbox.destroy(), [listbox]);

	const getActiveIndex = useCallback(() => listbox.activeIndex, [listbox]);
	const activeIndex = useSyncExternalStore(
		listbox.subscribe,
		getActiveIndex,
		activeIndexServerSnapshot
	);

	// Re-syncs the visible text whenever `value` changes for a reason other
	// than this component's own `selectOption`/`resolveAndClose` below — those
	// already set `query` themselves, synchronously, so in practice this only
	// has real work to do when a caller changes `value` from outside. `options`
	// is read through a ref (the source's `untrack`) so a caller that recreates
	// its options array on every render does not retrigger this and stomp
	// whatever the user is mid-typing — only `value` itself does.
	useEffect(() => {
		setQuery(findOption(optionsRef.current, value)?.label ?? "");
	}, [value, optionsRef, setQuery]);

	const [inputNode, setInputNode] = useElementRef<HTMLInputElement>();
	const inputRef = useComposedRefs(setInputNode, forwardedRef);

	const optionId = useCallback((index: number) => `${panelId}-option-${index}`, [panelId]);

	function openPanel() {
		if (effectiveDisabled) return;
		setOpen(true);
		const selectedIndex = filteredOptions.findIndex((o) => o.value === value);
		listbox.setActive(selectedIndex >= 0 ? selectedIndex : filteredOptions.length > 0 ? 0 : -1);
	}

	// The single place `value` and `query` change together as a direct
	// consequence of the user picking a row.
	const selectOption = useEventCallback((option: ComboboxOption) => {
		if (effectiveDisabled || option.disabled) return;
		// Re-picking the row already committed changes nothing — the
		// changed-only rule every other value-holding component follows
		// (Select, Tabs, DatePicker, ...), even where, as here, there is no
		// second cue to fall back on. Read BEFORE the write, and never at the
		// cost of `onValueChange`, which still fires on a re-pick.
		const changed = value !== option.value;
		setValueState(option.value);
		setQuery(option.label);
		setOpen(false);
		if (changed) playCue("select");
		onValueChange?.(option.value);
	});

	// A closed set has to resolve on the way out: whatever is left in the
	// field either names a real option (already handled by `selectOption`) or
	// it doesn't, and in that case the field reverts to the last valid
	// selection's label — or clears, when there wasn't one. Escape, an outside
	// click (both through the panel's dismissable layer) and a plain blur all
	// funnel through this one function, so every way of leaving the field
	// agrees on the same outcome.
	const resolveAndClose = useEventCallback(() => {
		if (!open) return;
		setOpen(false);
		setQuery(findOption(options, value)?.label ?? "");
	});

	function handleInput(event: ChangeEvent<HTMLInputElement>) {
		if (effectiveDisabled) return;
		setQuery(event.target.value);
		setOpen(true);
		listbox.moveToEdge("first");
	}

	function handleFocus() {
		openPanel();
	}

	function handleBlur() {
		resolveAndClose();
	}

	function handleKeydown(event: KeyboardEvent<HTMLInputElement>) {
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

	const isActive = useCallback((index: number) => index === activeIndex, [activeIndex]);

	const context = useMemo<ComboboxContext>(
		() => ({
			open,
			panelId,
			inputRef: inputNode,
			options: filteredOptions,
			query,
			activeIndex,
			emptyMessage,
			optionId,
			isActive,
			selectOption,
			close: resolveAndClose,
		}),
		[
			open,
			panelId,
			inputNode,
			filteredOptions,
			query,
			activeIndex,
			emptyMessage,
			optionId,
			isActive,
			selectOption,
			resolveAndClose,
		]
	);

	// A count, not the contents — see the panel's own note on why the list
	// itself is never read out loud.
	const resultsMessage =
		filteredOptions.length === 1 ? "1 result" : `${filteredOptions.length} results`;

	const classes = cn(
		"ft-combobox w-full rounded-[8px] border border-input bg-background px-[12px] py-[9px] text-[13px] text-foreground transition-colors",
		"placeholder:text-muted-foreground",
		"focus-visible:outline-none",
		"disabled:cursor-not-allowed disabled:opacity-50",
		effectiveInvalid && "border-destructive/50",
		className
	);

	return (
		<>
			<div className="ft-combobox-wrapper relative">
				<input
					ref={inputRef}
					type="text"
					role="combobox"
					id={effectiveId}
					placeholder={placeholder}
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
					aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
					className={classes}
					onChange={handleInput}
					onFocus={handleFocus}
					onBlur={handleBlur}
					onKeyDown={handleKeydown}
				/>

				{/*
					The visible input displays the option's *label*, so it cannot also
					carry `name` without submitting the label text instead of the actual
					value — this hidden input carries the real submission pair instead,
					the same reason a native `<select>` submits its `value` and not its
					displayed text. `required` stays off it (a `type="hidden"` input is
					barred from constraint validation in every browser) and lives on the
					visible input above instead, where a real validation UI can attach to
					it.

					No `readOnly` and no no-op `onChange`: React's controlled-value
					warning exempts `type="hidden"`, which is the one input kind with
					no writer by construction — so the DOM stays exactly what the
					source emits.
				*/}
				{name ? (
					<input type="hidden" name={name} value={value} disabled={effectiveDisabled} />
				) : null}

				{/*
					Always mounted, whether or not the panel is open — an element that
					only appears at the same moment its own text does usually goes
					unannounced. Content is a count, never the option list itself, so
					fast typing doesn't turn into a screen reader narrating every
					keystroke's worth of rows.
				*/}
				<div className="sr-only" role="status" aria-live="polite">
					{open ? resultsMessage : ""}
				</div>
			</div>

			{/*
				The panel is rendered UNCONDITIONALLY, where the source wraps it in
				`{#if open}` — see this folder's README. `ComboboxPanel` owns the
				`usePresence` gate itself, and its `Portal` has to be mounted before
				the commit that opens the panel or the entrance leg is silently
				skipped.
			*/}
			<COMBOBOX_KEY.Provider value={context}>
				<ComboboxPanel />
			</COMBOBOX_KEY.Provider>
		</>
	);
});

Combobox.displayName = "Combobox";
