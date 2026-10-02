// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import MosaicGlow from "./MosaicGlow.vue";

describe("MosaicGlow (SSR)", () => {
	it("renders the host, canvas and children without touching window or randomness", async () => {
		const body = await renderToString(
			createSSRApp({
				render: () => h(MosaicGlow, { class: "h-80" }, { default: () => h("p", "Hello") }),
			})
		);
		expect(body).toContain("mosaic-glow");
		expect(body).toContain("h-80");
		expect(body).toContain("<canvas");
		expect(body).toContain("mosaic-glow__content");
		expect(body).toContain("<p>Hello</p>");
		expect(body).toContain("background-color:#0a0a0a");
	});

	it("is byte-identical across renders (no Math.random in markup)", async () => {
		const a = await renderToString(createSSRApp(MosaicGlow, { seed: 3 }));
		const b = await renderToString(createSSRApp(MosaicGlow, { seed: 3 }));
		expect(a).toBe(b);
	});
	it("keeps the background prop over a consumer style while keeping other consumer styles", async () => {
		const body = await renderToString(
			createSSRApp({
				render: () =>
					h(MosaicGlow, {
						background: "rgb(1,2,3)",
						style: "background-color: red; color: blue",
					}),
			})
		);
		expect(body).toContain("background-color:rgb(1,2,3)");
		expect(body).not.toContain("background-color:red");
		expect(body).toContain("color:blue");
	});
});
