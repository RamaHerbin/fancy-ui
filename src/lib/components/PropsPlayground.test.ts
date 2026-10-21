import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tick } from "svelte";
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
});
