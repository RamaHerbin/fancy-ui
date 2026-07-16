import { render, screen, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import IntroductionPage from "./IntroductionPage.svelte";

describe("IntroductionPage", () => {
	afterEach(cleanup);

	it("renders the root container", () => {
		const { container } = render(IntroductionPage);
		expect(container.querySelector("div.intro")).toBeInTheDocument();
	});

	it("renders the H1 title", () => {
		render(IntroductionPage);
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Introduction");
	});

	it("renders the four section headings with stable ids", () => {
		render(IntroductionPage);
		expect(document.querySelector("h2#philosophy")).toBeInTheDocument();
		expect(document.querySelector("h2#quick-start")).toBeInTheDocument();
		expect(document.querySelector("h2#whats-included")).toBeInTheDocument();
		expect(document.querySelector("h2#next-steps")).toBeInTheDocument();
	});

	it("renders a call-to-action link to the theme generator", () => {
		render(IntroductionPage);
		const link = document.querySelector('a[href="/docs/getting-started/theme-generator"]');
		expect(link).toBeInTheDocument();
	});
});
