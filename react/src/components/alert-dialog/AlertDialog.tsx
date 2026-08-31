import { forwardRef, useRef, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "../../utils.js";
import { useFancyId } from "../../internals/use-id.js";
import { Button } from "../button/index.js";
import { DialogSurface } from "../dialog/DialogSurface.js";

export interface AlertDialogProps {
	/** Whether the alert dialog is open. Controlled when given; the component keeps its own copy either way. */
	open?: boolean;
	/** Fires whenever `open` changes — Confirm, Cancel, or Escape. */
	onOpenChange?: (open: boolean) => void;
	/** The heading. Omitted entirely (not just visually) when not given, so `aria-labelledby` never points at nothing. */
	title?: string;
	/** The warning copy under the title. Same omission rule as `title`. */
	description?: string;
	/** Label of the destructive action. */
	confirmLabel?: string;
	/** Label of the safe action. */
	cancelLabel?: string;
	/** Called when the destructive action is activated, before the surface closes. */
	onConfirm?: () => void;
	/**
	 * Called when the safe action is activated, before the surface closes —
	 * and also when Escape closes the surface, since Escape is treated as
	 * the keyboard equivalent of Cancel here. See the README for why.
	 */
	onCancel?: () => void;
	/** Element to focus once the surface opens. Defaults to the Cancel button — see the README. */
	initialFocus?: HTMLElement | null;
	/** Optional trigger; renders in place and opens the surface on activation. */
	trigger?: ReactNode;
	/** Additional classes for the panel. */
	className?: string;
}

export const AlertDialog = forwardRef<HTMLDivElement, AlertDialogProps>(function AlertDialog(
	{
		open: openProp,
		onOpenChange,
		title,
		description,
		confirmLabel = "Confirm",
		cancelLabel = "Cancel",
		onConfirm,
		onCancel,
		initialFocus = null,
		trigger,
		className,
	},
	forwardedRef
) {
	// The React shape of the source's `open = $bindable(false)`, identical to
	// `Dialog`'s: an internal copy seeded from the prop and re-synced during
	// render whenever the CALLER changes it, free to move on its own in
	// between. That is what lets one implementation serve a caller driving
	// `open` from its own state, a caller who passes only `onOpenChange`, and
	// a caller who passes neither and lets the trigger run the whole thing.
	//
	// Re-synced in the render path, not an effect: an effect would paint one
	// frame of the stale value first.
	const [open, setOpenState] = useState(openProp ?? false);
	const [lastOpenProp, setLastOpenProp] = useState(openProp);
	if (lastOpenProp !== openProp) {
		setLastOpenProp(openProp);
		setOpenState(openProp ?? false);
	}

	// Same guard, and the same reason, as Dialog's own `setOpen`: a dismiss
	// that changes nothing fires nothing, so a second Escape during the close
	// cannot fire `onOpenChange` — or, through `handleCancel` below,
	// `onCancel` — a second time.
	function setOpen(next: boolean) {
		if (open === next) return;
		setOpenState(next);
		onOpenChange?.(next);
	}

	// A plain ref, not state: nothing renders off it, and both consumers
	// (`exclude`, `fallbackFocus`) resolve it at event time. Also doubles as
	// `DialogSurface`'s `fallbackFocus` target below — see Dialog's identical
	// field for why.
	const triggerRef = useRef<HTMLElement | null>(null);

	function openFromTrigger() {
		if (open) return;
		setOpen(true);
	}

	// Escape's only path to closing this surface. Routing it through the
	// exact same function the Cancel button calls is the point, not an
	// implementation shortcut — see the README's "why is Escape wired to
	// onCancel" note: a user who presses Escape on a destructive prompt
	// meant to back out, the same thing clicking Cancel means, so both fire
	// the same callback.
	function handleCancel() {
		onCancel?.();
		setOpen(false);
	}

	function handleConfirm() {
		onConfirm?.();
		setOpen(false);
	}

	const uid = useFancyId();
	const titleId = title ? `${uid}-title` : undefined;
	const descriptionId = description ? `${uid}-description` : undefined;

	const panelContent = (
		<>
			<div className="flex items-center gap-2">
				<span className="text-destructive" aria-hidden="true">
					⚠
				</span>
				{title ? (
					<h2 id={titleId} className="text-[15px] font-semibold text-balance">
						{title}
					</h2>
				) : null}
			</div>
			{description ? (
				<p id={descriptionId} className="text-muted-foreground text-[12.5px] leading-relaxed">
					{description}
				</p>
			) : null}
			<div className="flex justify-end gap-2">
				{/*
					Cancel first in DOM order — on top of matching the mockup's own
					left-to-right layout, this is what makes it the focus trap's default
					focus target (the trap always focuses the first focusable descendant
					absent an explicit `initialFocus`), with no extra wiring needed to
					satisfy "cancel, not confirm, is focused first" for the common case
					of no override.
				*/}
				<Button variant="outline" size="sm" onclick={handleCancel}>
					{cancelLabel}
				</Button>
				<Button variant="destructive" size="sm" onclick={handleConfirm}>
					{confirmLabel}
				</Button>
			</div>
		</>
	);

	return (
		<>
			{trigger ? (
				/*
					See Dialog's identical wrapper for why this has no ARIA role of its
					own: it only listens for the click bubbling up from whatever
					`trigger` renders, which is expected to be a real interactive
					element carrying its own keyboard activation. `display: contents`
					keeps it out of layout entirely.
				*/
				<span
					ref={(node) => {
						triggerRef.current = node;
					}}
					className="contents"
					onClick={openFromTrigger}
				>
					{trigger}
				</span>
			) : null}
			<DialogSurface
				ref={forwardedRef}
				open={open}
				role="alertdialog"
				titleId={titleId}
				descriptionId={descriptionId}
				escape={true}
				outsideClick={false}
				onDismiss={handleCancel}
				initialFocus={initialFocus}
				fallbackFocus={() => triggerRef.current}
				exclude={() => [triggerRef.current]}
				panelClass={cn("border-destructive/25", className)}
			>
				{panelContent}
			</DialogSurface>
		</>
	);
});

AlertDialog.displayName = "AlertDialog";
