import { useLayoutEffect, useRef } from "react";
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

	const styles = `
		--glow-border-radius: ${borderRadius}px;
		--glow-border-width: ${borderWidth}px;
		--glow-duration: ${duration}s;
		background-image: radial-gradient(transparent, transparent, ${colorString}, transparent, transparent);
		background-size: 300% 300%;
		mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
		-webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
		-webkit-mask-composite: xor;
		mask-composite: exclude;
		padding: var(--glow-border-width);
		border-radius: var(--glow-border-radius);
	`;

	const ref = useRef<HTMLDivElement>(null);

	// Set the raw style string directly, mirroring the Svelte source's
	// `style={styles}` attribute binding. React's style prop only accepts an
	// object and would reformat (and reorder) the CSS text, so the DOM is
	// written to directly instead.
	useLayoutEffect(() => {
		if (ref.current) {
			ref.current.style.cssText = styles;
		}
	}, [styles]);

	return (
		<div
			ref={ref}
			className={cn(
				"animate-glow pointer-events-none absolute inset-0 size-full rounded-[inherit] will-change-[background-position]",
				className
			)}
		/>
	);
}
