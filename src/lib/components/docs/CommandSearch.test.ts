import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));

import CommandSearch from "./CommandSearch.svelte";
import { NO_RESULT_SUGGESTIONS, rankComponents } from "$lib/docs/search-rank.js";
import { searchComponents } from "$lib/fancy-ui/registry.js";

function labels(): string[] {
	return Array.from(document.querySelectorAll("[data-result]")).map(
		(el) => el.querySelector("span")?.textContent?.trim() ?? ""
	);
}

async function type(value: string) {
	const input = document.querySelector("input[type=text]") as HTMLInputElement;
	await fireEvent.input(input, { target: { value } });
}

describe("CommandSearch ranking", () => {
	afterEach(cleanup);

	it("puts Tabs first for the query tabs", async () => {
		render(CommandSearch, { open: true });
		await type("tabs");
		expect(labels()[0]).toBe("Tabs");
	});

	it("puts the exact name first even when the registry lists it later", async () => {
		// Precondition: the registry's own order does NOT start with Button.
		expect(searchComponents("button")[0]?.slug).not.toBe("button");
		render(CommandSearch, { open: true });
		await type("button");
		expect(labels()[0]).toBe("Button");
	});

	it("leaves the empty query as it was: five pages, then the first eight components", () => {
		render(CommandSearch, { open: true });
		expect(document.querySelectorAll('[data-result="page"]').length).toBe(5);
		expect(document.querySelectorAll('[data-result="component"]').length).toBe(8);
	});

	it("keeps the getting-started pages in the results", async () => {
		render(CommandSearch, { open: true });
		await type("install");
		expect(document.querySelector('[data-result="page"]')).not.toBeNull();
	});

	it("offers three suggested queries when nothing matches, each of which hits", async () => {
		render(CommandSearch, { open: true });
		await type("zzzzqq");
		const box = document.querySelector("[data-testid=search-no-results]") as HTMLElement;
		expect(box).not.toBeNull();
		const buttons = box.querySelectorAll("button");
		expect(buttons.length).toBe(3);
		for (const s of NO_RESULT_SUGGESTIONS) expect(rankComponents(s).length).toBeGreaterThan(0);
		await fireEvent.click(buttons[0]);
		expect((document.querySelector("input[type=text]") as HTMLInputElement).value).toBe(
			NO_RESULT_SUGGESTIONS[0]
		);
	});
});
