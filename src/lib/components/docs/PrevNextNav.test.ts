import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import PrevNextNav from "./PrevNextNav.svelte";
import { setLocale } from "$lib/stores";
import { getAllComponents } from "$lib/fancy-ui/registry.js";

/** The same alphabetical sequence the component walks. */
const ordered = getAllComponents().sort((a, b) => a.name.localeCompare(b.name, "en"));
const first = ordered[0];
const second = ordered[1];
const last = ordered[ordered.length - 1];
const penultimate = ordered[ordered.length - 2];
const middle = ordered[Math.floor(ordered.length / 2)];

function link(container: HTMLElement, rel: "prev" | "next"): HTMLAnchorElement | null {
	return container.querySelector(`a[rel="${rel}"]`);
}

describe("PrevNextNav", () => {
	afterEach(() => {
		cleanup();
		setLocale("en");
	});

	it("links both neighbours of a component in the middle of the sequence", () => {
		const index = ordered.indexOf(middle);
		const { container } = render(PrevNextNav, { slug: middle.slug });

		expect(link(container, "prev")).toHaveAttribute(
			"href",
			`/docs/components/${ordered[index - 1].slug}`
		);
		expect(link(container, "next")).toHaveAttribute(
			"href",
			`/docs/components/${ordered[index + 1].slug}`
		);
	});

	it("labels each link with its direction and the target component name", () => {
		const { container } = render(PrevNextNav, { slug: middle.slug });
		const index = ordered.indexOf(middle);

		expect(link(container, "prev")?.textContent).toContain("Previous");
		expect(link(container, "prev")?.textContent).toContain(ordered[index - 1].name);
		expect(link(container, "next")?.textContent).toContain("Next");
		expect(link(container, "next")?.textContent).toContain(ordered[index + 1].name);
	});

	it("does not wrap past the first component", () => {
		const { container } = render(PrevNextNav, { slug: first.slug });
		expect(link(container, "prev")).toBeNull();
		expect(link(container, "next")).toHaveAttribute("href", `/docs/components/${second.slug}`);
	});

	it("does not wrap past the last component", () => {
		const { container } = render(PrevNextNav, { slug: last.slug });
		expect(link(container, "next")).toBeNull();
		expect(link(container, "prev")).toHaveAttribute("href", `/docs/components/${penultimate.slug}`);
	});

	it("renders nothing for a slug that is not in the registry", () => {
		const { container } = render(PrevNextNav, { slug: "not-a-component" });
		expect(container.querySelector("nav")).toBeNull();
	});

	it("translates the direction labels in the active locale", () => {
		setLocale("fr");
		const { container } = render(PrevNextNav, { slug: middle.slug });
		expect(link(container, "prev")?.textContent).toContain("Précédent");
		expect(link(container, "next")?.textContent).toContain("Suivant");
	});
});
