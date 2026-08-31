import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useEventCallback } from "../../internals/dom/use-event-callback.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { useFancyId } from "../../internals/use-id.js";
import { useFloat } from "../../internals/use-float.js";
import type { FloatRect } from "../../internals/float.js";
import { sanitizeHref } from "../../internals/markdown.js";
import type { SourceData } from "../../internals/ai-types.js";
import { SourceCard } from "../sources/SourceCard.js";
import "./inline-citation.css";

/**
 * Props for InlineCitation
 */
export interface InlineCitationProps {
	/** The document being cited. Its title, domain and snippet fill the preview. */
	source: SourceData;
	/** The reference number shown in the marker, e.g. `3` renders `[3]` */
	index: number;
	/** Link target. Defaults to `source.url`; pass `""` to render an unlinked marker. */
	href?: string;
	/** Replaces the default preview card body. Receives the source. */
	preview?: (source: SourceData) => ReactNode;
	/** Called each time the preview is shown, once per appearance */
	onOpen?: () => void;
	/** Additional CSS classes */
	className?: string;
}

/**
 * A model-provided url made safe for an anchor's `href`, or `""` when the
 * marker must not render as a link at all. The same normalisation the other
 * source surfaces in this package run (`SourceCard`, `WebSearch`): a
 * disallowed scheme is rejected outright by the shared markdown-link
 * sanitizer, and a scheme-less host is promoted to `https://` first — left
 * alone, an `href` of "docs.example.dev/guide" resolves against the app's own
 * origin and lands on a page that was never there. A genuine relative path
 * ("/local/guide") has nowhere else to resolve against and is left alone.
 */
function resolveHref(raw: string): string {
	if (raw === "") return "";
	const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith("//");
	const host = raw.split(/[/?#]/, 1)[0] ?? "";
	const looksHostLike = !hasScheme && !raw.startsWith("/") && host.includes(".");
	return sanitizeHref(looksHostLike ? `https://${raw}` : raw) ?? "";
}

/** How long the pointer must rest on the marker before the card appears. */
const OPEN_DELAY_MS = 150;
/** How long the card survives after the pointer leaves, so it can be walked into. */
const CLOSE_GRACE_MS = 250;

/**
 * InlineCitation
 */
export const InlineCitation = forwardRef<HTMLElement, InlineCitationProps>(function InlineCitation(
	{ source, index, href, preview, onOpen, className },
	forwardedRef
) {
	const uid = useFancyId();
	const previewId = `${uid}-preview`;

	// An explicit `""` is the opt-out, which is why this is `??` and not `||`:
	// only an omitted prop falls through to the source's own URL. Whatever it
	// ends up being clears the same scheme check every link in this family runs
	// through, since a url on a source is as model-supplied as the prose around it.
	const resolvedHref = resolveHref(href ?? source.url ?? "");
	const isLink = resolvedHref !== "";

	const [open, setOpen] = useState(false);
	// The synchronous mirror of `open`. The Svelte source reads and writes its
	// `$state` in the same breath as the timer bookkeeping; a React handler
	// closes over its render's `open` instead, and a stale read there is a second
	// `onOpen` for a card that never left the screen.
	const openRef = useRef(false);
	// Plain refs: the timers must not wake anything that writes them.
	const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	const emitOpen = useEventCallback(onOpen);

	const cancelOpen = useCallback(() => {
		if (openTimer.current === undefined) return;
		clearTimeout(openTimer.current);
		openTimer.current = undefined;
	}, []);

	const cancelClose = useCallback(() => {
		if (closeTimer.current === undefined) return;
		clearTimeout(closeTimer.current);
		closeTimer.current = undefined;
	}, []);

	const show = useCallback(() => {
		cancelOpen();
		cancelClose();
		// `onOpen` reports appearances, not intentions: a card already on screen
		// has nothing new to announce.
		if (openRef.current) return;
		openRef.current = true;
		setOpen(true);
		emitOpen();
	}, [cancelOpen, cancelClose, emitOpen]);

	const hide = useCallback(() => {
		cancelOpen();
		cancelClose();
		openRef.current = false;
		setOpen(false);
	}, [cancelOpen, cancelClose]);

	const scheduleShow = useCallback(() => {
		// A pointer that comes back during the grace window keeps the card it
		// already has rather than starting the open delay over.
		cancelClose();
		if (openRef.current || openTimer.current !== undefined) return;
		openTimer.current = setTimeout(() => {
			openTimer.current = undefined;
			show();
		}, OPEN_DELAY_MS);
	}, [cancelClose, show]);

	const scheduleHide = useCallback(() => {
		cancelOpen();
		if (!openRef.current || closeTimer.current !== undefined) return;
		closeTimer.current = setTimeout(() => {
			closeTimer.current = undefined;
			hide();
		}, CLOSE_GRACE_MS);
	}, [cancelOpen, hide]);

	// Escape is bound to the window rather than the marker so it also dismisses a
	// card that was opened by hover, when nothing on the page holds focus.
	useEffect(() => {
		if (!open) return;
		const onKeydown = (event: KeyboardEvent) => {
			if (event.key === "Escape") hide();
		};
		window.addEventListener("keydown", onKeydown);
		return () => window.removeEventListener("keydown", onKeydown);
	}, [open, hide]);

	// Reads nothing, so it runs once and its teardown is the unmount cleanup.
	useEffect(
		() => () => {
			cancelOpen();
			cancelClose();
		},
		[cancelOpen, cancelClose]
	);

	// The marker element, both for the caller's ref and for the float's anchor.
	const [markerEl, markerRef] = useElementRef<HTMLElement>();
	const composedMarkerRef = useComposedRefs<HTMLElement>(forwardedRef, markerRef);
	const markerLive = useLiveRef(markerEl);

	// The anchor is read through a getter so the float re-measures the marker on
	// every scroll and resize tick instead of holding a stale element rect.
	const anchor = useCallback(
		(): FloatRect | null => markerLive.current?.getBoundingClientRect() ?? null,
		[markerLive]
	);
	// In the DOM only while it is on screen, so the hook is handed `null` — and
	// does nothing at all — for as long as the card is closed.
	const [previewEl, previewRef] = useElementRef<HTMLSpanElement>();
	useFloat(previewEl, { anchor, placement: "top", offset: 8 });

	// The superscript is done in the colocated stylesheet rather than with
	// utilities: its font size, line height and lift are one setting, and
	// splitting them across two files is how a marker ends up taller than the
	// line it sits on.
	const markerClass = cn(
		"ft-citation-marker inline-flex cursor-pointer items-center rounded px-[0.2em] font-medium tabular-nums no-underline transition-colors focus-visible:ring-1 focus-visible:outline-none",
		className
	);

	// The card is a SourceCard, which already carries a border, a surface and its
	// own padding. Wrapping that in a second bordered, padded box would draw a card
	// inside a card, so the chrome here is only put back for a body we do not
	// control.
	const previewClass = cn(
		"ft-citation-preview text-popover-foreground z-50 block rounded-lg text-left text-sm shadow-lg",
		preview ? "border p-3" : undefined
	);

	// The marker's text is a bare number; on its own it names nothing, so the
	// title rides along as the accessible name and the card stays supplementary.
	const markerLabel = `Source ${index}: ${source.title}`;
	const describedBy = open ? previewId : undefined;

	/*
	 * The marker and the card sit in one fragment with nothing between them. JSX
	 * drops a newline between two elements, but it keeps a literal space or a
	 * `{" "}` — and such a text node lands between the marker and whatever the
	 * sentence does next, which is how `read[3].` becomes `read[3] .` in every
	 * sentence ending on a citation. The test named for it is the guard.
	 */
	return (
		<>
			{isLink ? (
				<a
					ref={composedMarkerRef}
					href={resolvedHref}
					target="_blank"
					rel="noopener noreferrer nofollow ugc"
					className={markerClass}
					aria-label={markerLabel}
					aria-describedby={describedBy}
					onMouseEnter={scheduleShow}
					onMouseLeave={scheduleHide}
					onFocus={show}
					onBlur={hide}
				>
					[{index}]
				</a>
			) : (
				<button
					ref={composedMarkerRef}
					type="button"
					className={markerClass}
					aria-label={markerLabel}
					aria-describedby={describedBy}
					onMouseEnter={scheduleShow}
					onMouseLeave={scheduleHide}
					onFocus={show}
					onBlur={hide}
					onClick={show}
				>
					[{index}]
				</button>
			)}
			{open && (
				/*
				 * Rendered only while it is on screen: a tooltip that lives in the DOM
				 * permanently is a hidden paragraph every crawler and every screen-reader
				 * element list has to step over, mid-sentence, once per citation.
				 */
				<span
					ref={previewRef}
					id={previewId}
					role="tooltip"
					className={previewClass}
					onMouseEnter={cancelClose}
					onMouseLeave={scheduleHide}
				>
					{preview ? (
						preview(source)
					) : (
						/*
						 * The same card the sources list shows, so a document a reader met in
						 * one place is recognisable in the other and there is one set of rules
						 * for deriving its host and its monogram — but in its plain, non-anchor
						 * shape: this preview is dismissed on blur, so a link inside it is one
						 * no keyboard can ever reach. The marker itself is already that link.
						 * A consumer's own `preview` body is theirs to compose and is left alone.
						 */
						<SourceCard source={source} interactive={false} />
					)}
				</span>
			)}
		</>
	);
});
