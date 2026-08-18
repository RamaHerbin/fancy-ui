import { forwardRef } from "react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, CSSProperties, ReactNode, Ref } from "react";
import { cn } from "../../utils.js";
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
};

export type RainbowButtonProps = BaseProps &
	Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> &
	Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps>;

// Note: unlike most components in this package, RainbowButton does not spread
// rest props onto the rendered element — this mirrors the Svelte source,
// which only reads class/speed/href/type/disabled/ref/children off $props()
// and has no ...restProps spread. Attributes typed as valid via the union
// (e.g. onClick) are accepted by the props type but not forwarded.
export const RainbowButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, RainbowButtonProps>(
	({ className, speed = 2, href, type = "button", disabled, children }, ref) => {
		const speedStyle = { "--rainbow-speed": `${speed}s` } as CSSProperties;

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
					href={href}
					aria-disabled={disabled}
					role={disabled ? "link" : undefined}
					tabIndex={disabled ? -1 : undefined}
				>
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
			>
				{children}
			</button>
		);
	}
);

RainbowButton.displayName = "RainbowButton";
