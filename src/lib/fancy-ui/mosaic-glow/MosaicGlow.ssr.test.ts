// @vitest-environment node
import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import { createRawSnippet } from "svelte";
import MosaicGlow from "./MosaicGlow.svelte";

describe("MosaicGlow (SSR)", () => {
	it("renders the host, canvas and children without touching window or randomness", () => {
		const children = createRawSnippet(() => ({ render: () => "<p>Hello</p>" }));
		const { body } = render(MosaicGlow, { props: { class: "h-80", children } });
		expect(body).toContain("mosaic-glow");
		expect(body).toContain("h-80");
		expect(body).toContain("<canvas");
		expect(body).toContain("mosaic-glow__content");
		expect(body).toContain("<p>Hello</p>");
		expect(body).toContain("background-color: #0a0a0a");
	});

	it("is byte-identical across renders (no Math.random in markup)", () => {
		const a = render(MosaicGlow, { props: { seed: 3 } }).body;
		const b = render(MosaicGlow, { props: { seed: 3 } }).body;
		expect(a).toBe(b);
	});
});
