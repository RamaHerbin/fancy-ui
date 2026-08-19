import { render, screen, cleanup, within, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import Page from "../routes/+page.svelte";

describe("+page.svelte", () => {
	afterEach(cleanup);

	it("renders the heading", () => {
		render(Page);
		expect(
			screen.getByRole("heading", { level: 1, name: /Interfaces\s*that feel\s*alive\./i })
		).toBeInTheDocument();
	});

	it("renders the tagline text", () => {
		render(Page);
		expect(
			screen.getByText(/Open-source Svelte components for expressive, motion-first interfaces/i)
		).toBeInTheDocument();
	});

	it("renders the nav links", () => {
		render(Page);
		const header = screen.getByRole("banner");
		for (const label of ["Docs", "Components", "Themes", "Blog"]) {
			expect(within(header).getByRole("link", { name: label })).toBeInTheDocument();
		}
	});

	it("renders the closing CTA block", () => {
		render(Page);
		expect(screen.getByRole("heading", { name: /Ready to build something/i })).toBeInTheDocument();
	});

	describe("showcase panels", () => {
		it("names the four signature panels with their docs links", () => {
			render(Page);
			// Each panel header carries a "View docs" link pointing at the slug —
			// the panels are the argument of the page, so their wiring is load-bearing.
			const slugs = ["fluid-cursor", "image-trail-cursor", "liquid-glass", "rainbow-button"];
			const links = screen
				.getAllByRole("link", { name: /view docs/i })
				.map((a) => a.getAttribute("href"));
			for (const slug of slugs) {
				expect(links).toContain(`/docs/components/${slug}`);
			}
		});

		it("holds the fluid cursor back for reduced motion", () => {
			// jsdom's matchMedia mock (test-setup) reports no preference; the
			// component additionally waits for idle. Either way, first render
			// must not include a canvas — the sim never competes with paint.
			const { container } = render(Page);
			expect(container.querySelector("canvas")).not.toBeInTheDocument();
		});
	});

	describe("primitives row", () => {
		it("renders live primitives, not static mockups", () => {
			render(Page);
			// The real components answer to roles: Input → textbox, Select →
			// combobox, Switch → switch, Slider → slider, Tabs → tablist.
			expect(screen.getByRole("textbox", { name: /type something/i })).toBeInTheDocument();
			expect(screen.getByRole("combobox", { name: /select an option/i })).toBeInTheDocument();
			expect(screen.getByRole("switch", { name: /push notifications/i })).toBeInTheDocument();
			expect(screen.getByRole("slider", { name: /volume/i })).toBeInTheDocument();
			expect(screen.getByRole("tablist")).toBeInTheDocument();
		});

		it("switches tabs on click", async () => {
			render(Page);
			const emails = screen.getByRole("tab", { name: "Emails" });

			expect(screen.getByRole("tab", { name: "Chats" })).toHaveAttribute("aria-selected", "true");

			await fireEvent.click(emails);

			expect(emails).toHaveAttribute("aria-selected", "true");
		});

		it("toggles the notification switch", async () => {
			render(Page);
			const toggle = screen.getByRole("switch", { name: /push notifications/i });

			expect(toggle).toHaveAttribute("aria-checked", "true");

			await fireEvent.click(toggle);

			expect(toggle).toHaveAttribute("aria-checked", "false");
		});

		it("shows the verification-code mock digits", () => {
			render(Page);
			// Static specimen (no PIN input in the library yet): six digits,
			// hidden from the accessibility tree.
			expect(screen.getByText("07 — VERIFICATION CODE")).toBeInTheDocument();
		});
	});
});
