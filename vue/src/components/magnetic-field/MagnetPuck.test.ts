import { cleanup, fireEvent, render, screen } from "@testing-library/vue";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import MagnetPuck from "./MagnetPuck.vue";
import { createMagneticFieldHub, type MagneticFieldCore } from "./magnetic-field-core.js";
import { MAGNETIC_FIELD_KEY, type MagneticFieldContext } from "./types.js";

/** See MagneticField.test.ts: this package's jsdom ships no `PointerEvent`. */
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

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

const puck = () => screen.getByRole("button");

function fakeContext() {
	return {
		register: vi.fn(() => () => {}),
		updateItem: vi.fn(),
		setSource: vi.fn(),
	} satisfies MagneticFieldContext;
}

function renderInField<C extends MagneticFieldContext = ReturnType<typeof fakeContext>>(
	props: Record<string, unknown> = {},
	ctx: C = fakeContext() as unknown as C
) {
	const result = render(MagnetPuck, {
		props,
		global: { provide: { [MAGNETIC_FIELD_KEY.key as symbol]: ctx } },
	});
	return { ...result, ctx };
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
		const { unmount } = renderInField();
		expect(puck()).toHaveAccessibleDescription(
			"Space or Enter picks it up and puts it down; the arrow keys move it."
		);
		unmount();
		renderInField({ "aria-describedby": "elsewhere" });
		expect(puck()).toHaveAttribute("aria-describedby", "elsewhere");
	});

	it("is a focusable toggle button named 'Magnet', centred on its default position", () => {
		render(MagnetPuck);
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

	it("takes a label, size, position and class, and forwards native attributes", () => {
		render(MagnetPuck, {
			props: { label: "Field source", size: 64, position: { x: 100, y: 50 }, class: "custom" },
			attrs: { "data-testid": "puck", title: "Drag me" },
		});
		const el = screen.getByTestId("puck");
		expect(el).toHaveAccessibleName("Field source");
		expect(el).toHaveClass("ft-magnet-puck", "custom");
		expect(el).toHaveAttribute("title", "Drag me");
		expect(el.style.width).toBe("64px");
		expect(el.style.transform).toBe("translate3d(68px, 18px, 0)");
	});

	it("keeps its role and name even if a consumer passes conflicting attributes", () => {
		render(MagnetPuck, { attrs: { role: "img", "aria-label": "x", tabindex: -1 } });
		const el = puck();
		expect(el).toHaveAccessibleName("Magnet");
		expect(el).toHaveAttribute("tabindex", "0");
	});

	it("runs a consumer listener alongside its own", async () => {
		const onKeydown = vi.fn();
		const onHeldChange = vi.fn();
		render(MagnetPuck, { props: { onHeldChange }, attrs: { onKeydown } });
		await fireEvent.keyDown(puck(), { key: " " });
		expect(onHeldChange).toHaveBeenCalledWith(true);
		expect(onKeydown).toHaveBeenCalledTimes(1);
	});

	it("renders the default disc, or a custom face from the default slot", () => {
		const { unmount } = render(MagnetPuck);
		expect(puck().querySelector(".ft-magnet-puck-face")).not.toBeNull();
		unmount();

		render(MagnetPuck, { slots: { default: '<span data-testid="face">N</span>' } });
		expect(screen.getByTestId("face")).toBeInTheDocument();
		expect(puck().querySelector(".ft-magnet-puck-face")).toBeNull();
	});

	it("exposes ref as the puck element", () => {
		const wrapper = mount(MagnetPuck);
		expect((wrapper.vm as unknown as { ref: HTMLElement }).ref).toBe(wrapper.element);
		wrapper.unmount();
	});

	it("works outside a MagneticField without throwing", async () => {
		render(MagnetPuck);
		await down(puck());
		await move(puck(), 110, 100);
		await up(puck());
		expect(puck().style.transform).toBe("translate3d(38px, 28px, 0)");
	});
});

describe("MagnetPuck — pointer drag", () => {
	it("captures the pointer, follows the drag by the client delta and releases on pointerup", async () => {
		const onPositionChange = vi.fn();
		const onHeldChange = vi.fn();
		render(MagnetPuck, { props: { onPositionChange, onHeldChange } });
		const el = puck();
		const capture = stubCapture(el);

		await down(el, { pointerId: 7, clientX: 100, clientY: 100 });
		expect(capture.set).toHaveBeenCalledWith(7);
		expect(onHeldChange).toHaveBeenLastCalledWith(true);
		expect(el).toHaveAttribute("aria-pressed", "true");
		expect(el).toHaveAttribute("data-held");

		await move(el, 130, 90, { pointerId: 7 });
		expect(onPositionChange).toHaveBeenLastCalledWith({ x: 78, y: 38 });
		expect(el.style.transform).toBe("translate3d(58px, 18px, 0)");

		await move(el, 140, 95, { pointerId: 7 });
		expect(onPositionChange).toHaveBeenLastCalledWith({ x: 88, y: 43 });

		await up(el, { pointerId: 7 });
		expect(capture.release).toHaveBeenCalledWith(7);
		expect(onHeldChange).toHaveBeenLastCalledWith(false);
		expect(onHeldChange).toHaveBeenCalledTimes(2);
		expect(el).toHaveAttribute("aria-pressed", "false");
		expect(el).not.toHaveAttribute("data-held");

		onPositionChange.mockClear();
		await move(el, 200, 200, { pointerId: 7 });
		expect(onPositionChange).not.toHaveBeenCalled();
	});

	it("writes the position model on drag (v-model:position)", async () => {
		const wrapper = mount(MagnetPuck, {
			props: {
				position: { x: 10, y: 10 },
				"onUpdate:position": (p: { x: number; y: number }) => wrapper.setProps({ position: p }),
			},
		});
		const el = wrapper.element as HTMLElement;
		await fireEvent.pointerDown(el, { pointerId: 1, clientX: 0, clientY: 0, pointerType: "mouse" });
		await fireEvent.pointerMove(el, { pointerId: 1, clientX: 5, clientY: 7, pointerType: "mouse" });
		expect(wrapper.emitted("update:position")?.at(-1)).toEqual([{ x: 15, y: 17 }]);
		await nextTick();
		expect(el.style.transform).toBe("translate3d(-5px, -3px, 0)");
		wrapper.unmount();
	});

	it("accepts touch and pen, but not a secondary mouse button", async () => {
		const onHeldChange = vi.fn();
		render(MagnetPuck, { props: { onHeldChange } });
		const el = puck();

		await down(el, { button: 2 });
		expect(onHeldChange).not.toHaveBeenCalled();

		await down(el, { pointerType: "touch", pointerId: 3 });
		expect(onHeldChange).toHaveBeenLastCalledWith(true);
		await up(el, { pointerId: 3 });

		await down(el, { pointerType: "pen", pointerId: 4 });
		expect(onHeldChange).toHaveBeenCalledTimes(3);
		await up(el, { pointerId: 4 });
	});

	it("ignores a second pointer while one drag is in progress", async () => {
		const onPositionChange = vi.fn();
		render(MagnetPuck, { props: { onPositionChange } });
		const el = puck();

		await down(el, { pointerId: 1, clientX: 0, clientY: 0 });
		await down(el, { pointerId: 2, clientX: 500, clientY: 500 });
		await move(el, 500, 500, { pointerId: 2 });
		expect(onPositionChange).not.toHaveBeenCalled();

		await move(el, 10, 0, { pointerId: 1 });
		expect(onPositionChange).toHaveBeenLastCalledWith({ x: 58, y: 48 });
		await fireEvent.pointerUp(el, { pointerId: 2 });
		expect(puck()).toHaveAttribute("aria-pressed", "true");
	});

	it("releases on pointercancel and on lostpointercapture", async () => {
		const onHeldChange = vi.fn();
		render(MagnetPuck, { props: { onHeldChange } });
		const el = puck();

		await down(el);
		await fireEvent.pointerCancel(el, { pointerId: 1 });
		expect(onHeldChange).toHaveBeenLastCalledWith(false);

		await down(el);
		await fireEvent(el, new PointerEvent("lostpointercapture", { pointerId: 1 }));
		expect(onHeldChange).toHaveBeenLastCalledWith(false);
		expect(onHeldChange).toHaveBeenCalledTimes(4);
	});

	it("releases when the window loses focus mid-drag", async () => {
		const onHeldChange = vi.fn();
		render(MagnetPuck, { props: { onHeldChange } });
		await down(puck());
		window.dispatchEvent(new Event("blur"));
		await nextTick();
		expect(onHeldChange).toHaveBeenLastCalledWith(false);
		expect(puck()).toHaveAttribute("aria-pressed", "false");
	});

	it("keeps the whole disc inside its parent's padding box", async () => {
		const onPositionChange = vi.fn();
		render(MagnetPuck, { props: { onPositionChange, size: 40 } });
		const el = puck();
		sizeParent(el, 200, 100);

		await down(el, { clientX: 0, clientY: 0 });
		await move(el, 1000, 1000);
		expect(onPositionChange).toHaveBeenLastCalledWith({ x: 180, y: 80 });
		await move(el, -1000, -1000);
		expect(onPositionChange).toHaveBeenLastCalledWith({ x: 20, y: 20 });
	});

	it("does not report a move that the clamp swallowed", async () => {
		const onPositionChange = vi.fn();
		render(MagnetPuck, { props: { onPositionChange, position: { x: 20, y: 20 } } });
		const el = puck();
		sizeParent(el, 200, 100);
		await down(el, { clientX: 0, clientY: 0 });
		await move(el, -30, -30);
		expect(onPositionChange).not.toHaveBeenCalled();
	});
});

describe("MagnetPuck — keyboard", () => {
	it("moves 8 px per arrow and 32 px with Shift, preventing page scroll", async () => {
		const onPositionChange = vi.fn();
		render(MagnetPuck, { props: { onPositionChange } });
		const el = puck();

		const notPrevented = el.dispatchEvent(
			new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true })
		);
		expect(notPrevented).toBe(false);
		await nextTick();
		expect(onPositionChange).toHaveBeenLastCalledWith({ x: 56, y: 48 });
		await fireEvent.keyDown(el, { key: "ArrowLeft" });
		expect(onPositionChange).toHaveBeenLastCalledWith({ x: 48, y: 48 });
		await fireEvent.keyDown(el, { key: "ArrowDown", shiftKey: true });
		expect(onPositionChange).toHaveBeenLastCalledWith({ x: 48, y: 80 });
		await fireEvent.keyDown(el, { key: "ArrowUp" });
		expect(onPositionChange).toHaveBeenLastCalledWith({ x: 48, y: 72 });
		expect(el.style.transform).toBe("translate3d(28px, 52px, 0)");
	});

	it("clamps arrow moves to the parent too", async () => {
		const onPositionChange = vi.fn();
		render(MagnetPuck, { props: { onPositionChange, position: { x: 24, y: 50 } } });
		const el = puck();
		sizeParent(el, 300, 100);
		await fireEvent.keyDown(el, { key: "ArrowLeft", shiftKey: true });
		expect(onPositionChange).toHaveBeenLastCalledWith({ x: 20, y: 50 });
	});

	it("lets other keys through untouched", () => {
		const onPositionChange = vi.fn();
		render(MagnetPuck, { props: { onPositionChange } });
		const key = (k: string) =>
			puck().dispatchEvent(
				new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true })
			);
		expect(key("Tab")).toBe(true);
		expect(key("a")).toBe(true);
		expect(onPositionChange).not.toHaveBeenCalled();
	});

	it("Space and Enter toggle the hold; Escape and blur put it down", async () => {
		const onHeldChange = vi.fn();
		render(MagnetPuck, { props: { onHeldChange } });
		const el = puck();
		const key = (k: string, init: KeyboardEventInit = {}) =>
			el.dispatchEvent(
				new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...init })
			);

		expect(key(" ")).toBe(false);
		await nextTick();
		expect(el).toHaveAttribute("aria-pressed", "true");
		key(" ", { repeat: true });
		await nextTick();
		expect(el).toHaveAttribute("aria-pressed", "true");
		key("Enter");
		await nextTick();
		expect(el).toHaveAttribute("aria-pressed", "false");

		key("Enter");
		await nextTick();
		expect(el).toHaveAttribute("aria-pressed", "true");
		expect(key("Escape")).toBe(false);
		await nextTick();
		expect(el).toHaveAttribute("aria-pressed", "false");
		// Escape with nothing held is not swallowed (a dialog around it may want it).
		expect(key("Escape")).toBe(true);

		key(" ");
		await fireEvent.blur(el);
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

	it("blur does not drop a pointer hold", async () => {
		render(MagnetPuck);
		await down(puck());
		await fireEvent.blur(puck());
		expect(puck()).toHaveAttribute("aria-pressed", "true");
	});
});

describe("MagnetPuck — controlled position", () => {
	it("follows a new position from the parent", async () => {
		const { rerender } = render(MagnetPuck, { props: { position: { x: 10, y: 10 } } });
		expect(puck().style.transform).toBe("translate3d(-10px, -10px, 0)");
		await rerender({ position: { x: 120, y: 60 } });
		expect(puck().style.transform).toBe("translate3d(100px, 40px, 0)");
	});
});

describe("MagnetPuck — inside a MagneticField", () => {
	it("feeds the puck channel only while held", async () => {
		const { ctx } = renderInField();
		await nextTick();
		expect(ctx.setSource).toHaveBeenLastCalledWith(null, "puck");

		await down(puck(), { clientX: 0, clientY: 0 });
		expect(ctx.setSource).toHaveBeenLastCalledWith({ x: 48, y: 48 }, "puck");

		await move(puck(), 20, 10);
		expect(ctx.setSource).toHaveBeenLastCalledWith({ x: 68, y: 58 }, "puck");

		await up(puck());
		expect(ctx.setSource).toHaveBeenLastCalledWith(null, "puck");

		for (const call of ctx.setSource.mock.calls) expect(call[1]).toBe("puck");
	});

	it("never blinks the channel to null between two positions of one drag", async () => {
		const { ctx } = renderInField();
		await down(puck(), { clientX: 0, clientY: 0 });
		ctx.setSource.mockClear();
		await move(puck(), 5, 0);
		await move(puck(), 10, 0);
		expect(ctx.setSource.mock.calls.map((c) => c[0])).toEqual([
			{ x: 53, y: 48 },
			{ x: 58, y: 48 },
		]);
	});

	it("drives the field from the keyboard: pick up, move, put down", async () => {
		const { ctx } = renderInField();
		await fireEvent.keyDown(puck(), { key: "ArrowRight" });
		expect(ctx.setSource).toHaveBeenLastCalledWith(null, "puck");

		await fireEvent.keyDown(puck(), { key: "Enter" });
		expect(ctx.setSource).toHaveBeenLastCalledWith({ x: 56, y: 48 }, "puck");
		await fireEvent.keyDown(puck(), { key: "ArrowDown" });
		expect(ctx.setSource).toHaveBeenLastCalledWith({ x: 56, y: 56 }, "puck");
		await fireEvent.keyDown(puck(), { key: "Enter" });
		expect(ctx.setSource).toHaveBeenLastCalledWith(null, "puck");
	});

	it("keeps attracting after release when sticky, and stops when sticky turns off", async () => {
		const { ctx, rerender } = renderInField({ sticky: true });
		await nextTick();
		expect(ctx.setSource).toHaveBeenLastCalledWith({ x: 48, y: 48 }, "puck");

		await down(puck(), { clientX: 0, clientY: 0 });
		await move(puck(), 10, 0);
		await up(puck());
		expect(ctx.setSource).toHaveBeenLastCalledWith({ x: 58, y: 48 }, "puck");

		await rerender({ sticky: false });
		expect(ctx.setSource).toHaveBeenLastCalledWith(null, "puck");
	});

	it("passes plain objects, never the reactive position", async () => {
		const { ctx } = renderInField({ sticky: true });
		await nextTick();
		const point = ctx.setSource.mock.calls.at(-1)![0];
		expect(() => structuredClone(point)).not.toThrow();
		expect(Object.getPrototypeOf(point)).toBe(Object.prototype);
	});

	it("lets the items go when a held puck unmounts", async () => {
		const { ctx, unmount } = renderInField();
		await down(puck());
		expect(ctx.setSource).toHaveBeenLastCalledWith({ x: 48, y: 48 }, "puck");
		unmount();
		expect(ctx.setSource).toHaveBeenLastCalledWith(null, "puck");
	});

	it("reaches the core through the real hub on the puck channel", async () => {
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

		await down(puck(), { clientX: 0, clientY: 0 });
		await move(puck(), 12, -8);
		expect(core.setSource).toHaveBeenLastCalledWith({ x: 60, y: 40 }, "puck");
		await up(puck());
		expect(core.setSource).toHaveBeenLastCalledWith(null, "puck");
	});
});
