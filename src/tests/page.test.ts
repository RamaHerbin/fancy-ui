import { render, screen, cleanup, within, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import Page from "../routes/+page.svelte";

describe("+page.svelte", () => {
	afterEach(cleanup);

	// Queried by accessible name, not textContent: the hero splits the headline into
	// one aria-hidden <span> per glyph so each can animate in separately, and the
	// name comes from the sr-only copy that sits alongside them.
	it("renders the heading", () => {
		render(Page);
		expect(
			screen.getByRole("heading", {
				level: 1,
				name: /Build stunning interfaces, effortlessly\./i,
			})
		).toBeInTheDocument();
	});

	it("renders the tagline text", () => {
		render(Page);
		expect(screen.getByText(/One component set, many art directions/i)).toBeInTheDocument();
	});

	// Regression: the gradient glyphs of the third headline line sit on
	// `.text-transparent` and are only visible because of their inline
	// background-image. That image is a color-mix() of the skin's two accent
	// tokens, and a percentage outside 0–100 makes the whole function invalid —
	// the browser drops the declaration and the glyph renders as nothing. The
	// tail of "effortlessly" disappeared exactly this way.
	it("gives every gradient glyph a background image", () => {
		const { container } = render(Page);
		const glyphs = container.querySelectorAll<HTMLElement>(".serif-line .glyph");

		expect(glyphs.length).toBeGreaterThan(0);
		for (const glyph of glyphs) {
			const style = glyph.getAttribute("style") ?? "";
			// Either a gradient (the swept letters) or a solid colour (the period).
			expect(style).toMatch(/background-image:|color:/);
			for (const pct of style.matchAll(/(\d+)%/g)) {
				expect(Number(pct[1])).toBeLessThanOrEqual(100);
			}
		}
	});

	it("renders the three page blocks", () => {
		render(Page);
		// hero → showcase → closing CTA. Anything else on this page is chrome.
		expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
		expect(screen.getByRole("tablist", { name: /showcase/i })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: /Ready to build something/i })).toBeInTheDocument();
	});

	describe("skin switcher", () => {
		it("offers every skin and marks exactly one checked", () => {
			render(Page);
			const group = screen.getByRole("radiogroup", { name: /skin/i });
			const options = within(group).getAllByRole("radio");

			expect(options.map((o) => o.textContent?.trim())).toEqual([
				"Aurora",
				"Brutal",
				"Glass",
				"Terminal",
				"Retro OS",
			]);
			expect(options.filter((o) => o.getAttribute("aria-checked") === "true")).toHaveLength(1);
		});

		// Aurora is the SSR default on purpose — the route is prerendered and there
		// is no pre-paint skin bootstrap, so a remembered skin would repaint after
		// hydration. See the note in src/routes/+page.svelte.
		it("starts on aurora", () => {
			const { container } = render(Page);
			expect(container.querySelector("[data-skin]")).toHaveAttribute("data-skin", "aurora");
		});

		it("re-skins the page when another skin is picked", async () => {
			const { container } = render(Page);

			await fireEvent.click(screen.getByRole("radio", { name: "Brutal" }));

			expect(container.querySelector("[data-skin]")).toHaveAttribute("data-skin", "brutal");
			expect(screen.getByRole("radio", { name: "Brutal" })).toHaveAttribute("aria-checked", "true");
		});
	});

	describe("showcase panel", () => {
		it("opens on the components scene", () => {
			render(Page);
			const tabs = within(screen.getByRole("tablist", { name: /showcase/i })).getAllByRole("tab");

			expect(tabs.map((t) => t.textContent?.trim())).toEqual([
				"Components",
				"Forms",
				"Dashboard",
				"Chat",
			]);
			expect(tabs[0]).toHaveAttribute("aria-selected", "true");
		});

		it("swaps the scene when another tab is chosen", async () => {
			render(Page);

			// Scoped to the panel: the skin switcher's small-viewport <select> is
			// always in the tree (it is hidden by a `md:hidden` class, which jsdom
			// does not apply), so an unscoped combobox query would always match.
			const rangePicker = () =>
				within(screen.getByRole("tabpanel")).queryByRole("combobox", { name: "" });

			// The dashboard scene owns a range <select>; the components scene has none.
			expect(rangePicker()).not.toBeInTheDocument();

			await fireEvent.click(screen.getByRole("tab", { name: "Dashboard" }));

			expect(screen.getByRole("tab", { name: "Dashboard" })).toHaveAttribute(
				"aria-selected",
				"true"
			);
			expect(rangePicker()).toBeInTheDocument();
		});

		it("renders live primitives, not static mockups", () => {
			render(Page);
			const panel = screen.getByRole("tabpanel");

			// The previous landing shipped hand-drawn previews; these are the real
			// components, so they answer to the keyboard and carry real roles.
			expect(within(panel).getAllByRole("textbox").length).toBeGreaterThan(0);
			expect(within(panel).getAllByRole("button").length).toBeGreaterThan(0);
			expect(within(panel).getAllByRole("switch").length).toBeGreaterThan(0);
		});
	});
});
