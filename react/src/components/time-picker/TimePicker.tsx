import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import { cn } from "../../utils.js";
import { useField } from "../../internals/field.js";
import { useListbox } from "../../internals/listbox.js";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useEventCallback } from "../../internals/dom/use-event-callback.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { useFancyId } from "../../internals/use-id.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { filterByBounds, formatSlotLabel, generateSlots, nearestIndex } from "./time-utils.js";
import { TimePickerPanel } from "./TimePickerPanel.js";
import { TimePickerReactContext } from "./types.js";
import type { TimePickerContext } from "./types.js";
import "./time-picker.css";

export interface TimePickerProps {
	/** The selected time, or `null` for none. Always "HH:mm", 24-hour — see the README. */
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
	className?: string;
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

/**
 * A combobox trigger plus a portalled listbox of "HH:mm" slots.
 *
 * `forwardRef` because the source declares `ref = $bindable(null)` on the
 * trigger button — the exposed element is the `<button>`, not a wrapper.
 */
export const TimePicker = forwardRef<HTMLButtonElement, TimePickerProps>(function TimePicker(
	{
		value: valueProp,
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
		className,
		sound = false,
	},
	forwardedRef
) {
	// Undefined outside a FormField — every value below then falls back to
	// this component's own props instead of the context, so the control works
	// standalone exactly as it does wrapped. The root is a real `<button>`, a
	// labelable element, so a wrapping FormField's own `<Label htmlFor>`
	// targets `controlId` directly.
	const field = useField();

	const effectiveId = field?.controlId ?? id;
	const effectiveDisabled = field?.disabled ?? disabled;
	const effectiveRequired = field?.required ?? required;
	const effectiveInvalid = field?.invalid ?? invalid;

	// `useFancyId()`, the counterpart of the source's `$props.id()`: this seeds
	// the panel and option ids, which must already agree with themselves on the
	// very first server-rendered paint.
	const uid = useFancyId();
	const panelId = `${uid}-listbox`;
	const optionId = useCallback((index: number) => `${uid}-option-${index}`, [uid]);

	const playCue = useSoundCue(sound);

	const [open, setOpen] = useState(false);

	// Convention C-1: the NODE, not a ref. The panel anchors against the
	// trigger and the dismiss layer excludes it, and both are hooks keyed on
	// the node.
	const [triggerNode, setTriggerNode] = useElementRef<HTMLButtonElement>();
	const triggerRef = useComposedRefs(setTriggerNode, forwardedRef);

	// Also the NODE rather than a plain ref, unlike `Select`'s equivalent: the
	// open-time scroll below has to fire the moment the portalled panel exists,
	// and only a state-backed node re-runs an effect when it appears.
	const [panelNode, setPanelNode] = useElementRef<HTMLDivElement>();

	// The React shape of the source's `value = $bindable(null)`: an internal
	// copy seeded from the prop, re-synced during render whenever the CALLER
	// changes the prop, and free to move on its own in between. That is what
	// makes all three documented call shapes work off one implementation — a
	// caller driving `value` from its own state, a caller who passes only
	// `onValueChange`, and a caller who passes neither.
	const [value, setValueState] = useState<string | null>(valueProp ?? null);
	const [lastValueProp, setLastValueProp] = useState(valueProp);
	if (lastValueProp !== valueProp) {
		setLastValueProp(valueProp);
		setValueState(valueProp ?? null);
	}

	const slots = useMemo(
		() => filterByBounds(generateSlots(step), min, max),
		[step, min, max]
	);
	const selectedIndex = value ? slots.indexOf(value) : -1;

	// One formatted label per slot, computed once for the life of a grid rather
	// than once per render. The panel calls `labelFor` for every row it draws,
	// and every pointer hover re-renders it to move the highlight — without
	// this, each hover rebuilds all 48 labels (1440 at `step={1}`), and each
	// label builds its own `Intl.DateTimeFormat`. Nothing on screen changes for
	// that work.
	//
	// Filled on demand rather than up front: a picker that is never opened only
	// ever formats the trigger's own value, and paying for the whole grid at
	// mount would be a worse trade than the one this removes. Thrown away
	// wholesale whenever the grid or the formatting inputs change, so an entry
	// can never outlive what produced it.
	const labelCache = useMemo(() => new Map<string, string>(), [slots, hour12, locale]);

	// Still a function, so the context shape is unchanged. `value` can sit off
	// the grid (a caller-supplied "14:05" against a 30-minute step), so the
	// cache is keyed by slot rather than by index.
	const labelFor = useCallback(
		(slot: string) => {
			const cached = labelCache.get(slot);
			if (cached !== undefined) return cached;
			const formatted = formatSlotLabel(slot, hour12, locale);
			labelCache.set(slot, formatted);
			return formatted;
		},
		[labelCache, hour12, locale]
	);

	// The single place `value` changes, in either direction (a consumer-owned
	// `value` prop or `onValueChange`) — a plain function, never an effect, so
	// it can never read and write `value` in the same pass and never fights a
	// caller's own controlled write.
	/** Returns true when the value actually changed (and a `select` cue played). */
	function setValue(next: string | null): boolean {
		if (value === next) return false;
		setValueState(next);
		playCue("select");
		onValueChange?.(next);
		return true;
	}

	function commitIndex(index: number): boolean {
		const slot = slots[index];
		if (!slot) return false;
		return setValue(slot);
	}

	// Identity-stable: the listbox store is built once and reads this through a
	// live ref, so it must never go stale on `panelNode` or `optionId`.
	const scrollActiveIntoView = useEventCallback((index: number) => {
		const row = panelNode?.querySelector<HTMLElement>(`#${CSS.escape(optionId(index))}`);
		row?.scrollIntoView?.({ block: "nearest" });
	});

	const listbox = useListbox({
		count: slots.length,
		onActiveChange: scrollActiveIntoView,
	});

	// `slots` is regenerated whenever `step`, `min` or `max` change, and the
	// listbox store knows nothing about that: it only reacts to explicit
	// move/typeahead/setActive calls, never to the grid changing shape between
	// them. An index that was valid under the old grid therefore survives into
	// the new one — pointing past the end of a shorter list, so
	// `aria-activedescendant` below cites an option id with no row left in the
	// DOM, or (a shifted grid: a later `min`, a coarser `step`) pointing at a
	// completely different TIME than the one the user arrowed to, with the
	// highlight silently jumping under them.
	//
	// So the index is reconciled against the time it named, not clamped as a
	// number: the previous grid says which slot was active, and `nearestIndex`
	// re-resolves that slot in the new grid exactly as `openPanel` resolves
	// `value` — same slot if it survived, else the closest one at or after it,
	// else the last, else -1 for a grid with no slots at all. A bounds change
	// therefore lands the highlight where reopening the panel would.
	//
	// DIVERGENCE: the Svelte source has the same gap. `Select` clamps to -1
	// instead, which is right there — its options are an opaque caller-supplied
	// list with no ordering to resolve a missing entry against, while these
	// slots are times on a line.
	//
	// The listbox handle is read through a live ref rather than listed as a
	// dependency: `useListbox` returns a fresh object whenever `activeIndex`
	// moves, so depending on it would tear this effect down and re-run it on
	// every hover and every arrow key, only to bail on the guard above. The
	// grid changing shape is the one thing it reacts to.
	const listboxRef = useLiveRef(listbox);
	const previousSlotsRef = useRef(slots);
	useEffect(() => {
		const previous = previousSlotsRef.current;
		previousSlotsRef.current = slots;
		if (previous === slots) return;

		const box = listboxRef.current;
		const index = box.activeIndex;
		if (index === -1) return;

		const activeSlot = previous[index];
		box.setActive(activeSlot === undefined ? -1 : nearestIndex(slots, activeSlot));
	}, [listboxRef, slots]);

	// The index owed a scroll as soon as the panel exists. The source spells
	// this `tick().then(() => scrollActiveIntoView(index))`; here the panel is
	// mounted by its own presence clock a commit later, so the request is
	// parked and the effect below pays it the instant the node appears.
	//
	// Always scrolled into view on open, not only relying on `onActiveChange` —
	// that callback only fires when the index actually *changes*, and a reopen
	// can land on the same index a previous session left active, which must
	// still be visible the instant the panel appears rather than only after the
	// next arrow press.
	//
	// A LAYOUT effect, not a passive one: this writes `scrollTop`, and a write
	// that lands after the paint is a visible jump — a picker whose value sits
	// late in the grid would show the list parked at 00:00 for a frame and then
	// snap to the selection. The source's `tick()` runs after the DOM update
	// and before the paint, which is this phase.
	const pendingScrollRef = useRef<number | null>(null);

	useIsomorphicLayoutEffect(() => {
		const index = pendingScrollRef.current;
		if (index === null || !panelNode) return;
		pendingScrollRef.current = null;
		scrollActiveIntoView(index);
		// `open` is a dependency as well as the node: a reopen that lands while
		// the previous panel is still finishing its exit reuses the very same
		// node, so `[panelNode]` alone would never re-run.
	}, [panelNode, open, scrollActiveIntoView]);

	function openPanel(): void {
		if (effectiveDisabled) return;
		setOpen(true);
		playCue("open");
		const index = nearestIndex(slots, value);
		if (index === -1) return;
		listbox.setActive(index);
		pendingScrollRef.current = index;
	}

	// `reason` distinguishes a commit-flavoured close (a slot was just picked)
	// from a plain dismiss (Escape, an outside click, or the trigger toggling
	// the panel shut with nothing committed). Only a dismiss plays the `close`
	// cue — a commit already played `select` inside `setValue` above, and the
	// contract is one cue per interaction, never both.
	function closePanel(reason: "commit" | "dismiss" = "dismiss"): void {
		setOpen(false);
		if (reason === "dismiss") playCue("close");
	}

	function commitActiveAndClose(): void {
		// The close reason follows the ACTUAL outcome: re-committing the slot
		// already selected changes nothing, so it closes like a dismiss rather
		// than being swallowed into silence.
		const committed = listbox.activeIndex !== -1 && commitIndex(listbox.activeIndex);
		closePanel(committed ? "commit" : "dismiss");
	}

	function handleTriggerClick(): void {
		if (effectiveDisabled) return;
		if (open) closePanel();
		else openPanel();
		// Deliberate, not incidental: a plain `<button>` is only guaranteed to
		// take focus on click in some browsers (macOS Safari notably does not,
		// by default). Focus needs to be on the trigger for the keyboard
		// interactions below (arrows, Home/End, Enter) to have anything to
		// attach to right after a mouse open.
		triggerNode?.focus();
	}

	// No Escape handling here on purpose — `TimePickerPanel`'s own dismiss
	// layer already closes on Escape (and an outside click) via the
	// document-level listener it owns; a second listener here would be the
	// exact bug this wave already had to remove once. Because Escape only ever
	// closes and closing never itself writes `value`, "Escape closes without
	// committing" falls out for free.
	function handleTriggerKeydown(event: ReactKeyboardEvent<HTMLButtonElement>): void {
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

	// Identity-stable wrappers, so the context object below rebuilds only when
	// something a consumer RENDERS actually changed.
	const contextSetActive = useEventCallback((index: number) => {
		listbox.setActive(index);
	});
	const contextCommit = useEventCallback((index: number) => {
		const committed = commitIndex(index);
		// A POINTER commit is the one path that can strand focus. Pressing a
		// row moves focus onto it (the row carries `tabIndex={-1}`), and the
		// panel is portalled to `<body>`, so it has no focusable ancestor to
		// inherit focus once it goes inert for the exit and then unmounts —
		// `document.activeElement` would fall back to `<body>` and the next Tab
		// would restart from the top of the document. Dropping the row's
		// `tabIndex` would NOT fix that: a click on a non-focusable element
		// blurs the trigger to `<body>` just the same. The
		// combobox-with-listbox-popup contract is that focus never leaves the
		// trigger, so put it back explicitly, before the close starts the exit.
		// The keyboard path is unaffected — focus was on the trigger the whole
		// time, and re-focusing an already-focused element is a no-op.
		triggerNode?.focus();
		closePanel(committed ? "commit" : "dismiss");
	});
	// Wrapped so a caller passing an event object can never leak it in as `reason`.
	const contextClose = useEventCallback(() => {
		closePanel("dismiss");
	});

	const activeIndex = listbox.activeIndex;
	const context = useMemo<TimePickerContext>(
		() => ({
			open,
			panelId,
			slots,
			activeIndex,
			labelFor,
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
			slots,
			activeIndex,
			labelFor,
			triggerNode,
			optionId,
			selectedIndex,
			contextSetActive,
			contextCommit,
			contextClose,
		]
	);

	const triggerLabel = value ? labelFor(value) : undefined;

	const classes = cn(
		"ft-time-picker-trigger flex w-full items-center justify-between gap-2 rounded-[8px] border border-input bg-background px-[12px] py-[9px] text-left text-[13px] text-foreground transition-colors",
		"focus-visible:outline-none",
		"disabled:cursor-not-allowed disabled:opacity-50",
		effectiveInvalid && "border-destructive/50",
		className
	);

	return (
		<TimePickerReactContext.Provider value={context}>
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
				<span className={triggerLabel ? undefined : "text-muted-foreground"}>
					{triggerLabel ?? placeholder}
				</span>
				<span aria-hidden="true" className="text-muted-foreground">
					◷
				</span>
			</button>

			{name ? (
				<input type="hidden" name={name} value={value ?? ""} disabled={effectiveDisabled} />
			) : null}

			{/*
				Rendered unconditionally, with the mount gate inside — the React
				shape of the source's `{#if open}`. The panel has to survive
				`open` flipping false for the length of its own exit, and its
				portal target has to be resolved before the commit that opens it.
			*/}
			<TimePickerPanel ref={setPanelNode} />
		</TimePickerReactContext.Provider>
	);
});

TimePicker.displayName = "TimePicker";
