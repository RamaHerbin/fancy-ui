/**
 * Shared core: the framework-free state machine behind `usePresence`
 * (`./presence.ts`), split into its own module so a Vue package can drive
 * the identical mount/unmount clock. Tracked in `shared-cores.json` at the
 * repo root as a byte-identical file across every framework package this
 * library ships — see that manifest and `scripts/check-shared-cores.mjs`
 * for the identity/purity gate this file must keep passing.
 *
 * Framework-free means exactly that: no `import ... from "react"` (or
 * "svelte"/"vue"), no `import.meta.env`, no `window`/`document`/`navigator`
 * read at module scope. DOM types (`HTMLElement`, `Element`) are fine — they
 * come from `lib.dom.d.ts`, not from a framework — and so is calling into a
 * DOM API from inside a function, which only ever happens once a real node
 * is handed in through `register`.
 *
 * `presence.ts` carries the design rationale for the clock itself (why one
 * hook owns both directions, why grouping matters, the SSR story); this file
 * is the mechanism, with the framework-specific ref type swapped for
 * `PresenceRefCallback` so the same bytes work in every package.
 */

import { runTransition, type TransitionRun } from "./animate.js";
import type { TransitionFn, TransitionSpec } from "./transitions.js";

/** The three values `Presence` renders into `data-state`, because its source
 *  renders three. An anchored surface renders `surfaceState`'s two instead —
 *  the two vocabularies are not interchangeable (convention C-5). */
export type PresenceState = "opening" | "open" | "closing";

/**
 * A framework-free callback ref: called with the live node on attach, `null`
 * on detach, returning nothing. This is the shape every framework's own ref
 * callback type is compatible with — React's `RefCallback<HTMLElement>`
 * resolves to `(instance: HTMLElement | null) => void | (() => void)`, and a
 * function that always returns `void` satisfies that trivially — so each
 * package's wrapper can hand a slot's `ref` straight through with no cast.
 */
export type PresenceRefCallback = (node: HTMLElement | null) => void;

/** Internal spelling of `register`'s second/third argument: a params value, or a
 *  factory called with the direction at the instant the leg starts. */
export type ParamsOrFactory<P> = P | ((entering: boolean) => P);

export interface PresenceCoreDeps {
	setMounted: (mounted: boolean) => void;
	setState: (state: PresenceState) => void;
	onEnterStart: () => void;
	onEnterEnd: () => void;
	onExitStart: () => void;
	onExitEnd: () => void;
	/** Read live at the moment an exit starts, never captured per render. */
	inertRef: { readonly current: boolean };
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
	/** Cached for the life of the slot, so a caller never detaches and
	 *  reattaches the node just because its owning component re-rendered. */
	ref: PresenceRefCallback;
}

/**
 * The framework-free state machine behind `usePresence`. Allocation-only, so
 * it is safe to build eagerly on first use: it installs no listener and
 * starts no timer until `sync()` is called from a layout effect.
 */
export function createPresenceCore(deps: PresenceCoreDeps) {
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
			// Block body, never a concise arrow: a returned value would be read
			// as a cleanup function by a framework's ref-callback contract
			// (React 19's included — convention C-3), and this ref never means to
			// return one.
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
	): PresenceRefCallback {
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
				// — the node stays in the DOM until the owner processes
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
				slot.node?.toggleAttribute("inert", false);
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
				slot.node?.toggleAttribute("inert", true);
			}
		}
	}

	/**
	 * The whole state machine, driven from one layout effect keyed on
	 * `[open, mounted]`. Every registered node has already attached by the time
	 * this runs: a child host node's ref attaches before an ancestor's layout
	 * effect runs, children first.
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
