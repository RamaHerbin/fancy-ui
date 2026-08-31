import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Skeleton } from "./Skeleton.js";

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

const children = <p>Real content</p>;

/**
 * Test-only rig for the reveal. `loading` is held as local state and flipped
 * from a button inside this component, deliberately, rather than driven from
 * the test through `rerender()`: the reveal's fade window is a couple of
 * microtasks under the stubbed Web Animations API, and a click inside a
 * SYNCHRONOUS `act` flips the state, flushes the renders and effects that
 * mount the overlay and start its fade, but does NOT drain the microtask the
 * stubbed animation finishes on — so the window stays observable.
 *
 * Children are real interactive content, because two of the things the reveal
 * must guarantee are about the content, not the bones: that it is queryable
 * immediately rather than after the fade, and that it is clickable while the
 * bones are still painted over it.
 */
function RevealHarness({
	variant = "text",
	lines = 2,
	label = "Loading",
	onContentClick,
}: {
	/** Forwarded straight through, so one rig covers every variant. */
	variant?: "rect" | "text" | "circle";
	lines?: number;
	label?: string;
	/** Called when the revealed content is clicked. */
	onContentClick?: () => void;
}) {
	// Always starts loading, so the first click is a genuine reveal.
	// "Mounts already revealed" is a first-render question and is asserted
	// against Skeleton directly.
	const [loading, setLoading] = useState(true);

	return (
		<>
			<button type="button" data-testid="toggle" onClick={() => setLoading((v) => !v)}>
				toggle
			</button>
			<Skeleton loading={loading} variant={variant} lines={lines} label={label} className="w-48">
				<p>
					Real content
					<button type="button" data-testid="content-button" onClick={() => onContentClick?.()}>
						act
					</button>
				</p>
			</Skeleton>
		</>
	);
}

describe("Skeleton", () => {
	afterEach(cleanup);

	it("renders one bone for the rect default", () => {
		const { container } = render(<Skeleton />);
		expect(bones(container)).toHaveLength(1);
		expect(root(container)).toHaveAttribute("data-variant", "rect");
	});

	it("renders `lines` bones for variant=text, with only the last one short", () => {
		const { container } = render(<Skeleton variant="text" lines={3} />);
		const rows = bones(container);
		expect(rows).toHaveLength(3);
		expect(rows[0]).not.toHaveClass("ft-skeleton-bone--short");
		expect(rows[1]).not.toHaveClass("ft-skeleton-bone--short");
		expect(rows[2]).toHaveClass("ft-skeleton-bone--short");
	});

	it("does not mark a single text line short", () => {
		const { container } = render(<Skeleton variant="text" lines={1} />);
		const rows = bones(container);
		expect(rows).toHaveLength(1);
		expect(rows[0]).not.toHaveClass("ft-skeleton-bone--short");
	});

	it("floors a fractional `lines`", () => {
		const { container } = render(<Skeleton variant="text" lines={2.9} />);
		expect(bones(container)).toHaveLength(2);
	});

	it("clamps a non-positive `lines` up to 1", () => {
		const { container } = render(<Skeleton variant="text" lines={0} />);
		expect(bones(container)).toHaveLength(1);
	});

	it("falls back to 1 for a non-finite `lines` (NaN)", () => {
		const { container } = render(<Skeleton variant="text" lines={Number.NaN} />);
		expect(bones(container)).toHaveLength(1);
	});

	it("marks every bone aria-hidden", () => {
		const { container } = render(<Skeleton variant="text" lines={2} />);
		for (const bone of bones(container)) {
			expect(bone).toHaveAttribute("aria-hidden", "true");
		}
	});

	it("reflects variant, animation, and loading as data attributes", () => {
		const { container } = render(<Skeleton variant="circle" animation="pulse" />);
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
			const { container } = render(<Skeleton style={{ width: "12rem" }} />);
			const style = root(container).getAttribute("style") ?? "";
			expect(style).toContain("width: 12rem");
			expect(style).toContain("--ft-skeleton-phase: -500ms");
		} finally {
			Reflect.deleteProperty(document, "timeline");
		}
	});

	describe("standalone mode (no children)", () => {
		it("puts role=status and aria-live=polite on the root, with one sr-only label", () => {
			render(<Skeleton />);
			const status = screen.getByRole("status");
			expect(status).toHaveAttribute("aria-live", "polite");
			expect(within(status).getByText("Loading")).toHaveClass("sr-only");
		});

		it("silences the announcement entirely when label is an empty string", () => {
			const { container } = render(<Skeleton label="" />);
			const status = screen.getByRole("status");
			expect(status).toBe(root(container));
			expect(container.querySelector(".sr-only")).toBeNull();
		});

		it("renders nothing at all when loading is false and there is no content to swap to", () => {
			const { container } = render(<Skeleton loading={false} />);
			expect(container.firstElementChild).toBeNull();
			expect(screen.queryByRole("status")).toBeNull();
		});
	});

	describe("wrapping mode (children present)", () => {
		it("hides children behind the bones while loading, with aria-busy and exactly one inner status span", () => {
			const { container } = render(<Skeleton loading={true}>{children}</Skeleton>);
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
			const { container } = render(<Skeleton loading={false}>{children}</Skeleton>);
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
			const { container, rerender } = render(<Skeleton loading={false}>{children}</Skeleton>);
			const status = container.querySelector('[role="status"]');
			expect(status).not.toBeNull();
			expect(status?.textContent).toBe("");

			rerender(<Skeleton loading={true}>{children}</Skeleton>);

			expect(container.querySelector('[role="status"]')).toBe(status);
			expect(status?.textContent).toBe("Loading");
		});

		it("silences the inner status span too when label is an empty string", () => {
			const { container } = render(
				<Skeleton loading={true} label="">
					{children}
				</Skeleton>
			);
			expect(container.querySelector('[role="status"]')).toBeNull();
			expect(bones(container).length).toBeGreaterThan(0);
		});
	});

	// The reveal: the bones no longer cut to the content, they fade out on top
	// of it. Everything below is about the window between those two — which is
	// 200ms in a browser and a couple of microtasks under the WAAPI stub, so
	// the flip is driven by a CLICK inside the harness, wrapped in a
	// SYNCHRONOUS `act` (which flushes renders and effects but does not drain
	// the microtask the stubbed animation finishes on), and the removal is
	// awaited with `waitFor`.
	describe("the reveal (wrapping mode)", () => {
		function overlay(container: HTMLElement): HTMLElement | null {
			return container.querySelector<HTMLElement>(".ft-skeleton-bones-out");
		}

		// A raw `.click()` inside a synchronous `act`, never `fireEvent.click`
		// followed by an await: an async boundary would drain the stub's
		// microtask chain before the assertion ever ran, and under the stubbed
		// Web Animations API a microtask is the whole fade.
		function reveal(container: HTMLElement): void {
			act(() => {
				within(container).getByTestId("toggle").click();
			});
		}

		it("keeps the bones on screen, aria-hidden and out of flow, then drops them", async () => {
			const { container } = render(<RevealHarness />);
			expect(bones(container).length).toBe(2);

			reveal(container);

			const lingering = overlay(container);
			expect(lingering).not.toBeNull();
			expect(lingering).toHaveAttribute("aria-hidden", "true");
			expect(bones(container).length).toBe(2);
			// The bones that are left are the overlay's, never in-flow ones:
			// the content is what sizes the root from the first frame.
			for (const bone of bones(container)) {
				expect(lingering!.contains(bone)).toBe(true);
			}

			await waitFor(() => expect(overlay(container)).toBeNull());
			expect(bones(container)).toHaveLength(0);
		});

		// The whole point of the design. If the content only became queryable
		// once the fade ended, the reveal would be a 200ms hole in the page
		// rather than a dissolve over content that is already there.
		it("hands over the real content immediately, not after the fade", async () => {
			const onContentClick = vi.fn();
			const { container } = render(<RevealHarness onContentClick={onContentClick} />);

			reveal(container);

			expect(container.textContent).toContain("Real content");
			// And it is interactive while the bones are still painted over it:
			// the overlay is `pointer-events: none`, asserted below.
			fireEvent.click(within(container).getByTestId("content-button"));
			expect(onContentClick).toHaveBeenCalledTimes(1);

			// Let the in-flight fade settle inside act, so its state update
			// does not land after the test body has returned.
			await act(async () => {});
		});

		// jsdom applies no stylesheet, so the property itself is unobservable
		// here; the class that carries it is the testable half. `.ft-skeleton-
		// bones-out` exists for exactly two declarations — `position: absolute`
		// and `pointer-events: none` — and a tidy-up that drops either one
		// would make the reveal cover the content it is fading over.
		it("puts the lingering bones in the class that takes them out of flow and out of the way", async () => {
			const { container } = render(<RevealHarness />);

			reveal(container);

			expect(overlay(container)).not.toBeNull();
			expect(overlay(container)!.className).toContain("ft-skeleton-bones-out");

			await act(async () => {});
		});

		// A live region that outlives its own ANNOUNCEMENT is the bug the
		// component's own comment warns about — not the region itself, which
		// deliberately stays mounted so a later `loading` flip is a text
		// change rather than an insertion (see the toggle test above; an
		// already-populated region inserted fresh is announced unreliably).
		// What must not survive the reveal is the TEXT, and the overlay must
		// never carry a second copy of the region into the fade.
		it("empties the status span with the in-flow bones rather than lingering the announcement into the fade", async () => {
			const { container } = render(<RevealHarness />);
			const status = container.querySelector('[role="status"]');
			expect(container.querySelectorAll('[role="status"]')).toHaveLength(1);
			expect(status?.textContent).not.toBe("");

			reveal(container);

			// The same node, emptied — not a second one, and not one copied
			// into the lingering bones.
			expect(container.querySelectorAll('[role="status"]')).toHaveLength(1);
			expect(container.querySelector('[role="status"]')).toBe(status);
			expect(status?.textContent).toBe("");
			expect(overlay(container)!.querySelector('[role="status"]')).toBeNull();
			// aria-busy goes at the same instant, for the same reason.
			expect(container.querySelector(".ft-skeleton")).not.toHaveAttribute("aria-busy");

			await act(async () => {});
		});

		// `duration: 0` finishes the exit synchronously and never touches
		// `element.animate()`, so a visitor who asked for less motion gets
		// exactly the instant swap this component had before the reveal
		// existed — the overlay is gone in the same flush it mounted.
		it("reduced motion: swaps instantly, with no overlay and no animation", () => {
			vi.stubGlobal("matchMedia", (query: string) => ({
				matches: /prefers-reduced-motion:\s*reduce\b/.test(query),
				media: query,
				onchange: null,
				addEventListener: () => {},
				removeEventListener: () => {},
				dispatchEvent: () => false,
				addListener: () => {},
				removeListener: () => {},
			}));
			const animateSpy = vi.spyOn(Element.prototype, "animate");
			try {
				const { container } = render(<RevealHarness />);

				reveal(container);

				expect(overlay(container)).toBeNull();
				expect(bones(container)).toHaveLength(0);
				expect(container.textContent).toContain("Real content");
				expect(animateSpy).not.toHaveBeenCalled();
			} finally {
				animateSpy.mockRestore();
				vi.unstubAllGlobals();
			}
		});

		// Mounting already revealed is not a reveal: there is nothing to fade
		// out, and a set of bones flashed over content that was never hidden
		// would be a new defect rather than a nicety.
		it("never flashes bones for a Skeleton that mounts with loading already false", async () => {
			const { container } = render(<Skeleton loading={false}>{children}</Skeleton>);

			expect(overlay(container)).toBeNull();
			expect(bones(container)).toHaveLength(0);
			// Not just on the first frame: the arming effect runs after the
			// first render, and must not arm a reveal that never happened.
			await act(async () => {});
			expect(overlay(container)).toBeNull();
			expect(bones(container)).toHaveLength(0);
		});

		// Going back to loading re-arms the reveal rather than spending it
		// once per instance — a list that refetches shows its bones again, and
		// the next reveal fades them out the same way the first one did.
		it("re-arms when loading goes true again", async () => {
			const { container } = render(<RevealHarness />);

			reveal(container);
			await waitFor(() => expect(overlay(container)).toBeNull());

			// Back to loading: in-flow bones and the live region return.
			reveal(container);
			expect(overlay(container)).toBeNull();
			expect(bones(container).length).toBe(2);
			expect(container.querySelectorAll('[role="status"]')).toHaveLength(1);

			// And the second reveal lingers exactly like the first.
			reveal(container);
			expect(overlay(container)).not.toBeNull();
			await waitFor(() => expect(overlay(container)).toBeNull());
		});
	});

	it("merges the className prop with the base classes", () => {
		const { container } = render(<Skeleton className="h-4 w-40" />);
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
				const { container } = render(<Skeleton />);
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
			const { container } = render(<Skeleton />);
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
			const { container } = render(<Skeleton animation="shimmer" />);
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
