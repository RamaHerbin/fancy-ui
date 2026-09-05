import { forwardRef, type ReactNode } from "react";
import { cn } from "../../utils.js";
import { useSoundCue } from "../../sound/use-sound.js";
import "./chat-error.css";

/**
 * Props for ChatError
 */
export interface ChatErrorProps {
	/** The failure line, e.g. "Something went wrong" */
	message?: string;
	/** Secondary muted line under the message, e.g. the error code */
	detail?: string;
	/** Called when the retry button is pressed. The button only exists when this is set. */
	onRetry?: () => void;
	/** Label for the retry button */
	retryLabel?: string;
	/** Whether a retry is in flight: disables the button and marks the row busy */
	retrying?: boolean;
	/** Leading icon, replacing the default warning triangle */
	icon?: ReactNode;
	/** Rendered instead of the message and detail block */
	children?: ReactNode;
	/** Additional CSS classes */
	className?: string;
	/**
	 * Plays the press cue through the sound controller when retry is
	 * pressed. Off by default; only audible once the user has enabled
	 * sound.
	 */
	sound?: boolean;
}

/**
 * ChatError
 */
export const ChatError = forwardRef<HTMLDivElement, ChatErrorProps>(function ChatError(
	{
		message = "Something went wrong",
		detail,
		onRetry,
		retryLabel = "Retry",
		retrying = false,
		icon,
		children,
		className,
		sound = false,
	},
	ref
) {
	const playCue = useSoundCue(sound);

	// Mirrors Button's own guard: `retrying` disables the button natively, but
	// a synthetic click (or any dispatch that bypasses jsdom's disabled
	// handling) walks straight past that, so the handler checks again before
	// playing anything or calling out.
	function handleRetry() {
		if (retrying) return;
		playCue("press");
		onRetry?.();
	}

	return (
		<div
			ref={ref}
			className={cn(
				"ft-error flex w-full items-start gap-2.5 rounded-md border px-3 py-2 text-sm",
				className
			)}
			role="alert"
			aria-busy={retrying ? "true" : undefined}
		>
			{/*
				Decorative either way: the failure is carried by the message text, so the
				icon is hidden from assistive tech whether it is the default triangle or a
				caller's own icon.
			*/}
			<span className="ft-error-icon mt-0.5 flex-none" aria-hidden="true">
				{icon ?? (
					<svg
						className="size-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
						<path d="M12 9v4" />
						<path d="M12 17h.01" />
					</svg>
				)}
			</span>

			<div className="ft-error-body min-w-0 flex-1">
				{children ?? (
					<>
						<p className="ft-error-message text-foreground">{message}</p>
						{detail && <p className="ft-error-detail text-foreground/70 mt-0.5 text-xs">{detail}</p>}
					</>
				)}
			</div>

			{onRetry && (
				<button
					type="button"
					className="ft-error-retry text-foreground/80 hover:text-foreground hover:bg-foreground/5 -my-0.5 flex flex-none items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-60"
					disabled={retrying}
					onClick={handleRetry}
				>
					{retrying && <span className="ft-error-dot" aria-hidden="true"></span>}
					{retryLabel}
				</button>
			)}
		</div>
	);
});
