import { forwardRef } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";

import { cn } from "../../utils.js";
import { Portal } from "../../internals/Portal.js";
import { useAnchorPosition } from "../../internals/use-anchor-position.js";
import { useDismissable } from "../../internals/dismissable.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { anchored, originFor } from "../../internals/motion/anchored.js";
import { usePresence } from "../../internals/motion/presence.js";
import { useSelectContext } from "./types.js";
import type { SelectOption } from "./types.js";
import "./select-panel.css";

export interface SelectPanelProps {
	/** Additional CSS classes, merged onto the panel. */
	className?: string;
}

/**
 * `Select`'s portalled listbox.
 *
 * No focus trap here, unlike a dialog surface — a combobox listbox is not a
 * dialog. Focus deliberately never leaves the trigger; the active row is only
 * ever communicated through `aria-activedescendant` on the button, which is
 * why this panel carries `role="listbox"` and `role="option"` rows instead of
 * a plain menu. Focus staying there through a mouse click specifically depends
 * on `preventFocusSteal` below, not merely on this component never calling
 * `.focus()` — see its own comment.
 *
 * ONE bidirectional transition, never a split in/out pair: `usePresence` owns
 * both directions on one clock, so a panel reopened mid-exit continues from
 * where it is instead of snapping to invisible first. `entering` is what tells
 * the transition which way it is going, and it arrives from the presence
 * handle rather than being guessed from a direction the runtime reports as
 * `"both"`.
 *
 * `Select` renders this component unconditionally and the mount gate lives
 * here — the React shape of the source's `{#if open}` one level up, which is
 * also why `open` still has to arrive through the context. `data-state` is an
 * ORDINARY attribute (divergence D-2): the source writes it imperatively from
 * a transition event because its scheduler skips effects inside a closing
 * branch, and React re-renders an exiting surface normally. `inert` is never
 * written by hand either: `usePresence` sets it on the registered node for the
 * whole exit, which is exactly what a closing listbox wants — the rows stop
 * taking clicks the instant the panel starts leaving.
 */
export const SelectPanel = forwardRef<HTMLDivElement, SelectPanelProps>(function SelectPanel(
	{ className },
	forwardedRef
) {
	// `Select` only ever renders this component beneath its own provider, so
	// the context is always present by the time this runs.
	const ctx = useSelectContext();

	// Convention C-1: the NODE, not a ref. The panel element is created by
	// `presence.mounted`, so a `useRef` + `[]`-deps effect would still be
	// holding `null` when the anchoring and dismiss effects fire.
	const [panel, setPanelNode] = useElementRef<HTMLDivElement>();

	const presence = usePresence(ctx.open);

	// The side and alignment the panel was ACTUALLY placed on — the requested
	// ones until `computePosition` flips or clamps them away from a viewport
	// edge. Seeded with the request rather than a hardcoded `"bottom"`, so the
	// common never-flipped case never depends on a first placement callback
	// having fired: a wrong seed would be a one-frame origin jump on every
	// open. The hook returns what the source kept in two `$state` locals fed
	// by `onPlacement`.
	const { side: resolvedSide, align: resolvedAlign } = useAnchorPosition(panel, {
		anchor: () => ctx.triggerRef,
		side: ctx.side,
		align: ctx.align,
		offset: 4,
	});

	// `active: ctx.open` — a plain boolean where the source needed a getter.
	// The layer stays ON the stack for its whole exit and stops being TOP of
	// it the instant `open` flips, so a second Escape during the fade falls
	// through to whatever is underneath.
	useDismissable(panel, {
		onDismiss: ctx.close,
		exclude: () => [ctx.triggerRef],
		active: ctx.open,
	});

	// Convention C-2: composed ABOVE any conditional. Calling this inside the
	// JSX branch below would be a conditional hook and would throw the first
	// time `mounted` flips.
	const panelRef = useComposedRefs(
		setPanelNode,
		forwardedRef,
		presence.register(anchored, (entering) => ({ side: resolvedSide, entering }))
	);

	function rowClasses(index: number, option: SelectOption): string {
		return cn(
			"ft-select-option flex cursor-pointer items-center justify-between gap-2 rounded-[6px] px-[10px] py-[7px] text-foreground select-none",
			(ctx.isSelected(index) || ctx.isActive(index)) && "bg-accent text-accent-foreground",
			option.disabled && "cursor-not-allowed opacity-50"
		);
	}

	function handleClick(index: number, option: SelectOption): void {
		if (option.disabled) return;
		ctx.commit(index);
	}

	function handlePointerEnter(index: number, option: SelectOption): void {
		if (option.disabled) return;
		ctx.setActive(index);
	}

	// A real mousedown on ANY element carrying a `tabindex` attribute — even
	// `-1` — moves DOM focus to it as the browser's own default action,
	// independent of whether application JS ever calls `.focus()` on it.
	// Never calling `.focus()` ourselves is not what keeps focus on the
	// trigger; cancelling that default action is. Without this, clicking a
	// row focuses the row first (mousedown), the click then commits and
	// closes the panel, the row is removed from the DOM, and focus falls
	// through to `document.body`.
	function preventFocusSteal(event: ReactMouseEvent): void {
		event.preventDefault();
	}

	// The `Portal` stays ABOVE the mounted gate and the gate wraps its
	// CHILDREN. `usePortalTarget` resolves its container in a layout effect,
	// so a `Portal` mounting in the same commit as the panel renders nothing
	// on that pass — the registered node would then not exist when
	// `usePresence` looks for legs to start, and the entrance would be
	// silently skipped. Hoisting it resolves the container once, at this
	// component's own mount, which is `Select`'s mount: every later open
	// attaches its node in the very commit presence is waiting for.
	return (
		<Portal>
			{presence.mounted ? (
				<div
					ref={panelRef}
					id={ctx.panelId}
					role="listbox"
					className={cn(
						"ft-select-panel border-border bg-popover text-popover-foreground flex w-max min-w-[160px] flex-col gap-[1px] rounded-[10px] border p-[5px] text-[13px] shadow-lg outline-none",
						className
					)}
					data-state={presence.surfaceState}
					data-side={resolvedSide}
					// The REQUESTED alignment, not the resolved one, exactly as
					// the source publishes it — while `data-side` beside it is the
					// resolved value. The asymmetry is inherited deliberately
					// (fidelity over improvement); it is invisible until a clamp
					// actually moves the alignment, which needs a real viewport
					// edge.
					data-align={ctx.align}
					// `transform-origin` only — never `position`, `left` or
					// `top`, which `useAnchorPosition` writes imperatively on
					// this same element.
					style={{ transformOrigin: originFor(resolvedSide, resolvedAlign) }}
				>
					{ctx.options.map((option, index) => (
						/*
							Keyboard activation for a row is not local: the trigger
							button owns every keydown (Enter/Space/arrow keys/typeahead)
							and drives selection through `aria-activedescendant`, per the
							ARIA combobox-with-listbox-popup pattern. A row-level keydown
							handler would be dead code — focus never reaches a row to fire
							one — not a missing affordance.
						*/
						<div
							key={option.value}
							id={ctx.optionId(index)}
							role="option"
							tabIndex={-1}
							aria-selected={ctx.isSelected(index)}
							aria-disabled={option.disabled ? "true" : undefined}
							className={rowClasses(index, option)}
							onMouseDown={preventFocusSteal}
							onClick={() => handleClick(index, option)}
							onPointerEnter={() => handlePointerEnter(index, option)}
						>
							<span className="truncate">{option.label}</span>
							{ctx.isSelected(index) ? (
								<span aria-hidden="true" className="text-[var(--ft-field-accent)]">
									✓
								</span>
							) : null}
						</div>
					))}
				</div>
			) : null}
		</Portal>
	);
});

SelectPanel.displayName = "SelectPanel";
