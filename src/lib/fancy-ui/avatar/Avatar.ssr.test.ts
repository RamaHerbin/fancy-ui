// @vitest-environment node
import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import Avatar from "./Avatar.svelte";

describe("Avatar (SSR)", () => {
	it("renders the skeleton and a hidden image for a src, so hydration starts from the same markup", () => {
		const { body } = render(Avatar, { props: { src: "/me.png", alt: "Maya Okafor" } });
		expect(body).toContain('data-status="loading"');
		expect(body).toContain('data-slot="skeleton"');
		expect(body).toContain('src="/me.png"');
		expect(body).toContain("opacity-0");
		expect(body).toContain('role="img"');
		expect(body).toContain('aria-label="Maya Okafor"');
	});

	it("renders the initials fallback with no image request", () => {
		const { body } = render(Avatar, { props: { name: "Maya Okafor" } });
		expect(body).toContain('data-status="fallback"');
		expect(body).toContain("MO");
		expect(body).not.toContain("<img");
	});

	it("renders a decorative avatar hidden", () => {
		const { body } = render(Avatar, { props: { name: "Maya Okafor", alt: "" } });
		expect(body).toContain('aria-hidden="true"');
		expect(body).not.toContain('role="img"');
	});

	it("is byte-identical across renders", () => {
		const props = { src: "/me.png", alt: "x", name: "Maya Okafor" };
		expect(render(Avatar, { props }).body).toBe(render(Avatar, { props }).body);
	});
});
