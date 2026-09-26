// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import TextRoll from "./TextRoll.vue";

// Runs in the node environment, so the SFC is compiled with the SSR-optimised
// template (the path production and Nuxt servers take), not the client one.
describe("TextRoll (SSR)", () => {
	it("serialises no TransitionGroup prop (css) onto the cell layer", async () => {
		const html = await renderToString(createSSRApp(TextRoll, { value: "42", tabular: true }));
		// Regression: a literal `<TransitionGroup :css="false">` made the SSR
		// transform emit `css="false"` on `.ft-textroll-cells`, an attribute the
		// client vnode never has and hydration never removes.
		expect(html).not.toMatch(/\scss=/);
		expect(html).toMatch(
			/<span class="ft-textroll-cells" aria-hidden="true" style="font-variant-numeric:tabular-nums;" data-v-[\w-]+>/
		);
		expect(html).toContain('style="grid-column-start:1;"');
	});

	it("puts no comment node between the real layer and the cell layer", async () => {
		const html = await renderToString(createSSRApp(TextRoll, { value: "7" }));
		expect(html).not.toContain("<!--");
	});

	it("emits no root style attribute for the default duration", async () => {
		const html = await renderToString(createSSRApp(TextRoll, { value: "7" }));
		expect(html).toMatch(
			/^<span class="ft-textroll" data-state="idle" data-direction="up" data-v-/
		);
	});
});
