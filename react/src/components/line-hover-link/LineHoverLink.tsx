import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { cn } from "../../utils.js";
import { useSoundCue } from "../../sound/use-sound.js";
import "./line-hover-link.css";

/**
 * Line Hover Link Variants
 *
 * slide    - Line slides in from right to left
 * double   - Two lines animate with different timings
 * grow     - Line grows thicker on hover
 * strike   - Strikethrough effect with text scale
 * fade     - Lines fade up with stagger delay
 * pulse    - Line pulses up and down
 * swap     - Two lines go opposite directions
 * sweep    - Full background cover sweep
 * bounce   - Bouncy squish animation
 * arc      - SVG arc stroke draws in
 * scribble - SVG scribble stroke draws in
 * ink      - Constant underline; whole link snaps (-1px,-1px) on hover
 */
export type LineHoverVariant =
	| "slide"
	| "double"
	| "grow"
	| "strike"
	| "fade"
	| "pulse"
	| "swap"
	| "sweep"
	| "bounce"
	| "arc"
	| "scribble"
	| "ink";

export interface LineHoverLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className"> {
	/** The animation variant */
	variant?: LineHoverVariant;
	/** Link href */
	href?: string;
	/** Additional CSS classes */
	className?: string;
	children?: ReactNode;
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

export function LineHoverLink({
	variant = "slide",
	href = "#",
	target,
	rel,
	className = "",
	children,
	sound = false,
	onClick,
	...restProps
}: LineHoverLinkProps) {
	const needsSpan = ["strike", "bounce", "arc", "scribble"].includes(variant);
	const relValue = target === "_blank" ? (rel ?? "noopener noreferrer") : rel;
	const playCue = useSoundCue(sound);

	function handleClick(event: MouseEvent<HTMLAnchorElement>) {
		playCue("press");
		onClick?.(event);
	}

	return (
		<a
			{...restProps}
			href={href}
			target={target}
			rel={relValue}
			className={cn("link-hover", `link-hover--${variant}`, className)}
			onClick={handleClick}
		>
			{needsSpan ? <span>{children}</span> : children}

			{variant === "arc" && (
				<svg
					className="link-hover__graphic link-hover__graphic--stroke link-hover__graphic--arc"
					width="100%"
					height="18"
					viewBox="0 0 59 18"
					aria-hidden="true"
				>
					<path d="M.945.149C12.3 16.142 43.573 22.572 58.785 10.842" pathLength={1} />
				</svg>
			)}
			{variant === "scribble" && (
				<svg
					className="link-hover__graphic link-hover__graphic--stroke link-hover__graphic--scribble"
					width="100%"
					height="9"
					viewBox="0 0 101 9"
					aria-hidden="true"
				>
					<path
						d="M.426 1.973C4.144 1.567 17.77-.514 21.443 1.48 24.296 3.026 24.844 4.627 27.5 7c3.075 2.748 6.642-4.141 10.066-4.688 7.517-1.2 13.237 5.425 17.59 2.745C58.5 3 60.464-1.786 66 2c1.996 1.365 3.174 3.737 5.286 4.41 5.423 1.727 25.34-7.981 29.14-1.294"
						pathLength={1}
					/>
				</svg>
			)}
		</a>
	);
}
