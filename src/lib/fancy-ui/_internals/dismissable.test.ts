import { afterEach, describe, it, expect, vi } from "vitest";
import { dismissable } from "./dismissable";

function pressEscape() {
	document.dispatchEvent(
		new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
	);
}

function pointerDownOn(target: HTMLElement) {
	target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
}

describe("dismissable", () => {
	let node: HTMLElement;

	afterEach(() => {
		document.body.innerHTML = "";
	});

	function setup() {
		node = document.createElement("div");
		node.id = "node";
		node.innerHTML = `<button id="inner">Inner</button>`;
		document.body.appendChild(node);
		return node;
	}

	it("calls onDismiss on Escape by default", () => {
		const onDismiss = vi.fn();
		setup();
		const action = dismissable(node, { onDismiss });

		pressEscape();

		expect(onDismiss).toHaveBeenCalledTimes(1);
		action?.destroy?.();
	});

	it("does not call onDismiss on Escape when escape is false", () => {
		const onDismiss = vi.fn();
		setup();
		const action = dismissable(node, { onDismiss, escape: false });

		pressEscape();

		expect(onDismiss).not.toHaveBeenCalled();
		action?.destroy?.();
	});

	it("calls onDismiss on pointerdown outside the node by default", () => {
		const onDismiss = vi.fn();
		setup();
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		const action = dismissable(node, { onDismiss });

		pointerDownOn(outside);

		expect(onDismiss).toHaveBeenCalledTimes(1);
		action?.destroy?.();
	});

	it("does not call onDismiss on pointerdown inside the node", () => {
		const onDismiss = vi.fn();
		setup();
		const action = dismissable(node, { onDismiss });

		pointerDownOn(node.querySelector<HTMLElement>("#inner")!);

		expect(onDismiss).not.toHaveBeenCalled();
		action?.destroy?.();
	});

	it("does not call onDismiss on outside pointerdown when outsideClick is false", () => {
		const onDismiss = vi.fn();
		setup();
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		const action = dismissable(node, { onDismiss, outsideClick: false });

		pointerDownOn(outside);

		expect(onDismiss).not.toHaveBeenCalled();
		action?.destroy?.();
	});

	it("does not call onDismiss on pointerdown on an excluded element", () => {
		const onDismiss = vi.fn();
		setup();
		const trigger = document.createElement("button");
		trigger.id = "trigger";
		document.body.appendChild(trigger);
		const action = dismissable(node, { onDismiss, exclude: () => [trigger] });

		pointerDownOn(trigger);

		expect(onDismiss).not.toHaveBeenCalled();
		action?.destroy?.();
	});

	it("removes listeners on destroy", () => {
		const onDismiss = vi.fn();
		setup();
		const action = dismissable(node, { onDismiss });

		action?.destroy?.();
		pressEscape();
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		pointerDownOn(outside);

		expect(onDismiss).not.toHaveBeenCalled();
	});

	it("uses updated options after update()", () => {
		const onDismiss = vi.fn();
		const onDismissUpdated = vi.fn();
		setup();
		const action = dismissable(node, { onDismiss });

		action?.update?.({ onDismiss: onDismissUpdated });
		pressEscape();

		expect(onDismiss).not.toHaveBeenCalled();
		expect(onDismissUpdated).toHaveBeenCalledTimes(1);
		action?.destroy?.();
	});
});

describe("dismissable — stacked layers", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("Escape dismisses only the top-most layer", () => {
		const bottom = document.createElement("div");
		const top = document.createElement("div");
		document.body.append(bottom, top);
		const onBottom = vi.fn();
		const onTop = vi.fn();
		const a = dismissable(bottom, { onDismiss: onBottom });
		const b = dismissable(top, { onDismiss: onTop });

		pressEscape();
		expect(onTop).toHaveBeenCalledTimes(1);
		expect(onBottom).not.toHaveBeenCalled();

		// Once the top layer is gone, Escape reaches the next layer.
		b?.destroy?.();
		pressEscape();
		expect(onBottom).toHaveBeenCalledTimes(1);
		a?.destroy?.();
	});

	it("outside pointerdown dismisses only the top-most layer", () => {
		const bottom = document.createElement("div");
		const top = document.createElement("div");
		const outside = document.createElement("div");
		document.body.append(bottom, top, outside);
		const onBottom = vi.fn();
		const onTop = vi.fn();
		const a = dismissable(bottom, { onDismiss: onBottom });
		const b = dismissable(top, { onDismiss: onTop });

		pointerDownOn(outside);
		expect(onTop).toHaveBeenCalledTimes(1);
		expect(onBottom).not.toHaveBeenCalled();
		b?.destroy?.();
		a?.destroy?.();
	});
});

// `active` is what makes an ANIMATED close safe. A panel that is fading out
// still holds its layer — its `destroy()` is delayed by the outro — so
// without a liveness signal it would keep swallowing Escape for the whole
// fade. It is a getter, not a boolean, because an action's `update()` never
// runs again once its owning branch starts closing.
describe("dismissable — the active gate", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	function layer(active?: () => boolean) {
		const node = document.createElement("div");
		document.body.appendChild(node);
		const onDismiss = vi.fn();
		const action = dismissable(node, { onDismiss, active });
		return { node, onDismiss, action };
	}

	it("an inactive layer ignores Escape — and does not swallow it on the way past", () => {
		const { onDismiss, action } = layer(() => false);
		const stopped = vi.fn();

		const event = new KeyboardEvent("keydown", {
			key: "Escape",
			bubbles: true,
			cancelable: true,
		});
		event.stopImmediatePropagation = stopped;
		document.dispatchEvent(event);

		expect(onDismiss).not.toHaveBeenCalled();
		// The guard runs BEFORE stopImmediatePropagation, deliberately: a
		// layer on its way out must let the key through to whatever is
		// underneath rather than eating it.
		expect(stopped).not.toHaveBeenCalled();
		action?.destroy?.();
	});

	it("Escape falls through an inactive top layer to the live one beneath it", () => {
		const bottom = layer();
		const top = layer(() => false);

		pressEscape();

		expect(bottom.onDismiss).toHaveBeenCalledTimes(1);
		expect(top.onDismiss).not.toHaveBeenCalled();
		top.action?.destroy?.();
		bottom.action?.destroy?.();
	});

	it("an outside pointerdown falls through an inactive top layer the same way", () => {
		const bottom = layer();
		const top = layer(() => false);
		const outside = document.createElement("div");
		document.body.appendChild(outside);

		pointerDownOn(outside);

		expect(bottom.onDismiss).toHaveBeenCalledTimes(1);
		expect(top.onDismiss).not.toHaveBeenCalled();
		top.action?.destroy?.();
		bottom.action?.destroy?.();
	});

	it("reads the getter fresh on every event, so a layer going inactive stops answering", () => {
		let live = true;
		const { onDismiss, action } = layer(() => live);

		pressEscape();
		expect(onDismiss).toHaveBeenCalledTimes(1);

		// The close instant: `open` flips, the action is never updated again
		// (its branch is inert), and the captured getter is what notices.
		live = false;
		pressEscape();
		pressEscape();
		expect(onDismiss).toHaveBeenCalledTimes(1);

		action?.destroy?.();
	});

	it("update() swaps active in place: active → inactive → active behaves at each step", () => {
		const node = document.createElement("div");
		document.body.appendChild(node);
		const onDismiss = vi.fn();
		const action = dismissable(node, { onDismiss });

		pressEscape();
		expect(onDismiss).toHaveBeenCalledTimes(1);

		action?.update?.({ onDismiss, active: () => false });
		pressEscape();
		expect(onDismiss).toHaveBeenCalledTimes(1);

		action?.update?.({ onDismiss, active: () => true });
		pressEscape();
		expect(onDismiss).toHaveBeenCalledTimes(2);

		action?.destroy?.();
	});

	it("omitting active is byte-identical to always-active, at the top and underneath", () => {
		const bottom = layer();
		const top = layer();

		pressEscape();
		expect(top.onDismiss).toHaveBeenCalledTimes(1);
		expect(bottom.onDismiss).not.toHaveBeenCalled();

		top.action?.destroy?.();
		pressEscape();
		expect(bottom.onDismiss).toHaveBeenCalledTimes(1);
		bottom.action?.destroy?.();
	});

	it("an inactive layer is not top even when every layer above it is gone", () => {
		const { onDismiss, action } = layer(() => false);
		const outside = document.createElement("div");
		document.body.appendChild(outside);

		pressEscape();
		pointerDownOn(outside);

		expect(onDismiss).not.toHaveBeenCalled();
		action?.destroy?.();
	});
});
