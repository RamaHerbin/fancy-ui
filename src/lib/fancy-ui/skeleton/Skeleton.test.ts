import { render, cleanup, screen, within } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import Skeleton from "./Skeleton.svelte";

// Skeleton's motion is entirely CSS-gated (no JS reduced-motion check, no
// listener/observer/timer of any kind besides the phase-sync effect below),
// so there is no unmount cleanup to exercise here — the common contract's
// "cleanup-on-unmount test" clause is scoped to components that actually
// register something to tear down.

function bones(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll<HTMLElement>(".ft-skeleton-bone"));
}

function root(container: HTMLElement): HTMLElement {
	return container.firstElementChild as HTMLElement;
}

const children = createRawSnippet(() => ({ render: () => "<p>Real content</p>" }));

describe("Skeleton", () => {
	afterEach(cleanup);

	it("renders one bone for the rect default", () => {
		const { container } = render(Skeleton);
		expect(bones(container)).toHaveLength(1);
		expect(root(container)).toHaveAttribute("data-variant", "rect");
	});

	it("renders `lines` bones for variant=text, with only the last one short", () => {
		const { container } = render(Skeleton, { props: { variant: "text", lines: 3 } });
		const rows = bones(container);
		expect(rows).toHaveLength(3);
		expect(rows[0]).not.toHaveClass("ft-skeleton-bone--short");
		expect(rows[1]).not.toHaveClass("ft-skeleton-bone--short");
		expect(rows[2]).toHaveClass("ft-skeleton-bone--short");
	});

	it("does not mark a single text line short", () => {
		const { container } = render(Skeleton, { props: { variant: "text", lines: 1 } });
		const rows = bones(container);
		expect(rows).toHaveLength(1);
		expect(rows[0]).not.toHaveClass("ft-skeleton-bone--short");
	});

	it("floors a fractional `lines`", () => {
		const { container } = render(Skeleton, { props: { variant: "text", lines: 2.9 } });
		expect(bones(container)).toHaveLength(2);
	});

	it("clamps a non-positive `lines` up to 1", () => {
		const { container } = render(Skeleton, { props: { variant: "text", lines: 0 } });
		expect(bones(container)).toHaveLength(1);
	});

	it("falls back to 1 for a non-finite `lines` (NaN)", () => {
		const { container } = render(Skeleton, { props: { variant: "text", lines: Number.NaN } });
		expect(bones(container)).toHaveLength(1);
	});

	it("marks every bone aria-hidden", () => {
		const { container } = render(Skeleton, { props: { variant: "text", lines: 2 } });
		for (const bone of bones(container)) {
			expect(bone).toHaveAttribute("aria-hidden", "true");
		}
	});

	it("reflects variant, animation, and loading as data attributes", () => {
		const { container } = render(Skeleton, { props: { variant: "circle", animation: "pulse" } });
		expect(root(container)).toHaveAttribute("data-variant", "circle");
		expect(root(container)).toHaveAttribute("data-animation", "pulse");
		expect(root(container)).toHaveAttribute("data-loading", "true");
	});

	it("merges a caller-supplied style with the internal phase custom property", () => {
		Object.defineProperty(document, "timeline", {
			configurable: true,
			value: { currentTime: 3700 },
		});
		try {
			const { container } = render(Skeleton, { props: { style: "width: 12rem" } });
			const style = root(container).getAttribute("style") ?? "";
			expect(style).toContain("width: 12rem");
			expect(style).toContain("--ft-skeleton-phase: -500ms");
		} finally {
			Reflect.deleteProperty(document, "timeline");
		}
	});

	describe("standalone mode (no children)", () => {
		it("puts role=status and aria-live=polite on the root, with one sr-only label", () => {
			render(Skeleton);
			const status = screen.getByRole("status");
			expect(status).toHaveAttribute("aria-live", "polite");
			expect(within(status).getByText("Loading")).toHaveClass("sr-only");
		});

		it("silences the announcement entirely when label is an empty string", () => {
			const { container } = render(Skeleton, { props: { label: "" } });
			const status = screen.getByRole("status");
			expect(status).toBe(root(container));
			expect(container.querySelector(".sr-only")).toBeNull();
		});

		it("renders nothing at all when loading is false and there is no content to swap to", () => {
			const { container } = render(Skeleton, { props: { loading: false } });
			expect(container.firstElementChild).toBeNull();
			expect(screen.queryByRole("status")).toBeNull();
		});
	});

	describe("wrapping mode (children present)", () => {
		it("hides children behind the bones while loading, with aria-busy and exactly one inner status span", () => {
			const { container } = render(Skeleton, { props: { loading: true, children } });
			const el = root(container);
			expect(el).not.toHaveAttribute("role", "status");
			expect(el).toHaveAttribute("aria-busy", "true");
			expect(bones(container).length).toBeGreaterThan(0);
			expect(container.textContent).not.toContain("Real content");

			const statuses = container.querySelectorAll('[role="status"]');
			expect(statuses).toHaveLength(1);
			expect(statuses[0]).not.toBe(el);
			expect(statuses[0]).toHaveAttribute("aria-live", "polite");
		});

		it("swaps to children once loading is false, leaving no bones and an emptied status region", () => {
			const { container } = render(Skeleton, { props: { loading: false, children } });
			expect(container.textContent).toContain("Real content");
			expect(bones(container)).toHaveLength(0);
			const status = container.querySelector('[role="status"]');
			expect(status).not.toBeNull();
			expect(status?.textContent).toBe("");
			expect(root(container)).not.toHaveAttribute("aria-busy");
			expect(root(container)).not.toHaveAttribute("data-loading");
		});

		it("keeps the live region mounted across a loading toggle — turning loading on is a text change, not an insertion", async () => {
			// A live region inserted already populated is announced unreliably;
			// assistive tech has to see the region before its text changes. The
			// same node has to survive the false → true reuse flow for that.
			const { container, rerender } = render(Skeleton, { props: { loading: false, children } });
			const status = container.querySelector('[role="status"]');
			expect(status).not.toBeNull();
			expect(status?.textContent).toBe("");

			await rerender({ loading: true, children });

			expect(container.querySelector('[role="status"]')).toBe(status);
			expect(status?.textContent).toBe("Loading");
		});

		it("silences the inner status span too when label is an empty string", () => {
			const { container } = render(Skeleton, { props: { loading: true, label: "", children } });
			expect(container.querySelector('[role="status"]')).toBeNull();
			expect(bones(container).length).toBeGreaterThan(0);
		});
	});

	it("merges the class prop with the base classes", () => {
		const { container } = render(Skeleton, { props: { class: "h-4 w-40" } });
		expect(root(container).className).toContain("h-4");
		expect(root(container).className).toContain("w-40");
		expect(root(container).className).toContain("ft-skeleton");
	});

	describe("shimmer phase sync", () => {
		it("writes a negative --ft-skeleton-phase from document.timeline.currentTime", () => {
			// 3700 % 1600 = 500, so the shimmer's own 1.6s cycle should be offset
			// -500ms to line this instance up with the shared page timeline.
			Object.defineProperty(document, "timeline", {
				configurable: true,
				value: { currentTime: 3700 },
			});
			try {
				const { container } = render(Skeleton);
				expect(root(container).getAttribute("style") ?? "").toContain(
					"--ft-skeleton-phase: -500ms"
				);
			} finally {
				// jsdom ships no document.timeline of its own; remove the stub
				// rather than leaving a fake one for later test files.
				Reflect.deleteProperty(document, "timeline");
			}
		});

		it("omits the phase var when document.timeline is unavailable (the real jsdom default)", () => {
			expect(document.timeline).toBeUndefined();
			const { container } = render(Skeleton);
			expect(container.firstElementChild).not.toBeNull();
			expect(root(container).getAttribute("style") ?? "").not.toContain("--ft-skeleton-phase");
		});
	});

	// Reduced motion suppresses the shimmer/pulse animations entirely in CSS
	// (both keyframe rules live inside `@media (prefers-reduced-motion:
	// no-preference)`), so there is no JS branch to exercise here — this test
	// documents the DOM/attribute contract stays correct under the preference,
	// matching the project's own testing boundary (jsdom cannot assert "the
	// gradient doesn't move," only what drives the CSS that does).
	it("reduced motion: the DOM/attribute contract is unaffected", () => {
		const original = window.matchMedia;
		Object.defineProperty(window, "matchMedia", {
			writable: true,
			configurable: true,
			value: (query: string) => ({
				matches: true,
				media: query,
				onchange: null,
				addEventListener: () => {},
				removeEventListener: () => {},
				dispatchEvent: () => false,
				addListener: () => {},
				removeListener: () => {},
			}),
		});
		try {
			const { container } = render(Skeleton, { props: { animation: "shimmer" } });
			expect(root(container)).toHaveAttribute("data-animation", "shimmer");
			expect(bones(container)).toHaveLength(1);
		} finally {
			Object.defineProperty(window, "matchMedia", {
				writable: true,
				configurable: true,
				value: original,
			});
		}
	});
});
