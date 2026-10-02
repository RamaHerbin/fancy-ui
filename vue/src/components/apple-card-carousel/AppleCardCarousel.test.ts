import { cleanup, fireEvent, render } from "@testing-library/vue";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AppleCardCarousel from "./AppleCardCarousel.vue";
import type { AppleCardData } from "./AppleCard.vue";
import { sound } from "../../sound/sound.js";

/**
 * Transposed case-for-case from the source component's suite. Three shapes
 * changed and nothing else did:
 *
 * - `flushSync()` becomes `await nextTick()`, and
 *   `flushSync(() => vi.advanceTimersByTime(ms))` becomes the `advance()`
 *   helper below — run the timers, then let the scheduler flush the render
 *   they queued.
 * - `tick()` becomes `nextTick()`; the source drains two of them before the
 *   rAF clock because its focus step yields once more, one is enough here.
 * - The cue player forwards its (absent) options argument, so the cue
 *   assertions read `("open", undefined)` rather than `("open")`.
 */

const cards: AppleCardData[] = [
	{ category: "Nature", title: "Mountains", src: "mountains.jpg", description: "High peaks." },
	{ category: "City", title: "Skyline", src: "skyline.jpg", description: "Urban lights." },
	{ category: "Ocean", title: "Waves", src: "waves.jpg", description: "Deep blue." },
];

/** The source's `flushSync(() => vi.advanceTimersByTime(ms))`. */
async function advance(ms: number) {
	vi.advanceTimersByTime(ms);
	await nextTick();
}

/**
 * The double rAF that flips `fullyExpanded` true is scheduled after
 * `handleExpand`'s own `await nextTick()`; drain that microtask before
 * advancing past the rAF chain, matching real-world timing where a user
 * cannot react before it settles.
 */
async function settleEntrance() {
	await nextTick();
	await advance(50);
}

describe("AppleCardCarousel", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		cleanup();
	});

	it("renders all cards", () => {
		const { getByText } = render(AppleCardCarousel, { props: { cards } });
		expect(getByText("Mountains")).toBeTruthy();
		expect(getByText("Skyline")).toBeTruthy();
		expect(getByText("Waves")).toBeTruthy();
	});

	it("renders gracefully with no cards", () => {
		const { container } = render(AppleCardCarousel, { props: { cards: [] } });
		expect(container.querySelector("[role='button']")).toBeNull();
	});

	it("clicking a card shows the expanded dialog", async () => {
		const { getByLabelText } = render(AppleCardCarousel, { props: { cards } });
		await fireEvent.click(getByLabelText("Open Mountains"));
		await nextTick();
		expect(getByLabelText("Mountains")).toBeTruthy();
	});

	it("expanded dialog has correct ARIA attributes", async () => {
		const { getByLabelText, getByRole } = render(AppleCardCarousel, { props: { cards } });
		await fireEvent.click(getByLabelText("Open Mountains"));
		await nextTick();
		const dialog = getByRole("dialog");
		expect(dialog).toBeTruthy();
		expect(dialog.getAttribute("aria-modal")).toBe("true");
	});

	it("clicking the close button collapses the card", async () => {
		const { getByLabelText, queryByRole } = render(AppleCardCarousel, { props: { cards } });
		await fireEvent.click(getByLabelText("Open Mountains"));
		await nextTick();
		await fireEvent.click(getByLabelText("Close"));
		await advance(400);
		expect(queryByRole("dialog")).toBeNull();
	});

	it("pressing Escape collapses the card", async () => {
		const { getByLabelText, queryByRole } = render(AppleCardCarousel, { props: { cards } });
		await fireEvent.click(getByLabelText("Open Mountains"));
		await nextTick();
		const dialog = getByLabelText("Mountains");
		await fireEvent.keyDown(dialog, { key: "Escape" });
		await advance(400);
		expect(queryByRole("dialog")).toBeNull();
	});

	it("only one card can be expanded at a time", async () => {
		const { getByLabelText, getAllByRole } = render(AppleCardCarousel, { props: { cards } });
		await fireEvent.click(getByLabelText("Open Mountains"));
		await nextTick();
		expect(getAllByRole("dialog")).toHaveLength(1);
		// Clicking another card while one is open should be a no-op
		await fireEvent.click(getByLabelText("Open Skyline"));
		await nextTick();
		expect(getAllByRole("dialog")).toHaveLength(1);
	});

	it("clicking the backdrop collapses the card", async () => {
		const { getByLabelText, queryByRole } = render(AppleCardCarousel, { props: { cards } });
		await fireEvent.click(getByLabelText("Open Mountains"));
		await nextTick();
		// The backdrop has aria-hidden="true"; target it via its class
		const backdrop = document.querySelector(".fixed.z-40") as HTMLElement;
		await fireEvent.click(backdrop);
		await advance(400);
		expect(queryByRole("dialog")).toBeNull();
	});

	it("shows description text in the expanded view", async () => {
		const { getByLabelText, getByText } = render(AppleCardCarousel, { props: { cards } });
		await fireEvent.click(getByLabelText("Open Mountains"));
		await nextTick();
		expect(getByText("High peaks.")).toBeTruthy();
	});

	describe("sound", () => {
		let play: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			play = vi.spyOn(sound, "play").mockImplementation(() => {});
		});

		afterEach(() => {
			play.mockRestore();
		});

		it("plays open exactly once when a card is expanded, with sound enabled", async () => {
			const { getByLabelText } = render(AppleCardCarousel, { props: { cards, sound: true } });

			await fireEvent.click(getByLabelText("Open Mountains"));
			await nextTick();

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open", undefined);
		});

		it("does not double-fire on keyboard activation — Enter shares handleExpand with click", async () => {
			const { getByLabelText } = render(AppleCardCarousel, { props: { cards, sound: true } });

			await fireEvent.keyDown(getByLabelText("Open Mountains"), { key: "Enter" });
			await nextTick();

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open", undefined);
		});

		it("plays close exactly once when the expanded card is dismissed via the close button, with sound enabled", async () => {
			const { getByLabelText } = render(AppleCardCarousel, { props: { cards, sound: true } });
			await fireEvent.click(getByLabelText("Open Mountains"));
			await settleEntrance();
			play.mockClear();

			await fireEvent.click(getByLabelText("Close"));
			await advance(400);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		it("does not replay close on a second Escape fired inside the ~400ms collapse window", async () => {
			const { getByLabelText } = render(AppleCardCarousel, { props: { cards, sound: true } });
			await fireEvent.click(getByLabelText("Open Mountains"));
			await settleEntrance();
			const dialog = getByLabelText("Mountains");
			play.mockClear();

			await fireEvent.keyDown(dialog, { key: "Escape" });
			await nextTick();
			// A second Escape while the ~400ms collapse timer is still pending must
			// not replay the cue — `fullyExpanded` is already false by then.
			await fireEvent.keyDown(dialog, { key: "Escape" });
			await advance(400);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		// The entrance flips `fullyExpanded` two rAFs after the click, and a
		// dismissal can land inside that window — Escape pressed the instant
		// the overlay appears. The close cue is gated on the overlay being
		// *open*, not on the entrance having finished, so the `open` cue is
		// always paired with a `close`: gating on `fullyExpanded` instead
		// would leave the open cue hanging with no resolution.
		it("pairs open with close when the card is dismissed before the entrance settles", async () => {
			const { getByLabelText } = render(AppleCardCarousel, { props: { cards, sound: true } });

			await fireEvent.click(getByLabelText("Open Mountains"));
			await nextTick();

			// Proof the dismissal below really is inside the entrance window:
			// `fullyExpanded` is still false, so the backdrop sits at its
			// from-state. (Its opacity is the only tell — jsdom reports a zero
			// rect, so the dialog's own top/left/width read the same either way.)
			const backdrop = document.querySelector(".fixed.z-40") as HTMLElement;
			expect(backdrop.style.opacity).toBe("0");

			await fireEvent.keyDown(getByLabelText("Mountains"), { key: "Escape" });
			await advance(400);

			expect(play).toHaveBeenCalledTimes(2);
			expect(play).toHaveBeenNthCalledWith(1, "open", undefined);
			expect(play).toHaveBeenNthCalledWith(2, "close", undefined);
		});

		// Two dismissal paths racing inside the same collapse window, before the
		// entrance has even settled: the guard that makes this one cue is the
		// collapse-in-progress latch, not `fullyExpanded` — which is false here
		// on *both* calls and would have silenced the cue entirely.
		it("plays close once when Escape and a backdrop click race in the same collapse window", async () => {
			const { getByLabelText } = render(AppleCardCarousel, { props: { cards, sound: true } });
			await fireEvent.click(getByLabelText("Open Mountains"));
			await nextTick();
			const dialog = getByLabelText("Mountains");
			const backdrop = document.querySelector(".fixed.z-40") as HTMLElement;
			play.mockClear(); // only the close cue is under test here

			await fireEvent.keyDown(dialog, { key: "Escape" });
			await nextTick();
			// The overlay is still mounted — it leaves when the ~400ms exit timer
			// fires — so the backdrop is still clickable, and a click on it lands
			// on a collapse that is already under way.
			await fireEvent.click(backdrop);
			await advance(400);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const { getByLabelText } = render(AppleCardCarousel, { props: { cards } });

			await fireEvent.click(getByLabelText("Open Mountains"));
			await settleEntrance();
			await fireEvent.click(getByLabelText("Close"));
			await advance(400);

			expect(play).not.toHaveBeenCalled();
		});
	});
});
