import { render, screen, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import { tick } from "svelte";
import { setFramework } from "$lib/stores/framework.svelte.js";
import { INSTALL_SNIPPETS } from "$lib/docs/install-snippets.js";
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

	describe("stylesheet per framework", () => {
		afterEach(() => setFramework("svelte"));

		for (const framework of ["svelte", "react", "vue"] as const) {
			it(`prints the ${framework} stylesheet and no other package`, async () => {
				setFramework(framework);
				const { container } = render(ThemingPage);
				await tick();
				const text = container.querySelector("section:has(h2#css-setup)")!.textContent!;
				for (const line of INSTALL_SNIPPETS[framework].stylesheet.split("\n")) {
					expect(text).toContain(line);
				}
				for (const other of ["svelte", "react", "vue"].filter((f) => f !== framework)) {
					expect(container.textContent).not.toContain(`fancy-ui-${other}`);
				}
				expect(text).toContain("each package ships its own");
			});
		}
	});
});
