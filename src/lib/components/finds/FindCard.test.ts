import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import FindCard from "./FindCard.svelte";
import type { ExternalFind, LiveFind } from "$lib/finds/types.js";

const live: LiveFind = {
	kind: "live",
	id: "magnetic-button",
	slug: "magnetic",
	demo: "magnetic-button",
	title: "Button — magnetic pull",
	gesture: "hover",
	why: "It leans toward the cursor before contact.",
	clues: ["pointer distance → translate", "spring return"],
	tags: ["magnetic"],
	added: "2026-09-26",
	knobs: [{ key: "strength", type: "range", label: "Strength", min: 0, max: 1 }],
	defaults: { strength: 0.35 },
};

const external: ExternalFind = {
	kind: "external",
	id: "ext-ref",
	title: "Some app — pull to refresh",
	gesture: "drag",
	why: "The gesture is its own progress bar.",
	clues: ["overscroll", "threshold commit"],
	tags: ["pull"],
	added: "2026-09-26",
	source: { name: "Some app", url: "https://example.com" },
};

describe("FindCard", () => {
	afterEach(cleanup);

	it("renders the reading, the gesture, the docs link and a tune button for a live find", () => {
		const onTune = vi.fn();
		const { getByText, getByTestId, getByRole, container } = render(FindCard, {
			find: live,
			index: "01",
			values: { strength: 0.35 },
			saved: false,
			onToggleSaved: () => {},
			onTune,
		});
		expect(container.textContent).toContain("01 — BUTTON — MAGNETIC PULL");
		expect(getByTestId("gesture").textContent).toBe("HOVER");
		expect(getByText(live.why)).toBeInTheDocument();
		expect(container.textContent).toContain("POINTER DISTANCE → TRANSLATE · SPRING RETURN");
		const link = getByRole("link", { name: /docs for/i });
		expect(link).toHaveAttribute("href", "/docs/components/magnetic");
		expect(link).not.toHaveAttribute("target");
		const tune = getByRole("button", { name: /tune/i });
		fireEvent.click(tune);
		expect(onTune).toHaveBeenCalledWith(live, tune);
	});

	it("renders the source link and no tune button for an external find", () => {
		const { getByRole, queryByRole, container } = render(FindCard, {
			find: external,
			index: "02",
			values: {},
			saved: false,
			onToggleSaved: () => {},
		});
		const link = getByRole("link", { name: /source for/i });
		expect(link).toHaveAttribute("href", "https://example.com");
		expect(link).toHaveAttribute("rel", "noopener noreferrer");
		expect(link).toHaveAttribute("target", "_blank");
		expect(queryByRole("button", { name: /tune/i })).toBeNull();
		// No media → the typographic study card names the source.
		expect(container.textContent).toContain("SEEN AT — SOME APP");
	});

	it("bookmark button reflects and toggles the saved state", () => {
		const onToggleSaved = vi.fn();
		const { getByRole, rerender } = render(FindCard, {
			find: live,
			index: "01",
			values: {},
			saved: false,
			onToggleSaved,
		});
		const bookmark = getByRole("button", { name: /save button/i });
		expect(bookmark).toHaveAttribute("aria-pressed", "false");
		fireEvent.click(bookmark);
		expect(onToggleSaved).toHaveBeenCalledWith(live);
		rerender({ find: live, index: "01", values: {}, saved: true, onToggleSaved });
		expect(getByRole("button", { name: /remove/i })).toHaveAttribute("aria-pressed", "true");
	});

	it("keeps the demo unmounted until the card is near the viewport", () => {
		const { container } = render(FindCard, {
			find: live,
			index: "01",
			values: {},
			saved: false,
			onToggleSaved: () => {},
		});
		// jsdom's IntersectionObserver never fires, so the stage shows its placeholder.
		expect(container.querySelector(".finds-stage")?.textContent).toContain("BUTTON — MAGNETIC PULL");
	});
});
