import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TickNav } from "./TickNav.js";
import type { TickNavItem } from "./types.js";
import { sound } from "../../sound/sound.js";

const ROW = 36;

const items: TickNavItem[] = [
	{ id: "a", label: "Alpha" },
	{ id: "b", label: "Beta", badge: "New" },
	{ id: "c", label: "Gamma", href: "/gamma" },
	{ id: "d", label: "Delta", disabled: true },
];

/** jsdom has no layout: give each row a real height and position. */
function layout(container: HTMLElement): HTMLUListElement {
	const list = container.querySelector("ul") as HTMLUListElement;
	list.querySelectorAll("li").forEach((li, i) => {
		Object.defineProperty(li, "offsetTop", { configurable: true, value: i * ROW });
		Object.defineProperty(li, "offsetHeight", { configurable: true, value: ROW });
	});
	list.getBoundingClientRect = () => ({ top: 0, left: 0 }) as DOMRect;
	return list;
}

function move(list: HTMLElement, y: number, pointerType = "mouse") {
	const event = new Event("pointermove", { bubbles: true });
	Object.assign(event, { clientY: y, pointerType, isPrimary: true });
	act(() => {
		list.dispatchEvent(event);
	});
}

function leave(list: HTMLElement) {
	const event = new Event("pointerleave");
	Object.assign(event, { pointerType: "mouse" });
	act(() => {
		list.dispatchEvent(event);
	});
}

describe("TickNav", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("renders a named nav landmark with one row per item", () => {
		const { container } = render(<TickNav items={items} ariaLabel="Guide" />);
		const nav = container.querySelector("nav")!;
		expect(nav.getAttribute("aria-label")).toBe("Guide");
		expect(nav.querySelectorAll("li")).toHaveLength(4);
		expect(nav.textContent).toContain("New");
	});

	it("renders a link for an item with href and a button otherwise", () => {
		const { container } = render(<TickNav items={items} />);
		expect(container.querySelector("a")?.getAttribute("href")).toBe("/gamma");
		expect(container.querySelectorAll("button")).toHaveLength(3);
	});

	it("marks the current item with aria-current", () => {
		const { container } = render(<TickNav items={items} value="b" />);
		const current = container.querySelectorAll("[aria-current='page']");
		expect(current).toHaveLength(1);
		expect(current[0]!.textContent).toContain("Beta");
	});

	it("keeps the rail out of the accessibility tree", () => {
		const { container } = render(<TickNav items={items} />);
		container.querySelectorAll(".tn-rail").forEach((rail) => {
			expect(rail.getAttribute("aria-hidden")).toBe("true");
		});
	});

	it("draws minor ticks between rows, none after the last", () => {
		const { container } = render(<TickNav items={items} minorTicks={2} />);
		const rows = container.querySelectorAll("li");
		expect(rows[0]!.querySelectorAll(".tn-minor")).toHaveLength(2);
		expect(rows[3]!.querySelectorAll(".tn-minor")).toHaveLength(0);
	});

	it("activates an item and reports the change once", () => {
		const onValueChange = vi.fn();
		const { container } = render(<TickNav items={items} value="a" onValueChange={onValueChange} />);
		const buttons = container.querySelectorAll("button");
		fireEvent.click(buttons[1]!);
		expect(onValueChange).toHaveBeenCalledWith("b");
		fireEvent.click(buttons[1]!);
		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(container.querySelector("[aria-current='page']")?.textContent).toContain("Beta");
	});

	it("never activates a disabled item", () => {
		const onValueChange = vi.fn();
		const { container } = render(<TickNav items={items} onValueChange={onValueChange} />);
		const disabled = container.querySelectorAll("button")[2]!;
		expect(disabled.disabled).toBe(true);
		fireEvent.click(disabled);
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("renders no preview card without a preview render prop", () => {
		const { container } = render(<TickNav items={items} />);
		expect(container.querySelector(".tn-preview")).toBeNull();
	});

	it("shows the preview for the row under the pointer, and hides it on leave", () => {
		const { container } = render(
			<TickNav items={items} preview={(item) => <span className="pv">{item.label}</span>} />
		);
		const list = layout(container);
		const card = container.querySelector(".tn-preview") as HTMLElement;
		expect(card.hasAttribute("data-open")).toBe(false);

		move(list, ROW * 1.5);
		expect(card.hasAttribute("data-open")).toBe(true);
		expect(card.textContent).toContain("Beta");
		expect(container.querySelectorAll("li")[1]!.hasAttribute("data-active")).toBe(true);

		leave(list);
		expect(card.hasAttribute("data-open")).toBe(false);
	});

	it("ignores touch pointers", () => {
		const { container } = render(<TickNav items={items} />);
		const list = layout(container);
		move(list, ROW * 0.5, "touch");
		expect(container.querySelector("li[data-active]")).toBeNull();
	});

	describe("sound", () => {
		it("plays tick once per new row under a mouse, never for a disabled row", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<TickNav items={items} sound />);
			const list = layout(container);
			move(list, ROW * 0.5);
			move(list, ROW * 0.6);
			move(list, ROW * 1.5);
			move(list, ROW * 3.5);
			expect(play.mock.calls.map((c) => c[0])).toEqual(["tick", "tick"]);
		});

		it("plays select only for an item that is not already current", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<TickNav items={items} value="a" sound />);
			const buttons = container.querySelectorAll("button");
			fireEvent.click(buttons[0]!);
			expect(play).not.toHaveBeenCalled();
			fireEvent.click(buttons[1]!);
			expect(play).toHaveBeenCalledWith("select");
		});

		it("stays silent without the sound prop", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<TickNav items={items} />);
			const list = layout(container);
			move(list, ROW * 0.5);
			fireEvent.click(container.querySelectorAll("button")[1]!);
			expect(play).not.toHaveBeenCalled();
		});
	});

	it("merges the className prop", () => {
		const { container } = render(<TickNav items={items} className="mt-4" />);
		const nav = container.querySelector("nav")!;
		expect(nav.className).toContain("tn-root");
		expect(nav.className).toContain("mt-4");
	});
});
