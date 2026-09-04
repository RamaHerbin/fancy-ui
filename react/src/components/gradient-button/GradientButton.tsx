import { forwardRef } from "react";
import type { ButtonHTMLAttributes, CSSProperties, MouseEvent, ReactNode } from "react";
import { cn } from "../../utils.js";
import { useSoundCue } from "../../sound/use-sound.js";
import "./gradient-button.css";

type BaseProps = {
	/** Gradient colors for the conic-gradient border */
	colors?: string[];
	/** Animation duration in milliseconds */
	duration?: number;
	/** Border width in pixels */
	borderWidth?: number;
	/** Border radius in pixels */
	borderRadius?: number;
	/** Blur amount for the gradient in pixels */
	blur?: number;
	/** Background color of the button content area */
	bgColor?: string;
	/** Custom CSS class */
	className?: string;
	/** Button content */
	children?: ReactNode;
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
};

export interface GradientButtonProps
	extends BaseProps,
		Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> {}

const DEFAULT_COLORS = [
	"#FF0000",
	"#FFA500",
	"#FFFF00",
	"#008000",
	"#0000FF",
	"#4B0082",
	"#EE82EE",
	"#FF0000",
];

export const GradientButton = forwardRef<HTMLButtonElement, GradientButtonProps>(
	(
		{
			className,
			colors = DEFAULT_COLORS,
			duration = 2500,
			borderWidth = 2,
			borderRadius = 8,
			blur = 4,
			bgColor = "#000",
			children,
			onClick,
			sound = false,
			...restProps
		},
		ref
	) => {
		const playCue = useSoundCue(sound);

		function handleClick(event: MouseEvent<HTMLButtonElement>) {
			if (!restProps.disabled) playCue("press");
			onClick?.(event);
		}

		const styleVars = {
			"--gb-colors": colors.join(", "),
			"--gb-duration": `${duration}ms`,
			"--gb-border-width": `${borderWidth}px`,
			"--gb-border-radius": `${borderRadius}px`,
			"--gb-blur": `${blur}px`,
			"--gb-bg-color": bgColor,
		} as CSSProperties;

		return (
			<button
				ref={ref}
				className={cn(
					"gradient-button relative flex min-h-10 min-w-28 cursor-pointer items-center justify-center overflow-hidden",
					className
				)}
				style={styleVars}
				onClick={handleClick}
				{...restProps}
			>
				{/* Rotating conic-gradient pseudo-element */}
				<span className="gradient-border" aria-hidden="true" />

				{/* Content area */}
				<span className="gradient-content inline-flex size-full items-center justify-center px-4 py-2">
					{children}
				</span>
			</button>
		);
	}
);

GradientButton.displayName = "GradientButton";
