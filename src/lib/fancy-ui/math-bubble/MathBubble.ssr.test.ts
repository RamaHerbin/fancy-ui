// @vitest-environment node
import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import MathBubble from "./MathBubble.svelte";

describe("MathBubble (SSR)", () => {
	it("renders the finished drawing as inline SVG, named for assistive tech", () => {
		const { body } = render(MathBubble, { props: { formula: "e^{i\\pi}+1=0" } });
		expect(body).toContain('role="img"');
		expect(body).toContain('aria-label="e^{i\\pi}+1=0"');
		expect(body).toContain("<svg");
		expect(body).toContain('stroke="currentColor"');
		expect(body).toContain("<path");
		expect(body).not.toContain("<canvas");
	});

	it("renders the still even with a t prop, the canvas waits for the browser", () => {
		const { body } = render(MathBubble, { props: { formula: "x^2", t: 300 } });
		expect(body).toContain("<svg");
		expect(body).not.toContain("<canvas");
	});

	it("is byte-identical across renders (seeded hand, no clock)", () => {
		const a = render(MathBubble, {
			props: { formula: "\\frac{a}{b}", bubble: "thought", tail: "left" },
		});
		const b = render(MathBubble, {
			props: { formula: "\\frac{a}{b}", bubble: "thought", tail: "left" },
		});
		expect(a.body).toBe(b.body);
	});

	it("draws a different hand for a different seed", () => {
		const a = render(MathBubble, { props: { formula: "x+y", seed: 1 } });
		const b = render(MathBubble, { props: { formula: "x+y", seed: 2 } });
		expect(a.body).not.toBe(b.body);
	});
});
