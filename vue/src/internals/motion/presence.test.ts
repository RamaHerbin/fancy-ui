import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, type PropType } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";

import { composeRefs } from "../dom/compose-refs.js";
import { usePresence, type PresenceHandle } from "./presence.js";
import { preset, type PresetParams, type TransitionFn, type TransitionSpec } from "./transitions.js";
import { JS_EASINGS } from "./tokens.js";
import { linear } from "./easing.js";
import { FakeAnimation } from "../../test-setup.js";

// Shape 4 (composable / component): an inline `<Probe open>` built with
// `defineComponent` + `h()` replaces the two `.test.svelte` rigs the source
// suite needed — one for a conditionally mounted node carrying a transition,
// one for the three-value `data-state` wiring. The `Element.prototype.animate`
// stub in `test-setup.ts` is what makes any of it runnable under jsdom, and
// `FakeAnimation.instances` is what lets a reversal be checked against the
// actual sampled keyframes rather than against a timer.

// No `inert` shim here, deliberately. jsdom implements no `inert` IDL property,
// so a prototype getter/setter reflecting the property to the attribute would
// mean the `inert` cases below pass against the shim rather than against what
// the composable writes. `usePresence` writes the ATTRIBUTE through
// `toggleAttribute`, so `hasAttribute("inert")` observes production behaviour
// directly and a shim would only hide the next regression.

afterEach(() => {
	// Every test that spies on Element.prototype.animate needs a FRESH spy with
	// an empty call history — vi.spyOn on an already-mocked property reuses the
	// existing mock rather than layering a new one, so without this a later
	// test's `expect(animateSpy).not.toHaveBeenCalled()` would see an earlier
	// test's calls too.
	vi.restoreAllMocks();
});

/** One stable transition instance, so `register` is handed the same function a
 * real port's module-scope factory would hand it. */
const FADE = preset("fade");

/**
 * Drains a leg to completion. The stub finishes each animation on a MICROTASK
 * and `runTransition` chains a dummy into the real animation, so a settled leg
 * is two turns away; crossing a macrotask boundary drains the whole chain, and
 * the trailing `nextTick()` flushes the render the finish scheduled.
 */
const settleLegs = async () => {
	await new Promise<void>((resolve) => setTimeout(resolve, 0));
	await nextTick();
};

// No "advance the chain by one turn" helper, and none is needed. Vue's update
// flush and the stub's finish callback share ONE microtask chain, so by the time
// `setProps()` resolves the leading dummy has already handed over to the sampled
// leg — index 1 for a fresh one — and only that leg's own finish is still
// pending. A mid-flight assertion therefore costs no extra turn; a settled one
// costs `settleLegs()`.

function animationAt(index: number): FakeAnimation {
	const animation = FakeAnimation.instances[index];
	if (!animation) throw new Error(`no animation recorded at index ${index}`);
	return animation;
}

/** The keyframe list the nth recorded animation was constructed with. */
function keyframesOf(index: number): Keyframe[] {
	return animationAt(index).keyframes as Keyframe[];
}

/** The most recent animation created on `target` — the pair suite's way of
 * telling a scrim's leg from a panel's. */
function latestAnimationOn(target: Element): FakeAnimation {
	const found = FakeAnimation.instances.filter((animation) => animation.target === target).at(-1);
	if (!found) throw new Error("no animation recorded on that element");
	return found;
}

type ProbeParams = PresetParams | ((entering: boolean) => PresetParams);

/**
 * The single-node call-site shape. The presence readouts live on a host element
 * that is ALWAYS rendered, so `state` and `mounted` stay observable across the
 * close — including the reset that lands after the subtree has gone.
 *
 * `params` is handed to `register` as a FACTORY that reads the prop live. That
 * is the shape every ported component uses (the law's worked examples), and it
 * is what replaces React's "register re-runs on every render": `setup` runs
 * once here, so a captured value would freeze at its first-render reading.
 */
const Probe = defineComponent({
	name: "Probe",
	props: {
		open: { type: Boolean, required: true },
		transition: { type: Function as PropType<TransitionFn<PresetParams>>, default: undefined },
		params: { type: [Object, Function] as PropType<ProbeParams>, default: undefined },
		appear: { type: Boolean, default: false },
		inert: { type: Boolean, default: true },
		onEnterStart: { type: Function as PropType<() => void>, default: undefined },
		onEnterEnd: { type: Function as PropType<() => void>, default: undefined },
		onExitStart: { type: Function as PropType<() => void>, default: undefined },
		onExitEnd: { type: Function as PropType<() => void>, default: undefined },
	},
	setup(props) {
		const presence = usePresence(() => props.open, {
			appear: props.appear,
			// A getter, so the opt-out is read at the instant an exit starts.
			get inert() {
				return props.inert;
			},
			onEnterStart: () => props.onEnterStart?.(),
			onEnterEnd: () => props.onEnterEnd?.(),
			onExitStart: () => props.onExitStart?.(),
			onExitEnd: () => props.onExitEnd?.(),
		});

		// Built ONCE in setup: stable identity, and the leg survives every patch.
		const nodeRef = composeRefs(
			presence.register(props.transition ?? FADE, (entering: boolean) => {
				const value = props.params;
				return typeof value === "function" ? value(entering) : (value ?? {});
			})
		);

		return () =>
			h(
				"div",
				{
					"data-testid": "host",
					"data-state": presence.state,
					"data-surface": presence.surfaceState,
					"data-entering": String(presence.entering),
					"data-mounted": String(presence.mounted),
				},
				presence.mounted ? [h("div", { "data-testid": "node", ref: nodeRef }, "content")] : []
			);
	},
});

/** Two elements on ONE clock — a dialog's scrim and panel. */
const PairProbe = defineComponent({
	name: "PairProbe",
	props: { open: { type: Boolean, required: true } },
	setup(props) {
		const presence = usePresence(() => props.open);
		const scrimRef = composeRefs(presence.register("scrim", FADE, { duration: 100 }));
		const panelRef = composeRefs(presence.register("panel", FADE, { duration: 100 }));

		return () =>
			presence.mounted
				? [
						h("div", { "data-testid": "scrim", ref: scrimRef }),
						h("div", { "data-testid": "panel", ref: panelRef }),
					]
				: null;
	},
});

/** `wrapper.element` IS the probe's single root, so the host is read directly
 * and only the conditionally rendered node is searched for. */
function queries(root: Element) {
	return {
		host: () => root as HTMLElement,
		node: () => root.querySelector<HTMLElement>('[data-testid="node"]'),
	};
}

describe("usePresence — mounting and unmounting through the WAAPI stub (non-zero duration)", () => {
	it("mounts on open and unmounts on close, driven by Element.prototype.animate", async () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		const wrapper = mount(Probe, { props: { open: false } });
		const { node } = queries(wrapper.element);
		expect(node()).toBeNull();

		await wrapper.setProps({ open: true });
		expect(node()).not.toBeNull();
		await settleLegs();
		expect(node()).not.toBeNull();

		await wrapper.setProps({ open: false });
		await settleLegs();
		expect(node()).toBeNull();

		// Without test-setup.ts's stub this whole test would have thrown
		// synchronously on the first `element.animate()` call instead of getting
		// this far — reaching here already proves the stub worked, and this
		// asserts it was the actual mechanism, not a side effect of something else.
		expect(animateSpy).toHaveBeenCalled();
	});

	it("rapid open toggles do not throw and settle at the final state", async () => {
		const wrapper = mount(Probe, { props: { open: false } });
		const { node } = queries(wrapper.element);

		await wrapper.setProps({ open: true });
		await wrapper.setProps({ open: false });
		await wrapper.setProps({ open: true });
		await wrapper.setProps({ open: false });

		await settleLegs();
		expect(node()).toBeNull();
	});

	it("aborts an entrance the moment it lands, so the element drops back to its resting style", async () => {
		const wrapper = mount(Probe, { props: { open: false } });

		// [0] is the leading dummy, [1] the sampled entrance — spy on it before
		// its own finish resolves.
		await wrapper.setProps({ open: true });
		const cancel = vi.spyOn(animationAt(1), "cancel");

		await settleLegs();
		// `fill: forwards` is what would otherwise pin the element at the last
		// sampled frame instead of its real resting style.
		expect(cancel).toHaveBeenCalledTimes(1);
	});
});

describe("usePresence — reduced motion (duration 0, the synchronous fast path)", () => {
	const params: PresetParams = { duration: 0 };

	it("never calls Element.prototype.animate, and both legs finish inside one flush", async () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		const wrapper = mount(Probe, { props: { open: false, params } });
		const { node } = queries(wrapper.element);

		// One flush and no more: a zero-duration leg lands inside the same
		// post-flush pass that started it, before paint.
		await wrapper.setProps({ open: true });
		expect(node()).not.toBeNull();

		await wrapper.setProps({ open: false });
		expect(node()).toBeNull();

		expect(animateSpy).not.toHaveBeenCalled();
	});

	it("open=true renders with data-state=open", async () => {
		const wrapper = mount(Probe, { props: { open: false, params } });
		const { host, node } = queries(wrapper.element);

		await wrapper.setProps({ open: true });
		expect(node()).not.toBeNull();
		expect(host().dataset.state).toBe("open");
	});

	it("open=false renders nothing at all", () => {
		const wrapper = mount(Probe, { props: { open: false, params } });
		expect(queries(wrapper.element).node()).toBeNull();
	});

	it("toggling open fires onEnterEnd then onExitEnd, in that order", async () => {
		const calls: string[] = [];
		const onEnterEnd = vi.fn(() => calls.push("enter"));
		const onExitEnd = vi.fn(() => calls.push("exit"));
		const wrapper = mount(Probe, { props: { open: false, params, onEnterEnd, onExitEnd } });
		const { node } = queries(wrapper.element);

		await wrapper.setProps({ open: true });
		expect(node()).not.toBeNull();
		expect(onEnterEnd).toHaveBeenCalledTimes(1);

		await wrapper.setProps({ open: false });
		expect(node()).toBeNull();
		expect(onExitEnd).toHaveBeenCalledTimes(1);
		expect(calls).toEqual(["enter", "exit"]);
	});

	it("rapid open toggles do not throw and settle at the final state", async () => {
		const wrapper = mount(Probe, { props: { open: false, params } });
		const { node } = queries(wrapper.element);

		await wrapper.setProps({ open: true });
		await wrapper.setProps({ open: false });
		await wrapper.setProps({ open: true });
		await wrapper.setProps({ open: false });

		expect(node()).toBeNull();
	});
});

describe("usePresence — mounted stays true for the whole exit", () => {
	it("keeps the subtree rendered until the exit settles", async () => {
		const wrapper = mount(Probe, { props: { open: false } });
		const { host, node } = queries(wrapper.element);

		await wrapper.setProps({ open: true });
		await settleLegs();

		await wrapper.setProps({ open: false });
		expect(host().dataset.mounted).toBe("true");
		expect(node()).not.toBeNull();

		await settleLegs();
		expect(host().dataset.mounted).toBe("false");
		expect(node()).toBeNull();
	});

	it("unmounts only when EVERY keyed exit has finished — one clock, two elements", async () => {
		const wrapper = mount(PairProbe, { props: { open: false }, attachTo: document.body });
		const scrim = () => document.body.querySelector<HTMLElement>('[data-testid="scrim"]');
		const panel = () => document.body.querySelector<HTMLElement>('[data-testid="panel"]');

		await wrapper.setProps({ open: true });
		await settleLegs();
		expect(scrim()).not.toBeNull();
		expect(panel()).not.toBeNull();

		const panelNode = panel() as HTMLElement;
		await wrapper.setProps({ open: false });

		// Freeze the panel's leg mid-flight; the scrim's is left to land.
		const panelLeg = latestAnimationOn(panelNode);
		panelLeg.cancel();
		await settleLegs();

		// The scrim finished, but the group has NOT: a straggler holds the mount.
		expect(scrim()).not.toBeNull();
		expect(panel()).not.toBeNull();

		panelLeg.onfinish?.();
		await settleLegs();
		expect(scrim()).toBeNull();
		expect(panel()).toBeNull();

		// The only `attachTo` in the file, so it is also the only one that has to
		// put `document.body` back.
		wrapper.unmount();
	});
});

describe("usePresence — state, the three-value vocabulary", () => {
	it("sequences opening → open → closing", async () => {
		const wrapper = mount(Probe, { props: { open: false } });
		const { host } = queries(wrapper.element);

		await wrapper.setProps({ open: true });
		expect(host().dataset.state).toBe("opening");

		await settleLegs();
		expect(host().dataset.state).toBe("open");

		await wrapper.setProps({ open: false });
		expect(host().dataset.state).toBe("closing");

		await settleLegs();
	});

	it("resets to open once the close settles, so the next open never carries a stale closing", async () => {
		const wrapper = mount(Probe, { props: { open: false } });
		const { host } = queries(wrapper.element);

		await wrapper.setProps({ open: true });
		await settleLegs();
		await wrapper.setProps({ open: false });
		await settleLegs();

		expect(host().dataset.mounted).toBe("false");
		expect(host().dataset.state).toBe("open");
	});

	it("surfaceState never yields opening — the two vocabularies are not interchangeable", async () => {
		const wrapper = mount(Probe, { props: { open: false } });
		const { host } = queries(wrapper.element);

		await wrapper.setProps({ open: true });
		expect(host().dataset.state).toBe("opening");
		expect(host().dataset.surface).toBe("open");

		await settleLegs();
		expect(host().dataset.surface).toBe("open");

		await wrapper.setProps({ open: false });
		expect(host().dataset.surface).toBe("closing");

		await settleLegs();
	});

	it("entering mirrors open, and flips the instant the close is requested", async () => {
		const wrapper = mount(Probe, { props: { open: false } });
		const { host } = queries(wrapper.element);
		expect(host().dataset.entering).toBe("false");

		await wrapper.setProps({ open: true });
		await settleLegs();
		expect(host().dataset.entering).toBe("true");

		await wrapper.setProps({ open: false });
		expect(host().dataset.entering).toBe("false");
		expect(host().dataset.mounted).toBe("true");

		await settleLegs();
	});
});

describe("usePresence — appear, the initial-render rule", () => {
	it("with appear unset, an already-open mount calls animate() zero times", async () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		const wrapper = mount(Probe, { props: { open: true } });
		const { host, node } = queries(wrapper.element);

		await nextTick();
		expect(node()).not.toBeNull();
		expect(host().dataset.state).toBe("open");
		expect(animateSpy).not.toHaveBeenCalled();
	});

	it("fires no enter callback on that initial mount either", async () => {
		const onEnterStart = vi.fn();
		const onEnterEnd = vi.fn();
		mount(Probe, { props: { open: true, onEnterStart, onEnterEnd } });

		// Give any stray microtask a turn — if an intro HAD played, its callbacks
		// would already be scheduled by now.
		await settleLegs();
		expect(onEnterStart).not.toHaveBeenCalled();
		expect(onEnterEnd).not.toHaveBeenCalled();
	});

	it("appear animates that same mount instead", async () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		const onEnterStart = vi.fn();
		const onEnterEnd = vi.fn();
		const wrapper = mount(Probe, {
			props: { open: true, appear: true, onEnterStart, onEnterEnd },
		});
		const { host } = queries(wrapper.element);

		await nextTick();
		expect(host().dataset.state).toBe("opening");
		expect(onEnterStart).toHaveBeenCalledTimes(1);
		expect(animateSpy).toHaveBeenCalled();

		await settleLegs();
		expect(host().dataset.state).toBe("open");
		expect(onEnterEnd).toHaveBeenCalledTimes(1);
	});

	it("does not consume the rule on a later open — a close then reopen still animates", async () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		const wrapper = mount(Probe, { props: { open: true } });
		const { host } = queries(wrapper.element);

		await wrapper.setProps({ open: false });
		await settleLegs();
		await wrapper.setProps({ open: true });

		expect(host().dataset.state).toBe("opening");
		expect(animateSpy).toHaveBeenCalled();
		await settleLegs();
	});
});

describe("usePresence — reversal from an in-flight position", () => {
	// An explicit linear easing, so the sampled position a reversal starts from
	// is readable rather than a point on an exponential curve.
	const params: PresetParams = { duration: 100, easing: linear };

	it("reopening mid-exit resumes from the current position and never unmounts the node", async () => {
		const wrapper = mount(Probe, { props: { open: false, params } });
		const { node } = queries(wrapper.element);

		await wrapper.setProps({ open: true });
		await settleLegs();
		const opened = node();
		expect(opened).not.toBeNull();

		FakeAnimation.instances.length = 0;
		await wrapper.setProps({ open: false });

		// [0] is the exit's leading dummy, [1] the sampled exit itself. Freeze it
		// halfway: cancel() suppresses the stub's finish, currentTime places it.
		const exitLeg = animationAt(1);
		exitLeg.cancel();
		exitLeg.currentTime = 50;

		await wrapper.setProps({ open: true });
		expect(node()).toBe(opened);

		await settleLegs();
		expect(node()).toBe(opened);

		// [2] is the reversal's dummy, [3] its sampled keyframes: they start at
		// the position the exit actually reached, not back at the far end.
		expect(keyframesOf(3).at(0)).toEqual({ opacity: "0.5" });
		expect(keyframesOf(3).at(-1)).toEqual({ opacity: "1" });
		// Half the delta left to travel ⇒ half the duration.
		expect(animationAt(3).options).toEqual({ duration: 50, fill: "forwards" });
	});

	it("announces the reversal, so a focus trap gets its rearm", async () => {
		const onEnterStart = vi.fn();
		const onExitEnd = vi.fn();
		const wrapper = mount(Probe, { props: { open: false, params, onEnterStart, onExitEnd } });
		const { host } = queries(wrapper.element);

		await wrapper.setProps({ open: true });
		await settleLegs();
		expect(onEnterStart).toHaveBeenCalledTimes(1);

		FakeAnimation.instances.length = 0;
		await wrapper.setProps({ open: false });
		animationAt(1).cancel();

		await wrapper.setProps({ open: true });
		expect(onEnterStart).toHaveBeenCalledTimes(2);
		expect(host().dataset.state).toBe("opening");
		expect(host().dataset.mounted).toBe("true");

		await settleLegs();
		// The exit was superseded, so it must never report as finished.
		expect(onExitEnd).not.toHaveBeenCalled();
	});
});

describe("usePresence — inert", () => {
	it("sets inert on exit and clears it on re-enter", async () => {
		const wrapper = mount(Probe, { props: { open: false } });
		const { node } = queries(wrapper.element);

		await wrapper.setProps({ open: true });
		await settleLegs();
		const element = node() as HTMLElement;
		expect(element.hasAttribute("inert")).toBe(false);

		FakeAnimation.instances.length = 0;
		await wrapper.setProps({ open: false });
		expect(element.hasAttribute("inert")).toBe(true);

		// Freeze the sampled exit so the reopen is a genuine REVERSAL. React's
		// synchronous rerender left no window for the leg to land in; here the
		// two flushes are separate microtask turns, and an unfrozen leg would
		// settle between them — unmounting the node and making the next line
		// assert against a fresh element rather than the one that was closing.
		animationAt(1).cancel();

		await wrapper.setProps({ open: true });
		expect(element.hasAttribute("inert")).toBe(false);
		await settleLegs();
	});

	it("inert: false never touches the attribute — the explicit opt-out", async () => {
		const wrapper = mount(Probe, { props: { open: false, inert: false } });
		const { node } = queries(wrapper.element);

		await wrapper.setProps({ open: true });
		await settleLegs();
		const element = node() as HTMLElement;

		await wrapper.setProps({ open: false });
		expect(element.hasAttribute("inert")).toBe(false);
		await settleLegs();
	});
});

describe("usePresence — the four lifecycle callbacks", () => {
	it("fires them in order across a full open/close cycle", async () => {
		const calls: string[] = [];
		const props = {
			onEnterStart: () => calls.push("enter-start"),
			onEnterEnd: () => calls.push("enter-end"),
			onExitStart: () => calls.push("exit-start"),
			onExitEnd: () => calls.push("exit-end"),
		};
		const wrapper = mount(Probe, { props: { open: false, ...props } });

		await wrapper.setProps({ open: true });
		await settleLegs();
		await wrapper.setProps({ open: false });
		await settleLegs();

		expect(calls).toEqual(["enter-start", "enter-end", "exit-start", "exit-end"]);
	});

	it("onExitStart fires at the dismiss instant, before the exit paints", async () => {
		const onExitStart = vi.fn();
		const wrapper = mount(Probe, { props: { open: false, onExitStart } });
		const { node } = queries(wrapper.element);

		await wrapper.setProps({ open: true });
		await settleLegs();
		expect(onExitStart).not.toHaveBeenCalled();

		// One flush and no more: the post-flush driver has already run by the time
		// `setProps` resolves, and the node is still on screen.
		await wrapper.setProps({ open: false });
		expect(onExitStart).toHaveBeenCalledTimes(1);
		expect(node()).not.toBeNull();

		await settleLegs();
	});

	it("always calls the latest handler, never the one captured at first render", async () => {
		const first = vi.fn();
		const second = vi.fn();
		const wrapper = mount(Probe, { props: { open: false, onEnterEnd: first } });

		await wrapper.setProps({ open: true, onEnterEnd: second });
		await settleLegs();

		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledTimes(1);
	});

	it("does not fire onExitEnd when the component is destroyed mid-exit", async () => {
		const onExitEnd = vi.fn();
		const wrapper = mount(Probe, { props: { open: false, onExitEnd } });

		await wrapper.setProps({ open: true });
		await settleLegs();
		await wrapper.setProps({ open: false });

		wrapper.unmount();
		await settleLegs();
		expect(onExitEnd).not.toHaveBeenCalled();
	});
});

describe("usePresence — params and direction, resolved at leg start", () => {
	it("calls a params factory at the instant a leg starts, never at render time", async () => {
		const params = vi.fn((entering: boolean) => ({ duration: entering ? 100 : 50 }));
		const wrapper = mount(Probe, { props: { open: false, params } });
		expect(params).not.toHaveBeenCalled();

		await wrapper.setProps({ open: true });
		expect(params).toHaveBeenCalledTimes(1);
		expect(params).toHaveBeenLastCalledWith(true);

		await settleLegs();
		expect(params).toHaveBeenCalledTimes(1);

		await wrapper.setProps({ open: false });
		expect(params).toHaveBeenCalledTimes(2);
		expect(params).toHaveBeenLastCalledWith(false);
		await settleLegs();
	});

	it("passes a real in/out direction, never the ambiguous 'both' a single directive reports", async () => {
		const directions: Array<string | undefined> = [];
		const specs: TransitionSpec[] = [];
		const transition: TransitionFn<PresetParams> = (node, params, options) => {
			directions.push(options?.direction);
			const spec = FADE(node, params, options);
			specs.push(spec);
			return spec;
		};
		const wrapper = mount(Probe, { props: { open: false, transition } });

		await wrapper.setProps({ open: true });
		await settleLegs();
		await wrapper.setProps({ open: false });
		await settleLegs();

		expect(directions).toEqual(["in", "out"]);
		// The point of passing it: the preset's own direction-dependent easing
		// default resolves to an arrival curve entering and a departure one leaving.
		expect(specs[0]?.easing).toBe(JS_EASINGS.out);
		expect(specs[1]?.easing).toBe(JS_EASINGS.in);
	});

	it("reads the LATEST params, not the ones the factory saw at mount", async () => {
		const wrapper = mount(Probe, { props: { open: false, params: { duration: 100 } } });
		const { node } = queries(wrapper.element);

		await wrapper.setProps({ open: true });
		await settleLegs();
		expect(node()).not.toBeNull();

		// The factory reads `props.params` at leg start, so the exit takes the
		// synchronous fast path rather than the 100 ms the mount registered.
		await wrapper.setProps({ params: { duration: 0 } });
		await wrapper.setProps({ open: false });
		expect(node()).toBeNull();
	});
});

describe("usePresence — register identity", () => {
	it("hands back the same function ref for a key, so Vue never reattaches the node", () => {
		const refs = new Set<unknown>();

		const IdentityProbe = defineComponent({
			name: "IdentityProbe",
			props: { open: { type: Boolean, default: false } },
			setup(props) {
				const presence = usePresence(() => props.open);
				refs.add(presence.register(FADE, { duration: 0 }));
				refs.add(presence.register(FADE, { duration: 0 }));
				refs.add(presence.register(FADE, { duration: 0 }));
				return () => null;
			},
		});

		mount(IdentityProbe);
		expect(refs.size).toBe(1);
	});

	it("gives each key its own ref callback", () => {
		const refs: unknown[] = [];

		const KeyedProbe = defineComponent({
			name: "KeyedProbe",
			setup() {
				const presence = usePresence(() => false);
				refs.push(
					presence.register("scrim", FADE),
					presence.register("panel", FADE),
					presence.register("scrim", FADE),
					presence.register("panel", FADE)
				);
				return () => null;
			},
		});

		mount(KeyedProbe);

		expect(refs[0]).not.toBe(refs[1]);
		expect(refs[0]).toBe(refs[2]);
		expect(refs[1]).toBe(refs[3]);
	});
});

describe("usePresence — the reactive handle", () => {
	it("unwraps to plain values, so a template never reads a Ref", async () => {
		let handle: PresenceHandle | undefined;

		const HandleProbe = defineComponent({
			name: "HandleProbe",
			props: { open: { type: Boolean, required: true } },
			setup(props) {
				handle = usePresence(() => props.open);
				return () => null;
			},
		});

		const wrapper = mount(HandleProbe, { props: { open: false } });
		expect(typeof handle?.mounted).toBe("boolean");
		expect(typeof handle?.state).toBe("string");
		expect(typeof handle?.surfaceState).toBe("string");
		expect(typeof handle?.entering).toBe("boolean");

		await wrapper.setProps({ open: true });
		expect(handle?.mounted).toBe(true);
		expect(handle?.entering).toBe(true);
	});

	it("renders the readouts as strings, not as [object Object]", async () => {
		const wrapper = mount(Probe, { props: { open: false } });
		const { host } = queries(wrapper.element);

		expect(host().dataset.mounted).toBe("false");
		await wrapper.setProps({ open: true });
		expect(host().dataset.mounted).toBe("true");
		await settleLegs();
	});
});

// Vue has no double-invoke, so React's StrictMode suite has no counterpart. The
// same coverage is bought with the mount / unmount / mount / unmount cycle the
// contract asks every hook module for: nothing left in flight, `mounted` back at
// false and `state` back at "open".
describe("usePresence — leaks across a mount / unmount / mount / unmount cycle", () => {
	it("a mid-exit unmount stops the chain dead and fires no exit callback", async () => {
		const onExitEnd = vi.fn();
		const wrapper = mount(Probe, { props: { open: false, onExitEnd } });

		await wrapper.setProps({ open: true });
		await settleLegs();
		await wrapper.setProps({ open: false });

		wrapper.unmount();
		const created = FakeAnimation.instances.length;
		await settleLegs();

		expect(FakeAnimation.instances.length).toBe(created);
		expect(onExitEnd).not.toHaveBeenCalled();
	});

	it("comes back to rest after a full cycle, twice over", async () => {
		for (let pass = 0; pass < 2; pass += 1) {
			const wrapper = mount(Probe, { props: { open: false } });
			const { host, node } = queries(wrapper.element);

			await wrapper.setProps({ open: true });
			await settleLegs();
			expect(node()).not.toBeNull();

			await wrapper.setProps({ open: false });
			await settleLegs();

			expect(node()).toBeNull();
			expect(host().dataset.mounted).toBe("false");
			expect(host().dataset.state).toBe("open");

			wrapper.unmount();
		}
	});

	it("a remount is a fresh mount: the appear rule holds again", async () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		mount(Probe, { props: { open: true } }).unmount();

		const wrapper = mount(Probe, { props: { open: true } });
		const { host, node } = queries(wrapper.element);

		await settleLegs();
		expect(node()).not.toBeNull();
		expect(host().dataset.state).toBe("open");
		expect(animateSpy).not.toHaveBeenCalled();
	});
});
