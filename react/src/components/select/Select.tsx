import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import { cn } from "../../utils.js";
import { useField } from "../../internals/field.js";
import { useListbox } from "../../internals/listbox.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useEventCallback } from "../../internals/dom/use-event-callback.js";
import { useFancyId } from "../../internals/use-id.js";
import { useSoundCue } from "../../sound/use-sound.js";
import type { Side, Align } from "../../internals/anchor-position.js";
import { SelectPanel } from "./SelectPanel.js";
import { SelectReactContext } from "./types.js";
import type { SelectContext, SelectOption } from "./types.js";
import "./select.css";

export type { SelectOption };

export interface SelectProps {
	/** The options to choose from, in order. */
	options: SelectOption[];
	/** The selected value. `""` means nothing is selected. */
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
	className?: string;
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

/**
 * A combobox trigger plus a portalled listbox panel, driven off an `options`
 * array.
 *
 * `forwardRef` because the source declares `ref = $bindable(null)` on the
 * trigger button — the exposed element is the `<button>`, not a wrapper.
 */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
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
		side = "bottom",
		align = "start",
		className,
		sound = false,
	},
	forwardedRef
) {
	// Undefined outside a FormField — every value below then falls back to
	// this component's own props instead of the context, so the control works
	// standalone exactly as it does wrapped. The root is a real `<button>`, a
	// labelable element, so a wrapping FormField's own `<Label htmlFor>`
	// targets `controlId` directly — there is no `labelId`/`aria-labelledby`
	// path to wire here the way a `role="radiogroup"` root would need.
	const field = useField();

	const effectiveId = field?.controlId ?? id;
	const effectiveDisabled = field?.disabled ?? disabled;
	const effectiveRequired = field?.required ?? required;
	const effectiveInvalid = field?.invalid ?? invalid;

	// `useFancyId()`, the counterpart of the source's `$props.id()`: this seeds
	// the panel and option ids, which must already agree with themselves on
	// the very first server-rendered paint (the closed trigger renders with no
	// `aria-controls` at all, but the ids it would point to once open still
	// have to be stable across hydration, not generated fresh client-side).
	const uid = useFancyId();
	const panelId = `${uid}-listbox`;
	const optionId = useCallback((index: number) => `${uid}-option-${index}`, [uid]);

	const playCue = useSoundCue(sound);

	// `open` is state AND a ref written in the same two functions. The ref is
	// not a cache: `openPanel` flips `open` and then, synchronously, moves the
	// listbox's active index — and `onActiveChange` below branches on whether
	// the panel is open. The source reads `$state` there and sees the value it
	// just wrote; a React render value would still be the pre-handler `false`,
	// and opening with ArrowDown would silently COMMIT the first option
	// instead of merely highlighting it.
	const [open, setOpenState] = useState(false);
	const openRef = useRef(false);
	const setOpen = useCallback((next: boolean) => {
		openRef.current = next;
		setOpenState(next);
	}, []);

	// Convention C-1: the node, not a ref — the panel anchors against it and
	// the dismiss layer excludes it, and both are hooks keyed on the node.
	const [triggerNode, setTriggerNode] = useElementRef<HTMLButtonElement>();
	const triggerRef = useComposedRefs(setTriggerNode, forwardedRef);

	// A plain ref: nothing renders off it. It exists so the active row can be
	// scrolled into view, which is DOM work, never a render input.
	const panelRef = useRef<HTMLDivElement | null>(null);

	// The React shape of the source's `value = $bindable("")`: an internal
	// copy seeded from the prop, re-synced during render whenever the CALLER
	// changes the prop, and free to move on its own in between. That is what
	// makes all three documented call shapes work off one implementation — a
	// caller driving `value` from its own state, a caller who passes only
	// `onValueChange`, and a caller who passes neither.
	const [value, setValueState] = useState(valueProp ?? "");
	const [lastValueProp, setLastValueProp] = useState(valueProp);
	if (lastValueProp !== valueProp) {
		setLastValueProp(valueProp);
		setValueState(valueProp ?? "");
	}

	const selectedIndex = options.findIndex((o) => o.value === value);
	const selectedOption = selectedIndex === -1 ? undefined : options[selectedIndex];

	function isOptionEnabled(index: number): boolean {
		return !options[index]?.disabled;
	}

	// The one place `value` changes, in either direction — a plain function,
	// never an effect, so it can never read and write `value` in the same pass
	// and never fights a caller's own controlled write.
	/** Returns true when the value actually changed (and a `select` cue played). */
	function setValue(next: string): boolean {
		if (value === next) return false;
		setValueState(next);
		playCue("select");
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
	const handleActiveChange = useEventCallback((index: number) => {
		if (!openRef.current) {
			commitIndex(index);
			return;
		}
		const row = panelRef.current?.querySelector<HTMLElement>(`#${CSS.escape(optionId(index))}`);
		row?.scrollIntoView?.({ block: "nearest" });
	});

	const listbox = useListbox({
		count: options.length,
		enabled: isOptionEnabled,
		onActiveChange: handleActiveChange,
	});

	// If `options` shrinks while the panel is open, a previously-valid
	// `activeIndex` can end up pointing past the end of the new, shorter
	// array. Nothing else re-checks this: the listbox module only reacts to
	// explicit move/typeahead/setActive calls, not to the option count
	// changing out from under it between them. Left uncorrected,
	// `aria-activedescendant` below would keep citing an option id with no
	// matching row left in the DOM — the same "attribute pointing at nothing"
	// failure ruled out for `aria-controls` while closed.
	useEffect(() => {
		if (listbox.activeIndex !== -1 && listbox.activeIndex >= options.length) {
			listbox.setActive(-1);
		}
	}, [listbox, options.length]);

	function openPanel(fallbackEdge: "first" | "last"): void {
		if (effectiveDisabled) return;
		setOpen(true);
		playCue("open");
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
		setOpen(false);
		if (reason === "dismiss") playCue("close");
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
	function isTypeaheadKey(event: ReactKeyboardEvent): boolean {
		return (
			event.key.length === 1 &&
			event.key !== " " &&
			!event.ctrlKey &&
			!event.metaKey &&
			!event.altKey
		);
	}

	// No Escape handling here on purpose — `SelectPanel`'s own dismiss layer
	// already closes on Escape (and an outside click) via the document-level
	// listener it owns; a second listener here would be a bug, not a backstop.
	// Because Escape only ever closes and closing never itself writes `value`,
	// "Escape closes without changing the value" falls out for free: nothing
	// in this component's own keydown handling below writes `value` for any
	// key other than Enter/Space/Tab.
	function handleTriggerKeydown(event: ReactKeyboardEvent<HTMLButtonElement>): void {
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

	// Identity-stable wrappers, so the context object below rebuilds only when
	// something a consumer RENDERS actually changed.
	const contextSetActive = useEventCallback((index: number) => {
		listbox.setActive(index);
	});
	const contextCommit = useEventCallback((index: number) => {
		const committed = commitIndex(index);
		closePanel(committed ? "commit" : "dismiss");
	});
	// Wrapped so a caller passing an event object can never leak it in as `reason`.
	const contextClose = useEventCallback(() => closePanel("dismiss"));

	const activeIndex = listbox.activeIndex;
	const context = useMemo<SelectContext>(
		() => ({
			open,
			panelId,
			options,
			value,
			label,
			activeIndex,
			side,
			align,
			triggerRef: triggerNode,
			optionId,
			isSelected: (index: number) => index === selectedIndex,
			isActive: (index: number) => index === activeIndex,
			setActive: contextSetActive,
			commit: contextCommit,
			close: contextClose,
		}),
		[
			open,
			panelId,
			options,
			value,
			label,
			activeIndex,
			side,
			align,
			triggerNode,
			optionId,
			selectedIndex,
			contextSetActive,
			contextCommit,
			contextClose,
		]
	);

	const classes = cn(
		"ft-select-trigger flex w-full items-center justify-between gap-2 rounded-[8px] border border-input bg-background px-[12px] py-[9px] text-left text-[13px] text-foreground transition-colors",
		"focus-visible:outline-none",
		"disabled:cursor-not-allowed disabled:opacity-50",
		effectiveInvalid && "border-destructive/50",
		className
	);

	return (
		<SelectReactContext.Provider value={context}>
			<button
				ref={triggerRef}
				id={effectiveId}
				type="button"
				role="combobox"
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={open ? panelId : undefined}
				aria-activedescendant={open && activeIndex !== -1 ? optionId(activeIndex) : undefined}
				aria-invalid={effectiveInvalid ? "true" : undefined}
				aria-required={effectiveRequired ? "true" : undefined}
				aria-describedby={field?.describedBy}
				aria-label={label}
				disabled={effectiveDisabled}
				className={classes}
				onClick={handleTriggerClick}
				onKeyDown={handleTriggerKeydown}
			>
				<span className={cn("truncate", !selectedOption && "text-muted-foreground")}>
					{selectedOption?.label ?? placeholder ?? ""}
				</span>
				<span aria-hidden="true" className="ft-select-caret text-muted-foreground text-[9px]">
					▼
				</span>
			</button>

			{name ? <input type="hidden" name={name} value={value} disabled={effectiveDisabled} /> : null}

			{/*
				Rendered unconditionally, with the mount gate inside — the React
				shape of the source's `{#if open}`. The panel has to survive
				`open` flipping false for the length of its own exit, and its
				portal target has to be resolved before the commit that opens it.
			*/}
			<SelectPanel ref={panelRef} />
		</SelectReactContext.Provider>
	);
});

Select.displayName = "Select";
