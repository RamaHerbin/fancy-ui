import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../utils.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";
import { usePresence } from "../../internals/motion/presence.js";
import { preset as makePreset } from "../../internals/motion/transitions.js";
import type { PresetName } from "../../internals/motion/types.js";

/**
 * Presence — mounts and unmounts content with a real entrance and exit rather
 * than an instant swap, driving `data-state` through `opening → open →
 * closing` and firing lifecycle callbacks a caller can hook into. Shares
 * Reveal's preset vocabulary, plus `blur`/`zoom` — the one place besides
 * Reveal a preset may carry `filter`, and here it is opt-in per instance
 * rather than per child — with an asymmetric, faster-leaving exit by default.
 *
 * There is deliberately no stylesheet: the source has no `<style>` block and
 * no custom properties, because the motion is entirely JS-timed through
 * `duration`/`exitDuration`/`delay`/`distance` feeding `preset()`'s sampled
 * keyframes. There is nothing for a stylesheet to override; use the props.
 */
export interface PresenceProps
	extends Omit<HTMLAttributes<HTMLDivElement>, "className" | "children"> {
	/** Whether the content is mounted and, once the entrance settles, visible. */
	open: boolean;
	/** Shares Reveal's preset vocabulary, plus `blur`/`zoom` — the one place besides Reveal a preset may carry `filter`, and here it's opt-in per instance, not per child. */
	preset?: PresetName;
	/** Entrance duration in ms. */
	duration?: number;
	/** Exit duration in ms — shorter than the entrance by default; leaving reads faster than arriving. */
	exitDuration?: number;
	/** Delay in ms before the entrance starts. Applied to the exit too. */
	delay?: number;
	/** Entrance travel distance in px for the four directional presets. The exit travels half as far. */
	distance?: number;
	/** Whether the panel is `inert` while closing. `true`, the default, reproduces the native behaviour the source framework applies to any transitioning element; `false` is an explicit opt-out, and it means the attribute is never touched at all. */
	inert?: boolean;
	/** Fires once the entrance transition settles. */
	onEnterEnd?: () => void;
	/** Fires once the exit transition settles — NOT guaranteed if the component is unmounted mid-exit. */
	onExitEnd?: () => void;
	/** Additional CSS classes, merged onto the root. */
	className?: string;
	/** Panel content. */
	children: ReactNode;
}

export const Presence = forwardRef<HTMLDivElement, PresenceProps>(function Presence(
	{
		open,
		preset = "fade",
		duration = 300, // DURATIONS.base
		exitDuration = 200, // DURATIONS.exit
		delay = 0,
		distance = 16,
		inert = true,
		onEnterEnd,
		onExitEnd,
		className,
		children,
		...restProps
	},
	forwardedRef
) {
	const reduced = useReducedMotion();

	// `mounted` stays true for the WHOLE exit, so the subtree leaves at the
	// instant the exit settles rather than the instant `open` flips — the mount
	// clock the source's own conditional block owned, made explicit.
	const presence = usePresence(open, { inert, onEnterEnd, onExitEnd });

	// C-2: composed ABOVE the early return. Building this inside the JSX below
	// would be a conditional hook and would throw the first time `mounted`
	// flips.
	//
	// ONE bidirectional leg, never a split enter/exit pair: reversal smoothing
	// — a rapid `open` toggle resuming from the position the close actually
	// reached instead of snapping back to the far end — only exists for a
	// unified leg. The params factory supplies the direction the leg itself
	// cannot know (a single two-way transition reports an ambiguous "both" on
	// both of its invocations, while `open` is the real signal), and it is
	// called at the instant a leg starts, so it always reads the latest
	// render's props and reduced-motion answer rather than the ones registered
	// at mount.
	const rootRef = useComposedRefs(
		forwardedRef,
		presence.register(makePreset(preset), (entering) => ({
			duration: reduced ? 0 : entering ? duration : exitDuration,
			delay: reduced ? 0 : delay,
			distance: entering ? distance : distance / 2,
		}))
	);

	if (!presence.mounted) return null;

	return (
		<div
			{...restProps}
			ref={rootRef}
			className={cn("ft-presence", className)}
			// Three values, not the two an anchored surface renders (C-5): the
			// source renders three here.
			data-state={presence.state}
		>
			{children}
		</div>
	);
});
