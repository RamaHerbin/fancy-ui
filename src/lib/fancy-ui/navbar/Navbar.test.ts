import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Navbar from "./Navbar.svelte";
import NavbarLink from "./NavbarLink.svelte";

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

function nav(container: HTMLElement): HTMLElement {
	return container.querySelector("nav") as HTMLElement;
}

describe("Navbar", () => {
	afterEach(cleanup);

	it("renders a nav landmark named 'Main' by default", () => {
		const { container } = render(Navbar);
		expect(nav(container)).toBeTruthy();
		expect(nav(container).getAttribute("aria-label")).toBe("Main");
	});

	it("accepts a custom accessible name", () => {
		const { container } = render(Navbar, { props: { label: "Marketing" } });
		expect(nav(container).getAttribute("aria-label")).toBe("Marketing");
	});

	it("renders the brand, links and actions snippets, in that DOM order", () => {
		const { container } = render(Navbar, {
			props: {
				brand: snippet('<span data-testid="brand">FancyUI</span>'),
				children: snippet('<span data-testid="links">Docs</span>'),
				actions: snippet('<span data-testid="actions">Sign in</span>'),
			},
		});

		const nodes = Array.from(container.querySelectorAll("[data-testid]"));
		expect(nodes.map((n) => n.getAttribute("data-testid"))).toEqual(["brand", "links", "actions"]);
	});

	it("renders no empty wrapper elements for snippets that were not passed", () => {
		const { container } = render(Navbar, {
			props: { children: snippet('<span data-testid="links">Docs</span>') },
		});
		expect(container.querySelector(".ft-navbar-brand")).toBeNull();
		expect(container.querySelector(".ft-navbar-actions")).toBeNull();
	});

	it("draws the bottom hairline by default and omits it when bordered is false", () => {
		const { container: withBorder } = render(Navbar);
		expect(nav(withBorder).className).toContain("border-b");

		cleanup();

		const { container: withoutBorder } = render(Navbar, { props: { bordered: false } });
		expect(nav(withoutBorder).className).not.toContain("border-b");
	});

	it("applies sticky positioning and a blurred fill only when sticky is set", () => {
		const { container: still } = render(Navbar);
		expect(still.querySelector("nav")?.className).not.toContain("sticky");

		cleanup();

		const { container: pinned } = render(Navbar, { props: { sticky: true } });
		const el = pinned.querySelector("nav") as HTMLElement;
		expect(el.className).toContain("sticky");
		expect(el.className).toContain("backdrop-blur");
	});

	it("merges the class prop with the base classes", () => {
		const { container } = render(Navbar, { props: { class: "mt-2" } });
		expect(nav(container).className).toContain("ft-navbar");
		expect(nav(container).className).toContain("mt-2");
	});

	it("binds the root element", () => {
		let ref: HTMLElement | null = null;
		const { container } = render(Navbar, {
			props: {
				get ref() {
					return ref;
				},
				set ref(value: HTMLElement | null) {
					ref = value;
				},
			},
		});
		expect(ref).toBe(nav(container));
	});
});

describe("NavbarLink", () => {
	afterEach(cleanup);

	function link(container: HTMLElement): HTMLAnchorElement {
		return container.querySelector("a") as HTMLAnchorElement;
	}

	it("renders an anchor with the given href", () => {
		const { container } = render(NavbarLink, { props: { href: "/docs" } });
		expect(link(container).getAttribute("href")).toBe("/docs");
	});

	it("marks the current link with aria-current and a visible weight/colour change, never colour alone", () => {
		const { container } = render(NavbarLink, { props: { href: "/docs", current: true } });
		const el = link(container);
		expect(el.getAttribute("aria-current")).toBe("page");
		// "Never colour alone": the current state must also change font-weight.
		expect(el.className).toContain("font-medium");
	});

	it("carries no aria-current when not the current link", () => {
		const { container } = render(NavbarLink, { props: { href: "/docs", current: false } });
		expect(link(container).hasAttribute("aria-current")).toBe(false);
	});

	it("opens external links safely and notes it for assistive tech", () => {
		const { container } = render(NavbarLink, {
			props: { href: "https://example.com", external: true },
		});
		const el = link(container);
		expect(el.getAttribute("target")).toBe("_blank");
		expect(el.getAttribute("rel")).toBe("noopener noreferrer");
		expect(container.querySelector(".sr-only")?.textContent).toContain("opens in a new tab");
	});

	it("omits target/rel and the hidden note for a same-tab link", () => {
		const { container } = render(NavbarLink, { props: { href: "/docs" } });
		const el = link(container);
		expect(el.hasAttribute("target")).toBe(false);
		expect(el.hasAttribute("rel")).toBe(false);
		expect(container.querySelector(".sr-only")).toBeNull();
	});

	it("strips href, sets aria-disabled and tabindex -1, and blocks the click when disabled", async () => {
		const onclick = vi.fn();
		const { container } = render(NavbarLink, {
			props: { href: "/docs", disabled: true, onclick },
		});
		const el = link(container);

		expect(el.hasAttribute("href")).toBe(false);
		expect(el.getAttribute("aria-disabled")).toBe("true");
		expect(el.getAttribute("tabindex")).toBe("-1");

		await fireEvent.click(el);
		expect(onclick).not.toHaveBeenCalled();
	});

	it("fires onclick when enabled", async () => {
		const onclick = vi.fn();
		const { container } = render(NavbarLink, { props: { href: "/docs", onclick } });

		await fireEvent.click(link(container));
		expect(onclick).toHaveBeenCalledTimes(1);
	});

	it("renders the given children as its label", () => {
		const { container } = render(NavbarLink, {
			props: { href: "/docs", children: snippet("<span>Docs</span>") },
		});
		expect(link(container).textContent?.trim()).toBe("Docs");
	});

	it("merges the class prop with the base classes", () => {
		const { container } = render(NavbarLink, { props: { href: "/docs", class: "mx-1" } });
		expect(link(container).className).toContain("ft-navbar-link");
		expect(link(container).className).toContain("mx-1");
	});

	it("binds the anchor element", () => {
		let ref: HTMLAnchorElement | null = null;
		const { container } = render(NavbarLink, {
			props: {
				href: "/docs",
				get ref() {
					return ref;
				},
				set ref(value: HTMLAnchorElement | null) {
					ref = value;
				},
			},
		});
		expect(ref).toBe(link(container));
	});
});
