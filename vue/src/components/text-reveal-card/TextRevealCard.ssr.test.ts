// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import TextRevealCard from "./TextRevealCard.vue";
import TextRevealStars from "./TextRevealStars.vue";

describe("TextRevealCard (SSR)", () => {
	it("renders identically twice (seeded star field, no random drift)", async () => {
		const first = await renderToString(createSSRApp(TextRevealCard, {}));
		const second = await renderToString(createSSRApp(TextRevealCard, {}));
		expect(first).toBe(second);
		expect(first).toContain("star-animate");
		expect(first).toContain("--target-top");
	});

	it("gives two cards different star fields when their seeds differ", async () => {
		const a = await renderToString(createSSRApp(TextRevealCard, { starsSeed: 1 }));
		const b = await renderToString(createSSRApp(TextRevealCard, { starsSeed: 2 }));
		expect(a).not.toBe(b);
	});

	it("renders the star field identically twice", async () => {
		const first = await renderToString(createSSRApp(TextRevealStars, {}));
		const second = await renderToString(createSSRApp(TextRevealStars, {}));
		expect(first).toBe(second);
	});
});
