import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import Meteors, { meteorField } from "./Meteors.svelte";

describe("Meteors", () => {
	afterEach(cleanup);

	it("renders the default number of meteor spans (20)", () => {
		const { container } = render(Meteors);
		expect(container.querySelectorAll("span.meteor")).toHaveLength(20);
	});

	it("renders a custom count of meteors", () => {
		const { container } = render(Meteors, { props: { count: 5 } });
		expect(container.querySelectorAll("span.meteor")).toHaveLength(5);
	});

	it("renders zero meteors when count is 0", () => {
		const { container } = render(Meteors, { props: { count: 0 } });
		expect(container.querySelectorAll("span.meteor")).toHaveLength(0);
	});

	it("applies custom class names to each meteor", () => {
		const { container } = render(Meteors, { props: { count: 3, class: "my-custom-class" } });
		for (const span of container.querySelectorAll("span.meteor")) {
			expect(span.className).toContain("my-custom-class");
		}
	});

	it("positions and times each meteor inline, with its depth variables", () => {
		const { container } = render(Meteors, { props: { count: 4 } });
		for (const span of container.querySelectorAll("span.meteor")) {
			const style = span.getAttribute("style") ?? "";
			expect(style).toContain("left:");
			expect(style).toContain("top:");
			expect(style).toContain("animation-delay:");
			expect(style).toContain("animation-duration:");
			expect(style).toContain("--meteor-scale:");
			expect(style).toContain("--meteor-tail:");
			expect(style).toMatch(/--meteor-angle:\s*215deg/);
		}
	});

	it("preserves base classes when custom class is added, and is decorative", () => {
		const { container } = render(Meteors, { props: { count: 1, class: "extra" } });
		const span = container.querySelector("span.meteor")!;
		expect(span.className).toContain("absolute");
		expect(span.className).toContain("rounded-full");
		expect(span.getAttribute("aria-hidden")).toBe("true");
	});

	it("renders the same markup for the same seed (server and client agree)", () => {
		const a = render(Meteors, { props: { seed: 42 } }).container.innerHTML;
		cleanup();
		const b = render(Meteors, { props: { seed: 42 } }).container.innerHTML;
		expect(a).toBe(b);
		cleanup();
		const c = render(Meteors, { props: { seed: 43 } }).container.innerHTML;
		expect(c).not.toBe(a);
	});

	it("passes angle, speed and color through", () => {
		const { container } = render(Meteors, {
			props: { count: 1, angle: 240, speed: 2, color: "#ff0000", seed: 3 },
		});
		const style = container.querySelector("span.meteor")!.getAttribute("style") ?? "";
		const m = meteorField(1, 3)[0]!;
		expect(style).toMatch(/--meteor-angle:\s*240deg/);
		expect(style).toMatch(/--meteor-color:\s*#ff0000/);
		expect(style).toMatch(new RegExp(`animation-duration:\\s*${(m.duration / 2).toFixed(2)}s`));
	});
});

describe("meteorField", () => {
	it("is deterministic per seed", () => {
		expect(meteorField(10, 5)).toEqual(meteorField(10, 5));
		expect(meteorField(10, 5)).not.toEqual(meteorField(10, 6));
	});

	it("starts every meteor part-way through its pass, so there is no burst on load", () => {
		for (const m of meteorField(50, 1)) {
			expect(m.delay).toBeLessThanOrEqual(0);
			expect(m.depth).toBeGreaterThanOrEqual(0);
			expect(m.depth).toBeLessThanOrEqual(1);
		}
	});

	it("makes near meteors faster than far ones", () => {
		const field = meteorField(200, 9);
		const near = field.filter((m) => m.depth > 0.8);
		const far = field.filter((m) => m.depth < 0.2);
		const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
		expect(avg(near.map((m) => m.duration))).toBeLessThan(avg(far.map((m) => m.duration)));
	});

	it("skews depth toward far and flares a minority", () => {
		const field = meteorField(500, 2);
		const farShare = field.filter((m) => m.depth < 0.5).length / field.length;
		const flareShare = field.filter((m) => m.flare).length / field.length;
		expect(farShare).toBeGreaterThan(0.55);
		expect(flareShare).toBeGreaterThan(0.1);
		expect(flareShare).toBeLessThan(0.3);
	});

	it("handles bad counts", () => {
		expect(meteorField(-3)).toEqual([]);
		expect(meteorField(Number.NaN)).toEqual([]);
		expect(meteorField(2.7)).toHaveLength(2);
	});
});
