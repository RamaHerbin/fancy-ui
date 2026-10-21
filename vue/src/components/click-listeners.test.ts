import { render, cleanup, fireEvent } from "@testing-library/vue";
import { defineComponent, h } from "vue";
import { afterEach, beforeAll, describe, it, expect, vi } from "vitest";
import Button from "./button/Button.vue";
import GradientButton from "./gradient-button/GradientButton.vue";
import Link from "./link/Link.vue";
import NavbarLink from "./navbar/NavbarLink.vue";
import SidebarItem from "./sidebar/SidebarItem.vue";
import InteractiveHoverButton from "./interactive-hover-button/InteractiveHoverButton.vue";
import RippleButton from "./ripple-button/RippleButton.vue";
import IconButton from "./icon-button/IconButton.vue";
import ChatMessageAction from "./chat-message/ChatMessageAction.vue";
import FlipCard from "./flip-card/FlipCard.vue";
import Compare from "./compare/Compare.vue";
import { callListener } from "../internals/call-listener";

afterEach(cleanup);

// Loosely typed: the table below mixes components with different props.
const mount = render as unknown as (
	comp: unknown,
	options: { props?: Record<string, unknown>; attrs?: Record<string, unknown> }
) => ReturnType<typeof render>;

// jsdom does not implement navigation; anchor activations would log noise.
beforeAll(() => document.addEventListener("click", (e) => e.preventDefault()));

// The consumer form is `@click="fn"`, which Vue compiles to the vnode prop
// `onClick`. Every component below must call it exactly once per activation,
// and keep honouring the deprecated lowercase `onclick` prop.
const CASES: Array<{
	name: string;
	comp: unknown;
	props?: Record<string, unknown>;
	/** Whether `disabled` is supported and must block the callback. */
	disabled?: boolean;
}> = [
	{ name: "Button", comp: Button, disabled: true },
	{ name: "Button (anchor)", comp: Button, props: { href: "/x" }, disabled: true },
	{ name: "GradientButton", comp: GradientButton },
	{ name: "Link", comp: Link, props: { href: "/x" } },
	{ name: "NavbarLink", comp: NavbarLink, props: { href: "/x" }, disabled: true },
	{ name: "SidebarItem", comp: SidebarItem, disabled: true },
	{ name: "InteractiveHoverButton", comp: InteractiveHoverButton },
	{ name: "RippleButton", comp: RippleButton },
	{ name: "IconButton", comp: IconButton, props: { label: "Go" }, disabled: true },
	{ name: "ChatMessageAction", comp: ChatMessageAction, props: { label: "Copy" } },
];

function target(container: Element): HTMLElement {
	return container.querySelector("button, a") as HTMLElement;
}

describe.each(CASES)("$name click listeners", ({ comp, props, disabled }) => {
	it("calls a consumer @click (onClick) exactly once", async () => {
		const handler = vi.fn();
		const { container } = mount(comp, {
			props: { ...props },
			attrs: { onClick: handler },
		});
		await fireEvent.click(target(container));
		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0]?.[0]).toBeInstanceOf(MouseEvent);
	});

	it("still calls the deprecated lowercase onclick prop once", async () => {
		const handler = vi.fn();
		const { container } = mount(comp, { props: { ...props, onclick: handler } });
		await fireEvent.click(target(container));
		expect(handler).toHaveBeenCalledTimes(1);
	});

	it("calls only onClick when both are given", async () => {
		const camel = vi.fn();
		const lower = vi.fn();
		const { container } = mount(comp, {
			props: { ...props, onclick: lower },
			attrs: { onClick: camel },
		});
		await fireEvent.click(target(container));
		expect(camel).toHaveBeenCalledTimes(1);
		expect(lower).not.toHaveBeenCalled();
	});

	if (disabled) {
		it("does not call onClick while disabled", async () => {
			const handler = vi.fn();
			const { container } = mount(comp, {
				props: { ...props, disabled: true },
				attrs: { onClick: handler },
			});
			await fireEvent.click(target(container));
			expect(handler).not.toHaveBeenCalled();
		});
	}
});

describe("Button loading", () => {
	it("does not call onClick while loading", async () => {
		const handler = vi.fn();
		const { container } = render(Button, { props: { loading: true }, attrs: { onClick: handler } });
		await fireEvent.click(target(container));
		expect(handler).not.toHaveBeenCalled();
	});
});

describe("custom listeners", () => {
	it("FlipCard: @flip (onFlip) fires once per flip; deprecated onflip still works", async () => {
		const onFlip = vi.fn();
		const a = render(FlipCard, { props: { trigger: "click" }, attrs: { onFlip } });
		await fireEvent.click(a.container.firstElementChild as HTMLElement);
		expect(onFlip.mock.calls).toEqual([[true]]);
		cleanup();

		const onflip = vi.fn();
		const b = render(FlipCard, { props: { trigger: "click", onflip } });
		await fireEvent.click(b.container.firstElementChild as HTMLElement);
		expect(onflip.mock.calls).toEqual([[true]]);
	});

	it("Compare: @hover-enter (onHoverEnter) fires once; deprecated onhoverenter still works", async () => {
		const onHoverEnter = vi.fn();
		const a = render(Compare, { attrs: { onHoverEnter } });
		await fireEvent.mouseEnter(a.container.querySelector('[role="slider"]') as HTMLElement);
		expect(onHoverEnter).toHaveBeenCalledTimes(1);
		cleanup();

		const onhoverenter = vi.fn();
		const b = render(Compare, { props: { onhoverenter } });
		await fireEvent.mouseEnter(b.container.querySelector('[role="slider"]') as HTMLElement);
		expect(onhoverenter).toHaveBeenCalledTimes(1);
	});
});

// A wrapper whose root IS the component, with its own `@click`, plus a parent
// that adds another: Vue merges the two into an ARRAY on the `onClick` prop.
describe.each([
	{ name: "Button", comp: Button },
	{ name: "GradientButton", comp: GradientButton },
	{ name: "RippleButton", comp: RippleButton },
	{ name: "InteractiveHoverButton", comp: InteractiveHoverButton },
])("$name as the root of a wrapper", ({ comp }) => {
	it("runs the wrapper's and the parent's @click exactly once each, without throwing", async () => {
		const inner = vi.fn();
		const outer = vi.fn();
		const Wrapper = defineComponent({
			setup: () => () => h(comp as never, { onClick: inner }),
		});
		const { container } = render(Wrapper, { attrs: { onClick: outer } });
		await fireEvent.click(target(container));
		expect(inner).toHaveBeenCalledTimes(1);
		expect(outer).toHaveBeenCalledTimes(1);
	});
});

describe("callListener with merged listeners", () => {
	it("calls every function of a normal array once", () => {
		const first = vi.fn();
		const second = vi.fn();
		const event = new MouseEvent("click");
		callListener([first, second], event);
		expect(first).toHaveBeenCalledWith(event);
		expect(second).toHaveBeenCalledWith(event);
	});

	it("stops later functions once an earlier one calls stopImmediatePropagation", () => {
		const first = vi.fn((e: Event) => e.stopImmediatePropagation());
		const second = vi.fn();
		const event = new MouseEvent("click");
		const native = vi.spyOn(Event.prototype, "stopImmediatePropagation");
		callListener([first, second], event);
		expect(first).toHaveBeenCalledTimes(1);
		expect(second).not.toHaveBeenCalled();
		expect(native).toHaveBeenCalledTimes(1);
		native.mockRestore();
		expect(Object.prototype.hasOwnProperty.call(event, "stopImmediatePropagation")).toBe(false);
	});

	it("keeps single-function behaviour unchanged", () => {
		const only = vi.fn((e: Event) => e.stopImmediatePropagation());
		const event = new MouseEvent("click");
		callListener(only, event);
		expect(only).toHaveBeenCalledTimes(1);
	});

	it("a wrapper's @click that stops immediate propagation suppresses the parent's", async () => {
		const inner = vi.fn((e: Event) => e.stopImmediatePropagation());
		const outer = vi.fn();
		const Wrapper = defineComponent({
			setup: () => () => h(Button as never, { onClick: inner }),
		});
		const { container } = render(Wrapper, { attrs: { onClick: outer } });
		await fireEvent.click(target(container));
		expect(inner).toHaveBeenCalledTimes(1);
		expect(outer).not.toHaveBeenCalled();
	});
});
