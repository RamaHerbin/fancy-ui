import { render, cleanup } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import ThinkingIndicator from "./ThinkingIndicator.svelte";

const T0 = new Date("2026-01-01T00:00:00.000Z").getTime();

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

describe("ThinkingIndicator", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("renders the status label", () => {
		const { container } = render(ThinkingIndicator, { props: { status: "Reading files" } });
		expect(container.querySelector(".ft-thinking-label")?.textContent).toBe("Reading files");
	});

	it("renders no elapsed time when neither since nor elapsedMs is given", () => {
		const { container } = render(ThinkingIndicator, { props: { status: "Thinking" } });
		expect(container.querySelector(".ft-thinking-elapsed")).toBeFalsy();
	});

	it("formats an externally supplied elapsedMs", () => {
		const { container } = render(ThinkingIndicator, {
			props: { status: "Searching the web", elapsedMs: 65_000 },
		});
		const time = container.querySelector(".ft-thinking-elapsed") as HTMLTimeElement;
		expect(time.textContent).toBe("1m 05s");
		expect(time.getAttribute("datetime")).toBe("PT65S");
	});

	it("ticks the elapsed time forward from since while running", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const { container } = render(ThinkingIndicator, {
			props: { status: "Reading files", since: T0 },
		});
		const time = () => container.querySelector(".ft-thinking-elapsed")?.textContent;
		expect(time()).toBe("0s");

		await vi.advanceTimersByTimeAsync(3000);
		expect(time()).toBe("3s");

		await vi.advanceTimersByTimeAsync(60_000);
		expect(time()).toBe("1m 03s");
	});

	it("leaves the internal timer stopped when elapsedMs overrides it", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const { container } = render(ThinkingIndicator, {
			props: { status: "Reading files", since: T0, elapsedMs: 7000 },
		});
		expect(vi.getTimerCount()).toBe(0);

		await vi.advanceTimersByTimeAsync(5000);
		expect(container.querySelector(".ft-thinking-elapsed")?.textContent).toBe("7s");
	});

	it("hides the ticking timer from assistive tech only while running", () => {
		const running = render(ThinkingIndicator, { props: { status: "Thinking", elapsedMs: 4000 } });
		expect(
			running.container.querySelector(".ft-thinking-elapsed")?.getAttribute("aria-hidden")
		).toBe("true");
		cleanup();

		const stopped = render(ThinkingIndicator, {
			props: { status: "Thinking", elapsedMs: 4000, running: false },
		});
		expect(
			stopped.container.querySelector(".ft-thinking-elapsed")?.getAttribute("aria-hidden")
		).toBeNull();
	});

	it("drops the shimmer class and starts no timer when running is false", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const { container } = render(ThinkingIndicator, {
			props: { status: "Reading files", since: T0, running: false },
		});
		expect(container.querySelector(".ft-thinking-label")?.className).not.toContain(
			"ft-thinking-shimmer"
		);
		expect(vi.getTimerCount()).toBe(0);

		await vi.advanceTimersByTimeAsync(5000);
		expect(container.querySelector(".ft-thinking-elapsed")?.textContent).toBe("0s");
	});

	it("shimmers the label while running", () => {
		const { container } = render(ThinkingIndicator, { props: { status: "Reading files" } });
		expect(container.querySelector(".ft-thinking-label")?.className).toContain(
			"ft-thinking-shimmer"
		);
	});

	it("renders the done snippet instead of the status once stopped", () => {
		const { container } = render(ThinkingIndicator, {
			props: {
				status: "Reading files",
				running: false,
				done: snippet("<span>Thought for 12s</span>"),
			},
		});
		expect(container.querySelector(".ft-thinking-label")).toBeFalsy();
		expect(container.querySelector(".ft-thinking-done")?.textContent).toBe("Thought for 12s");
	});

	it("keeps showing the status while running even when a done snippet is provided", () => {
		const { container } = render(ThinkingIndicator, {
			props: { status: "Reading files", done: snippet("<span>Thought for 12s</span>") },
		});
		expect(container.querySelector(".ft-thinking-done")).toBeFalsy();
		expect(container.querySelector(".ft-thinking-label")?.textContent).toBe("Reading files");
	});

	it("adds the pill class and a pulse dot for the pill variant", () => {
		const { container } = render(ThinkingIndicator, {
			props: { status: "Reading files", variant: "pill" },
		});
		const root = container.firstElementChild as HTMLElement;
		expect(root.className).toContain("ft-thinking-pill");
		const dot = container.querySelector(".ft-thinking-dot") as HTMLElement;
		expect(dot).toBeTruthy();
		expect(dot.className).toContain("ft-thinking-dot-live");
	});

	it("renders no dot for the inline variant", () => {
		const { container } = render(ThinkingIndicator, { props: { status: "Reading files" } });
		const root = container.firstElementChild as HTMLElement;
		expect(root.className).not.toContain("ft-thinking-pill");
		expect(container.querySelector(".ft-thinking-dot")).toBeFalsy();
	});

	it("stills the pulse dot when the pill is not running", () => {
		const { container } = render(ThinkingIndicator, {
			props: { status: "Reading files", variant: "pill", running: false },
		});
		expect(container.querySelector(".ft-thinking-dot")?.className).not.toContain(
			"ft-thinking-dot-live"
		);
	});

	it("hides the elapsed time when showElapsed is false", () => {
		const { container } = render(ThinkingIndicator, {
			props: { status: "Reading files", elapsedMs: 9000, showElapsed: false },
		});
		expect(container.querySelector(".ft-thinking-elapsed")).toBeFalsy();
	});

	it("exposes the row as a polite status region", () => {
		const { container } = render(ThinkingIndicator, { props: { status: "Reading files" } });
		const root = container.firstElementChild as HTMLElement;
		expect(root.getAttribute("role")).toBe("status");
		expect(root.getAttribute("aria-live")).toBe("polite");
	});

	it("merges custom class names alongside the base classes", () => {
		const { container } = render(ThinkingIndicator, {
			props: { status: "Reading files", class: "my-indicator" },
		});
		const root = container.firstElementChild as HTMLElement;
		expect(root.className).toContain("my-indicator");
		expect(root.className).toContain("ft-thinking");
	});

	it("shows 0s when it mounts already finished, whatever since says", () => {
		// The clock is never read before mount: the server render and the client's
		// hydration pass would otherwise land on different seconds. A finished row
		// rendered from scratch is documented to show 0s and pass elapsedMs instead.
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const { container } = render(ThinkingIndicator, {
			props: { status: "Reading files", since: T0 - 5000, running: false },
		});

		expect(container.querySelector(".ft-thinking-elapsed")?.textContent).toBe("0s");
	});
});
