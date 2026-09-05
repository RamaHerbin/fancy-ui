import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

import { resetSoundForTests, sound } from "../../sound/sound.js";
import { AppleCardCarousel } from "./AppleCardCarousel.js";
import type { AppleCardData } from "./AppleCard.js";

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
		const { getByText } = render(<AppleCardCarousel cards={cards} />);
		expect(getByText("Mountains")).toBeTruthy();
		expect(getByText("Skyline")).toBeTruthy();
		expect(getByText("Waves")).toBeTruthy();
	});

	it("renders gracefully with no cards", () => {
		const { container } = render(<AppleCardCarousel cards={[]} />);
		expect(container.querySelector("[role='button']")).toBeNull();
	});

	it("clicking a card shows the expanded dialog", () => {
		const { getByLabelText } = render(<AppleCardCarousel cards={cards} />);
		fireEvent.click(getByLabelText("Open Mountains"));
		expect(getByLabelText("Mountains")).toBeTruthy();
	});

	it("expanded dialog has correct ARIA attributes", () => {
		const { getByLabelText, getByRole } = render(<AppleCardCarousel cards={cards} />);
		fireEvent.click(getByLabelText("Open Mountains"));
		const dialog = getByRole("dialog");
		expect(dialog).toBeTruthy();
		expect(dialog.getAttribute("aria-modal")).toBe("true");
	});

	it("clicking the close button collapses the card", () => {
		const { getByLabelText, queryByRole } = render(<AppleCardCarousel cards={cards} />);
		fireEvent.click(getByLabelText("Open Mountains"));
		fireEvent.click(getByLabelText("Close"));
		act(() => {
			vi.advanceTimersByTime(400);
		});
		expect(queryByRole("dialog")).toBeNull();
	});

	it("pressing Escape collapses the card", () => {
		const { getByLabelText, queryByRole } = render(<AppleCardCarousel cards={cards} />);
		fireEvent.click(getByLabelText("Open Mountains"));
		const dialog = getByLabelText("Mountains");
		fireEvent.keyDown(dialog, { key: "Escape" });
		act(() => {
			vi.advanceTimersByTime(400);
		});
		expect(queryByRole("dialog")).toBeNull();
	});

	it("only one card can be expanded at a time", () => {
		const { getByLabelText, getAllByRole } = render(<AppleCardCarousel cards={cards} />);
		fireEvent.click(getByLabelText("Open Mountains"));
		expect(getAllByRole("dialog")).toHaveLength(1);
		// Clicking another card while one is open should be a no-op
		fireEvent.click(getByLabelText("Open Skyline"));
		expect(getAllByRole("dialog")).toHaveLength(1);
	});

	it("clicking the backdrop collapses the card", () => {
		const { getByLabelText, queryByRole } = render(<AppleCardCarousel cards={cards} />);
		fireEvent.click(getByLabelText("Open Mountains"));
		// The backdrop has aria-hidden="true"; target it via its class
		const backdrop = document.querySelector(".fixed.z-40") as HTMLElement;
		fireEvent.click(backdrop);
		act(() => {
			vi.advanceTimersByTime(400);
		});
		expect(queryByRole("dialog")).toBeNull();
	});

	it("shows description text in the expanded view", () => {
		const { getByLabelText, getByText } = render(<AppleCardCarousel cards={cards} />);
		fireEvent.click(getByLabelText("Open Mountains"));
		expect(getByText("High peaks.")).toBeTruthy();
	});

	it("Enter on a collapsed card expands it", () => {
		const { getByLabelText, getAllByRole } = render(<AppleCardCarousel cards={cards} />);
		fireEvent.keyDown(getByLabelText("Open Mountains"), { key: "Enter" });
		expect(getAllByRole("dialog")).toHaveLength(1);
	});

	it("Space on a collapsed card expands it", () => {
		const { getByLabelText, getAllByRole } = render(<AppleCardCarousel cards={cards} />);
		fireEvent.keyDown(getByLabelText("Open Mountains"), { key: " " });
		expect(getAllByRole("dialog")).toHaveLength(1);
	});

	it("does not schedule a second exit on a second Escape fired inside the ~400ms collapse window", () => {
		const { getByLabelText, queryByRole, getAllByRole } = render(
			<AppleCardCarousel cards={cards} />
		);
		fireEvent.click(getByLabelText("Open Mountains"));
		const dialog = getByLabelText("Mountains");

		fireEvent.keyDown(dialog, { key: "Escape" });
		act(() => {
			vi.advanceTimersByTime(50);
		});
		// The overlay is still mounted — it leaves when the ~400ms exit timer
		// fires — so a second Escape still reaches the dialog.
		fireEvent.keyDown(dialog, { key: "Escape" });

		// Past the first exit timer, but not past one a second dismissal would
		// have queued 50ms behind it.
		act(() => {
			vi.advanceTimersByTime(360);
		});
		expect(queryByRole("dialog")).toBeNull();

		// A stray timer landing on a freshly re-opened card would blank it.
		fireEvent.click(getByLabelText("Open Mountains"));
		expect(getAllByRole("dialog")).toHaveLength(1);
		act(() => {
			vi.advanceTimersByTime(100);
		});
		expect(getAllByRole("dialog")).toHaveLength(1);
	});

	it("collapses once when Escape and a backdrop click race in the same collapse window", () => {
		const { getByLabelText, queryByRole, getAllByRole } = render(
			<AppleCardCarousel cards={cards} />
		);
		fireEvent.click(getByLabelText("Open Mountains"));
		const dialog = getByLabelText("Mountains");
		const backdrop = document.querySelector(".fixed.z-40") as HTMLElement;

		fireEvent.keyDown(dialog, { key: "Escape" });
		act(() => {
			vi.advanceTimersByTime(50);
		});
		fireEvent.click(backdrop);

		act(() => {
			vi.advanceTimersByTime(360);
		});
		expect(queryByRole("dialog")).toBeNull();

		fireEvent.click(getByLabelText("Open Mountains"));
		act(() => {
			vi.advanceTimersByTime(100);
		});
		expect(getAllByRole("dialog")).toHaveLength(1);
	});

	describe("sound", () => {
		beforeEach(() => {
			resetSoundForTests();
			window.localStorage.clear();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays open exactly once when a card is expanded, with sound enabled", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { getByLabelText } = render(<AppleCardCarousel cards={cards} sound />);

			fireEvent.click(getByLabelText("Open Mountains"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open", undefined);
		});

		it("does not double-fire on keyboard activation — Enter shares handleExpand with click", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { getByLabelText } = render(<AppleCardCarousel cards={cards} sound />);

			fireEvent.keyDown(getByLabelText("Open Mountains"), { key: "Enter" });

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open", undefined);
		});

		it("plays close exactly once when the expanded card is dismissed via the close button, with sound enabled", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { getByLabelText } = render(<AppleCardCarousel cards={cards} sound />);
			fireEvent.click(getByLabelText("Open Mountains"));
			// Let the double-rAF entrance settle, matching real-world timing
			// where a user cannot react before it does.
			act(() => {
				vi.advanceTimersByTime(50);
			});
			play.mockClear();

			fireEvent.click(getByLabelText("Close"));
			act(() => {
				vi.advanceTimersByTime(400);
			});

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		it("does not replay close on a second Escape fired inside the ~400ms collapse window", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { getByLabelText } = render(<AppleCardCarousel cards={cards} sound />);
			fireEvent.click(getByLabelText("Open Mountains"));
			act(() => {
				vi.advanceTimersByTime(50);
			});
			const dialog = getByLabelText("Mountains");
			play.mockClear();

			fireEvent.keyDown(dialog, { key: "Escape" });
			// A second Escape while the ~400ms collapse timer is still pending
			// must not replay the cue — the collapse is already under way.
			fireEvent.keyDown(dialog, { key: "Escape" });
			act(() => {
				vi.advanceTimersByTime(400);
			});

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		// The entrance flips `fullyExpanded` two rAFs after the click, and a
		// dismissal can land inside that window — Escape pressed the instant
		// the overlay appears. The close cue is gated on the overlay being
		// *open*, not on the entrance having finished, so the `open` cue is
		// always paired with a `close`: gating on `fullyExpanded` instead
		// would leave the open cue hanging with no resolution.
		it("pairs open with close when the card is dismissed before the entrance settles", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { getByLabelText } = render(<AppleCardCarousel cards={cards} sound />);

			fireEvent.click(getByLabelText("Open Mountains"));

			// Proof the dismissal below really is inside the entrance window:
			// `fullyExpanded` is still false, so the backdrop sits at its
			// from-state. (Its opacity is the only tell — jsdom reports a zero
			// rect, so the dialog's own top/left/width read the same either way.)
			const backdrop = document.querySelector(".fixed.z-40") as HTMLElement;
			expect(backdrop.style.opacity).toBe("0");

			fireEvent.keyDown(getByLabelText("Mountains"), { key: "Escape" });
			act(() => {
				vi.advanceTimersByTime(400);
			});

			expect(play).toHaveBeenCalledTimes(2);
			expect(play).toHaveBeenNthCalledWith(1, "open", undefined);
			expect(play).toHaveBeenNthCalledWith(2, "close", undefined);
		});

		// Two dismissal paths racing inside the same collapse window, before the
		// entrance has even settled: the guard that makes this one cue is the
		// collapse-in-progress latch, not `fullyExpanded` — which is false here
		// on *both* calls and would have silenced the cue entirely.
		it("plays close once when Escape and a backdrop click race in the same collapse window", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { getByLabelText } = render(<AppleCardCarousel cards={cards} sound />);
			fireEvent.click(getByLabelText("Open Mountains"));
			const dialog = getByLabelText("Mountains");
			const backdrop = document.querySelector(".fixed.z-40") as HTMLElement;
			play.mockClear(); // only the close cue is under test here

			fireEvent.keyDown(dialog, { key: "Escape" });
			// The overlay is still mounted — it leaves when the ~400ms exit timer
			// fires — so the backdrop is still clickable, and a click on it lands
			// on a collapse that is already under way.
			fireEvent.click(backdrop);
			act(() => {
				vi.advanceTimersByTime(400);
			});

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		it("plays nothing by default (sound prop omitted)", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { getByLabelText } = render(<AppleCardCarousel cards={cards} />);

			fireEvent.click(getByLabelText("Open Mountains"));
			act(() => {
				vi.advanceTimersByTime(50);
			});
			fireEvent.click(getByLabelText("Close"));
			act(() => {
				vi.advanceTimersByTime(400);
			});

			expect(play).not.toHaveBeenCalled();
		});
	});
});
