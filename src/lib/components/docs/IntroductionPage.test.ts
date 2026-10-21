import { render, screen, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import { tick } from "svelte";
import { setFramework } from "$lib/stores/framework.svelte.js";
import { setSkin } from "$lib/stores/skin.svelte.js";
import { PACKAGE_VERSION, COMPONENT_COUNT } from "$lib/site.js";
import { INSTALL_SNIPPETS } from "$lib/docs/install-snippets.js";
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

	describe("framework neutrality", () => {
		afterEach(() => setFramework("svelte"));

		it("does not call the library Svelte-only in the lead, pills or philosophy", async () => {
			const { container } = render(IntroductionPage);
			await tick();
			const lead = container.querySelector(".lead")!.textContent!;
			expect(lead).toContain("Svelte");
			expect(lead).toContain("React");
			expect(lead).toContain("Vue");
			expect(lead).toContain(String(COMPONENT_COUNT));
			expect(lead).not.toContain("natively for Svelte");
			expect(container.querySelector(".pills")!.textContent).not.toContain("Svelte 5 Native");
			expect(container.querySelector(".cards")!.textContent).not.toContain("No legacy APIs");
		});

		for (const framework of ["react", "vue"] as const) {
			it(`renders no literal fancy-ui-svelte when ${framework} is selected`, async () => {
				setFramework(framework);
				const { container } = render(IntroductionPage);
				await tick();
				expect(container.textContent).not.toContain("fancy-ui-svelte");
				expect(container.textContent).toContain(INSTALL_SNIPPETS[framework].imports);
				expect(container.textContent).toContain(`pnpm add fancy-ui-${framework}`);
			});
		}

		it("prints the Svelte import and usage for Svelte", async () => {
			const { container } = render(IntroductionPage);
			await tick();
			expect(container.textContent).toContain(INSTALL_SNIPPETS.svelte.imports);
			expect(container.textContent).toContain("<BorderBeam");
		});
	});

	describe("retro badge", () => {
		afterEach(() => setSkin("standard"));

		it("shows the real package version, not a hard-coded v1.0", () => {
			setSkin("retro-os");
			const { container } = render(IntroductionPage);
			expect(container.querySelector(".intro-badge-b")!.textContent).toBe(`v${PACKAGE_VERSION}`);
		});
	});

	it("labels the categories through the catalog, not the English registry labels", () => {
		const { container } = render(IntroductionPage);
		const cats = Array.from(container.querySelectorAll(".cat")).map((c) => c.textContent);
		expect(cats).toContain("Text & Typography");
		expect(cats).toContain("AI Chat");
	});
});
