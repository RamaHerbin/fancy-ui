import { describe, expect, it } from "vitest";
import { parseVueModels, vueModelsFor } from "./vue-models.js";

describe("parseVueModels", () => {
	it("reads the names given to defineModel", () => {
		const src = `
const open = defineModel<boolean>("open", { default: false });
const query = defineModel<string>('query');
const attachments = defineModel<AttachmentData[]>("attachments", { default: () => [] });
// a comment about \`defineModel\` is not a model
`;
		expect(parseVueModels(src)).toEqual(["open", "query", "attachments"]);
	});
});

describe("vueModelsFor", () => {
	it("lists the models the Vue port declares", () => {
		expect(vueModelsFor("code-diff", "CodeDiff")).toContain("collapsed");
		expect(vueModelsFor("tabs", "Tabs")).toContain("value");
		expect(vueModelsFor("checkbox", "Checkbox")).toEqual(
			expect.arrayContaining(["checked", "indeterminate"])
		);
	});

	it("leaves out props that are plain in the Vue port", () => {
		// Sidebar's `collapsed` is bindable in Svelte, a plain prop in Vue.
		expect(vueModelsFor("sidebar", "Sidebar")).not.toContain("collapsed");
	});

	it("qualifies a sub-component's models with its name", () => {
		expect(vueModelsFor("composer", "Composer")).toEqual(
			expect.arrayContaining(["value", "attachments", "ComposerModelPicker.value"])
		);
	});

	it("is empty for a component without a Vue port", () => {
		expect(vueModelsFor("no-such-component", "NoSuchComponent")).toEqual([]);
	});
});
