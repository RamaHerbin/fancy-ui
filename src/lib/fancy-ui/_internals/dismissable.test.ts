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
		dismissable(node, { onDismiss });

		pressEscape();

		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it("does not call onDismiss on Escape when escape is false", () => {
		const onDismiss = vi.fn();
		setup();
		dismissable(node, { onDismiss, escape: false });

		pressEscape();

		expect(onDismiss).not.toHaveBeenCalled();
	});

	it("calls onDismiss on pointerdown outside the node by default", () => {
		const onDismiss = vi.fn();
		setup();
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		dismissable(node, { onDismiss });

		pointerDownOn(outside);

		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it("does not call onDismiss on pointerdown inside the node", () => {
		const onDismiss = vi.fn();
		setup();
		dismissable(node, { onDismiss });

		pointerDownOn(node.querySelector<HTMLElement>("#inner")!);

		expect(onDismiss).not.toHaveBeenCalled();
	});

	it("does not call onDismiss on outside pointerdown when outsideClick is false", () => {
		const onDismiss = vi.fn();
		setup();
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		dismissable(node, { onDismiss, outsideClick: false });

		pointerDownOn(outside);

		expect(onDismiss).not.toHaveBeenCalled();
	});

	it("does not call onDismiss on pointerdown on an excluded element", () => {
		const onDismiss = vi.fn();
		setup();
		const trigger = document.createElement("button");
		trigger.id = "trigger";
		document.body.appendChild(trigger);
		dismissable(node, { onDismiss, exclude: () => [trigger] });

		pointerDownOn(trigger);

		expect(onDismiss).not.toHaveBeenCalled();
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
