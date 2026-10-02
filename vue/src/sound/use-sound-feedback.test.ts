/**
 * `useSoundFeedback` — the composition layer over the `soundFeedback` core.
 *
 * The guard matrix lives in `sound-feedback.test.ts` against the core; this
 * file only covers what the composable adds: element-keyed binding, the rebind
 * rule (listeners rebind only when the SET of event names changes, everything
 * else stays live), and cleanup on unmount.
 */
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref, type Ref } from "vue";
import { resetSoundFeedbackForTests, type SoundFeedbackOptions } from "./sound-feedback.js";
import { useSoundFeedback } from "./use-sound-feedback.js";
import { resetSoundForTests, sound } from "./sound.js";
import type { SoundCue, SoundPlayOptions } from "./types.js";

// jsdom 26 — the version this package pins — does not implement PointerEvent,
// and the hover path is entirely about `pointerType`. A MouseEvent subclass
// carrying `pointerType` is the whole surface these tests touch.
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

/** The C-1 shape: an element ref handed to the composable, read only after mount. */
function mountProbe(options: Ref<SoundFeedbackOptions | undefined>) {
	return mount(
		defineComponent({
			setup() {
				const el = ref<HTMLButtonElement | null>(null);
				useSoundFeedback(el, () => options.value ?? {});
				return () => h("button", { type: "button", ref: el, "data-testid": "target" });
			},
		}),
		{ attachTo: document.body }
	);
}

function click(node: Element) {
	node.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

describe("useSoundFeedback", () => {
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

	it("binds the default click → press once the element exists", () => {
		const options = ref<SoundFeedbackOptions | undefined>(undefined);
		const wrapper = mountProbe(options);

		click(wrapper.element);

		expect(play).toHaveBeenCalledWith("press", { volume: undefined, pitch: undefined });
		wrapper.unmount();
	});

	it("binds nothing while the element is null", () => {
		const el = ref<HTMLElement | null>(null);
		const wrapper = mount(
			defineComponent({
				setup() {
					useSoundFeedback(el);
					return () => h("button", { type: "button" });
				},
			})
		);

		click(wrapper.element);

		expect(play).not.toHaveBeenCalled();
		wrapper.unmount();
	});

	it("`on` replaces the defaults, exactly as the core does", () => {
		const options = ref<SoundFeedbackOptions | undefined>({ on: { click: "select" } });
		const wrapper = mountProbe(options);

		click(wrapper.element);

		expect(play).toHaveBeenCalledWith("select", { volume: undefined, pitch: undefined });
		wrapper.unmount();
	});

	it("swaps the cue for an unchanged event name WITHOUT rebinding", async () => {
		const options = ref<SoundFeedbackOptions | undefined>({ on: { click: "press" } });
		const wrapper = mountProbe(options);
		const addSpy = vi.spyOn(wrapper.element, "addEventListener");

		options.value = { on: { click: "select" } };
		await nextTick();

		expect(addSpy).not.toHaveBeenCalled();
		click(wrapper.element);
		expect(play).toHaveBeenCalledWith("select", { volume: undefined, pitch: undefined });
		wrapper.unmount();
	});

	it("does not rebind when the options object is rebuilt with the same names", async () => {
		const options = ref<SoundFeedbackOptions | undefined>({ on: { click: "press" } });
		const wrapper = mountProbe(options);
		const addSpy = vi.spyOn(wrapper.element, "addEventListener");

		options.value = { on: { click: "press" } };
		await nextTick();
		options.value = { on: { click: "press" } };
		await nextTick();

		expect(addSpy).not.toHaveBeenCalled();
		wrapper.unmount();
	});

	it("rebinds when the SET of event names changes", async () => {
		const options = ref<SoundFeedbackOptions | undefined>({ on: { click: "press" } });
		const wrapper = mountProbe(options);
		const addSpy = vi.spyOn(wrapper.element, "addEventListener");
		const removeSpy = vi.spyOn(wrapper.element, "removeEventListener");

		options.value = { on: { click: "press", pointerenter: "hover" } };
		await nextTick();

		expect(removeSpy).toHaveBeenCalledTimes(1);
		expect(addSpy).toHaveBeenCalledTimes(2);
		wrapper.unmount();
	});

	it("ignores the order the event names were declared in", async () => {
		const options = ref<SoundFeedbackOptions | undefined>({
			on: { click: "press", pointerenter: "hover" },
		});
		const wrapper = mountProbe(options);
		const addSpy = vi.spyOn(wrapper.element, "addEventListener");

		options.value = { on: { pointerenter: "hover", click: "press" } };
		await nextTick();

		expect(addSpy).not.toHaveBeenCalled();
		wrapper.unmount();
	});

	it("keeps `disabled` live without rebinding", async () => {
		const options = ref<SoundFeedbackOptions | undefined>({ disabled: false });
		const wrapper = mountProbe(options);
		const addSpy = vi.spyOn(wrapper.element, "addEventListener");

		options.value = { disabled: true };
		await nextTick();
		click(wrapper.element);

		expect(addSpy).not.toHaveBeenCalled();
		expect(play).not.toHaveBeenCalled();
		wrapper.unmount();
	});

	it("keeps `volume` and `pitch` live without rebinding", async () => {
		const options = ref<SoundFeedbackOptions | undefined>({ volume: 0.4, pitch: -3 });
		const wrapper = mountProbe(options);
		const addSpy = vi.spyOn(wrapper.element, "addEventListener");

		options.value = { volume: 0.9, pitch: 5 };
		await nextTick();
		click(wrapper.element);

		expect(addSpy).not.toHaveBeenCalled();
		expect(play).toHaveBeenCalledWith("press", { volume: 0.9, pitch: 5 });
		wrapper.unmount();
	});

	it("still swallows a resolver that throws", () => {
		const options = ref<SoundFeedbackOptions | undefined>({
			on: {
				click: () => {
					throw new Error("resolver exploded");
				},
			},
		});
		const wrapper = mountProbe(options);

		expect(() => click(wrapper.element)).not.toThrow();
		expect(play).not.toHaveBeenCalled();
		wrapper.unmount();
	});

	it("unbinds on unmount", () => {
		const options = ref<SoundFeedbackOptions | undefined>(undefined);
		const wrapper = mountProbe(options);
		const node = wrapper.element;

		wrapper.unmount();
		click(node);

		expect(play).not.toHaveBeenCalled();
	});

	it("returns the shared hover tracking to rest across a mount/unmount/mount/unmount cycle", () => {
		const add = vi.spyOn(document, "addEventListener");
		const remove = vi.spyOn(document, "removeEventListener");
		const moveAdds = () => add.mock.calls.filter(([type]) => type === "pointermove").length;
		const moveRemoves = () => remove.mock.calls.filter(([type]) => type === "pointermove").length;

		for (let i = 0; i < 2; i++) {
			const options = ref<SoundFeedbackOptions | undefined>({ on: { pointerenter: "hover" } });
			const wrapper = mountProbe(options);
			expect(moveAdds()).toBe(i + 1);
			wrapper.unmount();
			expect(moveRemoves()).toBe(i + 1);
		}

		// At rest: every retain was matched by a release.
		expect(moveAdds()).toBe(moveRemoves());
	});
});
