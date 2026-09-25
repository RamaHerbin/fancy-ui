// @vitest-environment node
/**
 * Server-side safety net, transposed from the Svelte package's
 * `DatamoshTransition.ssr.test.ts`: no `window`, no `document`, no
 * randomness in the markup.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { DatamoshTransition } from "./DatamoshTransition.js";

describe("DatamoshTransition (SSR)", () => {
	it("renders an idle, hidden overlay without touching window", () => {
		const body = renderToStaticMarkup(<DatamoshTransition className="custom" />);
		expect(body).toContain("datamosh-transition");
		expect(body).toContain("custom");
		expect(body).toContain("<canvas");
		expect(body).toContain('data-state="idle"');
		expect(body).toContain("invisible");
		expect(body).toContain('aria-hidden="true"');
	});

	it("is byte-identical across renders", () => {
		const a = renderToStaticMarkup(<DatamoshTransition seed={3} />);
		const b = renderToStaticMarkup(<DatamoshTransition seed={3} />);
		expect(a).toBe(b);
	});

	it("renders deterministically with a picture source", () => {
		const el = <DatamoshTransition source="/sunset.svg" variant="split" />;
		expect(renderToStaticMarkup(el)).toBe(renderToStaticMarkup(el));
	});
});
