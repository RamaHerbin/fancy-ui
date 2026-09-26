import { readFileSync } from "node:fs";
import { render, cleanup } from "@testing-library/vue";
import { mount } from "@vue/test-utils";
import { defineComponent, h, inject } from "vue";
import { afterEach, describe, it, expect } from "vitest";
import ButtonGroup from "./ButtonGroup.vue";
import { BUTTON_GROUP_CONTEXT } from "./types.js";
import type { ButtonGroupOrientation } from "./types.js";

// Plain `<button>`s stand in for real actions here so this suite never
// depends on the Button component, which is built by a different builder in
// parallel and may not exist yet.
function items(labels: string[]): string {
	return labels.map((label) => `<button type="button">${label}</button>`).join("");
}

function group(container: Element): HTMLElement {
	return container.querySelector('[role="group"]') as HTMLElement;
}

// Test-only composition rig: mounts ButtonGroup around a real child so the
// context probe can be exercised through actual markup rather than an
// invented value.
const ContextProbe = defineComponent({
	name: "ButtonGroupContextProbe",
	setup() {
		const context = inject(BUTTON_GROUP_CONTEXT.key, undefined);
		return () => h("span", { "data-testid": "context-orientation" }, context?.orientation ?? "none");
	},
});

const Harness = defineComponent({
	name: "ButtonGroupHarness",
	props: { orientation: { type: String as () => ButtonGroupOrientation, required: false } },
	setup(props) {
		return () =>
			h(ButtonGroup, { orientation: props.orientation, label: "Probed group" }, () => h(ContextProbe));
	},
});

describe("ButtonGroup", () => {
	afterEach(cleanup);

	it("renders a group with the given accessible name", () => {
		const { container } = render(ButtonGroup, {
			props: { label: "View" },
			slots: { default: items(["Day", "Week", "Month"]) },
		});

		const root = group(container);
		expect(root).toBeTruthy();
		expect(root.getAttribute("aria-label")).toBe("View");
		expect(root.querySelectorAll("button")).toHaveLength(3);
	});

	it("omits aria-label when no label is given", () => {
		const { container } = render(ButtonGroup, { props: {} });
		expect(group(container).hasAttribute("aria-label")).toBe(false);
	});

	it("defaults to horizontal", () => {
		const { container } = render(ButtonGroup, { props: {} });
		const root = group(container);

		expect(root.dataset.orientation).toBe("horizontal");
		expect(root.className).toContain("flex-row");
		expect(root.className).not.toContain("flex-col");
	});

	it("switches to vertical, on the root and in the layout class", () => {
		const { container } = render(ButtonGroup, { props: { orientation: "vertical" } });
		const root = group(container);

		expect(root.dataset.orientation).toBe("vertical");
		expect(root.className).toContain("flex-col");
		expect(root.className).not.toContain("flex-row");
	});

	it("renders the given children inside the group, in order", () => {
		const { container } = render(ButtonGroup, {
			props: {},
			slots: { default: items(["Save", "▼"]) },
		});

		const labels = [...group(container).querySelectorAll("button")].map((b) => b.textContent);
		expect(labels).toEqual(["Save", "▼"]);
	});

	it("renders with no children at all", () => {
		const { container } = render(ButtonGroup, { props: {} });
		expect(group(container).children).toHaveLength(0);
	});

	it("merges a custom class onto the root", () => {
		const { container } = render(ButtonGroup, {
			props: { class: "my-group" },
		});
		const root = group(container);

		expect(root.className).toContain("my-group");
		expect(root.className).toContain("ft-button-group");
	});

	it("declares the container border and radius that the seam depends on", () => {
		const { container } = render(ButtonGroup, { props: {} });
		const root = group(container);

		expect(root.className).toContain("border");
		expect(root.className).toContain("border-border");
		expect(root.className).toContain("rounded-lg");
		// No `overflow: hidden`: the first/last child already inherit the
		// container's own radius exactly (checked below), so nothing renders
		// outside its rounded outline that would need clipping — and a clip
		// would take every item's focus ring down with it.
		expect(root.className).not.toContain("overflow-hidden");
	});

	// jsdom does not apply the component's scoped stylesheet, so the DOM half
	// of the seam contract (the root carries the border/radius, checked above,
	// and `data-orientation` flips, checked above) is verified through
	// rendered markup, and the CSS half — that a child gives up its own
	// border and corners, that the divider and the restored radius land on
	// the first/last child, and that the divider axis follows
	// `data-orientation` — is checked directly against the source below.
	it("declares a divider and a stripped radius for the first/last child, both orientations", () => {
		const source = readFileSync("src/components/button-group/ButtonGroup.vue", "utf8");

		// A child gives up its own border and corners...
		expect(source).toMatch(/\.ft-button-group :deep\(> \*\) \{[^}]*border-style:\s*none/);
		expect(source).toMatch(/\.ft-button-group :deep\(> \*\) \{[^}]*border-radius:\s*0/);
		// ...the divider runs left-to-right by default...
		expect(source).toMatch(/:not\(\[data-orientation="vertical"\]\) :deep\(> \* \+ \*\) \{[^}]*border-left/);
		// ...and top-to-bottom once the orientation flips.
		expect(source).toMatch(/\[data-orientation="vertical"\] :deep\(> \* \+ \*\) \{[^}]*border-top/);
		// The container's rounded ends are restored on the first and last
		// child only, mirrored for the vertical axis.
		expect(source).toMatch(/:first-child\) \{[^}]*border-top-left-radius:\s*inherit/);
		expect(source).toMatch(/:last-child\) \{[^}]*border-bottom-right-radius:\s*inherit/);
	});

	it("raises a focused child's stacking context so its ring isn't clipped by a neighbour", () => {
		const source = readFileSync("src/components/button-group/ButtonGroup.vue", "utf8");
		expect(source).toMatch(/:focus-visible\) \{[^}]*z-index:\s*1/);
	});

	it("publishes the orientation through context, live, for nested controls to read", async () => {
		// One instance, re-rendered with a new prop — not two separate mounts —
		// so this only passes if the context exposes a live getter over the
		// root's own `orientation`. A frozen snapshot taken at mount would still
		// read "horizontal" here, since nothing about it re-runs.
		const { getByTestId, rerender } = render(Harness, { props: {} });
		expect(getByTestId("context-orientation").textContent).toBe("horizontal");

		await rerender({ orientation: "vertical" });
		expect(getByTestId("context-orientation").textContent).toBe("vertical");
	});

	it("degrades instead of throwing when read outside a group", () => {
		const { getByTestId } = render(ContextProbe);
		expect(getByTestId("context-orientation").textContent).toBe("none");
	});

	it("binds the root element", () => {
		const wrapper = mount(ButtonGroup);
		expect(wrapper.vm.ref).toBe(wrapper.element);
	});
});
