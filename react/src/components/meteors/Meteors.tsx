import { useState, type CSSProperties } from "react";
import { cn } from "../../utils.js";
import "./meteors.css";

/**
 * Meteors - Animated meteor shower effect
 *
 * Generates N span elements with randomized positions, delays, and durations
 * that animate diagonally across the container.
 */
export interface MeteorsProps {
	/** Number of meteors to render */
	count?: number;
	/** Additional CSS classes applied to each meteor */
	className?: string;
}

interface Meteor {
	left: string;
	animationDelay: string;
	animationDuration: string;
}

function createMeteors(count: number): Meteor[] {
	return Array.from({ length: count }, () => ({
		left: `${Math.floor(Math.random() * 800 - 400)}px`,
		animationDelay: `${(Math.random() * 0.6 + 0.2).toFixed(2)}s`,
		animationDuration: `${Math.floor(Math.random() * 8 + 2)}s`,
	}));
}

export function Meteors({ count = 20, className }: MeteorsProps) {
	// Randomized once, then re-randomized only when `count` changes — the same
	// dependency the Svelte source's $derived tracks. A plain render-time call
	// would reshuffle on every unrelated re-render and make the shower jump.
	const [meteors, setMeteors] = useState(() => createMeteors(count));
	const [renderedCount, setRenderedCount] = useState(count);
	if (renderedCount !== count) {
		setRenderedCount(count);
		setMeteors(createMeteors(count));
	}

	return (
		<>
			{meteors.map((meteor, i) => (
				<span
					key={i}
					className={cn(
						"meteor pointer-events-none absolute top-0 h-0.5 w-0.5 rounded-full bg-slate-500 opacity-0 shadow-[0_0_0_1px_#ffffff10]",
						"before:absolute before:top-1/2 before:h-px before:w-[50px] before:-translate-y-1/2 before:bg-gradient-to-r before:from-slate-500 before:to-transparent before:content-['']",
						className
					)}
					style={
						{
							left: meteor.left,
							animationDelay: meteor.animationDelay,
							animationDuration: meteor.animationDuration,
						} as CSSProperties
					}
				/>
			))}
		</>
	);
}
