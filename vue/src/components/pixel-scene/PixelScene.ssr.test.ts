// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import PixelScene from "./PixelScene.vue";

describe("PixelScene (SSR)", () => {
	it("renders the host, exactly one canvas and the slot, without the HDR layer", async () => {
		const body = await renderToString(
			createSSRApp({
				render: () =>
					h(PixelScene, { class: "h-80", night: true }, { default: () => h("p", "Hello") }),
			})
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

	it("is byte-identical across renders", async () => {
		const a = await renderToString(createSSRApp(PixelScene, { scene: "sea" }));
		const b = await renderToString(createSSRApp(PixelScene, { scene: "sea" }));
		expect(a).toBe(b);
	});
});
