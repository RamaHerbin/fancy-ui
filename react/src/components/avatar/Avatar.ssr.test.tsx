// @vitest-environment node
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Avatar } from "./Avatar.js";

describe("Avatar (SSR)", () => {
	it("renders the skeleton and a hidden image for a src, so hydration starts from the same markup", () => {
		const html = renderToString(createElement(Avatar, { src: "/me.png", alt: "Maya Okafor" }));
		expect(html).toContain('data-status="loading"');
		expect(html).toContain('data-slot="skeleton"');
		expect(html).toContain('src="/me.png"');
		expect(html).toContain("opacity-0");
		expect(html).toContain('role="img"');
		expect(html).toContain('aria-label="Maya Okafor"');
	});

	it("renders the initials fallback with no image request", () => {
		const html = renderToString(createElement(Avatar, { name: "Maya Okafor" }));
		expect(html).toContain('data-status="fallback"');
		expect(html).toContain("MO");
		expect(html).not.toContain("<img");
	});

	it("renders a decorative avatar hidden", () => {
		const html = renderToString(createElement(Avatar, { name: "Maya Okafor", alt: "" }));
		expect(html).toContain('aria-hidden="true"');
		expect(html).not.toContain('role="img"');
	});

	it("is byte-identical across renders", () => {
		const props = { src: "/me.png", alt: "x", name: "Maya Okafor" };
		expect(renderToString(createElement(Avatar, props))).toBe(
			renderToString(createElement(Avatar, props))
		);
	});
});
