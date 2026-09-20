// @vitest-environment node
import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, it, expect } from "vitest";
import { useFancyId } from "./use-id.js";

const IdProbe = defineComponent({
	name: "IdProbe",
	setup() {
		const id = useFancyId();
		return () => h("div", { id }, id);
	},
});

describe("useFancyId", () => {
	it("is SSR-stable: two server renders of the same app produce the same id", async () => {
		const first = await renderToString(createSSRApp(IdProbe));
		const second = await renderToString(createSSRApp(IdProbe));
		expect(first).toBe(second);
	});

	it("is not transformed with a prefix", async () => {
		const html = await renderToString(createSSRApp(IdProbe));
		expect(html).toMatch(/id="v-\d+"/);
	});
});
