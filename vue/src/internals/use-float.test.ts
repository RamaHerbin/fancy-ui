import { afterEach, describe, it, expect } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { mount } from "@vue/test-utils";
import { useFloat } from "./use-float.js";
import type { FloatPlacement, FloatRect } from "./float.js";

const ANCHOR: FloatRect = { x: 100, y: 100, width: 200, height: 40 };

function stubBox(node: HTMLElement, box: { width: number; height: number }) {
	node.getBoundingClientRect = () =>
		({
			x: 0,
			y: 0,
			top: 0,
			left: 0,
			right: box.width,
			bottom: box.height,
			width: box.width,
			height: box.height,
			toJSON: () => ({}),
		}) as DOMRect;
}

describe("useFloat", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("positions the node and reports the resolved placement", async () => {
		const Cmp = defineComponent({
			setup() {
				const el = ref<HTMLElement | null>(null);
				const result = useFloat(el, () => ({ anchor: ANCHOR }));
				return { el, result };
			},
			render() {
				return h("div", { ref: "el" });
			},
		});

		const wrapper = mount(Cmp, { attachTo: document.body });
		stubBox(wrapper.element as HTMLElement, { width: 200, height: 120 });
		await nextTick();

		expect(wrapper.vm.result.placement).toBe("bottom-start");
	});

	it("defaults the returned placement before the node is mounted", () => {
		const Cmp = defineComponent({
			setup() {
				const el = ref<HTMLElement | null>(null);
				const result = useFloat(el, () => ({ anchor: ANCHOR, enabled: false }));
				return { el, result };
			},
			render() {
				return h("div", { ref: "el" });
			},
		});

		const wrapper = mount(Cmp);
		expect(wrapper.vm.result.placement).toBe("bottom-start");
	});


	it("reports a flip when the requested placement runs out of room", async () => {
		// Near the bottom edge of jsdom's 768px viewport: a 120px float placed
		// below would run off it, so the core flips to the top.
		const lowAnchor: FloatRect = { x: 100, y: 700, width: 200, height: 40 };

		const Cmp = defineComponent({
			setup() {
				const el = ref<HTMLElement | null>(null);
				const result = useFloat(el, () => ({ anchor: lowAnchor, placement: "bottom-start" }));
				return { el, result };
			},
			render() {
				return h("div", {
					ref: "el",
					onVnodeMounted(vnode) {
						stubBox(vnode.el as HTMLElement, { width: 200, height: 120 });
					},
				});
			},
		});

		const wrapper = mount(Cmp, { attachTo: document.body });
		await nextTick();

		expect(wrapper.vm.result.placement).toBe("top-start");
		expect((wrapper.element as HTMLElement).dataset.placement).toBe("top-start");
	});

	it("re-syncs when a geometry option changes", async () => {
		const Cmp = defineComponent({
			props: { placement: { type: String as () => FloatPlacement, required: true } },
			setup(props) {
				const el = ref<HTMLElement | null>(null);
				const result = useFloat(el, () => ({ anchor: ANCHOR, placement: props.placement }));
				return { el, result };
			},
			render() {
				return h("div", {
					ref: "el",
					onVnodeMounted(vnode) {
						stubBox(vnode.el as HTMLElement, { width: 200, height: 120 });
					},
				});
			},
		});

		const wrapper = mount(Cmp, { props: { placement: "bottom-start" }, attachTo: document.body });
		await nextTick();
		expect(wrapper.vm.result.placement).toBe("bottom-start");

		await wrapper.setProps({ placement: "bottom-end" });
		await nextTick();
		expect(wrapper.vm.result.placement).toBe("bottom-end");
	});

	// `anchor` is never watched (§3.1, which §12 binds this module to). Both
	// the getter and the fixed-rect forms of the union are rebuilt on every
	// evaluation of `options()`, so a watcher over them would never compare
	// equal and would turn ANY tracked dependency the caller happens to read
	// inside `options()` into a full `sync()` — the opposite of the property
	// the design exists to hold.
	it("does not re-sync when an unrelated dependency inside options() changes", async () => {
		let anchorReads = 0;
		const unrelated = ref(0);

		const Cmp = defineComponent({
			setup() {
				const el = ref<HTMLElement | null>(null);
				const result = useFloat(el, () => {
					// A caller reading its own reactive state next to the
					// options, with the anchor written the way all four Svelte
					// call sites write it: an arrow literal inside the options
					// object, rebuilt on every evaluation.
					void unrelated.value;
					return {
						anchor: () => {
							anchorReads += 1;
							return ANCHOR;
						},
						placement: "bottom-start" as FloatPlacement,
					};
				});
				return { el, result };
			},
			render() {
				return h("div", {
					ref: "el",
					onVnodeMounted(vnode) {
						stubBox(vnode.el as HTMLElement, { width: 200, height: 120 });
					},
				});
			},
		});

		mount(Cmp, { attachTo: document.body });
		await nextTick();

		const afterMount = anchorReads;
		expect(afterMount).toBeGreaterThan(0);

		unrelated.value += 1;
		await nextTick();

		expect(anchorReads).toBe(afterMount);
	});

	it("tears down the core on unmount without throwing", async () => {
		const Cmp = defineComponent({
			setup() {
				const el = ref<HTMLElement | null>(null);
				useFloat(el, () => ({ anchor: ANCHOR }));
				return { el };
			},
			render() {
				return h("div", { ref: "el" });
			},
		});

		const wrapper = mount(Cmp, { attachTo: document.body });
		const node = wrapper.element as HTMLElement;
		stubBox(node, { width: 200, height: 120 });
		await nextTick();
		expect(node.style.position).toBe("fixed");

		// The `float` core's destroy() does not strip the node's own inline
		// styles — unlike `anchorPosition`'s — because in the Svelte source
		// destroy only ever coincides with the node's own removal, making any
		// leftover style unobservable. So this only asserts unmount is safe,
		// not a style reset.
		expect(() => wrapper.unmount()).not.toThrow();
	});
});
