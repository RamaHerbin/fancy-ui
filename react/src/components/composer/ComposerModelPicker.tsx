import { useCallback, useContext, useEffect, useState } from "react";
import type { KeyboardEvent } from "react";

import { cn } from "../../utils.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useEventCallback } from "../../internals/dom/use-event-callback.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { useFancyId } from "../../internals/use-id.js";
import { useFloat } from "../../internals/use-float.js";
import type { FloatRect } from "../../internals/float.js";
import type { ModelOptionData } from "../../internals/ai-types.js";
import { COMPOSER_CONTEXT_KEY } from "./types.js";
import "./composer-model-picker.css";

/**
 * Props for ComposerModelPicker
 */
export interface ComposerModelPickerProps {
	/** The models on offer. An empty list leaves the picker inert. */
	models: ModelOptionData[];
	/**
	 * The selected model's id. Controlled when passed — report the pick back
	 * through `onValueChange`; leave it out and the picker keeps its own copy.
	 * Falls back to the first model.
	 */
	value?: string;
	/** Called with every pick the picker makes, changed or not — the write-back channel. */
	onValueChange?: (id: string) => void;
	/** Called with the id of a newly picked model. Silent when the pick changes nothing. */
	onChange?: (id: string) => void;
	/** Accessible name for the control and its menu. */
	label?: string;
	/** Additional CSS classes */
	className?: string;
}

/**
 * The model switcher that lives on the composer's bottom rail.
 *
 * Focus lives on the listbox while the menu is open — the element carrying
 * `aria-activedescendant` has to be the one holding focus — and returns to the
 * trigger when the menu closes on Escape or on a pick. The menu is only in the
 * DOM while it is open, and the one document listener it needs is added on open
 * and taken back on close.
 */
export function ComposerModelPicker({
	models,
	value: valueProp,
	onValueChange,
	onChange,
	label = "Model",
	className,
}: ComposerModelPickerProps) {
	// Undefined when the picker is used outside a Composer: it then behaves as a
	// standalone select rather than throwing, and nothing switches it off.
	const composer = useContext(COMPOSER_CONTEXT_KEY);

	const uid = useFancyId();
	const menuId = `${uid}-menu`;
	// Ids are built from the position, not from the model's own id: two entries
	// arriving with the same id — a duplicated tier, a badly deduplicated list —
	// would otherwise both answer to the same `aria-activedescendant`.
	const optionId = (index: number) => `${uid}-option-${index}`;

	// The source's `value` is `$bindable()`: a consumer can bind it, or leave it
	// alone and let the picker keep writing its own copy. React has no such
	// channel, so the prop is controlled when it is passed and the local copy
	// takes over when it is not. Either way `onValueChange` fires with the pick.
	const [uncontrolledValue, setUncontrolledValue] = useState<string | undefined>(undefined);
	const value = valueProp !== undefined ? valueProp : uncontrolledValue;

	const [open, setOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(0);
	const [triggerEl, triggerRef] = useElementRef<HTMLButtonElement>();
	const [menuEl, menuRef] = useElementRef<HTMLDivElement>();

	// Read by the long-lived closures below — the document listener that must be
	// registered exactly once per open, and the anchor getter the float re-reads
	// on every scroll tick — so neither is rebuilt when an element arrives.
	const triggerLive = useLiveRef(triggerEl);
	const menuLive = useLiveRef(menuEl);

	// An unset `value` means "whichever model comes first", so the picker can be
	// dropped in without the consumer having to seed the binding.
	const selectedId = value ?? models[0]?.id;
	// Deliberately not falling back to the first model: a `value` naming something
	// that is not on offer shows the bare label instead of quietly claiming a
	// model the consumer never selected.
	const selected = models.find((model) => model.id === selectedId);
	const activeId = models[activeIndex] ? optionId(activeIndex) : undefined;
	// Nothing to choose from is as inert as a composer that is switched off.
	const isDisabled = (composer?.disabled ?? false) || models.length === 0;

	function applyValue(next: string) {
		if (valueProp === undefined) setUncontrolledValue(next);
		onValueChange?.(next);
	}

	const openMenu = useEventCallback(() => {
		if (isDisabled || open) return;
		// The menu opens on the model in force, so Enter without touching an arrow
		// is a no-op rather than a silent switch to whatever sits at the top.
		const current = models.findIndex((model) => model.id === selectedId);
		setActiveIndex(current >= 0 ? current : 0);
		setOpen(true);
	});

	const closeMenu = useEventCallback((returnFocus: boolean) => {
		if (!open) return;
		setOpen(false);
		// Focus was moved into the listbox on open; leaving it there would drop the
		// keyboard user at the top of the document when the listbox disappears.
		if (returnFocus) triggerLive.current?.focus();
	});

	const move = useEventCallback((delta: number) => {
		if (models.length === 0) return;
		// Wraps: the list is short, and a menu that dead-ends at its last entry
		// makes the reader reverse direction to reach the option one step past it.
		setActiveIndex((index) => (index + delta + models.length) % models.length);
	});

	const select = useEventCallback((index: number) => {
		const model = models[index];
		if (!model || isDisabled) return;
		const changed = model.id !== selectedId;
		applyValue(model.id);
		closeMenu(true);
		// `onChange` reports a change, not an interaction: re-picking the model
		// already in force has nothing to announce.
		if (changed) onChange?.(model.id);
	});

	function handleTriggerKeydown(event: KeyboardEvent<HTMLButtonElement>) {
		if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
		// Both arrows open. The menu sits above the composer, which is where "up"
		// expects to find it, and "down" is the habit every native select taught.
		event.preventDefault();
		openMenu();
	}

	function handleMenuKeydown(event: KeyboardEvent<HTMLDivElement>) {
		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				move(1);
				break;
			case "ArrowUp":
				event.preventDefault();
				move(-1);
				break;
			case "Enter":
			case " ":
				// preventDefault also stops the browser turning the key into a click on
				// the option button that is about to be removed.
				event.preventDefault();
				select(activeIndex);
				break;
			case "Escape":
				event.preventDefault();
				closeMenu(true);
				break;
			case "Tab":
				// Focus is leaving of its own accord: the menu steps aside and puts
				// focus back on the trigger, so the browser's own Tab — left to run —
				// continues from the picker rather than from the top of the document.
				closeMenu(true);
				break;
		}
	}

	useEffect(() => {
		if (!open) return;
		// mousedown rather than click: the menu has to be gone before the press
		// lands, or a press that starts outside and finishes on the trigger closes
		// and reopens in one gesture.
		const onPointerDown = (event: MouseEvent) => {
			const target = event.target as Node | null;
			if (target && (menuLive.current?.contains(target) || triggerLive.current?.contains(target)))
				return;
			// No focus return: the press is already moving focus somewhere else.
			closeMenu(false);
		};
		// Capture, so a surface that swallows mousedown on the way up cannot pin the
		// menu open. Registered only while open, and retracted the moment it closes.
		document.addEventListener("mousedown", onPointerDown, true);
		return () => document.removeEventListener("mousedown", onPointerDown, true);
	}, [open, closeMenu, menuLive, triggerLive]);

	useEffect(() => {
		if (!open) return;
		// Focus moves into the listbox instead of staying on the trigger: the
		// element pointing at the active option with `aria-activedescendant` must be
		// the element that actually holds focus.
		menuEl?.focus();
	}, [open, menuEl]);

	// Reads the switch, writes only the menu: a composer that goes dark mid-pick
	// takes its menu down with it.
	useEffect(() => {
		if (isDisabled) setOpen(false);
	}, [isDisabled]);

	// The anchor is read through a getter so the float re-measures the trigger on
	// each scroll and resize tick instead of holding a rect that went stale the
	// moment the page moved. Identity-stable, so the float is never re-synced for
	// the getter alone.
	const anchor = useCallback(
		(): FloatRect | null => triggerLive.current?.getBoundingClientRect() ?? null,
		[triggerLive]
	);
	// In the DOM only while it is on screen, so the hook is handed `null` — and
	// does nothing at all — for as long as the menu is closed.
	useFloat(menuEl, { anchor, placement: "top-start", offset: 6 });

	return (
		<>
			<button
				ref={triggerRef}
				type="button"
				className={cn(
					"ft-composer-model text-foreground/70 hover:bg-muted hover:text-foreground inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40",
					className
				)}
				disabled={isDisabled}
				data-open={open ? "" : undefined}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={open ? menuId : undefined}
				aria-label={selected ? `${label}: ${selected.label}` : label}
				onClick={() => (open ? closeMenu(true) : openMenu())}
				onKeyDown={handleTriggerKeydown}
			>
				<span className="truncate">{selected?.label ?? label}</span>
				{selected?.badge ? (
					<span className="ft-composer-model-badge shrink-0 rounded px-1 py-px text-[0.625rem] tracking-wide">
						{selected.badge}
					</span>
				) : null}
				<svg
					className="ft-composer-model-chevron size-3 shrink-0"
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="m4 6 4 4 4-4" />
				</svg>
			</button>

			{/*
				In the DOM only while it is on screen. A permanently mounted menu is a
				list of every model on offer that every reader of the page has to step
				past to reach the composer, once per composer.
			*/}
			{open ? (
				<div
					ref={menuRef}
					id={menuId}
					role="listbox"
					tabIndex={-1}
					aria-label={label}
					aria-activedescendant={activeId}
					className="ft-composer-model-menu z-50 max-h-64 min-w-52 overflow-y-auto rounded-lg border p-1 shadow-lg outline-none"
					onKeyDown={handleMenuKeydown}
				>
					{models.map((model, index) => (
						/*
							A button carrying `role="option"`: the row has to be clickable and
							it has to be an option, and starting from a button is what keeps
							the press, the pointer cursor and the disabled semantics native.
							`tabindex="-1"` keeps it out of the tab order, where the listbox
							does the walking.
						*/
						<button
							key={`${model.id}#${index}`}
							type="button"
							role="option"
							tabIndex={-1}
							id={optionId(index)}
							aria-selected={model.id === selectedId}
							data-active={index === activeIndex ? "" : undefined}
							className="ft-composer-model-option flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left"
							onClick={() => select(index)}
							onMouseEnter={() => setActiveIndex(index)}
						>
							<span className="flex w-full items-center gap-1.5">
								<span className="truncate text-xs font-medium">{model.label}</span>
								{model.badge ? (
									<span className="ft-composer-model-badge shrink-0 rounded px-1 py-px text-[0.625rem] tracking-wide">
										{model.badge}
									</span>
								) : null}
								{model.id === selectedId ? (
									<svg
										className="ml-auto size-3 shrink-0"
										viewBox="0 0 16 16"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										aria-hidden="true"
									>
										<path d="m3 8.5 3.5 3.5L13 5" />
									</svg>
								) : null}
							</span>
							{model.description ? (
								<span className="ft-composer-model-description text-[0.6875rem] leading-snug">
									{model.description}
								</span>
							) : null}
						</button>
					))}
				</div>
			) : null}
		</>
	);
}
