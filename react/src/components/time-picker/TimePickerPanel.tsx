import { forwardRef } from "react";

import { cn } from "../../utils.js";
import { Portal } from "../../internals/Portal.js";
import { useAnchorPosition } from "../../internals/use-anchor-position.js";
import { useDismissable } from "../../internals/dismissable.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { anchored, originFor } from "../../internals/motion/anchored.js";
import { usePresence } from "../../internals/motion/presence.js";
import { useTimePickerContext } from "./types.js";
import "./time-picker-panel.css";

export interface TimePickerPanelProps {
	/** Additional CSS classes, merged onto the panel. */
	className?: string;
}

/**
 * `TimePicker`'s portalled listbox of slots.
 *
 * No focus trap here, unlike a dialog surface — a listbox popup is not a
 * dialog. Focus deliberately never leaves the trigger; the active row is only
 * ever communicated through `aria-activedescendant` on the button above, which
 * is why this panel carries `role="listbox"` and `role="option"` rows instead
 * of a plain menu, and why nothing here ever calls `.focus()`.
 *
 * ONE bidirectional transition, never a split in/out pair: `usePresence` owns
 * both directions on one clock, so a panel reopened mid-exit continues from
 * where it is instead of snapping to invisible first. `entering` is what tells
 * the transition which way it is going, and it arrives from the presence
 * handle rather than being guessed from a direction the runtime reports as
 * `"both"`.
 *
 * `TimePicker` renders this component unconditionally and the mount gate lives
 * here — the React shape of the source's `{#if open}` one level up, which is
 * also why `open` still has to arrive through the context. `data-state` is an
 * ORDINARY attribute (divergence D-2): the source writes it imperatively from
 * a transition event because its scheduler skips effects inside a closing
 * branch, and React re-renders an exiting surface normally. `inert` is never
 * written by hand either: `usePresence` sets it on the registered node for the
 * whole exit, which is what stops a row taking a click on its way out.
 */
export const TimePickerPanel = forwardRef<HTMLDivElement, TimePickerPanelProps>(
	function TimePickerPanel({ className }, forwardedRef) {
		// `TimePicker` only ever renders this component beneath its own
		// provider, so the context is always present by the time this runs —
		// there is no standalone-usage fallback to design for, the same as
		// `SelectPanel`.
		const ctx = useTimePickerContext();

		// Convention C-1: the NODE, not a ref. The panel element is created by
		// `presence.mounted`, so a `useRef` + `[]`-deps effect would still be
		// holding `null` when the anchoring and dismiss effects fire.
		const [panel, setPanelNode] = useElementRef<HTMLDivElement>();

		const presence = usePresence(ctx.open);

		// The side and alignment the panel was ACTUALLY placed on — the
		// requested ones until `computePosition` flips or clamps them away from
		// a viewport edge. Seeded with the request rather than left undefined,
		// so the growth origin is already right on the first frame and only a
		// real flip ever has to correct it. The hook returns what the source
		// kept in two `$state` locals fed by `onPlacement`.
		const { side: resolvedSide, align: resolvedAlign } = useAnchorPosition(panel, {
			anchor: () => ctx.triggerRef,
			side: "bottom",
			align: "start",
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

		// Convention C-2: composed ABOVE any conditional. Calling this inside
		// the JSX branch below would be a conditional hook and would throw the
		// first time `mounted` flips.
		const panelRef = useComposedRefs(
			setPanelNode,
			forwardedRef,
			presence.register(anchored, (entering) => ({ side: resolvedSide, entering }))
		);

		function rowClasses(index: number): string {
			return cn(
				"ft-time-picker-option flex cursor-pointer items-center justify-between gap-2 rounded-[6px] px-[10px] py-[6px] font-mono text-foreground select-none",
				(ctx.isSelected(index) || ctx.isActive(index)) && "bg-accent text-accent-foreground"
			);
		}

		// The `Portal` stays ABOVE the mounted gate and the gate wraps its
		// CHILDREN. `usePortalTarget` resolves its container in a layout effect,
		// so a `Portal` mounting in the same commit as the panel renders nothing
		// on that pass — the registered node would then not exist when
		// `usePresence` looks for legs to start, and the entrance would be
		// silently skipped. Hoisting it resolves the container once, at this
		// component's own mount, which is `TimePicker`'s mount: every later open
		// attaches its node in the very commit presence is waiting for.
		return (
			<Portal>
				{presence.mounted ? (
					<div
						ref={panelRef}
						id={ctx.panelId}
						role="listbox"
						className={cn(
							"ft-time-picker-panel border-border bg-popover text-popover-foreground flex max-h-[220px] w-max min-w-[100px] flex-col gap-[1px] overflow-y-auto rounded-[10px] border p-[5px] text-[12px] shadow-lg outline-none",
							className
						)}
						data-state={presence.surfaceState}
						data-side={resolvedSide}
						// The REQUESTED alignment, not the resolved one, exactly
						// as the source publishes it — while `data-side` beside
						// it is the resolved value. The asymmetry is inherited
						// deliberately (fidelity over improvement); it is
						// invisible until a clamp actually moves the alignment,
						// which needs a real viewport edge.
						data-align="start"
						// `transform-origin` only — never `position`, `left` or
						// `top`, which `useAnchorPosition` writes imperatively on
						// this same element.
						style={{ transformOrigin: originFor(resolvedSide, resolvedAlign) }}
					>
						{ctx.slots.length === 0 ? (
							/* Reachable when `min`/`max` exclude every generated slot — see the
							   README. A real row, not silently nothing: an empty floating panel
							   with no explanation is a worse failure than this one line. */
							<p className="text-muted-foreground px-[10px] py-[7px] text-[12px] italic">
								No times available.
							</p>
						) : (
							ctx.slots.map((slot, index) => (
								/*
									Keyboard activation for this row is not local: the trigger
									button owns every keydown (Enter/Space/arrow keys/Home/End)
									and drives selection through `aria-activedescendant`, per the
									ARIA combobox-with-listbox-popup pattern. A row-level keydown
									handler would be dead code — focus never reaches a row to fire
									one — not a missing affordance.
								*/
								<div
									key={slot}
									id={ctx.optionId(index)}
									role="option"
									tabIndex={-1}
									aria-selected={ctx.isSelected(index)}
									className={rowClasses(index)}
									onClick={() => ctx.commit(index)}
									onPointerEnter={() => ctx.setActive(index)}
								>
									<span>{ctx.labelFor(slot)}</span>
									{ctx.isSelected(index) ? (
										<span aria-hidden="true" className="text-[var(--ft-field-accent)]">
											✓
										</span>
									) : null}
								</div>
							))
						)}
					</div>
				) : null}
			</Portal>
		);
	}
);

TimePickerPanel.displayName = "TimePickerPanel";
