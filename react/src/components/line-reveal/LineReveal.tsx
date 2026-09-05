import { useEffect, useMemo, useState } from "react";
import {
	prepareWithSegments,
	layoutWithLines,
	type PreparedTextWithSegments,
} from "@chenglou/pretext";
import { cn } from "../../utils.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import "./line-reveal.css";

/**
 * Props for LineReveal
 *
 * Reveals text line by line with a staggered slide-up animation.
 * Line breaks are computed with @chenglou/pretext (canvas text
 * measurement), so no DOM splitting or reflow measurement is needed.
 */
export interface LineRevealProps {
	/** Text to reveal */
	text: string;
	/**
	 * CSS font shorthand used for both measurement and rendering
	 * (canvas `ctx.font` format, e.g. "600 32px Inter, sans-serif").
	 * Prefer named families: `system-ui` can resolve differently between
	 * canvas measurement and DOM rendering.
	 */
	font?: string;
	/** Line height in pixels (defaults to 1.2 × font size) */
	lineHeight?: number;
	/** Delay between lines in seconds */
	stagger?: number;
	/** Animation duration per line in seconds */
	duration?: number;
	/** Initial delay before the first line in seconds */
	delay?: number;
	/** Animate only the first time the component enters the viewport */
	once?: boolean;
	/** Additional CSS classes */
	className?: string;
}

/**
 * First `<n>px` length in a CSS font shorthand, with the optional `/line-height`
 * that may already follow it. Group 1 is the font size; the whole match is what
 * gets rewritten when the resolved line height is folded into the shorthand.
 */
const FONT_SIZE_PX = /(\d+(?:\.\d+)?)px(?:\s*\/\s*[^\s,]+)?/;

export function LineReveal({
	text,
	// Named families only: canvas and CSS can resolve `system-ui` to
	// different fonts (notably on macOS), which skews measured widths.
	font = '600 32px "Helvetica Neue", Helvetica, Arial, sans-serif',
	lineHeight,
	stagger = 0.08,
	duration = 0.7,
	delay = 0,
	once = true,
	className,
}: LineRevealProps) {
	const fontSize = Number(FONT_SIZE_PX.exec(font)?.[1] ?? 32);
	const resolvedLineHeight = lineHeight ?? Math.round(fontSize * 1.2);

	// The `font` shorthand resets `line-height`, and only the style declarations
	// whose value changed are re-applied on update — so a font-only change (same
	// px size, different weight or family) would set `font` without re-applying a
	// separately declared `line-height`, and the lines would drift inside their
	// fixed-height masks. One declaration carries both instead: the line height is
	// folded into the shorthand, and the `line-height` longhand is only used when
	// there is no px size to fold into (never both — React warns about mixing a
	// shorthand with a longhand for the same value). The `font` prop itself is
	// left untouched for canvas measurement, where `ctx.font` ignores the line
	// height anyway.
	const foldable = FONT_SIZE_PX.test(font);
	const fontWithLineHeight = foldable
		? font.replace(FONT_SIZE_PX, (_match: string, size: string) => `${size}px/${resolvedLineHeight}px`)
		: font;

	const [container, containerRef] = useElementRef<HTMLDivElement>();
	const [containerWidth, setContainerWidth] = useState(0);
	const [revealed, setRevealed] = useState(false);
	const [prepared, setPrepared] = useState<PreparedTextWithSegments | null>(null);

	// Measurement requires a canvas context, so this only runs in the browser
	// (an effect never runs during SSR). Web fonts must be loaded first or the
	// canvas silently measures with the fallback font.
	useEffect(() => {
		let cancelled = false;

		// Both steps are optional at runtime: `document.fonts` is missing wherever
		// FontFaceSet is not implemented, and measurement needs a canvas 2d context.
		// Either absence lands on the pre-measure fallback below instead of throwing
		// out of the effect and tearing the tree down.
		Promise.resolve(document.fonts?.load(font))
			.catch(() => {})
			.then(() => {
				if (cancelled) return;
				try {
					setPrepared(prepareWithSegments(text, font));
				} catch {
					setPrepared(null);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [text, font]);

	// The React counterpart of Svelte's `bind:clientWidth`: a ResizeObserver on
	// the same element, plus one read at attach time so the first layout does
	// not wait for a resize.
	useEffect(() => {
		if (!container) return;

		const measure = () => setContainerWidth(container.clientWidth);
		measure();

		const observer = new ResizeObserver(measure);
		observer.observe(container);

		return () => observer.disconnect();
	}, [container]);

	// Pure arithmetic on cached measurements — cheap to re-run on every resize.
	// Memoised on exactly what the Svelte `$derived` tracks, so toggling
	// `revealed` re-renders without redoing the line breaking.
	const layoutResult = useMemo(
		() =>
			prepared && containerWidth > 0
				? layoutWithLines(prepared, containerWidth, resolvedLineHeight)
				: null,
		[prepared, containerWidth, resolvedLineHeight]
	);

	// The Svelte source reads `once` inside the observer callback, where a prop
	// is a live getter — so a change takes effect without rebuilding the
	// observer. A live ref reproduces that; putting `once` in the dependency
	// array instead would tear down and re-observe, replaying the reveal.
	const onceRef = useLiveRef(once);

	useEffect(() => {
		if (!container) return;

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						setRevealed(true);
						if (onceRef.current) observer.disconnect();
					} else if (!onceRef.current) {
						setRevealed(false);
					}
				}
			},
			{ threshold: 0.1 }
		);

		observer.observe(container);

		return () => observer.disconnect();
	}, [container, onceRef]);

	return (
		<div
			ref={containerRef}
			className={cn("line-reveal", "relative w-full", className)}
			style={{
				font: fontWithLineHeight,
				...(foldable ? null : { lineHeight: `${resolvedLineHeight}px` }),
				height: layoutResult ? `${layoutResult.height}px` : undefined,
			}}
		>
			<span className="sr-only">{text}</span>
			{layoutResult ? (
				layoutResult.lines.map((line, i) => (
					<div
						key={i}
						className="line-mask"
						style={{ height: `${resolvedLineHeight}px` }}
						aria-hidden="true"
					>
						<div
							className={cn("line", revealed && "revealed")}
							style={{
								transitionDuration: `${duration}s`,
								transitionDelay: `${delay + i * stagger}s`,
							}}
						>
							{line.text}
						</div>
					</div>
				))
			) : (
				// SSR / pre-measure fallback: keeps text in the HTML and reserves space
				<div style={{ visibility: "hidden" }} aria-hidden="true">
					{text}
				</div>
			)}
		</div>
	);
}
