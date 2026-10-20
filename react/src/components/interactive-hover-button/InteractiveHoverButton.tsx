import { forwardRef } from "react";
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import { cn } from "../../utils.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { useSoundFeedback } from "../../sound/sound-feedback.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import "./interactive-hover-button.css";

type BaseProps = {
	/** Button label text */
	text?: string;
	/** Custom CSS class */
	className?: string;
	/** Button content (overrides text prop) */
	children?: ReactNode;
	/**
	 * Plays the `hover` cue on mouse/pen pointer enter and the `press` cue on
	 * click. Off by default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
};

export interface InteractiveHoverButtonProps
	extends BaseProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> {}

/*
 * Hover (or keyboard focus): the dot's circle opens until it fills the
 * button, the resting label rolls up and out, and the hover label rolls up
 * into place with its arrow a beat behind. Colours: `--ihb-fill` (the dot
 * and the fill) and `--ihb-fill-foreground` (the hover label), both
 * overridable from `className`. Under reduced motion the hover state arrives
 * instead of travelling.
 */
export const InteractiveHoverButton = forwardRef<HTMLButtonElement, InteractiveHoverButtonProps>(
	({ text = "Button", className, children, onClick, sound = false, ...restProps }, ref) => {
		const label = children ?? text;
		const playCue = useSoundCue(sound);

		// Hover cue for mouse/pen pointers only. `on: {}` binds nothing when sound is
		// off (and never the default click → press, which `handleClick` already plays).
		const soundRef = useSoundFeedback({
			on: sound ? { pointerenter: "hover" } : {},
			disabled: restProps.disabled,
		});
		const composedRef = useComposedRefs(ref, soundRef);

		function handleClick(event: MouseEvent<HTMLButtonElement>) {
			if (sound && !restProps.disabled) playCue("press");
			onClick?.(event);
		}

		return (
			<button
				ref={composedRef}
				className={cn(
					"ihb group bg-background relative isolate w-auto cursor-pointer overflow-hidden rounded-full border px-6 py-2.5 text-center font-semibold",
					className
				)}
				onClick={handleClick}
				{...restProps}
			>
				{/* The dot and the fill are one layer: a clipped circle that opens. */}
				<span className="ihb-fill" aria-hidden="true"></span>

				<span className="ihb-rest">
					<span className="ihb-dot-space" aria-hidden="true"></span>
					<span className="ihb-label">{label}</span>
				</span>

				<span aria-hidden="true" className="ihb-hover">
					<span className="ihb-hover-label">{label}</span>
					<svg
						className="ihb-arrow"
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M5 12h14" />
						<path d="m12 5 7 7-7 7" />
					</svg>
				</span>
			</button>
		);
	}
);

InteractiveHoverButton.displayName = "InteractiveHoverButton";
