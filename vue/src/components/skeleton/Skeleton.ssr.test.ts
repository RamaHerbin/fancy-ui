// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import Skeleton from "./Skeleton.vue";

// The shimmer phase is only known after mount, so the server has nothing to
// put in `style`. Binding an object whose only entry is `undefined` still
// makes Vue's SSR renderer write `style=""`, where the Svelte source writes no
// attribute at all — so the binding is dropped entirely while it is empty.
describe("Skeleton (SSR)", () => {
	it("writes no style attribute in standalone mode", async () => {
		const html = await renderToString(createSSRApp(Skeleton));
		expect(html).toContain('role="status"');
		expect(html).not.toContain("style=");
	});

	it("writes no style attribute in wrapping mode", async () => {
		const html = await renderToString(
			createSSRApp({ render: () => h(Skeleton, null, { default: () => h("p", "Real content") }) })
		);
		expect(html).toContain('aria-busy="true"');
		expect(html).not.toContain("style=");
	});

	it("still forwards a caller-supplied style", async () => {
		const html = await renderToString(createSSRApp(Skeleton, { style: "width: 12rem" }));
		expect(html).toContain('style="width:12rem;"');
		expect(html).not.toContain("--ft-skeleton-phase");
	});
});
