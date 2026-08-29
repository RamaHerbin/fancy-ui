import { createRef } from "react";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { Navbar } from "./Navbar.js";
import { NavbarLink } from "./NavbarLink.js";

function nav(container: HTMLElement): HTMLElement {
	return container.querySelector("nav") as HTMLElement;
}

describe("Navbar", () => {
	afterEach(cleanup);

	it("renders a nav landmark named 'Main' by default", () => {
		const { container } = render(<Navbar />);
		expect(nav(container)).toBeTruthy();
		expect(nav(container).getAttribute("aria-label")).toBe("Main");
	});

	it("accepts a custom accessible name", () => {
		const { container } = render(<Navbar label="Marketing" />);
		expect(nav(container).getAttribute("aria-label")).toBe("Marketing");
	});

	it("renders the brand, links and actions snippets, in that DOM order", () => {
		const { container } = render(
			<Navbar
				brand={<span data-testid="brand">FancyUI</span>}
				actions={<span data-testid="actions">Sign in</span>}
			>
				<span data-testid="links">Docs</span>
			</Navbar>
		);

		const nodes = Array.from(container.querySelectorAll("[data-testid]"));
		expect(nodes.map((n) => n.getAttribute("data-testid"))).toEqual(["brand", "links", "actions"]);
	});

	it("renders no empty wrapper elements for snippets that were not passed", () => {
		const { container } = render(
			<Navbar>
				<span data-testid="links">Docs</span>
			</Navbar>
		);
		expect(container.querySelector(".ft-navbar-brand")).toBeNull();
		expect(container.querySelector(".ft-navbar-actions")).toBeNull();
	});

	it("draws the bottom hairline by default and omits it when bordered is false", () => {
		const { container: withBorder } = render(<Navbar />);
		expect(nav(withBorder).className).toContain("border-b");

		cleanup();

		const { container: withoutBorder } = render(<Navbar bordered={false} />);
		expect(nav(withoutBorder).className).not.toContain("border-b");
	});

	it("applies sticky positioning and a blurred fill only when sticky is set", () => {
		const { container: still } = render(<Navbar />);
		expect(still.querySelector("nav")?.className).not.toContain("sticky");

		cleanup();

		const { container: pinned } = render(<Navbar sticky />);
		const el = pinned.querySelector("nav") as HTMLElement;
		expect(el.className).toContain("sticky");
		expect(el.className).toContain("backdrop-blur");
	});

	it("merges the class prop with the base classes", () => {
		const { container } = render(<Navbar className="mt-2" />);
		expect(nav(container).className).toContain("ft-navbar");
		expect(nav(container).className).toContain("mt-2");
	});

	it("binds the root element", () => {
		const ref = createRef<HTMLElement>();
		const { container } = render(<Navbar ref={ref} />);
		expect(ref.current).toBe(nav(container));
	});
});

describe("NavbarLink", () => {
	afterEach(cleanup);

	function link(container: HTMLElement): HTMLAnchorElement {
		return container.querySelector("a") as HTMLAnchorElement;
	}

	it("renders an anchor with the given href", () => {
		const { container } = render(<NavbarLink href="/docs" />);
		expect(link(container).getAttribute("href")).toBe("/docs");
	});

	it("marks the current link with aria-current and a visible weight/colour change, never colour alone", () => {
		const { container } = render(<NavbarLink href="/docs" current />);
		const el = link(container);
		expect(el.getAttribute("aria-current")).toBe("page");
		// "Never colour alone": the current state must also change font-weight.
		expect(el.className).toContain("font-medium");
	});

	it("carries no aria-current when not the current link", () => {
		const { container } = render(<NavbarLink href="/docs" current={false} />);
		expect(link(container).hasAttribute("aria-current")).toBe(false);
	});

	it("opens external links safely and notes it for assistive tech", () => {
		const { container } = render(<NavbarLink href="https://example.com" external />);
		const el = link(container);
		expect(el.getAttribute("target")).toBe("_blank");
		expect(el.getAttribute("rel")).toBe("noopener noreferrer");
		expect(container.querySelector(".sr-only")?.textContent).toContain("opens in a new tab");
	});

	it("omits target/rel and the hidden note for a same-tab link", () => {
		const { container } = render(<NavbarLink href="/docs" />);
		const el = link(container);
		expect(el.hasAttribute("target")).toBe(false);
		expect(el.hasAttribute("rel")).toBe(false);
		expect(container.querySelector(".sr-only")).toBeNull();
	});

	it("strips href, sets aria-disabled and tabindex -1, and blocks the click when disabled", async () => {
		const onClick = vi.fn();
		const { container } = render(<NavbarLink href="/docs" disabled onClick={onClick} />);
		const el = link(container);

		expect(el.hasAttribute("href")).toBe(false);
		expect(el.getAttribute("aria-disabled")).toBe("true");
		expect(el.getAttribute("tabindex")).toBe("-1");

		await fireEvent.click(el);
		expect(onClick).not.toHaveBeenCalled();
	});

	it("fires onClick when enabled", async () => {
		const onClick = vi.fn();
		const { container } = render(<NavbarLink href="/docs" onClick={onClick} />);

		await fireEvent.click(link(container));
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("renders the given children as its label", () => {
		const { container } = render(
			<NavbarLink href="/docs">
				<span>Docs</span>
			</NavbarLink>
		);
		expect(link(container).textContent?.trim()).toBe("Docs");
	});

	it("merges the class prop with the base classes", () => {
		const { container } = render(<NavbarLink href="/docs" className="mx-1" />);
		expect(link(container).className).toContain("ft-navbar-link");
		expect(link(container).className).toContain("mx-1");
	});

	// The accent underline moved from the anchor's own `box-shadow` to a
	// `::before` pseudo-element. That is a bug fix riding along inside a motion
	// change: the anchor's `box-shadow` is what `focus-visible:ring-2` compiles
	// to, and Svelte's unlayered scoped CSS was overwriting it, so until now the
	// current link had no visible focus ring at all. jsdom computes neither
	// pseudo-elements nor cascade layers, so what a test can pin is that the two
	// hooks still coexist on the same element and that `aria-current` — the only
	// thing the pseudo selects on — still appears exactly when it did.
	it("keeps the focus-ring utility on the current link alongside aria-current", () => {
		const { container } = render(<NavbarLink href="/docs" current />);
		const el = link(container);

		expect(el.getAttribute("aria-current")).toBe("page");
		expect(el.className).toContain("focus-visible:ring-2");
	});

	it("marks only the current link, leaving every other one without aria-current", () => {
		const { container: currentContainer } = render(<NavbarLink href="/docs" current />);
		const { container: plainContainer } = render(<NavbarLink href="/blog" />);

		expect(link(currentContainer).getAttribute("aria-current")).toBe("page");
		expect(link(plainContainer).hasAttribute("aria-current")).toBe(false);
	});

	it("reduced motion: the current marker still arrives, it just does not grow", () => {
		const real = window.matchMedia;
		window.matchMedia = ((query: string) => ({
			...real(query),
			matches: true,
		})) as typeof window.matchMedia;

		try {
			// The `scaleX` growth is declared only inside `no-preference`, so the
			// underline's resting state under this preference is un-transformed and
			// instant. Neither is observable in jsdom; what is observable is that
			// the attribute driving it is not gated on the preference in any way.
			const { container } = render(<NavbarLink href="/docs" current />);
			expect(link(container).getAttribute("aria-current")).toBe("page");
		} finally {
			window.matchMedia = real;
		}
	});

	it("binds the anchor element", () => {
		const ref = createRef<HTMLAnchorElement>();
		const { container } = render(<NavbarLink href="/docs" ref={ref} />);
		expect(ref.current).toBe(link(container));
	});
});
