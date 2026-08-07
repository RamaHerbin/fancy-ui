import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import { readable } from "svelte/store";

// Sidebar reads `$page.url.pathname` to highlight the active link; provide a
// minimal page store so the component can render outside of a SvelteKit route.
vi.mock("$app/stores", () => ({
	page: readable({ url: new URL("http://localhost/docs/getting-started/introduction") }),
}));

import Sidebar from "./Sidebar.svelte";

describe("Sidebar", () => {
	afterEach(cleanup);

	function getAside(container: HTMLElement): HTMLElement {
		return container.querySelector("aside") as HTMLElement;
	}

	it("renders the sidebar landmark", () => {
		const { container } = render(Sidebar);
		expect(getAside(container)).toBeInTheDocument();
	});

	it("stays docked on desktop in both LTR and RTL (regression: issue #149)", () => {
		// The desktop docking utility (`lg:translate-x-0`) and the RTL drawer
		// transform (`rtl:translate-x-full`) compile to equal-specificity rules,
		// so source order decides the winner. Without an RTL-aware desktop
		// override, `rtl:translate-x-full` (emitted later) wins on RTL desktop
		// and pushes the sidebar off-screen. `rtl:lg:translate-x-0` restores it.
		const { container } = render(Sidebar);
		const cls = getAside(container).className;
		expect(cls).toContain("lg:translate-x-0");
		expect(cls).toContain("rtl:lg:translate-x-0");
	});

	it("is off-screen as a closed drawer by default (LTR and RTL)", () => {
		const { container } = render(Sidebar);
		const cls = getAside(container).className;
		expect(cls).toContain("-translate-x-full");
		expect(cls).toContain("rtl:translate-x-full");
		expect(cls).not.toContain(" translate-x-0");
	});

	it("slides into view when the drawer is open", () => {
		const { container } = render(Sidebar, { props: { open: true } });
		const cls = getAside(container).className;
		expect(cls).toContain("translate-x-0");
		expect(cls).not.toContain("-translate-x-full");
	});

	it("labels its sections without headings", () => {
		// The sidebar precedes the page <h1> in DOM order on every docs page, so
		// any heading here would open the document outline above the page title.
		const { container } = render(Sidebar);
		expect(getAside(container).querySelectorAll("h1, h2, h3, h4, h5, h6")).toHaveLength(0);
	});

	it("keeps the section label styling of the heading it replaced", () => {
		const { container } = render(Sidebar);
		const label = getAside(container).querySelector("p") as HTMLElement;
		expect(label).toBeInTheDocument();
		for (const cls of ["text-xs", "font-semibold", "tracking-wider", "uppercase"]) {
			expect(label.className).toContain(cls);
		}
	});
});
