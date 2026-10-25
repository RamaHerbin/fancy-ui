// @vitest-environment node
/**
 * Server-side safety net, transposed from the Svelte package's `MathBubble.ssr.test.ts`. Runs in
 * the `node` environment, so there is no `window` and no `document`: any browser global read from a
 * render path, or any unseeded randomness in the markup, fails here instead of in hydration.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { MathBubble } from "./MathBubble.js";

describe("MathBubble (SSR)", () => {
	it("renders the finished drawing as inline SVG, named for assistive tech", () => {
		const body = renderToStaticMarkup(<MathBubble formula={"e^{i\\pi}+1=0"} />);
		expect(body).toContain('role="img"');
		expect(body).toContain('aria-label="e^{i\\pi}+1=0"');
		expect(body).toContain("<svg");
		expect(body).toContain('stroke="currentColor"');
		expect(body).toContain("<path");
		expect(body).not.toContain("<canvas");
	});

	it("renders the still even with a t prop, the canvas waits for the browser", () => {
		const body = renderToStaticMarkup(<MathBubble formula="x^2" t={300} />);
		expect(body).toContain("<svg");
		expect(body).not.toContain("<canvas");
	});

	it("is byte-identical across renders (seeded hand, no clock)", () => {
		const a = renderToStaticMarkup(
			<MathBubble formula={"\\frac{a}{b}"} bubble="thought" tail="left" />
		);
		const b = renderToStaticMarkup(
			<MathBubble formula={"\\frac{a}{b}"} bubble="thought" tail="left" />
		);
		expect(a).toBe(b);
	});

	it("draws a different hand for a different seed", () => {
		const a = renderToStaticMarkup(<MathBubble formula="x+y" seed={1} />);
		const b = renderToStaticMarkup(<MathBubble formula="x+y" seed={2} />);
		expect(a).not.toBe(b);
	});
});
