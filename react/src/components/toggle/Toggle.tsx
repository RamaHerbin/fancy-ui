import { forwardRef, useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils.js";
import { useSoundCue } from "../../sound/use-sound.js";
import "./toggle.css";

export type ToggleSize = "sm" | "md" | "lg";
export type ToggleVariant = "ghost" | "outline";

type BaseProps = {
	/** Whether the toggle is currently pressed (active) */
	pressed?: boolean;
	/** Called with the new pressed state whenever the toggle is activated */
	onPressedChange?: (pressed: boolean) => void;
	/** Visual size of the control */
	size?: ToggleSize;
	/** `"ghost"` has no resting border, `"outline"` keeps one at rest */
	variant?: ToggleVariant;
	/** Accessible name — required when `children` is icon-only */
	label?: string;
	/** Toggle content, typically a single glyph or a short label */
	children?: ReactNode;
	/** Additional CSS classes */
	className?: string;
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
};

export interface ToggleProps
	extends BaseProps,
		Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> {}

const SIZE_CLASSES: Record<ToggleSize, string> = {
	sm: "size-[30px] rounded-[6px] text-xs",
	md: "size-[36px] rounded-[8px] text-sm",
	lg: "size-[42px] rounded-[10px] text-base",
};

export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
	(
		{
			pressed: pressedProp,
			onPressedChange,
			disabled = false,
			size = "md",
			variant = "ghost",
			label,
			children,
			className,
			onClick,
			sound = false,
			...restProps
		},
		ref
	) => {
		// `pressed` mirrors the Svelte side's `pressed = $bindable(false)`: an
		// initial value the caller can seed, held afterward as the component's
		// own state and reassigned locally on every toggle regardless of
		// whether the caller re-passes the prop. `useState`'s lazy initializer
		// runs once, matching a bindable prop's one-time seed.
		const [pressed, setPressed] = useState(pressedProp ?? false);

		const playCue = useSoundCue(sound);

		const classes = cn(
			// No `transition-colors` here: the colocated CSS below declares a
			// `transition` shorthand on this same element, and it is loaded after
			// Tailwind's utility layer, so the utility would have been silently
			// replaced anyway. The colour channel is re-declared by hand there
			// instead.
			"ft-toggle inline-flex shrink-0 cursor-pointer items-center justify-center font-medium",
			"focus-visible:outline-none",
			"disabled:pointer-events-none disabled:opacity-50",
			SIZE_CLASSES[size],
			variant === "outline" && "border border-border",
			pressed
				? "bg-secondary text-secondary-foreground"
				: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
			className
		);

		// The only place `pressed` changes.
		function toggle(event: React.MouseEvent<HTMLButtonElement>) {
			onClick?.(event);
			if (disabled) return;
			const next = !pressed;
			setPressed(next);
			playCue(next ? "toggle-on" : "toggle-off");
			onPressedChange?.(next);
		}

		return (
			<button
				ref={ref}
				type="button"
				className={classes}
				aria-pressed={pressed}
				aria-label={label}
				disabled={disabled}
				onClick={toggle}
				{...restProps}
			>
				{children}
			</button>
		);
	}
);

Toggle.displayName = "Toggle";
