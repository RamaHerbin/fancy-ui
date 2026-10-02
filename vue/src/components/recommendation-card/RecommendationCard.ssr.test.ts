// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import RecommendationCard from "./RecommendationCard.vue";

const TITLE = "Add an index on orders.customer_id";

describe("RecommendationCard (SSR)", () => {
	it("renders the open card with the ring empty and no window access", async () => {
		const html = await renderToString(
			createSSRApp(RecommendationCard, { title: TITLE, confidence: 0.8, badge: "Suggestion" })
		);

		expect(html).toContain('data-state="open"');
		expect(html).toContain('data-band="done"');
		expect(html).toContain("ft-rec-accept");
		expect(html).toContain("ft-rec-dismiss");
		// Nothing is scheduled at construction time: the ring arrives empty and
		// fills on hydration.
		expect(html).toContain(`stroke-dashoffset="${2 * Math.PI * 13}"`);
	});

	it("renders identically twice (no Math.random/Date.now drift)", async () => {
		const first = await renderToString(createSSRApp(RecommendationCard, { title: TITLE }));
		const second = await renderToString(createSSRApp(RecommendationCard, { title: TITLE }));
		expect(first).toBe(second);
	});
});
