import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import BorderBeam, {
	beamPhase,
	tailSegments,
	TAIL_SEGMENTS,
	BLOOM_SEGMENTS,
} from "./BorderBeam.svelte";

function root(container: HTMLElement): HTMLElement {
	return container.querySelector(".border-beam") as HTMLElement;
}

describe("BorderBeam", () => {
	afterEach(cleanup);

	it("renders a div element", () => {
		const { container } = render(BorderBeam);
		expect(root(container)).toBeInTheDocument();
		expect(root(container).tagName).toBe("DIV");
	});

	it("is purely decorative", () => {
		const { container } = render(BorderBeam);
		expect(root(container).getAttribute("aria-hidden")).toBe("true");
	});

	it("applies default CSS custom properties", () => {
		const { container } = render(BorderBeam);
		const style = root(container).getAttribute("style") ?? "";
		expect(style).toContain("--border-beam-size: 200");
		expect(style).toContain("--border-beam-duration: 9s");
		expect(style).toContain("--border-beam-anchor: 90");
		expect(style).toContain("--border-beam-border-width: 1.5");
		expect(style).toContain("--border-beam-color-from: #8ec5ff");
		expect(style).toContain("--border-beam-color-to: #c084fc");
		expect(style).toContain("--border-beam-delay: 0s");
		expect(style).toContain("--border-beam-tail: 0.25");
		expect(style).toContain("--border-beam-glow: 0.6");
		expect(style).toContain("--border-beam-offset: 0s");
		expect(style).toContain("--border-beam-park: 90%");
		expect(style).toContain("--border-beam-dir: 1");
	});

	it("applies custom size", () => {
		const { container } = render(BorderBeam, { props: { size: 300 } });
		expect(root(container).getAttribute("style")).toContain("--border-beam-size: 300");
	});

	it("applies custom duration", () => {
		const { container } = render(BorderBeam, { props: { duration: 5 } });
		expect(root(container).getAttribute("style")).toContain("--border-beam-duration: 5s");
	});

	it("applies custom colors", () => {
		const { container } = render(BorderBeam, {
			props: { colorFrom: "#ff0000", colorTo: "#00ff00" },
		});
		const style = root(container).getAttribute("style") ?? "";
		expect(style).toContain("--border-beam-color-from: #ff0000");
		expect(style).toContain("--border-beam-color-to: #00ff00");
	});

	it("applies custom delay as a phase so the comet runs from the first frame", () => {
		const { container } = render(BorderBeam, { props: { delay: 3, duration: 12 } });
		const style = root(container).getAttribute("style") ?? "";
		expect(style).toContain("--border-beam-delay: 3s");
		// 3 s behind on a 12 s lap = started 9 s early
		expect(style).toContain("--border-beam-offset: -9s");
		// and at rest, a quarter lap behind the anchor
		expect(style).toContain("--border-beam-park: 65%");
	});

	it("applies custom borderWidth", () => {
		const { container } = render(BorderBeam, { props: { borderWidth: 3 } });
		expect(root(container).getAttribute("style")).toContain("--border-beam-border-width: 3");
	});

	it("applies tail and glow", () => {
		const { container } = render(BorderBeam, { props: { tail: 0.5, glow: 0.2 } });
		const style = root(container).getAttribute("style") ?? "";
		expect(style).toContain("--border-beam-tail: 0.5");
		expect(style).toContain("--border-beam-glow: 0.2");
	});

	it("clamps tail and glow to 0-1", () => {
		const { container } = render(BorderBeam, { props: { tail: 4, glow: -1 } });
		const style = root(container).getAttribute("style") ?? "";
		expect(style).toContain("--border-beam-tail: 1");
		expect(style).toContain("--border-beam-glow: 0");
	});

	it("runs forward by default", () => {
		const { container } = render(BorderBeam);
		expect(root(container).dataset.direction).toBe("forward");
	});

	it("reverse flips the direction", () => {
		const { container } = render(BorderBeam, { props: { reverse: true } });
		expect(root(container).dataset.direction).toBe("reverse");
		expect(root(container).getAttribute("style")).toContain("--border-beam-dir: -1");
	});

	it("draws the tail from overlapping pieces, sharp and bloomed", () => {
		const { container } = render(BorderBeam);
		expect(container.querySelectorAll(".bb-tail-piece")).toHaveLength(TAIL_SEGMENTS);
		expect(container.querySelectorAll(".bb-bloom-piece")).toHaveLength(BLOOM_SEGMENTS);
		expect(container.querySelector(".bb-head")).toBeInTheDocument();
		expect(container.querySelector(".bb-spark")).toBeInTheDocument();
		expect(container.querySelector(".bb-reach")).toBeInTheDocument();
		expect(container.querySelector(".bb-spill")).toBeInTheDocument();
	});

	it("applies custom class names", () => {
		const { container } = render(BorderBeam, { props: { class: "my-beam" } });
		expect(root(container).className).toContain("my-beam");
	});

	it("preserves base classes when custom class is added", () => {
		const { container } = render(BorderBeam, { props: { class: "extra" } });
		const cls = root(container).className;
		expect(cls).toContain("border-beam");
		expect(cls).toContain("pointer-events-none");
		expect(cls).toContain("absolute");
		expect(cls).toContain("inset-0");
		expect(cls).toContain("extra");
	});
});

describe("tailSegments", () => {
	it("spaces pieces evenly, fading and tapering towards the end", () => {
		const pieces = tailSegments(4);
		expect(pieces.map((p) => p.t)).toEqual([0.125, 0.375, 0.625, 0.875]);
		for (let i = 1; i < pieces.length; i++) {
			expect(pieces[i].alpha).toBeLessThan(pieces[i - 1].alpha);
			expect(pieces[i].thickness).toBeLessThan(pieces[i - 1].thickness);
		}
		expect(pieces[0].alpha).toBeLessThanOrEqual(1);
		expect(pieces[3].alpha).toBeGreaterThan(0);
	});
});

describe("beamPhase", () => {
	it("is neutral without a delay", () => {
		expect(beamPhase(10, 0, 90, false)).toEqual({ offset: 0, park: 90 });
	});

	it("wraps delays longer than a lap", () => {
		expect(beamPhase(10, 12, 50, false)).toEqual({ offset: -8, park: 30 });
	});

	it("parks a reversed comet behind it on the other side", () => {
		expect(beamPhase(10, 5, 50, true)).toEqual({ offset: -5, park: 100 });
	});

	it("survives a zero duration", () => {
		expect(beamPhase(0, 0, 10, false)).toEqual({ offset: 0, park: 10 });
	});
});
