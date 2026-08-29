import { Fragment, useRef } from "react";
import type { MouseEvent } from "react";

import { cn } from "../../utils.js";
import { Portal } from "../../internals/Portal.js";
import { useDismissable } from "../../internals/dismissable.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useAnchorPosition } from "../../internals/use-anchor-position.js";
import { anchored, originFor } from "../../internals/motion/anchored.js";
import { usePresence } from "../../internals/motion/presence.js";
import { getMatchRange } from "./match.js";
import { COMBOBOX_KEY } from "./types.js";

/**
 * The portalled listbox panel.
 *
 * A `<div role="listbox">`, not a `<ul>` — its rows are real `<button>`s
 * (role="option" overrides the native semantics for assistive tech), and a
 * `<button>` is not a permitted child of `<ul>`.
 *
 * No focus trap: focus never leaves the input for this pattern
 * (`aria-activedescendant` tracks the active row instead), so there is
 * nothing to move focus into or return it from. Each row is a real button so
 * it stays natively keyboard-operable and the a11y linter is right to ask
 * for one, but `tabindex="-1"` keeps it out of the tab sequence — the input
 * is the only stop — and `onMouseDown` calls `preventDefault()` so the
 * pointer's own focus-on-mousedown never fires before the row's own
 * `onClick` runs: without it, clicking a row would blur the input a beat
 * before selecting anything.
 *
 * It arrives and leaves on ONE bidirectional transition, never a split
 * in/out pair: one leg handed the in-flight counterpart's current position
 * means a panel reopened mid-exit continues from where it is instead of
 * snapping to invisible first. `entering` is what tells it which way it is
 * going, and it comes from the presence clock rather than the transition's
 * own direction.
 */
export function ComboboxPanel() {
	// `Combobox` only ever renders this component inside its own provider, so
	// the context is always present by the time this runs — no
	// standalone-usage fallback to design for, which is what `useRequired`
	// encodes.
	const ctx = COMBOBOX_KEY.useRequired();

	// Convention C-1: the NODE, not a ref. The panel is created by
	// `presence.mounted`, so a `useRef` + `[]`-deps effect would still be
	// holding `null` when the anchor and dismiss effects fire.
	const [panel, setPanelNode] = useElementRef<HTMLDivElement>();

	// The side and cross-axis alignment the panel was ACTUALLY placed on.
	// This panel always asks for `bottom`/`start`, but a combobox sitting low
	// in the viewport flips to `top` routinely, and clamping near a viewport
	// edge slides it along the cross axis — the entrance origin has to follow
	// both, or the panel grows out of a corner that is no longer the one
	// touching the input. Seeded with the requested values, so the un-flipped
	// case never depends on a first placement callback having fired.
	const { side: resolvedSide, align: resolvedAlign } = useAnchorPosition(panel, {
		anchor: ctx.inputRef,
		side: "bottom",
		align: "start",
		offset: 4,
	});

	const presence = usePresence(ctx.open);

	useDismissable(panel, {
		onDismiss: ctx.close,
		exclude: [ctx.inputRef],
		active: ctx.open,
	});

	// Convention C-2: composed ABOVE the mounted gate below. Calling this
	// inside the JSX branch would be a conditional hook and would throw the
	// first time `mounted` flips.
	const panelRef = useComposedRefs(
		setPanelNode,
		presence.register(anchored, (entering) => ({ side: resolvedSide, entering }))
	);

	// Svelte destroys the `{#if open}` branch that owns this component, and
	// marks it INERT before playing the outro — its scheduler skips inert
	// effects, so the rows on screen during the exit are frozen at whatever
	// they were the instant the close began. React re-renders an exiting
	// subtree normally, so the freeze is explicit here. It is load-bearing for
	// this component in particular: `close()` resolves the query back to the
	// selected option's label in the very turn it flips `open`, and that
	// re-filters the list — so a panel that closed while showing its empty
	// message would repopulate with every option halfway through its own fade.
	const frozen = useRef({
		options: ctx.options,
		query: ctx.query,
		activeIndex: ctx.activeIndex,
	});
	if (ctx.open) {
		frozen.current = { options: ctx.options, query: ctx.query, activeIndex: ctx.activeIndex };
	}
	const view = frozen.current;

	// The `Portal` stays mounted and its CHILDREN are what `presence.mounted`
	// gates. `usePortalTarget` resolves its container in a layout effect, so a
	// `Portal` first mounting in the same commit as the panel renders nothing
	// on that pass — the registered node would then not exist when
	// `usePresence`'s own layout effect looks for legs to start, and the
	// entrance would be skipped outright while every other assertion still
	// passed.
	return (
		<Portal>
			{presence.mounted ? (
				<div
					ref={panelRef}
					id={ctx.panelId}
					role="listbox"
					className="ft-combobox-panel border-border bg-popover text-popover-foreground flex max-h-[260px] w-max min-w-[220px] flex-col gap-[1px] overflow-auto rounded-[10px] border p-[5px] text-[13px] shadow-lg outline-none"
					data-state={presence.surfaceState}
					data-side={resolvedSide}
					data-align="start"
					style={{ transformOrigin: originFor(resolvedSide, resolvedAlign) }}
				>
					{view.options.length === 0 ? (
						<div
							role="presentation"
							className="ft-combobox-empty text-muted-foreground rounded-[6px] px-[10px] py-[7px]"
						>
							{ctx.emptyMessage}
						</div>
					) : (
						view.options.map((option, index) => {
							const range = getMatchRange(option.label, view.query);
							const isActive = index === view.activeIndex;
							return (
								/*
									`onMouseDown` below defends against a real browser's
									focus-follows-mousedown default action stealing focus onto this
									row before its own `onClick` commits — without it, that focus
									shift blurs the input first, which closes the panel (unmounting
									this row) before the click already in flight can land. jsdom
									implements no such default action to suppress, so no test in this
									repo can watch this guard prevent that outcome — only that the
									call happens (`Combobox.test.tsx`'s "the row's mousedown handler
									calls preventDefault" dispatches a bare `mousedown` and checks
									`event.defaultPrevented`). Do not delete this as dead code on the
									strength of a green suite.
								*/
								<button
									key={option.value}
									type="button"
									id={ctx.optionId(index)}
									role="option"
									tabIndex={-1}
									disabled={option.disabled}
									aria-selected={isActive}
									aria-disabled={option.disabled ? "true" : undefined}
									className={cn(
										"ft-combobox-option w-full cursor-pointer rounded-[6px] px-[10px] py-[7px] text-left",
										isActive && !option.disabled && "bg-accent text-accent-foreground",
										option.disabled && "pointer-events-none opacity-50"
									)}
									onMouseDown={(event: MouseEvent<HTMLButtonElement>) => event.preventDefault()}
									onClick={() => ctx.selectOption(option)}
								>
									{range ? (
										<Fragment>
											{option.label.slice(0, range.start)}
											<strong>{option.label.slice(range.start, range.end)}</strong>
											{option.label.slice(range.end)}
										</Fragment>
									) : (
										option.label
									)}
								</button>
							);
						})
					)}
				</div>
			) : null}
		</Portal>
	);
}

ComboboxPanel.displayName = "ComboboxPanel";
