import type { CSSProperties, JSX } from "react";
import { cn } from "../utils.js";
import { useLiveRef } from "./dom/use-live-ref.js";
import { useIsomorphicLayoutEffect } from "./dom/ssr.js";
import { useTextStream } from "./use-text-stream.js";
import "./stream-text.css";

export interface StreamTextProps {
	/** The whole text so far. Hand over a longer string to stream more in. */
	text: string;
	/** How long a newly arrived chunk stays tinted, in ms. */
	settleMs?: number;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Renders `text`, tinting only the delta between renders while it settles.
 *
 * Built once from the first `text`/`settleMs` it sees — the server renders
 * the whole string as a single plain span, and only later growth animates —
 * mirroring the Svelte source's `untrack(() => createTextStream(...))`. The
 * push that reconciles the stream with a new `text` runs in a layout effect,
 * before paint, so a re-render never flashes the previous content for a
 * frame.
 */
export function StreamText({ text, settleMs = 350, className }: StreamTextProps): JSX.Element {
	// A live getter, read once per pushed chunk (never during render), so a
	// later `settleMs` reaches later chunks instead of only the CSS custom
	// property.
	const settleMsRef = useLiveRef(settleMs);
	const { segments, push } = useTextStream(text, { settleMs: () => settleMsRef.current });

	useIsomorphicLayoutEffect(() => {
		// The first run pushes the text the stream was built from, which is a
		// no-op.
		push(text);
	}, [text, push]);

	return (
		<span
			className={cn("ft-stream", className)}
			style={{ whiteSpace: "pre-wrap", ["--ft-settle" as string]: `${settleMs}ms` } as CSSProperties}
		>
			{segments.map((segment) => (
				<span key={segment.id} className={segment.fresh ? "ft-fresh" : undefined}>
					{segment.text}
				</span>
			))}
		</span>
	);
}
