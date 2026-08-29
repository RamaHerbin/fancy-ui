import { forwardRef, useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { Side, Align } from "../../internals/anchor-position.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { useFancyId } from "../../internals/use-id.js";
import { PopoverContent } from "./PopoverContent.js";
import { POPOVER_KEY } from "./types.js";
import type { PopoverContext } from "./types.js";
import "./popover.css";

export interface PopoverProps {
	/**
	 * Whether the panel is open.
	 *
	 * The source declares this `$bindable(false)`; React has no two-way
	 * channel, so the component keeps its own copy either way and re-syncs it
	 * whenever the CALLER changes the prop. That is what makes all three
	 * documented call shapes work off one implementation — a caller driving
	 * `open` from its own state, a caller who passes only `onOpenChange`, and
	 * a caller who passes a plain unbound value alongside it.
	 */
	open?: boolean;
	/** Called with the new value whenever the panel opens or closes, however the change happened. */
	onOpenChange?: (open: boolean) => void;
	/** Side of the trigger to place the panel on. */
	side?: Side;
	/** Alignment along the trigger's cross axis. */
	align?: Align;
	/** Gap in pixels between the trigger and the panel. */
	offset?: number;
	/** Whether Escape and an outside click close the panel. */
	dismissible?: boolean;
	/**
	 * The trigger's content. Rendered inside the real `<button>` this
	 * component owns — keep it to text/icons, not another interactive
	 * control, or activation ends up on two nested buttons at once.
	 */
	trigger?: ReactNode;
	/** The panel's content. */
	children?: ReactNode;
	/** Additional CSS classes, merged onto the panel. */
	className?: string;
}

/**
 * The disclosure root: the real `<button>` trigger, and the portalled panel
 * it anchors.
 *
 * The source declares `ref = $bindable(null)` for the PANEL element, so the
 * panel arrives through this component's ref channel (PORTING.md
 * §"API contract") rather than through a prop.
 */
export const Popover = forwardRef<HTMLDivElement, PopoverProps>(function Popover(
	{
		open: openProp,
		onOpenChange,
		side = "bottom",
		align = "center",
		offset = 8,
		dismissible = true,
		trigger,
		children,
		className,
	},
	forwardedRef
) {
	// The trigger's `aria-controls` target. The panel isn't in the DOM at all
	// until `open` is true, so the attribute itself is gated on `open` too
	// (see the button below) — otherwise it would reference this id for the
	// entire closed lifetime of the component, which is most of it, with
	// nothing in the DOM behind it. `useFancyId()`, not `uid()`, because it
	// needs to agree with itself from the first server-rendered paint, not
	// just after hydration (convention C-6).
	const contentId = useFancyId();

	// The React shape of the source's `open = $bindable(false)`: an internal
	// copy seeded from the prop, re-synced during render whenever the CALLER
	// changes the prop, and free to move on its own in between.
	//
	// Re-synced in the render path, not an effect: an effect would paint one
	// frame of the stale value first, and the pattern React documents for
	// "adjust state when a prop changes" is exactly this — set state on the
	// component that owns it, during render, and let React restart the render
	// before committing anything.
	const [open, setOpenState] = useState(openProp ?? false);
	const [lastOpenProp, setLastOpenProp] = useState(openProp);
	if (lastOpenProp !== openProp) {
		setLastOpenProp(openProp);
		setOpenState(openProp ?? false);
	}

	// A plain ref, not state: nothing renders off it. The panel reads it
	// lazily, through an anchor getter and an exclude getter that both run
	// after the trigger has committed — the button is this component's own
	// first child, so its ref is attached before the panel's subtree runs any
	// effect of its own.
	const triggerRef = useRef<HTMLButtonElement | null>(null);

	// The one place `open` changes. A plain function, not an effect —
	// writing `open` there would mean reading and writing the same state in
	// one pass, and would fight a caller's own controlled write. The guard is
	// what makes a dismiss that changes nothing fire nothing: a second Escape
	// during the fade must not call `onOpenChange(false)` a second time.
	const openRef = useLiveRef(open);
	const setOpen = useCallback(
		(next: boolean) => {
			if (openRef.current === next) return;
			setOpenState(next);
			onOpenChange?.(next);
		},
		[openRef, onOpenChange]
	);

	function toggle() {
		setOpen(!open);
	}

	const close = useCallback(() => {
		setOpen(false);
	}, [setOpen]);

	// A plain object rebuilt when its scalar inputs change — the rebuild is
	// what makes the panel re-render. `triggerRef` stays a getter over its
	// ref, which is precisely what it is on the source side.
	const context = useMemo<PopoverContext>(
		() => ({
			contentId,
			side,
			align,
			offset,
			dismissible,
			open,
			get triggerRef() {
				return triggerRef.current;
			},
			close,
		}),
		[contentId, side, align, offset, dismissible, open, close]
	);

	return (
		<POPOVER_KEY.Provider value={context}>
			<button
				ref={triggerRef}
				type="button"
				className="ft-popover-trigger border-border text-foreground hover:bg-accent hover:text-accent-foreground inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border px-[14px] py-[7px] text-[12px] font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--ft-overlay-accent)]/35 focus-visible:outline-none"
				aria-expanded={open}
				aria-controls={open ? contentId : undefined}
				onClick={toggle}
			>
				{trigger}
			</button>
			{/*
				Rendered unconditionally where the source wraps it in `{#if open}`.
				The panel now owns its own mount clock (`usePresence`), which is
				what keeps it on screen for the length of its exit — the job the
				source's branch-plus-outro did — and hoisting it above the gate is
				also what lets its `Portal` resolve a container BEFORE the commit
				that opens the panel, so the entrance leg has a node to attach to.
			*/}
			<PopoverContent ref={forwardedRef} className={className}>
				{children}
			</PopoverContent>
		</POPOVER_KEY.Provider>
	);
});

Popover.displayName = "Popover";
