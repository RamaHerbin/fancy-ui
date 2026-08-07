import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import RecommendationCard from "./RecommendationCard.svelte";
import Harness from "./RecommendationCardHarness.test.svelte";

const TITLE = "Add an index on orders.customer_id";

function root(container: HTMLElement): HTMLElement {
	return container.querySelector(".ft-rec") as HTMLElement;
}

function accept(container: HTMLElement): HTMLButtonElement {
	return container.querySelector(".ft-rec-accept") as HTMLButtonElement;
}

function dismiss(container: HTMLElement): HTMLButtonElement {
	return container.querySelector(".ft-rec-dismiss") as HTMLButtonElement;
}

function resolved(container: HTMLElement): HTMLElement | null {
	return container.querySelector(".ft-rec-resolved");
}

function confidence(container: HTMLElement): HTMLElement | null {
	return container.querySelector(".ft-rec-confidence");
}

function ring(container: HTMLElement): SVGCircleElement | null {
	return container.querySelector(".ft-rec-ring-value");
}

function offset(container: HTMLElement): number {
	return Number((ring(container) as SVGCircleElement).getAttribute("stroke-dashoffset"));
}

/** The circumference the dash array runs on — the offset of a ring drawn empty. */
const RING_C = 2 * Math.PI * 13;

/**
 * Two real frames, then a Svelte flush: what the ring waits for before it writes
 * its target, so the empty state reaches the screen first.
 */
async function settle(): Promise<void> {
	await new Promise<void>((resolve) =>
		requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
	);
	await tick();
}

describe("RecommendationCard", () => {
	afterEach(cleanup);

	it("renders the proposal and names the group after it", () => {
		const { container } = render(RecommendationCard, { props: { title: TITLE } });

		expect(container.querySelector(".ft-rec-title")?.textContent).toBe(TITLE);
		expect(root(container).getAttribute("role")).toBe("group");
		expect(root(container).getAttribute("aria-label")).toBe(TITLE);
		expect(root(container).dataset.state).toBe("open");
	});

	it("renders the description under the title", () => {
		const { container } = render(RecommendationCard, {
			props: { title: TITLE, description: "The last three slow queries scanned the whole table." },
		});

		expect(container.querySelector(".ft-rec-description")?.textContent?.trim()).toBe(
			"The last three slow queries scanned the whole table."
		);
	});

	it("leaves the description line out when there is none", () => {
		const { container } = render(RecommendationCard, { props: { title: TITLE } });

		expect(container.querySelector(".ft-rec-description")).toBeNull();
	});

	it("renders the badge as a kicker above the title", () => {
		const { container } = render(RecommendationCard, {
			props: { title: TITLE, badge: "Suggestion" },
		});

		expect(container.querySelector(".ft-rec-badge")?.textContent?.trim()).toBe("Suggestion");
	});

	it("leaves the kicker out when there is no badge", () => {
		const { container } = render(RecommendationCard, { props: { title: TITLE } });

		expect(container.querySelector(".ft-rec-badge")).toBeNull();
	});

	it.each([
		[0.8, 80, "ft-status-done"],
		[0.6, 60, "ft-status-running"],
		[0.3, 30, "ft-status-pending"],
	])("reports %s as a percentage in the %s band", (value, percent, className) => {
		const { container } = render(RecommendationCard, {
			props: { title: TITLE, confidence: value },
		});

		const block = confidence(container) as HTMLElement;
		expect(block.getAttribute("aria-label")).toBe(`Confidence ${percent}%`);
		expect(block.dataset.band).toBe(className.replace("ft-status-", ""));
		expect(block.textContent).toContain("%");
		expect(ring(container)?.classList.contains(className)).toBe(true);
	});

	it("drops the whole confidence block when none was reported", () => {
		const { container } = render(RecommendationCard, { props: { title: TITLE } });

		expect(confidence(container)).toBeNull();
		expect(ring(container)).toBeNull();
		expect(root(container).textContent).not.toContain("%");
	});

	it("treats a confidence that is not a real number as no confidence at all", () => {
		const { container } = render(RecommendationCard, {
			props: { title: TITLE, confidence: Number.NaN },
		});

		expect(confidence(container)).toBeNull();
	});

	it.each([
		[1.4, 100, "ft-status-done"],
		[-0.5, 0, "ft-status-pending"],
	])("clamps a confidence of %s into range", (value, percent, className) => {
		const { container } = render(RecommendationCard, {
			props: { title: TITLE, confidence: value },
		});

		expect(confidence(container)?.getAttribute("aria-label")).toBe(`Confidence ${percent}%`);
		expect(ring(container)?.classList.contains(className)).toBe(true);
	});

	it("paints the ring empty first, so the fill has somewhere to run from", async () => {
		const { container } = render(RecommendationCard, {
			props: { title: TITLE, confidence: 0.8 },
		});

		// A transition never animates from a value the browser has not painted, so
		// the settled arc must not be the first thing on screen.
		await tick();
		expect(offset(container)).toBeCloseTo(RING_C, 5);

		await settle();
		expect(offset(container)).toBeCloseTo(RING_C * 0.2, 5);
	});

	it("sweeps more of the ring for a higher confidence", async () => {
		const high = render(RecommendationCard, { props: { title: TITLE, confidence: 0.8 } });
		const low = render(RecommendationCard, { props: { title: TITLE, confidence: 0.3 } });
		await settle();

		const arc = (container: HTMLElement) => {
			const circle = ring(container) as SVGCircleElement;
			const length = Number(circle.getAttribute("stroke-dasharray"));
			const gap = Number(circle.getAttribute("stroke-dashoffset"));
			return { length, drawn: length - gap };
		};

		const highArc = arc(high.container);
		const lowArc = arc(low.container);

		expect(highArc.length).toBeGreaterThan(0);
		expect(highArc.drawn).toBeGreaterThan(lowArc.drawn);
		expect(highArc.drawn).toBeLessThan(highArc.length);
		expect(highArc.drawn / highArc.length).toBeCloseTo(0.8, 2);
	});

	it("skips the empty frame entirely under reduced motion", async () => {
		const real = window.matchMedia;
		window.matchMedia = ((query: string) => ({
			...real(query),
			matches: true,
		})) as typeof window.matchMedia;

		try {
			const { container } = render(RecommendationCard, {
				props: { title: TITLE, confidence: 0.8 },
			});
			await tick();

			// No frame of empty ring to notice: the settled arc is the first one drawn.
			expect(offset(container)).toBeCloseTo(RING_C * 0.2, 5);
		} finally {
			window.matchMedia = real;
		}
	});

	it("hides the counter and the ring behind the one spoken figure", () => {
		const { container } = render(RecommendationCard, {
			props: { title: TITLE, confidence: 0.87 },
		});

		expect(confidence(container)?.getAttribute("role")).toBe("img");
		expect(container.querySelector(".ft-rec-percent")?.getAttribute("aria-hidden")).toBe("true");
		expect(container.querySelector(".ft-rec-ring")?.getAttribute("aria-hidden")).toBe("true");
	});

	it("labels the buttons, with the defaults left to speak for themselves", () => {
		const { container } = render(RecommendationCard, { props: { title: TITLE } });

		expect(accept(container).textContent?.trim()).toBe("Apply");
		expect(dismiss(container).textContent?.trim()).toBe("Dismiss");
	});

	it("takes custom labels for both buttons", () => {
		const { container } = render(RecommendationCard, {
			props: { title: TITLE, acceptLabel: "Apply patch", dismissLabel: "Not now" },
		});

		expect(accept(container).textContent?.trim()).toBe("Apply patch");
		expect(dismiss(container).textContent?.trim()).toBe("Not now");
	});

	it("calls onAccept and marks the card accepted", async () => {
		const onAccept = vi.fn();
		const { container } = render(RecommendationCard, { props: { title: TITLE, onAccept } });

		await fireEvent.click(accept(container));

		expect(onAccept).toHaveBeenCalledTimes(1);
		expect(root(container).dataset.state).toBe("accepted");
	});

	it("calls onDismiss and marks the card dismissed", async () => {
		const onDismiss = vi.fn();
		const { container } = render(RecommendationCard, { props: { title: TITLE, onDismiss } });

		await fireEvent.click(dismiss(container));

		expect(onDismiss).toHaveBeenCalledTimes(1);
		expect(root(container).dataset.state).toBe("dismissed");
	});

	it("moves focus to the verdict once the buttons that held it are gone", async () => {
		const { container } = render(RecommendationCard, { props: { title: TITLE } });

		await fireEvent.click(accept(container));
		await tick();

		expect(document.activeElement).toBe(resolved(container));
	});

	it("writes an acceptance back out through the binding", async () => {
		const { container, getByTestId } = render(Harness, { props: { title: TITLE } });
		expect(getByTestId("bound-state").textContent).toBe("open");

		await fireEvent.click(accept(container));
		expect(getByTestId("bound-state").textContent).toBe("accepted");
	});

	it("writes a dismissal back out through the binding too", async () => {
		const { container, getByTestId } = render(Harness, { props: { title: TITLE } });

		await fireEvent.click(dismiss(container));
		expect(getByTestId("bound-state").textContent).toBe("dismissed");
	});

	it("collapses to a quiet applied line, with no buttons left to press", () => {
		const { container } = render(RecommendationCard, {
			props: { title: TITLE, state: "accepted" as const },
		});

		expect(accept(container)).toBeNull();
		expect(dismiss(container)).toBeNull();
		expect(resolved(container)?.textContent?.trim()).toBe("Applied");
		expect(resolved(container)?.classList.contains("ft-accepted")).toBe(true);
	});

	it("collapses to an even quieter dismissed line", () => {
		const { container } = render(RecommendationCard, {
			props: { title: TITLE, state: "dismissed" as const },
		});

		expect(accept(container)).toBeNull();
		expect(resolved(container)?.textContent?.trim()).toBe("Dismissed");
		expect(resolved(container)?.classList.contains("ft-accepted")).toBe(false);
	});

	it("follows a state prop driven from outside", async () => {
		const { container, rerender } = render(RecommendationCard, {
			props: { title: TITLE, state: "open" as const },
		});
		expect(accept(container)).not.toBeNull();

		await rerender({ title: TITLE, state: "accepted" as const });
		expect(accept(container)).toBeNull();
		expect(resolved(container)?.textContent?.trim()).toBe("Applied");
	});

	it("keeps the footer live from the first render, before there is an outcome in it", async () => {
		const { container } = render(RecommendationCard, { props: { title: TITLE } });
		const foot = container.querySelector(".ft-rec-foot") as HTMLElement;

		expect(foot.getAttribute("aria-live")).toBe("polite");
		expect(resolved(container)).toBeNull();

		await fireEvent.click(accept(container));

		// Same element, new content: the region was mounted before the answer landed.
		expect(container.querySelector(".ft-rec-foot")).toBe(foot);
		expect(resolved(container)?.textContent?.trim()).toBe("Applied");
	});

	it("renders the children snippet as the detail region", () => {
		const { container } = render(RecommendationCard, {
			props: {
				title: TITLE,
				children: createRawSnippet(() => ({
					render: () => `<code class="detail">CREATE INDEX ON orders (customer_id)</code>`,
				})),
			},
		});

		expect(container.querySelector(".ft-rec-detail .detail")?.textContent).toBe(
			"CREATE INDEX ON orders (customer_id)"
		);
	});

	it("merges an extra class onto the root without losing its own", () => {
		const { container } = render(RecommendationCard, {
			props: { title: TITLE, class: "my-8 border-dashed" },
		});

		expect(root(container).classList.contains("my-8")).toBe(true);
		expect(root(container).classList.contains("border-dashed")).toBe(true);
		expect(root(container).classList.contains("ft-rec")).toBe(true);
	});
});
