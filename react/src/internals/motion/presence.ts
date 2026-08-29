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
import { runTransition, type TransitionRun } from "./animate.js";
import type { SurfaceState } from "./anchored.js";
import type { TransitionFn, TransitionSpec } from "./transitions.js";

/** The three values `Presence` renders into `data-state`, because its source
 *  renders three. An anchored surface renders `surfaceState`'s two instead —
 *  the two vocabularies are not interchangeable (convention C-5). */
export type PresenceState = "opening" | "open" | "closing";

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
	 * Default true — the source sets `element.inert = true` itself,
	 * synchronously, immediately before the exit starts, which is what keeps a
	 * closing panel from answering a click. `false` is the explicit opt-out, and
	 * it means this hook never touches `inert` at all.
	 */
	inert?: boolean;
	onEnterStart?: () => void;
	onEnterEnd?: () => void;
	/** Fires at the dismiss instant, before the exit paints. */
	onExitStart?: () => void;
	onExitEnd?: () => void;
}

/** Internal spelling of `register`'s second/third argument: a params value, or a
 *  factory called with the direction at the instant the leg starts. The public
 *  overloads below spell the union out inline, so the emitted declaration reads
 *  as the contract writes it. */
type ParamsOrFactory<P> = P | ((entering: boolean) => P);

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

/** The key a single-element `register(transition, params)` call lands on. */
const DEFAULT_KEY = "default";

/** One animated element's seat on the shared clock. */
interface PresenceSlot {
	/** The live node, or `null` while detached. */
	node: HTMLElement | null;
	/** Rewritten on EVERY render by `register`; called at the instant a leg
	 *  starts, which is the only moment `params` is ever read. */
	buildSpec: ((node: Element, entering: boolean) => TransitionSpec) | null;
	/** The leg attached to this slot, kept as the counterpart a reversing leg
	 *  reads its start position from. Cleared when an ENTER finishes, kept when
	 *  an exit does — see `startSlot`. */
	run: TransitionRun | undefined;
	/** Direction of the leg this slot last started; `null` before its first. */
	legTo: 0 | 1 | null;
	/** Whether that leg has settled. */
	finished: boolean;
	/**
	 * A leg this slot was carrying when its node was detached, owed back to it
	 * the moment a node reattaches. `null` whenever nothing is owed.
	 *
	 * React 19's StrictMode detaches and reattaches every ref on a host node's
	 * mount (`attach` → `detach` → `attach`), and the detach lands AFTER the
	 * layout effect that started the leg. Without this the aborted leg is lost
	 * for good: the driver effect is keyed on `[open, mounted]`, neither of
	 * which moves across a double-invoke, so nothing would ever start it again
	 * and the entrance would stall at `"opening"` forever.
	 */
	pendingLeg: 0 | 1 | null;
	/** Cached for the life of the slot, so React never detaches and reattaches
	 *  the node just because the component re-rendered. */
	ref: RefCallback<HTMLElement>;
}

interface PresenceCoreDeps {
	setMounted: (mounted: boolean) => void;
	setState: (state: PresenceState) => void;
	onEnterStart: () => void;
	onEnterEnd: () => void;
	onExitStart: () => void;
	onExitEnd: () => void;
	/** Read live at the moment an exit starts, never captured per render. */
	inertRef: { readonly current: boolean };
}

/**
 * The framework-free state machine behind the hook. Allocation-only, so it is
 * safe to build through `useConstant`: it installs no listener and starts no
 * timer until `sync()` is called from a layout effect.
 */
function createPresenceCore(deps: PresenceCoreDeps) {
	const slots = new Map<string, PresenceSlot>();

	/** Direction of the leg currently in flight across the whole group, or
	 *  `null` once it has settled. One clock, shared by every slot. */
	let leg: 0 | 1 | null = null;
	/** Suppresses `settle()` while `startLegs` is still handing legs out, so a
	 *  synchronous (duration 0) finish on the first slot cannot settle the group
	 *  before the rest have started. */
	let starting = false;
	/** Whether the closing `inert` is currently applied, so a reversal clears
	 *  exactly what was set and a caller that opted out is never touched. */
	let inertApplied = false;
	/** Reset by `teardown()`, so a remount is a fresh mount again — which is
	 *  what keeps the `appear` rule honest under StrictMode's double-invoke. */
	let firstRun = true;

	function ensureSlot(key: string): PresenceSlot {
		const existing = slots.get(key);
		if (existing) return existing;

		const slot: PresenceSlot = {
			node: null,
			buildSpec: null,
			run: undefined,
			legTo: null,
			finished: false,
			pendingLeg: null,
			// Block body, never a concise arrow: React 19 reads a returned value
			// as a cleanup function (convention C-3).
			ref: (node) => {
				if (node) {
					slot.node = node;
					// A leg was in flight when the previous node detached, so hand
					// it back — this is the only thing that restarts it. The common
					// case is StrictMode's mount-time detach/reattach, where the
					// detach lands after the layout effect that started the leg;
					// the resume is a no-op on a first attach, which is what keeps
					// the ordinary path (legs started by the driver effect) intact.
					const pending = slot.pendingLeg;
					slot.pendingLeg = null;
					if (pending !== null && leg === pending) startSlot(slot, pending);
					return;
				}
				// The node is leaving the DOM in this very commit; the animation
				// goes with it, so drop it rather than leaving a Chromium effect
				// leak behind, and forget the leg so a remount starts clean —
				// but remember an UNSETTLED leg, which a reattach owes back.
				slot.pendingLeg = leg !== null && !slot.finished ? leg : null;
				slot.run?.abort();
				slot.run = undefined;
				slot.node = null;
				slot.legTo = null;
				slot.finished = false;
			},
		};
		slots.set(key, slot);
		return slot;
	}

	function register<P>(
		a: string | TransitionFn<P>,
		b?: TransitionFn<P> | ParamsOrFactory<P>,
		c?: ParamsOrFactory<P>
	): RefCallback<HTMLElement> {
		const keyed = typeof a === "string";
		const slot = ensureSlot(keyed ? a : DEFAULT_KEY);
		const transition = (keyed ? b : a) as TransitionFn<P>;
		const params = (keyed ? c : b) as ParamsOrFactory<P> | undefined;

		// Stored, not called: `params` is read at leg start, never at render
		// time. A `params` that IS a function is therefore always the factory
		// form — no transition in this package takes a callable params value.
		slot.buildSpec = (node, entering) => {
			const resolved =
				typeof params === "function" ? (params as (entering: boolean) => P)(entering) : params;
			// A real "in"/"out", never the "both" a single bidirectional
			// directive reports, so a preset's own direction-dependent easing
			// default resolves correctly.
			return transition(node, resolved, { direction: entering ? "in" : "out" });
		};

		return slot.ref;
	}

	function startSlot(slot: PresenceSlot, to: 0 | 1): void {
		const node = slot.node;
		const buildSpec = slot.buildSpec;
		if (!node || !buildSpec) return;

		// Read BEFORE the bookkeeping below overwrites it: the in-flight leg is
		// this one's counterpart, and `runTransition` reads its position before
		// aborting it.
		const counterpart = slot.run;
		slot.legTo = to;
		slot.finished = false;
		slot.run = undefined;

		const handle: { current: TransitionRun | undefined } = { current: undefined };

		const run = runTransition(node, buildSpec(node, to === 1), to, counterpart, () => {
			slot.finished = true;
			if (to === 1) {
				// On ENTER finish, abort: that removes `fill: forwards` so the
				// element falls back to its resting style, which is the visible
				// end state by construction. On EXIT finish, deliberately do NOT
				// — the node stays in the DOM until React processes
				// `mounted = false` one render later, and dropping fill-forwards
				// would flash it back to visible for a frame.
				handle.current?.abort();
				slot.run = undefined;
			}
			settle(to);
		});

		handle.current = run;
		// A duration-0 leg already finished synchronously inside the call above;
		// keeping its handle would hand a settled leg to the next one as a
		// counterpart.
		if (!slot.finished) slot.run = run;
	}

	function startLegs(to: 0 | 1): void {
		starting = true;
		try {
			for (const slot of slots.values()) {
				if (!slot.node) continue;
				if (slot.legTo === to) continue;
				startSlot(slot, to);
			}
		} finally {
			starting = false;
		}
		settle(to);
	}

	/**
	 * The group settles only once EVERY attached node's leg has landed — the
	 * source's own rule that a block is destroyed when its LAST transition
	 * finishes, which is what makes a scrim/panel pair leave together instead of
	 * one straggling.
	 */
	function settle(to: 0 | 1): void {
		if (starting) return;
		// A leg that has been superseded by a reversal must not settle the group.
		if (leg !== to) return;

		for (const slot of slots.values()) {
			if (!slot.node) continue;
			if (slot.legTo !== to || !slot.finished) return;
		}

		leg = null;

		if (to === 1) {
			deps.setState("open");
			deps.onEnterEnd();
			return;
		}

		deps.setMounted(false);
		// Reset to the same honest default `state` starts at: without this a
		// completed close would leave `state` sitting at "closing", so the next
		// open would create the node already carrying a stale value for one
		// render before the entrance corrected it.
		deps.setState("open");
		deps.onExitEnd();
	}

	function beginEnter(): void {
		leg = 1;
		if (inertApplied) {
			inertApplied = false;
			for (const slot of slots.values()) {
				if (slot.node) slot.node.inert = false;
			}
		}
		deps.setState("opening");
		deps.onEnterStart();
	}

	function beginExit(): void {
		leg = 0;
		// Fires at the dismiss instant, before the exit paints: a keyboard user
		// does not wait out the fade with focus stranded on `<body>`.
		deps.onExitStart();
		deps.setState("closing");
		if (deps.inertRef.current) {
			inertApplied = true;
			for (const slot of slots.values()) {
				if (slot.node) slot.node.inert = true;
			}
		}
	}

	/**
	 * The whole state machine, driven from one layout effect keyed on
	 * `[open, mounted]`. Every registered node has already attached by the time
	 * this runs: React commits a child host fiber's ref before an ancestor
	 * function component's layout effect, children first.
	 */
	function sync(open: boolean, mounted: boolean, appear: boolean): void {
		const first = firstRun;
		firstRun = false;

		if (open) {
			if (!mounted) {
				// Fully closed. Announce the entrance and mount; the legs start on
				// the next pass, once the subtree has rendered and every
				// registered node has attached. Both passes land before paint.
				beginEnter();
				deps.setMounted(true);
				return;
			}
			if (first && !appear) {
				// A local transition never plays on the initial render of the
				// block that owns it: an already-open mount paints at rest, with
				// `state` left at its "open" default and no callback fired.
				return;
			}
			if (leg !== 1) beginEnter();
			startLegs(1);
			return;
		}

		if (!mounted) return;
		if (leg !== 0) beginExit();
		startLegs(0);
	}

	/** Unmount. Aborts every in-flight leg and rewinds the machine, so a
	 *  StrictMode remount is indistinguishable from a fresh mount. */
	function teardown(): void {
		for (const slot of slots.values()) {
			slot.run?.abort();
			slot.run = undefined;
			slot.legTo = null;
			slot.finished = false;
			slot.pendingLeg = null;
		}
		leg = null;
		inertApplied = false;
		firstRun = true;
	}

	return { register, sync, teardown };
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
