/**
 * `attachSoundFeedback` core tests. `sound.play` is spied so no engine ever
 * gets involved — this file is only about which events resolve to which cue
 * under which guard, and about listener bookkeeping on update/destroy.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	attachSoundFeedback,
	DEFAULT_SOUND_FEEDBACK_ON,
	resetSoundFeedbackForTests,
	__soundFeedbackHoverInstances,
} from "./sound-feedback.js";
import { resetSoundForTests, sound } from "./sound.js";
import type { SoundCue, SoundPlayOptions } from "./types.js";

// jsdom 26 — the version this package pins — does not implement PointerEvent,
// and the hover guard matrix is entirely about `pointerType`. A MouseEvent
// subclass carrying `pointerType` is the whole surface these tests touch.
if (typeof window !== "undefined" && typeof window.PointerEvent === "undefined") {
	class PointerEventShim extends MouseEvent {
		readonly pointerType: string;
		constructor(type: string, init: PointerEventInit = {}) {
			super(type, init);
			this.pointerType = init.pointerType ?? "";
		}
	}
	const Ctor = PointerEventShim as unknown as typeof PointerEvent;
	window.PointerEvent = Ctor;
	globalThis.PointerEvent = Ctor;
}

function attach(node: HTMLElement) {
	document.body.appendChild(node);
	return node;
}

/** A real hover is preceded by pointer movement; scroll-under enters are not. */
function moveThenEnter(node: HTMLElement, init: PointerEventInit = {}) {
	document.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerType: "mouse" }));
	node.dispatchEvent(
		new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse", ...init })
	);
}

describe("attachSoundFeedback", () => {
	const play = vi.fn<(cue: SoundCue, options?: SoundPlayOptions) => void>();

	beforeEach(() => {
		resetSoundForTests();
		resetSoundFeedbackForTests();
		play.mockClear();
		vi.spyOn(sound, "play").mockImplementation(play);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		document.body.innerHTML = "";
	});

	it("exports the documented defaults — press only, hover is opt-in", () => {
		expect(DEFAULT_SOUND_FEEDBACK_ON).toEqual({ click: "press" });
	});

	it("binds the default click → press", () => {
		const node = attach(document.createElement("button"));
		attachSoundFeedback(node);

		node.dispatchEvent(new MouseEvent("click", { bubbles: true }));

		expect(play).toHaveBeenCalledWith("press", { volume: undefined, pitch: undefined });
		expect(play).toHaveBeenCalledTimes(1);
	});

	it("does not bind hover by default — a bare attach never plays on pointerenter", () => {
		const node = attach(document.createElement("div"));
		attachSoundFeedback(node, { allowUntrusted: true });

		moveThenEnter(node);

		expect(play).not.toHaveBeenCalled();
	});

	it("plays hover when opted in through `on`, gated by allowUntrusted since jsdom events are untrusted", () => {
		const node = attach(document.createElement("div"));
		attachSoundFeedback(node, { on: { pointerenter: "hover" }, allowUntrusted: true });

		moveThenEnter(node);

		expect(play).toHaveBeenCalledWith("hover", { volume: undefined, pitch: undefined });
	});

	it("`on` replaces the defaults entirely instead of merging", () => {
		const node = attach(document.createElement("button"));
		attachSoundFeedback(node, { on: { click: "select" } });

		node.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		expect(play).toHaveBeenCalledWith("select", { volume: undefined, pitch: undefined });

		// pointerenter is no longer bound at all.
		node.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }));
		expect(play).toHaveBeenCalledTimes(1);
	});

	describe("hover guards", () => {
		it("stays silent for an untrusted event unless allowUntrusted is set", () => {
			const node = attach(document.createElement("div"));
			attachSoundFeedback(node, { on: { pointerenter: "hover" } });

			node.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }));

			expect(play).not.toHaveBeenCalled();
		});

		it("lets an untrusted event through when allowUntrusted is set", () => {
			const node = attach(document.createElement("div"));
			attachSoundFeedback(node, { on: { pointerenter: "hover" }, allowUntrusted: true });

			moveThenEnter(node);

			expect(play).toHaveBeenCalledWith("hover", { volume: undefined, pitch: undefined });
		});

		it("stays silent for a touch pointer — one tap must be one cue, the click's", () => {
			const node = attach(document.createElement("button"));
			attachSoundFeedback(node, {
				on: { pointerenter: "hover", click: "press" },
				allowUntrusted: true,
			});

			document.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerType: "touch" }));
			node.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "touch" }));
			node.dispatchEvent(new MouseEvent("click", { bubbles: true }));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("press", { volume: undefined, pitch: undefined });
		});

		it("lets a pen through like a mouse", () => {
			const node = attach(document.createElement("div"));
			attachSoundFeedback(node, { on: { pointerenter: "hover" }, allowUntrusted: true });

			document.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerType: "pen" }));
			node.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "pen" }));

			expect(play).toHaveBeenCalledTimes(1);
		});

		it("stays silent when content scrolls under a stationary pointer (no recent pointermove)", () => {
			const node = attach(document.createElement("div"));
			attachSoundFeedback(node, { on: { pointerenter: "hover" }, allowUntrusted: true });

			node.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }));

			expect(play).not.toHaveBeenCalled();
		});

		it("stays silent when the last pointermove is older than the recency window", () => {
			vi.useFakeTimers({ toFake: ["performance"] });
			try {
				const node = attach(document.createElement("div"));
				attachSoundFeedback(node, { on: { pointerenter: "hover" }, allowUntrusted: true });

				document.dispatchEvent(
					new PointerEvent("pointermove", { bubbles: true, pointerType: "mouse" })
				);
				vi.advanceTimersByTime(400);
				node.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }));

				expect(play).not.toHaveBeenCalled();
			} finally {
				vi.useRealTimers();
			}
		});

		it("stays silent for a compatibility mouseenter that came from a touch", () => {
			const node = attach(document.createElement("div"));
			attachSoundFeedback(node, { on: { mouseenter: "hover" }, allowUntrusted: true });

			document.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerType: "mouse" }));
			const event = new MouseEvent("mouseenter", { bubbles: true });
			Object.defineProperty(event, "sourceCapabilities", { value: { firesTouchEvents: true } });
			node.dispatchEvent(event);

			expect(play).not.toHaveBeenCalled();
		});

		it("removes the shared document pointermove listener with the last hover-mapped instance", () => {
			const add = vi.spyOn(document, "addEventListener");
			const remove = vi.spyOn(document, "removeEventListener");
			const a = attachSoundFeedback(attach(document.createElement("div")), {
				on: { pointerenter: "hover" },
			});
			const b = attachSoundFeedback(attach(document.createElement("div")), {
				on: { pointerenter: "hover" },
			});
			const moveAdds = () => add.mock.calls.filter(([type]) => type === "pointermove").length;
			const moveRemoves = () => remove.mock.calls.filter(([type]) => type === "pointermove").length;

			expect(moveAdds()).toBe(1);
			a.destroy();
			expect(moveRemoves()).toBe(0);
			b.destroy();
			expect(moveRemoves()).toBe(1);
			expect(__soundFeedbackHoverInstances()).toBe(0);
		});

		it('stays silent when pointerType === ""', () => {
			const node = attach(document.createElement("div"));
			attachSoundFeedback(node, { on: { pointerenter: "hover" }, allowUntrusted: true });

			node.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "" }));

			expect(play).not.toHaveBeenCalled();
		});

		it("stays silent when relatedTarget is contained inside the node (re-entering a child)", () => {
			const node = attach(document.createElement("div"));
			const child = document.createElement("span");
			node.appendChild(child);
			attachSoundFeedback(node, { on: { pointerenter: "hover" }, allowUntrusted: true });

			node.dispatchEvent(
				new PointerEvent("pointerenter", {
					bubbles: true,
					pointerType: "mouse",
					relatedTarget: child,
				})
			);

			expect(play).not.toHaveBeenCalled();
		});

		it("still fires when relatedTarget is outside the node", () => {
			const node = attach(document.createElement("div"));
			const outside = attach(document.createElement("div"));
			attachSoundFeedback(node, { on: { pointerenter: "hover" }, allowUntrusted: true });

			moveThenEnter(node, { relatedTarget: outside });

			expect(play).toHaveBeenCalledWith("hover", { volume: undefined, pitch: undefined });
		});

		it("the hover guards do not apply to non-hover events", () => {
			const node = attach(document.createElement("button"));
			attachSoundFeedback(node, { on: { click: "press" } });

			// An untrusted click (every jsdom-dispatched event is untrusted) still fires,
			// because the isTrusted/pointerType/relatedTarget guards are hover-only.
			node.dispatchEvent(new MouseEvent("click", { bubbles: true }));

			expect(play).toHaveBeenCalledWith("press", { volume: undefined, pitch: undefined });
		});
	});

	describe("universal disabled guard", () => {
		it("opts.disabled silences every cue", () => {
			const node = attach(document.createElement("button"));
			attachSoundFeedback(node, { disabled: true });

			node.dispatchEvent(new MouseEvent("click", { bubbles: true }));

			expect(play).not.toHaveBeenCalled();
		});

		it("a native :disabled element stays silent", () => {
			const node = attach(document.createElement("button")) as HTMLButtonElement;
			node.disabled = true;
			attachSoundFeedback(node);

			node.dispatchEvent(new MouseEvent("click", { bubbles: true }));

			expect(play).not.toHaveBeenCalled();
		});

		it('aria-disabled="true" stays silent', () => {
			const node = attach(document.createElement("div"));
			node.setAttribute("aria-disabled", "true");
			attachSoundFeedback(node, { on: { click: "press" } });

			node.dispatchEvent(new MouseEvent("click", { bubbles: true }));

			expect(play).not.toHaveBeenCalled();
		});

		it('data-disabled="true" stays silent', () => {
			const node = attach(document.createElement("div"));
			node.setAttribute("data-disabled", "true");
			attachSoundFeedback(node, { on: { click: "press" } });

			node.dispatchEvent(new MouseEvent("click", { bubbles: true }));

			expect(play).not.toHaveBeenCalled();
		});
	});

	describe("resolver functions", () => {
		it("computes the cue from the event", () => {
			const node = attach(document.createElement("input")) as HTMLInputElement;
			node.type = "checkbox";
			attachSoundFeedback(node, {
				on: {
					change: (event) =>
						(event.currentTarget as HTMLInputElement).checked ? "toggle-on" : "toggle-off",
				},
			});

			node.checked = true;
			node.dispatchEvent(new Event("change", { bubbles: true }));

			expect(play).toHaveBeenCalledWith("toggle-on", { volume: undefined, pitch: undefined });
		});

		it("a resolver returning null/undefined stays silent", () => {
			const node = attach(document.createElement("button"));
			attachSoundFeedback(node, { on: { click: () => null } });

			node.dispatchEvent(new MouseEvent("click", { bubbles: true }));

			expect(play).not.toHaveBeenCalled();
		});

		it("a throwing resolver is swallowed and never reaches the DOM dispatch", () => {
			const node = attach(document.createElement("button"));
			attachSoundFeedback(node, {
				on: {
					click: () => {
						throw new Error("resolver exploded");
					},
				},
			});

			expect(() => node.dispatchEvent(new MouseEvent("click", { bubbles: true }))).not.toThrow();
			expect(play).not.toHaveBeenCalled();
		});
	});

	it("forwards volume and pitch to sound.play", () => {
		const node = attach(document.createElement("button"));
		attachSoundFeedback(node, { volume: 0.4, pitch: -3 });

		node.dispatchEvent(new MouseEvent("click", { bubbles: true }));

		expect(play).toHaveBeenCalledWith("press", { volume: 0.4, pitch: -3 });
	});

	describe("update() and destroy()", () => {
		it("update() unbinds the old listeners and rebinds from the new options", () => {
			const node = attach(document.createElement("button"));
			const addSpy = vi.spyOn(node, "addEventListener");
			const removeSpy = vi.spyOn(node, "removeEventListener");

			const handle = attachSoundFeedback(node, { on: { click: "press" } });
			expect(addSpy).toHaveBeenCalledTimes(1);

			handle.update({ on: { click: "select" } });
			expect(removeSpy).toHaveBeenCalledTimes(1);
			expect(addSpy).toHaveBeenCalledTimes(2);

			node.dispatchEvent(new MouseEvent("click", { bubbles: true }));
			expect(play).toHaveBeenCalledWith("select", { volume: undefined, pitch: undefined });
			expect(play).toHaveBeenCalledTimes(1);
		});

		it("destroy() removes every bound listener (add/remove counts match)", () => {
			const node = attach(document.createElement("button"));
			const addSpy = vi.spyOn(node, "addEventListener");
			const removeSpy = vi.spyOn(node, "removeEventListener");

			const handle = attachSoundFeedback(node, { on: { click: "press", pointerenter: "hover" } });
			expect(addSpy).toHaveBeenCalledTimes(2);

			handle.destroy();
			expect(removeSpy).toHaveBeenCalledTimes(addSpy.mock.calls.length);

			node.dispatchEvent(new MouseEvent("click", { bubbles: true }));
			expect(play).not.toHaveBeenCalled();
		});

		it("listeners are bound passively", () => {
			const node = attach(document.createElement("button"));
			const addSpy = vi.spyOn(node, "addEventListener");

			attachSoundFeedback(node, { on: { click: "press" } });

			expect(addSpy).toHaveBeenCalledWith("click", expect.any(Function), { passive: true });
		});
	});
});
