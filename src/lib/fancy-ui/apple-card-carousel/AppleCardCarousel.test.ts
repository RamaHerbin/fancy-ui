import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { flushSync } from "svelte";
import AppleCardCarousel from "./AppleCardCarousel.svelte";
import type { AppleCardData } from "./AppleCard.svelte";

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

	it("shows description text in the expanded view", () => {
		const { getByLabelText, getByText } = render(AppleCardCarousel, { props: { cards } });
		fireEvent.click(getByLabelText("Open Mountains"));
		flushSync();
		expect(getByText("High peaks.")).toBeTruthy();
	});
});
