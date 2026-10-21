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

	it("each empty-state suggestion chip searches for what it says", async () => {
		for (const locale of ["en", "fr"] as const) {
			setLocale(locale);
			const { unmount } = render(CommandSearch, { open: true });
			const input = document.querySelector("input[type=text]") as HTMLInputElement;
			await fireEvent.input(input, { target: { value: "zzzzqqqq" } });
			const labels = Array.from(
				document.querySelectorAll('[data-testid="search-no-results"] button')
			).map((b) => b.textContent?.trim() ?? "");
			expect(labels.length).toBe(3);
			for (const label of labels) {
				await fireEvent.input(input, { target: { value: "zzzzqqqq" } });
				const chip = Array.from(
					document.querySelectorAll('[data-testid="search-no-results"] button')
				).find((b) => b.textContent?.trim() === label)!;
				await fireEvent.click(chip);
				expect(input.value).toBe(label);
				expect(
					document.querySelectorAll('[data-result="component"]').length,
					`${locale} chip "${label}"`
				).toBeGreaterThan(0);
			}
			unmount();
		}
	});

	it("a job title finds that job's components", async () => {
		render(CommandSearch, { open: true });
		const input = document.querySelector("input[type=text]") as HTMLInputElement;
		await fireEvent.input(input, { target: { value: "Navigate" } });
		const names = Array.from(document.querySelectorAll('[data-result="component"]')).map(
			(el) => el.textContent ?? ""
		);
		expect(names.some((n) => /navbar|tabs|breadcrumb|pagination/i.test(n))).toBe(true);
	});
});
