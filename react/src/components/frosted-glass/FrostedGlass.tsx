import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { cn } from "../../utils.js";
import { uid } from "../../internals/use-id.js";
import "./frosted-glass.css";

/**
 * FrostedGlass - frosted glass surface with an organic, wavy refraction of
 * whatever sits behind it.
 *
 * Four layers stack inside a rounded container:
 *
 * 1. Filter layer - `backdrop-filter: blur(0)` pulls the backdrop into this
 *    element's own rendering, then `filter: url(#...)` pointing at the inline
 *    SVG filter distorts it (`feTurbulence` -> `feGaussianBlur` ->
 *    `feDisplacementMap`).
 * 2. Overlay - translucent tint (`tint`).
 * 3. Specular - inset highlights simulating a lit glass rim (`highlight`).
 * 4. Content - the children.
 *
 * An optional conic-gradient border (`border`) frames the container.
 */
export interface FrostedGlassProps {
	/** Border radius in pixels */
	radius?: number;
	/** Turbulence noise frequency (lower = wider waves) */
	baseFrequency?: number;
	/** Turbulence octaves (detail of the noise) */
	numOctaves?: number;
	/** Turbulence random seed */
	seed?: number;
	/** Gaussian blur softening the noise before displacement */
	noiseBlur?: number;
	/** Displacement intensity */
	scale?: number;
	/** Overlay tint color */
	tint?: string;
	/** Specular rim highlight color */
	highlight?: string;
	/** Show the conic-gradient glass border */
	border?: boolean;
	/** Backdrop blur (px) for the WebKit fallback */
	fallbackBlur?: number;
	/** Backdrop saturation (%) for the WebKit fallback */
	fallbackSaturation?: number;
	/** CSS classes for the content layer */
	className?: string;
	/** CSS classes for the outer container */
	containerClass?: string;
	/** Content rendered on top of the glass */
	children?: ReactNode;
}

export function FrostedGlass({
	radius = 24,
	baseFrequency = 0.008,
	numOctaves = 2,
	seed = 92,
	noiseBlur = 2,
	scale = 70,
	tint = "hsla(0, 0%, 100%, 0.25)",
	highlight = "hsla(0, 0%, 100%, 0.75)",
	border = true,
	fallbackBlur = 20,
	fallbackSaturation = 180,
	className = "",
	containerClass = "",
	children,
}: FrostedGlassProps) {
	// The filter id is minted after mount, exactly as the Svelte source does:
	// the SVG filter and the layer referencing it are absent from the server
	// HTML and appear on the first client effect. `uid()` replaces the source's
	// `Math.random()` suffix - a monotonic counter cannot collide, and it keeps
	// the id ASCII-clean for the `url(#...)` reference below.
	const [filterId, setFilterId] = useState("");

	useEffect(() => {
		setFilterId(uid("fg-dist"));
	}, []);

	const containerStyle = {
		borderRadius: `${radius}px`,
		"--fg-tint": tint,
		"--fg-highlight": highlight,
		"--fg-fallback-blur": `${fallbackBlur}px`,
		"--fg-fallback-saturation": `${fallbackSaturation}%`,
	} as CSSProperties;

	return (
		<div
			className={cn("frosted-glass", border && "frosted-glass-border", containerClass)}
			style={containerStyle}
		>
			{filterId ? (
				<>
					<div className="frosted-glass-filter" style={{ filter: `url(#${filterId})` }} />

					<svg className="frosted-glass-defs" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
						<defs>
							<filter
								id={filterId}
								x="-50%"
								y="-50%"
								width="200%"
								height="200%"
								filterUnits="objectBoundingBox"
								primitiveUnits="userSpaceOnUse"
								colorInterpolationFilters="linearRGB"
							>
								<feTurbulence
									type="fractalNoise"
									baseFrequency={`${baseFrequency} ${baseFrequency}`}
									numOctaves={numOctaves}
									seed={seed}
									stitchTiles="stitch"
									result="noise"
								/>
								<feGaussianBlur in="noise" stdDeviation={noiseBlur} result="blurred" />
								<feDisplacementMap
									in="SourceGraphic"
									in2="blurred"
									scale={scale}
									xChannelSelector="R"
									yChannelSelector="G"
								/>
							</filter>
						</defs>
					</svg>
				</>
			) : null}

			<div className="frosted-glass-overlay" />
			<div className="frosted-glass-specular" />

			<div className={cn("frosted-glass-content", className)}>{children}</div>
		</div>
	);
}
