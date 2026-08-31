import { StrictMode, useRef } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { __dismissableLayerCount, attachDismissable, useDismissable } from "./dismissable.js";
import type { DismissableOptions } from "./dismissable.js";
import { useElementRef } from "./dom/use-element-ref.js";

function pressEscape() {
	document.dispatchEvent(
		new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
	);
}

function pointerDownOn(target: HTMLElement) {
	const init = { bubbles: true, cancelable: true };
	// The jsdom version this package pins does not implement `PointerEvent`.
	// A `MouseEvent` of the same type carries everything the handler reads
	// (`type` and `target`), so the assertions are unaffected.
	const event =
		typeof PointerEvent === "undefined"
			? new MouseEvent("pointerdown", init)
			: new PointerEvent("pointerdown", init);
	target.dispatchEvent(event);
}

describe("attachDismissable", () => {
	let node: HTMLElement;

	afterEach(() => {
		document.body.innerHTML = "";
		expect(__dismissableLayerCount()).toBe(0);
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
		const handle = attachDismissable(node, { onDismiss });

		pressEscape();

		expect(onDismiss).toHaveBeenCalledTimes(1);
		handle.destroy();
	});

	it("does not call onDismiss on Escape when escape is false", () => {
		const onDismiss = vi.fn();
		setup();
		const handle = attachDismissable(node, { onDismiss, escape: false });

		pressEscape();

		expect(onDismiss).not.toHaveBeenCalled();
		handle.destroy();
	});

	it("calls onDismiss on pointerdown outside the node by default", () => {
		const onDismiss = vi.fn();
		setup();
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		const handle = attachDismissable(node, { onDismiss });

		pointerDownOn(outside);

		expect(onDismiss).toHaveBeenCalledTimes(1);
		handle.destroy();
	});

	it("does not call onDismiss on pointerdown inside the node", () => {
		const onDismiss = vi.fn();
		setup();
		const handle = attachDismissable(node, { onDismiss });

		pointerDownOn(node.querySelector<HTMLElement>("#inner")!);

		expect(onDismiss).not.toHaveBeenCalled();
		handle.destroy();
	});

	it("does not call onDismiss on outside pointerdown when outsideClick is false", () => {
		const onDismiss = vi.fn();
		setup();
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		const handle = attachDismissable(node, { onDismiss, outsideClick: false });

		pointerDownOn(outside);

		expect(onDismiss).not.toHaveBeenCalled();
		handle.destroy();
	});

	it("does not call onDismiss on pointerdown on an excluded element", () => {
		const onDismiss = vi.fn();
		setup();
		const trigger = document.createElement("button");
		trigger.id = "trigger";
		document.body.appendChild(trigger);
		const handle = attachDismissable(node, { onDismiss, exclude: () => [trigger] });

		pointerDownOn(trigger);

		expect(onDismiss).not.toHaveBeenCalled();
		handle.destroy();
	});

	it("removes listeners on destroy", () => {
		const onDismiss = vi.fn();
		setup();
		const handle = attachDismissable(node, { onDismiss });

		handle.destroy();
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
		const handle = attachDismissable(node, { onDismiss });

		handle.update({ onDismiss: onDismissUpdated });
		pressEscape();

		expect(onDismiss).not.toHaveBeenCalled();
		expect(onDismissUpdated).toHaveBeenCalledTimes(1);
		handle.destroy();
	});
});

describe("attachDismissable — stacked layers", () => {
	afterEach(() => {
		document.body.innerHTML = "";
		expect(__dismissableLayerCount()).toBe(0);
	});

	it("Escape dismisses only the top-most layer", () => {
		const bottom = document.createElement("div");
		const top = document.createElement("div");
		document.body.append(bottom, top);
		const onBottom = vi.fn();
		const onTop = vi.fn();
		const a = attachDismissable(bottom, { onDismiss: onBottom });
		const b = attachDismissable(top, { onDismiss: onTop });

		pressEscape();
		expect(onTop).toHaveBeenCalledTimes(1);
		expect(onBottom).not.toHaveBeenCalled();

		// Once the top layer is gone, Escape reaches the next layer.
		b.destroy();
		pressEscape();
		expect(onBottom).toHaveBeenCalledTimes(1);
		a.destroy();
	});

	it("outside pointerdown dismisses only the top-most layer", () => {
		const bottom = document.createElement("div");
		const top = document.createElement("div");
		const outside = document.createElement("div");
		document.body.append(bottom, top, outside);
		const onBottom = vi.fn();
		const onTop = vi.fn();
		const a = attachDismissable(bottom, { onDismiss: onBottom });
		const b = attachDismissable(top, { onDismiss: onTop });

		pointerDownOn(outside);
		expect(onTop).toHaveBeenCalledTimes(1);
		expect(onBottom).not.toHaveBeenCalled();
		b.destroy();
		a.destroy();
	});
});

// `active` is what makes an ANIMATED close safe. A panel that is fading out
// still holds its layer — it stays mounted for the whole exit — so without a
// liveness signal it would keep swallowing Escape for the length of the fade.
describe("attachDismissable — the active gate", () => {
	afterEach(() => {
		document.body.innerHTML = "";
		expect(__dismissableLayerCount()).toBe(0);
	});

	function layer(active?: () => boolean) {
		const node = document.createElement("div");
		document.body.appendChild(node);
		const onDismiss = vi.fn();
		const handle = attachDismissable(node, { onDismiss, active });
		return { node, onDismiss, handle };
	}

	it("an inactive layer ignores Escape — and does not swallow it on the way past", () => {
		const { onDismiss, handle } = layer(() => false);
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
		handle.destroy();
	});

	it("Escape falls through an inactive top layer to the live one beneath it", () => {
		const bottom = layer();
		const top = layer(() => false);

		pressEscape();

		expect(bottom.onDismiss).toHaveBeenCalledTimes(1);
		expect(top.onDismiss).not.toHaveBeenCalled();
		top.handle.destroy();
		bottom.handle.destroy();
	});

	it("an outside pointerdown falls through an inactive top layer the same way", () => {
		const bottom = layer();
		const top = layer(() => false);
		const outside = document.createElement("div");
		document.body.appendChild(outside);

		pointerDownOn(outside);

		expect(bottom.onDismiss).toHaveBeenCalledTimes(1);
		expect(top.onDismiss).not.toHaveBeenCalled();
		top.handle.destroy();
		bottom.handle.destroy();
	});

	it("reads the getter fresh on every event, so a layer going inactive stops answering", () => {
		let live = true;
		const { onDismiss, handle } = layer(() => live);

		pressEscape();
		expect(onDismiss).toHaveBeenCalledTimes(1);

		// The close instant: `open` flips and the captured getter is what
		// notices, with nothing having to push a new value in first.
		live = false;
		pressEscape();
		pressEscape();
		expect(onDismiss).toHaveBeenCalledTimes(1);

		handle.destroy();
	});

	it("update() swaps active in place: active → inactive → active behaves at each step", () => {
		const node = document.createElement("div");
		document.body.appendChild(node);
		const onDismiss = vi.fn();
		const handle = attachDismissable(node, { onDismiss });

		pressEscape();
		expect(onDismiss).toHaveBeenCalledTimes(1);

		handle.update({ onDismiss, active: () => false });
		pressEscape();
		expect(onDismiss).toHaveBeenCalledTimes(1);

		handle.update({ onDismiss, active: () => true });
		pressEscape();
		expect(onDismiss).toHaveBeenCalledTimes(2);

		handle.destroy();
	});

	it("omitting active is byte-identical to always-active, at the top and underneath", () => {
		const bottom = layer();
		const top = layer();

		pressEscape();
		expect(top.onDismiss).toHaveBeenCalledTimes(1);
		expect(bottom.onDismiss).not.toHaveBeenCalled();

		top.handle.destroy();
		pressEscape();
		expect(bottom.onDismiss).toHaveBeenCalledTimes(1);
		bottom.handle.destroy();
	});

	it("an inactive layer is not top even when every layer above it is gone", () => {
		const { onDismiss, handle } = layer(() => false);
		const outside = document.createElement("div");
		document.body.appendChild(outside);

		pressEscape();
		pointerDownOn(outside);

		expect(onDismiss).not.toHaveBeenCalled();
		handle.destroy();
	});
});

interface SurfaceProps extends Omit<DismissableOptions, "exclude"> {
	label?: string;
	/** Array form of `exclude`; the getter form is exercised on the core above. */
	excludeTrigger?: boolean;
}

/** One dismissable surface with a trigger next to it — the shape every overlay has. */
function Surface({ label = "surface", excludeTrigger, ...options }: SurfaceProps) {
	const [node, publishNode] = useElementRef<HTMLDivElement>();
	const trigger = useRef<HTMLButtonElement>(null);

	useDismissable(node, {
		...options,
		exclude: excludeTrigger ? [trigger] : undefined,
	});

	return (
		<>
			<button
				type="button"
				data-testid={`${label}-trigger`}
				ref={(el) => {
					trigger.current = el;
				}}
			/>
			<div data-testid={label} ref={publishNode}>
				<button type="button" data-testid={`${label}-inner`} />
			</div>
		</>
	);
}

describe("useDismissable", () => {
	afterEach(() => {
		cleanup();
		expect(__dismissableLayerCount()).toBe(0);
	});

	it("registers exactly one layer while mounted and drains the stack on unmount", () => {
		const { unmount } = render(<Surface onDismiss={() => {}} />);
		expect(__dismissableLayerCount()).toBe(1);

		unmount();
		expect(__dismissableLayerCount()).toBe(0);
	});

	it("dismisses on Escape and on an outside pointerdown", () => {
		const onDismiss = vi.fn();
		const { getByTestId } = render(<Surface onDismiss={onDismiss} />);

		act(() => pressEscape());
		expect(onDismiss).toHaveBeenCalledTimes(1);

		act(() => pointerDownOn(document.body));
		expect(onDismiss).toHaveBeenCalledTimes(2);

		act(() => pointerDownOn(getByTestId("surface-inner")));
		expect(onDismiss).toHaveBeenCalledTimes(2);
	});

	it("honours escape: false and outsideClick: false", () => {
		const onDismiss = vi.fn();
		render(<Surface onDismiss={onDismiss} escape={false} outsideClick={false} />);

		act(() => pressEscape());
		act(() => pointerDownOn(document.body));

		expect(onDismiss).not.toHaveBeenCalled();
	});

	it("picks up a changed escape / outsideClick without re-registering the layer", () => {
		const onDismiss = vi.fn();
		const { rerender } = render(<Surface onDismiss={onDismiss} escape={false} />);

		act(() => pressEscape());
		expect(onDismiss).not.toHaveBeenCalled();

		rerender(<Surface onDismiss={onDismiss} escape />);
		expect(__dismissableLayerCount()).toBe(1);

		act(() => pressEscape());
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it("calls the latest onDismiss without tearing the layer down", () => {
		const first = vi.fn();
		const second = vi.fn();
		const { rerender } = render(<Surface onDismiss={first} />);

		rerender(<Surface onDismiss={second} />);
		expect(__dismissableLayerCount()).toBe(1);

		act(() => pressEscape());
		expect(second).toHaveBeenCalledTimes(1);
		expect(first).not.toHaveBeenCalled();
	});

	it("resolves an exclude array of refs at event time", () => {
		const onDismiss = vi.fn();
		const { getByTestId } = render(<Surface onDismiss={onDismiss} excludeTrigger />);

		act(() => pointerDownOn(getByTestId("surface-trigger")));
		expect(onDismiss).not.toHaveBeenCalled();

		act(() => pointerDownOn(document.body));
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it("registers nothing while enabled is false, and registers on the flip", () => {
		const onDismiss = vi.fn();
		const { rerender } = render(<Surface onDismiss={onDismiss} enabled={false} />);
		expect(__dismissableLayerCount()).toBe(0);

		act(() => pressEscape());
		expect(onDismiss).not.toHaveBeenCalled();

		rerender(<Surface onDismiss={onDismiss} enabled />);
		expect(__dismissableLayerCount()).toBe(1);

		act(() => pressEscape());
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	// D-6: the Svelte getter becomes a plain boolean, and the semantics are
	// unchanged — the layer stays ON the stack for its whole exit and stops
	// being TOP of it the instant `active` flips.
	it("keeps an inactive layer on the stack while it stops answering", () => {
		const onDismiss = vi.fn();
		const { rerender } = render(<Surface onDismiss={onDismiss} active />);

		act(() => pressEscape());
		expect(onDismiss).toHaveBeenCalledTimes(1);

		rerender(<Surface onDismiss={onDismiss} active={false} />);
		expect(__dismissableLayerCount()).toBe(1);

		act(() => pressEscape());
		act(() => pointerDownOn(document.body));
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it("lets Escape fall through an inactive top layer to the live one beneath", () => {
		const onBottom = vi.fn();
		const onTop = vi.fn();

		function Stack({ topActive }: { topActive: boolean }) {
			return (
				<>
					<Surface label="bottom" onDismiss={onBottom} />
					<Surface label="top" onDismiss={onTop} active={topActive} />
				</>
			);
		}

		const { rerender } = render(<Stack topActive />);
		expect(__dismissableLayerCount()).toBe(2);

		act(() => pressEscape());
		expect(onTop).toHaveBeenCalledTimes(1);
		expect(onBottom).not.toHaveBeenCalled();

		// The top panel starts its exit: still mounted, still on the stack,
		// no longer the layer that owns the key.
		rerender(<Stack topActive={false} />);
		act(() => pressEscape());

		expect(onTop).toHaveBeenCalledTimes(1);
		expect(onBottom).toHaveBeenCalledTimes(1);
		expect(__dismissableLayerCount()).toBe(2);
	});

	it("leaves a stack of one under StrictMode, and drains it to zero on unmount", () => {
		const onDismiss = vi.fn();
		const { unmount } = render(
			<StrictMode>
				<Surface onDismiss={onDismiss} />
			</StrictMode>
		);

		// push → splice → push: the layer is spliced by identity, so the double
		// cycle leaves one entry at the same depth rather than two.
		expect(__dismissableLayerCount()).toBe(1);

		act(() => pressEscape());
		expect(onDismiss).toHaveBeenCalledTimes(1);

		unmount();
		expect(__dismissableLayerCount()).toBe(0);
	});
});
