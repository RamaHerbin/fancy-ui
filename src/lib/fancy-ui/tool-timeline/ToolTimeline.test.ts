import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import ToolTimeline from "./ToolTimeline.svelte";
import { formatRelativeTime } from "../_internals/relative-time.js";
import type { ToolTimelineItemData } from "../_internals/ai-types.js";
import { sound } from "../sound/sound.svelte.js";

const T0 = new Date("2026-01-01T00:00:00.000Z").getTime();

const items: ToolTimelineItemData[] = [
	{ id: "a", verb: "Read", target: "src/lib/utils.ts", detail: "312 lines" },
	{ id: "b", verb: "Edited", target: "src/routes/+page.svelte", additions: 24, deletions: 7 },
	{ id: "c", verb: "Searched", target: "**/*.svelte" },
];

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

describe("ToolTimeline", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("renders one row per item", () => {
		const { container } = render(ToolTimeline, { props: { items } });
		expect(container.querySelectorAll(".ft-tooltimeline-row")).toHaveLength(3);
	});

	it("renders the verb and the target of each item", () => {
		const { container } = render(ToolTimeline, { props: { items } });
		const verbs = [...container.querySelectorAll(".ft-tooltimeline-verb")].map(
			(el) => el.textContent
		);
		const targets = [...container.querySelectorAll(".ft-tooltimeline-target")].map(
			(el) => el.textContent
		);
		expect(verbs).toEqual(["Read", "Edited", "Searched"]);
		expect(targets).toEqual(["src/lib/utils.ts", "src/routes/+page.svelte", "**/*.svelte"]);
	});

	it("carries the full target in a title attribute, since the visible text truncates", () => {
		const { container } = render(ToolTimeline, { props: { items } });
		expect(container.querySelector(".ft-tooltimeline-target")?.getAttribute("title")).toBe(
			"src/lib/utils.ts"
		);
	});

	it("renders the detail line only for items that carry one", () => {
		const { container } = render(ToolTimeline, { props: { items } });
		const details = container.querySelectorAll(".ft-tooltimeline-detail");
		expect(details).toHaveLength(1);
		expect(details[0].textContent).toBe("312 lines");
	});

	it("renders the diff stats with counted aria-labels", () => {
		const { container } = render(ToolTimeline, { props: { items } });
		const additions = container.querySelector(".ft-tooltimeline-additions") as HTMLElement;
		const deletions = container.querySelector(".ft-tooltimeline-deletions") as HTMLElement;
		expect(additions.textContent).toBe("+24");
		expect(additions.getAttribute("aria-label")).toBe("24 additions");
		expect(deletions.textContent).toBe("−7");
		expect(deletions.getAttribute("aria-label")).toBe("7 deletions");
	});

	it("renders no stats for items without them", () => {
		const { container } = render(ToolTimeline, {
			props: { items: [{ id: "a", verb: "Read", target: "a.ts" }] },
		});
		expect(container.querySelector(".ft-tooltimeline-additions")).toBeFalsy();
		expect(container.querySelector(".ft-tooltimeline-deletions")).toBeFalsy();
	});

	it("renders each stat independently of the other", () => {
		const { container } = render(ToolTimeline, {
			props: { items: [{ id: "a", verb: "Deleted", target: "old.ts", deletions: 41 }] },
		});
		expect(container.querySelector(".ft-tooltimeline-additions")).toBeFalsy();
		expect(container.querySelector(".ft-tooltimeline-deletions")?.textContent).toBe("−41");
	});

	it("renders a zero stat rather than treating it as absent", () => {
		const { container } = render(ToolTimeline, {
			props: { items: [{ id: "a", verb: "Edited", target: "a.ts", additions: 0, deletions: 3 }] },
		});
		expect(container.querySelector(".ft-tooltimeline-additions")?.textContent).toBe("+0");
	});

	it("hides the detail line in compact mode", () => {
		const { container } = render(ToolTimeline, { props: { items, compact: true } });
		expect(container.querySelector(".ft-tooltimeline-detail")).toBeFalsy();
		expect(container.querySelectorAll(".ft-tooltimeline-row")).toHaveLength(3);
		expect((container.firstElementChild as HTMLElement).className).toContain(
			"ft-tooltimeline-compact"
		);
	});

	it("renders plain rows with no button when onSelect is absent", () => {
		const { container } = render(ToolTimeline, { props: { items } });
		expect(container.querySelectorAll("button")).toHaveLength(0);
	});

	it("turns rows into buttons and reports the item and its index on click", async () => {
		const onSelect = vi.fn();
		const { container } = render(ToolTimeline, { props: { items, onSelect } });
		const buttons = container.querySelectorAll("button");
		expect(buttons).toHaveLength(3);

		(buttons[1] as HTMLButtonElement).click();
		expect(onSelect).toHaveBeenCalledTimes(1);
		expect(onSelect).toHaveBeenCalledWith(items[1], 1);
	});

	it("renders the item snippet in place of the built-in row body", () => {
		const { container } = render(ToolTimeline, {
			props: { items, item: snippet("<span class='custom-row'>custom</span>") },
		});
		expect(container.querySelectorAll(".custom-row")).toHaveLength(3);
		expect(container.querySelector(".ft-tooltimeline-verb")).toBeFalsy();
		// The rail survives the override: only the body is replaced.
		expect(container.querySelectorAll(".ft-tooltimeline-dot")).toHaveLength(3);
	});

	it("renders the timestamp as relative text with the exact time in the attributes", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const timestamp = T0 - 5 * 60_000;
		const { container } = render(ToolTimeline, {
			props: { items: [{ id: "a", verb: "Read", target: "a.ts", timestamp }] },
		});
		const time = container.querySelector(".ft-tooltimeline-time") as HTMLTimeElement;
		const iso = new Date(timestamp).toISOString();
		expect(time.textContent).toBe(formatRelativeTime(timestamp, { now: T0 }));
		expect(time.textContent).not.toBe("");
		expect(time.getAttribute("datetime")).toBe(iso);
		expect(time.getAttribute("title")).toBe(iso);
	});

	it("accepts a Date timestamp as readily as epoch ms", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const timestamp = new Date(T0 - 60 * 60_000);
		const { container } = render(ToolTimeline, {
			props: { items: [{ id: "a", verb: "Read", target: "a.ts", timestamp }] },
		});
		const time = container.querySelector(".ft-tooltimeline-time") as HTMLTimeElement;
		expect(time.textContent).toBe(formatRelativeTime(timestamp, { now: T0 }));
		expect(time.getAttribute("datetime")).toBe(timestamp.toISOString());
	});

	it("renders no time element for items without a timestamp", () => {
		const { container } = render(ToolTimeline, { props: { items } });
		expect(container.querySelector(".ft-tooltimeline-time")).toBeFalsy();
	});

	it("names the list Activity by default and takes an override", () => {
		const { container } = render(ToolTimeline, { props: { items } });
		expect(container.querySelector("ol")?.getAttribute("aria-label")).toBe("Activity");
		cleanup();

		const named = render(ToolTimeline, { props: { items, label: "Session log" } });
		expect(named.container.querySelector("ol")?.getAttribute("aria-label")).toBe("Session log");
	});

	it("renders an empty list without rows", () => {
		const { container } = render(ToolTimeline, { props: { items: [] } });
		expect(container.querySelector("ol")).toBeTruthy();
		expect(container.querySelectorAll(".ft-tooltimeline-row")).toHaveLength(0);
	});

	it("merges custom class names alongside the base classes", () => {
		const { container } = render(ToolTimeline, { props: { items, class: "my-timeline" } });
		const root = container.firstElementChild as HTMLElement;
		expect(root.className).toContain("my-timeline");
		expect(root.className).toContain("ft-tooltimeline");
	});

	it("ages its timestamps while it stays mounted", async () => {
		// Nothing re-renders a quiet timeline, so a label written once would keep
		// reporting the age its row had when it first appeared.
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const { container } = render(ToolTimeline, {
			props: { items: [{ id: "a", verb: "Read", target: "a.ts", timestamp: T0 - 20_000 }] },
		});
		const label = () => container.querySelector(".ft-tooltimeline-time")?.textContent;
		expect(label()).toBe("now");

		// Two refreshes of the shared clock: the row is 80s old by then, which is
		// the first reading that leaves the "now" bucket.
		await vi.advanceTimersByTimeAsync(60_000);
		expect(label()).toBe("1 minute ago");
	});

	describe("sound", () => {
		let play: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			play = vi.spyOn(sound, "play").mockImplementation(() => {});
		});

		afterEach(() => {
			play.mockRestore();
		});

		it("plays select exactly once when an entry is activated, with sound enabled", async () => {
			const onSelect = vi.fn();
			const { container } = render(ToolTimeline, { props: { items, sound: true, onSelect } });

			await fireEvent.click(container.querySelectorAll("button")[1]);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select");
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const onSelect = vi.fn();
			const { container } = render(ToolTimeline, { props: { items, onSelect } });

			await fireEvent.click(container.querySelectorAll("button")[0]);

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing when onSelect is absent — rows are plain spans, not buttons", () => {
			const { container } = render(ToolTimeline, { props: { items, sound: true } });

			expect(container.querySelectorAll("button")).toHaveLength(0);
			container
				.querySelector(".ft-tooltimeline-row")
				?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing when a new entry is appended — mounting a row is not a pick", async () => {
			const onSelect = vi.fn();
			const { rerender } = render(ToolTimeline, { props: { items, sound: true, onSelect } });

			await rerender({
				items: [...items, { id: "d", verb: "Read", target: "new.ts" }],
				sound: true,
				onSelect,
			});

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while the shared clock ticks — the interval never plays a cue", async () => {
			vi.useFakeTimers();
			const onSelect = vi.fn();
			render(ToolTimeline, {
				props: {
					items: [{ id: "a", verb: "Read", target: "a.ts", timestamp: Date.now() }],
					sound: true,
					onSelect,
				},
			});

			await vi.advanceTimersByTimeAsync(60_000);

			expect(play).not.toHaveBeenCalled();
		});
	});
});
