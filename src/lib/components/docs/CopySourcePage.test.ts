import { render, screen, cleanup } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import { copyCommandFor } from "$lib/copy-source.js";
import { COPY_SOURCE_SECTIONS } from "$lib/docs/copy-source-guide.js";
import CopySourcePage from "./CopySourcePage.svelte";

const exclusions = {
	svelte: [{ label: "_template/", reason: "scaffolding template" }],
	react: [{ label: "cameleon/", reason: "npm only" }],
	vue: [{ label: "test-setup.ts", reason: "test runner setup" }],
};

describe("CopySourcePage", () => {
	afterEach(cleanup);

	it("renders the title from the catalog and every section with a stable id", () => {
		render(CopySourcePage, { exclusions });
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Copy source");
		for (const section of COPY_SOURCE_SECTIONS) {
			expect(document.querySelector(`h2#${section.id}`), section.id).toBeInTheDocument();
		}
		expect(document.querySelector("h2#not-included")).toBeInTheDocument();
		expect(document.querySelector("h2#indexes")).toBeInTheDocument();
	});

	it("prints the add command of each framework", () => {
		const { container } = render(CopySourcePage, { exclusions });
		for (const fw of ["svelte", "react", "vue"] as const) {
			expect(container.textContent).toContain(copyCommandFor("rainbow-button", fw));
		}
	});

	it("lists the exclusions it is given and renders inline code", () => {
		const { container } = render(CopySourcePage, { exclusions });
		expect(container.textContent).toContain("_template/");
		expect(container.textContent).toContain("test runner setup");
		expect(container.querySelector("li code")).toBeInTheDocument();
		expect(container.textContent).not.toContain("`");
	});
});
