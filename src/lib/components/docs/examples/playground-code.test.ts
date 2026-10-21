import { describe, expect, it } from "vitest";
import { dialogCode } from "./dialog/code.js";
import { toastCode } from "./toast/code.js";
import { selectCode } from "./select/code.js";
import { serializePlayground } from "$lib/docs/playground-code.js";
import type { Framework } from "$lib/inspiration/types.js";

const FRAMEWORKS: Framework[] = ["svelte", "react", "vue"];

const dialogValues = {
	title: "Invite a member",
	description: "Send an email invite to join the workspace.",
	dismissible: true,
};
const toastValues = {
	title: "Theme saved",
	description: "CSS copied to the clipboard.",
	variant: "success",
	position: "bottom-right",
};
const selectValues = { label: "Framework", placeholder: "Choose a framework", disabled: false };

/** Every double-quoted attribute value in a template, as the HTML parser would split it. */
function attributeValues(code: string): string[] {
	return [...code.matchAll(/="([^"]*)"/g)].map((m) => m[1]);
}

describe("playground codeFor, default values", () => {
	for (const framework of FRAMEWORKS) {
		it(`dialog writes code for ${framework}`, () => {
			const code = dialogCode(dialogValues, framework);
			expect(code).toContain("<Dialog");
			expect(code).toContain('title="Invite a member"');
		});
		it(`toast writes code for ${framework}`, () => {
			const code = toastCode(toastValues, framework);
			expect(code).toContain("<Toaster />");
			expect(code).toContain("Show toast");
		});
		it(`select writes code for ${framework}`, () => {
			const code = selectCode(selectValues, framework);
			expect(code).toContain("<Select");
			expect(code).toContain('label="Framework"');
		});
	}

	it("the Vue toast handler sits whole inside its double-quoted attribute", () => {
		const code = toastCode(toastValues, "vue");
		expect(code).toContain('@click="toast({');
		expect(code).not.toContain(":onclick");
		const handler = attributeValues(code).find((v) => v.startsWith("toast("));
		expect(handler).toBeDefined();
		expect(handler).toContain("title: 'Theme saved'");
		expect(handler).toContain("variant: 'success'");
		// Nothing but the closing quote of the attribute is a double quote.
		const open = code.indexOf('@click="') + '@click="'.length;
		const close = code.indexOf('">Show toast');
		expect(code.slice(open, close)).not.toContain('"');
	});

	it("no Vue export uses the deprecated onclick prop", () => {
		expect(dialogCode(dialogValues, "vue")).toContain('@click="open = false"');
		expect(dialogCode(dialogValues, "vue")).not.toContain(":onclick");
	});
});

describe("playground codeFor, awkward text", () => {
	const quoted = 'Say "hi" {now}';

	for (const framework of FRAMEWORKS) {
		it(`dialog escapes a double quote for ${framework}`, () => {
			const code = dialogCode({ ...dialogValues, title: quoted }, framework);
			expect(code).not.toContain('title="Say "');
			expect(code).not.toContain('\\"hi\\"" ');
			if (framework === "vue") expect(code).toContain(":title=\"'Say &quot;hi&quot; {now}'\"");
			else expect(code).toContain(`title={${JSON.stringify(quoted)}}`);
		});
		it(`select escapes a double quote for ${framework}`, () => {
			const code = selectCode({ ...selectValues, label: quoted }, framework);
			expect(code).not.toContain('label="Say "');
			if (framework === "vue") expect(code).toContain(":label=\"'Say &quot;hi&quot; {now}'\"");
			else expect(code).toContain(`label={${JSON.stringify(quoted)}}`);
		});
		it(`toast keeps a double quote in the text valid for ${framework}`, () => {
			const code = toastCode({ ...toastValues, title: quoted }, framework);
			if (framework === "vue") {
				const open = code.indexOf('@click="') + '@click="'.length;
				const close = code.indexOf('">Show toast');
				expect(code.slice(open, close)).not.toContain('"');
				expect(code).toContain("&quot;hi&quot;");
			} else {
				expect(code).toContain(`title: ${JSON.stringify(quoted)}`);
			}
		});
	}

	it("a single quote in Vue text stays inside the expression", () => {
		const code = toastCode({ ...toastValues, title: "It's saved" }, "vue");
		expect(code).toContain("title: 'It\\'s saved'");
	});
});

describe("serializer text escapes", () => {
	const base = { component: "Button", values: {}, initialValues: {}, children: "" };

	it("protects a Vue interpolation pair in children", () => {
		const code = serializePlayground({ ...base, framework: "vue", children: "{{x}}" });
		expect(code).toBe("<Button>{{ '{{' }}x}}</Button>");
	});

	it("writes a greater-than as an entity in React children", () => {
		const code = serializePlayground({ ...base, framework: "react", children: "a > b" });
		expect(code).toBe("<Button>a &gt; b</Button>");
	});

	it("leaves a greater-than alone in Svelte and Vue children", () => {
		for (const framework of ["svelte", "vue"] as const) {
			expect(serializePlayground({ ...base, framework, children: "a > b" })).toBe(
				"<Button>a > b</Button>"
			);
		}
	});
});
