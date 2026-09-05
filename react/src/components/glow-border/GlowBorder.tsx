import type { CSSProperties } from "react";
import { cn } from "../../utils.js";
import "./glow-border.css";

export interface GlowBorderProps {
	className?: string;
	borderRadius?: number;
	color?: string | string[];
	borderWidth?: number;
	duration?: number;
}

export function GlowBorder({
	className = "",
	borderRadius = 10,
	color = "#FFF",
	borderWidth = 2,
	duration = 10,
}: GlowBorderProps) {
	const colorString = Array.isArray(color) ? color.join(",") : color;

	// Computed during render, not in a layout effect: every value here is a
	// plain function of the props, so the server and the client produce the
	// same declarations and the glow is painted by the very first frame of the
	// server markup. Writing it from `useLayoutEffect` instead left the mask
	// and the gradient out of the SSR HTML entirely — and the hook itself is a
	// no-op on the server, which React 18 warns about.
	//
	// The Svelte source's `style` attribute is a single CSS string; React only
	// accepts an object, so the declarations are transposed one for one. Order
	// is not part of the contract — the two `var()` reads below resolve against
	// the custom properties in the same declaration block regardless.
	const styles: CSSProperties = {
		"--glow-border-radius": `${borderRadius}px`,
		"--glow-border-width": `${borderWidth}px`,
		"--glow-duration": `${duration}s`,
		backgroundImage: `radial-gradient(transparent, transparent, ${colorString}, transparent, transparent)`,
		backgroundSize: "300% 300%",
		mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
		WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
		WebkitMaskComposite: "xor",
		maskComposite: "exclude",
		padding: "var(--glow-border-width)",
		borderRadius: "var(--glow-border-radius)",
	} as CSSProperties;

	return (
		<div
			className={cn(
				"animate-glow pointer-events-none absolute inset-0 size-full rounded-[inherit] will-change-[background-position]",
				className
			)}
			style={styles}
		/>
	);
}
