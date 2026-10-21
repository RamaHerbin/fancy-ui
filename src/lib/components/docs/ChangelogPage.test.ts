import { render, screen, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
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
	afterEach(cleanup);

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
	afterEach(cleanup);
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
