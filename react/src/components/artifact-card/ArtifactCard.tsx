import { forwardRef } from "react";
import type { MouseEvent, ReactNode } from "react";
import { cn } from "../../utils.js";
import type { StreamStatus } from "../../internals/ai-types.js";
import { StreamingText } from "../streaming-text/StreamingText.js";
import "./artifact-card.css";

/**
 * Props for ArtifactCard
 */
export interface ArtifactCardProps {
	/** What the document is called. Required — it is the card's whole identity. */
	title: string;
	/** The kind of thing it is, on the muted line under the title. */
	kind?: string;
	/** Which revision is on screen, 1-based. Rendered as `v3`. */
	version?: number;
	/** How many revisions exist. With `version`, the badge reads `v3/5`. */
	versionCount?: number;
	/**
	 * Asked to show another revision, by 1-based version number. Supplying it
	 * turns the badge into a navigator; the card holds no version state itself.
	 */
	onVersionChange?: (version: number) => void;
	/** Where the document is in its life: waiting, being written, finished, failed. */
	status?: StreamStatus;
	/** The text so far — not the latest delta. Growing it is what streams. */
	preview?: string;
	/** Asked to open the document. Supplying it adds an Open button to the header rail. */
	onOpen?: () => void;
	/** Buttons for the top-right rail: copy, download, delete. */
	actions?: ReactNode;
	/** Additional CSS classes */
	className?: string;
}

/** Spoken beside the title, since the sweep and the tint say nothing out loud. */
const STATUS_LABELS = {
	idle: "Not started",
	streaming: "Writing",
	done: "Ready",
	error: "Failed",
} as const;

/** The footer a failed artifact grows, since no `error` string is carried here. */
const ERROR_TEXT = "This document could not be generated.";

/**
 * Anything that has its own activation gets to keep it: a click on the version
 * navigator or on an action button must not also count as opening the card.
 * The two rails are named alongside the controls themselves, because the gaps
 * between their buttons belong to them too — a click that lands beside an arrow,
 * or on a disabled one, is aimed at the navigator, not at the document.
 */
const CONTROL_SELECTOR = "a[href], button, input, select, textarea, [contenteditable='true']";
const OPEN_GUARD_SELECTOR = `${CONTROL_SELECTOR}, .ft-artifact-versions, .ft-artifact-actions`;

/*
 * No `disabled:pointer-events-none`: a disabled button already swallows its own
 * clicks, and taking it out of the event flow retargets the click at the card
 * behind it — which would open the document from the arrow that refused to move.
 */
const navButtonClass =
	"text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex size-5 cursor-pointer items-center justify-center rounded transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:opacity-40";

/**
 * A generated document rendered as a thing rather than a wall of text: a title,
 * what kind of thing it is, which draft is on screen, and a few lines of the
 * document itself dissolving into the card's edge.
 *
 * The root element arrives through the ref channel rather than a `ref` prop,
 * per PORTING.md — the Svelte source declares `ref = $bindable(null)`.
 */
export const ArtifactCard = forwardRef<HTMLDivElement, ArtifactCardProps>(function ArtifactCard(
	{
		title,
		kind = "Document",
		version,
		versionCount,
		onVersionChange,
		status = "done",
		preview,
		onOpen,
		actions,
		className,
	},
	ref,
) {
	const isStreaming = status === "streaming";
	const isError = status === "error";

	const hasPreview = preview !== undefined && preview !== "";
	const hasVersion = version !== undefined;
	const hasCount = hasVersion && versionCount !== undefined && versionCount > 0;
	// A navigator only makes sense when there is somewhere to navigate to *and*
	// somebody listening; otherwise the same numbers render as a plain badge.
	const navigable = hasCount && onVersionChange !== undefined;

	const versionLabel = hasCount ? `v${version}/${versionCount}` : hasVersion ? `v${version}` : "";
	const atFirst = (version ?? 1) <= 1;
	const atLast = (version ?? 1) >= (versionCount ?? 1);

	function fromControl(event: MouseEvent<HTMLDivElement>): boolean {
		const target = event.target;
		return target instanceof Element && target.closest(OPEN_GUARD_SELECTOR) !== null;
	}

	/**
	 * Pointer-only convenience. The keyboard path is the Open button in the header
	 * rail — a real `<button>`, so `Enter` and `Space` are the browser's job — and
	 * the card itself stays a plain region rather than an ARIA button, which would
	 * make its children presentational and swallow the navigator, the actions rail
	 * and the spoken status.
	 */
	function open(event: MouseEvent<HTMLDivElement>) {
		if (fromControl(event)) return;
		onOpen?.();
	}

	function step(delta: number) {
		const current = version ?? 1;
		const next = current + delta;
		if (next < 1 || next > (versionCount ?? 1)) return;
		onVersionChange?.(next);
	}

	/*
	 * The card-wide click is a pointer shortcut for the Open button in the rail,
	 * which is where the tab stop and the key handling live. The root deliberately
	 * carries no role, no tabindex and no key handling.
	 */
	return (
		<div
			ref={ref}
			className={cn(
				"ft-artifact border-border bg-card relative w-full overflow-hidden rounded-lg border",
				onOpen && "hover:border-foreground/25 cursor-pointer transition-colors",
				className,
			)}
			data-status={status}
			onClick={onOpen ? open : undefined}
		>
			{/*
				The sweep is parked off its own left edge, so reduced motion — which never
				starts the animation — simply never sees it.
			*/}
			{isStreaming ? <span className="ft-artifact-sweep" aria-hidden="true" /> : null}

			<div className="flex items-start gap-2.5 px-3 py-2.5">
				<span className="ft-artifact-icon text-muted-foreground mt-0.5 flex-none" aria-hidden="true">
					<svg
						className="size-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.75"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M14 3v5h5" />
						<path d="M19 8v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7z" />
					</svg>
				</span>

				<div className="min-w-0 flex-1">
					<div className="ft-artifact-title text-foreground truncate text-sm font-medium">
						{title}
					</div>
					<div className="ft-artifact-kind text-muted-foreground truncate text-xs">{kind}</div>
				</div>

				<div className="flex flex-none items-center gap-1">
					{navigable ? (
						<div
							className="ft-artifact-versions text-muted-foreground flex items-center gap-0.5 text-xs"
							role="group"
							aria-label="Document versions"
						>
							<button
								type="button"
								className={navButtonClass}
								aria-label="Previous version"
								disabled={atFirst}
								onClick={() => step(-1)}
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
									<path d="m15 18-6-6 6-6" />
								</svg>
							</button>
							<span className="ft-artifact-version tabular-nums">{versionLabel}</span>
							<button
								type="button"
								className={navButtonClass}
								aria-label="Next version"
								disabled={atLast}
								onClick={() => step(1)}
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
									<path d="m9 6 6 6-6 6" />
								</svg>
							</button>
						</div>
					) : hasVersion ? (
						<span className="ft-artifact-version text-muted-foreground text-xs tabular-nums">
							{versionLabel}
						</span>
					) : null}

					{actions ? (
						<div className="ft-artifact-actions flex items-center gap-1">{actions}</div>
					) : null}

					{onOpen ? (
						/*
							The visible affordance and the operable one are the same element: a
							real button, so it takes a tab stop and handles Enter and Space on the
							browser's terms, and it names the document rather than saying "Open"
							into a list of identical cards.
						*/
						<button
							type="button"
							className="ft-artifact-open text-muted-foreground hover:text-foreground focus-visible:ring-ring ml-0.5 inline-flex cursor-pointer items-center gap-1 rounded text-xs transition-colors focus-visible:ring-1 focus-visible:outline-none"
							aria-label={`Open ${title}`}
							onClick={() => onOpen?.()}
						>
							Open
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
								<path d="M5 12h14" />
								<path d="m12 5 7 7-7 7" />
							</svg>
						</button>
					) : null}
				</div>
			</div>

			<span className="sr-only">{STATUS_LABELS[status]}</span>

			{hasPreview ? (
				<div className="ft-artifact-preview border-border border-t px-3 py-3 text-sm">
					<div className="ft-artifact-clamp">
						<StreamingText text={preview ?? ""} streaming={isStreaming} />
					</div>
				</div>
			) : null}

			{isError ? (
				<p className="ft-artifact-error border-border border-t px-3 py-2 text-xs">{ERROR_TEXT}</p>
			) : null}
		</div>
	);
});
