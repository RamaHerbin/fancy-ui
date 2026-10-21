import { render, screen, cleanup } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";

vi.mock("$app/navigation", () => ({ replaceState: vi.fn() }));
vi.mock("$app/state", () => ({ page: { url: new URL("http://localhost/docs") } }));

import DocsFooter from "./DocsFooter.svelte";
import { setFramework } from "$lib/stores/framework.svelte.js";
import {
	CODE_OF_CONDUCT_URL,
	CONTRIBUTING_URL,
	DISCUSSIONS_URL,
	ISSUES_URL,
	PACKAGE_VERSION,
	REACT_PACKAGE_VERSION,
	SECURITY_URL,
	VUE_PACKAGE_VERSION,
} from "$lib/site.js";

const anchor = (version: string, prefix = "") => `${prefix}v${version.replaceAll(".", "-")}`;
const CHANGELOG = "/docs/getting-started/changelog";

describe("DocsFooter", () => {
	afterEach(() => {
		cleanup();
		setFramework("svelte");
	});

	it("renders one version chip per package, linked to its changelog anchor", () => {
		render(DocsFooter);
		const chips = [
			[PACKAGE_VERSION, ""],
			[REACT_PACKAGE_VERSION, "react-"],
			[VUE_PACKAGE_VERSION, "vue-"],
		] as const;
		for (const [version, prefix] of chips) {
			const link = screen.getByRole("link", { name: new RegExp(version.replaceAll(".", "\\.")) });
			expect(link).toHaveAttribute("href", `${CHANGELOG}#${anchor(version, prefix)}`);
		}
	});

	it("links the six community and project pages", () => {
		render(DocsFooter);
		const hrefs: Record<string, string> = {
			Contribute: CONTRIBUTING_URL,
			Issues: ISSUES_URL,
			Discussions: DISCUSSIONS_URL,
			Security: SECURITY_URL,
			"Code of conduct": CODE_OF_CONDUCT_URL,
			Changelog: CHANGELOG,
		};
		for (const [name, href] of Object.entries(hrefs)) {
			expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
		}
	});

	it("shows the license and the repository link", () => {
		render(DocsFooter);
		expect(screen.getByRole("link", { name: "MIT license" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "GitHub" })).toBeInTheDocument();
	});

	it("follows the framework store for the install line", async () => {
		const { container } = render(DocsFooter);
		await tick();
		const line = () => container.querySelector("[data-docs-footer-install]")?.textContent ?? "";
		expect(line()).toContain("pnpm add fancy-ui-svelte");
		setFramework("react");
		await tick();
		expect(line()).toContain("pnpm add fancy-ui-react");
		setFramework("vue");
		await tick();
		expect(line()).toContain("vue");
	});
});
