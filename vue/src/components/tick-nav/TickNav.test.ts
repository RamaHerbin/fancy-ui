import { render, cleanup, fireEvent } from "@testing-library/vue";
import { nextTick } from "vue";
import { afterEach, describe, it, expect, vi } from "vitest";
import TickNav from "./TickNav.vue";
import type { TickNavItem } from "./types.js";
import { sound } from "../../sound/sound.js";

function over(el: Element, pointerType = "mouse") {
	const event = new Event("pointerover", { bubbles: true });
	Object.assign(event, { pointerType });
	el.dispatchEvent(event);
}

function leave(list: Element) {
	const event = new Event("pointerleave");
	Object.assign(event, { pointerType: "mouse" });
	list.dispatchEvent(event);
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
		const { container } = render(TickNav, { props: { items, ariaLabel: "Guide" } });
		const nav = container.querySelector("nav")!;
		expect(nav.getAttribute("aria-label")).toBe("Guide");
		expect(nav.querySelectorAll("li")).toHaveLength(4);
		expect(nav.textContent).toContain("New");
	});

	it("renders a link for an item with href and a button otherwise", () => {
		const { container } = render(TickNav, { props: { items } });
		expect(container.querySelector("a")?.getAttribute("href")).toBe("/gamma");
		expect(container.querySelectorAll("button")).toHaveLength(3);
	});

	it("marks the current item with aria-current", () => {
		const { container } = render(TickNav, { props: { items, value: "b" } });
		const current = container.querySelectorAll("[aria-current='page']");
		expect(current).toHaveLength(1);
		expect(current[0]!.textContent).toContain("Beta");
	});

	it("keeps the lines and ticks out of the accessibility tree", () => {
		const { container } = render(TickNav, { props: { items } });
		container.querySelectorAll(".tn-bar, .tn-ticks").forEach((rail) => {
			expect(rail.getAttribute("aria-hidden")).toBe("true");
		});
	});

	it("draws minor ticks between rows, none after the last", () => {
		const { container } = render(TickNav, { props: { items, minorTicks: 2 } });
		const rows = container.querySelectorAll("li");
		expect(rows[0]!.querySelectorAll(".tn-tick")).toHaveLength(2);
		expect(rows[3]!.querySelectorAll(".tn-tick")).toHaveLength(0);
	});

	it("activates an item and reports the change once", async () => {
		const onValueChange = vi.fn();
		const { container } = render(TickNav, { props: { items, value: "a", onValueChange } });
		const buttons = container.querySelectorAll("button");
		await fireEvent.click(buttons[1]!);
		expect(onValueChange).toHaveBeenCalledWith("b");
		await fireEvent.click(buttons[1]!);
		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(container.querySelector("[aria-current='page']")?.textContent).toContain("Beta");
	});

	it("never activates a disabled item", async () => {
		const onValueChange = vi.fn();
		const { container } = render(TickNav, { props: { items, onValueChange } });
		const disabled = container.querySelectorAll("button")[2]!;
		expect(disabled.disabled).toBe(true);
		await fireEvent.click(disabled);
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("renders no preview card without a preview snippet", () => {
		const { container } = render(TickNav, { props: { items } });
		expect(container.querySelector(".tn-preview")).toBeNull();
	});

	it("shows the preview while a row is hovered, and hides it on leave", async () => {
		const { container } = render(TickNav, {
			props: { items },
			slots: {
				preview:
					'<template #preview="{ item }"><span class="pv">{{ item.label }}</span></template>',
			},
		});
		const links = container.querySelectorAll(".tn-link");
		expect(container.querySelector(".tn-preview")).toBeNull();

		over(links[1]!);
		await nextTick();
		expect(container.querySelector(".tn-preview")?.textContent).toContain("Beta");
		expect(container.querySelectorAll("li")[1]!.hasAttribute("data-active")).toBe(true);

		over(links[0]!);
		await nextTick();
		expect(container.querySelectorAll("li")[0]!.hasAttribute("data-active")).toBe(true);
		expect(container.querySelectorAll("li[data-active]")).toHaveLength(1);

		leave(container.querySelector("ul")!);
		await nextTick();
		expect(container.querySelector(".tn-preview")).toBeNull();
		expect(container.querySelector("li[data-active]")).toBeNull();
	});

	it("drives the proximity field through CSS variables", async () => {
		const { container } = render(TickNav, { props: { items } });
		const rows = container.querySelectorAll("li");
		expect(rows[0]!.style.getPropertyValue("--tn-len")).toBe("32.00px");
		over(container.querySelectorAll(".tn-link")[0]!);
		await new Promise((r) => setTimeout(r, 120));
		expect(parseFloat(rows[0]!.style.getPropertyValue("--tn-len"))).toBeGreaterThan(32);
		expect(parseFloat(rows[0]!.style.getPropertyValue("--tn-near"))).toBeGreaterThan(0);
	});

	it("gives the current row the long line from the first frame", () => {
		const { container } = render(TickNav, { props: { items, value: "b" } });
		expect(container.querySelectorAll("li")[1]!.style.getPropertyValue("--tn-len")).toBe("55.00px");
	});

	it("ignores touch pointers and disabled rows", async () => {
		const { container } = render(TickNav, { props: { items } });
		const links = container.querySelectorAll(".tn-link");
		over(links[0]!, "touch");
		over(links[3]!);
		await nextTick();
		expect(container.querySelector("li[data-active]")).toBeNull();
	});

	describe("sound", () => {
		it("plays hover once per row a mouse enters, never for a disabled row", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(TickNav, { props: { items, sound: true } });
			const links = container.querySelectorAll(".tn-link");
			over(links[0]!);
			over(links[0]!.querySelector(".tn-label")!);
			over(links[1]!);
			over(links[3]!);
			await nextTick();
			expect(play.mock.calls.map((c) => c[0]!)).toEqual(["hover", "hover"]);
		});

		it("stays silent without the sound prop, and on activation", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(TickNav, { props: { items } });
			over(container.querySelectorAll(".tn-link")[0]!);
			await fireEvent.click(container.querySelectorAll("button")[1]!);
			expect(play).not.toHaveBeenCalled();
		});
	});

	it("merges the class prop", () => {
		const { container } = render(TickNav, { props: { items, class: "mt-4" } });
		const nav = container.querySelector("nav")!;
		expect(nav.className).toContain("tn-root");
		expect(nav.className).toContain("mt-4");
	});
});
