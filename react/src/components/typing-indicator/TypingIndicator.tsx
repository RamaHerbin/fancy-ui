import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../../utils.js";
import "./typing-indicator.css";

export interface TypingIndicatorProps extends HTMLAttributes<HTMLDivElement> {
	/** Dot diameter in pixels */
	size?: number;
	/** Dot color; any CSS color or custom property expression */
	color?: string;
	/** Duration of one full animation cycle in seconds */
	speed?: number;
	/** Visually hidden text announced to assistive technology */
	label?: string;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Three dots animated as a single wave, wrapped in a polite live region.
 */
export const TypingIndicator = forwardRef<HTMLDivElement, TypingIndicatorProps>(
	(
		{
			size = 6,
			color = "var(--ft-typing-color, currentColor)",
			speed = 1.2,
			label = "Typing",
			className,
			style,
			...rest
		},
		ref
	) => {
		// A zero or negative animation-duration invalidates the whole declaration.
		const cycle = Math.max(0.01, speed);

		// `color` already resolves the public `--ft-typing-color`, so the dots read the
		// outcome under a separate name — a custom property may not reference itself.
		const rootStyle = {
			...style,
			["--ft-typing-size" as string]: `${size}px`,
			["--ft-typing-color-resolved" as string]: color,
			["--ft-typing-speed" as string]: `${cycle}s`,
			gap: "calc(var(--ft-typing-size) * 0.6)",
		};

		// Each dot lags the previous one by a sixth of the cycle, so the wave reads
		// as a single gesture rather than three independent blinks.
		const dotStyles = [0, 1, 2].map((i) => ({
			animationDelay: `${Number(((i * cycle) / 6).toFixed(4))}s`,
		}));

		return (
			<div
				ref={ref}
				className={cn("inline-flex items-center", className)}
				style={rootStyle}
				role="status"
				aria-live="polite"
				{...rest}
			>
				{dotStyles.map((dotStyle, i) => (
					<span key={i} className="ft-dot" style={dotStyle} aria-hidden="true" />
				))}
				<span className="sr-only">{label}</span>
			</div>
		);
	}
);

TypingIndicator.displayName = "TypingIndicator";
