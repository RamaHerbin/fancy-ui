import { render, cleanup, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import Badge from "./Badge.svelte";

afterEach(cleanup);

const text = (value: string) => createRawSnippet(() => ({ render: () => `<span>${value}</span>` }));

function root(container: HTMLElement): HTMLElement {
	return container.firstElementChild as HTMLElement;
}

describe("Badge", () => {
	it("renders its children inside an inline span", () => {
		const { container } = render(Badge, { props: { children: text("3 unread") } });
		expect(root(container).tagName).toBe("SPAN");
		expect(root(container)).toHaveTextContent("3 unread");
		expect(screen.getByText("3 unread")).toBeInTheDocument();
	});

	it("renders an empty pill without children rather than throwing", () => {
		const { container } = render(Badge);
		expect(root(container)).toBeEmptyDOMElement();
	});

	it("defaults to the default variant and the md size", () => {
		const { container } = render(Badge, { props: { children: text("x") } });
		expect(root(container)).toHaveAttribute("data-variant", "default");
		expect(root(container)).toHaveAttribute("data-size", "md");
	});

	it.each([
		["default", ["bg-primary", "text-primary-foreground"]],
		["secondary", ["bg-secondary", "text-secondary-foreground"]],
		["outline", ["border-border", "text-foreground"]],
		["destructive", ["bg-destructive/10", "text-destructive"]],
		["success", ["bg-emerald-500/10"]],
	] as const)("styles the %s variant", (variant, classes) => {
		const { container } = render(Badge, { props: { variant, children: text("x") } });
		expect(root(container)).toHaveAttribute("data-variant", variant);
		expect(root(container)).toHaveClass(...classes);
	});

	it("gives each variant its own look", () => {
		const seen = new Set<string>();
		for (const variant of ["default", "secondary", "outline", "destructive", "success"] as const) {
			const { container, unmount } = render(Badge, { props: { variant, children: text("x") } });
			seen.add(root(container).className);
			unmount();
		}
		expect(seen.size).toBe(5);
	});

	it("keeps a border on every variant so they share one height", () => {
		for (const variant of ["default", "secondary", "outline", "destructive", "success"] as const) {
			const { container, unmount } = render(Badge, { props: { variant, children: text("x") } });
			expect(root(container)).toHaveClass("border");
			unmount();
		}
	});

	it.each([
		["sm", "text-[0.6875rem]"],
		["md", "text-xs"],
	] as const)("renders the %s size", (size, cls) => {
		const { container } = render(Badge, { props: { size, children: text("x") } });
		expect(root(container)).toHaveAttribute("data-size", size);
		expect(root(container)).toHaveClass(cls);
	});

	it("makes sm tighter than md", () => {
		const sm = render(Badge, { props: { size: "sm", children: text("x") } });
		const smClass = root(sm.container).className;
		sm.unmount();
		const md = render(Badge, { props: { size: "md", children: text("x") } });
		expect(smClass).toContain("px-1.5");
		expect(root(md.container).className).toContain("px-2");
		expect(root(md.container).className).not.toContain("px-1.5");
	});

	it("merges a caller class over the base classes", () => {
		const { container } = render(Badge, {
			props: { class: "rounded-md uppercase", children: text("x") },
		});
		expect(root(container)).toHaveClass("rounded-md", "uppercase");
		expect(root(container)).not.toHaveClass("rounded-full");
	});

	it("adds no role: a badge is text, not a widget", () => {
		const { container } = render(Badge, { props: { children: text("x") } });
		expect(root(container)).not.toHaveAttribute("role");
		expect(root(container)).not.toHaveAttribute("aria-live");
	});
});
