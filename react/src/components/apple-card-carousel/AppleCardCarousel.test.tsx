import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";

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
});
