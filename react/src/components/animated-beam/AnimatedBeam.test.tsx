import { render, cleanup } from "@testing-library/react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { AnimatedBeam, beamDuration, packetLayers } from "./AnimatedBeam.js";

const makeProps = () => ({
	containerRef: document.createElement("div"),
	fromRef: document.createElement("div"),
	toRef: document.createElement("div"),
});

/** jsdom rects are all zero — give the three targets a measurable box. */
function stubRect(el: HTMLElement, rect: { x: number; y: number; width: number; height: number }) {
	el.getBoundingClientRect = () =>
		({
			x: rect.x,
			y: rect.y,
			left: rect.x,
			top: rect.y,
			right: rect.x + rect.width,
			bottom: rect.y + rect.height,
			width: rect.width,
			height: rect.height,
			toJSON: () => ({}),
		}) as DOMRect;
}

const makeMeasuredProps = () => {
	const props = makeProps();
	stubRect(props.containerRef, { x: 0, y: 0, width: 400, height: 200 });
	stubRect(props.fromRef, { x: 20, y: 90, width: 20, height: 20 });
	stubRect(props.toRef, { x: 360, y: 90, width: 20, height: 20 });
	return props;
};

/** `useReducedMotion()` re-resolves against a replaced `window.matchMedia`, so a wholesale override is enough. */
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

/**
 * Marks the two effect phases of the commit it mounts in. Rendered after the
 * beam, so React reaches its layout effect only once the beam's own layout
 * effects have run — which is what makes it a phase witness.
 */
function PhaseProbe({ mark }: { mark: (phase: string) => void }) {
	useLayoutEffect(() => {
		mark("layout");
	}, [mark]);
	useEffect(() => {
		mark("passive");
	}, [mark]);
	return null;
}

describe("AnimatedBeam", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("renders an svg element", () => {
		const { container } = render(<AnimatedBeam {...makeProps()} />);
		const svg = container.querySelector("svg");
		expect(svg).toBeInTheDocument();
	});

	it("svg has pointer-events-none class and is hidden from assistive tech", () => {
		const { container } = render(<AnimatedBeam {...makeProps()} />);
		const svg = container.querySelector("svg");
		expect(svg?.className.baseVal).toContain("pointer-events-none");
		expect(svg).toHaveAttribute("aria-hidden", "true");
	});

	it("renders the fibre and the packet as paths", () => {
		const { container } = render(<AnimatedBeam {...makeProps()} />);
		expect(container.querySelectorAll("path").length).toBeGreaterThanOrEqual(2);
		expect(container.querySelector(".fibre-core")).toBeInTheDocument();
		expect(container.querySelectorAll('.packet path[data-layer="head"]').length).toBeGreaterThan(0);
	});

	it("renders a linearGradient in defs", () => {
		const { container } = render(<AnimatedBeam {...makeProps()} />);
		const gradient = container.querySelector("defs linearGradient");
		expect(gradient).toBeInTheDocument();
	});

	it("applies custom class names", () => {
		const { container } = render(<AnimatedBeam {...makeProps()} className="my-beam" />);
		const svg = container.querySelector("svg");
		expect(svg?.className.baseVal).toContain("my-beam");
	});

	it("preserves base classes when custom class is added", () => {
		const { container } = render(<AnimatedBeam {...makeProps()} className="extra" />);
		const svg = container.querySelector("svg");
		expect(svg?.className.baseVal).toContain("pointer-events-none");
		expect(svg?.className.baseVal).toContain("absolute");
		expect(svg?.className.baseVal).toContain("transform-gpu");
	});

	it("wires the delay prop onto the packet's animation start", () => {
		const { container } = render(<AnimatedBeam {...makeProps()} delay={2} />);
		const packet = container.querySelector(".packet");
		expect(packet?.getAttribute("style")).toMatch(/--_delay:\s*2s/);
	});

	it("defaults the animation start to no delay", () => {
		const { container } = render(<AnimatedBeam {...makeProps()} />);
		const packet = container.querySelector(".packet");
		expect(packet?.getAttribute("style")).toMatch(/--_delay:\s*0s/);
	});

	it('svg has fill="none" attribute', () => {
		const { container } = render(<AnimatedBeam {...makeProps()} />);
		const svg = container.querySelector("svg");
		expect(svg).toHaveAttribute("fill", "none");
	});

	it("derives a stable default duration from the seed", () => {
		const a = render(<AnimatedBeam {...makeProps()} seed={4} />);
		const first = a.container.querySelector("svg")?.getAttribute("data-duration");
		cleanup();
		const b = render(<AnimatedBeam {...makeProps()} seed={4} />);
		const second = b.container.querySelector("svg")?.getAttribute("data-duration");
		expect(first).toBe(second);
		expect(Number(first)).toBeCloseTo(beamDuration(4), 3);
		expect(Number(first)).toBeGreaterThanOrEqual(4);
		expect(Number(first)).toBeLessThan(7);
	});

	it("an explicit duration wins over the seed", () => {
		const { container } = render(<AnimatedBeam {...makeProps()} duration={3} />);
		expect(container.querySelector("svg")).toHaveAttribute("data-duration", "3.000");
	});

	it("gives each instance its own gradient id", () => {
		const { container } = render(<AnimatedBeam {...makeProps()} />);
		render(<AnimatedBeam {...makeProps()} />);
		const ids = [...document.querySelectorAll("linearGradient")].map((g) => g.id);
		expect(ids.length).toBe(2);
		expect(ids[0]).not.toBe(ids[1]);
		expect(container.querySelector("linearGradient")?.id).toMatch(/^beam-/);
	});

	it("renders one packet group per pulse, spaced evenly over the cycle", () => {
		const { container } = render(
			<AnimatedBeam {...makeProps()} pulses={3} duration={6} delay={1} />
		);
		const packets = container.querySelectorAll(".packet");
		expect(packets.length).toBe(3);
		const delays = [...packets].map((p) => p.getAttribute("style"));
		expect(delays[0]).toMatch(/--_delay:\s*1s/);
		expect(delays[1]).toMatch(/--_delay:\s*3s/);
		expect(delays[2]).toMatch(/--_delay:\s*5s/);
	});

	it("each packet blooms at the landing end", () => {
		const { container } = render(<AnimatedBeam {...makeProps()} pulses={2} />);
		expect(container.querySelectorAll(".packet .bloom-disc").length).toBe(2);
	});

	it("longer tails produce longer dashes", () => {
		const short = packetLayers(0.1, "#fff", "#000").find((l) => l.key === "stop")!;
		const long = packetLayers(0.6, "#fff", "#000").find((l) => l.key === "stop")!;
		expect(long.len).toBeGreaterThan(short.len);
	});

	it("keeps the old faint line when pathColor is passed", () => {
		const { container } = render(<AnimatedBeam {...makeProps()} pathColor="red" />);
		const fibre = container.querySelector(".fibre");
		expect(fibre).toHaveAttribute("opacity", "0.2");
		expect(container.querySelector(".fibre-core")?.getAttribute("style")).toContain("red");
	});

	it("reduced motion: no packets, no bloom, a still gradient along the fibre", () => {
		stubReducedMotion(true);
		const { container } = render(<AnimatedBeam {...makeProps()} pulses={3} />);
		expect(container.querySelectorAll(".packet").length).toBe(0);
		expect(container.querySelectorAll(".bloom-disc").length).toBe(0);
		const still = container.querySelector("[data-still]");
		expect(still).toBeInTheDocument();
		const gradientId = container.querySelector("linearGradient")?.id;
		expect(still?.querySelector("path")?.getAttribute("stroke")).toBe(`url(#${gradientId})`);
	});

	it("measures the beam in the layout phase, before the first paint", () => {
		const order: string[] = [];
		const props = makeMeasuredProps();
		const measure = props.containerRef.getBoundingClientRect;
		props.containerRef.getBoundingClientRect = () => {
			order.push("measure");
			return measure.call(props.containerRef);
		};
		render(
			<>
				<AnimatedBeam {...props} />
				<PhaseProbe mark={(phase) => order.push(phase)} />
			</>
		);
		// A passive first measurement lands after the probe's layout mark — and
		// after the frame the browser has already painted with a 0x0 svg.
		expect(order.indexOf("measure")).toBeGreaterThanOrEqual(0);
		expect(order.indexOf("measure")).toBeLessThan(order.indexOf("layout"));
	});

	it("reverse: the packet flows from toRef and the bloom lands on fromRef", () => {
		const { container } = render(<AnimatedBeam {...makeMeasuredProps()} reverse />);
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

	it("re-traces when an endpoint element is swapped", () => {
		const props = makeMeasuredProps();
		const { container, rerender } = render(<AnimatedBeam {...props} />);
		const next = document.createElement("div");
		stubRect(next, { x: 260, y: 90, width: 20, height: 20 });
		rerender(<AnimatedBeam {...props} toRef={next} />);
		expect(container.querySelector(".fibre-core")).toHaveAttribute(
			"d",
			"M 30,100 Q 150,100 270,100"
		);
	});

	it("draws with ref objects when the beam sits inside the container", () => {
		// React attaches the container's ref after this child's layout effects.
		const boxes: Record<string, HTMLElement> = {
			c: document.createElement("div"),
			a: document.createElement("div"),
			b: document.createElement("div"),
		};
		stubRect(boxes.c!, { x: 0, y: 0, width: 400, height: 200 });
		stubRect(boxes.a!, { x: 20, y: 90, width: 20, height: 20 });
		stubRect(boxes.b!, { x: 360, y: 90, width: 20, height: 20 });
		const original = HTMLElement.prototype.getBoundingClientRect;
		HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
			const key = this.dataset.box;
			return key ? boxes[key]!.getBoundingClientRect() : original.call(this);
		};
		function Demo() {
			const c = useRef<HTMLDivElement>(null);
			const a = useRef<HTMLDivElement>(null);
			const b = useRef<HTMLDivElement>(null);
			return (
				<div ref={c} data-box="c">
					<div ref={a} data-box="a" />
					<div ref={b} data-box="b" />
					<AnimatedBeam containerRef={c} fromRef={a} toRef={b} />
				</div>
			);
		}
		try {
			const { container } = render(<Demo />);
			expect(container.querySelector(".fibre-core")).toHaveAttribute(
				"d",
				"M 30,100 Q 200,100 370,100"
			);
		} finally {
			HTMLElement.prototype.getBoundingClientRect = original;
		}
	});

	it("draws the measured path", () => {
		const { container } = render(<AnimatedBeam {...makeMeasuredProps()} />);
		expect(container.querySelector("svg")).toHaveAttribute("width", "400");
		expect(container.querySelector("path")).toHaveAttribute("d", "M 30,100 Q 200,100 370,100");
	});
});
