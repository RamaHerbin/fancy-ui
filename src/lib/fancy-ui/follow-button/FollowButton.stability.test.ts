import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FollowButton from "./FollowButton.svelte";

function stubReducedMotion(reduce: boolean) {
	window.matchMedia = vi.fn().mockImplementation((query: string) => ({
		matches: reduce && query.includes("reduce"),
		media: query,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
	})) as unknown as typeof window.matchMedia;
}

const button = (c: HTMLElement) => c.querySelector("button") as HTMLButtonElement;
const cell = (c: HTMLElement) => c.querySelector(".ft-follow__label") as HTMLElement | null;
const live = (c: HTMLElement) => c.querySelector(".ft-follow__live") as HTMLElement;
const text = (c: HTMLElement) => c.querySelector(".ft-follow__rest")?.textContent;
const ghosts = (c: HTMLElement) => [...c.querySelectorAll(".ft-follow__ghost")] as HTMLElement[];
const leaving = (c: HTMLElement) => c.querySelector(".ft-follow__leave") as HTMLElement | null;
const flush = () => vi.advanceTimersByTimeAsync(0);

describe("FollowButton width stability and text swap", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		stubReducedMotion(false);
	});
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		delete (window as { matchMedia?: unknown }).matchMedia;
	});

	it("reserves the widest label with four hidden ghosts in one cell", () => {
		const { container } = render(FollowButton, {
			props: {
				labels: { follow: "Follow", following: "Following", unfollow: "Stop following" },
				errorLabel: "Try again",
			},
		});
		expect(cell(container)).not.toBeNull();
		const g = ghosts(container);
		expect(g.map((n) => n.textContent)).toEqual([
			"Follow",
			"Following",
			"Stop following",
			"Try again",
		]);
		for (const n of g) expect(n.getAttribute("aria-hidden")).toBe("true");
		expect(cell(container)!.contains(live(container))).toBe(true);
		expect(live(container).hasAttribute("aria-hidden")).toBe(false);
	});

	it("shows the outgoing label for 80 ms while the new one arrives", async () => {
		const { container } = render(FollowButton, { props: {} });
		expect(leaving(container)).toBeNull();
		expect(live(container).hasAttribute("data-swapped")).toBe(false);

		await fireEvent.click(button(container));
		await flush();

		expect(text(container)).toBe("Following");
		expect(live(container).hasAttribute("data-swapped")).toBe(true);
		expect(leaving(container)?.textContent).toBe("Follow");
		expect(leaving(container)?.getAttribute("aria-hidden")).toBe("true");

		await vi.advanceTimersByTimeAsync(79);
		expect(leaving(container)).not.toBeNull();
		await vi.advanceTimersByTimeAsync(2);
		expect(leaving(container)).toBeNull();
	});

	it("skips the outgoing layer entirely under reduced motion", async () => {
		stubReducedMotion(true);
		const { container } = render(FollowButton, { props: {} });
		await fireEvent.click(button(container));
		await flush();
		expect(text(container)).toBe("Following");
		expect(leaving(container)).toBeNull();
	});

	it("keeps the visible outgoing text when a retry lands inside the out beat", async () => {
		const onToggle = vi
			.fn<(next: boolean) => Promise<void>>()
			.mockRejectedValueOnce(new Error("x"))
			.mockResolvedValueOnce(undefined);
		const { container } = render(FollowButton, { props: { onToggle, resetMs: 5000 } });
		await fireEvent.click(button(container));
		await flush();
		await vi.advanceTimersByTimeAsync(300);
		expect(text(container)).toBe("Try again");
		expect(leaving(container)).toBeNull();
		await fireEvent.click(button(container));
		await flush();
		expect(text(container)).toBe("Following");
		expect(leaving(container)?.textContent).toBe("Try again");
		await vi.advanceTimersByTimeAsync(100);
		expect(leaving(container)).toBeNull();
	});

	it("reverts on the next tick when resetMs is 0", async () => {
		const onToggle = vi.fn(() => Promise.reject(new Error("x")));
		const { container } = render(FollowButton, { props: { onToggle, resetMs: 0 } });
		await fireEvent.click(button(container));
		await flush();
		await vi.advanceTimersByTimeAsync(10);
		expect(button(container).getAttribute("data-state")).toBe("idle");
		expect(text(container)).toBe("Follow");
	});

	it("adopts a changed `labels` entry in the idle state and in the ghost cell", async () => {
		const { container, rerender } = render(FollowButton, { props: {} });
		await rerender({ labels: { follow: "Subscribe" } });
		await flush();
		expect(text(container)).toBe("Subscribe");
		expect(ghosts(container)[0]?.textContent).toBe("Subscribe");
	});
});
