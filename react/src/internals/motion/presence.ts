/**
 * `usePresence` — the mount/unmount clock every transition-driven surface in
 * this package runs on.
 *
 * The framework this library ports from hands a conditional block's exit
 * animation to its own scheduler: the block stays alive until its LAST
 * transition finishes, and only then is it destroyed. React has no such thing
 * — a component that stops rendering a subtree removes it in the same commit —
 * so the clock has to be owned explicitly. This hook is that owner, and owning
 * it in one place rather than per component buys three things:
 *
 * - **Cleanup timing, for free.** Every effect cleanup inside the subtree — a
 *   scroll lock's release, a dismissable layer's splice, a focus trap's destroy
 *   path — lands at the instant the exit settles, exactly where the source's
 *   outro-delayed `destroy()` put it. No other module needs a "delay my
 *   teardown" mechanism.
 * - **Reversal.** ONE bidirectional leg per node, never a split in/out pair, so
 *   a reopen mid-close resumes from the position the close actually reached
 *   instead of snapping back to the far end. Reversal smoothing only exists for
 *   a unified leg; having one hook own both directions makes that structural
 *   rather than a convention a port could break. The node is never unmounted
 *   during such a reversal — which is why `onEnterStart` is the hook a focus
 *   trap re-arms from.
 * - **Grouping.** Several nodes can share one clock (a dialog's scrim and its
 *   panel), so they leave together and the unmount is a tie rather than a
 *   straggler.
 *
 * `register()` is called during render and returns a CACHED, identity-stable
 * ref callback, so React never detaches and reattaches an animated node. The
 * transition and its params are rewritten on every render into a per-key slot
 * and read at the instant a leg starts, never at render time. That is what lets
 * `params` take a `(entering: boolean) => P` factory, and the factory form is
 * the documented default: a single bidirectional transition cannot tell
 * entering from leaving on its own (its `direction` reports `"both"` on both
 * invocations, computed once for the life of the node), but `open` can — so the
 * factory is called with the answer, and `usePresence` passes a real
 * `"in"`/`"out"` down so a preset's own direction-dependent easing default
 * resolves correctly.
 *
 * Phase: layout effect throughout (contract §4). The source starts an intro
 * before paint; a passive effect would paint one frame at rest first, and a
 * reduced-motion close would cost an extra frame instead of settling inside the
 * same effect that started it.
 *
 * SSR: `mounted` starts at `open`, no leg ever runs, and nothing here reads a
 * browser global in a render path. A surface that is open on the server paints
 * at rest — which is also the client's behaviour on a first render, because
 * `appear` defaults to false.
 */

import { useState } from "react";
import type { RefCallback } from "react";

import { useConstant, useIsomorphicLayoutEffect } from "../dom/ssr.js";
import { useEventCallback } from "../dom/use-event-callback.js";
import { useLiveRef } from "../dom/use-live-ref.js";
import { createPresenceCore, type PresenceState } from "./presence-core.js";
import type { SurfaceState } from "./anchored.js";
import type { TransitionFn } from "./transitions.js";

export type { PresenceState };

export interface UsePresenceOptions {
	/**
	 * Animate an entrance when `open` is ALREADY true on the very first render.
	 * Default FALSE, reproducing two source rules that happen to agree: a LOCAL
	 * transition never plays on the initial render of the block that owns it,
	 * and hydration defaults intros off. A surface mounting for the first time
	 * already open therefore paints visible with no intro.
	 */
	appear?: boolean;
	/**
	 * Set `inert` on every attached node while closing, clear it on enter.
	 * Default true — the source sets it itself, synchronously, immediately
	 * before the exit starts, which is what keeps a closing panel from
	 * answering a click. `false` is the explicit opt-out, and it means this
	 * hook never touches `inert` at all.
	 *
	 * Written as the ATTRIBUTE, through `toggleAttribute`, never as the
	 * `inert` IDL property — the one mechanism this package uses everywhere
	 * (`useInertAttribute` is the same write behind a ref). The attribute is
	 * what `:not([inert])` selectors and assistive technology key on, a real
	 * browser reflects it to the IDL property for anything reading that
	 * instead, and it is the only one of the two that exists under jsdom, so
	 * the behaviour a test pins is the behaviour that ships.
	 */
	inert?: boolean;
	onEnterStart?: () => void;
	onEnterEnd?: () => void;
	/** Fires at the dismiss instant, before the exit paints. */
	onExitStart?: () => void;
	onExitEnd?: () => void;
}

export interface PresenceHandle {
	/** Render the subtree while true. Stays true through the WHOLE exit. */
	readonly mounted: boolean;
	/** Three values. For anything whose source renders three. */
	readonly state: PresenceState;
	/** Two values — `state === "closing" ? "closing" : "open"`. THE value every
	 *  anchored surface renders into `data-state` (convention C-5). */
	readonly surfaceState: SurfaceState;
	/** `=== open`. Pass to `active:` options and to params factories. */
	readonly entering: boolean;

	/** Attach the single animated element. */
	register<P>(
		transition: TransitionFn<P>,
		params?: P | ((entering: boolean) => P)
	): RefCallback<HTMLElement>;
	/** Attach one of several elements sharing this clock (a dialog's scrim +
	 *  panel). The subtree unmounts only when EVERY keyed exit has finished. */
	register<P>(
		key: string,
		transition: TransitionFn<P>,
		params?: P | ((entering: boolean) => P)
	): RefCallback<HTMLElement>;
}

/**
 * Owns one surface's mount/unmount clock. `mounted` stays true through the
 * whole exit and goes false only once every registered node's leg has settled.
 */
export function usePresence(open: boolean, options: UsePresenceOptions = {}): PresenceHandle {
	const { appear = false, inert = true } = options;

	const [mounted, setMounted] = useState(open);
	const [state, setState] = useState<PresenceState>("open");

	const onEnterStart = useEventCallback(options.onEnterStart);
	const onEnterEnd = useEventCallback(options.onEnterEnd);
	const onExitStart = useEventCallback(options.onExitStart);
	const onExitEnd = useEventCallback(options.onExitEnd);

	const inertRef = useLiveRef(inert);
	const appearRef = useLiveRef(appear);

	// Every dependency below is identity-stable for the life of the component:
	// React's own setters, and the permanently-stable wrappers `useEventCallback`
	// and `useLiveRef` hand back. The factory allocates and nothing else.
	const core = useConstant(() =>
		createPresenceCore({
			setMounted,
			setState,
			onEnterStart,
			onEnterEnd,
			onExitStart,
			onExitEnd,
			inertRef,
		})
	);

	// `appear` is deliberately not a dependency: it only ever decides whether the
	// FIRST run animates, and it is read live so it cannot go stale either.
	useIsomorphicLayoutEffect(() => {
		core.sync(open, mounted, appearRef.current);
	}, [core, appearRef, open, mounted]);

	// Separate from the driver above precisely BECAUSE it has a cleanup: giving
	// the driver one would abort every leg on each reversal, which is the one
	// thing this hook exists to avoid.
	useIsomorphicLayoutEffect(() => core.teardown, [core]);

	return {
		mounted,
		state,
		surfaceState: state === "closing" ? "closing" : "open",
		entering: open,
		register: core.register,
	};
}
