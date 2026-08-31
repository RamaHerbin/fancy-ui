import { useCallback, useRef } from "react";
import type { MouseEvent } from "react";

import { cn } from "../../utils.js";
import { Portal } from "../../internals/Portal.js";
import { useAnchorPosition } from "../../internals/use-anchor-position.js";
import { useDismissable } from "../../internals/dismissable.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { anchored, originFor } from "../../internals/motion/anchored.js";
import { usePresence } from "../../internals/motion/presence.js";
import { getMatchRange } from "./match.js";
import { AUTOCOMPLETE_KEY } from "./types.js";

/**
 * The floating suggestions list.
 *
 * `Autocomplete` renders this unconditionally and it gates itself on
 * `ctx.open`, where the source mounts it inside its own `{#if open}` — so the
 * context is always present, and the rows are never drawn before there is at
 * least one suggestion to show.
 */
export function AutocompletePanel() {
	const ctx = AUTOCOMPLETE_KEY.useRequired();

	// Convention C-1: the NODE, not a ref. The panel is created by
	// `presence.mounted`, so a `useRef` + `[]`-deps effect would still be
	// holding `null` when the positioning and dismissable effects fire.
	const [panel, setPanelNode] = useElementRef<HTMLDivElement>();

	const presence = usePresence(ctx.open);

	// The side and alignment the panel was ACTUALLY placed on. This panel
	// always asks for `"bottom"` / `"start"`, but an input sitting low in the
	// viewport flips the side to `"top"`, and near a viewport edge clamping
	// slides the panel along the cross axis — the entrance origin has to
	// follow both, or it grows from the far corner. Seeded with the requested
	// values, so the un-flipped case never depends on a placement callback
	// having fired first.
	const { side, align } = useAnchorPosition(panel, {
		anchor: () => ctx.inputRef,
		side: "bottom",
		align: "start",
		offset: 4,
	});

	const exclude = useCallback(() => [ctx.inputRef], [ctx.inputRef]);

	// `active: ctx.open` — a plain boolean where the source needed a getter.
	// The layer stays ON the stack for its whole exit and stops being TOP of it
	// the instant `open` flips, so a second Escape during the fade falls
	// through to whatever is underneath instead of being swallowed by a panel
	// that is already leaving.
	useDismissable(panel, { onDismiss: ctx.close, exclude, active: ctx.open });

	// Convention C-2: composed ABOVE the conditional below. Calling this inside
	// the presence gate would be a conditional hook and would throw the first
	// time `mounted` flips.
	//
	// ONE bidirectional transition, never a split in/out pair: a list reopened
	// mid-exit is handed the in-flight leg as its counterpart and continues
	// from where it is instead of snapping to invisible first. That matters
	// more here than anywhere else in the family, because a suggestion list
	// closes and reopens on keystrokes — a query that stops matching closes it,
	// and the next character that matches again reverses the exit already in
	// flight.
	const panelRef = useComposedRefs(
		setPanelNode,
		presence.register(anchored, (entering) => ({ side, entering }))
	);

	// Svelte destroys the `{#if open}` branch that owns this component, and
	// marks it INERT before playing the outro — its scheduler skips inert
	// effects, so the rows on screen during the exit are frozen at whatever
	// they were the instant the close began. React re-renders an exiting
	// subtree normally, so the freeze is explicit here: without it a list that
	// closed BECAUSE its query stopped matching would empty itself to a bare
	// box halfway through its own fade, which is the single most common way
	// this particular panel closes.
	const frozen = useRef({
		suggestions: ctx.suggestions,
		query: ctx.query,
		activeIndex: ctx.activeIndex,
	});
	if (ctx.open) {
		frozen.current = {
			suggestions: ctx.suggestions,
			query: ctx.query,
			activeIndex: ctx.activeIndex,
		};
	}
	const view = frozen.current;

	// The `Portal` stays mounted and its CHILDREN are what `presence.mounted`
	// gates: `usePortalTarget` resolves its container in a layout effect, so a
	// `Portal` mounting in the same commit as the surface renders nothing on
	// that pass — and the registered node would therefore not exist yet when
	// `usePresence` looks for legs to start, which settles the group
	// immediately and skips the entrance outright.
	return (
		<Portal>
			{presence.mounted ? (
				/*
					A `<div role="listbox">`, not a `<ul>` — see Combobox's identical
					panel for why (its rows are real buttons, not a permitted child of
					`<ul>`).

					No focus trap: focus never leaves the input (`aria-activedescendant`
					tracks the active row instead). Each row is a real button, kept out
					of the tab sequence with `tabindex="-1"`, with `onMouseDown` calling
					`preventDefault()` so clicking one never blurs the input a beat
					before its own `onClick` commits the suggestion.

					`data-state` is an ordinary attribute (divergence D-2) carrying
					`surfaceState`'s TWO values — never `"opening"` (convention C-5).
					`inert` is not written by hand either: `usePresence` sets it on the
					registered node for the whole exit, which is what stops a row taking
					a click on its way out.
				*/
				<div
					ref={panelRef}
					id={ctx.panelId}
					role="listbox"
					className="ft-autocomplete-panel border-border bg-popover text-popover-foreground flex max-h-[260px] w-max min-w-[220px] flex-col gap-[1px] overflow-auto rounded-[10px] border p-[5px] text-[13px] shadow-lg outline-none"
					data-state={presence.surfaceState}
					data-side={side}
					data-align="start"
					style={{ transformOrigin: originFor(side, align) }}
				>
					{view.suggestions.map((suggestion, index) => {
						const range = getMatchRange(suggestion, view.query);
						const isActive = index === view.activeIndex;
						return (
							/*
								`onMouseDown` below defends against a real browser's
								focus-follows-mousedown default action stealing focus onto
								this row before its own `onClick` commits — without it, that
								focus shift blurs the input first, which closes the panel
								(unmounting this row) before the click already in flight can
								land. jsdom implements no such default action to suppress, so
								no test in this repo can watch this guard prevent that
								outcome — only that the call happens (the suite's "the row's
								mousedown handler calls preventDefault" dispatches a bare
								`mousedown` and checks `event.defaultPrevented`). Do not
								delete this as dead code on the strength of a green suite.
							*/
							<button
								key={suggestion}
								type="button"
								id={ctx.optionId(index)}
								role="option"
								tabIndex={-1}
								aria-selected={isActive}
								className={cn(
									"ft-autocomplete-option flex w-full cursor-pointer items-center justify-between gap-2 rounded-[6px] px-[10px] py-[7px] text-left",
									isActive && "bg-accent text-accent-foreground"
								)}
								onMouseDown={(event: MouseEvent<HTMLButtonElement>) => event.preventDefault()}
								onClick={() => ctx.select(suggestion)}
							>
								<span>
									{range ? (
										<>
											{suggestion.slice(0, range.start)}
											<strong>{suggestion.slice(range.start, range.end)}</strong>
											{suggestion.slice(range.end)}
										</>
									) : (
										suggestion
									)}
								</span>
								{isActive ? (
									<kbd aria-hidden="true" className="text-muted-foreground font-mono text-[10px]">
										⏎
									</kbd>
								) : null}
							</button>
						);
					})}
				</div>
			) : null}
		</Portal>
	);
}

AutocompletePanel.displayName = "AutocompletePanel";
