import { useContext } from "react";
import type { ReactNode } from "react";

import { cn } from "../../utils.js";
import { COMPOSER_CONTEXT_KEY } from "./types.js";

/**
 * Props for ComposerSubmit
 */
export interface ComposerSubmitProps {
	/** Accessible name while the composer is idle. */
	label?: string;
	/** Accessible name while a response is streaming. */
	stopLabel?: string;
	/** Replaces the built-in icon. Rendered in both the send and the stop state. */
	children?: ReactNode;
	/** Additional CSS classes */
	className?: string;
}

/** The send button, which becomes a stop button for as long as a response is arriving. */
export function ComposerSubmit({
	label = "Send",
	stopLabel = "Stop",
	children,
	className,
}: ComposerSubmitProps) {
	// Undefined when the button is used outside a Composer: it then renders as a
	// permanently disabled button rather than throwing.
	const composer = useContext(COMPOSER_CONTEXT_KEY);

	const streaming = composer?.streaming ?? false;
	const empty =
		(composer?.value.current ?? "").trim() === "" &&
		(composer?.attachments.current.length ?? 0) === 0;
	// A stop button with nothing to call is a lie, so it goes grey — which is also
	// what happens with no context at all.
	// `composer.stop` is always a function — the root publishes one whether or not
	// a consumer passed `onStop` — so the context reports separately whether there
	// is anything behind it.
	const stoppable = composer?.stoppable ?? false;
	// Outside a composer both branches land on disabled: there is nothing to stop,
	// and an absent draft is an empty one.
	const isDisabled = (composer?.disabled ?? false) || (streaming ? !stoppable : empty);

	const name = streaming ? stopLabel : label;

	return (
		<button
			type={streaming ? "button" : "submit"}
			className={cn(
				"ft-composer-submit bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-ring inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40",
				className
			)}
			disabled={isDisabled}
			aria-label={name}
			title={name}
			onClick={streaming ? () => composer?.stop() : undefined}
		>
			{children ??
				(streaming ? (
					<svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
						<rect x="3" y="3" width="10" height="10" rx="2" fill="currentColor" />
					</svg>
				) : (
					<svg
						viewBox="0 0 16 16"
						className="size-4"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<path d="M14 2 2 6.8l4.6 2.6L9.2 14z" />
						<path d="M14 2 6.6 9.4" />
					</svg>
				))}
		</button>
	);
}
