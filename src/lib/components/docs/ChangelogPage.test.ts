import { render, screen, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import { getFramework, setFramework } from "$lib/stores/framework.svelte.js";
import ChangelogPage from "./ChangelogPage.svelte";

const FIXTURE = `# Changelog

## 0.2.0

### Minor Changes

- abc1234: feat: add a thing

## 0.1.0 — 2026-03-13

### Added

First release.
`;

describe("ChangelogPage", () => {
	afterEach(() => {
		cleanup();
		setFramework("svelte");
	});

	it("renders the H1 title", () => {
		render(ChangelogPage, { raw: FIXTURE });
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Changelog");
	});

	it("renders one anchored h2 per version", () => {
		render(ChangelogPage, { raw: FIXTURE });
		expect(document.querySelector("h2#v0-2-0")).toHaveTextContent("0.2.0");
		expect(document.querySelector("h2#v0-1-0")).toHaveTextContent("0.1.0");
	});

	it("shows the Latest badge only on the newest version", () => {
		const { container } = render(ChangelogPage, { raw: FIXTURE });
		const badges = container.querySelectorAll(".latest");
		expect(badges).toHaveLength(1);
		expect(badges[0].closest(".release")?.querySelector("h2")?.id).toBe("v0-2-0");
	});

	it("renders known bump kinds as translated labels and unknown kinds verbatim", () => {
		const { container } = render(ChangelogPage, { raw: FIXTURE });
		const kinds = Array.from(container.querySelectorAll(".kind")).map((k) => k.textContent);
		expect(kinds).toEqual(["Minor changes", "Added"]);
	});

	it("renders the release date when present", () => {
		const { container } = render(ChangelogPage, { raw: FIXTURE });
		expect(container.querySelector(".date")).toHaveTextContent("2026-03-13");
	});
});

describe("ChangelogPage with several packages", () => {
	afterEach(() => {
		cleanup();
		setFramework("svelte");
	});
	const packages = [
		{ id: "svelte", name: "fancy-ui-svelte", raw: FIXTURE },
		{
			id: "react",
			name: "fancy-ui-react",
			raw: "# r\n\n## 0.2.0\n\n### Patch Changes\n\n- abc1234: react fix\n",
		},
	];

	it("renders one tab per package and shows the first by default", () => {
		render(ChangelogPage, { packages });
		const tabs = screen.getAllByRole("tab");
		expect(tabs.map((t) => t.textContent?.trim())).toEqual(["fancy-ui-svelte", "fancy-ui-react"]);
		expect(tabs[0]).toHaveAttribute("aria-selected", "true");
		expect(document.querySelector("h2#v0-2-0")).not.toBeNull();
		expect(document.querySelector("h2#react-v0-2-0")).toBeNull();
	});

	it("switches the visible release list when another tab is chosen", async () => {
		render(ChangelogPage, { packages });
		await fireEvent.click(screen.getAllByRole("tab")[1]);
		expect(document.querySelector("h2#react-v0-2-0")).toHaveTextContent("0.2.0");
		expect(document.querySelector("h2#v0-2-0")).toBeNull();
		expect(document.querySelectorAll(".latest")).toHaveLength(1);
	});

	it("shows no tab bar for the single raw form", () => {
		render(ChangelogPage, { raw: FIXTURE });
		expect(screen.queryAllByRole("tab")).toHaveLength(0);
	});
});

const THREE = [
	{
		id: "svelte",
		name: "fancy-ui-svelte",
		raw: "# s\n\n## 0.3.0\n\n### Patch Changes\n\n- abc1234: svelte fix\n",
	},
	{
		id: "react",
		name: "fancy-ui-react",
		raw: "# r\n\n## 0.2.0\n\n### Patch Changes\n\n- abc1234: react fix\n",
	},
	{
		id: "vue",
		name: "fancy-ui-vue",
		raw: "# v\n\n## 0.1.0\n\n### Patch Changes\n\n- abc1234: vue fix\n",
	},
];

function reset() {
	cleanup();
	setFramework("svelte");
	history.replaceState(null, "", "/");
}

describe("ChangelogPage tabs behave as tabs", () => {
	afterEach(reset);
	const packages = THREE;

	it("links each tab to one tabpanel that holds the release list", () => {
		render(ChangelogPage, { packages });
		const tabs = screen.getAllByRole("tab");
		const panel = screen.getByRole("tabpanel");
		const selected = tabs.find((t) => t.getAttribute("aria-selected") === "true")!;
		expect(selected.getAttribute("aria-controls")).toBe(panel.id);
		expect(panel.getAttribute("aria-labelledby")).toBe(selected.id);
		expect(panel.querySelector("h2#v0-3-0")).not.toBeNull();
		for (const t of tabs) expect(t.id).not.toBe("");
	});

	it("keeps only the selected tab in the Tab order", () => {
		render(ChangelogPage, { packages });
		const tabs = screen.getAllByRole("tab");
		expect(tabs.map((t) => t.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
	});

	it("moves selection and focus with the arrow, Home and End keys", async () => {
		render(ChangelogPage, { packages });
		const tabs = () => screen.getAllByRole("tab");
		tabs()[0].focus();
		await fireEvent.keyDown(tabs()[0], { key: "ArrowRight" });
		expect(tabs()[1]).toHaveAttribute("aria-selected", "true");
		await vi.waitFor(() => expect(document.activeElement).toBe(tabs()[1]));
		await fireEvent.keyDown(tabs()[1], { key: "End" });
		expect(tabs()[2]).toHaveAttribute("aria-selected", "true");
		await fireEvent.keyDown(tabs()[2], { key: "ArrowRight" });
		expect(tabs()[0]).toHaveAttribute("aria-selected", "true");
		await fireEvent.keyDown(tabs()[0], { key: "ArrowLeft" });
		expect(tabs()[2]).toHaveAttribute("aria-selected", "true");
		await fireEvent.keyDown(tabs()[2], { key: "Home" });
		expect(tabs()[0]).toHaveAttribute("aria-selected", "true");
		await vi.waitFor(() => expect(document.activeElement).toBe(tabs()[0]));
	});
});

describe("ChangelogPage follows the framework choice and the address", () => {
	afterEach(reset);
	const packages = THREE;
	const selected = (name: string) =>
		expect(screen.getByRole("tab", { name })).toHaveAttribute("aria-selected", "true");

	it("opens the tab of the saved framework preference", async () => {
		setFramework("vue");
		render(ChangelogPage, { packages });
		await vi.waitFor(() => expect(document.querySelector("h2#vue-v0-1-0")).not.toBeNull());
		selected("fancy-ui-vue");
	});

	it("opens the package named by a deep link to one of its releases", async () => {
		history.replaceState(null, "", "/#react-v0-2-0");
		render(ChangelogPage, { packages });
		await vi.waitFor(() => expect(document.querySelector("h2#react-v0-2-0")).not.toBeNull());
		selected("fancy-ui-react");
	});

	it("keeps the first package for an unprefixed release anchor", async () => {
		setFramework("react");
		history.replaceState(null, "", "/#v0-3-0");
		render(ChangelogPage, { packages });
		await vi.waitFor(() => expect(document.querySelector("h2#v0-3-0")).not.toBeNull());
		selected("fancy-ui-svelte");
	});

	it("records a tab choice as the framework preference", async () => {
		render(ChangelogPage, { packages });
		await fireEvent.click(screen.getByRole("tab", { name: "fancy-ui-react" }));
		expect(getFramework()).toBe("react");
	});

	it("follows a framework switch made elsewhere on the site", async () => {
		render(ChangelogPage, { packages });
		setFramework("vue");
		await vi.waitFor(() => expect(document.querySelector("h2#vue-v0-1-0")).not.toBeNull());
	});
});
