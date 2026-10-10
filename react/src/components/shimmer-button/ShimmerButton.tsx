import { forwardRef } from "react";
import type {
	ButtonHTMLAttributes,
	CSSProperties,
	MouseEvent,
	PointerEvent,
	ReactNode,
} from "react";
import { cn } from "../../utils.js";
import { useSoundCue } from "../../sound/use-sound.js";
import "./shimmer-button.css";

type BaseProps = {
	/** Colour of the sheen */
	shimmerColor?: string;
	/** Thickness of the rim the sheen glints on */
	shimmerSize?: string;
	/** Button border radius */
	borderRadius?: string;
	/** Duration of one sheen cycle: the sweep, then a pause */
	shimmerDuration?: string;
	/** Button background color */
	background?: string;
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

export interface ShimmerButtonProps
	extends BaseProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> {}

export const ShimmerButton = forwardRef<HTMLButtonElement, ShimmerButtonProps>(
	(
		{
			className,
			shimmerColor = "#ffffff",
			shimmerSize = "0.05em",
			borderRadius = "100px",
			shimmerDuration = "3s",
			background = "rgba(0, 0, 0, 1)",
			children,
			onClick,
			onPointerMove,
			sound = false,
			...restProps
		},
		ref
	) => {
		const styleVars = {
			"--shimmer-color": shimmerColor,
			"--radius": borderRadius,
			"--speed": shimmerDuration,
			"--cut": shimmerSize,
			"--bg": background,
		} as CSSProperties;

		const playCue = useSoundCue(sound);

		function handleClick(event: MouseEvent<HTMLButtonElement>) {
			if (sound && !restProps.disabled) playCue("press");
			onClick?.(event);
		}

		// The hover sheen follows the pointer: two CSS variables, no re-render.
		function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
			const el = event.currentTarget;
			const rect = el.getBoundingClientRect();
			el.style.setProperty("--mx", `${event.clientX - rect.left}px`);
			el.style.setProperty("--my", `${event.clientY - rect.top}px`);
			onPointerMove?.(event);
		}

		return (
			<button
				ref={ref}
				className={cn(
					"shimmer-button group relative isolate flex cursor-pointer items-center justify-center overflow-hidden [border-radius:var(--radius)] px-6 py-3 whitespace-nowrap text-white/90",
					"transform-gpu transition-[transform,color] duration-300 ease-out hover:text-white active:scale-[0.98]",
					className
				)}
				style={styleVars}
				onClick={handleClick}
				onPointerMove={handlePointerMove}
				{...restProps}
			>
				{/* Rim: shows around the face, catches the sheen as it passes */}
				<span className="shimmer-button__rim" aria-hidden="true"></span>

				{/* Face */}
				<span className="shimmer-button__face" aria-hidden="true"></span>

				{/* Content */}
				<span className="relative z-10">{children}</span>

				{/* Sweep: a satin band that crosses the button, then rests */}
				<span className="shimmer-button__sheen" aria-hidden="true"></span>

				{/* Hover: the sheen follows the pointer */}
				<span className="shimmer-button__spot" aria-hidden="true"></span>
			</button>
		);
	}
);

ShimmerButton.displayName = "ShimmerButton";
