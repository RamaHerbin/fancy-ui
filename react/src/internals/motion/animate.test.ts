import { describe, expect, it, vi } from "vitest";
import { cssToKeyframe, runTransition, type TransitionRun } from "./animate.js";
import type { TransitionSpec } from "./transitions.js";
import { linear } from "./easing.js";
import { FakeAnimation } from "../../test-setup.js";

// Shapes 1 and 2. `cssToKeyframe` is pure; `runTransition` is the core layer,
// driven directly against a hand-built element through the
// `Element.prototype.animate` stub `test-setup.ts` installs — the same stub the
// Svelte suite's harness-mounted transition tests ran through.

/**
 * The stub finishes an animation on a MICROTASK, and `runTransition` chains a
 * dummy animation into the real one, so one turn of the queue advances the run
 * by exactly one leg:
 *
 * - after the first: the dummy has finished and the main animation exists,
 *   still running;
 * - after the second: the main animation has finished and `onFinish` has run.
 *
 * Kept as an explicit two-step rather than `vi.waitFor`, which would drain both
 * legs and make the mid-flight assertions unreachable.
 */
const nextLeg = () => Promise.resolve();

function specOf(overrides: Partial<TransitionSpec> = {}): TransitionSpec {
	return {
		delay: 0,
		duration: 100,
		easing: linear,
		css: (t) => `opacity: ${t}`,
		...overrides,
	};
}

const el = () => document.createElement("div");

/** The keyframe list the nth recorded animation was constructed with. */
function keyframesOf(index: number): Keyframe[] {
	return (FakeAnimation.instances[index] as FakeAnimation).keyframes as Keyframe[];
}

describe("cssToKeyframe() — the css string → WAAPI keyframe parser", () => {
	it("splits declarations on ; and pairs each at its colon", () => {
		expect(cssToKeyframe("opacity: 0.5; transform: scale(0.96)")).toEqual({
			opacity: "0.5",
			transform: "scale(0.96)",
		});
	});

	it("trims whitespace around both the property and the value", () => {
		expect(cssToKeyframe("   opacity   :   1   ")).toEqual({ opacity: "1" });
	});

	it("camelCases a kebab-case property, however many segments it has", () => {
		expect(cssToKeyframe("transform-origin: left top")).toEqual({ transformOrigin: "left top" });
		expect(cssToKeyframe("border-top-left-radius: 4px")).toEqual({
			borderTopLeftRadius: "4px",
		});
	});

	it("never renames a custom property", () => {
		expect(cssToKeyframe("--ft-shift: 3px")).toEqual({ "--ft-shift": "3px" });
	});

	it("special-cases float and offset, the two names the keyframe object reserves", () => {
		expect(cssToKeyframe("float: left")).toEqual({ cssFloat: "left" });
		expect(cssToKeyframe("offset: 0.5")).toEqual({ cssOffset: "0.5" });
	});

	it("BREAKS on a malformed part rather than skipping it — everything after is dropped", () => {
		expect(cssToKeyframe("opacity: 1; broken; transform: none")).toEqual({ opacity: "1" });
	});

	it("tolerates a trailing semicolon, which is the same break by another name", () => {
		expect(cssToKeyframe("opacity: 1;")).toEqual({ opacity: "1" });
	});

	it("returns an empty keyframe for an empty string", () => {
		expect(cssToKeyframe("")).toEqual({});
	});

	it("truncates a value at its first colon — the source's own behaviour, pinned so a 'fix' surfaces here", () => {
		expect(cssToKeyframe("background: url(a:b)")).toEqual({ background: "url(a" });
	});
});

describe("runTransition() — the duration-falsy fast path (reduced motion)", () => {
	it("calls onFinish SYNCHRONOUSLY and never calls element.animate()", () => {
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		const onFinish = vi.fn();

		runTransition(el(), specOf({ duration: 0 }), 1, undefined, onFinish);

		expect(onFinish).toHaveBeenCalledTimes(1);
		expect(animateSpy).not.toHaveBeenCalled();
		animateSpy.mockRestore();
	});

	it("hands back a handle already at the target position, with inert abort/deactivate", () => {
		const run = runTransition(el(), specOf({ duration: 0 }), 0, undefined, () => {});

		expect(run.t()).toBe(0);
		expect(() => run.abort()).not.toThrow();
		expect(() => run.deactivate()).not.toThrow();
	});

	it("still deactivates the counterpart FIRST — before the duration check short-circuits", () => {
		const counterpart: TransitionRun = { t: () => 0.4, abort: vi.fn(), deactivate: vi.fn() };

		runTransition(el(), specOf({ duration: 0 }), 1, counterpart, () => {});

		expect(counterpart.deactivate).toHaveBeenCalledTimes(1);
	});
});

describe("runTransition() — the leading dummy animation", () => {
	it("is created even at delay 0, and the main animation is deferred to its onfinish", async () => {
		const node = el();
		runTransition(node, specOf(), 1, undefined, () => {});

		// Synchronously, only the dummy exists.
		expect(FakeAnimation.instances).toHaveLength(1);
		expect(FakeAnimation.instances[0]?.options).toEqual({ duration: 0, fill: "forwards" });

		await nextLeg();
		expect(FakeAnimation.instances).toHaveLength(2);
	});

	it("lasts exactly the spec's delay", () => {
		runTransition(el(), specOf({ delay: 50 }), 1, undefined, () => {});

		expect(FakeAnimation.instances[0]?.options).toEqual({ duration: 50, fill: "forwards" });
	});

	it("pins the hidden state twice for a fresh intro, so a delayed entrance never paints at rest first", () => {
		const spec = specOf({ delay: 50 });
		runTransition(el(), spec, 1, undefined, () => {});

		const pinned = cssToKeyframe(spec.css(0, 1));
		expect(keyframesOf(0)).toEqual([pinned, pinned]);
	});

	it("pins nothing for an exit", () => {
		runTransition(el(), specOf(), 0, undefined, () => {});

		expect(keyframesOf(0)).toEqual([]);
	});

	it("pins nothing for an intro that is reversing a counterpart", () => {
		const counterpart: TransitionRun = { t: () => 0.5, abort: () => {}, deactivate: () => {} };
		runTransition(el(), specOf(), 1, counterpart, () => {});

		expect(keyframesOf(0)).toEqual([]);
	});
});

describe("runTransition() — the sampled main animation", () => {
	it("emits n + 1 keyframes for n = ceil(duration / (1000 / 60))", async () => {
		runTransition(el(), specOf({ duration: 100 }), 1, undefined, () => {});
		await nextLeg();

		// 100ms at 60fps is exactly 6 frames; the loop is inclusive, so 7 samples.
		expect(keyframesOf(1)).toHaveLength(7);
	});

	it("rounds the frame count UP, so the target value is never missed", async () => {
		runTransition(el(), specOf({ duration: 75 }), 1, undefined, () => {});
		await nextLeg();

		// 75ms is 4.5 frames → ceil 5 → 6 samples.
		expect(keyframesOf(1)).toHaveLength(6);
	});

	it("runs an intro from the hidden state to the visible one", async () => {
		runTransition(el(), specOf(), 1, undefined, () => {});
		await nextLeg();

		const keyframes = keyframesOf(1);
		expect(keyframes.at(0)).toEqual({ opacity: "0" });
		expect(keyframes.at(-1)).toEqual({ opacity: "1" });
	});

	it("runs an exit from the visible state to the hidden one", async () => {
		runTransition(el(), specOf(), 0, undefined, () => {});
		await nextLeg();

		const keyframes = keyframesOf(1);
		expect(keyframes.at(0)).toEqual({ opacity: "1" });
		expect(keyframes.at(-1)).toEqual({ opacity: "0" });
	});

	it("carries the curve in the SAMPLE POSITIONS, never as a WAAPI easing option", async () => {
		runTransition(el(), specOf({ easing: (t) => t * t }), 1, undefined, () => {});
		await nextLeg();

		// n = 6, so the midpoint sample is easing(3 / 6) = 0.25, not 0.5.
		expect(keyframesOf(1)[3]).toEqual({ opacity: "0.25" });
		expect(FakeAnimation.instances[1]?.options).toEqual({ duration: 100, fill: "forwards" });
	});

	it("samples linearly in t when the easing is linear", async () => {
		runTransition(el(), specOf(), 1, undefined, () => {});
		await nextLeg();

		expect(keyframesOf(1)[3]).toEqual({ opacity: "0.5" });
	});

	it("passes duration and fill only — no delay option, the dummy already spent it", async () => {
		runTransition(el(), specOf({ delay: 50, duration: 120 }), 1, undefined, () => {});
		await nextLeg();

		expect(FakeAnimation.instances[1]?.options).toEqual({ duration: 120, fill: "forwards" });
	});

	it("calls onFinish once the main animation lands, never before", async () => {
		const onFinish = vi.fn();
		runTransition(el(), specOf(), 1, undefined, onFinish);

		await nextLeg();
		expect(onFinish).not.toHaveBeenCalled();

		await nextLeg();
		expect(onFinish).toHaveBeenCalledTimes(1);
	});

	it("animates the element it was handed", async () => {
		const node = el();
		runTransition(node, specOf(), 1, undefined, () => {});
		await nextLeg();

		expect(FakeAnimation.instances[0]?.target).toBe(node);
		expect(FakeAnimation.instances[1]?.target).toBe(node);
	});
});

describe("runTransition() — reversing a counterpart mid-flight", () => {
	it("deactivates the counterpart first, before anything else happens", () => {
		const order: string[] = [];
		const counterpart: TransitionRun = {
			t: () => {
				order.push("t");
				return 0.5;
			},
			abort: () => order.push("abort"),
			deactivate: () => order.push("deactivate"),
		};

		runTransition(el(), specOf(), 1, counterpart, () => {});

		expect(order).toEqual(["deactivate"]);
	});

	it("READS the counterpart's position before aborting it — the other order restarts from the far end", async () => {
		const order: string[] = [];
		const counterpart: TransitionRun = {
			t: () => {
				order.push("t");
				return 0.25;
			},
			abort: () => order.push("abort"),
			deactivate: () => order.push("deactivate"),
		};

		runTransition(el(), specOf(), 1, counterpart, () => {});
		await nextLeg();

		expect(order).toEqual(["deactivate", "t", "abort"]);
	});

	it("starts the keyframe list at the in-flight position, not at the far end", async () => {
		const counterpart: TransitionRun = { t: () => 0.25, abort: () => {}, deactivate: () => {} };

		runTransition(el(), specOf(), 1, counterpart, () => {});
		await nextLeg();

		const keyframes = keyframesOf(1);
		expect(keyframes.at(0)).toEqual({ opacity: "0.25" });
		expect(keyframes.at(-1)).toEqual({ opacity: "1" });
	});

	it("shortens the duration by the remaining delta — a reversal never replays the whole leg", async () => {
		const counterpart: TransitionRun = { t: () => 0.25, abort: () => {}, deactivate: () => {} };

		runTransition(el(), specOf({ duration: 100 }), 1, counterpart, () => {});
		await nextLeg();

		// |1 - 0.25| * 100 = 75ms → ceil(4.5) = 5 → 6 samples.
		expect(FakeAnimation.instances[1]?.options).toEqual({ duration: 75, fill: "forwards" });
		expect(keyframesOf(1)).toHaveLength(6);
	});

	it("emits an empty keyframe list when there is no distance left to travel", async () => {
		const counterpart: TransitionRun = { t: () => 1, abort: () => {}, deactivate: () => {} };
		const onFinish = vi.fn();

		runTransition(el(), specOf(), 1, counterpart, onFinish);
		await nextLeg();

		expect(FakeAnimation.instances[1]?.options).toEqual({ duration: 0, fill: "forwards" });
		expect(keyframesOf(1)).toEqual([]);

		await nextLeg();
		expect(onFinish).toHaveBeenCalledTimes(1);
	});
});

describe("runTransition() — t()", () => {
	it("reports the starting position until the delay has elapsed", () => {
		const intro = runTransition(el(), specOf({ delay: 50 }), 1, undefined, () => {});
		expect(intro.t()).toBe(0);

		const exit = runTransition(el(), specOf({ delay: 50 }), 0, undefined, () => {});
		expect(exit.t()).toBe(1);
	});

	it("interpolates from the animation's currentTime while the main leg runs", async () => {
		const run = runTransition(el(), specOf({ duration: 100 }), 1, undefined, () => {});
		await nextLeg();

		const main = FakeAnimation.instances[1] as FakeAnimation;
		main.currentTime = 50;
		expect(run.t()).toBeCloseTo(0.5, 10);

		main.currentTime = 100;
		expect(run.t()).toBeCloseTo(1, 10);
	});

	it("reports the target position once the main leg has finished", async () => {
		const run = runTransition(el(), specOf(), 0, undefined, () => {});
		await nextLeg();
		await nextLeg();

		expect(run.t()).toBe(0);
	});
});

describe("runTransition() — abort() and deactivate()", () => {
	it("abort() during the delay stops the transition ever starting", async () => {
		const onFinish = vi.fn();
		const run = runTransition(el(), specOf({ delay: 50 }), 1, undefined, onFinish);

		run.abort();
		await nextLeg();
		await nextLeg();

		expect(onFinish).not.toHaveBeenCalled();
		expect(FakeAnimation.instances).toHaveLength(1); // the main animation never existed
	});

	it("abort() cancels the animation, nulls its effect and neutralises onfinish", async () => {
		const run = runTransition(el(), specOf(), 1, undefined, () => {});
		await nextLeg();

		const main = FakeAnimation.instances[1] as FakeAnimation;
		const cancel = vi.spyOn(main, "cancel");
		main.effect = { fake: true };

		run.abort();

		expect(cancel).toHaveBeenCalledTimes(1);
		expect(main.effect).toBeNull();
		expect(() => main.onfinish?.()).not.toThrow();
	});

	it("abort() after the run has finished is harmless and cannot re-fire onFinish", async () => {
		const onFinish = vi.fn();
		const run = runTransition(el(), specOf(), 1, undefined, onFinish);
		await nextLeg();
		await nextLeg();
		expect(onFinish).toHaveBeenCalledTimes(1);

		run.abort();
		await nextLeg();

		expect(onFinish).toHaveBeenCalledTimes(1);
	});

	it("deactivate() silences onFinish without stopping the animation", async () => {
		const onFinish = vi.fn();
		const run = runTransition(el(), specOf(), 1, undefined, onFinish);

		run.deactivate();
		await nextLeg();
		await nextLeg();

		expect(onFinish).not.toHaveBeenCalled();
		// The animation itself still ran to completion — deactivate is a mute
		// button, not a stop button.
		expect(FakeAnimation.instances).toHaveLength(2);
		expect(run.t()).toBe(1);
	});

	it("a superseded leg cannot unmount the node the new leg is animating back in", async () => {
		const exitFinished = vi.fn();
		const exit = runTransition(el(), specOf(), 0, undefined, exitFinished);
		await nextLeg();

		// The reopen: `runTransition` deactivates the exit as its very first act.
		runTransition(el(), specOf(), 1, exit, () => {});
		await nextLeg();
		await nextLeg();

		expect(exitFinished).not.toHaveBeenCalled();
	});
});
