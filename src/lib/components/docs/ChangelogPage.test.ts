import { render, screen, cleanup } from "@testing-library/svelte";
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
