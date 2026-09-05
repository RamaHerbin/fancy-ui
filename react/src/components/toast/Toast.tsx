import { forwardRef, useRef } from "react";

import { cn } from "../../utils.js";
import { dismissToast, pauseToast, resumeToast } from "./store.js";
import type { ToastItem } from "./store.js";
import "./toast.css";

export interface ToastProps {
	/** The toast to render. */
	item: ToastItem;
	/** Additional classes for the toast panel. */
	className?: string;
}

const VARIANT_ICON_CLASSES: Record<ToastItem["variant"], string> = {
	success: "ft-toast-icon--success",
	error: "ft-toast-icon--error",
	info: "ft-toast-icon--info",
	loading: "",
};

/**
 * One toast panel. Renders what the store hands it and wires the pause /
 * resume protocol; the entrance and exit animation belong to `<Toaster>`,
 * whose per-item presence clock attaches to this component's forwarded ref —
 * the React spelling of the source's two separate `in:`/`out:` directives on
 * this same root element (a toast has no `open` boolean: its existence IS its
 * open state, so the mount clock has to live with whatever renders the list).
 */
export const Toast = forwardRef<HTMLDivElement, ToastProps>(function Toast(
	{ item, className },
	forwardedRef
) {
	// Pause while *either* the pointer or focus is on the toast, and only
	// resume once *both* have left. Two independent booleans instead of one
	// shared flag: hovering with the mouse while also tabbing through the
	// toast's buttons (or the reverse) must not resume the countdown just
	// because one of the two let go first — `pauseToast`/`resumeToast` are
	// idempotent, so re-pausing while still engaged is a harmless no-op.
	// Plain refs, not state: nothing in the markup reads them, exactly as the
	// source keeps them non-reactive.
	const hovering = useRef(false);
	const focusedWithin = useRef(false);

	function syncTimer() {
		if (hovering.current || focusedWithin.current) {
			pauseToast(item.id);
		} else {
			resumeToast(item.id);
		}
	}

	function handlePointerEnter() {
		hovering.current = true;
		syncTimer();
	}

	function handlePointerLeave() {
		hovering.current = false;
		syncTimer();
	}

	function handleFocusIn() {
		focusedWithin.current = true;
		syncTimer();
	}

	function handleFocusOut() {
		focusedWithin.current = false;
		syncTimer();
	}

	function handleAction() {
		item.action?.onClick();
	}

	function handleDismiss() {
		dismissToast(item.id);
	}

	const classes = cn(
		"ft-toast bg-popover text-popover-foreground border-border flex w-[300px] items-center gap-3 rounded-xl border p-3 shadow-[0_12px_32px_rgba(0,0,0,.5)]",
		item.variant === "error" && "border-destructive/30",
		className
	);

	return (
		<div
			ref={forwardedRef}
			className={classes}
			data-state="open"
			data-variant={item.variant}
			onPointerEnter={handlePointerEnter}
			onPointerLeave={handlePointerLeave}
			// React delegates `onFocus`/`onBlur` on the bubbling
			// `focusin`/`focusout` pair — the same two events the source
			// listens for on this element.
			onFocus={handleFocusIn}
			onBlur={handleFocusOut}
		>
			<span
				className={cn("ft-toast-icon flex-none text-[14px]", VARIANT_ICON_CLASSES[item.variant])}
				aria-hidden="true"
			>
				{item.variant === "loading" ? (
					<span className="ft-toast-spinner"></span>
				) : item.variant === "success" ? (
					"✓"
				) : item.variant === "error" ? (
					"✕"
				) : (
					"ℹ"
				)}
			</span>

			<div className="flex flex-1 flex-col gap-0.5">
				<span className="text-[13px] font-medium">{item.title}</span>
				{item.description ? (
					<span className="text-muted-foreground text-[11px]">{item.description}</span>
				) : null}
			</div>

			{item.action ? (
				<button
					type="button"
					className="ft-toast-action shrink-0 text-[12px] font-medium hover:underline"
					onClick={handleAction}
				>
					{item.action.label}
				</button>
			) : null}

			<button
				type="button"
				className="text-muted-foreground hover:text-foreground shrink-0 text-[12px] transition-colors"
				aria-label="Dismiss"
				onClick={handleDismiss}
			>
				✕
			</button>
		</div>
	);
});
