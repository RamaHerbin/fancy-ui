import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import ThreadList from "./ThreadList.svelte";
import Harness from "./ThreadListHarness.test.svelte";
import { formatRelativeTime } from "../_internals/relative-time.js";
import type { ThreadData } from "../_internals/ai-types.js";

const T0 = new Date("2026-01-01T00:00:00.000Z").getTime();
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const threads: ThreadData[] = [
	{
		id: "t1",
		title: "Retry policy for billing webhooks",
		preview: "So a 429 should back off exponentially…",
		updatedAt: T0 - 4 * MINUTE,
		unread: true,
	},
	{
		id: "t2",
		title: "Migration plan",
		preview: "Split the table before the backfill.",
		updatedAt: T0 - 3 * HOUR,
	},
	{ id: "t3", title: "Naming the new endpoint", updatedAt: T0 - 26 * HOUR },
];

function rows(container: HTMLElement): HTMLElement[] {
	return [...container.querySelectorAll<HTMLElement>(".ft-threadlist-row")];
}

function rowButtons(container: HTMLElement): HTMLButtonElement[] {
	return [...container.querySelectorAll<HTMLButtonElement>(".ft-threadlist-button")];
}

function deleteButtons(container: HTMLElement): HTMLButtonElement[] {
	return [...container.querySelectorAll<HTMLButtonElement>(".ft-threadlist-delete")];
}

function text(container: HTMLElement, selector: string): string[] {
	return [...container.querySelectorAll(selector)].map((el) => el.textContent ?? "");
}

describe("ThreadList", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("renders one row per thread, with its title and preview", () => {
		const { container } = render(ThreadList, { props: { threads } });

		expect(rows(container)).toHaveLength(3);
		expect(text(container, ".ft-threadlist-title")).toEqual([
			"Retry policy for billing webhooks",
			"Migration plan",
			"Naming the new endpoint",
		]);
		// The third thread has no preview, so it gets no preview line.
		expect(text(container, ".ft-threadlist-preview")).toEqual([
			"So a 429 should back off exponentially…",
			"Split the table before the backfill.",
		]);
	});

	it("marks the unread thread with a dot and says so out loud", () => {
		const { container } = render(ThreadList, { props: { threads } });
		const dots = [...container.querySelectorAll(".ft-threadlist-dot")];

		// The dot's column is reserved on every row so the titles stay aligned;
		// only the unread one is painted.
		expect(dots).toHaveLength(3);
		expect(dots.map((dot) => dot.classList.contains("ft-threadlist-unread"))).toEqual([
			true,
			false,
			false,
		]);
		expect(dots.every((dot) => dot.getAttribute("aria-hidden") === "true")).toBe(true);
		expect(text(container, ".sr-only")).toEqual(["Unread"]);
	});

	it("gives the unread title more weight than the rest", () => {
		const { container } = render(ThreadList, { props: { threads } });
		const titles = [...container.querySelectorAll(".ft-threadlist-title")];

		expect(titles.map((title) => title.classList.contains("ft-threadlist-strong"))).toEqual([
			true,
			false,
			false,
		]);
	});

	it("marks only the active row with aria-current", () => {
		const { container } = render(ThreadList, { props: { threads, activeId: "t2" } });

		expect(rowButtons(container).map((button) => button.getAttribute("aria-current"))).toEqual([
			null,
			"true",
			null,
		]);
		expect(rowButtons(container)[1].classList.contains("ft-threadlist-active")).toBe(true);
	});

	it("marks nothing when activeId names no thread", () => {
		const { container } = render(ThreadList, { props: { threads, activeId: "gone" } });

		expect(container.querySelector("[aria-current]")).toBeFalsy();
	});

	it("writes the picked thread's id back through the activeId binding", async () => {
		const { container, getByTestId } = render(Harness, { props: { threads } });

		expect(getByTestId("bound-active").textContent).toBe("");

		await fireEvent.click(rowButtons(container)[1]);
		expect(getByTestId("bound-active").textContent).toBe("t2");
		expect(rowButtons(container)[1].getAttribute("aria-current")).toBe("true");

		await fireEvent.click(rowButtons(container)[0]);
		expect(getByTestId("bound-active").textContent).toBe("t1");
		expect(rowButtons(container)[1].getAttribute("aria-current")).toBeNull();
	});

	it("hands onSelect the whole thread, not just its id", async () => {
		const onSelect = vi.fn();
		const { container } = render(ThreadList, { props: { threads, onSelect } });

		await fireEvent.click(rowButtons(container)[2]);

		expect(onSelect).toHaveBeenCalledTimes(1);
		expect(onSelect).toHaveBeenCalledWith(threads[2]);
	});

	it("shows a delete button per row only once onDelete is supplied", () => {
		const { container } = render(ThreadList, { props: { threads } });
		expect(deleteButtons(container)).toHaveLength(0);
		cleanup();

		const withDelete = render(ThreadList, { props: { threads, onDelete: vi.fn() } });
		const buttons = deleteButtons(withDelete.container);

		expect(buttons).toHaveLength(3);
		expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual([
			"Delete Retry policy for billing webhooks",
			"Delete Migration plan",
			"Delete Naming the new endpoint",
		]);
		// Revealed by hover and focus in CSS, never removed: it stays reachable by
		// keyboard, which is what lights it up in the first place.
		buttons.forEach((button) => {
			expect(button.hidden).toBe(false);
			expect(button.getAttribute("aria-hidden")).toBeNull();
			expect(button.hasAttribute("disabled")).toBe(false);
		});
	});

	it("deletes without selecting: the two buttons are siblings, not nested", async () => {
		const onDelete = vi.fn();
		const onSelect = vi.fn();
		const { container } = render(Harness, { props: { threads, onDelete, onSelect } });

		await fireEvent.click(deleteButtons(container)[1]);

		expect(onDelete).toHaveBeenCalledTimes(1);
		expect(onDelete).toHaveBeenCalledWith(threads[1]);
		expect(onSelect).not.toHaveBeenCalled();
		expect(container.querySelector('[data-testid="bound-active"]')?.textContent).toBe("");
		// Nesting a button inside a button is invalid HTML, and the browser would
		// have flattened it; the delete control sits beside the row instead.
		expect(container.querySelector(".ft-threadlist-button .ft-threadlist-delete")).toBeFalsy();
	});

	it("renders each timestamp as relative text with the exact time in the attributes", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const { container } = render(ThreadList, { props: { threads } });
		const times = [...container.querySelectorAll<HTMLTimeElement>(".ft-threadlist-time")];

		expect(times.map((time) => time.textContent)).toEqual(
			threads.map((thread) => formatRelativeTime(thread.updatedAt, { now: T0 }))
		);
		expect(times[0].textContent).not.toBe("");
		expect(times[1].getAttribute("datetime")).toBe(new Date(T0 - 3 * HOUR).toISOString());
		expect(times[1].getAttribute("title")).toBe(new Date(T0 - 3 * HOUR).toISOString());
	});

	it("accepts a Date as readily as epoch ms", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const updatedAt = new Date(T0 - 2 * HOUR);
		const { container } = render(ThreadList, {
			props: { threads: [{ id: "t1", title: "Dated", updatedAt }] },
		});
		const time = container.querySelector<HTMLTimeElement>(".ft-threadlist-time") as HTMLTimeElement;

		expect(time.textContent).toBe(formatRelativeTime(updatedAt, { now: T0 }));
		expect(time.getAttribute("datetime")).toBe(updatedAt.toISOString());
	});

	it("names the list Conversations by default and takes an override", () => {
		const { container } = render(ThreadList, { props: { threads } });
		expect(container.querySelector("ul")?.getAttribute("aria-label")).toBe("Conversations");
		expect(container.querySelector("ul")?.getAttribute("role")).toBe("list");
		cleanup();

		const named = render(ThreadList, { props: { threads, label: "History" } });
		expect(named.container.querySelector("ul")?.getAttribute("aria-label")).toBe("History");
	});

	it("falls back to a quiet line when there is nothing to list", () => {
		const { container } = render(ThreadList, { props: { threads: [] } });

		expect(container.querySelector("ul")).toBeFalsy();
		expect(container.querySelector(".ft-threadlist-empty")?.textContent?.trim()).toBe(
			"No conversations yet"
		);
	});

	it("renders the empty snippet in place of that line", () => {
		const { getByTestId, container } = render(Harness, {
			props: { threads: [], customEmpty: true },
		});

		expect(getByTestId("custom-empty").textContent).toBe("Start a conversation");
		expect(container.querySelector(".ft-threadlist-empty")).toBeFalsy();
	});

	it("renders the item snippet in place of the built-in row body, with the active flag", () => {
		const { container } = render(Harness, {
			props: { threads, activeId: "t2", customItem: true },
		});

		expect(text(container, '[data-testid="custom-item"]')).toEqual([
			"Retry policy for billing webhooks:false",
			"Migration plan:true",
			"Naming the new endpoint:false",
		]);
		expect(container.querySelector(".ft-threadlist-title")).toBeFalsy();
		// The unread affordance survives the override: only the body is replaced.
		expect(container.querySelectorAll(".ft-threadlist-dot")).toHaveLength(3);
		expect(text(container, ".sr-only")).toEqual(["Unread"]);
	});

	it("says nothing at all about a timestamp it cannot read", () => {
		const { container } = render(ThreadList, {
			props: { threads: [{ id: "t1", title: "Undated", updatedAt: Number.NaN }] },
		});
		const time = container.querySelector(".ft-threadlist-time") as HTMLElement;

		// `datetime=""` is an invalid value rather than an absent one, so the
		// attributes go entirely instead of being handed over empty.
		expect(time.hasAttribute("datetime")).toBe(false);
		expect(time.hasAttribute("title")).toBe(false);
	});

	it("keeps every row's node when the list is reordered", async () => {
		const { container, rerender } = render(ThreadList, { props: { threads } });
		const [first, second, third] = rows(container);

		// A reply arriving on the last conversation floats it to the top. Keying on
		// the position would rename all three rows and rebuild them from nothing,
		// taking the focus and the scroll position of whatever was open with it.
		await rerender({ threads: [threads[2], threads[0], threads[1]] });

		// Identity, not likeness: a rebuilt row looks exactly like the one it
		// replaced and carries none of what the reader had done to it.
		const moved = rows(container);
		expect(moved[0]).toBe(third);
		expect(moved[1]).toBe(first);
		expect(moved[2]).toBe(second);
	});

	it("survives two threads arriving under the same id", async () => {
		const onSelect = vi.fn();
		const duplicates: ThreadData[] = [
			{ id: "dup", title: "First", updatedAt: T0 - MINUTE },
			{ id: "dup", title: "Second", updatedAt: T0 - 2 * MINUTE },
		];
		const { container } = render(ThreadList, { props: { threads: duplicates, onSelect } });

		expect(text(container, ".ft-threadlist-title")).toEqual(["First", "Second"]);

		// Both rows answer to the same id, so both light up — but neither crashes
		// the keyed block, which is what the position in the key buys.
		await fireEvent.click(rowButtons(container)[1]);
		expect(onSelect).toHaveBeenCalledWith(duplicates[1]);
	});

	it("merges className onto the root", () => {
		const { container } = render(ThreadList, { props: { threads, class: "my-list" } });
		const root = container.firstElementChild as HTMLElement;

		expect(root.classList.contains("my-list")).toBe(true);
		expect(root.classList.contains("ft-threadlist")).toBe(true);
	});

	it("hands the root element back through ref", () => {
		// The harness marks whatever comes out of the binding; finding the mark on
		// the rendered list is what proves the two are the same element.
		const { container } = render(Harness, { props: { threads } });
		const root = container.querySelector(".ft-threadlist") as HTMLElement;

		expect(root.getAttribute("data-bound-ref")).toBe("yes");
	});

	it("schedules nothing per row: one clock refreshes the whole list", () => {
		vi.useFakeTimers();
		vi.setSystemTime(T0);
		const before = vi.getTimerCount();

		const { unmount } = render(ThreadList, { props: { threads } });

		expect(vi.getTimerCount()).toBe(before + 1);
		unmount();
		expect(vi.getTimerCount()).toBe(before);
	});

	it("keeps every key distinct when a raw id looks like a generated suffix", () => {
		// `x`, `x`, `x#1`: the second `x` would otherwise be handed the key the
		// third row already answers to.
		const collision: ThreadData[] = [
			{ id: "x", title: "First", updatedAt: T0 },
			{ id: "x", title: "Second", updatedAt: T0 - MINUTE },
			{ id: "x#1", title: "Third", updatedAt: T0 - 2 * MINUTE },
		];
		const { container } = render(ThreadList, { props: { threads: collision } });

		expect(text(container, ".ft-threadlist-title")).toEqual(["First", "Second", "Third"]);
	});
});
