import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import Breadcrumbs from "./Breadcrumbs.svelte";
import { setLocale } from "$lib/stores";

describe("Breadcrumbs", () => {
	afterEach(() => {
		cleanup();
		setLocale("en");
	});

	function crumbs(container: HTMLElement): HTMLElement[] {
		// Separators are decorative; only the real crumbs carry content.
		return Array.from(container.querySelectorAll("ol > li:not([aria-hidden])"));
	}

	it("labels the navigation landmark from the a11y catalog", () => {
		const { container } = render(Breadcrumbs, { current: "RainbowButton" });
		expect(container.querySelector("nav")).toHaveAttribute("aria-label", "Breadcrumb");
	});

	it("renders Home → Components → current in an ordered list", () => {
		const { container } = render(Breadcrumbs, { current: "RainbowButton" });
		expect(container.querySelector("ol")).toBeInTheDocument();
		expect(crumbs(container).map((li) => li.textContent?.trim())).toEqual([
			"Home",
			"Components",
			"RainbowButton",
		]);
	});

	it("links the ancestor crumbs to the site root and the gallery", () => {
		const { container } = render(Breadcrumbs, { current: "RainbowButton" });
		const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
		expect(hrefs).toEqual(["/", "/docs/components"]);
	});

	it("marks the last crumb as the current page and never links it", () => {
		const { container } = render(Breadcrumbs, { current: "RainbowButton" });
		const last = crumbs(container).at(-1)!;
		expect(last).toHaveAttribute("aria-current", "page");
		expect(last.querySelector("a")).toBeNull();
	});

	it("translates the trail in the active locale", () => {
		setLocale("fr");
		const { container } = render(Breadcrumbs, { current: "RainbowButton" });
		expect(container.querySelector("nav")).toHaveAttribute("aria-label", "Fil d'Ariane");
		expect(crumbs(container).map((li) => li.textContent?.trim())).toEqual([
			"Accueil",
			"Composants",
			"RainbowButton",
		]);
	});
});
