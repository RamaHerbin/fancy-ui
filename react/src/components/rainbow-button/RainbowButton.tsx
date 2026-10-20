import { forwardRef } from "react";
import type {
	AnchorHTMLAttributes,
	ButtonHTMLAttributes,
	CSSProperties,
	MouseEvent,
	ReactNode,
	Ref,
} from "react";
import { cn } from "../../utils.js";
import { useSoundCue } from "../../sound/use-sound.js";
import "./rainbow-button.css";

type BaseProps = {
	/** Animation speed in seconds */
	speed?: number;
	/** Custom CSS class */
	className?: string;
	/** Render as anchor element */
	href?: string;
	/** Button content */
	children?: ReactNode;
	/** Click handler, called once per activation and never while `disabled` */
	onClick?: (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
};

// The two attribute sets are intersected BEFORE `Omit`, then extended as one:
// an interface may not extend two types that name the same property with
// different signatures (`onAbort` and friends differ between button and
// anchor), while an intersection tolerates it. Same resulting type as the
// alias this replaces — the interface form is the tooling contract in
// PORTING.md.
type RainbowButtonElementProps = Omit<
	ButtonHTMLAttributes<HTMLButtonElement> & AnchorHTMLAttributes<HTMLAnchorElement>,
	keyof BaseProps
>;

export interface RainbowButtonProps extends BaseProps, RainbowButtonElementProps {}

export const RainbowButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, RainbowButtonProps>(
	(
		{
			className,
			speed = 2,
			href,
			target,
			style,
			type = "button",
			disabled,
			children,
			onClick,
			sound = false,
			...restProps
		},
		ref
	) => {
		const speedStyle = { "--rainbow-speed": `${speed}s`, ...style } as CSSProperties;
		const playCue = useSoundCue(sound);

		// The single guard both branches funnel through. A native `disabled`
		// button already refuses real input, but a synthetic click (or an anchor,
		// which has no disabled state at all) walks straight past that, so a
		// disabled click is cancelled here and never reaches the consumer or the
		// sound cue.
		function handleClick(event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) {
			if (disabled) {
				event.preventDefault();
				return;
			}
			playCue("press");
			onClick?.(event);
		}

		const baseClasses = cn(
			"rainbow-button",
			"group relative inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border-0 bg-[length:200%] px-8 py-2 font-medium transition-colors [background-clip:padding-box,border-box,border-box] [background-origin:border-box] [border:calc(0.08*1rem)_solid_transparent] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
			// Glow effect
			"before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/5 before:w-3/5 before:-translate-x-1/2 before:animate-rainbow before:bg-[linear-gradient(90deg,var(--rainbow-1),var(--rainbow-5),var(--rainbow-3),var(--rainbow-4),var(--rainbow-2))] before:bg-[length:200%] before:[filter:blur(calc(0.8*1rem))]",
			// Light mode: dark button with light text
			"text-white bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--rainbow-1),var(--rainbow-5),var(--rainbow-3),var(--rainbow-4),var(--rainbow-2))]",
			// Dark mode: light button with dark text
			"dark:text-black dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--rainbow-1),var(--rainbow-5),var(--rainbow-3),var(--rainbow-4),var(--rainbow-2))]",
			className
		);

		if (href) {
			return (
				<a
					ref={ref as Ref<HTMLAnchorElement>}
					className={baseClasses}
					style={speedStyle}
					href={disabled ? undefined : href}
					target={disabled ? undefined : target}
					aria-disabled={disabled}
					role={disabled ? "link" : undefined}
					tabIndex={disabled ? -1 : undefined}
					onClick={handleClick}
					{...(restProps as AnchorHTMLAttributes<HTMLAnchorElement>)}
				>
					<span className="rainbow-button__glow" aria-hidden="true">
						<span></span>
					</span>
					<span className="rainbow-button__beam" aria-hidden="true"></span>
					{children}
				</a>
			);
		}

		return (
			<button
				ref={ref as Ref<HTMLButtonElement>}
				className={baseClasses}
				style={speedStyle}
				type={type}
				disabled={disabled}
				onClick={handleClick}
				{...(restProps as ButtonHTMLAttributes<HTMLButtonElement>)}
			>
				<span className="rainbow-button__glow" aria-hidden="true">
					<span></span>
				</span>
				<span className="rainbow-button__beam" aria-hidden="true"></span>
				{children}
			</button>
		);
	}
);

RainbowButton.displayName = "RainbowButton";
