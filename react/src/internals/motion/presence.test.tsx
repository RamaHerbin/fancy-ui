import { act, render } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePresence, type UsePresenceOptions } from "./presence.js";
import {
	preset,
	type PresetParams,
	type TransitionFn,
	type TransitionSpec,
} from "./transitions.js";
import { JS_EASINGS } from "./tokens.js";
import { linear } from "./easing.js";
import { FakeAnimation } from "../../test-setup.js";

// Shape 4 (hook / component): an inline `<Probe open>` replaces the two
// `.test.svelte` rigs the source suite needed — one for a conditionally
// mounted node carrying a transition, one for the three-value `data-state`
// wiring — and the assertions come from both, plus the React-layer additions
// the internals contract lists for this module. The `Element.prototype.animate`
// stub in `test-setup.ts` is what makes any of it runnable under jsdom, and
// `FakeAnimation.instances` is what lets a reversal be checked against the
// actual sampled keyframes rather than against a timer.

/**
 * jsdom (verified: `"inert" in HTMLElement.prototype === false` in this repo's
 * pinned version) has no `inert` IDL property at all — setting `el.inert = true`
 * creates a plain expando with no attribute reflection, so a test that only
 * reads `el.inert` back can pass even if the real browser behaviour (an `inert`
 * ATTRIBUTE, which is what `:not([inert])` selectors and assistive tech key on)
 * was never touched. This shim makes the property reflect to the attribute,
 * matching every real browser, so a test reading `hasAttribute("inert")`
 * observes the same thing production code produces. Guarded so it is a no-op
 * the moment jsdom ships the real property.
 */
if (!("inert" in HTMLElement.prototype)) {
	Object.defineProperty(HTMLElement.prototype, "inert", {
		configurable: true,
		get(this: HTMLElement) {
			return this.hasAttribute("inert");
		},
		set(this: HTMLElement, value: boolean) {
			if (value) this.setAttribute("inert", "");
			else this.removeAttribute("inert");
		},
	});
}

afterEach(() => {
	// Every test that spies on Element.prototype.animate needs a FRESH spy with
	// an empty call history — vi.spyOn on an already-mocked property reuses the
	// existing mock rather than layering a new one, so without this a later
	// test's `expect(animateSpy).not.toHaveBeenCalled()` would see an earlier
	// test's calls too.
	vi.restoreAllMocks();
});

/** One stable transition instance, so `register` is handed the same function on
 * every render exactly as a real port's module-scope factory would be. */
const FADE = preset("fade");

/**
 * Drains a leg to completion. The stub finishes each animation on a MICROTASK
 * and `runTransition` chains a dummy into the real animation, so a settled leg
 * is two turns away; `act` crosses a macrotask boundary (draining both) and
 * flushes the React updates the finish schedules.
 */
const settleLegs = () => act(async () => {});

/**
 * Advances the chain by exactly ONE turn, leaving the main animation created
 * and running. Deliberately NOT `act`: nothing here updates React state (the
 * dummy's `onfinish` only builds the real animation), and `act` would drain the
 * second turn too, which is the one a mid-flight assertion needs to survive.
 */
const nextLeg = () => Promise.resolve();

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

interface ProbeProps extends UsePresenceOptions {
	open: boolean;
	transition?: TransitionFn<PresetParams>;
	params?: PresetParams | ((entering: boolean) => PresetParams);
}

/**
 * The single-node call-site shape. The presence readouts live on a host element
 * that is ALWAYS rendered, so `state` and `mounted` stay observable across the
 * close — including the reset that lands after the subtree has gone.
 */
function Probe({ open, transition = FADE, params, ...options }: ProbeProps) {
	const presence = usePresence(open, options);
	const ref = presence.register(transition, params);

	return (
		<div
			data-testid="host"
			data-state={presence.state}
			data-surface={presence.surfaceState}
			data-entering={String(presence.entering)}
			data-mounted={String(presence.mounted)}
		>
			{presence.mounted ? (
				<div data-testid="node" ref={ref}>
					content
				</div>
			) : null}
		</div>
	);
}

/** Two elements on ONE clock — a dialog's scrim and panel. */
function PairProbe({ open, ...options }: { open: boolean } & UsePresenceOptions) {
	const presence = usePresence(open, options);
	const scrimRef = presence.register("scrim", FADE, { duration: 100 });
	const panelRef = presence.register("panel", FADE, { duration: 100 });

	if (!presence.mounted) return null;

	return (
		<>
			<div data-testid="scrim" ref={scrimRef} />
			<div data-testid="panel" ref={panelRef} />
		</>
	);
}

function queries(container: HTMLElement) {
	return {
		host: () => container.querySelector<HTMLElement>('[data-testid="host"]') as HTMLElement,
		node: () => container.querySelector<HTMLElement>('[data-testid="node"]'),
	};
}

describe("usePresence — mounting and unmounting through the WAAPI stub (non-zero duration)", () => {
	it("mounts on open and unmounts on close, driven by Element.prototype.animate", async () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		const { container, rerender } = render(<Probe open={false} />);
		const { node } = queries(container);
		expect(node()).toBeNull();

		rerender(<Probe open />);
		expect(node()).not.toBeNull();
		await settleLegs();
		expect(node()).not.toBeNull();

		rerender(<Probe open={false} />);
		await settleLegs();
		expect(node()).toBeNull();

		// Without test-setup.ts's stub this whole test would have thrown
		// synchronously on the first `element.animate()` call instead of getting
		// this far — reaching here already proves the stub worked, and this
		// asserts it was the actual mechanism, not a side effect of something else.
		expect(animateSpy).toHaveBeenCalled();
	});

	it("rapid open toggles do not throw and settle at the final state", async () => {
		const { container, rerender } = render(<Probe open={false} />);
		const { node } = queries(container);

		rerender(<Probe open />);
		rerender(<Probe open={false} />);
		rerender(<Probe open />);
		rerender(<Probe open={false} />);

		await settleLegs();
		expect(node()).toBeNull();
	});

	it("aborts an entrance the moment it lands, so the element drops back to its resting style", async () => {
		const { rerender } = render(<Probe open={false} />);

		rerender(<Probe open />);
		// [0] is the leading dummy, [1] the sampled entrance — spy on it before
		// its own finish resolves.
		await nextLeg();
		const cancel = vi.spyOn(animationAt(1), "cancel");

		await settleLegs();
		// `fill: forwards` is what would otherwise pin the element at the last
		// sampled frame instead of its real resting style.
		expect(cancel).toHaveBeenCalledTimes(1);
	});
});

describe("usePresence — reduced motion (duration 0, the synchronous fast path)", () => {
	const params: PresetParams = { duration: 0 };

	it("never calls Element.prototype.animate, and both legs finish synchronously", () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		const { container, rerender } = render(<Probe open={false} params={params} />);
		const { node } = queries(container);

		// No await anywhere: a zero-duration leg lands inside the same layout
		// effect that started it, before paint.
		rerender(<Probe open params={params} />);
		expect(node()).not.toBeNull();

		rerender(<Probe open={false} params={params} />);
		expect(node()).toBeNull();

		expect(animateSpy).not.toHaveBeenCalled();
	});

	it("open=true renders with data-state=open", () => {
		const { container, rerender } = render(<Probe open={false} params={params} />);
		const { host, node } = queries(container);

		rerender(<Probe open params={params} />);
		expect(node()).not.toBeNull();
		expect(host().dataset.state).toBe("open");
	});

	it("open=false renders nothing at all", () => {
		const { container } = render(<Probe open={false} params={params} />);
		expect(queries(container).node()).toBeNull();
	});

	it("toggling open fires onEnterEnd then onExitEnd, in that order", () => {
		const calls: string[] = [];
		const onEnterEnd = vi.fn(() => calls.push("enter"));
		const onExitEnd = vi.fn(() => calls.push("exit"));
		const { container, rerender } = render(
			<Probe open={false} params={params} onEnterEnd={onEnterEnd} onExitEnd={onExitEnd} />
		);
		const { node } = queries(container);

		rerender(<Probe open params={params} onEnterEnd={onEnterEnd} onExitEnd={onExitEnd} />);
		expect(node()).not.toBeNull();
		expect(onEnterEnd).toHaveBeenCalledTimes(1);

		rerender(<Probe open={false} params={params} onEnterEnd={onEnterEnd} onExitEnd={onExitEnd} />);
		expect(node()).toBeNull();
		expect(onExitEnd).toHaveBeenCalledTimes(1);
		expect(calls).toEqual(["enter", "exit"]);
	});

	it("rapid open toggles do not throw and settle at the final state", () => {
		const { container, rerender } = render(<Probe open={false} params={params} />);
		const { node } = queries(container);

		rerender(<Probe open params={params} />);
		rerender(<Probe open={false} params={params} />);
		rerender(<Probe open params={params} />);
		rerender(<Probe open={false} params={params} />);

		expect(node()).toBeNull();
	});
});

describe("usePresence — mounted stays true for the whole exit", () => {
	it("keeps the subtree rendered until the exit settles", async () => {
		const { container, rerender } = render(<Probe open={false} />);
		const { host, node } = queries(container);

		rerender(<Probe open />);
		await settleLegs();

		rerender(<Probe open={false} />);
		expect(host().dataset.mounted).toBe("true");
		expect(node()).not.toBeNull();

		await settleLegs();
		expect(host().dataset.mounted).toBe("false");
		expect(node()).toBeNull();
	});

	it("unmounts only when EVERY keyed exit has finished — one clock, two elements", async () => {
		const { container, rerender } = render(<PairProbe open={false} />);
		const scrim = () => container.querySelector<HTMLElement>('[data-testid="scrim"]');
		const panel = () => container.querySelector<HTMLElement>('[data-testid="panel"]');

		rerender(<PairProbe open />);
		await settleLegs();
		expect(scrim()).not.toBeNull();
		expect(panel()).not.toBeNull();

		const panelNode = panel() as HTMLElement;
		rerender(<PairProbe open={false} />);
		await nextLeg();

		// Freeze the panel's leg mid-flight; the scrim's is left to land.
		const panelLeg = latestAnimationOn(panelNode);
		panelLeg.cancel();
		await settleLegs();

		// The scrim finished, but the group has NOT: a straggler holds the mount.
		expect(scrim()).not.toBeNull();
		expect(panel()).not.toBeNull();

		await act(async () => {
			panelLeg.onfinish?.();
		});
		expect(scrim()).toBeNull();
		expect(panel()).toBeNull();
	});
});

describe("usePresence — state, the three-value vocabulary", () => {
	it("sequences opening → open → closing", async () => {
		const { container, rerender } = render(<Probe open={false} />);
		const { host } = queries(container);

		rerender(<Probe open />);
		expect(host().dataset.state).toBe("opening");

		await settleLegs();
		expect(host().dataset.state).toBe("open");

		rerender(<Probe open={false} />);
		expect(host().dataset.state).toBe("closing");

		await settleLegs();
	});

	it("resets to open once the close settles, so the next open never carries a stale closing", async () => {
		const { container, rerender } = render(<Probe open={false} />);
		const { host } = queries(container);

		rerender(<Probe open />);
		await settleLegs();
		rerender(<Probe open={false} />);
		await settleLegs();

		expect(host().dataset.mounted).toBe("false");
		expect(host().dataset.state).toBe("open");
	});

	it("surfaceState never yields opening — the two vocabularies are not interchangeable", async () => {
		const { container, rerender } = render(<Probe open={false} />);
		const { host } = queries(container);

		rerender(<Probe open />);
		expect(host().dataset.state).toBe("opening");
		expect(host().dataset.surface).toBe("open");

		await settleLegs();
		expect(host().dataset.surface).toBe("open");

		rerender(<Probe open={false} />);
		expect(host().dataset.surface).toBe("closing");

		await settleLegs();
	});

	it("entering mirrors open, and flips the instant the close is requested", async () => {
		const { container, rerender } = render(<Probe open={false} />);
		const { host } = queries(container);
		expect(host().dataset.entering).toBe("false");

		rerender(<Probe open />);
		await settleLegs();
		expect(host().dataset.entering).toBe("true");

		rerender(<Probe open={false} />);
		expect(host().dataset.entering).toBe("false");
		expect(host().dataset.mounted).toBe("true");

		await settleLegs();
	});
});

describe("usePresence — appear, the initial-render rule", () => {
	it("with appear unset, an already-open mount calls animate() zero times", () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		const { container } = render(<Probe open />);
		const { host, node } = queries(container);

		expect(node()).not.toBeNull();
		expect(host().dataset.state).toBe("open");
		expect(animateSpy).not.toHaveBeenCalled();
	});

	it("fires no enter callback on that initial mount either", async () => {
		const onEnterStart = vi.fn();
		const onEnterEnd = vi.fn();
		render(<Probe open onEnterStart={onEnterStart} onEnterEnd={onEnterEnd} />);

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
		const { container } = render(
			<Probe open appear onEnterStart={onEnterStart} onEnterEnd={onEnterEnd} />
		);
		const { host } = queries(container);

		expect(host().dataset.state).toBe("opening");
		expect(onEnterStart).toHaveBeenCalledTimes(1);
		expect(animateSpy).toHaveBeenCalled();

		await settleLegs();
		expect(host().dataset.state).toBe("open");
		expect(onEnterEnd).toHaveBeenCalledTimes(1);
	});

	it("does not consume the rule on a later open — a close then reopen still animates", async () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		const { container, rerender } = render(<Probe open />);
		const { host } = queries(container);

		rerender(<Probe open={false} />);
		await settleLegs();
		rerender(<Probe open />);

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
		const { container, rerender } = render(<Probe open={false} params={params} />);
		const { node } = queries(container);

		rerender(<Probe open params={params} />);
		await settleLegs();
		const opened = node();
		expect(opened).not.toBeNull();

		FakeAnimation.instances.length = 0;
		rerender(<Probe open={false} params={params} />);
		await nextLeg();

		// [0] is the exit's leading dummy, [1] the sampled exit itself. Freeze it
		// halfway: cancel() suppresses the stub's finish, currentTime places it.
		const exitLeg = animationAt(1);
		exitLeg.cancel();
		exitLeg.currentTime = 50;

		rerender(<Probe open params={params} />);
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
		const props = { params, onEnterStart, onExitEnd };
		const { container, rerender } = render(<Probe open={false} {...props} />);
		const { host } = queries(container);

		rerender(<Probe open {...props} />);
		await settleLegs();
		expect(onEnterStart).toHaveBeenCalledTimes(1);

		rerender(<Probe open={false} {...props} />);
		await nextLeg();
		animationAt(1).cancel();

		rerender(<Probe open {...props} />);
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
		const { container, rerender } = render(<Probe open={false} />);
		const { node } = queries(container);

		rerender(<Probe open />);
		await settleLegs();
		const element = node() as HTMLElement;
		expect(element.hasAttribute("inert")).toBe(false);

		rerender(<Probe open={false} />);
		expect(element.hasAttribute("inert")).toBe(true);

		rerender(<Probe open />);
		expect(element.hasAttribute("inert")).toBe(false);
		await settleLegs();
	});

	it("inert: false never touches the attribute — the explicit opt-out", async () => {
		const { container, rerender } = render(<Probe open={false} inert={false} />);
		const { node } = queries(container);

		rerender(<Probe open inert={false} />);
		await settleLegs();
		const element = node() as HTMLElement;

		rerender(<Probe open={false} inert={false} />);
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
		const { rerender } = render(<Probe open={false} {...props} />);

		rerender(<Probe open {...props} />);
		await settleLegs();
		rerender(<Probe open={false} {...props} />);
		await settleLegs();

		expect(calls).toEqual(["enter-start", "enter-end", "exit-start", "exit-end"]);
	});

	it("onExitStart fires synchronously at the dismiss instant, before the exit paints", async () => {
		const onExitStart = vi.fn();
		const { container, rerender } = render(<Probe open={false} onExitStart={onExitStart} />);
		const { node } = queries(container);

		rerender(<Probe open onExitStart={onExitStart} />);
		await settleLegs();
		expect(onExitStart).not.toHaveBeenCalled();

		// No await: the layout effect has already run by the time rerender returns.
		rerender(<Probe open={false} onExitStart={onExitStart} />);
		expect(onExitStart).toHaveBeenCalledTimes(1);
		expect(node()).not.toBeNull();

		await settleLegs();
	});

	it("always calls the latest handler, never the one captured at first render", async () => {
		const first = vi.fn();
		const second = vi.fn();
		const { rerender } = render(<Probe open={false} onEnterEnd={first} />);

		rerender(<Probe open onEnterEnd={second} />);
		await settleLegs();

		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledTimes(1);
	});

	it("does not fire onExitEnd when the component is destroyed mid-exit", async () => {
		const onExitEnd = vi.fn();
		const { rerender, unmount } = render(<Probe open={false} onExitEnd={onExitEnd} />);

		rerender(<Probe open onExitEnd={onExitEnd} />);
		await settleLegs();
		rerender(<Probe open={false} onExitEnd={onExitEnd} />);

		unmount();
		await settleLegs();
		expect(onExitEnd).not.toHaveBeenCalled();
	});
});

describe("usePresence — params and direction, resolved at leg start", () => {
	it("calls a params factory at the instant a leg starts, never at render time", async () => {
		const params = vi.fn((entering: boolean) => ({ duration: entering ? 100 : 50 }));
		const { rerender } = render(<Probe open={false} params={params} />);
		expect(params).not.toHaveBeenCalled();

		rerender(<Probe open params={params} />);
		expect(params).toHaveBeenCalledTimes(1);
		expect(params).toHaveBeenLastCalledWith(true);

		await settleLegs();
		expect(params).toHaveBeenCalledTimes(1);

		rerender(<Probe open={false} params={params} />);
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
		const { rerender } = render(<Probe open={false} transition={transition} />);

		rerender(<Probe open transition={transition} />);
		await settleLegs();
		rerender(<Probe open={false} transition={transition} />);
		await settleLegs();

		expect(directions).toEqual(["in", "out"]);
		// The point of passing it: the preset's own direction-dependent easing
		// default resolves to an arrival curve entering and a departure one leaving.
		expect(specs[0]?.easing).toBe(JS_EASINGS.out);
		expect(specs[1]?.easing).toBe(JS_EASINGS.in);
	});

	it("reads the LATEST render's params, not the ones registered at mount", async () => {
		const { container, rerender } = render(<Probe open={false} params={{ duration: 100 }} />);
		const { node } = queries(container);

		rerender(<Probe open params={{ duration: 100 }} />);
		await settleLegs();
		expect(node()).not.toBeNull();

		// Re-registered with a zero duration before the close: the exit takes the
		// synchronous fast path rather than the 100 ms the mount registered.
		rerender(<Probe open params={{ duration: 0 }} />);
		rerender(<Probe open={false} params={{ duration: 0 }} />);
		expect(node()).toBeNull();
	});
});

describe("usePresence — register identity", () => {
	it("hands back the same ref callback on every render, so React never reattaches the node", () => {
		const refs = new Set<unknown>();

		function IdentityProbe({ open }: { open: boolean }) {
			const presence = usePresence(open);
			const ref = presence.register(FADE, { duration: 0 });
			refs.add(ref);
			return presence.mounted ? (
				<div data-testid="node" ref={ref}>
					content
				</div>
			) : null;
		}

		const { rerender } = render(<IdentityProbe open={false} />);
		rerender(<IdentityProbe open />);
		rerender(<IdentityProbe open />);
		rerender(<IdentityProbe open={false} />);

		expect(refs.size).toBe(1);
	});

	it("gives each key its own ref callback", () => {
		const refs: unknown[] = [];

		function KeyedProbe() {
			const presence = usePresence(false);
			refs.push(presence.register("scrim", FADE), presence.register("panel", FADE));
			return null;
		}

		const { rerender } = render(<KeyedProbe />);
		rerender(<KeyedProbe />);

		expect(refs[0]).not.toBe(refs[1]);
		expect(refs[0]).toBe(refs[2]);
		expect(refs[1]).toBe(refs[3]);
	});
});

describe("usePresence — StrictMode", () => {
	it("opens and closes cleanly through the double-invoked effects", async () => {
		const { container, rerender } = render(
			<StrictMode>
				<Probe open={false} />
			</StrictMode>
		);
		const { node } = queries(container);

		rerender(
			<StrictMode>
				<Probe open />
			</StrictMode>
		);
		await settleLegs();
		expect(node()).not.toBeNull();

		rerender(
			<StrictMode>
				<Probe open={false} />
			</StrictMode>
		);
		await settleLegs();
		expect(node()).toBeNull();
	});

	it("still plays no intro for an already-open mount — the appear rule survives the remount", () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		const { container } = render(
			<StrictMode>
				<Probe open />
			</StrictMode>
		);
		const { host, node } = queries(container);

		expect(node()).not.toBeNull();
		expect(host().dataset.state).toBe("open");
		expect(animateSpy).not.toHaveBeenCalled();
	});

	// The three tests below exist because "the node is there after open and gone
	// after close" is true of a STALLED entrance too. React 19 double-invokes a
	// ref callback on every host-node mount — attach, detach, attach — and the
	// detach lands AFTER the layout effect that started the leg, aborting the
	// leading dummy whose `onfinish` is the only thing that ever creates the real
	// keyframes. Nothing re-runs the driver effect (it is keyed on `[open,
	// mounted]`, neither of which moved), so without the slot's resume the
	// entrance never finishes: `data-state` pins at "opening" for good and
	// `onEnterEnd` never fires. These assert the leg actually lands.
	it("completes the entrance despite the double-invoked ref detach", async () => {
		const onEnterEnd = vi.fn();
		const { container, rerender } = render(
			<StrictMode>
				<Probe open={false} onEnterEnd={onEnterEnd} />
			</StrictMode>
		);
		const { host, node } = queries(container);

		rerender(
			<StrictMode>
				<Probe open onEnterEnd={onEnterEnd} />
			</StrictMode>
		);
		expect(host().dataset.state).toBe("opening");

		await settleLegs();
		expect(node()).not.toBeNull();
		expect(host().dataset.state).toBe("open");
		expect(host().dataset.surface).toBe("open");
		expect(onEnterEnd).toHaveBeenCalledTimes(1);
	});

	it("reaches the sampled entrance, not just the leading dummy", async () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		const { rerender } = render(
			<StrictMode>
				<Probe open={false} />
			</StrictMode>
		);

		rerender(
			<StrictMode>
				<Probe open />
			</StrictMode>
		);
		await settleLegs();

		// The resumed leg is a dummy plus its sampled entrance; a stalled one
		// records the single aborted dummy and stops there.
		const opacities = FakeAnimation.instances.flatMap((animation) =>
			(animation.keyframes as Keyframe[]).map((frame) => frame.opacity)
		);
		expect(animateSpy.mock.calls.length).toBeGreaterThan(1);
		expect(opacities).toContain("1");
	});

	it("completes a second entrance after a full close — not a first-mount-only stall", async () => {
		const onEnterEnd = vi.fn();
		const { container, rerender } = render(
			<StrictMode>
				<Probe open={false} onEnterEnd={onEnterEnd} />
			</StrictMode>
		);
		const { host, node } = queries(container);

		rerender(
			<StrictMode>
				<Probe open onEnterEnd={onEnterEnd} />
			</StrictMode>
		);
		await settleLegs();
		expect(host().dataset.state).toBe("open");

		rerender(
			<StrictMode>
				<Probe open={false} onEnterEnd={onEnterEnd} />
			</StrictMode>
		);
		await settleLegs();
		expect(node()).toBeNull();

		// The node is created afresh here, so its ref is double-invoked again —
		// the same hazard, on every open rather than only the first.
		rerender(
			<StrictMode>
				<Probe open onEnterEnd={onEnterEnd} />
			</StrictMode>
		);
		await settleLegs();
		expect(node()).not.toBeNull();
		expect(host().dataset.state).toBe("open");
		expect(onEnterEnd).toHaveBeenCalledTimes(2);
	});
});
