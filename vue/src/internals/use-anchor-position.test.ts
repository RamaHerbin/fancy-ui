import { afterEach, describe, it, expect } from "vitest";
import { defineComponent, h, nextTick, ref, type Ref } from "vue";
import { mount } from "@vue/test-utils";
import { useAnchorPosition } from "./use-anchor-position.js";
import type { Align, Side } from "./anchor-position.js";
import type { ResolvedPlacement } from "./use-anchor-position.js";

function rect(partial: Partial<DOMRect>): DOMRect {
	const { x = 0, y = 0, width = 0, height = 0 } = partial;
	return {
		x,
		y,
		width,
		height,
		top: y,
		left: x,
		right: x + width,
		bottom: y + height,
		toJSON() {
			return this;
		},
	};
}

describe("useAnchorPosition", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("seeds the placement at the requested side/align, not a hardcoded default", () => {
		const anchorEl = document.createElement("button");
		document.body.appendChild(anchorEl);

		const Cmp = defineComponent({
			setup() {
				const panel = ref<HTMLElement | null>(null);
				const placement = useAnchorPosition(panel, () => ({
					anchor: () => anchorEl,
					side: "top",
					align: "start",
					enabled: false,
				}));
				return { panel, placement };
			},
			render() {
				return h("div", { ref: "panel" });
			},
		});

		const wrapper = mount(Cmp);
		expect(wrapper.vm.placement).toEqual({ side: "top", align: "start" });
	});

	it("positions the node and reports the resolved placement", async () => {
		const anchorEl = document.createElement("button");
		document.body.appendChild(anchorEl);
		anchorEl.getBoundingClientRect = () => rect({ x: 100, y: 100, width: 50, height: 20 });

		let panelEl: HTMLElement | null = null;

		const Cmp = defineComponent({
			setup() {
				const panel = ref<HTMLElement | null>(null);
				const placement = useAnchorPosition(panel, () => ({
					anchor: () => anchorEl,
					side: "bottom",
				}));
				return { panel, placement };
			},
			render() {
				return h("div", { ref: "panel" });
			},
		});

		const wrapper = mount(Cmp, {
			attachTo: document.body,
		});
		await nextTick();
		panelEl = wrapper.element as HTMLElement;

		expect(panelEl.style.position).toBe("fixed");
		expect(wrapper.vm.placement.side).toBe("bottom");
	});

	it("recomputes when side/align/offset change", async () => {
		const anchorEl = document.createElement("button");
		document.body.appendChild(anchorEl);
		anchorEl.getBoundingClientRect = () => rect({ x: 100, y: 100, width: 50, height: 20 });

		const Cmp = defineComponent({
			props: { side: { type: String as () => Side, required: true } },
			setup(props) {
				const panel = ref<HTMLElement | null>(null);
				const placement = useAnchorPosition(panel, () => ({
					anchor: () => anchorEl,
					side: props.side,
				}));
				return { panel, placement };
			},
			render() {
				return h("div", { ref: "panel" });
			},
		});

		const wrapper = mount(Cmp, { props: { side: "bottom" }, attachTo: document.body });
		await nextTick();
		expect(wrapper.vm.placement.side).toBe("bottom");

		await wrapper.setProps({ side: "top" });
		await nextTick();
		expect(wrapper.vm.placement.side).toBe("top");
	});

	it("does not position when enabled is false", async () => {
		const anchorEl = document.createElement("button");
		document.body.appendChild(anchorEl);

		const Cmp = defineComponent({
			setup() {
				const panel = ref<HTMLElement | null>(null);
				useAnchorPosition(panel, () => ({ anchor: () => anchorEl, enabled: false }));
				return { panel };
			},
			render() {
				return h("div", { ref: "panel" });
			},
		});

		const wrapper = mount(Cmp, { attachTo: document.body });
		await nextTick();

		expect((wrapper.element as HTMLElement).style.position).toBe("");
	});


	// The three forms `UseAnchorPositionOptions.anchor` documents. The core
	// only ever calls a getter, so the composable is the piece that has to
	// accept a node and a ref and resolve them — a consumer following the
	// doc comment with either of those two must not crash.
	it.each([
		["a getter", (el: HTMLElement) => () => el],
		["a raw element", (el: HTMLElement) => el],
		["a ref", (el: HTMLElement) => ref(el) as Ref<HTMLElement | null>],
	])("accepts %s as the anchor", async (_label, build) => {
		const anchorEl = document.createElement("button");
		document.body.appendChild(anchorEl);
		anchorEl.getBoundingClientRect = () => rect({ x: 100, y: 100, width: 50, height: 20 });
		const anchor = build(anchorEl);

		const Cmp = defineComponent({
			setup() {
				const panel = ref<HTMLElement | null>(null);
				const placement = useAnchorPosition(panel, () => ({ anchor, side: "bottom" }));
				return { panel, placement };
			},
			render() {
				return h("div", { ref: "panel" });
			},
		});

		const wrapper = mount(Cmp, { attachTo: document.body });
		await nextTick();
		const panelEl = wrapper.element as HTMLElement;

		expect(panelEl.style.position).toBe("fixed");
		expect(panelEl.style.top).toBe("128px");
		expect(wrapper.vm.placement.side).toBe("bottom");
	});

	// The return value is a ref, not an object: `placement.value.side` is the
	// documented script-side read. `wrapper.vm.placement` works too because
	// the setup proxy unwraps, which is exactly why this one goes through the
	// raw handle instead.
	it("returns a ref, read through .value", async () => {
		const anchorEl = document.createElement("button");
		document.body.appendChild(anchorEl);
		anchorEl.getBoundingClientRect = () => rect({ x: 100, y: 100, width: 50, height: 20 });

		let handle: Readonly<Ref<ResolvedPlacement>> | null = null;

		const Cmp = defineComponent({
			setup() {
				const panel = ref<HTMLElement | null>(null);
				handle = useAnchorPosition(panel, () => ({ anchor: () => anchorEl, side: "bottom" }));
				return { panel };
			},
			render() {
				return h("div", { ref: "panel" });
			},
		});

		mount(Cmp, { attachTo: document.body });
		await nextTick();

		expect(handle!.value).toEqual({ side: "bottom", align: "center" });
	});

	it("reports a real flip through the returned ref and through onPlacement", async () => {
		const anchorEl = document.createElement("button");
		document.body.appendChild(anchorEl);
		// Near the bottom edge of jsdom's 768px viewport: a 100px panel placed
		// below would run off it, so the core flips to the top.
		anchorEl.getBoundingClientRect = () => rect({ x: 100, y: 700, width: 50, height: 20 });

		const seen: Array<[Side, Align]> = [];

		const Cmp = defineComponent({
			setup() {
				const panel = ref<HTMLElement | null>(null);
				const placement = useAnchorPosition(panel, () => ({
					anchor: () => anchorEl,
					side: "bottom",
					onPlacement: (side, align) => seen.push([side, align]),
				}));
				return { panel, placement };
			},
			render() {
				return h("div", {
					ref: "panel",
					// jsdom measures every element at zero, so the core falls
					// back to the rect — stubbed here to give the panel a real
					// height for the overflow test.
					onVnodeMounted(vnode) {
						const node = vnode.el as HTMLElement;
						node.getBoundingClientRect = () => rect({ width: 200, height: 100 });
					},
				});
			},
		});

		const wrapper = mount(Cmp, { attachTo: document.body });
		await nextTick();

		expect(wrapper.vm.placement.side).toBe("top");
		expect(seen).toEqual([["top", "center"]]);
	});

	// `recomputeKey` is the option the contract singles out: geometry moved
	// but no positioning option did, so nothing else in the update watcher
	// would fire. Only `ContextMenuContent` passes one.
	it("recomputes when recomputeKey changes and nothing else did", async () => {
		const anchorEl = document.createElement("button");
		document.body.appendChild(anchorEl);
		let anchorY = 100;
		anchorEl.getBoundingClientRect = () => rect({ x: 100, y: anchorY, width: 50, height: 20 });

		const Cmp = defineComponent({
			props: { recomputeKey: { type: Number, required: true } },
			setup(props) {
				const panel = ref<HTMLElement | null>(null);
				useAnchorPosition(panel, () => ({
					anchor: () => anchorEl,
					side: "bottom",
					recomputeKey: props.recomputeKey,
				}));
				return { panel };
			},
			render() {
				return h("div", { ref: "panel" });
			},
		});

		const wrapper = mount(Cmp, { props: { recomputeKey: 0 }, attachTo: document.body });
		await nextTick();
		const panelEl = wrapper.element as HTMLElement;
		expect(panelEl.style.top).toBe("128px");

		// The anchor moves with no option change at all.
		anchorY = 300;
		await wrapper.setProps({ recomputeKey: 1 });
		await nextTick();

		expect(panelEl.style.top).toBe("328px");
	});

	it("stops positioning when enabled flips to false, and resumes when it flips back", async () => {
		const anchorEl = document.createElement("button");
		document.body.appendChild(anchorEl);
		anchorEl.getBoundingClientRect = () => rect({ x: 100, y: 100, width: 50, height: 20 });

		const Cmp = defineComponent({
			props: { enabled: { type: Boolean, required: true } },
			setup(props) {
				const panel = ref<HTMLElement | null>(null);
				useAnchorPosition(panel, () => ({
					anchor: () => anchorEl,
					side: "bottom",
					enabled: props.enabled,
				}));
				return { panel };
			},
			render() {
				return h("div", { ref: "panel" });
			},
		});

		const wrapper = mount(Cmp, { props: { enabled: true }, attachTo: document.body });
		await nextTick();
		const panelEl = wrapper.element as HTMLElement;
		expect(panelEl.style.position).toBe("fixed");

		await wrapper.setProps({ enabled: false });
		await nextTick();
		// The core's destroy() strips the position it wrote.
		expect(panelEl.style.position).toBe("");

		await wrapper.setProps({ enabled: true });
		await nextTick();
		expect(panelEl.style.position).toBe("fixed");
	});

	it("tears down the core on unmount", async () => {
		const anchorEl = document.createElement("button");
		document.body.appendChild(anchorEl);
		anchorEl.getBoundingClientRect = () => rect({ x: 100, y: 100, width: 50, height: 20 });

		const Cmp = defineComponent({
			setup() {
				const panel = ref<HTMLElement | null>(null);
				useAnchorPosition(panel, () => ({ anchor: () => anchorEl, side: "bottom" }));
				return { panel };
			},
			render() {
				return h("div", { ref: "panel" });
			},
		});

		const wrapper = mount(Cmp, { attachTo: document.body });
		await nextTick();
		const panelEl = wrapper.element as HTMLElement;
		expect(panelEl.style.position).toBe("fixed");

		wrapper.unmount();
		expect(panelEl.style.position).toBe("");
	});
});
