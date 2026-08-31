import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { cn } from "../../utils.js";

/**
 * Props for ChatMessageAction
 */
export interface ChatMessageActionProps {
	/** Accessible name and tooltip. Required — the icon alone names nothing. */
	label: string;
	/** Called on click, before any confirmation label swaps in. */
	onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
	/** Pressed state for a toggle. Omit entirely for a plain button. */
	active?: boolean;
	/** Swapped in as the label for two seconds after a click, e.g. "Copied". */
	confirmLabel?: string;
	/** The icon. */
	children?: ReactNode;
	/** Additional CSS classes */
	className?: string;
}

/** How long the confirmation label holds before the button says what it does again. */
const CONFIRM_MS = 2000;

/** One icon button in the rail, optionally a toggle, optionally self-confirming. */
export function ChatMessageAction({
	label,
	onClick,
	active,
	confirmLabel,
	children,
	className,
}: ChatMessageActionProps) {
	const [confirmed, setConfirmed] = useState(false);
	// A ref, not state: the timer must not wake anything that writes it.
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	function clearTimer() {
		if (timer.current !== undefined) {
			clearTimeout(timer.current);
			timer.current = undefined;
		}
	}

	// Reads nothing, so it runs once and its teardown is the unmount cleanup.
	useEffect(() => clearTimer, []);

	function handleClick(event: MouseEvent<HTMLButtonElement>) {
		onClick?.(event);
		if (!confirmLabel) return;
		setConfirmed(true);
		// A second click restarts the window rather than inheriting the old deadline.
		clearTimer();
		timer.current = setTimeout(() => {
			setConfirmed(false);
			timer.current = undefined;
		}, CONFIRM_MS);
	}

	const currentLabel = confirmed && confirmLabel ? confirmLabel : label;

	return (
		<button
			type="button"
			className={cn(
				"text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:ring-1 focus-visible:outline-none",
				active && "bg-muted text-foreground",
				className
			)}
			aria-label={currentLabel}
			title={currentLabel}
			aria-pressed={active}
			onClick={handleClick}
		>
			{children}
		</button>
	);
}
