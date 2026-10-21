import { render, screen, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import { tick } from "svelte";
import { setFramework } from "$lib/stores/framework.svelte.js";
import InstallationPage from "./InstallationPage.svelte";

describe("InstallationPage", () => {
	afterEach(cleanup);

	it("renders the root container", () => {
		const { container } = render(InstallationPage);
		expect(container.querySelector("div.install")).toBeInTheDocument();
	});

	it("renders the H1 title", () => {
		render(InstallationPage);
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Installation");
	});

	it("renders the seven section headings with stable ids", () => {
		render(InstallationPage);
		expect(document.querySelector("h2#prerequisites")).toBeInTheDocument();
		expect(document.querySelector("h2#install-steps")).toBeInTheDocument();
		expect(document.querySelector("h2#tailwind-setup")).toBeInTheDocument();
		expect(document.querySelector("h2#usage")).toBeInTheDocument();
		expect(document.querySelector("h2#typescript")).toBeInTheDocument();
		expect(document.querySelector("h2#peer-dependencies")).toBeInTheDocument();
		expect(document.querySelector("h2#next-steps")).toBeInTheDocument();
	});

	it("renders the next-step links", () => {
		render(InstallationPage);
		expect(document.querySelector('a[href="/docs/components"]')).toBeInTheDocument();
		expect(document.querySelector('a[href="/docs/getting-started/theming"]')).toBeInTheDocument();
	});

	it("lists both peer dependencies in the table", () => {
		const { container } = render(InstallationPage);
		const chips = Array.from(container.querySelectorAll(".peer-table code.chip")).map(
			(chip) => chip.textContent
		);
		expect(chips).toContain("svelte");
		expect(chips).toContain("tailwindcss");
	});

	describe("selected framework", () => {
		afterEach(() => setFramework("svelte"));

		it("switches the snippets and peer table to React", async () => {
			setFramework("react");
			const { container } = render(InstallationPage);
			await tick();
			expect(container.textContent).toContain('@import "fancy-ui-react/tailwind.css"');
			expect(container.textContent).toContain('import "fancy-ui-react/styles.css"');
			expect(container.textContent).not.toContain("fancy-ui-svelte/tailwind.css");
			const chips = Array.from(container.querySelectorAll(".peer-table code.chip")).map(
				(chip) => chip.textContent
			);
			expect(chips).toContain("react");
			expect(chips).toContain("react-dom");
			expect(chips).not.toContain("svelte");
			// Same seven headings whatever the framework.
			expect(document.querySelector("h2#peer-dependencies")).toBeInTheDocument();
		});

		it("switches the snippets and peer table to Vue", async () => {
			setFramework("vue");
			const { container } = render(InstallationPage);
			await tick();
			expect(container.textContent).toContain('@import "fancy-ui-vue/styles.css"');
			expect(container.textContent).toContain("<template>");
			const chips = Array.from(container.querySelectorAll(".peer-table code.chip")).map(
				(chip) => chip.textContent
			);
			expect(chips).toContain("vue");
			expect(chips).not.toContain("svelte");
		});
	});

	it("renders the three install steps in order", () => {
		const { container } = render(InstallationPage);
		const steps = container.querySelectorAll(".steps li");
		expect(steps).toHaveLength(3);
		const numerals = Array.from(container.querySelectorAll(".steps .num")).map(
			(num) => num.textContent
		);
		expect(numerals).toEqual(["1", "2", "3"]);
	});
});
