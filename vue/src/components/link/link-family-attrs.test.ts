import { render, cleanup, fireEvent } from "@testing-library/vue";
import { afterEach, beforeAll, describe, it, expect, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import Link from "./Link.vue";
import { sound } from "../../sound/sound.js";
import LineHoverLink from "../line-hover-link/LineHoverLink.vue";
import NavbarLink from "../navbar/NavbarLink.vue";
import NavigationMenuLink from "../navigation-menu/NavigationMenuLink.vue";
import InlineCitation from "../inline-citation/InlineCitation.vue";

// jsdom does not implement navigation; anchor activations would log noise.
beforeAll(() => document.addEventListener("click", (e) => e.preventDefault()));
afterEach(cleanup);

const source = {
	id: "s",
	title: "Structured outputs",
	url: "https://www.example.com/docs",
	snippet: "Constrained decoding.",
};

type Rec = Record<string, unknown>;
type Case = [string, unknown, Rec];

// Loosely typed: the table below mixes components with different props.
const mount = render as unknown as (
	comp: unknown,
	options: { props?: Rec; attrs?: Rec }
) => ReturnType<typeof render>;

const ANCHORS: Case[] = [
	["Link", Link, { href: "/docs" }],
	["LineHoverLink", LineHoverLink, { href: "/docs" }],
	["NavbarLink", NavbarLink, { href: "/docs" }],
	["NavigationMenuLink", NavigationMenuLink, { href: "/docs" }],
];
const ALL: Case[] = [...ANCHORS, ["InlineCitation", InlineCitation, { source, index: 1 }]];

function anchor(container: Element): HTMLElement {
	return container.querySelector("a, button") as HTMLElement;
}

describe.each(ALL)("%s forwards native attributes", (_name, Comp, props) => {
	it("puts id, data-* and aria-* on the anchor", () => {
		const { container } = mount(Comp, {
			props,
			attrs: { id: "x", "data-testid": "t", "aria-describedby": "note" },
		});
		const el = anchor(container);
		expect(el).toHaveAttribute("id", "x");
		expect(el).toHaveAttribute("data-testid", "t");
		expect(el.getAttribute("aria-describedby")?.split(" ")).toContain("note");
	});

	it("fires a consumer onKeydown exactly once", async () => {
		const onKeydown = vi.fn();
		const { container } = mount(Comp, { props, attrs: { onKeydown } });
		await fireEvent.keyDown(anchor(container), { key: "a" });
		expect(onKeydown).toHaveBeenCalledTimes(1);
	});

	it("fires a consumer onBlur exactly once", async () => {
		const onBlur = vi.fn();
		const { container } = mount(Comp, { props, attrs: { onBlur } });
		await fireEvent.blur(anchor(container));
		expect(onBlur).toHaveBeenCalledTimes(1);
	});
});

describe.each(ANCHORS)("%s anchor attributes and click", (_name, Comp, props) => {
	it("forwards download and hreflang", () => {
		const { container } = mount(Comp, { props, attrs: { download: "f.pdf", hreflang: "fr" } });
		const el = anchor(container);
		expect(el).toHaveAttribute("download", "f.pdf");
		expect(el).toHaveAttribute("hreflang", "fr");
	});

	it("calls a consumer onClick exactly once", async () => {
		const onClick = vi.fn();
		const { container } = mount(Comp, { props, attrs: { onClick } });
		await fireEvent.click(anchor(container));
		expect(onClick).toHaveBeenCalledTimes(1);
	});
});

describe("InlineCitation handlers", () => {
	it("runs the open logic, then the consumer onClick, once (button marker)", async () => {
		const onClick = vi.fn();
		const onOpen = vi.fn();
		const { container } = mount(InlineCitation, {
			props: { source, index: 1, href: "", onOpen },
			attrs: { onClick },
		});
		await fireEvent.click(anchor(container));
		expect(onOpen).toHaveBeenCalledTimes(1);
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("consumer onFocus fires once and still opens the card", async () => {
		const onFocus = vi.fn();
		const onOpen = vi.fn();
		const { container } = mount(InlineCitation, {
			props: { source, index: 1, onOpen },
			attrs: { onFocus },
		});
		await fireEvent.focus(anchor(container));
		expect(onFocus).toHaveBeenCalledTimes(1);
		expect(onOpen).toHaveBeenCalledTimes(1);
	});
});

describe("invariants survive consumer attributes", () => {
	it("NavbarLink: disabled blocks onClick, keeps aria-disabled and tabindex -1", async () => {
		const onClick = vi.fn();
		const { container } = mount(NavbarLink, {
			props: { href: "/x", disabled: true, onClick },
			attrs: { tabindex: 0, "aria-disabled": "false" },
		});
		const el = anchor(container);
		await fireEvent.click(el);
		expect(onClick).not.toHaveBeenCalled();
		expect(el).toHaveAttribute("aria-disabled", "true");
		expect(el).toHaveAttribute("tabindex", "-1");
		expect(el).not.toHaveAttribute("href");
	});

	it("NavbarLink: current wins over a consumer aria-current; consumer value passes otherwise", () => {
		const a = mount(NavbarLink, {
			props: { href: "/x", current: true },
			attrs: { "aria-current": "step" },
		});
		expect(anchor(a.container)).toHaveAttribute("aria-current", "page");
		cleanup();
		const b = mount(NavbarLink, { props: { href: "/x" }, attrs: { "aria-current": "step" } });
		expect(anchor(b.container)).toHaveAttribute("aria-current", "step");
	});

	it("NavbarLink: external keeps target _blank and the safe rel", () => {
		const { container } = mount(NavbarLink, {
			props: { href: "/x", external: true },
			attrs: { target: "_self", rel: "me" },
		});
		const el = anchor(container);
		expect(el).toHaveAttribute("target", "_blank");
		expect(el).toHaveAttribute("rel", "noopener noreferrer");
	});

	it("NavigationMenuLink: current wins over aria-current; external keeps target/rel", () => {
		const { container } = mount(NavigationMenuLink, {
			props: { href: "/x", current: true, external: true },
			attrs: { "aria-current": "step", target: "_self" },
		});
		const el = anchor(container);
		expect(el).toHaveAttribute("aria-current", "page");
		expect(el).toHaveAttribute("target", "_blank");
		expect(el).toHaveAttribute("rel", "noopener noreferrer");
	});

	it("NavigationMenuLink: consumer target/aria-current pass through when not managed", () => {
		const { container } = mount(NavigationMenuLink, {
			props: { href: "/x" },
			attrs: { "aria-current": "step", target: "_self" },
		});
		const el = anchor(container);
		expect(el).toHaveAttribute("aria-current", "step");
		expect(el).toHaveAttribute("target", "_self");
	});

	it("InlineCitation: keeps its label and target, merges aria-describedby with the card id", async () => {
		vi.useFakeTimers();
		try {
			const { container } = mount(InlineCitation, {
				props: { source, index: 2 },
				attrs: { "aria-describedby": "note", "aria-label": "mine", target: "_self" },
			});
			const el = anchor(container);
			expect(el).toHaveAttribute("aria-label", "Source 2: Structured outputs");
			expect(el).toHaveAttribute("target", "_blank");
			await fireEvent.mouseEnter(el);
			await vi.advanceTimersByTimeAsync(150);
			await nextTick();
			const ids = el.getAttribute("aria-describedby")!.split(" ");
			expect(ids).toContain("note");
			expect(ids).toHaveLength(2);
		} finally {
			vi.useRealTimers();
		}
	});

	it("Link: keeps the computed safe rel when a consumer rel is passed", () => {
		const { container } = mount(Link, { props: { href: "/x", target: "_blank", rel: "me" } });
		expect(anchor(container).getAttribute("rel")?.split(" ")).toEqual(
			expect.arrayContaining(["me", "noopener", "noreferrer"])
		);
	});
});

describe("Link order", () => {
	it("runs the internal press cue before the consumer onClick", async () => {
		const calls: string[] = [];
		const play = vi.spyOn(sound, "play").mockImplementation(() => {
			calls.push("internal");
		});
		const onClick = vi.fn(() => calls.push("consumer"));
		const { container } = mount(Link, { props: { href: "/x", sound: true, onClick } });
		await fireEvent.click(anchor(container));
		expect(calls).toEqual(["internal", "consumer"]);
		play.mockRestore();
	});
});

describe("attributes stay reactive", () => {
	it.each([
		["NavbarLink", NavbarLink],
		["NavigationMenuLink", NavigationMenuLink],
		["InlineCitation", InlineCitation],
	] as Array<[string, never]>)(
		"%s picks up attributes added after the first render",
		async (name, Comp) => {
			const props = name === "InlineCitation" ? { source, index: 1 } : { href: "/x" };
			const extra = ref<Rec>({});
			const Host = defineComponent({
				render: () => h(Comp, { ...props, ...extra.value }),
			});
			const { container } = render(Host);
			expect(anchor(container)).not.toHaveAttribute("id");
			extra.value = { "aria-current": "step", id: "y", "aria-describedby": "late" };
			await nextTick();
			const el = anchor(container);
			expect(el).toHaveAttribute("id", "y");
			expect(el.getAttribute("aria-describedby")).toContain("late");
			if (name !== "InlineCitation") expect(el).toHaveAttribute("aria-current", "step");
		}
	);
});
