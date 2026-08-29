import { describe, expect, it } from "vitest";
import { preset } from "./transitions.js";
import { DURATIONS, JS_EASINGS } from "./tokens.js";
import { PRESET_NAMES, PRESETS } from "./presets.js";

// Shape 1 (pure): `preset()` is a factory over pure data, so every assertion
// below runs without React. The two harness-driven suites the Svelte file also
// carries — mounting a transition through WAAPI, and the reduced-motion
// `duration: 0` fast path — belong to the units that own `runTransition`
// (`animate.ts`) and `usePresence` (`presence.ts`), together with the
// `Element.prototype.animate` stub those need in `test-setup.ts`.

describe("preset() — param resolution (pure, no DOM)", () => {
	it("resolves defaults: duration base, delay 0, distance 16, easing out for direction in/both", () => {
		const fn = preset("fade-up");
		for (const direction of ["in", "both", undefined] as const) {
			const config = fn(
				document.createElement("div"),
				undefined,
				direction ? { direction } : undefined
			);
			expect(config.duration).toBe(DURATIONS.base);
			expect(config.delay).toBe(0);
			expect(config.easing).toBe(JS_EASINGS.out);
		}
	});

	it("defaults easing to JS_EASINGS.in for direction out", () => {
		const fn = preset("fade");
		const config = fn(document.createElement("div"), undefined, { direction: "out" });
		expect(config.easing).toBe(JS_EASINGS.in);
	});

	it("every explicit param overrides its default, including a custom easing function", () => {
		const customEasing = (t: number) => t * t;
		const fn = preset("scale");
		const config = fn(document.createElement("div"), {
			duration: 999,
			delay: 50,
			distance: 40,
			easing: customEasing,
		});
		expect(config.duration).toBe(999);
		expect(config.delay).toBe(50);
		expect(config.easing).toBe(customEasing);
	});

	it("returns a css-only TransitionSpec — no tick function", () => {
		const config = preset("fade")(document.createElement("div"));
		expect(typeof config.css).toBe("function");
		expect("tick" in config).toBe(false);
	});
});

describe("preset() — css(t, u) geometry", () => {
	it.each(PRESET_NAMES)("t=1 (fully visible) always has opacity: 1 for %s", (name) => {
		const css = preset(name)(document.createElement("div")).css(1, 0);
		expect(css).toContain("opacity: 1");
	});

	it.each(PRESET_NAMES)("t=0 (hidden) always has opacity: 0 for %s", (name) => {
		const css = preset(name)(document.createElement("div")).css(0, 1);
		expect(css).toContain("opacity: 0");
	});

	it("fade has no transform declaration at any t — nothing to translate or scale", () => {
		const config = preset("fade")(document.createElement("div"));
		expect(config.css(0, 1)).not.toContain("transform");
		expect(config.css(1, 0)).not.toContain("transform");
		expect(config.css(0, 1)).not.toContain("filter");
	});

	it("fade-up translates from below (+y) using the default 16px distance, settling at 0", () => {
		const config = preset("fade-up")(document.createElement("div"));
		expect(config.css(0, 1)).toContain("translate(0px, 16px)");
		expect(config.css(1, 0)).toContain("translate(0px, 0px)");
	});

	it("fade-down/-left/-right honour PRESETS' signed axis", () => {
		expect(preset("fade-down")(document.createElement("div")).css(0, 1)).toContain(
			"translate(0px, -16px)"
		);
		expect(preset("fade-left")(document.createElement("div")).css(0, 1)).toContain(
			"translate(16px, 0px)"
		);
		expect(preset("fade-right")(document.createElement("div")).css(0, 1)).toContain(
			"translate(-16px, 0px)"
		);
	});

	it("a caller-supplied distance overrides the 16px default", () => {
		const config = preset("fade-up")(document.createElement("div"), { distance: 40 });
		expect(config.css(0, 1)).toContain("translate(0px, 40px)");
	});

	it("scale interpolates from PRESETS.scale.scale up to 1, never emits filter", () => {
		const config = preset("scale")(document.createElement("div"));
		expect(config.css(0, 1)).toContain(`scale(${PRESETS.scale.scale})`);
		expect(config.css(1, 0)).toContain("scale(1)");
		expect(config.css(0, 1)).not.toContain("filter");
	});

	it("blur only ever emits opacity + filter, never transform", () => {
		const config = preset("blur")(document.createElement("div"));
		const hidden = config.css(0, 1);
		expect(hidden).toContain(`blur(${PRESETS.blur.blur}px)`);
		expect(hidden).not.toContain("transform");
		expect(config.css(1, 0)).toContain("blur(0px)");
	});

	it("zoom emits opacity, a scale transform, and filter together", () => {
		const config = preset("zoom")(document.createElement("div"));
		const hidden = config.css(0, 1);
		expect(hidden).toContain(`scale(${PRESETS.zoom.scale})`);
		expect(hidden).toContain(`blur(${PRESETS.zoom.blur}px)`);
		expect(config.css(1, 0)).toContain("scale(1)");
		expect(config.css(1, 0)).toContain("blur(0px)");
	});
});
