import { defineComponent, h, nextTick, ref, useTemplateRef } from "vue";
import { render } from "@testing-library/vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useOffscreenPause } from "./use-offscreen-pause.js";
import { FakeIntersectionObserver } from "../../test-setup.js";

const Probe = defineComponent({
	name: "Probe",
	setup() {
		const box = useTemplateRef<HTMLDivElement>("box");
		useOffscreenPause(box);
		return () => h("div", { ref: "box", "data-testid": "box" });
	},
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("useOffscreenPause", () => {
	it("sets the attribute when out of view and removes it when back in view", async () => {
		const { getByTestId } = render(Probe);
		await nextTick();
		const io = FakeIntersectionObserver.instances.at(-1)!;
		io.trigger(false);
		expect(getByTestId("box").hasAttribute("data-ft-offscreen")).toBe(true);
		io.trigger(true);
		expect(getByTestId("box").hasAttribute("data-ft-offscreen")).toBe(false);
	});

	it("never sets the attribute without IntersectionObserver", async () => {
		vi.stubGlobal("IntersectionObserver", undefined);
		const { getByTestId } = render(Probe);
		await nextTick();
		expect(getByTestId("box").hasAttribute("data-ft-offscreen")).toBe(false);
	});

	it("removes the marker from a surviving target when the scope ends while it is offscreen", async () => {
		// A fragment component (Meteors) observes a parent it does not own: the
		// parent outlives the instance and must not keep its siblings paused.
		const parent = document.body.appendChild(document.createElement("div"));
		// The observed element is handed over after mount, like a template ref.
		const target = ref<Element | null>(null);
		const Parented = defineComponent({
			name: "Parented",
			setup() {
				useOffscreenPause(target);
				return () => h("span");
			},
		});
		const { unmount } = render(Parented);
		target.value = parent;
		await nextTick();
		FakeIntersectionObserver.instances.at(-1)!.trigger(false);
		expect(parent.hasAttribute("data-ft-offscreen")).toBe(true);
		unmount();
		expect(parent.hasAttribute("data-ft-offscreen")).toBe(false);
		parent.remove();
	});

	it("clears the previous target's marker when the target changes", async () => {
		const first = document.body.appendChild(document.createElement("div"));
		const second = document.body.appendChild(document.createElement("div"));
		const target = ref<Element | null>(null);
		const Switching = defineComponent({
			name: "Switching",
			setup() {
				useOffscreenPause(target);
				return () => h("span");
			},
		});
		render(Switching);
		target.value = first;
		await nextTick();
		FakeIntersectionObserver.instances.at(-1)!.trigger(false);
		expect(first.hasAttribute("data-ft-offscreen")).toBe(true);
		target.value = second;
		await nextTick();
		expect(first.hasAttribute("data-ft-offscreen")).toBe(false);
		first.remove();
		second.remove();
	});

	it("disconnects on unmount", async () => {
		const { unmount } = render(Probe);
		await nextTick();
		const io = FakeIntersectionObserver.instances.at(-1)!;
		unmount();
		expect(io.elements.size).toBe(0);
	});
});
