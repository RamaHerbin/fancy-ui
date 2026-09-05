import { render, cleanup } from "@testing-library/react";
import { useEffect, useLayoutEffect } from "react";
import { afterEach, describe, it, expect } from "vitest";
import { AnimatedBeam } from "./AnimatedBeam.js";

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
	afterEach(cleanup);

	it("renders an svg element", () => {
		const { container } = render(<AnimatedBeam {...makeProps()} />);
		const svg = container.querySelector("svg");
		expect(svg).toBeInTheDocument();
	});

	it("svg has pointer-events-none class", () => {
		const { container } = render(<AnimatedBeam {...makeProps()} />);
		const svg = container.querySelector("svg");
		expect(svg?.className.baseVal).toContain("pointer-events-none");
	});

	it("renders two path elements", () => {
		const { container } = render(<AnimatedBeam {...makeProps()} />);
		const paths = container.querySelectorAll("path");
		expect(paths.length).toBe(2);
	});

	it("renders a linearGradient in defs", () => {
		const { container } = render(<AnimatedBeam {...makeProps()} />);
		const gradient = container.querySelector("linearGradient");
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

	it('svg has fill="none" attribute', () => {
		const { container } = render(<AnimatedBeam {...makeProps()} />);
		const svg = container.querySelector("svg");
		expect(svg).toHaveAttribute("fill", "none");
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

	it("draws the measured path", () => {
		const { container } = render(<AnimatedBeam {...makeMeasuredProps()} />);
		expect(container.querySelector("svg")).toHaveAttribute("width", "400");
		expect(container.querySelector("path")).toHaveAttribute(
			"d",
			"M 30,100 Q 200,100 370,100"
		);
	});

	it("defaults the animations to no delay", () => {
		const { container } = render(<AnimatedBeam {...makeMeasuredProps()} />);
		for (const animate of container.querySelectorAll("animate")) {
			expect(animate).toHaveAttribute("begin", "0s");
		}
	});

	it("staggers the animations by the delay prop", () => {
		const { container } = render(<AnimatedBeam {...makeMeasuredProps()} delay={2} />);
		const animations = container.querySelectorAll("animate");
		expect(animations.length).toBe(2);
		for (const animate of animations) {
			expect(animate).toHaveAttribute("begin", "2s");
		}
	});
});
