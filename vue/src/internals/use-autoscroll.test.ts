import { afterEach, describe, it, expect, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { mount } from "@vue/test-utils";
import { useAutoscroll } from "./use-autoscroll.js";

const SCROLL_HEIGHT = 1000;
const CLIENT_HEIGHT = 400;
const BOTTOM = SCROLL_HEIGHT - CLIENT_HEIGHT;

function stubScrollable(node: HTMLElement, scrollTop = BOTTOM) {
	Object.defineProperty(node, "scrollHeight", { value: SCROLL_HEIGHT, configurable: true });
	Object.defineProperty(node, "clientHeight", { value: CLIENT_HEIGHT, configurable: true });
	Object.defineProperty(node, "scrollTop", { value: scrollTop, writable: true, configurable: true });
}

describe("useAutoscroll", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("wires the core up against the mounted node without throwing", async () => {
		const Cmp = defineComponent({
			setup() {
				const el = ref<HTMLElement | null>(null);
				useAutoscroll(el, () => ({ pinOnConnect: true }));
				return { el };
			},
			render() {
				return h("div", { ref: "el" });
			},
		});

		const wrapper = mount(Cmp, { attachTo: document.body });
		const node = wrapper.element as HTMLElement;
		stubScrollable(node, 0);
		await nextTick();

		expect(node).toBeTruthy();
	});

	it("fires onStickChange when the pinned state flips", async () => {
		const seen: boolean[] = [];

		const Cmp = defineComponent({
			setup() {
				const el = ref<HTMLElement | null>(null);
				useAutoscroll(el, () => ({ onStickChange: (s) => seen.push(s) }));
				return { el };
			},
			render() {
				return h("div", { ref: "el" });
			},
		});

		const wrapper = mount(Cmp, { attachTo: document.body });
		const node = wrapper.element as HTMLElement;
		stubScrollable(node, BOTTOM);
		await nextTick();

		// Scroll away from the bottom.
		Object.defineProperty(node, "scrollTop", { value: 0, writable: true, configurable: true });
		node.dispatchEvent(new Event("scroll"));

		expect(seen).toEqual([false]);
	});

	it("tears down listeners on unmount", async () => {
		const Cmp = defineComponent({
			setup() {
				const el = ref<HTMLElement | null>(null);
				useAutoscroll(el, () => ({}));
				return { el };
			},
			render() {
				return h("div", { ref: "el" });
			},
		});

		const wrapper = mount(Cmp, { attachTo: document.body });
		const node = wrapper.element as HTMLElement;
		stubScrollable(node);
		await nextTick();

		const removeSpy = vi.spyOn(node, "removeEventListener");
		wrapper.unmount();
		expect(removeSpy).toHaveBeenCalled();
	});
});
