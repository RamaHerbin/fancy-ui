// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import DatamoshTransition from "./DatamoshTransition.vue";

describe("DatamoshTransition (SSR)", () => {
	it("renders an idle, hidden overlay without touching window", async () => {
		const body = await renderToString(createSSRApp(DatamoshTransition, { class: "custom" }));
		expect(body).toContain("datamosh-transition");
		expect(body).toContain("custom");
		expect(body).toContain("<canvas");
		expect(body).toContain('data-state="idle"');
		expect(body).toContain("invisible");
		expect(body).toContain('aria-hidden="true"');
	});

	it("is byte-identical across renders", async () => {
		const a = await renderToString(createSSRApp(DatamoshTransition, { seed: 3 }));
		const b = await renderToString(createSSRApp(DatamoshTransition, { seed: 3 }));
		expect(a).toBe(b);
	});

	it("renders deterministically with a picture source", async () => {
		const props = { source: "/sunset.svg", variant: "split" as const };
		expect(await renderToString(createSSRApp(DatamoshTransition, props))).toBe(
			await renderToString(createSSRApp(DatamoshTransition, props))
		);
	});
});
