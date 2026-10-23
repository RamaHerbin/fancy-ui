import { cleanup, fireEvent, render, screen } from "@testing-library/vue";
import { mount } from "@vue/test-utils";
import { createSSRApp, defineComponent, h, nextTick, ref, type PropType } from "vue";
import { renderToString } from "vue/server-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeIntersectionObserver } from "../../test-setup.js";
import MagneticField from "./MagneticField.vue";
import MagneticItem from "./MagneticItem.vue";
import MagnetPuck from "./MagnetPuck.vue";
import type { MagneticFieldSource, MagneticPoint } from "./magnetic-field-core.js";

/**
 * This package's jsdom has no `PointerEvent`; testing-library builds events
 * from `window[EventType]`, so without a shim `pointerId`, `pointerType` and
 * `isPrimary` would be dropped. Extending `MouseEvent` keeps the coordinates
 * and `button` real.
 */
class PointerEventShim extends MouseEvent {
	readonly pointerId: number;
	readonly pointerType: string;
	readonly isPrimary: boolean;
	constructor(type: string, init: PointerEventInit = {}) {
		super(type, init);
		this.pointerId = init.pointerId ?? 0;
		this.pointerType = init.pointerType ?? "";
		this.isPrimary = init.isPrimary ?? false;
	}
}
if (typeof window !== "undefined" && typeof window.PointerEvent === "undefined") {
	(window as unknown as { PointerEvent: unknown }).PointerEvent = PointerEventShim;
}

// --- harness ---------------------------------------------------------------

interface Item {
	id: string;
	label: string;
	mass?: number;
	strength?: number;
	pull?: boolean;
	rotate?: boolean;
	inline?: boolean;
}

const DEFAULT_ITEMS: Item[] = [
	{ id: "a", label: "Alpha" },
	{ id: "b", label: "Beta", mass: 2.5 },
];

/** A real field with a list of items and an optional puck, wired the way a consumer would. */
const Harness = defineComponent({
	props: {
		items: { type: Array as PropType<Item[]>, default: () => DEFAULT_ITEMS },
		source: { type: String as PropType<MagneticFieldSource>, default: undefined },
		position: { type: Object as PropType<MagneticPoint | null>, default: undefined },
		polarity: { type: Number as PropType<1 | -1>, default: undefined },
		radius: { type: Number, default: undefined },
		disabled: { type: Boolean, default: undefined },
		onActiveChange: { type: Function as PropType<(active: boolean) => void>, default: undefined },
		withPuck: { type: Boolean, default: false },
		puckPosition: { type: Object as PropType<MagneticPoint>, default: () => ({ x: 48, y: 48 }) },
		rootClass: { type: String, default: undefined },
		rootAttrs: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
		itemAttrs: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
	},
	setup(props) {
		const puckPosition = ref<MagneticPoint>(props.puckPosition);
		return () =>
			h(
				MagneticField,
				{
					"data-testid": "field",
					class: props.rootClass,
					source: props.source,
					position: props.position,
					polarity: props.polarity,
					radius: props.radius,
					disabled: props.disabled,
					onActiveChange: props.onActiveChange,
					...props.rootAttrs,
				},
				{
					default: () => [
						...props.items.map((item, i) =>
							h(
								MagneticItem,
								{
									key: item.id,
									"data-testid": `item-${item.id}`,
									mass: item.mass,
									strength: item.strength,
									pull: item.pull,
									rotate: item.rotate,
									inline: item.inline,
									...(i === 0 ? props.itemAttrs : {}),
								},
								{
									default: () =>
										i === 0 ? h("button", { type: "button" }, item.label) : h("span", item.label),
								}
							)
						),
						props.withPuck
							? h(MagnetPuck, {
									"data-testid": "puck",
									position: puckPosition.value,
									"onUpdate:position": (p: MagneticPoint) => (puckPosition.value = p),
								})
							: null,
					],
				}
			);
	},
});

// --- fake clock -------------------------------------------------------------

interface Frame {
	id: number;
	cb: FrameRequestCallback;
}

let frames: Frame[] = [];
let nextId = 1;
let now = 0;

function flushFrame(ms = 1000 / 60) {
	now += ms;
	const due = frames;
	frames = [];
	for (const f of due) f.cb(now);
}

function settle(max = 600) {
	let i = 0;
	while (frames.length && i++ < max) flushFrame();
	return i;
}

// --- fake layout ------------------------------------------------------------

function rect(el: Element, r: { left: number; top: number; width: number; height: number }) {
	vi.spyOn(el, "getBoundingClientRect").mockImplementation(
		() =>
			({
				...r,
				x: r.left,
				y: r.top,
				right: r.left + r.width,
				bottom: r.top + r.height,
				toJSON() {},
			}) as DOMRect
	);
}

/** Field at client (0, 0); item a at local (100, 100) 80×24, item b below it. */
function layout() {
	rect(screen.getByTestId("field"), { left: 0, top: 0, width: 600, height: 400 });
	rect(screen.getByTestId("item-a"), { left: 100, top: 100, width: 80, height: 24 });
	const b = screen.queryByTestId("item-b");
	if (b) rect(b, { left: 100, top: 160, width: 80, height: 24 });
}

const inner = (id: string) =>
	screen.getByTestId(`item-${id}`).querySelector(".ft-magnetic-item-inner") as HTMLElement;
const varOf = (id: string, name: "x" | "y" | "r") =>
	inner(id).style.getPropertyValue(`--ft-mf-${name}`);
const num = (id: string, name: "x" | "y" | "r") => Number.parseFloat(varOf(id, name));

// --- environment stubs ------------------------------------------------------

function stubReducedMotion(matches: boolean) {
	vi.spyOn(window, "matchMedia").mockImplementation(
		(query: string) =>
			({
				matches,
				media: query,
				onchange: null,
				addEventListener: () => {},
				removeEventListener: () => {},
				dispatchEvent: () => false,
				addListener: () => {},
				removeListener: () => {},
			}) as unknown as MediaQueryList
	);
}

const observing = () => FakeIntersectionObserver.instances.filter((o) => o.elements.size > 0);

function setVisible(visible: boolean) {
	for (const o of observing()) o.trigger(visible);
}

function pointerMove(clientX: number, clientY: number, pointerType = "mouse") {
	document.dispatchEvent(
		new PointerEvent("pointermove", {
			bubbles: true,
			clientX,
			clientY,
			isPrimary: true,
			pointerType,
		})
	);
}

beforeEach(() => {
	frames = [];
	now = 1000;
	vi.spyOn(performance, "now").mockImplementation(() => now);
	vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
		const id = nextId++;
		frames.push({ id, cb });
		return id;
	});
	vi.stubGlobal("cancelAnimationFrame", (id: number) => {
		frames = frames.filter((f) => f.id !== id);
	});
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("MagneticField markup", () => {
	it("renders a static root, outer and inner wrappers, and forwards attributes", () => {
		render(Harness, {
			props: {
				rootClass: "my-field",
				rootAttrs: { "aria-label": "Demo", id: "f" },
				itemAttrs: { title: "first", class: "my-item" },
			},
		});
		const field = screen.getByTestId("field");
		expect(field.tagName).toBe("DIV");
		expect(field).toHaveClass("ft-magnetic-field", "my-field");
		expect(field).toHaveAttribute("data-source", "pointer");
		expect(field).not.toHaveAttribute("data-active");
		expect(field).toHaveAttribute("aria-label", "Demo");
		expect(field).not.toHaveAttribute("role");
		expect(field.id).toBe("f");

		const a = screen.getByTestId("item-a");
		expect(a.tagName).toBe("DIV");
		expect(a).toHaveClass("ft-magnetic-item", "my-item");
		expect(a).toHaveAttribute("title", "first");
		expect(a).not.toHaveAttribute("data-inline");
		expect(inner("a").tagName).toBe("DIV");
		expect(inner("a").querySelector("button")).toHaveTextContent("Alpha");
		// Registered on mount: the vars read rest.
		expect(varOf("a", "x")).toBe("0.00px");
		expect(varOf("a", "r")).toBe("0.00deg");
		expect(frames).toHaveLength(0);
	});

	it("exposes the root and item refs", () => {
		const field = mount(MagneticField, { slots: { default: "<span>x</span>" } });
		expect((field.vm as unknown as { ref: HTMLElement }).ref).toBe(field.element);
		field.unmount();
		const item = mount(MagneticItem, { slots: { default: "<span>x</span>" } });
		expect((item.vm as unknown as { ref: HTMLElement }).ref).toBe(item.element);
		item.unmount();
	});

	it("renders spans for inline items", () => {
		render(Harness, { props: { items: [{ id: "a", label: "Chip", inline: true }] } });
		const a = screen.getByTestId("item-a");
		expect(a.tagName).toBe("SPAN");
		expect(a).toHaveAttribute("data-inline");
		expect(inner("a").tagName).toBe("SPAN");
	});

	it("renders an item outside a field without throwing, and never moves it", () => {
		const { container } = render(MagneticItem, { attrs: { "data-testid": "lonely" } });
		const outer = container.querySelector(".ft-magnetic-item") as HTMLElement;
		expect(outer).toBeTruthy();
		expect(outer).toHaveAttribute("data-testid", "lonely");
		const innerNode = outer.querySelector(".ft-magnetic-item-inner") as HTMLElement;
		expect(innerNode.style.getPropertyValue("--ft-mf-x")).toBe("");
	});

	it("server-renders the same markup twice, at rest", async () => {
		const app = () =>
			createSSRApp({
				render: () =>
					h(MagneticField, null, {
						default: () => [
							h(MagneticItem, null, { default: () => "A" }),
							h(MagnetPuck, { position: { x: 10, y: 10 } }),
						],
					}),
			});
		const first = await renderToString(app());
		const second = await renderToString(app());
		expect(first).toBe(second);
		expect(first).toContain('class="ft-magnetic-field');
		expect(first).toContain('data-source="pointer"');
		expect(first).not.toContain("--ft-mf-x");
		expect(first).toContain("translate3d(-10px, -10px, 0)");
	});
});

describe("MagneticField manual source", () => {
	it("pulls items toward the position, lighter more, then springs back", async () => {
		const onActiveChange = vi.fn();
		const view = render(Harness, { props: { source: "manual", position: null, onActiveChange } });
		layout();
		expect(screen.getByTestId("field")).toHaveAttribute("data-source", "manual");

		await view.rerender({ source: "manual", position: { x: 220, y: 140 }, onActiveChange });
		expect(frames.length).toBeGreaterThan(0);
		settle();
		await nextTick();
		expect(num("a", "x")).toBeGreaterThan(10);
		expect(num("a", "r")).toBeLessThan(0); // magnet to the right: counter-clockwise
		expect(num("b", "x")).toBeGreaterThan(0);
		expect(num("b", "x")).toBeLessThan(num("a", "x")); // b is heavier and farther
		expect(screen.getByTestId("field")).toHaveAttribute("data-active");
		expect(onActiveChange).toHaveBeenLastCalledWith(true);
		// Settled while still engaged: the layer is given back.
		expect(inner("a").style.willChange).toBe("");

		await view.rerender({ source: "manual", position: null, onActiveChange });
		settle();
		await nextTick();
		expect(varOf("a", "x")).toBe("0.00px");
		expect(varOf("a", "r")).toBe("0.00deg");
		expect(screen.getByTestId("field")).not.toHaveAttribute("data-active");
		expect(onActiveChange).toHaveBeenLastCalledWith(false);
		expect(inner("a").style.willChange).toBe("");
	});

	it("ignores position while source is pointer", () => {
		render(Harness, { props: { source: "pointer", position: { x: 220, y: 140 } } });
		layout();
		settle();
		expect(varOf("a", "x")).toBe("0.00px");
	});

	it("repels with polarity -1 (translation only)", () => {
		render(Harness, {
			props: {
				source: "manual",
				position: { x: 220, y: 112 },
				polarity: -1,
				items: [{ id: "a", label: "A" }],
			},
		});
		layout();
		settle();
		expect(num("a", "x")).toBeLessThan(0);
		expect(num("a", "r")).toBeLessThan(0);
	});

	it("honours per-item pull and rotate, live", async () => {
		const view = render(Harness, {
			props: {
				source: "manual",
				position: { x: 220, y: 140 },
				items: [{ id: "a", label: "A" }],
			},
		});
		layout();
		settle();
		expect(num("a", "x")).toBeGreaterThan(0);
		await view.rerender({
			source: "manual",
			position: { x: 220, y: 140 },
			items: [{ id: "a", label: "A", pull: false }],
		});
		settle();
		expect(varOf("a", "x")).toBe("0.00px");
		expect(num("a", "r")).not.toBe(0);
	});

	it("springs back when disabled", async () => {
		const view = render(Harness, { props: { source: "manual", position: { x: 220, y: 140 } } });
		layout();
		settle();
		expect(num("a", "x")).toBeGreaterThan(0);
		await view.rerender({ source: "manual", position: { x: 220, y: 140 }, disabled: true });
		flushFrame();
		expect(num("a", "x")).toBeGreaterThan(0); // animates, does not snap
		settle();
		expect(varOf("a", "x")).toBe("0.00px");
	});

	it("stays at rest under reduced motion and schedules nothing", async () => {
		stubReducedMotion(true);
		render(Harness, { props: { source: "manual", position: { x: 220, y: 140 } } });
		layout();
		await nextTick();
		expect(frames).toHaveLength(0);
		expect(varOf("a", "x")).toBe("0.00px");
	});
});

describe("MagneticField pointer source", () => {
	it("follows a mouse anywhere on the page once the field is in view", () => {
		render(Harness, { props: { items: [{ id: "a", label: "A" }] } });
		layout();
		pointerMove(240, 112);
		expect(frames).toHaveLength(0); // not in view yet: no listener
		setVisible(true);
		pointerMove(240, 112);
		settle();
		expect(num("a", "x")).toBeGreaterThan(0);
		// Touch is ignored.
		pointerMove(20, 112, "touch");
		settle();
		expect(num("a", "x")).toBeGreaterThan(0);
		// Leaving the viewport clears the pointer.
		setVisible(false);
		settle();
		expect(varOf("a", "x")).toBe("0.00px");
		pointerMove(240, 112);
		expect(frames).toHaveLength(0);
	});

	it("keeps a resting pointer pulling across a radius change", async () => {
		const view = render(Harness, { props: { items: [{ id: "a", label: "A" }], radius: 220 } });
		layout();
		setVisible(true);
		pointerMove(240, 112);
		settle();
		const held = num("a", "x");
		expect(held).toBeGreaterThan(0);
		await view.rerender({ items: [{ id: "a", label: "A" }], radius: 230 });
		await nextTick();
		settle();
		expect(num("a", "x")).toBeGreaterThanOrEqual(held);
		expect(observing()).toHaveLength(1);
		expect(observing()[0]!.options?.rootMargin).toBe("230px");
	});

	it("attaches no observer and no listener while disabled", () => {
		render(Harness, { props: { disabled: true } });
		expect(observing()).toHaveLength(0);
	});

	it("tears everything down on unmount", () => {
		const view = render(Harness, { props: { source: "manual", position: { x: 220, y: 140 } } });
		layout();
		flushFrame();
		const node = inner("a");
		view.unmount();
		expect(frames).toHaveLength(0);
		expect(node.style.getPropertyValue("--ft-mf-x")).toBe("0.00px");
		expect(observing()).toHaveLength(0);
		expect(() => pointerMove(240, 112)).not.toThrow();
	});
});

describe("MagneticField with a puck", () => {
	it("a held puck drives the field over the pointer, and releases on put-down", async () => {
		render(Harness, {
			props: {
				withPuck: true,
				puckPosition: { x: 60, y: 112 },
				items: [{ id: "a", label: "A" }],
			},
		});
		layout();
		setVisible(true);
		pointerMove(240, 112); // pointer to the right
		settle();
		expect(num("a", "x")).toBeGreaterThan(0);

		const puck = screen.getByTestId("puck");
		await fireEvent.keyDown(puck, { key: " " }); // pick up: puck on the left wins
		settle();
		expect(num("a", "x")).toBeLessThan(0);
		expect(num("a", "r")).toBeGreaterThan(0);

		await fireEvent.keyDown(puck, { key: "Escape" }); // put down: back to the pointer
		settle();
		expect(num("a", "x")).toBeGreaterThan(0);
	});
});
