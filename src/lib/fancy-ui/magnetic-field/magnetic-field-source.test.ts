import { afterEach, describe, expect, it, vi } from "vitest";
import { attachLayoutInvalidation, attachPointerSource } from "./magnetic-field-source.js";

function fakeCore() {
	return {
		setClientSource: vi.fn(),
		clearSource: vi.fn(),
		invalidate: vi.fn(),
	};
}

function pointer(type: string, init: PointerEventInit = {}, target: EventTarget = document) {
	target.dispatchEvent(
		new PointerEvent(type, {
			bubbles: true,
			clientX: 0,
			clientY: 0,
			isPrimary: true,
			pointerType: "mouse",
			...init,
		})
	);
}

const teardowns: Array<() => void> = [];
function track(off: () => void) {
	teardowns.push(off);
	return off;
}

afterEach(() => {
	while (teardowns.length) teardowns.pop()!();
	vi.restoreAllMocks();
});

describe("attachPointerSource", () => {
	it("feeds the pointer channel with client coordinates from a mouse anywhere on the document", () => {
		const core = fakeCore();
		track(attachPointerSource(core));

		pointer("pointermove", { clientX: 120, clientY: 48 });
		pointer("pointermove", { clientX: 130, clientY: 52 }, document.body);

		expect(core.setClientSource).toHaveBeenNthCalledWith(1, 120, 48, "pointer");
		expect(core.setClientSource).toHaveBeenNthCalledWith(2, 130, 52, "pointer");
	});

	it("accepts a pen", () => {
		const core = fakeCore();
		track(attachPointerSource(core));
		pointer("pointermove", { clientX: 5, clientY: 6, pointerType: "pen" });
		expect(core.setClientSource).toHaveBeenCalledWith(5, 6, "pointer");
	});

	it("ignores touch and non-primary pointers", () => {
		const core = fakeCore();
		track(attachPointerSource(core));

		pointer("pointermove", { clientX: 1, clientY: 1, pointerType: "touch" });
		pointer("pointermove", { clientX: 2, clientY: 2, isPrimary: false });
		pointer("pointerout", { pointerType: "touch", relatedTarget: null });

		expect(core.setClientSource).not.toHaveBeenCalled();
		expect(core.clearSource).not.toHaveBeenCalled();
	});

	it("clears the pointer channel while the pointer is over a puck, so letting go releases", () => {
		const core = fakeCore();
		track(attachPointerSource(core));
		const puck = document.createElement("div");
		puck.className = "ft-magnet-puck";
		const face = document.createElement("span");
		puck.append(face);
		document.body.append(puck);
		try {
			pointer("pointermove", { clientX: 10, clientY: 10 });
			pointer("pointermove", { clientX: 40, clientY: 40 }, face);
			pointer("pointermove", { clientX: 41, clientY: 41 }, puck);

			expect(core.setClientSource).toHaveBeenCalledTimes(1);
			expect(core.clearSource).toHaveBeenCalledTimes(2);
			expect(core.clearSource).toHaveBeenLastCalledWith("pointer");

			// Off the puck again: the pointer drives the field once more.
			pointer("pointermove", { clientX: 90, clientY: 90 }, document.body);
			expect(core.setClientSource).toHaveBeenLastCalledWith(90, 90, "pointer");
		} finally {
			puck.remove();
		}
	});

	it("with a root, only suppresses the pointer over a puck inside that root", () => {
		const core = fakeCore();
		const field = document.createElement("div");
		const own = document.createElement("div");
		own.className = "ft-magnet-puck";
		field.append(own);
		const other = document.createElement("div");
		other.className = "ft-magnet-puck";
		document.body.append(field, other);
		track(attachPointerSource(core, document, field));
		try {
			pointer("pointermove", { clientX: 20, clientY: 20 }, other);
			expect(core.setClientSource).toHaveBeenLastCalledWith(20, 20, "pointer");
			expect(core.clearSource).not.toHaveBeenCalled();
			pointer("pointermove", { clientX: 30, clientY: 30 }, own);
			expect(core.clearSource).toHaveBeenCalledWith("pointer");
			expect(core.setClientSource).toHaveBeenCalledTimes(1);
		} finally {
			field.remove();
			other.remove();
		}
	});

	it("ignores a non-primary pointer leaving the document", () => {
		const core = fakeCore();
		track(attachPointerSource(core));
		pointer("pointerleave", { isPrimary: false });
		expect(core.clearSource).not.toHaveBeenCalled();
	});

	it("listens passively so it never blocks scrolling", () => {
		const add = vi.spyOn(document, "addEventListener");
		track(attachPointerSource(fakeCore()));
		const moveCall = add.mock.calls.find(([type]) => type === "pointermove");
		expect(moveCall?.[2]).toMatchObject({ passive: true });
	});

	it("clears the pointer channel when the pointer leaves the page", () => {
		const core = fakeCore();
		track(attachPointerSource(core));

		pointer("pointerout", { relatedTarget: document.body }, document.body);
		expect(core.clearSource).not.toHaveBeenCalled();

		pointer("pointerout", { relatedTarget: null }, document.body);
		expect(core.clearSource).toHaveBeenCalledWith("pointer");

		core.clearSource.mockClear();
		pointer("pointerleave");
		expect(core.clearSource).toHaveBeenCalledWith("pointer");
	});

	it("clears the pointer channel when the window loses focus or the page is hidden", () => {
		const core = fakeCore();
		track(attachPointerSource(core));

		window.dispatchEvent(new Event("blur"));
		expect(core.clearSource).toHaveBeenCalledTimes(1);

		const visibility = vi.spyOn(document, "visibilityState", "get");
		visibility.mockReturnValue("visible");
		document.dispatchEvent(new Event("visibilitychange"));
		expect(core.clearSource).toHaveBeenCalledTimes(1);

		visibility.mockReturnValue("hidden");
		document.dispatchEvent(new Event("visibilitychange"));
		expect(core.clearSource).toHaveBeenCalledTimes(2);
		expect(core.clearSource).toHaveBeenLastCalledWith("pointer");
	});

	it("only ever touches the pointer channel", () => {
		const core = fakeCore();
		track(attachPointerSource(core));
		pointer("pointermove", { clientX: 1, clientY: 1 });
		pointer("pointerleave");
		window.dispatchEvent(new Event("blur"));
		for (const call of core.setClientSource.mock.calls) expect(call[2]).toBe("pointer");
		for (const call of core.clearSource.mock.calls) expect(call[0]).toBe("pointer");
	});

	it("detaches every listener and clears its channel on teardown", () => {
		const core = fakeCore();
		const add = vi.spyOn(document, "addEventListener");
		const remove = vi.spyOn(document, "removeEventListener");
		const winAdd = vi.spyOn(window, "addEventListener");
		const winRemove = vi.spyOn(window, "removeEventListener");

		const off = attachPointerSource(core);
		off();
		expect(core.clearSource).toHaveBeenCalledWith("pointer");

		const added = add.mock.calls.map(([type, fn]) => [type, fn]);
		const removed = remove.mock.calls.map(([type, fn]) => [type, fn]);
		expect(removed).toEqual(expect.arrayContaining(added));
		expect(winRemove.mock.calls.map(([t, f]) => [t, f])).toEqual(
			expect.arrayContaining(winAdd.mock.calls.map(([t, f]) => [t, f]))
		);

		core.setClientSource.mockClear();
		core.clearSource.mockClear();
		pointer("pointermove", { clientX: 9, clientY: 9 });
		pointer("pointerleave");
		window.dispatchEvent(new Event("blur"));
		expect(core.setClientSource).not.toHaveBeenCalled();
		expect(core.clearSource).not.toHaveBeenCalled();
	});

	it("listens on the document it is given", () => {
		const other = document.implementation.createHTMLDocument("other");
		const core = fakeCore();
		track(attachPointerSource(core, other));

		pointer("pointermove", { clientX: 1, clientY: 1 });
		expect(core.setClientSource).not.toHaveBeenCalled();

		pointer("pointermove", { clientX: 3, clientY: 4 }, other);
		expect(core.setClientSource).toHaveBeenCalledWith(3, 4, "pointer");
	});

	it("keeps two fields independent", () => {
		const a = fakeCore();
		const b = fakeCore();
		const offA = attachPointerSource(a);
		track(attachPointerSource(b));

		offA();
		a.clearSource.mockClear();
		pointer("pointermove", { clientX: 7, clientY: 8 });
		expect(a.setClientSource).not.toHaveBeenCalled();
		expect(b.setClientSource).toHaveBeenCalledWith(7, 8, "pointer");
	});
});

describe("attachLayoutInvalidation", () => {
	it("invalidates on a window resize and on a scroll anywhere (captured)", () => {
		const core = fakeCore();
		track(attachLayoutInvalidation(core));

		window.dispatchEvent(new Event("resize"));
		expect(core.invalidate).toHaveBeenCalledTimes(1);

		// `scroll` does not bubble: a scrolling ancestor is only heard through
		// the capture phase on the window.
		const scroller = document.createElement("div");
		document.body.appendChild(scroller);
		scroller.dispatchEvent(new Event("scroll", { bubbles: false }));
		expect(core.invalidate).toHaveBeenCalledTimes(2);

		document.dispatchEvent(new Event("scroll", { bubbles: false }));
		expect(core.invalidate).toHaveBeenCalledTimes(3);
		scroller.remove();
	});

	it("never touches the source channels", () => {
		const core = fakeCore();
		track(attachLayoutInvalidation(core));
		window.dispatchEvent(new Event("resize"));
		expect(core.setClientSource).not.toHaveBeenCalled();
		expect(core.clearSource).not.toHaveBeenCalled();
	});

	it("stops invalidating after teardown", () => {
		const core = fakeCore();
		const off = attachLayoutInvalidation(core);
		off();
		window.dispatchEvent(new Event("resize"));
		document.dispatchEvent(new Event("scroll"));
		expect(core.invalidate).not.toHaveBeenCalled();
	});
});
