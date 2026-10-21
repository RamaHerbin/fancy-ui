import { render, screen, cleanup, waitFor } from "@testing-library/svelte";
import { readable } from "svelte/store";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

vi.mock("$app/stores", () => ({
	page: readable({ url: new URL("http://localhost/docs/getting-started/changelog") }),
}));

import TableOfContents from "./TableOfContents.svelte";

describe("TableOfContents", () => {
	let main: HTMLElement;
	beforeEach(() => {
		main = document.createElement("main");
		main.setAttribute("data-doc-content", "");
		main.innerHTML = '<h2 id="one">One</h2><h3 id="one-a">One A</h3>';
		document.body.appendChild(main);
	});
	afterEach(() => {
		cleanup();
		main.remove();
	});

	it("lists the h2 and h3 headings of the page", async () => {
		render(TableOfContents);
		expect(await screen.findByRole("link", { name: "One" })).toHaveAttribute("href", "#one");
		expect(screen.getByRole("link", { name: "One A" })).toBeInTheDocument();
	});

	it("follows headings that are replaced on the same route", async () => {
		render(TableOfContents);
		await screen.findByRole("link", { name: "One" });
		main.innerHTML = '<h2 id="two">Two</h2><h2 id="three">Three</h2>';
		expect(await screen.findByRole("link", { name: "Two" })).toHaveAttribute("href", "#two");
		await waitFor(() => expect(screen.queryByRole("link", { name: "One" })).toBeNull());
		expect(screen.getByRole("link", { name: "Three" })).toBeInTheDocument();
	});
});
