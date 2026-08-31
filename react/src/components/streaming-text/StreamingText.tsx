import { forwardRef, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { cn } from "../../utils.js";
import { StreamText } from "../../internals/StreamText.js";
import { Markdown } from "../../internals/markdown/Markdown.js";
import "./streaming-text.css";

export interface StreamingTextProps {
	/**
	 * The accumulated text so far — not the latest delta. Reassign it with a
	 * longer string as chunks arrive and the growth is what animates.
	 */
	text: string;
	/** While true, a soft block cursor trails the last character. */
	streaming?: boolean;
	/** Render the text as markdown instead of a tinted plain-text stream. */
	markdown?: boolean;
	/** How long a newly arrived chunk stays tinted, in ms. Plain mode only. */
	settleMs?: number;
	/** Colour a chunk fades from, and the cursor's fill. Any CSS colour. */
	tintColor?: string;
	/** Called once when `streaming` goes from true to false. */
	onComplete?: () => void;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Markdown renders block children, so a cursor appended after the document
 * would sit on its own line below it. It goes in through `trailingCursor`
 * instead, which puts it inside the last block's own inline run. Plain text
 * is already inline, so there it is simply rendered after the stream.
 */
const cursor = <span className="ft-streaming-cursor" aria-hidden="true" />;

export const StreamingText = forwardRef<HTMLSpanElement, StreamingTextProps>(function StreamingText(
	{ text, streaming = false, markdown = false, settleMs = 350, tintColor, onComplete, className },
	ref,
) {
	// Seeded from the initial prop so a component that mounts with streaming
	// already false — a replayed transcript, say — does not report completion
	// it never witnessed. Only the true → false edge fires.
	const wasStreamingRef = useRef(streaming);
	useEffect(() => {
		const now = streaming;
		if (wasStreamingRef.current && !now) onComplete?.();
		wasStreamingRef.current = now;
	}, [streaming, onComplete]);

	const style = tintColor ? ({ ["--ft-tint-color" as string]: tintColor } as CSSProperties) : undefined;

	return (
		<span
			ref={ref}
			className={cn("ft-streaming-text", markdown && "ft-streaming-block", className)}
			style={style}
		>
			{markdown ? (
				<Markdown text={text} trailingCursor={streaming ? cursor : undefined} />
			) : (
				<>
					<StreamText text={text} settleMs={settleMs} />
					{streaming ? cursor : null}
				</>
			)}
		</span>
	);
});
