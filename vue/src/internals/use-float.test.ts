import { afterEach, describe, it, expect } from "vitest";
import { computed, defineComponent, h, nextTick, ref } from "vue";
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

	// `anchor` IS watched — by identity, which is the whole of the guard. Both
	// the getter and the fixed-rect forms of the union are rebuilt on every
	// evaluation of `options()`, so a source that merely re-ran is not evidence
	// of a change; without the identity check ANY tracked dependency the caller
	// happens to read inside `options()` would turn into a full `sync()`. A
	// caller whose anchor is a stable value re-evaluates to the same identity
	// and must be skipped.
	it("does not re-sync when an unrelated dependency changes and the anchor is unchanged", async () => {
		let anchorReads = 0;
		const unrelated = ref(0);

		const Cmp = defineComponent({
			setup() {
				const el = ref<HTMLElement | null>(null);
				// Held, not rebuilt inline: one identity for the lifetime of the
				// component, the way `ComposerCommandMenu` holds its caret getter
				// in a `computed` and the three element-anchored call sites read
				// nothing reactive at all while building theirs.
				const anchor = () => {
					anchorReads += 1;
					return ANCHOR;
				};
				const result = useFloat(el, () => {
					// A caller reading its own reactive state next to the options.
					void unrelated.value;
					return { anchor, placement: "bottom-start" as FloatPlacement };
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

	// The counterpart, and the reason `anchor` is in the sources at all: an
	// anchor that MOVES while the float stays open — a caret-anchored menu whose
	// token shifts — changes nothing the core can hear for itself. The scroll and
	// resize listeners never fire, and its `ResizeObserver` never observes a
	// getter anchor. This is the Svelte action's `update()` re-run when its
	// `$derived` parameter changes.
	it("re-syncs, once, when the anchor's identity changes", async () => {
		let anchorReads = 0;

		const Cmp = defineComponent({
			setup() {
				const top = ref(100);
				const el = ref<HTMLElement | null>(null);
				// A fresh closure whenever `top` moves, and the same one otherwise.
				const anchor = computed(() => {
					const y = top.value;
					return (): FloatRect => {
						anchorReads += 1;
						return { x: 100, y, width: 200, height: 40 };
					};
				});
				const result = useFloat(el, () => ({
					anchor: anchor.value,
					placement: "bottom-start" as FloatPlacement,
				}));
				return { el, result, top };
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
		const node = wrapper.element as HTMLElement;
		// 100 + 40 (anchor height) + 6 (default offset).
		expect(node.style.top).toBe("146px");

		const afterMount = anchorReads;
		wrapper.vm.top = 300;
		await nextTick();

		// One re-position against the new anchor, not two.
		expect(anchorReads).toBe(afterMount + 1);
		expect(node.style.top).toBe("346px");
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
