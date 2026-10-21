import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, beforeAll, describe, it, expect, vi } from "vitest";
import Link from "./Link.svelte";
import { sound } from "../sound/sound.svelte.js";
import LineHoverLink from "../line-hover-link/LineHoverLink.svelte";
import NavbarLink from "../navbar/NavbarLink.svelte";
import NavigationMenuLink from "../navigation-menu/NavigationMenuLink.svelte";
import InlineCitation from "../inline-citation/InlineCitation.svelte";

// jsdom does not implement navigation; anchor activations would log noise.
beforeAll(() => document.addEventListener("click", (e) => e.preventDefault()));
afterEach(cleanup);

const source = {
	id: "s",
	title: "Structured outputs",
	url: "https://www.example.com/docs",
	snippet: "Constrained decoding.",
};

// Loosely typed: the table below mixes components with different props.
const mount = render as unknown as (
	comp: unknown,
	options: { props: Record<string, unknown> }
) => ReturnType<typeof render>;

type Case = [string, unknown, Record<string, unknown>];

const ANCHORS: Case[] = [
	["Link", Link, { href: "/docs" }],
	["LineHoverLink", LineHoverLink, { href: "/docs" }],
	["NavbarLink", NavbarLink, { href: "/docs" }],
	["NavigationMenuLink", NavigationMenuLink, { href: "/docs" }],
];
const ALL: Case[] = [...ANCHORS, ["InlineCitation", InlineCitation, { source, index: 1 }]];

function anchor(container: HTMLElement): HTMLElement {
	return container.querySelector("a, button") as HTMLElement;
}

describe.each(ALL)("%s forwards native attributes", (_name, Comp, base) => {
	it("puts id, data-* and aria-* on the anchor", () => {
		const { container } = mount(Comp, {
			props: { ...base, id: "x", "data-testid": "t", "aria-describedby": "note" },
		});
		const el = anchor(container);
		expect(el).toHaveAttribute("id", "x");
		expect(el).toHaveAttribute("data-testid", "t");
		expect(el.getAttribute("aria-describedby")?.split(" ")).toContain("note");
	});

	it("fires a consumer onkeydown exactly once", async () => {
		const onkeydown = vi.fn();
		const { container } = mount(Comp, { props: { ...base, onkeydown } });
		await fireEvent.keyDown(anchor(container), { key: "a" });
		expect(onkeydown).toHaveBeenCalledTimes(1);
	});

	it("fires a consumer onblur exactly once", async () => {
		const onblur = vi.fn();
		const { container } = mount(Comp, { props: { ...base, onblur } });
		await fireEvent.blur(anchor(container));
		expect(onblur).toHaveBeenCalledTimes(1);
	});
});

describe.each(ANCHORS)("%s anchor attributes and click", (_name, Comp, base) => {
	it("forwards download and hreflang", () => {
		const { container } = mount(Comp, {
			props: { ...base, download: "f.pdf", hreflang: "fr" },
		});
		const el = anchor(container);
		expect(el).toHaveAttribute("download", "f.pdf");
		expect(el).toHaveAttribute("hreflang", "fr");
	});

	it("calls a consumer onclick exactly once", async () => {
		const onclick = vi.fn();
		const { container } = mount(Comp, { props: { ...base, onclick } });
		await fireEvent.click(anchor(container));
		expect(onclick).toHaveBeenCalledTimes(1);
	});
});

describe("InlineCitation handlers", () => {
	it("runs the open logic, then the consumer onclick, once (button marker)", async () => {
		const onclick = vi.fn();
		const onOpen = vi.fn();
		const { container } = render(InlineCitation, {
			props: { source, index: 1, href: "", onclick, onOpen },
		});
		await fireEvent.click(anchor(container));
		expect(onOpen).toHaveBeenCalledTimes(1);
		expect(onclick).toHaveBeenCalledTimes(1);
	});

	it("consumer onfocus fires once and still opens the card", async () => {
		const onfocus = vi.fn();
		const onOpen = vi.fn();
		const { container } = render(InlineCitation, { props: { source, index: 1, onfocus, onOpen } });
		await fireEvent.focus(anchor(container));
		expect(onfocus).toHaveBeenCalledTimes(1);
		expect(onOpen).toHaveBeenCalledTimes(1);
	});
});

describe("invariants survive consumer attributes", () => {
	it("NavbarLink: disabled blocks onclick, keeps aria-disabled and tabindex -1", async () => {
		const onclick = vi.fn();
		const { container } = render(NavbarLink, {
			props: { href: "/x", disabled: true, onclick, tabindex: 0, "aria-disabled": "false" },
		});
		const el = anchor(container);
		await fireEvent.click(el);
		expect(onclick).not.toHaveBeenCalled();
		expect(el).toHaveAttribute("aria-disabled", "true");
		expect(el).toHaveAttribute("tabindex", "-1");
		expect(el).not.toHaveAttribute("href");
	});

	it("NavbarLink: current wins over a consumer aria-current; consumer value passes otherwise", () => {
		const a = render(NavbarLink, {
			props: { href: "/x", current: true, "aria-current": "step" },
		});
		expect(anchor(a.container)).toHaveAttribute("aria-current", "page");
		cleanup();
		const b = render(NavbarLink, { props: { href: "/x", "aria-current": "step" } });
		expect(anchor(b.container)).toHaveAttribute("aria-current", "step");
	});

	it("NavbarLink: external keeps target _blank and the safe rel", () => {
		const { container } = render(NavbarLink, {
			props: { href: "/x", external: true, target: "_self", rel: "me" },
		});
		const el = anchor(container);
		expect(el).toHaveAttribute("target", "_blank");
		expect(el).toHaveAttribute("rel", "noopener noreferrer");
	});

	it("NavigationMenuLink: current wins over aria-current; external keeps target/rel", () => {
		const { container } = render(NavigationMenuLink, {
			props: { href: "/x", current: true, external: true, "aria-current": "step", target: "_self" },
		});
		const el = anchor(container);
		expect(el).toHaveAttribute("aria-current", "page");
		expect(el).toHaveAttribute("target", "_blank");
		expect(el).toHaveAttribute("rel", "noopener noreferrer");
	});

	it("NavigationMenuLink: consumer target/aria-current pass through when not managed", () => {
		const { container } = render(NavigationMenuLink, {
			props: { href: "/x", "aria-current": "step", target: "_self" },
		});
		const el = anchor(container);
		expect(el).toHaveAttribute("aria-current", "step");
		expect(el).toHaveAttribute("target", "_self");
	});

	it("InlineCitation: keeps its label and target, merges aria-describedby with the card id", async () => {
		vi.useFakeTimers();
		const { container } = render(InlineCitation, {
			props: {
				source,
				index: 2,
				"aria-describedby": "note",
				"aria-label": "mine",
				target: "_self",
			},
		});
		const el = anchor(container);
		expect(el).toHaveAttribute("aria-label", "Source 2: Structured outputs");
		expect(el).toHaveAttribute("target", "_blank");
		await fireEvent.mouseEnter(el);
		await vi.advanceTimersByTimeAsync(150);
		const ids = el.getAttribute("aria-describedby")!.split(" ");
		expect(ids).toContain("note");
		expect(ids).toHaveLength(2);
		vi.useRealTimers();
	});

	it("Link: keeps the computed safe rel when a consumer rel is passed", () => {
		const { container } = render(Link, { props: { href: "/x", target: "_blank", rel: "me" } });
		expect(anchor(container).getAttribute("rel")?.split(" ")).toEqual(
			expect.arrayContaining(["me", "noopener", "noreferrer"])
		);
	});
});

describe("Link order", () => {
	it("runs the internal press cue before the consumer onclick", async () => {
		const calls: string[] = [];
		const play = vi.spyOn(sound, "play").mockImplementation(() => {
			calls.push("internal");
		});
		const onclick = vi.fn(() => calls.push("consumer"));
		const { container } = mount(Link, { props: { href: "/x", sound: true, onclick } });
		await fireEvent.click(anchor(container));
		expect(calls).toEqual(["internal", "consumer"]);
		play.mockRestore();
	});
});
