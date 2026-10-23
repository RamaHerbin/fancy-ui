// @vitest-environment node
/**
 * Server-side safety net, transposed from the Svelte package's
 * `PixelScene.ssr.test.ts`. Runs in the `node` environment, so there is no
 * `window` and no `document`: any browser global read from a render path fails
 * here instead of in a consumer's hydration.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { PixelScene } from "./PixelScene.js";

describe("PixelScene (SSR)", () => {
	it("renders the host, a single canvas and the children, without HDR", () => {
		const body = renderToStaticMarkup(
			<PixelScene className="h-80" night>
				<p>Hello</p>
			</PixelScene>
		);
		expect(body).toContain("pixel-scene");
		expect(body).toContain("h-80");
		expect(body.match(/<canvas/g)).toHaveLength(1);
		expect(body).toContain("pixel-scene__content");
		expect(body).toContain("<p>Hello</p>");
		expect(body).toContain('data-scene="alpine"');
		expect(body).toContain("data-night");
		expect(body).not.toContain("data-hdr");
		expect(body).not.toContain("pixel-scene__hdr");
	});

	it("is byte-identical across renders", () => {
		const a = renderToStaticMarkup(<PixelScene scene="sea" />);
		const b = renderToStaticMarkup(<PixelScene scene="sea" />);
		expect(a).toBe(b);
	});
});
