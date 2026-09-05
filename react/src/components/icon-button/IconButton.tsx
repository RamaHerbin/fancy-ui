import { forwardRef, type MouseEvent, type ReactNode } from "react";
import { cn } from "../../utils.js";
import { Button } from "../button/index.js";
import type { ButtonVariant, ButtonSize } from "../button/types.js";

/** `"square"` keeps the size's own radius; `"circle"` rounds it fully. */
export type IconButtonShape = "square" | "circle";

export interface IconButtonProps {
	/**
	 * Accessible name. Required, not optional: an icon-only control has no
	 * visible text to fall back on, so without this the control would have
	 * no name at all in the accessibility tree.
	 */
	label: string;
	/** Visual treatment, forwarded to the underlying Button. */
	variant?: ButtonVariant;
	/** Sets the button's square footprint (30 / 36 / 42px) and its resting radius. */
	size?: ButtonSize;
	/** Square keeps the size's own radius; circle rounds it fully. */
	shape?: IconButtonShape;
	/** Native `type`. Ignored once `href` is set — an anchor has no `type`. */
	type?: "button" | "submit" | "reset";
	/** Greys the button out and makes it inert to pointer and keyboard activation. */
	disabled?: boolean;
	/**
	 * Swaps the icon for a spinner and marks the control `aria-busy`, without
	 * dimming it the way `disabled` does. Activation is blocked exactly like
	 * `disabled`.
	 */
	loading?: boolean;
	/** Renders an `<a>` instead of a `<button>` when set. */
	href?: string;
	/** Anchor `target`. `"_blank"` forces a safe `rel` regardless of what `rel` says. */
	target?: string;
	/** Anchor `rel`. Widened, never narrowed — see `target`. */
	rel?: string;
	/** Fires on activation. Never called while `disabled` or `loading`. */
	onClick?: (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
	/** The icon, rendered centred with no label alongside it. */
	children?: ReactNode;
	/** Additional CSS classes. */
	className?: string;
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

// A fixed square replaces Button's own horizontal padding — an icon-only
// control centres on its glyph rather than growing to fit a label. Each
// size's radius already matches Button's own scale, so only `circle`
// below needs to override it.
const SIZE_CLASSES: Record<ButtonSize, string> = {
	sm: "size-[30px] px-0 py-0",
	md: "size-[36px] px-0 py-0",
	lg: "size-[42px] px-0 py-0",
};

// Ghost reads as more subtle icon-only: with no label to carry visual
// weight, it rests at the muted tone rather than Button's own
// full-strength foreground, and only brightens on hover/focus.
const VARIANT_EXTRA_CLASSES: Partial<Record<ButtonVariant, string>> = {
	ghost: "text-muted-foreground",
};

export const IconButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, IconButtonProps>(
	(
		{
			label,
			variant = "outline",
			size = "md",
			shape = "square",
			type = "button",
			disabled = false,
			loading = false,
			href = undefined,
			target = undefined,
			rel = undefined,
			onClick,
			children,
			className,
			sound = false,
		},
		ref
	) => {
		const classes = cn(
			"ft-icon-btn",
			SIZE_CLASSES[size],
			shape === "circle" && "rounded-full",
			VARIANT_EXTRA_CLASSES[variant],
			className
		);

		return (
			<Button
				ref={ref}
				variant={variant}
				size={size}
				type={type}
				disabled={disabled}
				loading={loading}
				href={href}
				target={target}
				rel={rel}
				label={label}
				onClick={onClick}
				sound={sound}
				iconStart={children}
				className={classes}
			/>
		);
	}
);

IconButton.displayName = "IconButton";
