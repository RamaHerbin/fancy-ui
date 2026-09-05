import { forwardRef, useRef, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "../../utils.js";
import { useFancyId } from "../../internals/use-id.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { DialogSurface } from "./DialogSurface.js";

export interface DialogProps {
	/** Whether the dialog is open. Controlled when given; the component keeps its own copy either way. */
	open?: boolean;
	/** Fires whenever `open` changes, from any trigger — the close button, Escape, an outside click, or the optional `trigger` node. */
	onOpenChange?: (open: boolean) => void;
	/** The heading. Omitted entirely (not just visually) when not given, so `aria-labelledby` never points at nothing. */
	title?: string;
	/** The copy under the title. Same omission rule as `title`. */
	description?: string;
	/** Whether Escape and an outside click close the dialog. The close button always works regardless — see the README. */
	dismissible?: boolean;
	/** Element to focus once the dialog opens. Defaults to the first focusable descendant — often the close button; pass a form field here for dialogs built around one. */
	initialFocus?: HTMLElement | null;
	/** The dialog's body. */
	children?: ReactNode;
	/** The action row under the body. Free-form — callers build their own buttons. */
	footer?: ReactNode;
	/** Optional trigger; renders in place and opens the dialog on activation. */
	trigger?: ReactNode;
	/** Additional classes for the panel. */
	className?: string;
	/**
	 * Plays the matching open/close cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

export const Dialog = forwardRef<HTMLDivElement, DialogProps>(function Dialog(
	{
		open: openProp,
		onOpenChange,
		title,
		description,
		dismissible = true,
		initialFocus = null,
		children,
		footer,
		trigger,
		className,
		sound = false,
	},
	forwardedRef
) {
	// The React shape of the source's `open = $bindable(false)`: an internal
	// copy seeded from the prop, re-synced during render whenever the CALLER
	// changes the prop, and free to move on its own in between. That is what
	// makes all three documented call shapes work off one implementation — a
	// caller driving `open` from its own state, a caller who passes only
	// `onOpenChange`, and a caller who passes neither and lets the trigger
	// run the whole thing.
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

	// A no-op while `sound` is false, so the call sites below stay unguarded.
	const playCue = useSoundCue(sound);

	// The only place `open` changes on this side of the wire — a plain
	// function, not an effect, so it never fights a caller's own controlled
	// write and never reads/writes `open` in the same pass.
	function setOpen(next: boolean) {
		// A dismiss that changes nothing fires nothing. Belt and braces beside
		// the dismiss layer's own `active` gate — `active` stops the listener,
		// this stops the callback — and it fixes a real defect on its own: a
		// second Escape during the close used to fire `onOpenChange(false)` a
		// second time.
		// The same guard is what keeps the cues honest: a redundant call — a
		// second Escape mid-exit, a dismiss that changes nothing — stays
		// silent rather than doubling up, and a dialog driven purely by the
		// `open` prop never reaches this function's open branch, so it opens
		// silently by design.
		if (open === next) return;
		setOpenState(next);
		playCue(next ? "open" : "close");
		onOpenChange?.(next);
	}

	// A plain ref, not state: nothing renders off it. It only has to exist by
	// the time `useDismissable`'s `exclude` callback runs, and both that and
	// `fallbackFocus` below are resolved at event time. Doubles as
	// `DialogSurface`'s `fallbackFocus` target — a real, findable place for
	// focus to land on close if whatever had focus when the dialog opened is
	// no longer in the document by the time it closes.
	const triggerRef = useRef<HTMLElement | null>(null);

	// The wrapper only listens for the click bubbling up from whatever the
	// caller put inside `trigger` — it adds no interactive semantics of its
	// own, so the trigger's own content (expected to be a real button or
	// similar) is what carries keyboard activation. `exclude` on
	// `DialogSurface` below is what stops this same element from reading as
	// an "outside" pointerdown once the dialog is open, so clicking the
	// trigger again while open cannot immediately dismiss what it just — or
	// is about to — open.
	function openFromTrigger() {
		if (open) return;
		setOpen(true);
	}

	// One seed, two suffixes — the same one-generator-per-instance pattern
	// FormField and RadioGroup use, safe during SSR. Undefined rather than a
	// generated id with nothing pointing at it while the title/description
	// they'd label are not rendered.
	const uid = useFancyId();
	const titleId = title ? `${uid}-title` : undefined;
	const descriptionId = description ? `${uid}-description` : undefined;

	const panelContent = (
		<>
			<div className="flex items-start justify-between gap-3">
				{title ? (
					<h2 id={titleId} className="text-[15px] font-semibold text-balance">
						{title}
					</h2>
				) : null}
				{/*
					Always rendered and always functional, independent of `dismissible`:
					this is an explicit, deliberate activation — like clicking a Cancel
					button — not the accidental miss-click `dismissible` guards against,
					so a dialog that turns off Escape/outside-click to protect
					in-progress work still leaves one unambiguous way out.
				*/}
				<button
					type="button"
					className="ft-dialog-close text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:ring-[3px] focus-visible:ring-[var(--ft-overlay-accent)]/35 focus-visible:outline-none"
					onClick={() => setOpen(false)}
					aria-label="Close"
				>
					<span aria-hidden="true">✕</span>
				</button>
			</div>
			{description ? (
				<p id={descriptionId} className="text-muted-foreground text-[12.5px] leading-relaxed">
					{description}
				</p>
			) : null}
			{children}
			{footer ? <div className="flex justify-end gap-2">{footer}</div> : null}
		</>
	);

	return (
		<>
			{trigger ? (
				/*
					This wrapper adds no semantics of its own on purpose — it only
					listens for the click bubbling up from whatever `trigger` renders,
					which is expected to be a real interactive element (a Button,
					typically) carrying its own keyboard activation. `display: contents`
					keeps it out of layout entirely, so it never affects how the
					trigger's own content positions itself.
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
				role="dialog"
				titleId={titleId}
				descriptionId={descriptionId}
				escape={dismissible}
				outsideClick={dismissible}
				onDismiss={() => setOpen(false)}
				initialFocus={initialFocus}
				fallbackFocus={() => triggerRef.current}
				exclude={() => [triggerRef.current]}
				panelClass={cn(className)}
			>
				{panelContent}
			</DialogSurface>
		</>
	);
});

Dialog.displayName = "Dialog";
