import { cleanup, fireEvent, render, act } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeAll, describe, it, expect, vi } from "vitest";
import { Link } from "./Link.js";
import { sound } from "../../sound/sound.js";
import { LineHoverLink } from "../line-hover-link/LineHoverLink.js";
import { NavbarLink } from "../navbar/NavbarLink.js";
import { NavigationMenuLink } from "../navigation-menu/NavigationMenuLink.js";
import { InlineCitation } from "../inline-citation/InlineCitation.js";

// jsdom does not implement navigation; anchor activations would log noise.
beforeAll(() => document.addEventListener("click", (e) => e.preventDefault()));
afterEach(cleanup);

const source = {
	id: "s",
	title: "Structured outputs",
	url: "https://www.example.com/docs",
	snippet: "Constrained decoding.",
};

type Props = Record<string, unknown>;
type Case = [string, ComponentType<never>, Props];

const ANCHORS: Case[] = [
	["Link", Link as never, { href: "/docs" }],
	["LineHoverLink", LineHoverLink as never, { href: "/docs" }],
	["NavbarLink", NavbarLink as never, { href: "/docs" }],
	["NavigationMenuLink", NavigationMenuLink as never, { href: "/docs" }],
];
const ALL: Case[] = [...ANCHORS, ["InlineCitation", InlineCitation as never, { source, index: 1 }]];

function mount(Comp: ComponentType<never>, props: Props) {
	const C = Comp as unknown as ComponentType<Props>;
	return render(<C {...props} />);
}

function anchor(container: HTMLElement): HTMLElement {
	return container.querySelector("a, button") as HTMLElement;
}

describe.each(ALL)("%s forwards native attributes", (_name, Comp, base) => {
	it("puts id, data-* and aria-* on the anchor", () => {
		const { container } = mount(Comp, {
			...base,
			id: "x",
			"data-testid": "t",
			"aria-describedby": "note",
		});
		const el = anchor(container);
		expect(el).toHaveAttribute("id", "x");
		expect(el).toHaveAttribute("data-testid", "t");
		expect(el.getAttribute("aria-describedby")?.split(" ")).toContain("note");
	});

	it("fires a consumer onKeyDown exactly once", () => {
		const onKeyDown = vi.fn();
		const { container } = mount(Comp, { ...base, onKeyDown });
		fireEvent.keyDown(anchor(container), { key: "a" });
		expect(onKeyDown).toHaveBeenCalledTimes(1);
	});

	it("fires a consumer onBlur exactly once", () => {
		const onBlur = vi.fn();
		const { container } = mount(Comp, { ...base, onBlur });
		fireEvent.blur(anchor(container));
		expect(onBlur).toHaveBeenCalledTimes(1);
	});
});

describe.each(ANCHORS)("%s anchor attributes and click", (_name, Comp, base) => {
	it("forwards download and hreflang", () => {
		const { container } = mount(Comp, { ...base, download: "f.pdf", hrefLang: "fr" });
		const el = anchor(container);
		expect(el).toHaveAttribute("download", "f.pdf");
		expect(el).toHaveAttribute("hreflang", "fr");
	});

	it("calls a consumer onClick exactly once", () => {
		const onClick = vi.fn();
		const { container } = mount(Comp, { ...base, onClick });
		fireEvent.click(anchor(container));
		expect(onClick).toHaveBeenCalledTimes(1);
	});
});

describe("InlineCitation handlers", () => {
	it("runs the open logic, then the consumer onClick, once (button marker)", () => {
		const onClick = vi.fn();
		const onOpen = vi.fn();
		const { container } = mount(InlineCitation as never, {
			source,
			index: 1,
			href: "",
			onClick,
			onOpen,
		});
		fireEvent.click(anchor(container));
		expect(onOpen).toHaveBeenCalledTimes(1);
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("consumer onFocus fires once and still opens the card", () => {
		const onFocus = vi.fn();
		const onOpen = vi.fn();
		const { container } = mount(InlineCitation as never, { source, index: 1, onFocus, onOpen });
		fireEvent.focus(anchor(container));
		expect(onFocus).toHaveBeenCalledTimes(1);
		expect(onOpen).toHaveBeenCalledTimes(1);
	});
});

describe("invariants survive consumer attributes", () => {
	it("NavbarLink: disabled blocks onClick, keeps aria-disabled and tabindex -1", () => {
		const onClick = vi.fn();
		const { container } = mount(NavbarLink as never, {
			href: "/x",
			disabled: true,
			onClick,
			tabIndex: 0,
			"aria-disabled": "false",
		});
		const el = anchor(container);
		fireEvent.click(el);
		expect(onClick).not.toHaveBeenCalled();
		expect(el).toHaveAttribute("aria-disabled", "true");
		expect(el).toHaveAttribute("tabindex", "-1");
		expect(el).not.toHaveAttribute("href");
	});

	it("NavbarLink: current wins over a consumer aria-current; consumer value passes otherwise", () => {
		const a = mount(NavbarLink as never, { href: "/x", current: true, "aria-current": "step" });
		expect(anchor(a.container)).toHaveAttribute("aria-current", "page");
		cleanup();
		const b = mount(NavbarLink as never, { href: "/x", "aria-current": "step" });
		expect(anchor(b.container)).toHaveAttribute("aria-current", "step");
	});

	it("NavbarLink: external keeps target _blank and the safe rel", () => {
		const { container } = mount(NavbarLink as never, {
			href: "/x",
			external: true,
			target: "_self",
			rel: "me",
		});
		const el = anchor(container);
		expect(el).toHaveAttribute("target", "_blank");
		expect(el).toHaveAttribute("rel", "noopener noreferrer");
	});

	it("NavigationMenuLink: current wins over aria-current; external keeps target/rel", () => {
		const { container } = mount(NavigationMenuLink as never, {
			href: "/x",
			current: true,
			external: true,
			"aria-current": "step",
			target: "_self",
		});
		const el = anchor(container);
		expect(el).toHaveAttribute("aria-current", "page");
		expect(el).toHaveAttribute("target", "_blank");
		expect(el).toHaveAttribute("rel", "noopener noreferrer");
	});

	it("NavigationMenuLink: consumer target/aria-current pass through when not managed", () => {
		const { container } = mount(NavigationMenuLink as never, {
			href: "/x",
			"aria-current": "step",
			target: "_self",
		});
		const el = anchor(container);
		expect(el).toHaveAttribute("aria-current", "step");
		expect(el).toHaveAttribute("target", "_self");
	});

	it("InlineCitation: keeps its label and target, merges aria-describedby with the card id", async () => {
		vi.useFakeTimers();
		try {
			const { container } = mount(InlineCitation as never, {
				source,
				index: 2,
				"aria-describedby": "note",
				"aria-label": "mine",
				target: "_self",
			});
			const el = anchor(container);
			expect(el).toHaveAttribute("aria-label", "Source 2: Structured outputs");
			expect(el).toHaveAttribute("target", "_blank");
			fireEvent.mouseEnter(el);
			await act(async () => {
				await vi.advanceTimersByTimeAsync(150);
			});
			const ids = el.getAttribute("aria-describedby")!.split(" ");
			expect(ids).toContain("note");
			expect(ids).toHaveLength(2);
		} finally {
			vi.useRealTimers();
		}
	});

	it("Link: keeps the computed safe rel when a consumer rel is passed", () => {
		const { container } = mount(Link as never, { href: "/x", target: "_blank", rel: "me" });
		expect(anchor(container).getAttribute("rel")?.split(" ")).toEqual(
			expect.arrayContaining(["me", "noopener", "noreferrer"])
		);
	});
});

describe("Link order", () => {
	it("runs the internal press cue before the consumer onClick", () => {
		const calls: string[] = [];
		const play = vi.spyOn(sound, "play").mockImplementation(() => {
			calls.push("internal");
		});
		const onClick = vi.fn(() => calls.push("consumer"));
		const { container } = mount(Link as never, { href: "/x", sound: true, onClick });
		fireEvent.click(anchor(container));
		expect(calls).toEqual(["internal", "consumer"]);
		play.mockRestore();
	});
});
