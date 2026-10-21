import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readable } from "svelte/store";

vi.mock("$app/stores", () => ({
	page: readable({ url: new URL("http://localhost/docs/components/rainbow-button") }),
}));

import Page from "./+page.svelte";
import { load } from "./+page.server.js";
import { getComponent, registry } from "$lib/fancy-ui/registry.js";
import { setLocale } from "$lib/stores";
import { sourceTreeUrl } from "$lib/site.js";

type Server = Exclude<Awaited<ReturnType<typeof load>>, void>;

function dataFor(slug: string) {
	const server = load({ params: { slug } } as Parameters<typeof load>[0]) as Server;
	return { ...server, component: getComponent(slug)! };
}

function mount(slug: string) {
	return render(Page, { data: dataFor(slug) } as never);
}

function section(container: HTMLElement, id: string): HTMLElement {
	return container.querySelector<HTMLElement>(`#${id}`)!.closest("section")!;
}

describe("component page", () => {
	afterEach(() => {
		cleanup();
		setLocale("en");
	});

	it("mounts the page actions under the heading with the develop edit URL", () => {
		const { container } = mount("rainbow-button");
		const edit = Array.from(container.querySelectorAll("a.page-action")).find((a) =>
			a.textContent?.includes("Edit this page")
		);
		expect(edit?.getAttribute("href")).toBe(
			"https://github.com/RamaHerbin/fancy-ui/tree/develop/src/lib/fancy-ui/rainbow-button"
		);
		const h1 = container.querySelector("h1")!;
		expect(h1.compareDocumentPosition(edit!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it("links the Svelte source on the develop branch", () => {
		const { container } = mount("rainbow-button");
		const src = Array.from(section(container, "links").querySelectorAll("a")).find((a) =>
			a.textContent?.includes("Source")
		);
		expect(src?.getAttribute("href")).toBe(sourceTreeUrl("src/lib/fancy-ui/rainbow-button"));
	});

	it("shows the same snippet in Usage as in the Code tab, not the generic one", () => {
		const { container } = mount("marquee");
		const usage = section(container, "usage").querySelector("pre");
		const code = section(container, "preview").querySelector("pre");
		expect(usage).not.toBeNull();
		const norm = (el: Element | null) => el?.textContent?.replace(/\s+/g, " ").trim();
		expect(norm(usage)).toBe(norm(code));
		expect(norm(usage)).not.toMatch(
			/^<script lang="ts"> import \{[^}]*\} from 'fancy-ui-svelte'; <\/script> <Marquee \/>$/
		);
	});

	it("does not render a second breadcrumb trail inside the page", () => {
		const { container } = mount("rainbow-button");
		expect(container.querySelector("nav[aria-label]")?.getAttribute("aria-label")).not.toBe(
			"Breadcrumb"
		);
	});

	it("shows a deprecation notice and chip for a deprecated component", () => {
		const original = registry["rainbow-button"];
		registry["rainbow-button"] = { ...original, deprecated: true, since: "0.3.0" };
		try {
			const { container } = mount("rainbow-button");
			expect(container.textContent).toContain(
				"This component is deprecated and may be removed in a future release."
			);
			expect(container.textContent).toContain("New in v0.3.0");
		} finally {
			registry["rainbow-button"] = original;
		}
	});

	it("renders a credit without a link as plain text", () => {
		const original = registry["rainbow-button"];
		registry["rainbow-button"] = { ...original, credits: [{ source: "Some Author" }] };
		try {
			const { container } = mount("rainbow-button");
			expect(section(container, "links").textContent).toContain("Inspired by Some Author");
			expect(section(container, "links").querySelector("a[href='undefined']")).toBeNull();
		} finally {
			registry["rainbow-button"] = original;
		}
	});
});
