// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import PulseBeam from "./PulseBeam.vue";

describe("PulseBeam (SSR)", () => {
	it("renders idle markup with all layers and no window access", async () => {
		const html = await renderToString(
			createSSRApp(PulseBeam, { active: true, variant: "outside" })
		);
		expect(html).toContain('data-state="idle"');
		expect(html).toContain('data-variant="outside"');
		expect(html).toContain("pulse-beam__stroke");
		expect(html).toContain("pulse-beam__glow");
		expect(html).toContain("pulse-beam__bloom");
		expect(html).toContain("--pb-strength:1");
	});

	it("renders identically twice (no Math.random/Date.now drift)", async () => {
		const first = await renderToString(createSSRApp(PulseBeam, {}));
		const second = await renderToString(createSSRApp(PulseBeam, {}));
		expect(first).toBe(second);
	});
});
