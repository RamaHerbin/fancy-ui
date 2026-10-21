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

	describe.each<[string, Component<Record<string, never>>, string]>([
		["toast", ToastPlayground as unknown as Component<Record<string, never>>, "Toast"],
		["dialog", DialogPlayground as unknown as Component<Record<string, never>>, "Dialog"],
		["select", SelectPlayground as unknown as Component<Record<string, never>>, "Select"],
	])("%s playground follows the framework switch", (_slug, Playground, name) => {
		afterEach(() => setFramework("svelte"));

		it("re-emits the export block for React, Vue and back to Svelte", async () => {
			const { container } = render(Playground);
			await tick();
			const svelte = exportText(container);
			expect(svelte).toContain("Framework: Svelte");
			expect(svelte).toContain("pnpm add fancy-ui-svelte");
			expect(svelte).toContain(name);
			expect(svelte).toMatch(/Import: import \{[^}]*\} from "fancy-ui-svelte";/);

			setFramework("react");
			await tick();
			const react = exportText(container);
			expect(react).toContain("Framework: React");
			expect(react).toContain("pnpm add fancy-ui-react");
			expect(react).toMatch(/Import: import \{[^}]*\} from "fancy-ui-react/);
			expect(react).not.toContain("pnpm add fancy-ui-svelte");
			expect(react).not.toBe(svelte);

			setFramework("vue");
			await tick();
			const vue = exportText(container);
			expect(vue).toContain("Framework: Vue");
			expect(vue).toContain("pnpm add fancy-ui-vue");
			expect(vue).toMatch(/Import: import \{[^}]*\} from "fancy-ui-vue/);
			expect(vue).not.toBe(react);

			setFramework("svelte");
			await tick();
			expect(exportText(container)).toBe(svelte);
		});
	});
});
