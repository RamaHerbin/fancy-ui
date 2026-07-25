import { render, screen, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import ThemingPage from "./ThemingPage.svelte";

describe("ThemingPage", () => {
	afterEach(cleanup);

	it("renders the root container", () => {
		const { container } = render(ThemingPage);
		expect(container.querySelector("div.theming")).toBeInTheDocument();
	});

	it("renders the H1 title", () => {
		render(ThemingPage);
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Theming");
	});

	it("renders the eight section headings with stable ids", () => {
		render(ThemingPage);
		expect(document.querySelector("h2#css-setup")).toBeInTheDocument();
		expect(document.querySelector("h2#color-system")).toBeInTheDocument();
		expect(document.querySelector("h2#dark-mode")).toBeInTheDocument();
		expect(document.querySelector("h2#animation-tokens")).toBeInTheDocument();
		expect(document.querySelector("h2#easing")).toBeInTheDocument();
		expect(document.querySelector("h2#rainbow-gradients")).toBeInTheDocument();
		expect(document.querySelector("h2#customizing")).toBeInTheDocument();
		expect(document.querySelector("h2#next-steps")).toBeInTheDocument();
	});

	it("links to the Theme Generator from the callout and the next-step cards", () => {
		const { container } = render(ThemingPage);
		const generatorLinks = container.querySelectorAll(
			'a[href="/docs/getting-started/theme-generator"]'
		);
		expect(generatorLinks).toHaveLength(2);
		expect(container.querySelector('a[href="/docs/components"]')).toBeInTheDocument();
	});

	it("renders the seven CSS token snippets", () => {
		const { container } = render(ThemingPage);
		const blocks = container.querySelectorAll(".sec pre, .sec code");
		expect(blocks.length).toBeGreaterThanOrEqual(7);
	});
});
