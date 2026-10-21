import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TickNav } from "./TickNav.js";
import type { TickNavItem } from "./types.js";
import { sound } from "../../sound/sound.js";

function over(el: Element, pointerType = "mouse") {
	const event = new Event("pointerover", { bubbles: true });
	Object.assign(event, { pointerType });
	act(() => {
		el.dispatchEvent(event);
	});
}

function leave(list: Element) {
	const event = new Event("pointerleave");
	Object.assign(event, { pointerType: "mouse" });
	act(() => {
		list.dispatchEvent(event);
	});
}

const items: TickNavItem[] = [
	{ id: "a", label: "Alpha" },
	{ id: "b", label: "Beta", badge: "New" },
	{ id: "c", label: "Gamma", href: "/gamma" },
	{ id: "d", label: "Delta", disabled: true },
];

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

	it("keeps the lines and ticks out of the accessibility tree", () => {
		const { container } = render(<TickNav items={items} />);
		container.querySelectorAll(".tn-bar, .tn-ticks").forEach((rail) => {
			expect(rail.getAttribute("aria-hidden")).toBe("true");
		});
	});

	it("draws minor ticks between rows, none after the last", () => {
		const { container } = render(<TickNav items={items} minorTicks={2} />);
		const rows = container.querySelectorAll("li");
		expect(rows[0]!.querySelectorAll(".tn-tick")).toHaveLength(2);
		expect(rows[3]!.querySelectorAll(".tn-tick")).toHaveLength(0);
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

	it("shows the preview while a row is hovered, and hides it on leave", () => {
		const { container } = render(
			<TickNav items={items} preview={(item) => <span className="pv">{item.label}</span>} />
		);
		const links = container.querySelectorAll(".tn-link");
		expect(container.querySelector(".tn-preview")).toBeNull();

		over(links[1]!);
		expect(container.querySelector(".tn-preview")?.textContent).toContain("Beta");
		expect(container.querySelectorAll("li")[1]!.hasAttribute("data-active")).toBe(true);

		over(links[0]!);
		expect(container.querySelectorAll("li")[0]!.hasAttribute("data-active")).toBe(true);
		expect(container.querySelectorAll("li[data-active]")).toHaveLength(1);

		leave(container.querySelector("ul")!);
		expect(container.querySelector(".tn-preview")).toBeNull();
		expect(container.querySelector("li[data-active]")).toBeNull();
	});

	it("drives the proximity field through CSS variables", async () => {
		const { container } = render(<TickNav items={items} />);
		const rows = container.querySelectorAll("li");
		expect(rows[0]!.style.getPropertyValue("--tn-len")).toBe("32.00px");
		over(container.querySelectorAll(".tn-link")[0]!);
		await act(async () => {
			await new Promise((r) => setTimeout(r, 120));
		});
		expect(parseFloat(rows[0]!.style.getPropertyValue("--tn-len"))).toBeGreaterThan(32);
		expect(parseFloat(rows[0]!.style.getPropertyValue("--tn-near"))).toBeGreaterThan(0);
	});

	it("gives the current row the long line from the first frame", () => {
		const { container } = render(<TickNav items={items} value="b" />);
		expect(container.querySelectorAll("li")[1]!.style.getPropertyValue("--tn-len")).toBe("55.00px");
	});

	it("ignores touch pointers and disabled rows", () => {
		const { container } = render(<TickNav items={items} />);
		const links = container.querySelectorAll(".tn-link");
		over(links[0]!, "touch");
		over(links[3]!);
		expect(container.querySelector("li[data-active]")).toBeNull();
	});

	describe("sound", () => {
		it("plays hover once per row a mouse enters, never for a disabled row", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<TickNav items={items} sound />);
			const links = container.querySelectorAll(".tn-link");
			over(links[0]!);
			over(links[0]!.querySelector(".tn-label")!);
			over(links[1]!);
			over(links[3]!);
			expect(play.mock.calls.map((c) => c[0])).toEqual(["hover", "hover"]);
		});

		it("stays silent without the sound prop, and on activation", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<TickNav items={items} />);
			over(container.querySelectorAll(".tn-link")[0]!);
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
