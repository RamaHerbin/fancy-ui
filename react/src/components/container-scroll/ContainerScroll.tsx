import { useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";
import { rafThrottle } from "../../internals/motion/raf.js";
import { cn } from "../../utils.js";
import "./container-scroll.css";

/**
 * ContainerScroll - a scroll-driven aperture
 *
 * The card starts shut: a slim horizontal slit with a bright seam of light
 * across its middle. As the section scrolls into view the slit opens
 * vertically to the full card, the seam splits into two lips that ride the
 * opening edges and fade, the content settles from a slight zoom into
 * focus, and the title above blurs away to hand the stage to the card.
 * No 3D tilt, no perspective.
 */
export interface ContainerScrollProps {
	/** Additional CSS classes on the section */
	className?: string;
	/** Title shown above the card (blurs and fades as the card opens) */
	titleContent?: ReactNode;
	/** Content revealed inside the card */
	cardContent?: ReactNode;
	/** Seam colour (any CSS colour). Defaults to a soft blue. */
	accent?: string;
	/** Second seam tint, blended towards the seam ends. Defaults to a soft lilac. */
	accentSecondary?: string;
}

/**
 * Raw scroll progress of the card track, measured at its centre (where the
 * slit is): 0 while the slit is still in the bottom 8% of the viewport,
 * 1 once it has risen to just above the middle of the viewport.
 */
export function apertureProgress(top: number, height: number, viewport: number): number {
	if (viewport <= 0) return 1;
	const centre = top + height / 2;
	const p = (viewport * 0.92 - centre) / (viewport * 0.4);
	return p < 0 ? 0 : p > 1 ? 1 : p;
}

/** Smoothstep: a gentle start and a slow settle, so the opening reads as a lens, not a shutter. */
export function apertureEase(p: number): number {
	const t = p < 0 ? 0 : p > 1 ? 1 : p;
	return t * t * (3 - 2 * t);
}

export function ContainerScroll({
	className = "",
	titleContent,
	cardContent,
	accent,
	accentSecondary,
}: ContainerScrollProps) {
	const reduced = useReducedMotion();
	const trackRef = useRef<HTMLDivElement>(null);
	const [raw, setRaw] = useState(0);

	const progress = reduced ? 1 : raw;
	const open = apertureEase(progress);

	const styleVars: Record<string, string> = {
		"--cs-progress": progress.toFixed(4),
		"--cs-open": open.toFixed(4),
	};
	if (accent) styleVars["--cs-accent"] = accent;
	if (accentSecondary) styleVars["--cs-accent-2"] = accentSecondary;

	// A layout effect, not a passive one: the Svelte effect measures before the
	// browser paints, so a card already in view never flashes one shut frame.
	useIsomorphicLayoutEffect(() => {
		const track = trackRef.current;
		if (!track || reduced) return;

		function measure() {
			if (!track) return;
			const rect = track.getBoundingClientRect();
			setRaw(apertureProgress(rect.top, rect.height, window.innerHeight));
		}

		const update = rafThrottle(measure);
		measure();
		// Capture phase so the card also tracks scrolling inside a nested
		// scroll container, not only the window.
		const opts = { capture: true, passive: true } as const;
		window.addEventListener("scroll", update, opts);
		window.addEventListener("resize", update, { passive: true });
		return () => {
			update.cancel();
			window.removeEventListener("scroll", update, opts);
			window.removeEventListener("resize", update);
		};
	}, [reduced]);

	return (
		<div
			className={cn(
				"cs-root relative flex h-[48rem] w-full items-start justify-center p-2 md:h-[64rem] md:p-10",
				className
			)}
			style={styleVars as CSSProperties}
			data-reduced-motion={reduced ? "" : undefined}
		>
			<div className="relative w-full py-10 md:py-16">
				{/* Title */}
				<div className="cs-title mx-auto max-w-5xl text-center">{titleContent}</div>

				{/* Card track (measured; never transformed) */}
				<div ref={trackRef} className="cs-track relative mx-auto mt-10 w-full max-w-5xl md:mt-12">
					<div className="cs-stage relative aspect-[4/3] w-full sm:aspect-[16/10]">
						{/* Ambient shadow: lives outside the clip so the aperture cannot cut it */}
						<div
							className="cs-shadow pointer-events-none absolute inset-0"
							aria-hidden="true"
						></div>

						{/* Outer frame, clipped by the aperture */}
						<div className="cs-card absolute inset-0 p-1.5 md:p-2">
							<div className="cs-surface relative size-full overflow-hidden">
								<div className="cs-content size-full">{cardContent}</div>
								{/* Veil: the content emerges from shadow as light gets in */}
								<div
									className="cs-veil pointer-events-none absolute inset-0"
									aria-hidden="true"
								></div>
							</div>
						</div>

						{/* Light: two lips riding the opening edges, and the seam at the centre */}
						<div
							className="cs-lip cs-lip-top pointer-events-none absolute"
							aria-hidden="true"
						></div>
						<div
							className="cs-lip cs-lip-bottom pointer-events-none absolute"
							aria-hidden="true"
						></div>
						<div className="cs-seam pointer-events-none absolute" aria-hidden="true">
							<span className="cs-seam-haze"></span>
							<span className="cs-seam-glow"></span>
							<span className="cs-seam-line"></span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
