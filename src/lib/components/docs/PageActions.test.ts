import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import { readable } from "svelte/store";

vi.mock("$app/stores", () => ({
	page: readable({ url: new URL("http://localhost/docs/getting-started/installation") }),
}));

import PageActions from "./PageActions.svelte";
import { setLocale, createFrameworkState } from "$lib/stores";

describe("PageActions", () => {
	afterEach(() => {
		cleanup();
		setLocale("en");
	});

	it("renders an edit link to the develop branch editor", () => {
		const { getByText } = render(PageActions, {
			sourcePath: "src/lib/components/docs/InstallationPage.svelte",
			name: "Installation",
		});
		const a = getByText("Edit this page").closest("a")!;
		expect(a.getAttribute("href")).toBe(
			"https://github.com/RamaHerbin/fancy-ui/edit/develop/src/lib/components/docs/InstallationPage.svelte"
		);
		expect(a.getAttribute("rel")).toContain("noopener");
	});

	it("opens a folder in the tree view instead of the editor", () => {
		const { getByText } = render(PageActions, {
			sourcePath: "src/lib/fancy-ui/accordion",
			name: "Accordion",
		});
		expect(getByText("Edit this page").closest("a")!.getAttribute("href")).toBe(
			"https://github.com/RamaHerbin/fancy-ui/tree/develop/src/lib/fancy-ui/accordion"
		);
	});

	it("pre-fills the bug report with template, title, page URL and framework", () => {
		const { getByText } = render(PageActions, {
			sourcePath: "src/lib/components/docs/InstallationPage.svelte",
			name: "Installation",
		});
		const href = getByText("Report an issue").closest("a")!.getAttribute("href")!;
		const url = new URL(href);
		expect(url.pathname).toBe("/RamaHerbin/fancy-ui/issues/new");
		expect(url.searchParams.get("template")).toBe("bug_report.yml");
		expect(url.searchParams.get("title")).toBe("[docs] Installation");
		const framework = createFrameworkState().framework;
		expect(url.searchParams.get("body")).toBe(
			`Page: http://localhost/docs/getting-started/installation\nFramework: ${framework}`
		);
	});

	it("localizes the labels", () => {
		setLocale("fr");
		const { container } = render(PageActions, { sourcePath: "a/b.ts", name: "X" });
		expect(container.textContent).not.toContain("Edit this page");
	});

	it("omits the edit link when there is no source path", () => {
		const { queryByText } = render(PageActions, { sourcePath: null, name: "X" });
		expect(queryByText("Edit this page")).toBeNull();
		expect(queryByText("Report an issue")).not.toBeNull();
	});
});
