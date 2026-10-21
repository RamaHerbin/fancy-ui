import {
	forwardRef,
	type AnchorHTMLAttributes,
	type ButtonHTMLAttributes,
	type MouseEvent,
	type Ref,
	type ReactNode,
} from "react";
import { cn } from "../../utils.js";
import { sound as soundFx } from "../../sound/sound.js";
import { useSoundFeedback } from "../../sound/sound-feedback.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import type { ButtonVariant, ButtonSize } from "./types.js";
import "./button.css";

export interface ButtonProps extends Omit<
	ButtonHTMLAttributes<HTMLButtonElement> & AnchorHTMLAttributes<HTMLAnchorElement>,
	"onClick" | "className" | "type"
> {
	/** Visual treatment. */
	variant?: ButtonVariant;
	/** Padding / font-size / radius scale. */
	size?: ButtonSize;
	/** Native `type`. Ignored once `href` is set — an anchor has no `type`. */
	type?: "button" | "submit" | "reset";
	/** Greys the button out and makes it inert to pointer and keyboard activation. */
	disabled?: boolean;
	/**
	 * Swaps `iconStart` for a spinner and marks the control `aria-busy`, without
	 * dimming it the way `disabled` does — the button still reads as "working",
	 * not "unavailable". Activation is blocked exactly like `disabled`.
	 */
	loading?: boolean;
	/** Renders an `<a>` instead of a `<button>` when set. */
	href?: string;
	/** Anchor `target`. `"_blank"` forces a safe `rel` regardless of what `rel` says. */
	target?: string;
	/** Anchor `rel`. Widened, never narrowed — see `target`. */
	rel?: string;
	/** Stretches the button to fill its container's width. */
	fullWidth?: boolean;
	/** Accessible name for a button whose content is icon-only. */
	label?: string;
	/** Fires on activation. Never called while `disabled` or `loading`. */
	onClick?: (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
	/** Rendered before the label. Replaced by the spinner while `loading`. */
	iconStart?: ReactNode;
	/** Rendered after the label. */
	iconEnd?: ReactNode;
	/** The button's label / content. */
	children?: ReactNode;
	/** Additional CSS classes. */
	className?: string;
	/**
	 * Plays the `hover` cue on mouse/pen pointer enter and the `press` cue on
	 * click. Off by default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
	sm: "rounded-[6px] px-[12px] py-[5px] text-[12px]",
	md: "rounded-[8px] px-[18px] py-[9px] text-[13px]",
	lg: "rounded-[10px] px-[24px] py-[12px] text-[14px]",
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
	primary: "bg-primary text-primary-foreground hover:bg-primary/90",
	secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
	outline: "border border-border text-foreground hover:bg-accent hover:text-accent-foreground",
	ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
	// Colour lives in the colocated CSS: the brand purple has no semantic
	// Tailwind token, so it is a family-level CSS custom property instead.
	accent: "ft-btn--accent",
	destructive:
		"border border-destructive/35 bg-destructive/10 text-destructive hover:bg-destructive/20",
};

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
	(
		{
			variant = "primary",
			size = "md",
			type = "button",
			disabled = false,
			loading = false,
			href = undefined,
			target = undefined,
			rel = undefined,
			fullWidth = false,
			label = undefined,
			onClick,
			iconStart,
			iconEnd,
			children,
			className,
			sound = false,
			...restProps
		},
		ref
	) => {
		const classes = cn(
			"ft-btn",
			"inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium",
			// No `transition-colors` here: the colour channel is declared in
			// `button.css` instead, alongside the press, so one rule owns the
			// whole transition list. The utility would only add a second,
			// competing declaration over the same three properties.
			"cursor-pointer",
			"focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ft-btn-accent)]/35",
			// `data-disabled` covers the anchor branch, which has no native `:disabled`
			// pseudo-class to hang the same dimmed treatment off. It tracks `disabled`
			// alone, never `loading` — `aria-disabled` also goes true while loading (see
			// `anchorBlocked` below), but the mockup's loading swatch is explicitly not
			// dimmed, so the visual hook and the a11y attribute must stay two different
			// things even though they overlap when `disabled` is set.
			"disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
			"data-disabled:pointer-events-none data-disabled:cursor-not-allowed data-disabled:opacity-50",
			SIZE_CLASSES[size],
			VARIANT_CLASSES[variant],
			fullWidth && "w-full",
			className
		);

		// `target="_blank"` without `noopener` lets the opened page reach back into
		// this one via `window.opener`; a caller-supplied `rel` is widened rather
		// than trusted, so the safe tokens are always present even if they forgot.
		const resolvedRel = (() => {
			if (target !== "_blank") return rel;
			const tokens = new Set((rel ?? "").split(/\s+/).filter(Boolean));
			tokens.add("noopener");
			tokens.add("noreferrer");
			return [...tokens].join(" ");
		})();

		// An <a> has no native `disabled` state. `disabled` strips `href`/`target`
		// and leaves the tab order (nothing to activate, nothing to read). `loading`
		// is different: the control is busy, not unavailable, so it keeps its `href`
		// and its tab stop — focus must not vanish under a keyboard user mid-request —
		// and activation is blocked in the handlers instead (`click` for keyboard and
		// primary pointer, `auxclick` for middle-click). `aria-busy` + `aria-disabled`
		// tell assistive tech why nothing happens.
		const anchorInert = disabled;
		const anchorBlocked = disabled || loading;

		// Hover cue for mouse/pen pointers only. `on: {}` binds nothing when sound is
		// off (and never the default click → press, which `handleClick` already plays).
		const soundRef = useSoundFeedback({
			on: sound ? { pointerenter: "hover" } : {},
			disabled: anchorBlocked,
		});
		const composedRef = useComposedRefs(ref as Ref<HTMLElement>, soundRef);

		// The single guard both branches funnel through. A native `disabled` button
		// already refuses real pointer/keyboard input, but a synthetic `.click()` (or
		// an anchor, which has no disabled state at all) walks straight past that —
		// this is what actually keeps the callback from firing.
		// Middle-click guard for the anchor branch: internal first, then the consumer's
		// own `onAuxClick` (never overwritten), skipped while blocked like `onClick`.
		function handleAuxClick(event: MouseEvent<HTMLAnchorElement>) {
			if (disabled || loading) {
				event.preventDefault();
				return;
			}
			(restProps as AnchorHTMLAttributes<HTMLAnchorElement>).onAuxClick?.(event);
		}

		function handleClick(event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) {
			if (disabled || loading) {
				event.preventDefault();
				return;
			}
			if (sound) soundFx.play("press");
			onClick?.(event);
		}

		const content = (
			<>
				{/* The lead slot: one fixed cell for the spinner or iconStart, so a
				    loading swap never moves the label and an icon centres exactly as
				    in the Svelte and Vue buttons. aria-hidden only while loading:
				    the caller's own icon keeps whatever treatment they gave it. */}
				{loading || (iconStart != null && iconStart !== false) ? (
					<span className="ft-btn-lead" aria-hidden={loading ? "true" : undefined}>
						{loading ? (
							<span className="ft-btn-spinner"></span>
						) : (
							<span className="ft-btn-lead-icon">{iconStart}</span>
						)}
					</span>
				) : null}
				{children}
				{iconEnd}
			</>
		);

		if (href) {
			return (
				<a
					{...(restProps as AnchorHTMLAttributes<HTMLAnchorElement>)}
					ref={composedRef as Ref<HTMLAnchorElement>}
					className={classes}
					href={anchorInert ? undefined : href}
					target={anchorInert ? undefined : target}
					rel={resolvedRel}
					aria-label={label ?? restProps["aria-label"]}
					data-disabled={
						disabled
							? "true"
							: ((restProps as Record<string, unknown>)["data-disabled"] as string | undefined)
					}
					aria-disabled={anchorBlocked ? "true" : restProps["aria-disabled"]}
					aria-busy={loading ? "true" : restProps["aria-busy"]}
					tabIndex={anchorInert ? -1 : restProps.tabIndex}
					onClick={handleClick}
					onAuxClick={handleAuxClick}
				>
					{content}
				</a>
			);
		}

		return (
			<button
				{...(restProps as ButtonHTMLAttributes<HTMLButtonElement>)}
				ref={composedRef as Ref<HTMLButtonElement>}
				className={classes}
				type={type}
				disabled={disabled}
				aria-label={label ?? restProps["aria-label"]}
				aria-busy={loading ? "true" : restProps["aria-busy"]}
				onClick={handleClick}
			>
				{content}
			</button>
		);
	}
);

Button.displayName = "Button";
