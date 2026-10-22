import { render, screen, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
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

	it("renders the Astro section with the measured island cost for Svelte", () => {
		const { container } = render(InstallationPage);
		expect(document.querySelector("h2#astro")).toHaveTextContent("Astro");
		expect(container.textContent).toContain("npx astro add svelte");
		expect(container.textContent).toContain("88 KB (32 KB gzip)");
		expect(container.textContent).toContain("1.66 MB (481 KB gzip)");
		expect(container.textContent).toContain("transition:persist");
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
			expect(document.querySelector("h2#astro")).not.toBeInTheDocument();
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

	it("lists peer ranges equal to each package.json, with Kit flagged optional", async () => {
		for (const [framework, dir] of [
			["svelte", "."],
			["react", "react"],
			["vue", "vue"],
		] as const) {
			setFramework(framework);
			const { container, unmount } = render(InstallationPage);
			await tick();
			const pkg = JSON.parse(readFileSync(`${dir}/package.json`, "utf8"));
			const rows = Array.from(container.querySelectorAll(".peer-table tbody tr")).map((tr) =>
				Array.from(tr.querySelectorAll("code.chip")).map((c) => c.textContent)
			);
			expect(rows.length).toBeGreaterThan(0);
			for (const [name, range] of rows) {
				expect(pkg.peerDependencies[name!]).toBe(range);
			}
			// Every peer the package marks optional is flagged, and only those.
			const flagged = Array.from(
				container.querySelectorAll(".peer-table tbody tr[data-optional] td:first-child code.chip")
			).map((c) => c.textContent);
			const declaredOptional = Object.entries(pkg.peerDependenciesMeta ?? {})
				.filter(([, meta]) => (meta as { optional?: boolean }).optional)
				.map(([name]) => name);
			expect(flagged.sort()).toEqual(declaredOptional.sort());
			if (framework === "svelte") {
				expect(flagged).toContain("@sveltejs/kit");
				expect(container.textContent).toContain(">=2.0.0");
				expect(container.textContent).toContain("SvelteKit is optional");
			} else {
				expect(container.textContent).not.toContain("@sveltejs/kit");
				expect(container.textContent).not.toContain("SvelteKit");
			}
			unmount();
		}
		setFramework("svelte");
	});

	it("pins Svelte to ^5.20.0 in the Svelte peer table", () => {
		const { container } = render(InstallationPage);
		expect(container.querySelector(".peer-table")!.textContent).toContain("^5.20.0");
	});

	it("keeps the prerequisites card neutral about SvelteKit", () => {
		const { container } = render(InstallationPage);
		expect(container.querySelector(".cards .card")!.textContent).not.toContain("SvelteKit");
	});

	it("renders no literal fancy-ui-svelte when React is selected", async () => {
		setFramework("react");
		const { container } = render(InstallationPage);
		await tick();
		expect(container.textContent).not.toContain("fancy-ui-svelte");
		setFramework("svelte");
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
