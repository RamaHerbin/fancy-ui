import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Harness from "./MagneticFieldHarness.test.svelte";
import MagneticItem from "./MagneticItem.svelte";

// --- fake clock -----------------------------------------------------------

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
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches,
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
		addListener: () => {},
		removeListener: () => {},
	}));
}

const observers: Array<{ cb: IntersectionObserverCallback; node: Element | null }> = [];

function stubIntersection() {
	vi.stubGlobal(
		"IntersectionObserver",
		class {
			entry: { cb: IntersectionObserverCallback; node: Element | null };
			constructor(cb: IntersectionObserverCallback) {
				this.entry = { cb, node: null };
				observers.push(this.entry);
			}
			observe(node: Element) {
				this.entry.node = node;
			}
			unobserve() {}
			disconnect() {
				this.entry.node = null;
			}
		}
	);
}

function setVisible(visible: boolean) {
	for (const o of observers) {
		if (!o.node) continue;
		o.cb(
			[{ isIntersecting: visible, target: o.node } as unknown as IntersectionObserverEntry],
			{} as IntersectionObserver
		);
	}
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
	observers.length = 0;
	vi.spyOn(performance, "now").mockImplementation(() => now);
	vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
		const id = nextId++;
		frames.push({ id, cb });
		return id;
	});
	vi.stubGlobal("cancelAnimationFrame", (id: number) => {
		frames = frames.filter((f) => f.id !== id);
	});
	stubIntersection();
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("MagneticField markup", () => {
	it("renders a static root, outer and inner wrappers, and forwards attributes", () => {
		render(Harness, {
			rootClass: "my-field",
			rootAttrs: { "aria-label": "Demo", id: "f" },
			itemAttrs: { title: "first", class: "my-item" },
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

	it("binds the root and item refs", async () => {
		const props = $stateLike({
			rootRef: null as HTMLDivElement | null,
			itemRef: null as HTMLElement | null,
		});
		render(Harness, props);
		await tick();
		expect(props.rootRef).toBe(screen.getByTestId("field"));
		expect(props.itemRef).toBe(screen.getByTestId("item-a"));
	});

	it("renders spans for inline items", () => {
		render(Harness, { items: [{ id: "a", label: "Chip", inline: true }] });
		const a = screen.getByTestId("item-a");
		expect(a.tagName).toBe("SPAN");
		expect(a).toHaveAttribute("data-inline");
		expect(inner("a").tagName).toBe("SPAN");
	});

	it("renders an item outside a field without throwing, and never moves it", () => {
		const { container } = render(MagneticItem, { "data-testid": "lonely" } as never);
		const outer = container.querySelector(".ft-magnetic-item") as HTMLElement;
		expect(outer).toBeTruthy();
		const innerNode = outer.querySelector(".ft-magnetic-item-inner") as HTMLElement;
		expect(innerNode.style.getPropertyValue("--ft-mf-x")).toBe("");
	});
});

/** Minimal reactive bag for bindable props passed to `render`. */
function $stateLike<T extends Record<string, unknown>>(initial: T): T {
	const bag = { ...initial };
	const out = {} as T;
	for (const key of Object.keys(bag) as Array<keyof T>) {
		Object.defineProperty(out, key, {
			enumerable: true,
			get: () => bag[key],
			set: (v) => {
				bag[key] = v;
			},
		});
	}
	return out;
}

describe("MagneticField manual source", () => {
	it("pulls items toward the position, lighter more, then springs back", async () => {
		const onActiveChange = vi.fn();
		const view = render(Harness, { source: "manual", position: null, onActiveChange });
		layout();
		expect(screen.getByTestId("field")).toHaveAttribute("data-source", "manual");

		await view.rerender({ source: "manual", position: { x: 220, y: 140 }, onActiveChange });
		expect(frames.length).toBeGreaterThan(0);
		settle();
		await tick();
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
		await tick();
		expect(varOf("a", "x")).toBe("0.00px");
		expect(varOf("a", "r")).toBe("0.00deg");
		expect(screen.getByTestId("field")).not.toHaveAttribute("data-active");
		expect(onActiveChange).toHaveBeenLastCalledWith(false);
		expect(inner("a").style.willChange).toBe("");
	});

	it("ignores position while source is pointer", async () => {
		render(Harness, { source: "pointer", position: { x: 220, y: 140 } });
		layout();
		settle();
		expect(varOf("a", "x")).toBe("0.00px");
	});

	it("repels with polarity -1 (translation only)", async () => {
		render(Harness, {
			source: "manual",
			position: { x: 220, y: 112 },
			polarity: -1,
			items: [{ id: "a", label: "A" }],
		});
		layout();
		settle();
		expect(num("a", "x")).toBeLessThan(0);
		expect(num("a", "r")).toBeLessThan(0);
	});

	it("honours per-item pull and rotate, live", async () => {
		const view = render(Harness, {
			source: "manual",
			position: { x: 220, y: 140 },
			items: [{ id: "a", label: "A" }],
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
		const view = render(Harness, { source: "manual", position: { x: 220, y: 140 } });
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
		render(Harness, { source: "manual", position: { x: 220, y: 140 } });
		layout();
		await tick();
		expect(frames).toHaveLength(0);
		expect(varOf("a", "x")).toBe("0.00px");
	});
});

describe("MagneticField pointer source", () => {
	it("follows a mouse anywhere on the page once the field is in view", async () => {
		render(Harness, { items: [{ id: "a", label: "A" }] });
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

	it("attaches no observer and no listener while disabled", () => {
		render(Harness, { disabled: true });
		expect(observers.filter((o) => o.node)).toHaveLength(0);
	});

	it("tears everything down on unmount", async () => {
		const view = render(Harness, { source: "manual", position: { x: 220, y: 140 } });
		layout();
		flushFrame();
		const node = inner("a");
		view.unmount();
		expect(frames).toHaveLength(0);
		expect(node.style.getPropertyValue("--ft-mf-x")).toBe("0.00px");
		expect(observers.filter((o) => o.node)).toHaveLength(0);
		expect(() => pointerMove(240, 112)).not.toThrow();
	});
});

describe("MagneticField with a puck", () => {
	it("a held puck drives the field over the pointer, and releases on put-down", async () => {
		render(Harness, {
			withPuck: true,
			puckPosition: { x: 60, y: 112 },
			items: [{ id: "a", label: "A" }],
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
