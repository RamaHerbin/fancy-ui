import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tick, type Component } from "svelte";
import { setFramework } from "$lib/stores/framework.svelte.js";
import PropsPlaygroundHarness from "./PropsPlaygroundHarness.test.svelte";
import ToastPlayground from "./docs/examples/toast/Playground.svelte";
import DialogPlayground from "./docs/examples/dialog/Playground.svelte";
import SelectPlayground from "./docs/examples/select/Playground.svelte";

vi.mock("shiki", () => ({
	createHighlighter: async () => ({ codeToHtml: () => "", loadLanguage: async () => {} }),
}));

describe("PropsPlayground export", () => {
	afterEach(cleanup);

	const exportText = (container: HTMLElement) =>
		container.querySelector("[data-playground-export] pre")?.textContent ?? "";

	it("shows only the initial code until a control changes", () => {
		const { container } = render(PropsPlaygroundHarness);
		const text = exportText(container);
		expect(text).toContain("<Button />");
		expect(text).toContain("Framework: Svelte");
		expect(text).toContain("pnpm add fancy-ui-svelte");
		expect(text).toContain("Mount it in a sized container.");
	});

	it("follows a changed control and restores both values and code on Reset", async () => {
		const { container, getByRole } = render(PropsPlaygroundHarness);
		await fireEvent.input(container.querySelector("#ctrl-size")!, { target: { value: "5" } });
		expect(exportText(container)).toContain("<Button size={5} />");
		expect(container.querySelector("[data-testid=size]")?.textContent).toBe("5");

		await fireEvent.click(getByRole("button", { name: "Reset" }));
		expect(exportText(container)).toContain("<Button />");
		expect(exportText(container)).not.toContain("size={5}");
		expect(container.querySelector("[data-testid=size]")?.textContent).toBe("2");
	});

	const codeOf = (container: HTMLElement) => {
		const text = exportText(container);
		const at = text.indexOf("\nCode:\n");
		expect(at).toBeGreaterThan(-1);
		return text.slice(at + "\nCode:\n".length);
	};

	type Row = [string, Component<Record<string, never>>, string, string, string];
	describe.each<Row>([
		[
			"toast",
			ToastPlayground as unknown as Component<Record<string, never>>,
			"<Toast",
			"onClick={() =>",
			'@click="',
		],
		[
			"dialog",
			DialogPlayground as unknown as Component<Record<string, never>>,
			"<Dialog",
			"onOpenChange=",
			"v-model:open=",
		],
		[
			"select",
			SelectPlayground as unknown as Component<Record<string, never>>,
			"<Select",
			"onValueChange=",
			"v-model:value=",
		],
	])(
		"%s playground follows the framework switch",
		(_slug, Playground, tag, reactMarker, vueMarker) => {
			afterEach(() => setFramework("svelte"));

			it("re-emits the export block for React, Vue and back to Svelte", async () => {
				const { container } = render(Playground);
				await tick();
				const svelte = exportText(container);
				const svelteCode = codeOf(container);
				expect(svelte).toContain("Framework: Svelte");
				expect(svelte).toContain("pnpm add fancy-ui-svelte");
				expect(svelte).toMatch(/Import: import \{[^}]*\} from "fancy-ui-svelte";/);
				expect(svelteCode).toContain(tag);
				expect(svelteCode).not.toContain(reactMarker);
				expect(svelteCode).not.toContain(vueMarker);

				setFramework("react");
				await tick();
				const react = exportText(container);
				const reactCode = codeOf(container);
				expect(react).toContain("Framework: React");
				expect(react).toContain("pnpm add fancy-ui-react");
				expect(react).toMatch(/Import: import \{[^}]*\} from "fancy-ui-react/);
				expect(react).not.toContain("pnpm add fancy-ui-svelte");
				expect(reactCode).toContain(reactMarker);
				expect(reactCode).not.toBe(svelteCode);

				setFramework("vue");
				await tick();
				const vue = exportText(container);
				const vueCode = codeOf(container);
				expect(vue).toContain("Framework: Vue");
				expect(vue).toContain("pnpm add fancy-ui-vue");
				expect(vue).toMatch(/Import: import \{[^}]*\} from "fancy-ui-vue/);
				expect(vueCode).toContain(vueMarker);
				expect(vueCode).not.toBe(reactCode);
				expect(vueCode).not.toBe(svelteCode);

				setFramework("svelte");
				await tick();
				expect(codeOf(container)).toBe(svelteCode);
				expect(exportText(container)).toBe(svelte);
			});
		}
	);
});
