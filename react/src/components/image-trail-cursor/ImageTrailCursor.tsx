import { useEffect, useRef } from "react";
import { cn } from "../../utils.js";
import { variantMap, type ImageTrailVariant, type VariantType } from "./trail-variants.js";

/**
 * ImageTrailCursor - Cursor-following image trail with 9 animation variants.
 *
 * The trail images are rendered by React; the motion is driven imperatively by
 * a variant class that owns its own pointer listeners, rAF loop and GSAP
 * timelines. Only the variant switch tears that instance down and rebuilds it,
 * which is what the Svelte `$effect` tracks.
 */
export interface ImageTrailCursorProps {
	images?: string[];
	variant?: VariantType;
	className?: string;
}

/**
 * Clears the inline styles GSAP wrote on the trail elements so a newly
 * constructed variant starts from the stylesheet's own values. The inner
 * element's `background-image` is written by the render, not by GSAP, so it is
 * restored after the wipe.
 */
function resetImageStyles(container: HTMLDivElement) {
	const imgEls = container.querySelectorAll<HTMLDivElement>(".content__img");
	for (const el of imgEls) {
		el.style.cssText = "";
		const inner = el.querySelector<HTMLDivElement>(".content__img-inner");
		if (inner) {
			// Preserve background-image set by the render, only clear GSAP residue
			const bgImage = inner.style.backgroundImage;
			inner.style.cssText = "";
			if (bgImage) inner.style.backgroundImage = bgImage;
		}
	}
}

export function ImageTrailCursor({
	images = [],
	variant = "type1",
	className = "",
}: ImageTrailCursorProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const instanceRef = useRef<ImageTrailVariant | null>(null);

	// `variant` is the only dependency, exactly as on the Svelte side: the
	// effect there tracks `variant` and nothing else, so a changed `images`
	// array adds or removes trail elements without rebuilding the running
	// instance (which keeps the element list it captured at construction).
	// Reproduced rather than corrected — the Svelte behaviour is the contract.
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		if (instanceRef.current) {
			instanceRef.current.destroy();
			instanceRef.current = null;
		}

		resetImageStyles(container);

		const Variant = variantMap[variant] || variantMap.type1;
		instanceRef.current = new Variant(container);

		return () => {
			if (instanceRef.current) {
				instanceRef.current.destroy();
				instanceRef.current = null;
			}
		};
	}, [variant]);

	return (
		<div
			ref={containerRef}
			className={cn(
				"relative z-[100] h-full w-full overflow-visible rounded-lg bg-transparent",
				className
			)}
			style={{ touchAction: "none" }}
		>
			{images.map((image, i) => (
				// Keyed on `variant + i` like the Svelte `{#each}`: switching
				// variant remounts every trail element, so no GSAP-written
				// inline style survives the switch.
				<div
					key={variant + i}
					className="content__img absolute top-0 left-0 aspect-[1.1] w-[120px] overflow-hidden rounded-[10px] opacity-0 [will-change:transform,filter] sm:w-[190px] sm:rounded-[15px]"
				>
					<div
						className="content__img-inner absolute top-[-10px] left-[-10px] h-[calc(100%+20px)] w-[calc(100%+20px)] bg-cover bg-center"
						style={{ backgroundImage: `url(${image})` }}
					/>
				</div>
			))}
		</div>
	);
}
