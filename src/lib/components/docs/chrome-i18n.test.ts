import { readFileSync } from "node:fs";
import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));

import CommandSearch from "./CommandSearch.svelte";
import { setLocale } from "$lib/stores";

const OWNED = [
	"src/lib/components/docs/ComponentPreview.svelte",
	"src/lib/components/docs/CommandSearch.svelte",
	"src/lib/components/docs/DemoRenderer.svelte",
	"src/routes/docs/recipes/[slug]/+page.svelte",
	"src/routes/docs/getting-started/introduction/+page.svelte",
	"src/routes/docs/getting-started/installation/+page.svelte",
	"src/routes/docs/getting-started/theming/+page.svelte",
	"src/routes/docs/getting-started/theme-generator/+page.svelte",
	"src/routes/docs/getting-started/changelog/+page.svelte",
];

// Each phrase was once a literal English label in the owned files.
const FORBIDDEN = [
	"Preview",
	"Code",
	"Close search",
	"No preview available",
	"Component not found in module",
	"Steps",
	"Pitfalls",
	"Components used",
];

describe("docs chrome carries no hard-coded English", () => {
	for (const file of OWNED) {
		it(file, () => {
			const src = readFileSync(file, "utf8");
			for (const phrase of FORBIDDEN) {
				const asText = new RegExp(`(^|>)\\s*${phrase}\\s*(<|$)`, "m");
				expect(asText.test(src), `${phrase} as literal text`).toBe(false);
				expect(src.includes(`"${phrase}"`), `${phrase} as literal attribute`).toBe(false);
			}
		});
	}
});

describe("CommandSearch localized index", () => {
	afterEach(() => {
		cleanup();
		setLocale("en");
	});

	it("finds the Buttons category from the French word", async () => {
		setLocale("fr");
		render(CommandSearch, { open: true });
		const input = document.querySelector("input[type=text]") as HTMLInputElement;
		await fireEvent.input(input, { target: { value: "bouton" } });
		expect(document.querySelectorAll('[data-result="component"]').length).toBeGreaterThan(0);
	});

	it("labels the close backdrop", () => {
		render(CommandSearch, { open: true });
		expect(document.querySelector("button[aria-label]")?.getAttribute("aria-label")).toBeTruthy();
	});
});
