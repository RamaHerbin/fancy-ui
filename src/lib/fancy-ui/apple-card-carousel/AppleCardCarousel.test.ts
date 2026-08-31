import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { flushSync, tick } from "svelte";
import AppleCardCarousel from "./AppleCardCarousel.svelte";
import type { AppleCardData } from "./AppleCard.svelte";
import { sound } from "../sound/sound.svelte.js";

const cards: AppleCardData[] = [
	{ category: "Nature", title: "Mountains", src: "mountains.jpg", description: "High peaks." },
	{ category: "City", title: "Skyline", src: "skyline.jpg", description: "Urban lights." },
	{ category: "Ocean", title: "Waves", src: "waves.jpg", description: "Deep blue." },
];

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

	it("clicking a card shows the expanded dialog", () => {
		const { getByLabelText } = render(AppleCardCarousel, { props: { cards } });
		fireEvent.click(getByLabelText("Open Mountains"));
		flushSync();
		expect(getByLabelText("Mountains")).toBeTruthy();
	});

	it("expanded dialog has correct ARIA attributes", () => {
		const { getByLabelText, getByRole } = render(AppleCardCarousel, { props: { cards } });
		fireEvent.click(getByLabelText("Open Mountains"));
		flushSync();
		const dialog = getByRole("dialog");
		expect(dialog).toBeTruthy();
		expect(dialog.getAttribute("aria-modal")).toBe("true");
	});

	it("clicking the close button collapses the card", () => {
		const { getByLabelText, queryByRole } = render(AppleCardCarousel, { props: { cards } });
		fireEvent.click(getByLabelText("Open Mountains"));
		flushSync();
		fireEvent.click(getByLabelText("Close"));
		flushSync(() => vi.advanceTimersByTime(400));
		expect(queryByRole("dialog")).toBeNull();
	});

	it("pressing Escape collapses the card", () => {
		const { getByLabelText, queryByRole } = render(AppleCardCarousel, { props: { cards } });
		fireEvent.click(getByLabelText("Open Mountains"));
		flushSync();
		const dialog = getByLabelText("Mountains");
		fireEvent.keyDown(dialog, { key: "Escape" });
		flushSync(() => vi.advanceTimersByTime(400));
		expect(queryByRole("dialog")).toBeNull();
	});

	it("only one card can be expanded at a time", () => {
		const { getByLabelText, getAllByRole } = render(AppleCardCarousel, { props: { cards } });
		fireEvent.click(getByLabelText("Open Mountains"));
		flushSync();
		expect(getAllByRole("dialog")).toHaveLength(1);
		// Clicking another card while one is open should be a no-op
		fireEvent.click(getByLabelText("Open Skyline"));
		flushSync();
		expect(getAllByRole("dialog")).toHaveLength(1);
	});

	it("clicking the backdrop collapses the card", () => {
		const { getByLabelText, queryByRole } = render(AppleCardCarousel, { props: { cards } });
		fireEvent.click(getByLabelText("Open Mountains"));
		flushSync();
		// The backdrop has aria-hidden="true"; target it via its class
		const backdrop = document.querySelector(".fixed.z-40") as HTMLElement;
		fireEvent.click(backdrop);
		flushSync(() => vi.advanceTimersByTime(400));
		expect(queryByRole("dialog")).toBeNull();
	});

	it("shows description text in the expanded view", () => {
		const { getByLabelText, getByText } = render(AppleCardCarousel, { props: { cards } });
		fireEvent.click(getByLabelText("Open Mountains"));
		flushSync();
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

		it("plays open exactly once when a card is expanded, with sound enabled", () => {
			const { getByLabelText } = render(AppleCardCarousel, { props: { cards, sound: true } });

			fireEvent.click(getByLabelText("Open Mountains"));
			flushSync();

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open");
		});

		it("does not double-fire on keyboard activation — Enter shares handleExpand with click", () => {
			const { getByLabelText } = render(AppleCardCarousel, { props: { cards, sound: true } });

			fireEvent.keyDown(getByLabelText("Open Mountains"), { key: "Enter" });
			flushSync();

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open");
		});

		it("plays close exactly once when the expanded card is dismissed via the close button, with sound enabled", async () => {
			const { getByLabelText } = render(AppleCardCarousel, { props: { cards, sound: true } });
			fireEvent.click(getByLabelText("Open Mountains"));
			// The double-rAF that flips `fullyExpanded` true is scheduled after
			// handleExpand's own `await tick()`; drain that microtask (two hops —
			// the closeBtn focus in between yields once more) before advancing past
			// the rAF chain, matching real-world timing where a user cannot react
			// before it settles.
			await tick();
			await tick();
			flushSync(() => vi.advanceTimersByTime(50));
			play.mockClear();

			fireEvent.click(getByLabelText("Close"));
			flushSync(() => vi.advanceTimersByTime(400));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
		});

		it("does not replay close on a second Escape fired inside the ~400ms collapse window", async () => {
			const { getByLabelText } = render(AppleCardCarousel, { props: { cards, sound: true } });
			fireEvent.click(getByLabelText("Open Mountains"));
			await tick();
			await tick();
			flushSync(() => vi.advanceTimersByTime(50));
			const dialog = getByLabelText("Mountains");
			play.mockClear();

			fireEvent.keyDown(dialog, { key: "Escape" });
			flushSync();
			// A second Escape while the ~400ms collapse timer is still pending must
			// not replay the cue — `fullyExpanded` is already false by then.
			fireEvent.keyDown(dialog, { key: "Escape" });
			flushSync(() => vi.advanceTimersByTime(400));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
		});

		// The entrance flips `fullyExpanded` two rAFs after the click, and a
		// dismissal can land inside that window — Escape pressed the instant
		// the overlay appears. The close cue is gated on the overlay being
		// *open*, not on the entrance having finished, so the `open` cue is
		// always paired with a `close`: gating on `fullyExpanded` instead
		// would leave the open cue hanging with no resolution.
		it("pairs open with close when the card is dismissed before the entrance settles", () => {
			const { getByLabelText } = render(AppleCardCarousel, { props: { cards, sound: true } });

			fireEvent.click(getByLabelText("Open Mountains"));
			flushSync();

			// Proof the dismissal below really is inside the entrance window:
			// `fullyExpanded` is still false, so the backdrop sits at its
			// from-state. (Its opacity is the only tell — jsdom reports a zero
			// rect, so the dialog's own top/left/width read the same either way.)
			const backdrop = document.querySelector(".fixed.z-40") as HTMLElement;
			expect(backdrop.style.opacity).toBe("0");

			fireEvent.keyDown(getByLabelText("Mountains"), { key: "Escape" });
			flushSync(() => vi.advanceTimersByTime(400));

			expect(play).toHaveBeenCalledTimes(2);
			expect(play).toHaveBeenNthCalledWith(1, "open");
			expect(play).toHaveBeenNthCalledWith(2, "close");
		});

		// Two dismissal paths racing inside the same collapse window, before the
		// entrance has even settled: the guard that makes this one cue is the
		// collapse-in-progress latch, not `fullyExpanded` — which is false here
		// on *both* calls and would have silenced the cue entirely.
		it("plays close once when Escape and a backdrop click race in the same collapse window", () => {
			const { getByLabelText } = render(AppleCardCarousel, { props: { cards, sound: true } });
			fireEvent.click(getByLabelText("Open Mountains"));
			flushSync();
			const dialog = getByLabelText("Mountains");
			const backdrop = document.querySelector(".fixed.z-40") as HTMLElement;
			play.mockClear(); // only the close cue is under test here

			fireEvent.keyDown(dialog, { key: "Escape" });
			flushSync();
			// The overlay is still mounted — it leaves when the ~400ms exit timer
			// fires — so the backdrop is still clickable, and a click on it lands
			// on a collapse that is already under way.
			fireEvent.click(backdrop);
			flushSync(() => vi.advanceTimersByTime(400));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const { getByLabelText } = render(AppleCardCarousel, { props: { cards } });

			fireEvent.click(getByLabelText("Open Mountains"));
			await tick();
			flushSync(() => vi.advanceTimersByTime(50));
			fireEvent.click(getByLabelText("Close"));
			flushSync(() => vi.advanceTimersByTime(400));

			expect(play).not.toHaveBeenCalled();
		});
	});
});
