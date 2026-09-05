import { useContext } from "react";

import { cn } from "../../utils.js";
import { useSoundCue } from "../../sound/use-sound.js";
import type { AttachmentData } from "../../internals/ai-types.js";
import { COMPOSER_CONTEXT_KEY } from "./types.js";
import "./composer-attachment.css";

/**
 * Props for ComposerAttachment
 */
export interface ComposerAttachmentProps {
	/** The file to show: its name, and whatever the upload knows so far. */
	attachment: AttachmentData;
	/** Called with the attachment id instead of the composer's own removal. */
	onRemove?: (id: string) => void;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Powers of 1024, stopping at megabytes: a chip is not where gigabytes belong,
 * and a four-digit megabyte count still reads faster than a unit nobody
 * expects next to a file name.
 */
const UNITS = ["B", "KB", "MB"] as const;

/** Bytes as a chip-sized caption. Anything unmeasurable prints nothing at all. */
function formatSize(bytes: number | undefined): string {
	if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return "";
	let scaled = bytes;
	let unit = 0;
	while (scaled >= 1024 && unit < UNITS.length - 1) {
		scaled /= 1024;
		unit += 1;
	}
	// Bytes are whole things; the scaled units keep one decimal, and a trailing
	// `.0` is noise at this size.
	const rounded = unit === 0 ? Math.round(scaled) : Math.round(scaled * 10) / 10;
	return `${rounded} ${UNITS[unit]}`;
}

/** One file riding along with the draft: its name, its size, its upload, its cross. */
export function ComposerAttachment({ attachment, onRemove, className }: ComposerAttachmentProps) {
	// Undefined when the chip is used outside a Composer: it then relies on
	// `onRemove` alone, and goes inert without one rather than throwing.
	const composer = useContext(COMPOSER_CONTEXT_KEY);
	const playCue = useSoundCue(composer?.sound);

	const status = attachment.status;
	const uploading = status === "uploading";
	const failed = status === "error";
	// Out-of-range progress is a consumer bug, not a reason to paint a bar past
	// the end of the chip.
	const percent = Math.round(Math.min(1, Math.max(0, attachment.progress ?? 0)) * 100);
	const size = formatSize(attachment.size);
	const removeLabel = `Remove ${attachment.name}`;

	// A remove button with nothing to call is a lie, and so is a live one inside a
	// composer that has been switched off.
	const removable = onRemove !== undefined || composer !== undefined;
	const removeDisabled = !removable || (composer?.disabled ?? false);

	function remove() {
		// The native `disabled` attribute already blocks a real click, but a
		// synthetic dispatch — in a test, or from any other caller — walks
		// straight past it, so the handler guards again rather than trusting the
		// attribute alone (see Button's `handleClick`).
		if (removeDisabled) return;
		playCue("press");
		// The prop wins outright: a consumer that passes one is running its own
		// upload bookkeeping and will drop the entry itself.
		if (onRemove) {
			onRemove(attachment.id);
			return;
		}
		composer?.removeAttachment(attachment.id);
	}

	return (
		<div
			className={cn(
				"ft-composer-attachment relative flex max-w-full min-w-0 items-center gap-1.5 py-1 pr-1 pl-1.5 text-xs",
				className,
				failed && "ft-failed"
			)}
			data-status={status}
			aria-busy={uploading ? "true" : undefined}
		>
			{attachment.previewUrl ? (
				// Decorative: the file name sits right beside it and says the same thing.
				<img
					className="ft-composer-attachment-thumb size-5 shrink-0 rounded object-cover"
					src={attachment.previewUrl}
					alt=""
				/>
			) : (
				<svg
					className="size-3.5 shrink-0"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.75"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5z" />
					<path d="M14 2v6h6" />
				</svg>
			)}

			<span className="ft-composer-attachment-name max-w-32 truncate" title={attachment.name}>
				{attachment.name}
			</span>

			{size ? (
				<span className="ft-composer-attachment-size text-foreground/70 shrink-0 tabular-nums">
					{size}
				</span>
			) : null}

			{/* The tint is the only other thing that says so, and it says it to no one. */}
			{failed ? <span className="sr-only">Upload failed</span> : null}

			<button
				type="button"
				className="ft-composer-attachment-remove hover:bg-muted focus-visible:ring-ring inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
				disabled={removeDisabled}
				aria-label={removeLabel}
				title={removeLabel}
				onClick={remove}
			>
				<svg
					className="size-3"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="M18 6 6 18" />
					<path d="m6 6 12 12" />
				</svg>
			</button>

			{uploading ? (
				<span
					className="ft-composer-attachment-track"
					role="progressbar"
					aria-label={`Uploading ${attachment.name}`}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={percent}
				>
					<span className="ft-composer-attachment-bar" style={{ width: `${percent}%` }} />
				</span>
			) : null}
		</div>
	);
}
