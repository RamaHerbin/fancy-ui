// @vitest-environment node
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, it, expect } from "vitest";
import MathBubble, { type MathBubbleProps } from "./MathBubble.vue";

function html(props: MathBubbleProps) {
	return renderToString(createSSRApp({ render: () => h(MathBubble, props) }));
}

describe("MathBubble (SSR)", () => {
	it("renders the finished drawing as inline SVG, named for assistive tech", async () => {
		const body = await html({ formula: "e^{i\\pi}+1=0" });
		expect(body).toContain('role="img"');
		expect(body).toContain('aria-label="e^{i\\pi}+1=0"');
		expect(body).toContain("<svg");
		expect(body).toContain('stroke="currentColor"');
		expect(body).toContain("<path");
		expect(body).not.toContain("<canvas");
	});

	it("renders the still even with a t prop, the canvas waits for the browser", async () => {
		const body = await html({ formula: "x^2", t: 300 });
		expect(body).toContain("<svg");
		expect(body).not.toContain("<canvas");
	});

	it("is byte-identical across renders (seeded hand, no clock)", async () => {
		const a = await html({ formula: "\\frac{a}{b}", bubble: "thought", tail: "left" });
		const b = await html({ formula: "\\frac{a}{b}", bubble: "thought", tail: "left" });
		expect(a).toBe(b);
	});

	it("draws a different hand for a different seed", async () => {
		const a = await html({ formula: "x+y", seed: 1 });
		const b = await html({ formula: "x+y", seed: 2 });
		expect(a).not.toBe(b);
	});
});
