import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode, createRef, useState } from "react";
import type { ReactNode, Ref } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeIntersectionObserver } from "../../test-setup.js";
import { MagneticField, MagneticItem, MagnetPuck } from "./index.js";
import type { MagneticFieldProps, MagnetPuckProps } from "./index.js";
import { createMagneticFieldHub } from "./magnetic-field-core.js";
import type { MagneticFieldCore, MagneticPoint } from "./magnetic-field-core.js";
import { MAGNETIC_FIELD_KEY } from "./types.js";
import type { MagneticFieldContext } from "./types.js";

/**
 * `PointerEvent`, which the jsdom this package runs on does not implement.
 * Without it `fireEvent.pointerDown` falls back to a plain `Event` and drops the
 * init object: `pointerId`, `pointerType` and the coordinates arrive as
 * `undefined`. Extending `MouseEvent` makes the coordinates real. Test-only and
 * file-local, installed only where the host lacks the constructor.
 */
class PointerEventPolyfill extends MouseEvent {
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

if (typeof window.PointerEvent === "undefined") {
	Object.defineProperty(window, "PointerEvent", {
		writable: true,
		configurable: true,
		value: PointerEventPolyfill,
	});
}

// --- fake clock -----------------------------------------------------------

interface Frame {
	id: number;
	cb: FrameRequestCallback;
}

let frames: Frame[] = [];
let nextId = 1;
let now = 0;

function flushFrame(ms = 1000 / 60) {
	act(() => {
		now += ms;
		const due = frames;
		frames = [];
		for (const f of due) f.cb(now);
	});
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

const liveObservers = () => FakeIntersectionObserver.instances.filter((o) => o.elements.size > 0);

function setVisible(visible: boolean) {
	act(() => {
		for (const o of liveObservers()) o.trigger(visible);
	});
}

function pointerMove(clientX: number, clientY: number, pointerType = "mouse") {
	act(() => {
		document.dispatchEvent(
			new PointerEvent("pointermove", {
				bubbles: true,
				clientX,
				clientY,
				isPrimary: true,
				pointerType,
			})
		);
	});
}

// --- harness ------------------------------------------------------------------

interface HarnessItem {
	id: string;
	label: string;
	mass?: number;
	strength?: number;
	pull?: boolean;
	rotate?: boolean;
	inline?: boolean;
}

const DEFAULT_ITEMS: HarnessItem[] = [
	{ id: "a", label: "Alpha" },
	{ id: "b", label: "Beta", mass: 2.5 },
];

interface HarnessProps extends Omit<MagneticFieldProps, "children"> {
	items?: HarnessItem[];
	withPuck?: boolean;
	puckPosition?: MagneticPoint;
	sticky?: boolean;
	rootRef?: Ref<HTMLDivElement>;
	firstItemRef?: Ref<HTMLElement>;
	itemAttrs?: Record<string, unknown>;
}

/** A real field with a list of items and an optional (uncontrolled) puck. */
function Harness({
	items = DEFAULT_ITEMS,
	withPuck = false,
	puckPosition = { x: 48, y: 48 },
	sticky,
	rootRef,
	firstItemRef,
	itemAttrs = {},
	...field
}: HarnessProps) {
	return (
		<MagneticField ref={rootRef} data-testid="field" {...field}>
			{items.map((item, i) =>
				i === 0 ? (
					<MagneticItem
						key={item.id}
						ref={firstItemRef}
						data-testid={`item-${item.id}`}
						mass={item.mass}
						strength={item.strength}
						pull={item.pull}
						rotate={item.rotate}
						inline={item.inline}
						{...itemAttrs}
					>
						<button type="button">{item.label}</button>
					</MagneticItem>
				) : (
					<MagneticItem
						key={item.id}
						data-testid={`item-${item.id}`}
						mass={item.mass}
						strength={item.strength}
						pull={item.pull}
						rotate={item.rotate}
						inline={item.inline}
					>
						<span>{item.label}</span>
					</MagneticItem>
				)
			)}
			{withPuck ? (
				<MagnetPuck data-testid="puck" defaultPosition={puckPosition} sticky={sticky} />
			) : null}
		</MagneticField>
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
		render(
			<Harness
				className="my-field"
				aria-label="Demo"
				id="f"
				itemAttrs={{ title: "first", className: "my-item" }}
			/>
		);
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

	it("forwards the root and item refs", () => {
		const rootRef = createRef<HTMLDivElement>();
		const firstItemRef = createRef<HTMLElement>();
		render(<Harness rootRef={rootRef} firstItemRef={firstItemRef} />);
		expect(rootRef.current).toBe(screen.getByTestId("field"));
		expect(firstItemRef.current).toBe(screen.getByTestId("item-a"));
	});

	it("renders spans for inline items", () => {
		render(<Harness items={[{ id: "a", label: "Chip", inline: true }]} />);
		const a = screen.getByTestId("item-a");
		expect(a.tagName).toBe("SPAN");
		expect(a).toHaveAttribute("data-inline");
		expect(inner("a").tagName).toBe("SPAN");
	});

	it("renders an item outside a field without throwing, and never moves it", () => {
		const { container } = render(<MagneticItem data-testid="lonely" />);
		const outer = container.querySelector(".ft-magnetic-item") as HTMLElement;
		expect(outer).toBeTruthy();
		const innerNode = outer.querySelector(".ft-magnetic-item-inner") as HTMLElement;
		expect(innerNode.style.getPropertyValue("--ft-mf-x")).toBe("");
	});
});

describe("MagneticField manual source", () => {
	it("pulls items toward the position, lighter more, then springs back", () => {
		const onActiveChange = vi.fn();
		const view = render(
			<Harness source="manual" position={null} onActiveChange={onActiveChange} />
		);
		layout();
		expect(screen.getByTestId("field")).toHaveAttribute("data-source", "manual");

		view.rerender(
			<Harness source="manual" position={{ x: 220, y: 140 }} onActiveChange={onActiveChange} />
		);
		expect(frames.length).toBeGreaterThan(0);
		settle();
		expect(num("a", "x")).toBeGreaterThan(10);
		expect(num("a", "r")).toBeLessThan(0); // magnet to the right: counter-clockwise
		expect(num("b", "x")).toBeGreaterThan(0);
		expect(num("b", "x")).toBeLessThan(num("a", "x")); // b is heavier and farther
		expect(screen.getByTestId("field")).toHaveAttribute("data-active");
		expect(onActiveChange).toHaveBeenLastCalledWith(true);
		// Settled while still engaged: the layer is given back.
		expect(inner("a").style.willChange).toBe("");

		view.rerender(<Harness source="manual" position={null} onActiveChange={onActiveChange} />);
		settle();
		expect(varOf("a", "x")).toBe("0.00px");
		expect(varOf("a", "r")).toBe("0.00deg");
		expect(screen.getByTestId("field")).not.toHaveAttribute("data-active");
		expect(onActiveChange).toHaveBeenLastCalledWith(false);
		expect(inner("a").style.willChange).toBe("");
	});

	it("ignores position while source is pointer", () => {
		render(<Harness source="pointer" position={{ x: 220, y: 140 }} />);
		layout();
		settle();
		expect(varOf("a", "x")).toBe("0.00px");
	});

	it("repels with polarity -1 (translation only)", () => {
		render(
			<Harness
				source="manual"
				position={{ x: 220, y: 112 }}
				polarity={-1}
				items={[{ id: "a", label: "A" }]}
			/>
		);
		layout();
		settle();
		expect(num("a", "x")).toBeLessThan(0);
		expect(num("a", "r")).toBeLessThan(0);
	});

	it("honours per-item pull and rotate, live", () => {
		const view = render(
			<Harness source="manual" position={{ x: 220, y: 140 }} items={[{ id: "a", label: "A" }]} />
		);
		layout();
		settle();
		expect(num("a", "x")).toBeGreaterThan(0);
		view.rerender(
			<Harness
				source="manual"
				position={{ x: 220, y: 140 }}
				items={[{ id: "a", label: "A", pull: false }]}
			/>
		);
		settle();
		expect(varOf("a", "x")).toBe("0.00px");
		expect(num("a", "r")).not.toBe(0);
	});

	it("does not restart the loop when an inline position or spring literal re-renders", () => {
		const view = render(
			<Harness source="manual" position={{ x: 220, y: 140 }} spring={{ stiffness: 230 }} />
		);
		layout();
		settle();
		expect(frames).toHaveLength(0);
		view.rerender(
			<Harness source="manual" position={{ x: 220, y: 140 }} spring={{ stiffness: 230 }} />
		);
		expect(frames).toHaveLength(0);
	});

	it("springs back when disabled", () => {
		const view = render(<Harness source="manual" position={{ x: 220, y: 140 }} />);
		layout();
		settle();
		expect(num("a", "x")).toBeGreaterThan(0);
		view.rerender(<Harness source="manual" position={{ x: 220, y: 140 }} disabled />);
		flushFrame();
		expect(num("a", "x")).toBeGreaterThan(0); // animates, does not snap
		settle();
		expect(varOf("a", "x")).toBe("0.00px");
	});

	it("stays at rest under reduced motion and schedules nothing", () => {
		stubReducedMotion(true);
		render(<Harness source="manual" position={{ x: 220, y: 140 }} />);
		layout();
		expect(frames).toHaveLength(0);
		expect(varOf("a", "x")).toBe("0.00px");
	});
});

describe("MagneticField pointer source", () => {
	it("follows a mouse anywhere on the page once the field is in view", () => {
		render(<Harness items={[{ id: "a", label: "A" }]} />);
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

	it("observes with a rootMargin of radius", () => {
		render(<Harness radius={150} />);
		expect(liveObservers()).toHaveLength(1);
		expect(liveObservers()[0]!.options?.rootMargin).toBe("150px");
	});

	it("keeps a resting pointer pulling across a radius change", () => {
		const view = render(<Harness items={[{ id: "a", label: "A" }]} radius={220} />);
		layout();
		setVisible(true);
		pointerMove(240, 112);
		settle();
		const held = num("a", "x");
		expect(held).toBeGreaterThan(0);
		view.rerender(<Harness items={[{ id: "a", label: "A" }]} radius={230} />);
		settle();
		expect(num("a", "x")).toBeGreaterThanOrEqual(held);
		expect(liveObservers()).toHaveLength(1);
		expect(liveObservers()[0]!.options?.rootMargin).toBe("230px");
	});

	it("attaches no observer and no listener while disabled", () => {
		render(<Harness disabled />);
		expect(liveObservers()).toHaveLength(0);
	});

	it("tears everything down on unmount", () => {
		const view = render(<Harness source="manual" position={{ x: 220, y: 140 }} />);
		layout();
		flushFrame();
		const node = inner("a");
		view.unmount();
		expect(frames).toHaveLength(0);
		expect(node.style.getPropertyValue("--ft-mf-x")).toBe("0.00px");
		expect(liveObservers()).toHaveLength(0);
		expect(() => pointerMove(240, 112)).not.toThrow();
	});
});

describe("MagneticField under StrictMode", () => {
	it("survives the development double-mount: one observer, items still driven", () => {
		render(
			<StrictMode>
				<Harness source="manual" position={{ x: 220, y: 140 }} />
			</StrictMode>
		);
		layout();
		settle();
		expect(num("a", "x")).toBeGreaterThan(10);
		expect(num("b", "x")).toBeGreaterThan(0);
		expect(liveObservers()).toHaveLength(1);
	});

	it("tears down cleanly after the double-mount", () => {
		const view = render(
			<StrictMode>
				<Harness source="manual" position={{ x: 220, y: 140 }} />
			</StrictMode>
		);
		layout();
		flushFrame();
		const node = inner("a");
		view.unmount();
		expect(frames).toHaveLength(0);
		expect(node.style.getPropertyValue("--ft-mf-x")).toBe("0.00px");
		expect(liveObservers()).toHaveLength(0);
	});
});

describe("MagneticField with a puck", () => {
	it("a held puck drives the field over the pointer, and releases on put-down", () => {
		render(<Harness withPuck puckPosition={{ x: 60, y: 112 }} items={[{ id: "a", label: "A" }]} />);
		layout();
		setVisible(true);
		pointerMove(240, 112); // pointer to the right
		settle();
		expect(num("a", "x")).toBeGreaterThan(0);

		const puck = screen.getByTestId("puck");
		fireEvent.keyDown(puck, { key: " " }); // pick up: puck on the left wins
		settle();
		expect(num("a", "x")).toBeLessThan(0);
		expect(num("a", "r")).toBeGreaterThan(0);

		fireEvent.keyDown(puck, { key: "Escape" }); // put down: back to the pointer
		settle();
		expect(num("a", "x")).toBeGreaterThan(0);
	});
});

// --- MagnetPuck ---------------------------------------------------------------

const puck = () => screen.getByRole("button");

function fakeContext() {
	return {
		register: vi.fn(() => () => {}),
		updateItem: vi.fn(),
		setSource: vi.fn(),
	} satisfies MagneticFieldContext;
}

function renderInField<C extends MagneticFieldContext = ReturnType<typeof fakeContext>>(
	props: MagnetPuckProps = {},
	ctx: C = fakeContext() as unknown as C
) {
	const wrap = (p: MagnetPuckProps) => (
		<MAGNETIC_FIELD_KEY.Provider value={ctx}>
			<MagnetPuck {...p} />
		</MAGNETIC_FIELD_KEY.Provider>
	);
	const result = render(wrap(props));
	return { ...result, ctx, rerenderPuck: (p: MagnetPuckProps) => result.rerender(wrap(p)) };
}

/** jsdom implements neither capture method: stub them on the element. */
function stubCapture(el: HTMLElement) {
	const set = vi.fn();
	const release = vi.fn();
	Object.assign(el, { setPointerCapture: set, releasePointerCapture: release });
	return { set, release };
}

/** Gives the puck's parent a laid-out padding box (jsdom reports 0 × 0). */
function sizeParent(el: HTMLElement, width: number, height: number) {
	const parent = el.parentElement!;
	Object.defineProperty(parent, "clientWidth", { configurable: true, value: width });
	Object.defineProperty(parent, "clientHeight", { configurable: true, value: height });
}

const down = (el: HTMLElement, init: PointerEventInit = {}) =>
	fireEvent.pointerDown(el, {
		pointerId: 1,
		clientX: 100,
		clientY: 100,
		button: 0,
		pointerType: "mouse",
		isPrimary: true,
		...init,
	});
const move = (el: HTMLElement, x: number, y: number, init: PointerEventInit = {}) =>
	fireEvent.pointerMove(el, {
		pointerId: 1,
		clientX: x,
		clientY: y,
		pointerType: "mouse",
		...init,
	});
const up = (el: HTMLElement, init: PointerEventInit = {}) =>
	fireEvent.pointerUp(el, { pointerId: 1, pointerType: "mouse", ...init });

describe("MagnetPuck — markup and ARIA", () => {
	it("is described by a hint naming its keys, unless the consumer supplies a description", () => {
		const { unmount } = render(<MagnetPuck />);
		expect(screen.getByRole("button")).toHaveAccessibleDescription(
			"Space or Enter picks it up and puts it down; the arrow keys move it."
		);
		unmount();
		render(<MagnetPuck aria-describedby="elsewhere" />);
		expect(screen.getByRole("button")).toHaveAttribute("aria-describedby", "elsewhere");
	});

	it("is a focusable toggle button named 'Magnet', centred on its default position", () => {
		render(<MagnetPuck />);
		const el = puck();
		expect(el).toHaveClass("ft-magnet-puck");
		expect(el).toHaveAttribute("tabindex", "0");
		expect(el).toHaveAccessibleName("Magnet");
		expect(el).toHaveAttribute("aria-pressed", "false");
		expect(el).not.toHaveAttribute("data-held");
		expect(el.style.width).toBe("40px");
		expect(el.style.height).toBe("40px");
		// Centre (48, 48) minus half of 40.
		expect(el.style.transform).toBe("translate3d(28px, 28px, 0)");
	});

	it("takes a label, size, position and className, and forwards native attributes", () => {
		render(
			<MagnetPuck
				label="Field source"
				size={64}
				defaultPosition={{ x: 100, y: 50 }}
				className="custom"
				data-testid="puck"
				title="Drag me"
				style={{ opacity: 0.5 }}
			/>
		);
		const el = screen.getByTestId("puck");
		expect(el).toHaveAccessibleName("Field source");
		expect(el).toHaveClass("ft-magnet-puck", "custom");
		expect(el).toHaveAttribute("title", "Drag me");
		expect(el.style.width).toBe("64px");
		expect(el.style.opacity).toBe("0.5");
		expect(el.style.transform).toBe("translate3d(68px, 18px, 0)");
	});

	it("keeps its role and name even if a consumer passes conflicting attributes", () => {
		render(<MagnetPuck {...({ role: "img", "aria-label": "x", tabIndex: -1 } as object)} />);
		const el = puck();
		expect(el).toHaveAccessibleName("Magnet");
		expect(el).toHaveAttribute("tabindex", "0");
	});

	it("renders the default disc, or a custom face from children", () => {
		const { unmount } = render(<MagnetPuck />);
		expect(puck().querySelector(".ft-magnet-puck-face")).not.toBeNull();
		unmount();

		render(
			<MagnetPuck>
				<span data-testid="face">N</span>
			</MagnetPuck>
		);
		expect(screen.getByTestId("face")).toBeInTheDocument();
		expect(puck().querySelector(".ft-magnet-puck-face")).toBeNull();
	});

	it("forwards ref to the puck element", () => {
		const ref = createRef<HTMLDivElement>();
		render(<MagnetPuck ref={ref} />);
		expect(ref.current).toBe(puck());
	});

	it("works outside a MagneticField without throwing", () => {
		render(<MagnetPuck />);
		down(puck());
		move(puck(), 110, 100);
		up(puck());
		expect(puck().style.transform).toBe("translate3d(38px, 28px, 0)");
	});

	it("runs consumer handlers alongside its own", () => {
		const onKeyDown = vi.fn();
		const onPointerDown = vi.fn();
		render(<MagnetPuck onKeyDown={onKeyDown} onPointerDown={onPointerDown} />);
		fireEvent.keyDown(puck(), { key: " " });
		expect(onKeyDown).toHaveBeenCalledTimes(1);
		expect(puck()).toHaveAttribute("aria-pressed", "true");
		down(puck());
		expect(onPointerDown).toHaveBeenCalledTimes(1);
	});
});

describe("MagnetPuck — pointer drag", () => {
	it("captures the pointer, follows the drag by the client delta and releases on pointerup", () => {
		const onPositionChange = vi.fn();
		const onHeldChange = vi.fn();
		render(<MagnetPuck onPositionChange={onPositionChange} onHeldChange={onHeldChange} />);
		const el = puck();
		const capture = stubCapture(el);

		down(el, { pointerId: 7, clientX: 100, clientY: 100 });
		expect(capture.set).toHaveBeenCalledWith(7);
		expect(onHeldChange).toHaveBeenLastCalledWith(true);
		expect(el).toHaveAttribute("aria-pressed", "true");
		expect(el).toHaveAttribute("data-held");

		move(el, 130, 90, { pointerId: 7 });
		expect(onPositionChange).toHaveBeenLastCalledWith({ x: 78, y: 38 });
		expect(el.style.transform).toBe("translate3d(58px, 18px, 0)");

		move(el, 140, 95, { pointerId: 7 });
		expect(onPositionChange).toHaveBeenLastCalledWith({ x: 88, y: 43 });

		up(el, { pointerId: 7 });
		expect(capture.release).toHaveBeenCalledWith(7);
		expect(onHeldChange).toHaveBeenLastCalledWith(false);
		expect(onHeldChange).toHaveBeenCalledTimes(2);
		expect(el).toHaveAttribute("aria-pressed", "false");
		expect(el).not.toHaveAttribute("data-held");

		onPositionChange.mockClear();
		move(el, 200, 200, { pointerId: 7 });
		expect(onPositionChange).not.toHaveBeenCalled();
	});

	it("accepts touch and pen, but not a secondary mouse button", () => {
		const onHeldChange = vi.fn();
		render(<MagnetPuck onHeldChange={onHeldChange} />);
		const el = puck();

		down(el, { button: 2 });
		expect(onHeldChange).not.toHaveBeenCalled();

		down(el, { pointerType: "touch", pointerId: 3 });
		expect(onHeldChange).toHaveBeenLastCalledWith(true);
		up(el, { pointerId: 3 });

		down(el, { pointerType: "pen", pointerId: 4 });
		expect(onHeldChange).toHaveBeenCalledTimes(3);
		up(el, { pointerId: 4 });
	});

	it("ignores a second pointer while one drag is in progress", () => {
		const onPositionChange = vi.fn();
		render(<MagnetPuck onPositionChange={onPositionChange} />);
		const el = puck();

		down(el, { pointerId: 1, clientX: 0, clientY: 0 });
		down(el, { pointerId: 2, clientX: 500, clientY: 500 });
		move(el, 500, 500, { pointerId: 2 });
		expect(onPositionChange).not.toHaveBeenCalled();

		move(el, 10, 0, { pointerId: 1 });
		expect(onPositionChange).toHaveBeenLastCalledWith({ x: 58, y: 48 });
		fireEvent.pointerUp(el, { pointerId: 2 });
		expect(puck()).toHaveAttribute("aria-pressed", "true");
	});

	it("releases on pointercancel and on lostpointercapture", () => {
		const onHeldChange = vi.fn();
		render(<MagnetPuck onHeldChange={onHeldChange} />);
		const el = puck();

		down(el);
		fireEvent.pointerCancel(el, { pointerId: 1 });
		expect(onHeldChange).toHaveBeenLastCalledWith(false);

		down(el);
		fireEvent.lostPointerCapture(el, { pointerId: 1 });
		expect(onHeldChange).toHaveBeenLastCalledWith(false);
		expect(onHeldChange).toHaveBeenCalledTimes(4);
	});

	it("releases when the window loses focus mid-drag", () => {
		const onHeldChange = vi.fn();
		render(<MagnetPuck onHeldChange={onHeldChange} />);
		down(puck());
		act(() => {
			window.dispatchEvent(new Event("blur"));
		});
		expect(onHeldChange).toHaveBeenLastCalledWith(false);
		expect(puck()).toHaveAttribute("aria-pressed", "false");
	});

	it("keeps the whole disc inside its parent's padding box", () => {
		const onPositionChange = vi.fn();
		render(<MagnetPuck onPositionChange={onPositionChange} size={40} />);
		const el = puck();
		sizeParent(el, 200, 100);

		down(el, { clientX: 0, clientY: 0 });
		move(el, 1000, 1000);
		expect(onPositionChange).toHaveBeenLastCalledWith({ x: 180, y: 80 });
		move(el, -1000, -1000);
		expect(onPositionChange).toHaveBeenLastCalledWith({ x: 20, y: 20 });
	});

	it("does not report a move that the clamp swallowed", () => {
		const onPositionChange = vi.fn();
		render(<MagnetPuck onPositionChange={onPositionChange} defaultPosition={{ x: 20, y: 20 }} />);
		const el = puck();
		sizeParent(el, 200, 100);
		down(el, { clientX: 0, clientY: 0 });
		move(el, -30, -30);
		expect(onPositionChange).not.toHaveBeenCalled();
	});
});

describe("MagnetPuck — keyboard", () => {
	it("moves 8 px per arrow and 32 px with Shift, preventing page scroll", () => {
		const onPositionChange = vi.fn();
		render(<MagnetPuck onPositionChange={onPositionChange} />);
		const el = puck();

		expect(fireEvent.keyDown(el, { key: "ArrowRight" })).toBe(false);
		expect(onPositionChange).toHaveBeenLastCalledWith({ x: 56, y: 48 });
		fireEvent.keyDown(el, { key: "ArrowLeft" });
		expect(onPositionChange).toHaveBeenLastCalledWith({ x: 48, y: 48 });
		fireEvent.keyDown(el, { key: "ArrowDown", shiftKey: true });
		expect(onPositionChange).toHaveBeenLastCalledWith({ x: 48, y: 80 });
		fireEvent.keyDown(el, { key: "ArrowUp" });
		expect(onPositionChange).toHaveBeenLastCalledWith({ x: 48, y: 72 });
		expect(el.style.transform).toBe("translate3d(28px, 52px, 0)");
	});

	it("clamps arrow moves to the parent too", () => {
		const onPositionChange = vi.fn();
		render(<MagnetPuck onPositionChange={onPositionChange} defaultPosition={{ x: 24, y: 50 }} />);
		const el = puck();
		sizeParent(el, 300, 100);
		fireEvent.keyDown(el, { key: "ArrowLeft", shiftKey: true });
		expect(onPositionChange).toHaveBeenLastCalledWith({ x: 20, y: 50 });
	});

	it("lets other keys through untouched", () => {
		const onPositionChange = vi.fn();
		render(<MagnetPuck onPositionChange={onPositionChange} />);
		expect(fireEvent.keyDown(puck(), { key: "Tab" })).toBe(true);
		expect(fireEvent.keyDown(puck(), { key: "a" })).toBe(true);
		expect(onPositionChange).not.toHaveBeenCalled();
	});

	it("Space and Enter toggle the hold; Escape and blur put it down", () => {
		const onHeldChange = vi.fn();
		render(<MagnetPuck onHeldChange={onHeldChange} />);
		const el = puck();

		expect(fireEvent.keyDown(el, { key: " " })).toBe(false);
		expect(el).toHaveAttribute("aria-pressed", "true");
		fireEvent.keyDown(el, { key: " ", repeat: true });
		expect(el).toHaveAttribute("aria-pressed", "true");
		fireEvent.keyDown(el, { key: "Enter" });
		expect(el).toHaveAttribute("aria-pressed", "false");

		fireEvent.keyDown(el, { key: "Enter" });
		expect(el).toHaveAttribute("aria-pressed", "true");
		expect(fireEvent.keyDown(el, { key: "Escape" })).toBe(false);
		expect(el).toHaveAttribute("aria-pressed", "false");
		// Escape with nothing held is not swallowed (a dialog around it may want it).
		expect(fireEvent.keyDown(el, { key: "Escape" })).toBe(true);

		fireEvent.keyDown(el, { key: " " });
		fireEvent.blur(el);
		expect(el).toHaveAttribute("aria-pressed", "false");
		expect(onHeldChange.mock.calls.map((c) => c[0])).toEqual([
			true,
			false,
			true,
			false,
			true,
			false,
		]);
	});

	it("blur does not drop a pointer hold", () => {
		render(<MagnetPuck />);
		down(puck());
		fireEvent.blur(puck());
		expect(puck()).toHaveAttribute("aria-pressed", "true");
	});
});

describe("MagnetPuck — controlled position", () => {
	it("follows a new position from the parent", () => {
		const { rerender } = render(<MagnetPuck position={{ x: 10, y: 10 }} />);
		expect(puck().style.transform).toBe("translate3d(-10px, -10px, 0)");
		rerender(<MagnetPuck position={{ x: 120, y: 60 }} />);
		expect(puck().style.transform).toBe("translate3d(100px, 40px, 0)");
	});

	it("only reports a move while controlled, and moves once the parent writes it back", () => {
		const onPositionChange = vi.fn();
		const { rerender } = render(
			<MagnetPuck position={{ x: 48, y: 48 }} onPositionChange={onPositionChange} />
		);
		fireEvent.keyDown(puck(), { key: "ArrowRight" });
		expect(onPositionChange).toHaveBeenLastCalledWith({ x: 56, y: 48 });
		expect(puck().style.transform).toBe("translate3d(28px, 28px, 0)");
		rerender(<MagnetPuck position={{ x: 56, y: 48 }} onPositionChange={onPositionChange} />);
		expect(puck().style.transform).toBe("translate3d(36px, 28px, 0)");
	});

	it("drives a manual field when lifted into the parent's state", () => {
		function Controlled({ children }: { children?: ReactNode }) {
			const [p, setP] = useState<MagneticPoint>({ x: 48, y: 48 });
			return (
				<>
					<MagnetPuck position={p} onPositionChange={setP} />
					<output data-testid="out">{`${p.x},${p.y}`}</output>
					{children}
				</>
			);
		}
		render(<Controlled />);
		fireEvent.keyDown(puck(), { key: "ArrowDown", shiftKey: true });
		expect(screen.getByTestId("out")).toHaveTextContent("48,80");
		expect(puck().style.transform).toBe("translate3d(28px, 60px, 0)");
	});
});

describe("MagnetPuck — inside a MagneticField", () => {
	it("feeds the puck channel only while held", () => {
		const { ctx } = renderInField();
		expect(ctx.setSource).toHaveBeenLastCalledWith(null, "puck");

		down(puck(), { clientX: 0, clientY: 0 });
		expect(ctx.setSource).toHaveBeenLastCalledWith({ x: 48, y: 48 }, "puck");

		move(puck(), 20, 10);
		expect(ctx.setSource).toHaveBeenLastCalledWith({ x: 68, y: 58 }, "puck");

		up(puck());
		expect(ctx.setSource).toHaveBeenLastCalledWith(null, "puck");

		for (const call of ctx.setSource.mock.calls) expect(call[1]).toBe("puck");
	});

	it("never blinks the channel to null between two positions of one drag", () => {
		const { ctx } = renderInField();
		down(puck(), { clientX: 0, clientY: 0 });
		ctx.setSource.mockClear();
		move(puck(), 5, 0);
		move(puck(), 10, 0);
		expect(ctx.setSource.mock.calls.map((c) => c[0])).toEqual([
			{ x: 53, y: 48 },
			{ x: 58, y: 48 },
		]);
	});

	it("drives the field from the keyboard: pick up, move, put down", () => {
		const { ctx } = renderInField();
		fireEvent.keyDown(puck(), { key: "ArrowRight" });
		expect(ctx.setSource).toHaveBeenLastCalledWith(null, "puck");

		fireEvent.keyDown(puck(), { key: "Enter" });
		expect(ctx.setSource).toHaveBeenLastCalledWith({ x: 56, y: 48 }, "puck");
		fireEvent.keyDown(puck(), { key: "ArrowDown" });
		expect(ctx.setSource).toHaveBeenLastCalledWith({ x: 56, y: 56 }, "puck");
		fireEvent.keyDown(puck(), { key: "Enter" });
		expect(ctx.setSource).toHaveBeenLastCalledWith(null, "puck");
	});

	it("keeps attracting after release when sticky, and stops when sticky turns off", () => {
		const { ctx, rerenderPuck } = renderInField({ sticky: true });
		expect(ctx.setSource).toHaveBeenLastCalledWith({ x: 48, y: 48 }, "puck");

		down(puck(), { clientX: 0, clientY: 0 });
		move(puck(), 10, 0);
		up(puck());
		expect(ctx.setSource).toHaveBeenLastCalledWith({ x: 58, y: 48 }, "puck");

		rerenderPuck({ sticky: false });
		expect(ctx.setSource).toHaveBeenLastCalledWith(null, "puck");
	});

	it("passes plain objects, never the consumer's position", () => {
		const position = { x: 30, y: 40 };
		const { ctx } = renderInField({ sticky: true, position });
		const point = ctx.setSource.mock.calls.at(-1)![0];
		expect(point).toEqual({ x: 30, y: 40 });
		expect(point).not.toBe(position);
		expect(Object.getPrototypeOf(point)).toBe(Object.prototype);
	});

	it("lets the items go when a held puck unmounts", () => {
		const { ctx, unmount } = renderInField();
		down(puck());
		expect(ctx.setSource).toHaveBeenLastCalledWith({ x: 48, y: 48 }, "puck");
		unmount();
		expect(ctx.setSource).toHaveBeenLastCalledWith(null, "puck");
	});

	it("keeps a sticky puck's channel after the StrictMode double-mount", () => {
		const ctx = fakeContext();
		render(
			<StrictMode>
				<MAGNETIC_FIELD_KEY.Provider value={ctx}>
					<MagnetPuck sticky />
				</MAGNETIC_FIELD_KEY.Provider>
			</StrictMode>
		);
		expect(ctx.setSource).toHaveBeenLastCalledWith({ x: 48, y: 48 }, "puck");
	});

	it("reaches the core through the real hub on the puck channel", () => {
		const core = {
			setSource: vi.fn(),
			setClientSource: vi.fn(),
			clearSource: vi.fn(),
			register: vi.fn(() => () => {}),
			updateItem: vi.fn(),
			update: vi.fn(),
			invalidate: vi.fn(),
			active: false,
			destroy: vi.fn(),
		} satisfies MagneticFieldCore;
		const hub = createMagneticFieldHub();
		hub.attach(core);
		renderInField({}, hub);

		down(puck(), { clientX: 0, clientY: 0 });
		move(puck(), 12, -8);
		expect(core.setSource).toHaveBeenLastCalledWith({ x: 60, y: 40 }, "puck");
		up(puck());
		expect(core.setSource).toHaveBeenLastCalledWith(null, "puck");
	});
});
