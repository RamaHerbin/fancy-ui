import { useContext, useRef } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { cn } from "../../utils.js";
import { ComposerAttachment } from "./ComposerAttachment.js";
import { COMPOSER_CONTEXT_KEY } from "./types.js";
import "./composer-attachments.css";

/**
 * Props for ComposerAttachments
 */
export interface ComposerAttachmentsProps {
	/** Replaces the default chips. The add button and its file input stay. */
	children?: ReactNode;
	/** Accessible name and tooltip for the add button. */
	addLabel?: string;
	/** `accept` for the file picker, e.g. `"image/*,.pdf"`. Omitted by default. */
	accept?: string;
	/** Whether one pick may carry several files. */
	multiple?: boolean;
	/** Additional CSS classes */
	className?: string;
}

/** The chip row and the paperclip that fills it. */
export function ComposerAttachments({
	children,
	addLabel = "Attach files",
	accept,
	multiple = true,
	className,
}: ComposerAttachmentsProps) {
	// Undefined when the row is used outside a Composer: there is then nothing to
	// list and nowhere to send a pick, so it renders nothing rather than throwing.
	const composer = useContext(COMPOSER_CONTEXT_KEY);

	// Only ever reached imperatively, from the add button's click, so a plain ref
	// is enough — no hook is keyed on the node's existence (convention C-1).
	const inputRef = useRef<HTMLInputElement | null>(null);

	const attachments = composer?.attachments.current ?? [];
	const disabled = composer?.disabled ?? false;
	// An empty row inside a composer still earns its line — that is where the
	// paperclip lives. An empty row outside one is a button that could not work.
	const empty = composer === undefined && attachments.length === 0;

	function pick() {
		// The real picker is the hidden input; the button exists to be named,
		// focusable, and styled like the rest of the composer chrome.
		inputRef.current?.click();
	}

	function handleChange(event: ChangeEvent<HTMLInputElement>) {
		const el = event.currentTarget;
		const files = Array.from(el.files ?? []);
		// Cleared before anything else: re-picking the same file fires no second
		// change event while the input still holds the first pick, and a consumer
		// that rejects an upload would be stuck with it.
		el.value = "";
		if (files.length === 0) return;
		composer?.addFiles(files);
	}

	if (empty) return null;

	return (
		<div className={cn("ft-composer-attachments flex flex-wrap items-center gap-1.5", className)}>
			{children ??
				// The index rides along in the key: two uploads of the same file can
				// arrive carrying the same id, and a duplicate key is a crash.
				attachments.map((attachment, index) => (
					<div
						key={`${attachment.id}#${index}`}
						className="ft-composer-attachment-slot flex min-w-0"
					>
						<ComposerAttachment attachment={attachment} />
					</div>
				))}

			<button
				type="button"
				className="ft-composer-attach text-foreground/70 hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
				disabled={disabled}
				aria-label={addLabel}
				title={addLabel}
				onClick={pick}
			>
				<svg
					className="size-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.75"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
				</svg>
			</button>

			{/* Out of the tab order and out of the accessibility tree: the button above
			    is the control, and two names for one picker is one too many. */}
			<input
				ref={inputRef}
				className="ft-composer-file-input"
				type="file"
				accept={accept}
				multiple={multiple}
				disabled={disabled}
				tabIndex={-1}
				aria-hidden="true"
				onChange={handleChange}
			/>
		</div>
	);
}
