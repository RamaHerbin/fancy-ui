import { forwardRef } from "react";
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import confetti from "canvas-confetti";
import type { Options as ConfettiOptions } from "canvas-confetti";
import { useSoundCue } from "../../sound/use-sound.js";
import { useSoundFeedback } from "../../sound/sound-feedback.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { ConfettiReactContext } from "./context.js";

type BaseProps = {
	/** Confetti options for this button, merged over the surrounding root's options. */
	options?: ConfettiOptions;
	/** Button content. */
	children?: ReactNode;
	/**
	 * Plays the `hover` cue on mouse/pen pointer enter and the `press` cue on
	 * click. Off by default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
	/** Custom CSS class */
	className?: string;
};

export interface ConfettiButtonProps
	extends BaseProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> {}

/**
 * Button that fires confetti from its own centre.
 *
 * Inside a `Confetti` it paints on that component's canvas; outside one it falls
 * back to the module-level confetti and its full-page canvas.
 *
 * `type` defaults to `"button"` so it never submits a surrounding form; `className`
 * and native button attributes are forwarded, and a consumer `onClick` runs once
 * after the burst.
 */
export const ConfettiButton = forwardRef<HTMLButtonElement, ConfettiButtonProps>(
	function ConfettiButton(
		{ options = {}, children, sound = false, className, type = "button", onClick, ...restProps },
		ref
	) {
		const confettiContext = ConfettiReactContext.useOptional();
		const playCue = useSoundCue(sound);
		// Hover cue for mouse/pen pointers only. `on: {}` binds nothing when sound is
		// off (and never the default click → press, which `handleClick` already plays).
		const soundRef = useSoundFeedback({
			on: sound ? { pointerenter: "hover" } : {},
			disabled: !!restProps.disabled,
		});
		const composedRef = useComposedRefs(ref, soundRef);

		function handleClick(event: MouseEvent<HTMLButtonElement>) {
			if (restProps.disabled) return;
			// The cue fires before the burst, matching the Svelte source: the click
			// resolves nothing, so it gets `press` rather than a success cue. The
			// root's own auto-fire on mount stays silent — this button owns the
			// only cue in the family.
			playCue("press");

			const target = event.currentTarget as HTMLElement;
			const rect = target.getBoundingClientRect();
			const x = rect.left + rect.width / 2;
			const y = rect.top + rect.height / 2;

			const origin = {
				x: x / window.innerWidth,
				y: y / window.innerHeight,
			};

			if (confettiContext) {
				confettiContext.fire({ ...options, origin });
			} else {
				confetti({ ...options, origin });
			}
			onClick?.(event);
		}

		return (
			<button ref={composedRef} className={className} type={type} {...restProps} onClick={handleClick}>
				{children}
			</button>
		);
	}
);
