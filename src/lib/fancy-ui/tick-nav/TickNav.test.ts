import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import TickNav from "./TickNav.svelte";
import { watchTickNavAccent } from "./tick-nav-hdr.js";
import type { TickNavItem } from "./types.js";
import { sound } from "../sound/sound.svelte.js";

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
		expect(current[0].textContent).toContain("Beta");
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
		expect(rows[0].querySelectorAll(".tn-tick")).toHaveLength(2);
		expect(rows[3].querySelectorAll(".tn-tick")).toHaveLength(0);
	});

	it("activates an item and reports the change once", async () => {
		const onValueChange = vi.fn();
		const { container } = render(TickNav, { props: { items, value: "a", onValueChange } });
		const buttons = container.querySelectorAll("button");
		await fireEvent.click(buttons[1]);
		expect(onValueChange).toHaveBeenCalledWith("b");
		await fireEvent.click(buttons[1]);
		expect(onValueChange).toHaveBeenCalledTimes(1);
		expect(container.querySelector("[aria-current='page']")?.textContent).toContain("Beta");
	});

	it("never activates a disabled item", async () => {
		const onValueChange = vi.fn();
		const { container } = render(TickNav, { props: { items, onValueChange } });
		const disabled = container.querySelectorAll("button")[2];
		expect(disabled.disabled).toBe(true);
		await fireEvent.click(disabled);
		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("renders no preview card without a preview snippet", () => {
		const { container } = render(TickNav, { props: { items } });
		expect(container.querySelector(".tn-preview")).toBeNull();
	});

	it("shows the preview while a row is hovered, and hides it on leave", async () => {
		const preview = createRawSnippet((item: () => TickNavItem) => ({
			render: () => `<span class="pv">${item().label}</span>`,
		}));
		const { container } = render(TickNav, { props: { items, preview } });
		const links = container.querySelectorAll(".tn-link");
		expect(container.querySelector(".tn-preview")).toBeNull();

		over(links[1]);
		await tick();
		expect(container.querySelector(".tn-preview")?.textContent).toContain("Beta");
		expect(container.querySelectorAll("li")[1].hasAttribute("data-active")).toBe(true);

		over(links[0]);
		await tick();
		expect(container.querySelectorAll("li")[0].hasAttribute("data-active")).toBe(true);
		expect(container.querySelectorAll("li[data-active]")).toHaveLength(1);

		leave(container.querySelector("ul")!);
		await tick();
		expect(container.querySelector(".tn-preview")).toBeNull();
		expect(container.querySelector("li[data-active]")).toBeNull();
	});

	it("drives the proximity field through CSS variables", async () => {
		const { container } = render(TickNav, { props: { items } });
		const rows = container.querySelectorAll("li");
		expect(rows[0].style.getPropertyValue("--tn-len")).toBe("32.00px");
		over(container.querySelectorAll(".tn-link")[0]);
		await new Promise((r) => setTimeout(r, 120));
		expect(parseFloat(rows[0].style.getPropertyValue("--tn-len"))).toBeGreaterThan(32);
		expect(parseFloat(rows[0].style.getPropertyValue("--tn-near"))).toBeGreaterThan(0);
	});

	it("gives the current row the long line from the first frame", () => {
		const { container } = render(TickNav, { props: { items, value: "b" } });
		expect(container.querySelectorAll("li")[1].style.getPropertyValue("--tn-len")).toBe("55.00px");
	});

	it("ignores touch pointers and disabled rows", async () => {
		const { container } = render(TickNav, { props: { items } });
		const links = container.querySelectorAll(".tn-link");
		over(links[0], "touch");
		over(links[3]);
		await tick();
		expect(container.querySelector("li[data-active]")).toBeNull();
	});

	it("clears the lit row when the pointer moves straight onto a disabled row", async () => {
		const preview = createRawSnippet((item: () => TickNavItem) => ({
			render: () => `<span class="pv">${item().label}</span>`,
		}));
		const { container } = render(TickNav, { props: { items, preview } });
		const links = container.querySelectorAll(".tn-link");
		over(links[2]);
		await tick();
		expect(container.querySelectorAll("li")[2].hasAttribute("data-active")).toBe(true);
		over(links[3]);
		await tick();
		expect(container.querySelector("li[data-active]")).toBeNull();
		expect(container.querySelector(".tn-preview")).toBeNull();
	});

	it("returns to the keyboard-focused row when the pointer leaves the list", async () => {
		// jsdom has no :focus-visible; treat programmatic focus as keyboard focus.
		const matches = Element.prototype.matches;
		vi.spyOn(Element.prototype, "matches").mockImplementation(function (this: Element, sel) {
			return sel === ":focus-visible" ? this === document.activeElement : matches.call(this, sel);
		});
		const { container } = render(TickNav, { props: { items } });
		const links = container.querySelectorAll<HTMLElement>(".tn-link");
		links[1].focus();
		await tick();
		expect(container.querySelectorAll("li")[1].hasAttribute("data-active")).toBe(true);
		over(links[0]);
		await tick();
		expect(container.querySelectorAll("li")[0].hasAttribute("data-active")).toBe(true);
		leave(container.querySelector("ul")!);
		await tick();
		expect(container.querySelectorAll("li")[1].hasAttribute("data-active")).toBe(true);
		expect(container.querySelectorAll("li[data-active]")).toHaveLength(1);
	});

	describe("sound", () => {
		it("plays hover once per row a mouse enters, never for a disabled row", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(TickNav, { props: { items, sound: true } });
			const links = container.querySelectorAll(".tn-link");
			over(links[0]);
			over(links[0].querySelector(".tn-label")!);
			over(links[1]);
			over(links[3]);
			await tick();
			expect(play.mock.calls.map((c) => c[0])).toEqual(["hover", "hover"]);
		});

		it("strums: every line the pointer crosses plucks and sounds, rows and ticks alike", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(TickNav, { props: { items, sound: true, minorTicks: 2 } });
			const list = container.querySelector("ul")!;
			list.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
			// Lay the lines out 10 px apart, top to bottom, in document order.
			const paths = container.querySelectorAll<SVGPathElement>(".tn-path, .tn-tick-path");
			paths.forEach((path, i) => {
				path.getBoundingClientRect = () => ({ top: i * 10, height: 0 }) as DOMRect;
			});
			const move = (y: number) => {
				const event = new Event("pointermove", { bubbles: true });
				Object.assign(event, { pointerType: "mouse", clientX: 0, clientY: y });
				list.dispatchEvent(event);
			};
			move(-5); // first move only measures
			move(25); // crosses lines at 0, 10, 20: Alpha, two ticks
			expect(play.mock.calls.map((c) => c[0])).toEqual(["hover", "tick", "tick"]);
			expect(paths[1].getAttribute("d")).not.toBeNull();
			play.mockClear();
			move(31); // crosses Beta's line at 30
			expect(play.mock.calls.map((c) => c[0])).toEqual(["hover"]);
		});

		it("strums the new ticks after minorTicks changes", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container, rerender } = render(TickNav, {
				props: { items, sound: true, minorTicks: 1 },
			});
			await rerender({ items, sound: true, minorTicks: 3 });
			await tick();
			const list = container.querySelector("ul")!;
			list.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
			const paths = container.querySelectorAll<SVGPathElement>(".tn-path, .tn-tick-path");
			paths.forEach((path, i) => {
				path.getBoundingClientRect = () => ({ top: i * 10, height: 0 }) as DOMRect;
			});
			const move = (y: number) => {
				const event = new Event("pointermove", { bubbles: true });
				Object.assign(event, { pointerType: "mouse", clientX: 0, clientY: y });
				list.dispatchEvent(event);
			};
			move(-5);
			move(35); // Alpha's line, then all three ticks below it
			expect(play.mock.calls.map((c) => c[0])).toEqual(["hover", "tick", "tick", "tick"]);
		});

		it("stays silent without the sound prop, and on activation", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(TickNav, { props: { items } });
			over(container.querySelectorAll(".tn-link")[0]);
			await fireEvent.click(container.querySelectorAll("button")[1]);
			expect(play).not.toHaveBeenCalled();
		});
	});

	it("adds a beam to every line only in the neon variant", () => {
		const { container } = render(TickNav, { props: { items, variant: "neon" } });
		const nav = container.querySelector("nav")!;
		expect(nav.getAttribute("data-variant")).toBe("neon");
		const lines = container.querySelectorAll(".tn-path, .tn-tick-path").length;
		expect(container.querySelectorAll(".tn-beam")).toHaveLength(lines);
		cleanup();
		const { container: plain } = render(TickNav, { props: { items } });
		expect(plain.querySelector("nav")!.hasAttribute("data-variant")).toBe(false);
		expect(plain.querySelectorAll(".tn-beam")).toHaveLength(0);
	});

	it("re-reads the HDR accent when the page theme changes", async () => {
		const style = document.createElement("style");
		style.textContent =
			".accent-probe { color: rgb(1, 2, 3); } .dark .accent-probe { color: rgb(4, 5, 6); }";
		document.head.append(style);
		const probe = document.createElement("span");
		probe.className = "accent-probe";
		document.body.append(probe);
		const seen: string[] = [];
		const stop = watchTickNavAccent(probe, (css) => seen.push(css));
		document.documentElement.classList.add("dark");
		await Promise.resolve();
		document.documentElement.setAttribute("style", "--unrelated: 1");
		await Promise.resolve();
		stop();
		document.documentElement.classList.remove("dark");
		await Promise.resolve();
		expect(seen).toEqual(["rgb(1, 2, 3)", "rgb(4, 5, 6)"]);
		document.documentElement.removeAttribute("style");
		probe.remove();
		style.remove();
	});

	it("merges the class prop", () => {
		const { container } = render(TickNav, { props: { items, class: "mt-4" } });
		const nav = container.querySelector("nav")!;
		expect(nav.className).toContain("tn-root");
		expect(nav.className).toContain("mt-4");
	});
});
