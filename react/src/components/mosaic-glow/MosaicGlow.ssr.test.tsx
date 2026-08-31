// @vitest-environment node
/**
 * Server-side safety net, transposed from the Svelte package's
 * `MosaicGlow.ssr.test.ts`. Runs in the `node` environment, so there is no
 * `window` and no `document`: any browser global read from a render path — or
 * any `Math.random()` in the markup — fails here instead of in a consumer's
 * hydration.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { MosaicGlow } from "./MosaicGlow.js";

describe("MosaicGlow (SSR)", () => {
	it("renders the host, canvas and children without touching window or randomness", () => {
		const body = renderToStaticMarkup(
			<MosaicGlow className="h-80">
				<p>Hello</p>
			</MosaicGlow>
		);
		expect(body).toContain("mosaic-glow");
		expect(body).toContain("h-80");
		expect(body).toContain("<canvas");
		expect(body).toContain("mosaic-glow__content");
		expect(body).toContain("<p>Hello</p>");
		// React serialises inline styles without the space Svelte emits after
		// the colon; the declaration itself is identical.
		expect(body).toContain("background-color:#0a0a0a");
	});

	it("is byte-identical across renders (no Math.random in markup)", () => {
		const a = renderToStaticMarkup(<MosaicGlow seed={3} />);
		const b = renderToStaticMarkup(<MosaicGlow seed={3} />);
		expect(a).toBe(b);
	});
});
