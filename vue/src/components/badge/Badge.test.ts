import { render, cleanup, screen } from "@testing-library/vue";
import { afterEach, describe, expect, it } from "vitest";
import Badge from "./Badge.vue";

const mount = render as unknown as (
	comp: unknown,
	options: {
		props?: Record<string, unknown>;
		attrs?: Record<string, unknown>;
		slots?: Record<string, unknown>;
	}
) => ReturnType<typeof render>;

afterEach(cleanup);

const slot = { default: "x" };

function root(container: Element): HTMLElement {
	return container.firstElementChild as HTMLElement;
}

describe("Badge", () => {
	it("renders its slot inside an inline span", () => {
		const { container } = mount(Badge, { slots: { default: "<span>3 unread</span>" } });
		expect(root(container).tagName).toBe("SPAN");
		expect(root(container)).toHaveTextContent("3 unread");
		expect(screen.getByText("3 unread")).toBeInTheDocument();
	});

	it("renders an empty pill without a slot rather than throwing", () => {
		const { container } = mount(Badge, {});
		// An empty slot leaves a comment anchor, never an element or text.
		expect(root(container).children).toHaveLength(0);
		expect(root(container).textContent).toBe("");
	});

	it("defaults to the default variant and the md size", () => {
		const { container } = mount(Badge, { slots: slot });
		expect(root(container)).toHaveAttribute("data-variant", "default");
		expect(root(container)).toHaveAttribute("data-size", "md");
	});

	it.each([
		["default", ["bg-primary", "text-primary-foreground"]],
		["secondary", ["bg-secondary", "text-secondary-foreground"]],
		["outline", ["border-border", "text-foreground"]],
		["destructive", ["bg-destructive/10", "text-destructive-foreground-soft"]],
		["success", ["bg-emerald-500/10"]],
	] as const)("styles the %s variant", (variant, classes) => {
		const { container } = mount(Badge, { props: { variant }, slots: slot });
		expect(root(container)).toHaveAttribute("data-variant", variant);
		expect(root(container)).toHaveClass(...classes);
	});

	it("gives each variant its own look", () => {
		const seen = new Set<string>();
		for (const variant of ["default", "secondary", "outline", "destructive", "success"] as const) {
			const { container, unmount } = mount(Badge, { props: { variant }, slots: slot });
			seen.add(root(container).className);
			unmount();
		}
		expect(seen.size).toBe(5);
	});

	it("keeps a border on every variant so they share one height", () => {
		for (const variant of ["default", "secondary", "outline", "destructive", "success"] as const) {
			const { container, unmount } = mount(Badge, { props: { variant }, slots: slot });
			expect(root(container)).toHaveClass("border");
			unmount();
		}
	});

	it.each([
		["sm", "text-[0.6875rem]"],
		["md", "text-xs"],
	] as const)("renders the %s size", (size, cls) => {
		const { container } = mount(Badge, { props: { size }, slots: slot });
		expect(root(container)).toHaveAttribute("data-size", size);
		expect(root(container)).toHaveClass(cls);
	});

	it("makes sm tighter than md", () => {
		const sm = mount(Badge, { props: { size: "sm" }, slots: slot });
		const smClass = root(sm.container).className;
		sm.unmount();
		const md = mount(Badge, { props: { size: "md" }, slots: slot });
		expect(smClass).toContain("px-1.5");
		expect(root(md.container).className).toContain("px-2");
		expect(root(md.container).className).not.toContain("px-1.5");
	});

	it("merges a caller class over the base classes", () => {
		const { container } = mount(Badge, { props: { class: "rounded-md uppercase" }, slots: slot });
		expect(root(container)).toHaveClass("rounded-md", "uppercase");
		expect(root(container)).not.toHaveClass("rounded-full");
	});

	it("adds no role: a badge is text, not a widget", () => {
		const { container } = mount(Badge, { slots: slot });
		expect(root(container)).not.toHaveAttribute("role");
		expect(root(container)).not.toHaveAttribute("aria-live");
	});
});
