// @vitest-environment node
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import Avatar from "./Avatar.vue";

function html(props: Record<string, unknown>) {
	return renderToString(createSSRApp({ render: () => h(Avatar, props) }));
}

describe("Avatar (SSR)", () => {
	it("renders the skeleton and a hidden image for a src, so hydration starts from the same markup", async () => {
		const out = await html({ src: "/me.png", alt: "Maya Okafor" });
		expect(out).toContain('data-status="loading"');
		expect(out).toContain('data-slot="skeleton"');
		expect(out).toContain('src="/me.png"');
		expect(out).toContain("opacity-0");
		expect(out).toContain('role="img"');
		expect(out).toContain('aria-label="Maya Okafor"');
	});

	it("renders the initials fallback with no image request", async () => {
		const out = await html({ name: "Maya Okafor" });
		expect(out).toContain('data-status="fallback"');
		expect(out).toContain("MO");
		expect(out).not.toContain("<img");
	});

	it("renders a decorative avatar hidden", async () => {
		const out = await html({ name: "Maya Okafor", alt: "" });
		expect(out).toContain('aria-hidden="true"');
		expect(out).not.toContain('role="img"');
	});

	it("is byte-identical across renders", async () => {
		const props = { src: "/me.png", alt: "x", name: "Maya Okafor" };
		expect(await html(props)).toBe(await html(props));
	});
});
