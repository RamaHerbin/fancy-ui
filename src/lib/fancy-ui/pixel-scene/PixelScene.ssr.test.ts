// @vitest-environment node
import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import { createRawSnippet } from "svelte";
import PixelScene from "./PixelScene.svelte";

describe("PixelScene (SSR)", () => {
	it("renders the host, a single canvas and the children, without HDR", () => {
		const children = createRawSnippet(() => ({ render: () => "<p>Hello</p>" }));
		const { body } = render(PixelScene, { props: { class: "h-80", night: true, children } });
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
		const a = render(PixelScene, { props: { scene: "sea" } }).body;
		const b = render(PixelScene, { props: { scene: "sea" } }).body;
		expect(a).toBe(b);
	});
});
