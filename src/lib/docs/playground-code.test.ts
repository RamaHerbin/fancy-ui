import { describe, expect, it } from "vitest";
import {
	PACKAGE_BY_FRAMEWORK,
	buildExportBlock,
	serializePlayground,
	type SerializeInput,
} from "./playground-code.js";
import { PLAYGROUND_KEYS, PLAYGROUND_TEXT } from "./playground-text.js";

const initial = { variant: "solid", size: 2, disabled: false, label: "Save" };

function input(over: Partial<SerializeInput>): SerializeInput {
	return {
		framework: "svelte",
		component: "Button",
		values: initial,
		initialValues: initial,
		...over,
	};
}

describe("serializePlayground", () => {
	it("omits every value equal to its initial one", () => {
		expect(serializePlayground(input({}))).toBe("<Button />");
		expect(serializePlayground(input({ framework: "react" }))).toBe("<Button />");
		expect(serializePlayground(input({ framework: "vue" }))).toBe("<Button />");
	});

	const changed = { ...initial, variant: "ghost", size: 3, disabled: true };
	const table = [
		{ framework: "svelte" as const, expected: '<Button variant="ghost" size={3} disabled />' },
		{ framework: "react" as const, expected: '<Button variant="ghost" size={3} disabled />' },
		{ framework: "vue" as const, expected: '<Button variant="ghost" :size="3" disabled />' },
	];
	for (const row of table) {
		it(`writes changed props as ${row.framework} attributes`, () => {
			expect(serializePlayground(input({ framework: row.framework, values: changed }))).toBe(
				row.expected
			);
		});
	}

	it("writes a boolean turned off from an initial true as an explicit false", () => {
		const base = { ...initial, disabled: true };
		const values = { ...base, disabled: false };
		expect(serializePlayground(input({ initialValues: base, values }))).toBe(
			"<Button disabled={false} />"
		);
		expect(serializePlayground(input({ framework: "vue", initialValues: base, values }))).toBe(
			'<Button :disabled="false" />'
		);
	});

	it("maps class to className for React and keeps it for Svelte and Vue", () => {
		const values = { ...initial, class: "w-full" };
		expect(serializePlayground(input({ values }))).toBe('<Button class="w-full" />');
		expect(serializePlayground(input({ framework: "react", values }))).toBe(
			'<Button className="w-full" />'
		);
		expect(serializePlayground(input({ framework: "vue", values }))).toBe(
			'<Button class="w-full" />'
		);
	});

	it("wraps children text and escapes markup characters", () => {
		const values = { ...initial, size: 3 };
		expect(serializePlayground(input({ values, children: "Save" }))).toBe(
			"<Button size={3}>Save</Button>"
		);
		expect(serializePlayground(input({ framework: "vue", values, children: "a < b" }))).toBe(
			'<Button :size="3">a &lt; b</Button>'
		);
	});

	it("writes a childrenKey value as the children and a required prop even when unchanged", () => {
		const values = { ...initial, label: "Go" };
		expect(
			serializePlayground(input({ values, childrenKey: "label", required: ["variant"] }))
		).toBe('<Button variant="solid">Go</Button>');
	});

	it("quotes strings that contain a double quote without breaking the attribute", () => {
		const values = { ...initial, label: 'Say "hi"' };
		expect(serializePlayground(input({ values }))).toBe('<Button label={"Say \\"hi\\""} />');
		expect(serializePlayground(input({ framework: "react", values }))).toBe(
			'<Button label={"Say \\"hi\\""} />'
		);
		expect(serializePlayground(input({ framework: "vue", values }))).toBe(
			`<Button :label="'Say &quot;hi&quot;'" />`
		);
	});

	it("names fixed callbacks per framework through the port rules", () => {
		const callbacks = [{ name: "onclick", handler: "save" }];
		expect(serializePlayground(input({ callbacks }))).toBe("<Button onclick={save} />");
		expect(serializePlayground(input({ framework: "react", callbacks }))).toBe(
			"<Button onClick={save} />"
		);
		expect(serializePlayground(input({ framework: "vue", callbacks }))).toBe(
			'<Button @click="save" />'
		);
	});

	it("writes a Vue model as the plain prop, since a literal cannot be v-model bound", () => {
		const out = serializePlayground(
			input({
				framework: "vue",
				component: "Select",
				values: { ...initial, value: "b" },
				initialValues: { ...initial, value: "a" },
				ports: { vueModels: ["value"] },
			})
		);
		expect(out).toBe('<Select value="b" />');
	});

	it("breaks a long tag over several lines", () => {
		const values = { ...initial, variant: "ghost-with-a-very-long-name", label: "x".repeat(60) };
		const out = serializePlayground(input({ values }));
		expect(out.startsWith("<Button\n\t")).toBe(true);
		expect(out.endsWith("\n/>")).toBe(true);
	});

	it("prefers the component's own codeFor output", () => {
		const codeFor = (values: Record<string, unknown>, fw: string) => `${fw}:${values.size}`;
		expect(serializePlayground(input({ framework: "react", codeFor }))).toBe("react:2");
	});
});

describe("buildExportBlock", () => {
	const base = {
		framework: "react" as const,
		importNames: ["Button"],
		code: "<Button />",
		constraints: ["Mount it in a sized container."],
	};

	it("lists framework, install line, import, code and constraints in a fenced text block", () => {
		const block = buildExportBlock(base);
		expect(block.startsWith("```text\n")).toBe(true);
		expect(block.endsWith("\n```")).toBe(true);
		expect(block).toContain("Framework: React");
		expect(block).toContain(`pnpm add ${PACKAGE_BY_FRAMEWORK.react}`);
		expect(block).toContain('import { Button } from "fancy-ui-react";');
		expect(block).toContain("<Button />");
		expect(block).toContain("- Mount it in a sized container.");
	});

	it("writes the package per framework", () => {
		expect(buildExportBlock({ ...base, framework: "svelte" })).toContain(
			'import { Button } from "fancy-ui-svelte";'
		);
		const vue = buildExportBlock({ ...base, framework: "vue" });
		expect(vue).toContain('import { Button } from "fancy-ui-vue";');
		expect(vue).toContain("Framework: Vue");
	});

	it("omits the constraints section when there are none", () => {
		expect(buildExportBlock({ ...base, constraints: [] })).not.toContain("Constraints");
	});

	it("keeps a closing fence in the code from ending the block early", () => {
		const block = buildExportBlock({ ...base, code: "a\n```\nb" });
		expect(block.match(/^```/gm)?.length).toBe(2);
	});
});

describe("playground text keys", () => {
	it("lists every playground.* key with an English text", () => {
		expect(PLAYGROUND_KEYS.length).toBeGreaterThan(0);
		for (const key of PLAYGROUND_KEYS) {
			expect(key.startsWith("playground.")).toBe(true);
			expect(PLAYGROUND_TEXT[key].length).toBeGreaterThan(0);
		}
		expect(Object.keys(PLAYGROUND_TEXT).sort()).toEqual([...PLAYGROUND_KEYS].sort());
	});
});
