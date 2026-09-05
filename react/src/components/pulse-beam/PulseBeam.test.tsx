import { render, cleanup, act } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRef, StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PulseBeam, type PulseBeamProps } from "./PulseBeam.js";
import { pulseEntryCount } from "./pulse-beam-loop";
import {
	buildLayerBackgrounds,
	buildOscillators,
	motionPreset,
	oscillate,
	parseRgb,
	LAYER_PRESETS,
	type Oscillator,
} from "./pulse-beam-data";

const count = (s: string, needle: string) => s.split(needle).length - 1;

/** FADE_IN_MS + FADE_SLACK_MS, the component's fade-in fallback delay. */
const FADE_IN_FALLBACK_MS = 680;

// --- pure data module ---------------------------------------------------------

describe("oscillate", () => {
	const o: Oscillator = { prop: "--x", a: 0.5, b: 1.5, period: 2, delay: 0.25, unit: "" };

	it("returns a at t = delay and b half a period later", () => {
		expect(oscillate(o, 0.25)).toBeCloseTo(0.5, 6);
		expect(oscillate(o, 1.25)).toBeCloseTo(1.5, 6);
		expect(oscillate(o, 2.25)).toBeCloseTo(0.5, 6);
	});

	it("stays within [min(a,b), max(a,b)]", () => {
		for (let t = -3; t < 9; t += 0.137) {
			const v = oscillate(o, t);
			expect(v).toBeGreaterThanOrEqual(0.5 - 1e-9);
			expect(v).toBeLessThanOrEqual(1.5 + 1e-9);
		}
	});
});

describe("buildOscillators", () => {
	it("yields the 17 animated properties with px units on drift", () => {
		const list = buildOscillators(motionPreset("inner", "dark"));
		expect(list).toHaveLength(17);
		const props = list.map((o) => o.prop);
		for (const r of [1, 2, 3]) {
			expect(props).toContain(`--pb-bw${r}`);
			expect(props).toContain(`--pb-bh${r}`);
			expect(props).toContain(`--pb-bx${r}`);
			expect(props).toContain(`--pb-by${r}`);
		}
		expect(props).toContain("--pb-gh");
		for (const q of ["tl", "tr", "bl", "br"]) expect(props).toContain(`--pb-op-${q}`);
		for (const o of list) {
			expect(o.unit).toBe(/--pb-b[xy]\d/.test(o.prop) ? "px" : "");
			expect(o.period).toBeGreaterThan(0);
		}
	});

	it("corner alphas breathe between 1 - op and 1 with staggered delays", () => {
		const m = motionPreset("inner", "dark");
		const list = buildOscillators(m);
		const tl = list.find((o) => o.prop === "--pb-op-tl")!;
		const br = list.find((o) => o.prop === "--pb-op-br")!;
		expect(tl.a).toBeCloseTo(1 - m.op);
		expect(tl.b).toBe(1);
		expect(tl.delay).toBe(0);
		expect(br.delay).toBeGreaterThan(0);
	});
});

describe("motionPreset", () => {
	it("divides the breathing periods by speed and leaves the hue period alone", () => {
		const base = motionPreset("inner", "dark", 1);
		const fast = motionPreset("inner", "dark", 2);
		expect(fast.bs).toBeCloseTo(base.bs / 2);
		expect(fast.ss).toBeCloseTo(base.ss / 2);
		expect(fast.ghs).toBeCloseTo(base.ghs / 2);
		expect(fast.huePeriod).toBe(base.huePeriod);
	});

	it("ignores non-positive or non-finite speed", () => {
		expect(motionPreset("outside", "light", 0).bs).toBe(motionPreset("outside", "light").bs);
		expect(motionPreset("outside", "light", NaN).ss).toBe(motionPreset("outside", "light").ss);
	});
});

describe("parseRgb", () => {
	it("parses hex and rgb() forms", () => {
		expect(parseRgb("#f00")).toEqual([255, 0, 0]);
		expect(parseRgb("#0080FF")).toEqual([0, 128, 255]);
		expect(parseRgb("rgb(1, 2, 3)")).toEqual([1, 2, 3]);
		expect(parseRgb("rgba(4 5 6 / 0.5)")).toEqual([4, 5, 6]);
	});

	it("returns null for anything else", () => {
		expect(parseRgb("var(--primary)")).toBeNull();
		expect(parseRgb("oklch(0.7 0.1 200)")).toBeNull();
		expect(parseRgb("red")).toBeNull();
	});
});

describe("buildLayerBackgrounds", () => {
	const inner = buildLayerBackgrounds({
		variant: "inner",
		palette: "colorful",
		tone: "dark",
		op: 0.48,
	});
	const outside = buildLayerBackgrounds({
		variant: "outside",
		palette: "colorful",
		tone: "dark",
		op: 0.46,
	});

	it("inner: 9 stroke, 13 glow (9 + 4 corner dots), 7 bloom gradients", () => {
		expect(count(inner.stroke, "radial-gradient(")).toBe(9);
		expect(count(inner.glow, "radial-gradient(")).toBe(13);
		expect(count(inner.bloom, "radial-gradient(")).toBe(7);
	});

	it("outside: 8 stroke, 8 glow, 7 bloom gradients, scaled by --pb-sx / --pb-sy", () => {
		expect(count(outside.stroke, "radial-gradient(")).toBe(8);
		expect(count(outside.glow, "radial-gradient(")).toBe(8);
		expect(count(outside.bloom, "radial-gradient(")).toBe(7);
		expect(outside.stroke).toContain("var(--pb-sx, 1)");
		expect(outside.bloom).toContain("var(--pb-sy, 1)");
		expect(inner.stroke).not.toContain("--pb-sx");
	});

	it("animated layers carry fallbacks for every custom property", () => {
		expect(inner.stroke).toContain("var(--pb-bw1, 1)");
		expect(inner.stroke).toContain("var(--pb-gh, 1)");
		expect(inner.stroke).toContain("var(--pb-bx1, 0px)");
		expect(inner.stroke).toContain("var(--pb-op-tl, 1)");
		expect(inner.glow).toContain("calc(0.18 * var(--pb-op-tr, 1))");
	});

	it("bloom is static with alpha 1 - op / 2", () => {
		expect(inner.bloom).not.toContain("var(--pb-bw");
		expect(inner.bloom).toContain("rgba(255, 50, 100, 0.76)");
	});

	it("light tone uses dark corner dots", () => {
		const light = buildLayerBackgrounds({
			variant: "inner",
			palette: "ocean",
			tone: "light",
			op: 0.45,
		});
		expect(light.glow).toContain("rgba(0, 0, 0, calc(0.08 * var(--pb-op-tl, 1)))");
	});

	it("colors override maps onto the slots in order", () => {
		const custom = buildLayerBackgrounds({
			variant: "inner",
			palette: "colorful",
			colors: ["#ff0000", "var(--accent)"],
			tone: "dark",
			op: 0.48,
		});
		expect(custom.stroke).toContain("rgba(255, 0, 0, var(--pb-op-tl, 1))");
		expect(custom.stroke).toContain(
			"color-mix(in srgb, var(--accent) calc(var(--pb-op-tl, 1) * 100%), transparent)"
		);
		// two colours cycle over the nine slots
		expect(count(custom.stroke, "rgba(255, 0, 0")).toBe(5);
	});

	it("keeps the alpha of an rgba() override", () => {
		const custom = buildLayerBackgrounds({
			variant: "inner",
			palette: "colorful",
			colors: ["rgba(255, 0, 0, 0.1)"],
			tone: "dark",
			op: 0.48,
		});
		expect(custom.stroke).toContain("rgba(255, 0, 0, calc(var(--pb-op-tl, 1) * 0.1))");
		expect(custom.bloom).toContain("rgba(255, 0, 0, calc(0.76 * 0.1))");
	});

	it("presets exist for every variant and tone", () => {
		for (const v of ["inner", "outside"] as const) {
			for (const t of ["dark", "light"] as const) {
				const p = LAYER_PRESETS[v][t];
				expect(p.stroke).toBeGreaterThan(0);
				expect(p.bloomBlur).toBeGreaterThan(0);
			}
		}
	});
});

// --- SSR ----------------------------------------------------------------------

describe("PulseBeam (SSR)", () => {
	it("renders idle markup with all layers and no window access", () => {
		const body = renderToStaticMarkup(<PulseBeam active variant="outside" />);
		expect(body).toContain('data-state="idle"');
		expect(body).toContain('data-variant="outside"');
		expect(body).toContain("pulse-beam__stroke");
		expect(body).toContain("pulse-beam__glow");
		expect(body).toContain("pulse-beam__bloom");
		expect(body).toContain("--pb-strength:1");
	});
});

// --- component harness --------------------------------------------------------

let rafCallbacks: FrameRequestCallback[] = [];
let rafCounter = 0;
const raf = vi.fn((cb: FrameRequestCallback) => {
	rafCallbacks.push(cb);
	return ++rafCounter;
});
const caf = vi.fn();

class MockIO {
	static instances: MockIO[] = [];
	cb: IntersectionObserverCallback;
	constructor(cb: IntersectionObserverCallback) {
		this.cb = cb;
		MockIO.instances.push(this);
	}
	observe = vi.fn();
	disconnect = vi.fn();
	unobserve = vi.fn();
	trigger(isIntersecting: boolean) {
		this.cb(
			[{ isIntersecting } as IntersectionObserverEntry],
			this as unknown as IntersectionObserver
		);
	}
}

const originalMatchMedia = window.matchMedia;

function stubReducedMotion(matches: boolean) {
	window.matchMedia = ((query: string) => ({
		matches,
		media: query,
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
	})) as typeof window.matchMedia;
}

/** Run every pending rAF callback with the given timestamp (ms). */
function frame(t: number) {
	const cbs = rafCallbacks.splice(0);
	for (const cb of cbs) cb(t);
}

function getHost(container: HTMLElement) {
	return container.querySelector(".pulse-beam") as HTMLDivElement;
}

function getStroke(container: HTMLElement) {
	return container.querySelector(".pulse-beam__stroke") as HTMLDivElement;
}

// --- tests --------------------------------------------------------------------

describe("PulseBeam", () => {
	beforeEach(() => {
		rafCallbacks = [];
		raf.mockClear();
		caf.mockClear();
		vi.stubGlobal("requestAnimationFrame", raf);
		vi.stubGlobal("cancelAnimationFrame", caf);
		vi.stubGlobal("IntersectionObserver", MockIO);
	});

	afterEach(() => {
		// cleanup() first: the loop must cancel through the stub it scheduled with.
		cleanup();
		vi.unstubAllGlobals();
		vi.useRealTimers();
		window.matchMedia = originalMatchMedia;
		MockIO.instances = [];
		expect(pulseEntryCount()).toBe(0);
	});

	it("renders the wrapper, three layers and children, and merges classes", () => {
		const { container } = render(
			<PulseBeam {...({ className: "custom", "data-testid": "pb" } as PulseBeamProps)} />
		);
		const host = getHost(container);
		expect(host).toBeTruthy();
		expect(host.classList.contains("custom")).toBe(true);
		expect(host.getAttribute("data-testid")).toBe("pb");
		expect(host.getAttribute("data-variant")).toBe("inner");
		expect(container.querySelector(".pulse-beam__stroke")).toBeTruthy();
		expect(container.querySelector(".pulse-beam__glow")).toBeTruthy();
		expect(container.querySelector(".pulse-beam__bloom")).toBeTruthy();
	});

	it("keeps its own variant and state when matching attributes are forwarded", () => {
		const { container } = render(
			<PulseBeam
				{...({
					variant: "outside",
					"data-variant": "inner",
					"data-state": "loading",
				} as unknown as PulseBeamProps)}
			/>
		);
		const host = getHost(container);
		expect(host.getAttribute("data-variant")).toBe("outside");
		expect(host.getAttribute("data-state")).toBe("active");
	});

	it("exposes clamped strength, radius and mono-halved opacities as custom properties", () => {
		const { container } = render(<PulseBeam strength={2} radius={24} />);
		const host = getHost(container);
		expect(host.style.getPropertyValue("--pb-strength")).toBe("1");
		expect(host.style.getPropertyValue("--pb-radius")).toBe("24px");

		cleanup();
		const low = render(<PulseBeam strength={-1} palette="mono" />);
		const lowHost = getHost(low.container);
		expect(lowHost.style.getPropertyValue("--pb-strength")).toBe("0");
		expect(Number(lowHost.style.getPropertyValue("--pb-o-stroke"))).toBeCloseTo(1.54 * 0.5);
	});

	it("paints 9 / 13 / 7 gradients for inner and 8 / 8 / 7 for outside", () => {
		// Read from server markup: jsdom's CSSOM drops a comma-separated
		// multi-background list unless it contains a var() it cannot validate,
		// so a client render's `style.background` is empty for the bloom layer.
		// The style attribute in static markup carries the exact strings the
		// component renders. `getAttribute` bypasses that CSSOM parsing.
		const layerStyle = (html: string, cls: string) => {
			const div = document.createElement("div");
			div.innerHTML = html;
			return div.querySelector(`.${cls}`)?.getAttribute("style") ?? "";
		};
		const gradients = (s: string) => (s.match(/radial-gradient\(/g) ?? []).length;
		const inner = renderToStaticMarkup(<PulseBeam />);
		expect(gradients(layerStyle(inner, "pulse-beam__stroke"))).toBe(9);
		expect(gradients(layerStyle(inner, "pulse-beam__glow"))).toBe(13);
		expect(gradients(layerStyle(inner, "pulse-beam__bloom"))).toBe(7);
		expect(layerStyle(inner, "pulse-beam__stroke")).not.toContain("--pb-sx");

		const outside = renderToStaticMarkup(<PulseBeam variant="outside" />);
		expect(gradients(layerStyle(outside, "pulse-beam__stroke"))).toBe(8);
		expect(gradients(layerStyle(outside, "pulse-beam__glow"))).toBe(8);
		expect(gradients(layerStyle(outside, "pulse-beam__bloom"))).toBe(7);
		expect(layerStyle(outside, "pulse-beam__stroke")).toContain("var(--pb-sx, 1)");
		expect(outside).toContain('data-variant="outside"');
	});

	it("activates on mount and schedules one animation frame", () => {
		const { container } = render(<PulseBeam />);
		expect(getHost(container).getAttribute("data-state")).toBe("active");
		expect(raf).toHaveBeenCalledTimes(1);
		expect(pulseEntryCount()).toBe(1);
	});

	it("stays idle and never schedules a frame when active is false", () => {
		const { container } = render(<PulseBeam active={false} />);
		expect(getHost(container).getAttribute("data-state")).toBe("idle");
		expect(raf).not.toHaveBeenCalled();
	});

	it("writes oscillator and hue properties on each throttled frame", () => {
		const { container } = render(<PulseBeam />);
		const host = getHost(container);

		frame(100);
		const hue1 = host.style.getPropertyValue("--pb-hue");
		expect(hue1).toMatch(/deg$/);
		const bw1 = Number(host.style.getPropertyValue("--pb-bw1"));
		expect(bw1).toBeGreaterThanOrEqual(1 - 0.28 - 1e-6);
		expect(bw1).toBeLessThanOrEqual(1 + 0.28 * 1.1 + 1e-6);
		expect(host.style.getPropertyValue("--pb-bx1")).toMatch(/px$/);

		frame(110); // inside the 30fps window: no write
		expect(host.style.getPropertyValue("--pb-hue")).toBe(hue1);

		frame(150);
		expect(host.style.getPropertyValue("--pb-hue")).not.toBe(hue1);
	});

	it("respects prefers-reduced-motion: no loop, layers still present, onfadein fires", () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		stubReducedMotion(true);
		const onfadein = vi.fn();
		const { container } = render(<PulseBeam onfadein={onfadein} />);
		const host = getHost(container);
		expect(host.getAttribute("data-state")).toBe("active");
		expect(raf).not.toHaveBeenCalled();
		expect(container.querySelectorAll(".pulse-beam__layer")).toHaveLength(3);
		act(() => {
			vi.advanceTimersByTime(0);
		});
		expect(onfadein).toHaveBeenCalledTimes(1);
	});

	it("skips hue rotation for mono and when hueShift is off", () => {
		const mono = render(<PulseBeam palette="mono" />);
		frame(100);
		expect(getHost(mono.container).style.getPropertyValue("--pb-bw1")).not.toBe("");
		expect(getHost(mono.container).style.getPropertyValue("--pb-hue")).toBe("");
		cleanup();

		const noHue = render(<PulseBeam hueShift={false} />);
		frame(200);
		expect(getHost(noHue.container).style.getPropertyValue("--pb-hue")).toBe("");
	});

	it("clears the hue rotation when hue drift is switched off", () => {
		const { container, rerender } = render(<PulseBeam hueShift={true} />);
		const host = getHost(container);
		frame(100);
		expect(host.style.getPropertyValue("--pb-hue")).toMatch(/deg$/);

		rerender(<PulseBeam hueShift={false} />);
		expect(host.style.getPropertyValue("--pb-hue")).toBe("");
	});

	it("fades out on transitionend and fires onfadeout exactly once", () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		const onfadeout = vi.fn();
		const { container, rerender } = render(<PulseBeam active={true} onfadeout={onfadeout} />);
		rerender(<PulseBeam active={false} onfadeout={onfadeout} />);
		const host = getHost(container);
		expect(host.getAttribute("data-state")).toBe("fading");

		// jsdom has no TransitionEvent constructor; a plain Event with
		// `propertyName` defined is what React's synthetic event reads.
		const ev = new Event("transitionend", { bubbles: true });
		Object.defineProperty(ev, "propertyName", { value: "opacity" });
		act(() => {
			getStroke(container).dispatchEvent(ev);
		});
		expect(host.getAttribute("data-state")).toBe("idle");
		expect(onfadeout).toHaveBeenCalledTimes(1);

		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(onfadeout).toHaveBeenCalledTimes(1);
		expect(pulseEntryCount()).toBe(0);
		expect(caf).toHaveBeenCalled();
	});

	it("falls back to a timer when no transitionend arrives", () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		const onfadeout = vi.fn();
		const { container, rerender } = render(<PulseBeam active={true} onfadeout={onfadeout} />);
		rerender(<PulseBeam active={false} onfadeout={onfadeout} />);
		act(() => {
			vi.advanceTimersByTime(579);
		});
		expect(onfadeout).not.toHaveBeenCalled();
		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(getHost(container).getAttribute("data-state")).toBe("idle");
		expect(onfadeout).toHaveBeenCalledTimes(1);
	});

	it("re-arms the fade fallback under StrictMode's double-invoked effects", () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		const onfadein = vi.fn();
		const { container } = render(
			<StrictMode>
				<PulseBeam onfadein={onfadein} />
			</StrictMode>
		);
		expect(getHost(container).getAttribute("data-state")).toBe("active");
		act(() => {
			vi.advanceTimersByTime(FADE_IN_FALLBACK_MS);
		});
		expect(onfadein).toHaveBeenCalledTimes(1);
	});

	it("cancels the frame and disconnects the observer on unmount", () => {
		const { unmount } = render(<PulseBeam />);
		const id = raf.mock.results[0]?.value;
		unmount();
		expect(caf).toHaveBeenCalledWith(id);
		expect(MockIO.instances[0]!.disconnect).toHaveBeenCalled();
	});

	it("pauses writes while offscreen and resumes when visible again", () => {
		const { container } = render(<PulseBeam />);
		const host = getHost(container);
		frame(100);
		const hue = host.style.getPropertyValue("--pb-hue");

		MockIO.instances[0]!.trigger(false);
		frame(300);
		expect(host.style.getPropertyValue("--pb-hue")).toBe(hue);
		// everyone paused: the loop stops rescheduling
		expect(rafCallbacks).toHaveLength(0);

		MockIO.instances[0]!.trigger(true);
		expect(rafCallbacks).toHaveLength(1);
		frame(400);
		expect(host.style.getPropertyValue("--pb-hue")).not.toBe(hue);
	});

	it("shares one animation frame between instances", () => {
		const a = render(<PulseBeam />);
		const b = render(<PulseBeam />);
		expect(raf).toHaveBeenCalledTimes(1);
		expect(pulseEntryCount()).toBe(2);
		a.unmount();
		expect(caf).not.toHaveBeenCalled();
		b.unmount();
		expect(caf).toHaveBeenCalledTimes(1);
	});

	it("binds ref to the wrapper", () => {
		const ref = createRef<HTMLDivElement>();
		const { container } = render(<PulseBeam ref={ref} />);
		expect(getHost(container)).toBeInstanceOf(HTMLDivElement);
		expect(ref.current).toBe(getHost(container));
	});

	it("runs a callback ref's own cleanup on unmount", () => {
		const attached = vi.fn();
		const detached = vi.fn();
		const { container, unmount } = render(
			<PulseBeam
				ref={(node) => {
					attached(node);
					return () => detached();
				}}
			/>
		);
		expect(attached).toHaveBeenCalledTimes(1);
		expect(attached).toHaveBeenLastCalledWith(getHost(container));
		unmount();
		// The teardown the consumer handed back is the whole of its detach: it
		// runs, and the callback is never additionally called with `null`.
		expect(detached).toHaveBeenCalledTimes(1);
		expect(attached).toHaveBeenCalledTimes(1);
	});
});
