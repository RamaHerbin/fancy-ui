import { render, screen, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Link from "./Link.svelte";

function textChildren(text: string) {
	return createRawSnippet(() => ({
		render: () => `<span>${text}</span>`,
	}));
}

describe("Link", () => {
	afterEach(cleanup);

	it("renders an <a> with the given href", () => {
		render(Link, { props: { href: "/docs/components/link" } });
		const anchor = screen.getByRole("link");
		expect(anchor.tagName).toBe("A");
		expect(anchor).toHaveAttribute("href", "/docs/components/link");
	});

	it("renders its children as the link content", () => {
		render(Link, {
			props: { href: "/docs", children: textChildren("Read the docs") },
		});
		expect(screen.getByRole("link", { name: "Read the docs" })).toBeInTheDocument();
	});

	describe("external", () => {
		it("defaults to no target, no rel, and no arrow when external is left off", () => {
			render(Link, { props: { href: "https://example.com" } });
			const anchor = screen.getByRole("link");

			expect(anchor).not.toHaveAttribute("target");
			expect(anchor).not.toHaveAttribute("rel");
			expect(anchor.querySelector("svg")).toBeNull();
		});

		it("opens in a new tab with a safe rel, and appends the arrow glyph", () => {
			render(Link, { props: { href: "https://example.com", external: true } });
			const anchor = screen.getByRole("link");

			expect(anchor).toHaveAttribute("target", "_blank");
			expect(anchor.getAttribute("rel")?.split(" ")).toEqual(
				expect.arrayContaining(["noopener", "noreferrer"])
			);

			const icon = anchor.querySelector("svg");
			expect(icon).not.toBeNull();
			expect(icon).toHaveAttribute("aria-hidden", "true");
		});

		it("announces the new tab through visually-hidden text, not just the glyph", () => {
			render(Link, { props: { href: "https://example.com", external: true } });
			const anchor = screen.getByRole("link");
			const hidden = anchor.querySelector(".sr-only");

			// Untrimmed: the leading space is what keeps the announcement from
			// running into the link text that precedes it.
			expect(hidden?.textContent).toBe(" (opens in a new tab)");
		});

		it("merges a caller-supplied rel with the forced safe tokens instead of replacing it", () => {
			render(Link, {
				props: { href: "https://example.com", external: true, rel: "nofollow" },
			});
			const tokens = screen.getByRole("link").getAttribute("rel")?.split(" ") ?? [];

			expect(tokens).toEqual(expect.arrayContaining(["nofollow", "noopener", "noreferrer"]));
		});

		it("lets a caller override the target while external still forces the safe rel", () => {
			render(Link, {
				props: { href: "https://example.com", external: true, target: "preview" },
			});
			const anchor = screen.getByRole("link");

			expect(anchor).toHaveAttribute("target", "preview");
			expect(anchor.getAttribute("rel")?.split(" ")).toEqual(
				expect.arrayContaining(["noopener", "noreferrer"])
			);
		});

		it("does not de-dupe away an already-safe caller rel", () => {
			render(Link, {
				props: { href: "https://example.com", external: true, rel: "noopener" },
			});
			expect(screen.getByRole("link").getAttribute("rel")?.split(" ").sort()).toEqual(
				["noopener", "noreferrer"].sort()
			);
		});
	});

	describe('a caller-supplied target="_blank" without external', () => {
		it("still gets the safe rel, merged with any caller rel", () => {
			render(Link, {
				props: { href: "https://example.com", target: "_blank", rel: "nofollow" },
			});
			const anchor = screen.getByRole("link");

			expect(anchor).toHaveAttribute("target", "_blank");
			expect(anchor.getAttribute("rel")?.split(" ")).toEqual(
				expect.arrayContaining(["nofollow", "noopener", "noreferrer"])
			);
		});

		it("does not render the external arrow, since external was never set", () => {
			render(Link, { props: { href: "https://example.com", target: "_blank" } });
			expect(screen.getByRole("link").querySelector("svg")).toBeNull();
		});
	});

	describe("a named target without external", () => {
		it("gets the safe rel too — a target naming a new context is not just literal _blank", () => {
			// Per the HTML standard, a target that names a browsing context which
			// doesn't already exist opens a new top-level one, opener intact,
			// exactly like _blank. This is the case the guard previously missed:
			// the earlier tests above all pair a non-_blank target with
			// `external: true`, which forces the tokens through a different
			// branch regardless of what this check does.
			render(Link, { props: { href: "https://example.com", target: "promo" } });
			const anchor = screen.getByRole("link");

			expect(anchor).toHaveAttribute("target", "promo");
			expect(anchor.getAttribute("rel")?.split(" ")).toEqual(
				expect.arrayContaining(["noopener", "noreferrer"])
			);
		});

		it("matches _blank case-insensitively, per the HTML standard", () => {
			render(Link, { props: { href: "https://example.com", target: "_BLANK" } });
			expect(screen.getByRole("link").getAttribute("rel")?.split(" ")).toEqual(
				expect.arrayContaining(["noopener", "noreferrer"])
			);
		});

		it.each(["_self", "_parent", "_top", "_Self"])(
			'leaves rel untouched for the same-tab keyword "%s"',
			(sameTabTarget) => {
				render(Link, {
					props: { href: "https://example.com", target: sameTabTarget, rel: "nofollow" },
				});
				expect(screen.getByRole("link").getAttribute("rel")).toBe("nofollow");
			}
		);
	});

	describe("underline", () => {
		it("shows the underline only on hover/focus by default", () => {
			render(Link, { props: { href: "/docs" } });
			const tokens = screen.getByRole("link").className.split(" ");

			expect(tokens).toContain("no-underline");
			expect(tokens).toContain("hover:underline");
			expect(tokens).toContain("focus-visible:underline");
			expect(tokens).not.toContain("underline");
		});

		it('always underlines when underline="always"', () => {
			render(Link, { props: { href: "/docs", underline: "always" } });
			const tokens = screen.getByRole("link").className.split(" ");

			expect(tokens).toContain("underline");
			expect(tokens).toContain("underline-offset-[3px]");
		});

		it('never underlines, even on hover, when underline="none"', () => {
			render(Link, { props: { href: "/docs", underline: "none" } });
			const tokens = screen.getByRole("link").className.split(" ");

			expect(tokens).not.toContain("underline");
			expect(tokens).not.toContain("hover:underline");
			expect(tokens).not.toContain("focus-visible:underline");
		});
	});

	describe("variant", () => {
		it("uses the default 14px text color treatment", () => {
			render(Link, { props: { href: "/docs" } });
			const cls = screen.getByRole("link").className;

			expect(cls).toContain("ft-link--default");
			expect(cls).toContain("text-sm");
		});

		it('recedes into supporting copy at 13px with variant="muted"', () => {
			render(Link, { props: { href: "/docs", variant: "muted" } });
			const cls = screen.getByRole("link").className;

			expect(cls).toContain("text-muted-foreground");
			expect(cls).toContain("text-[13px]");
			expect(cls).not.toContain("ft-link--default");
		});
	});

	it("calls onclick with the native event", async () => {
		const onclick = vi.fn();
		render(Link, { props: { href: "/docs", onclick } });

		await fireEvent.click(screen.getByRole("link"));

		expect(onclick).toHaveBeenCalledTimes(1);
		expect(onclick.mock.calls[0][0]).toBeInstanceOf(MouseEvent);
	});

	// The external arrow nudges a pixel up and to the right on hover and on
	// keyboard focus. jsdom computes neither `:hover`, `:focus-visible` nor the
	// `@media` blocks the rules live in, so what a test can pin is the class the
	// whole effect selects on — without `ft-link-icon` on the glyph, the rule
	// would match nothing.
	it("names the external arrow so the nudge has something to select on", () => {
		render(Link, { props: { href: "https://example.com", external: true } });
		const icon = screen.getByRole("link").querySelector(".ft-link-icon");

		expect(icon).toBeInTheDocument();
		expect(icon?.getAttribute("aria-hidden")).toBe("true");
	});

	it("reduced motion: the arrow is still rendered, it simply does not move", () => {
		const real = window.matchMedia;
		window.matchMedia = ((query: string) => ({
			...real(query),
			matches: true,
		})) as typeof window.matchMedia;

		try {
			// Both the transition and the hover/focus `translate` live inside
			// `@media (prefers-reduced-motion: no-preference)`, so under this
			// preference the arrow simply sits where it always sat. Nothing about
			// the markup — or the "(opens in a new tab)" note beside it — changes.
			render(Link, { props: { href: "https://example.com", external: true } });
			const anchor = screen.getByRole("link");

			expect(anchor.querySelector(".ft-link-icon")).toBeInTheDocument();
			expect(anchor.textContent).toContain("(opens in a new tab)");
		} finally {
			window.matchMedia = real;
		}
	});

	it("merges a custom class with the base classes", () => {
		render(Link, { props: { href: "/docs", class: "mt-2" } });
		const cls = screen.getByRole("link").className;

		expect(cls).toContain("mt-2");
		expect(cls).toContain("ft-link");
	});

	it("lets a conflicting utility in class win over the variant's own, proving cn() actually overrides", () => {
		// Plain string concatenation would leave both `text-sm` and `text-lg`
		// present — only tailwind-merge's conflict resolution drops the
		// earlier, losing utility. This asserts the winner is present AND the
		// loser is gone, so it fails if `class` stopped being merged last.
		render(Link, { props: { href: "/docs", class: "text-lg" } });
		const tokens = screen.getByRole("link").className.split(" ");

		expect(tokens).toContain("text-lg");
		expect(tokens).not.toContain("text-sm");
	});
});
