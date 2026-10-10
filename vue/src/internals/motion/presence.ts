/**
 * `usePresence` — the mount/unmount clock every transition-driven surface in
 * this package runs on.
 *
 * The framework this library ports from hands a conditional block's exit
 * animation to its own scheduler: the block stays alive until its LAST
 * transition finishes, and only then is it destroyed. Vue has no such thing
 * for arbitrary teardown — `<Transition>` delays DOM *removal*, not component
 * teardown, so `onBeforeUnmount` and the effect scope both run at the instant
 * the leave BEGINS. A scroll lock, a dismissable layer and a focus trap inside
 * a leaving subtree would therefore all release while the fade is still on
 * screen. So the clock is owned explicitly here, and owning it in one place
 * rather than per component buys four things:
 *
 * - **Cleanup timing, for free.** Every cleanup inside the subtree — a scroll
 *   lock's release, a dismissable layer's splice, a focus trap's destroy path
 *   — lands at the instant the exit settles, exactly where the source's
 *   outro-delayed `destroy()` put it. No other module in this package needs a
 *   "delay my teardown" mechanism.
 * - **Reversal.** ONE bidirectional leg per node, never a split in/out pair, so
 *   a reopen mid-close resumes from the position the close actually reached
 *   instead of snapping back to the far end. Reversal smoothing only exists for
 *   a unified leg; having one composable own both directions makes that
 *   structural rather than a convention a port could break. The node is never
 *   unmounted during such a reversal — which is why `onEnterStart` is the hook
 *   a focus trap re-arms from.
 * - **Grouping.** Several nodes can share one clock (a dialog's scrim and its
 *   panel), so they leave together and the unmount is a tie rather than a
 *   straggler. Two independent `<Transition>`s are two clocks.
 * - **Pixel identity.** The legs run through `runTransition`, which samples the
 *   same keyframe array the source's own transition runtime samples.
 *
 * `register()` is called from `setup` and returns a CACHED, identity-stable
 * function ref, so Vue never detaches and reattaches an animated node. The
 * transition and its params are rewritten into a per-key slot and read at the
 * instant a leg starts, never at render time. That is what lets `params` take a
 * `(entering: boolean) => P` factory, and the factory form is the documented
 * default: a single bidirectional transition cannot tell entering from leaving
 * on its own (its `direction` reports `"both"` on both invocations, computed
 * once for the life of the node), but `open` can — so the factory is called
 * with the answer, and `usePresence` passes a real `"in"`/`"out"` down so a
 * preset's own direction-dependent easing default resolves correctly.
 *
 * Phase: `onMounted` plus a `flush: "post"` watcher, which land in the same
 * pre-paint flush as a template-ref assignment. The source starts an intro
 * before paint; a `flush: "pre"` watcher would run before the DOM patch that
 * creates the node, and a reduced-motion close would cost an extra frame
 * instead of settling inside the same flush that started it.
 *
 * SSR: `mounted` starts at `open()`, no leg ever runs (the driver watcher is
 * deliberately not `immediate`, and `onMounted` never fires on the server), and
 * nothing here reads a browser global on a render path. A surface that is open
 * on the server paints at rest — which is also the client's behaviour on a
 * first render, because `appear` defaults to false.
 */

import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

import {
	createPresenceCore,
	type PresenceRefCallback,
	type PresenceState,
} from "./presence-core.js";
import type { SurfaceState } from "./anchored.js";
import type { TransitionFn } from "./transitions.js";

export type { PresenceState, PresenceRefCallback };

/** The shape `register()` hands back, spelled as the internals contract spells
 *  it. The shared core declares the same function type under its own name; this
 *  alias exists so a call site can name it without reaching into the core. */
export type PresenceRef = PresenceRefCallback;

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
	 * answering a click. Vue does not, so the core does. `false` is the
	 * explicit opt-out, and it means this composable never touches `inert` at
	 * all.
	 *
	 * Written as the ATTRIBUTE, through `toggleAttribute`, never as the
	 * `inert` IDL property. The attribute is what `:not([inert])` selectors and
	 * assistive technology key on, a real browser reflects it to the IDL
	 * property for anything reading that instead, and it is the only one of the
	 * two that exists under jsdom, so the behaviour a test pins is the
	 * behaviour that ships.
	 */
	inert?: boolean;
	onEnterStart?: () => void;
	onEnterEnd?: () => void;
	/** Fires at the dismiss instant, before the exit paints. */
	onExitStart?: () => void;
	onExitEnd?: () => void;
}

export interface PresenceHandle {
	/** Render the subtree while true. Stays true through the WHOLE exit.
	 *  Unwrapped by `reactive()`, so a template writes `presence.mounted` and
	 *  never `presence.mounted.value`. */
	readonly mounted: boolean;
	/** Three values. For anything whose source renders three. */
	readonly state: PresenceState;
	/** Two values — `state === "closing" ? "closing" : "open"`. THE value every
	 *  anchored surface renders into `data-state` (convention C-5). */
	readonly surfaceState: SurfaceState;
	/** `=== open`. Pass to `active:` options and to params factories. */
	readonly entering: boolean;

	/** Attach the single animated element. */
	register<P>(transition: TransitionFn<P>, params?: P | ((entering: boolean) => P)): PresenceRef;
	/** Attach one of several elements sharing this clock (a dialog's scrim +
	 *  panel). The subtree unmounts only when EVERY keyed exit has finished. */
	register<P>(
		key: string,
		transition: TransitionFn<P>,
		params?: P | ((entering: boolean) => P)
	): PresenceRef;
}

/**
 * Owns one surface's mount/unmount clock. `mounted` stays true through the
 * whole exit and goes false only once every registered node's leg has settled.
 *
 * `open` is a GETTER, not a value: the composable runs once per component, so a
 * captured boolean would freeze at its first-render value.
 */
export function usePresence(
	open: () => boolean,
	options: UsePresenceOptions = {}
): PresenceHandle {
	const appear = options.appear ?? false;

	const mounted = ref(open());
	const state = ref<PresenceState>("open");

	// A getter, not a captured boolean: `inert` is read at the instant an exit
	// starts, so an opt-out toggled after mount is still honoured.
	const inertRef = {
		get current() {
			return options.inert ?? true;
		},
	};

	// `setup` runs once, so this is the constant React needed `useConstant` for.
	// The callbacks are read through `options` on every call, which is the Vue
	// equivalent of `useEventCallback` — no stable-identity wrapper is required.
	const core = createPresenceCore({
		setMounted: (next) => {
			mounted.value = next;
		},
		setState: (next) => {
			state.value = next;
		},
		onEnterStart: () => options.onEnterStart?.(),
		onEnterEnd: () => options.onEnterEnd?.(),
		onExitStart: () => options.onExitStart?.(),
		onExitEnd: () => options.onExitEnd?.(),
		inertRef,
	});

	// First pass. `onMounted` is the same flush as a post watcher, and every
	// registered node's function ref has already been called by the time it runs.
	onMounted(() => {
		core.sync(open(), mounted.value, appear);
	});

	// The driver. `flush: "post"` is mandatory: `sync()`'s open-from-closed
	// branch sets `mounted` and RETURNS, so the legs start on the pass after the
	// subtree rendered — and that pass is only correct once the new nodes have
	// attached. `immediate` is deliberately absent, which is also what keeps this
	// from running on the server.
	watch(
		[open, mounted],
		([o, m]) => {
			core.sync(o, m, appear);
		},
		{ flush: "post" }
	);

	// Separate from the driver precisely BECAUSE it tears down: giving the driver
	// a cleanup would abort every leg on each reversal, the one thing this exists
	// to avoid. `onBeforeUnmount`, never `onUnmounted` — the DOM is still
	// attached, like an action's `destroy`.
	onBeforeUnmount(() => {
		core.teardown();
	});

	// `reactive(...)`, not a plain object of refs, and this is a rule rather than
	// a taste: a plain object's refs are NOT unwrapped in a template, so
	// `v-if="presence.mounted"` would test a `Ref` object — always truthy — and
	// the surface would mount forever with every other assertion still passing.
	return reactive({
		mounted,
		state,
		surfaceState: computed<SurfaceState>(() => (state.value === "closing" ? "closing" : "open")),
		entering: computed(() => open()),
		register: core.register,
	}) as PresenceHandle;
}
