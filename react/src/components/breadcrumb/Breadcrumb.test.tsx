import { createRef } from "react";
import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { Breadcrumb } from "./Breadcrumb.js";
import type { BreadcrumbItem } from "./Breadcrumb.js";

const TRAIL: BreadcrumbItem[] = [
	{ label: "Docs", href: "/docs" },
	{ label: "Core", href: "/docs/core" },
	{ label: "Navigation", href: "/docs/core/navigation" },
	{ label: "Button" },
];

function nav(container: HTMLElement): HTMLElement {
	return container.querySelector("nav") as HTMLElement;
}

function crumbLis(container: HTMLElement): HTMLLIElement[] {
	return Array.from(container.querySelectorAll("ol > li"));
}

// Located by DOM position, not by filtering on `aria-hidden` — a test that
// found separators by their own accessibility attribute could never catch a
// regression that dropped that same attribute; it would just filter down to
// an empty list and any loop over it would pass vacuously. A separator li
// always sits between two crumb/ellipsis lis, at every odd index.
function separatorsByPosition(container: HTMLElement): HTMLLIElement[] {
	return crumbLis(container).filter((_, i) => i % 2 === 1);
}

describe("Breadcrumb", () => {
	afterEach(cleanup);

	it("renders a nav with the default accessible name, wrapping an ol", () => {
		const { container } = render(<Breadcrumb items={TRAIL} />);
		const root = nav(container);

		expect(root).toBeTruthy();
		expect(root.getAttribute("aria-label")).toBe("Breadcrumb");
		expect(container.querySelector("nav > ol")).toBeTruthy();
	});

	it("uses a custom accessible name when given one", () => {
		const { container } = render(<Breadcrumb items={TRAIL} label="You are here" />);
		expect(nav(container).getAttribute("aria-label")).toBe("You are here");
	});

	it("renders one li per crumb plus a separator li between each pair", () => {
		const { container } = render(<Breadcrumb items={TRAIL} />);
		// 4 crumbs + 3 separators.
		expect(crumbLis(container)).toHaveLength(7);
		expect(separatorsByPosition(container)).toHaveLength(3);
	});

	it("hides separators from the accessibility tree and renders the given glyph", () => {
		const { container } = render(<Breadcrumb items={TRAIL} separator=">" />);
		for (const sep of separatorsByPosition(container)) {
			expect(sep.getAttribute("aria-hidden")).toBe("true");
			expect(sep.textContent?.trim()).toBe(">");
		}
	});

	it("defaults the separator to a slash", () => {
		const { container } = render(<Breadcrumb items={TRAIL} />);
		expect(separatorsByPosition(container)[0]!.textContent?.trim()).toBe("/");
	});

	it("renders the last item as plain text carrying aria-current, never a link, even though it has no href", () => {
		const { container } = render(<Breadcrumb items={TRAIL} />);
		const last = crumbLis(container).at(-1) as HTMLLIElement;

		expect(last.querySelector("a")).toBeNull();
		const current = last.querySelector('[aria-current="page"]') as HTMLElement;
		expect(current).toBeTruthy();
		expect(current.tagName).toBe("SPAN");
		expect(current.textContent).toBe("Button");
	});

	it("renders the last item as plain text even when it does carry an href", () => {
		const items: BreadcrumbItem[] = [
			{ label: "Docs", href: "/docs" },
			{ label: "Here", href: "/here" },
		];
		const { container } = render(<Breadcrumb items={items} />);
		const last = crumbLis(container).at(-1) as HTMLLIElement;

		expect(last.querySelector("a")).toBeNull();
		expect(last.querySelector('[aria-current="page"]')?.textContent).toBe("Here");
	});

	it("renders non-last items with an href as real links", () => {
		const { container } = render(<Breadcrumb items={TRAIL} />);
		const first = crumbLis(container)[0]!;
		const link = first.querySelector("a");

		expect(link).toBeTruthy();
		expect(link?.getAttribute("href")).toBe("/docs");
		expect(link?.hasAttribute("aria-current")).toBe(false);
	});

	it("renders a non-last item with no href as plain text, not a link", () => {
		const items: BreadcrumbItem[] = [
			{ label: "Unlinked" },
			{ label: "Docs", href: "/docs" },
			{ label: "Here" },
		];
		const { container } = render(<Breadcrumb items={items} />);
		const first = crumbLis(container)[0]!;

		expect(first.querySelector("a")).toBeNull();
		expect(first.textContent).toBe("Unlinked");
	});

	it("does not collapse by default, even with a long trail", () => {
		const items: BreadcrumbItem[] = Array.from({ length: 8 }, (_, i) => ({ label: `Level ${i}` }));
		const { container } = render(<Breadcrumb items={items} />);

		expect(
			crumbLis(container).filter((li) => li.getAttribute("aria-hidden") !== "true")
		).toHaveLength(8);
	});

	it("collapses once the trail is longer than maxItems, keeping the configured before/after counts", () => {
		const items: BreadcrumbItem[] = [
			{ label: "Docs", href: "/docs" },
			{ label: "Core", href: "/docs/core" },
			{ label: "Navigation", href: "/docs/core/navigation" },
			{ label: "Components", href: "/docs/core/navigation/components" },
			{ label: "Button" },
		];
		const { container } = render(<Breadcrumb items={items} maxItems={3} />);
		const lis = crumbLis(container);

		// Docs, ellipsis, Button — itemsBeforeCollapse/After default to 1 each.
		const visible = lis.filter((li) => li.getAttribute("aria-hidden") !== "true");
		expect(visible).toHaveLength(2);
		expect(visible[0]!.textContent).toBe("Docs");
		expect(visible[1]!.textContent).toBe("Button");

		const ellipsis = lis.find((li) => li.textContent?.trim() === "…") as HTMLLIElement;
		expect(ellipsis.getAttribute("aria-hidden")).toBe("true");
	});

	it("does not collapse when the trail is exactly maxItems long", () => {
		const items: BreadcrumbItem[] = [
			{ label: "Docs", href: "/docs" },
			{ label: "Core", href: "/docs/core" },
			{ label: "Button" },
		];
		const { container } = render(<Breadcrumb items={items} maxItems={3} />);
		expect(
			crumbLis(container).filter((li) => li.getAttribute("aria-hidden") !== "true")
		).toHaveLength(3);
	});

	it("respects wider itemsBeforeCollapse/itemsAfterCollapse counts", () => {
		const items: BreadcrumbItem[] = [
			{ label: "A", href: "/a" },
			{ label: "B", href: "/b" },
			{ label: "C", href: "/c" },
			{ label: "D", href: "/d" },
			{ label: "E", href: "/e" },
			{ label: "F" },
		];
		const { container } = render(
			<Breadcrumb items={items} maxItems={4} itemsBeforeCollapse={2} itemsAfterCollapse={2} />
		);
		const visible = crumbLis(container)
			.filter((li) => li.getAttribute("aria-hidden") !== "true")
			.map((li) => li.textContent);

		expect(visible).toEqual(["A", "B", "E", "F"]);
	});

	it("floors itemsAfterCollapse at 1, keeping the current page even when given 0", () => {
		const items: BreadcrumbItem[] = [
			{ label: "A", href: "/a" },
			{ label: "B", href: "/b" },
			{ label: "C", href: "/c" },
			{ label: "D", href: "/d" },
			{ label: "E" },
		];
		const { container } = render(
			<Breadcrumb items={items} maxItems={2} itemsBeforeCollapse={1} itemsAfterCollapse={0} />
		);
		const visible = crumbLis(container)
			.filter((li) => li.getAttribute("aria-hidden") !== "true")
			.map((li) => li.textContent);

		// itemsAfterCollapse: 0 behaves as 1 — E (the current page) must
		// still be the trailing visible crumb, not silently dropped.
		expect(visible).toEqual(["A", "E"]);
		const current = container.querySelector('[aria-current="page"]');
		expect(current).toBeTruthy();
		expect(current?.textContent).toBe("E");
	});

	it("floors itemsAfterCollapse at 1 even alongside itemsBeforeCollapse: 0, rather than collapsing to a bare ellipsis", () => {
		const items: BreadcrumbItem[] = [
			{ label: "A", href: "/a" },
			{ label: "B", href: "/b" },
			{ label: "C" },
		];
		const { container } = render(
			<Breadcrumb items={items} maxItems={1} itemsBeforeCollapse={0} itemsAfterCollapse={0} />
		);

		// Not "the whole breadcrumb is one decorative ellipsis" — the current
		// page must still be present and marked, even with both counts at 0.
		const current = container.querySelector('[aria-current="page"]');
		expect(current).toBeTruthy();
		expect(current?.textContent).toBe("C");
		const visible = crumbLis(container)
			.filter((li) => li.getAttribute("aria-hidden") !== "true")
			.map((li) => li.textContent);
		expect(visible).toEqual(["C"]);
	});

	it("never collapses when itemsBeforeCollapse + itemsAfterCollapse cannot save any items, showing the full trail intact", () => {
		// before(2) + after(2) = 4 >= items.length(4): collapsing here could
		// only duplicate or drop a crumb, so it must not attempt to.
		const items: BreadcrumbItem[] = [
			{ label: "A", href: "/a" },
			{ label: "B", href: "/b" },
			{ label: "C", href: "/c" },
			{ label: "D" },
		];
		const { container } = render(
			<Breadcrumb items={items} maxItems={2} itemsBeforeCollapse={2} itemsAfterCollapse={2} />
		);
		const visible = crumbLis(container)
			.filter((li) => li.getAttribute("aria-hidden") !== "true")
			.map((li) => li.textContent);

		expect(visible).toEqual(["A", "B", "C", "D"]);
		expect(container.querySelectorAll("li").length).toBe(items.length + (items.length - 1));
	});

	it("keeps the ellipsis out of the tab order and off the accessibility tree", () => {
		const items: BreadcrumbItem[] = [
			{ label: "A", href: "/a" },
			{ label: "B", href: "/b" },
			{ label: "C", href: "/c" },
			{ label: "D" },
		];
		const { container } = render(<Breadcrumb items={items} maxItems={2} />);
		const ellipsis = crumbLis(container).find(
			(li) => li.textContent?.trim() === "…"
		) as HTMLLIElement;

		expect(ellipsis.getAttribute("aria-hidden")).toBe("true");
		expect(ellipsis.querySelector("button")).toBeNull();
		expect(ellipsis.hasAttribute("tabindex")).toBe(false);
	});

	it("renders two crumbs with the same label as distinct entries, not collapsed into one", () => {
		const items: BreadcrumbItem[] = [
			{ label: "Settings", href: "/settings" },
			{ label: "Settings", href: "/settings/general" },
		];
		const { container } = render(<Breadcrumb items={items} />);
		const visible = crumbLis(container).filter((li) => li.getAttribute("aria-hidden") !== "true");

		expect(visible).toHaveLength(2);
		expect(visible[0]!.querySelector("a")?.getAttribute("href")).toBe("/settings");
		expect(visible[1]!.querySelector('[aria-current="page"]')).toBeTruthy();
	});

	it("renders a single-item trail as just the current page, with no separator", () => {
		const { container } = render(<Breadcrumb items={[{ label: "Home" }]} />);
		expect(separatorsByPosition(container)).toHaveLength(0);
		expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("Home");
	});

	it("renders nothing but an empty list for an empty trail, without crashing", () => {
		const { container } = render(<Breadcrumb items={[]} />);
		expect(crumbLis(container)).toHaveLength(0);
		expect(container.querySelector("ol")).toBeTruthy();
	});

	it("hands a custom item render prop the item and its index, and lets it fully replace the default rendering", () => {
		// The Svelte suite builds this with `createRawSnippet`; the React
		// counterpart of a `Snippet<[BreadcrumbItem, number]>` prop is a
		// plain render function.
		const rendersItem = (entry: BreadcrumbItem, index: number) => (
			<b data-testid="custom">
				{index}:{entry.label}
			</b>
		);
		const { container } = render(<Breadcrumb items={TRAIL} item={rendersItem} />);
		const custom = Array.from(container.querySelectorAll('[data-testid="custom"]'));

		expect(custom).toHaveLength(4);
		expect(custom[0]!.textContent).toBe("0:Docs");
		expect(custom[3]!.textContent).toBe("3:Button");
		// The default aria-current/link logic is entirely bypassed once a
		// custom render prop is supplied — the consumer owns those semantics now.
		expect(container.querySelector('[aria-current="page"]')).toBeNull();
	});

	it("merges the className prop with the base class on the nav", () => {
		const { container } = render(<Breadcrumb items={TRAIL} className="mt-2" />);
		const root = nav(container);

		expect(root.className).toContain("ft-breadcrumb");
		expect(root.className).toContain("mt-2");
	});

	it("forwards the ref to the nav element", () => {
		const ref = createRef<HTMLElement>();
		const { container } = render(<Breadcrumb ref={ref} items={TRAIL} />);

		expect(ref.current).toBe(nav(container));
	});
});
