import type { MouseEvent, ReactNode } from "react";
import confetti from "canvas-confetti";
import type { Options as ConfettiOptions } from "canvas-confetti";
import { useSoundCue } from "../../sound/use-sound.js";
import { ConfettiReactContext } from "./context.js";

export interface ConfettiButtonProps {
	/** Confetti options for this button, merged over the surrounding root's options. */
	options?: ConfettiOptions;
	/** Button content. */
	children?: ReactNode;
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

/**
 * Button that fires confetti from its own centre.
 *
 * Inside a `Confetti` it paints on that component's canvas; outside one it falls
 * back to the module-level confetti and its full-page canvas.
 *
 * Rest props are not spread and no `className` is accepted: the Svelte source
 * declares only `options`, `children` and `sound`.
 */
export function ConfettiButton({ options = {}, children, sound = false }: ConfettiButtonProps) {
	const confettiContext = ConfettiReactContext.useOptional();
	const playCue = useSoundCue(sound);

	function handleClick(event: MouseEvent<HTMLButtonElement>) {
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
	}

	return <button onClick={handleClick}>{children}</button>;
}
