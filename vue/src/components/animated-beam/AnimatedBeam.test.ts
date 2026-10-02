import { render, cleanup } from "@testing-library/vue";
import { defineComponent, h, nextTick } from "vue";
import { afterEach, describe, it, expect, vi } from "vitest";
import AnimatedBeam, { beamDuration, packetLayers } from "./AnimatedBeam.vue";

const makeProps = (extra: Record<string, unknown> = {}) => ({
	containerRef: document.createElement("div"),
	fromRef: document.createElement("div"),
	toRef: document.createElement("div"),
	...extra,
});

/** `createReducedMotion()` calls `window.matchMedia` fresh on start(), so a wholesale override is enough. */
function stubReducedMotion(matches: boolean) {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches,
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
		addListener: () => {},
		removeListener: () => {},
	}));
}

describe("AnimatedBeam", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("renders an svg element", () => {
		const { container } = render(AnimatedBeam, { props: makeProps() });
		const svg = container.querySelector("svg");
		expect(svg).toBeInTheDocument();
	});

	it("svg has pointer-events-none class and is hidden from assistive tech", () => {
		const { container } = render(AnimatedBeam, { props: makeProps() });
		const svg = container.querySelector("svg");
		expect(svg?.className.baseVal).toContain("pointer-events-none");
		expect(svg).toHaveAttribute("aria-hidden", "true");
	});

	it("renders the fibre and the packet as paths", () => {
		const { container } = render(AnimatedBeam, { props: makeProps() });
		expect(container.querySelectorAll("path").length).toBeGreaterThanOrEqual(2);
		expect(container.querySelector(".fibre-core")).toBeInTheDocument();
		expect(container.querySelectorAll('.packet path[data-layer="head"]').length).toBeGreaterThan(0);
	});

	it("renders a linearGradient in defs", () => {
		const { container } = render(AnimatedBeam, { props: makeProps() });
		const gradient = container.querySelector("defs linearGradient");
		expect(gradient).toBeInTheDocument();
	});

	it("applies custom class names", () => {
		const { container } = render(AnimatedBeam, { props: makeProps({ class: "my-beam" }) });
		const svg = container.querySelector("svg");
		expect(svg?.className.baseVal).toContain("my-beam");
	});

	it("preserves base classes when custom class is added", () => {
		const { container } = render(AnimatedBeam, { props: makeProps({ class: "extra" }) });
		const svg = container.querySelector("svg");
		expect(svg?.className.baseVal).toContain("pointer-events-none");
		expect(svg?.className.baseVal).toContain("absolute");
		expect(svg?.className.baseVal).toContain("transform-gpu");
	});

	it("wires the delay prop onto the packet's animation start", () => {
		const { container } = render(AnimatedBeam, { props: makeProps({ delay: 2 }) });
		const packet = container.querySelector(".packet");
		expect(packet?.getAttribute("style")).toMatch(/--_delay:\s*2s/);
	});

	it("defaults the animation start to no delay", () => {
		const { container } = render(AnimatedBeam, { props: makeProps() });
		const packet = container.querySelector(".packet");
		expect(packet?.getAttribute("style")).toMatch(/--_delay:\s*0s/);
	});

	it('svg has fill="none" attribute', () => {
		const { container } = render(AnimatedBeam, { props: makeProps() });
		const svg = container.querySelector("svg");
		expect(svg).toHaveAttribute("fill", "none");
	});

	it("derives a stable default duration from the seed", () => {
		const a = render(AnimatedBeam, { props: makeProps({ seed: 4 }) });
		const first = a.container.querySelector("svg")?.getAttribute("data-duration");
		cleanup();
		const b = render(AnimatedBeam, { props: makeProps({ seed: 4 }) });
		const second = b.container.querySelector("svg")?.getAttribute("data-duration");
		expect(first).toBe(second);
		expect(Number(first)).toBeCloseTo(beamDuration(4), 3);
		expect(Number(first)).toBeGreaterThanOrEqual(4);
		expect(Number(first)).toBeLessThan(7);
	});

	it("an explicit duration wins over the seed", () => {
		const { container } = render(AnimatedBeam, { props: makeProps({ duration: 3 }) });
		expect(container.querySelector("svg")).toHaveAttribute("data-duration", "3.000");
	});

	it("gives each instance its own gradient id", () => {
		// `useId()` is unique per app, so both instances mount in one app.
		const Pair = defineComponent(() => () => [
			h(AnimatedBeam, makeProps()),
			h(AnimatedBeam, makeProps()),
		]);
		const { container } = render(Pair);
		const ids = [...document.querySelectorAll("linearGradient")].map((g) => g.id);
		expect(ids.length).toBe(2);
		expect(ids[0]).not.toBe(ids[1]);
		expect(container.querySelector("linearGradient")?.id).toMatch(/^beam-/);
	});

	it("renders one packet group per pulse, spaced evenly over the cycle", () => {
		const { container } = render(AnimatedBeam, {
			props: makeProps({ pulses: 3, duration: 6, delay: 1 }),
		});
		const packets = container.querySelectorAll(".packet");
		expect(packets.length).toBe(3);
		const delays = [...packets].map((p) => p.getAttribute("style"));
		expect(delays[0]).toMatch(/--_delay:\s*1s/);
		expect(delays[1]).toMatch(/--_delay:\s*3s/);
		expect(delays[2]).toMatch(/--_delay:\s*5s/);
	});

	it("each packet blooms at the landing end", () => {
		const { container } = render(AnimatedBeam, { props: makeProps({ pulses: 2 }) });
		expect(container.querySelectorAll(".packet .bloom-disc").length).toBe(2);
	});

	it("longer tails produce longer dashes", () => {
		const short = packetLayers(0.1, "#fff", "#000").find((l) => l.key === "stop")!;
		const long = packetLayers(0.6, "#fff", "#000").find((l) => l.key === "stop")!;
		expect(long.len).toBeGreaterThan(short.len);
	});

	it("keeps the old faint line when pathColor is passed", () => {
		const { container } = render(AnimatedBeam, { props: makeProps({ pathColor: "red" }) });
		const fibre = container.querySelector(".fibre");
		expect(fibre).toHaveAttribute("opacity", "0.2");
		expect(container.querySelector(".fibre-core")?.getAttribute("style")).toContain("red");
	});

	it("reverse: the packet flows from toRef and the bloom lands on fromRef", async () => {
		const rect = (x: number, y: number, width: number, height: number) =>
			({
				x,
				y,
				left: x,
				top: y,
				right: x + width,
				bottom: y + height,
				width,
				height,
				toJSON: () => ({}),
			}) as DOMRect;
		const props = makeProps({ reverse: true });
		(props.containerRef as HTMLElement).getBoundingClientRect = () => rect(0, 0, 400, 200);
		(props.fromRef as HTMLElement).getBoundingClientRect = () => rect(20, 90, 20, 20);
		(props.toRef as HTMLElement).getBoundingClientRect = () => rect(360, 90, 20, 20);
		const { container } = render(AnimatedBeam, { props });
		await nextTick();
		expect(container.querySelector(".fibre-core")).toHaveAttribute(
			"d",
			"M 30,100 Q 200,100 370,100"
		);
		expect(container.querySelector(".packet-layer")).toHaveAttribute(
			"d",
			"M 370,100 Q 200,100 30,100"
		);
		const bloom = container.querySelector(".bloom-disc");
		expect(bloom).toHaveAttribute("cx", "30");
		expect(bloom).toHaveAttribute("cy", "100");
	});

	it("reduced motion: no packets, no bloom, a still gradient along the fibre", async () => {
		stubReducedMotion(true);
		const { container } = render(AnimatedBeam, { props: makeProps({ pulses: 3 }) });
		await nextTick();
		expect(container.querySelectorAll(".packet").length).toBe(0);
		expect(container.querySelectorAll(".bloom-disc").length).toBe(0);
		const still = container.querySelector("[data-still]");
		expect(still).toBeInTheDocument();
		const gradientId = container.querySelector("linearGradient")?.id;
		expect(still?.querySelector("path")?.getAttribute("stroke")).toBe(`url(#${gradientId})`);
	});
});
