import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "../../utils.js";
import { uid } from "../../internals/use-id.js";
import "./liquid-glass.css";

/**
 * LiquidGlass - glass-like refraction built on an SVG displacement filter
 *
 * The element measures itself with a ResizeObserver, paints a displacement map
 * as an inline SVG data URI at that exact size, and points `backdrop-filter` at
 * a filter that displaces the red, green and blue channels by slightly
 * different amounts, which is what produces the chromatic edge.
 */
export interface LiquidGlassProps {
	/** Border radius in px */
	radius?: number;
	/** Border thickness factor */
	border?: number;
	/** HSL lightness of fill */
	lightness?: number;
	/** Gaussian blur std deviation */
	displace?: number;
	/** SVG blend mode */
	blend?: string;
	/** X displacement channel */
	xChannel?: "R" | "G" | "B";
	/** Y displacement channel */
	yChannel?: "R" | "G" | "B";
	/** Fill opacity */
	alpha?: number;
	/** Inner blur */
	blur?: number;
	/** Red channel offset */
	rOffset?: number;
	/** Green channel offset */
	gOffset?: number;
	/** Blue channel offset */
	bOffset?: number;
	/** Displacement scale */
	scale?: number;
	/** Frosted overlay opacity */
	frost?: number;
	/** Backdrop blur in pixels for the Safari fallback */
	fallbackBlur?: number;
	/** Backdrop saturation percentage for the Safari fallback */
	fallbackSaturation?: number;
	/** CSS classes for the inner container */
	className?: string;
	/** CSS classes for the outer container */
	containerClass?: string;
	children?: ReactNode;
}

export function LiquidGlass({
	radius = 16,
	border: borderProp = 0.07,
	lightness = 50,
	displace,
	blend = "difference",
	xChannel = "R",
	yChannel = "B",
	alpha = 0.93,
	blur = 11,
	rOffset = 0,
	gOffset = 10,
	bOffset = 20,
	scale = -180,
	frost = 0.05,
	fallbackBlur = 20,
	fallbackSaturation = 180,
	className = "",
	containerClass = "",
	children,
}: LiquidGlassProps) {
	const liquidGlassRoot = useRef<HTMLDivElement>(null);
	const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
	const [filterId, setFilterId] = useState("");

	const brd = Math.min(dimensions.width, dimensions.height) * (borderProp * 0.5);

	const displacementImage = `<svg viewBox="0 0 ${dimensions.width} ${dimensions.height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="red-${filterId}" x1="100%" y1="0%" x2="0%" y2="0%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="red"/></linearGradient><linearGradient id="blue-${filterId}" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="blue"/></linearGradient></defs><rect x="0" y="0" width="${dimensions.width}" height="${dimensions.height}" fill="black"/><rect x="0" y="0" width="${dimensions.width}" height="${dimensions.height}" rx="${radius}" fill="url(#red-${filterId})"/><rect x="0" y="0" width="${dimensions.width}" height="${dimensions.height}" rx="${radius}" fill="url(#blue-${filterId})" style="mix-blend-mode:${blend}"/><rect x="${brd}" y="${brd}" width="${dimensions.width - brd * 2}" height="${dimensions.height - brd * 2}" rx="${radius}" fill="hsl(0 0% ${lightness}% / ${alpha})" style="filter:blur(${blur}px)"/></svg>`;

	const displacementDataUri = `data:image/svg+xml,${encodeURIComponent(displacementImage)}`;

	// Same declaration order as the Svelte source's style string, and the same
	// two shapes: `backdrop-filter` only appears once the filter it points at does.
	const backdropStyle = {
		"--frost": frost,
		borderRadius: `${radius}px`,
		...(filterId ? { backdropFilter: `url(#displacementFilter-${filterId})` } : null),
		"--lg-fallback-blur": `${fallbackBlur}px`,
		"--lg-fallback-saturation": `${fallbackSaturation}%`,
	} as CSSProperties;

	useEffect(() => {
		// The filter id is minted here, after mount, exactly where the Svelte
		// source mints it in `onMount`. It is what keeps two instances on one page
		// from sharing a filter, and it must never reach the server HTML — an id
		// the client alone ever sees cannot disagree with a server render. `uid()`
		// is the counter kept for exactly that case (it throws when called on the
		// server), so no seed prop is needed and no two instances can collide.
		setFilterId(uid("lg"));

		const node = liquidGlassRoot.current;
		if (!node) return;

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) return;

			let width = 0;
			let height = 0;

			if (entry.borderBoxSize && entry.borderBoxSize.length) {
				width = entry.borderBoxSize[0]!.inlineSize;
				height = entry.borderBoxSize[0]!.blockSize;
			} else if (entry.contentRect) {
				width = entry.contentRect.width;
				height = entry.contentRect.height;
			}

			setDimensions({ width, height });
		});

		observer.observe(node);

		return () => observer.disconnect();
		// Mount-only, mirroring `onMount`: the root element is unconditional, so
		// it is already attached by the time this runs and never changes identity.
	}, []);

	return (
		<div
			ref={liquidGlassRoot}
			className={cn("liquid-glass-effect", containerClass)}
			style={backdropStyle}
		>
			<div className={cn("liquid-glass-slot", className)}>{children}</div>

			{filterId ? (
				<svg className="liquid-glass-filter" xmlns="http://www.w3.org/2000/svg">
					<defs>
						<filter id={`displacementFilter-${filterId}`} colorInterpolationFilters="sRGB">
							<feImage
								x="0"
								y="0"
								width="100%"
								height="100%"
								href={displacementDataUri}
								result="map"
							/>
							<feDisplacementMap
								in="SourceGraphic"
								in2="map"
								xChannelSelector={xChannel}
								yChannelSelector={yChannel}
								scale={scale + rOffset}
								result="dispRed"
							/>
							<feColorMatrix
								in="dispRed"
								type="matrix"
								values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"
								result="red"
							/>
							<feDisplacementMap
								in="SourceGraphic"
								in2="map"
								xChannelSelector={xChannel}
								yChannelSelector={yChannel}
								scale={scale + gOffset}
								result="dispGreen"
							/>
							<feColorMatrix
								in="dispGreen"
								type="matrix"
								values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0"
								result="green"
							/>
							<feDisplacementMap
								in="SourceGraphic"
								in2="map"
								xChannelSelector={xChannel}
								yChannelSelector={yChannel}
								scale={scale + bOffset}
								result="dispBlue"
							/>
							<feColorMatrix
								in="dispBlue"
								type="matrix"
								values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0"
								result="blue"
							/>
							<feBlend in="red" in2="green" mode="screen" result="rg" />
							<feBlend in="rg" in2="blue" mode="screen" result="output" />
							{displace !== undefined ? <feGaussianBlur stdDeviation={displace} /> : null}
						</filter>
					</defs>
				</svg>
			) : null}
		</div>
	);
}
