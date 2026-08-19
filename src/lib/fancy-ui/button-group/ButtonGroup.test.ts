import { readFileSync } from "node:fs";
import { render, cleanup } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect } from "vitest";
import ButtonGroup from "./ButtonGroup.svelte";
import Harness from "./ButtonGroupHarness.test.svelte";
import Probe from "./ButtonGroupContextProbe.test.svelte";

// Plain `<button>`s stand in for real actions here so this suite never
// depends on the Button component, which is built by a different builder in
// parallel and may not exist yet. `createRawSnippet` only ever adopts a
// single root node, so multiple items are wrapped in one; `querySelectorAll`
// still finds them regardless of that wrapper.
function items(labels: string[]) {
	const html = labels.map((label) => `<button type="button">${label}</button>`).join("");
	return createRawSnippet(() => ({ render: () => `<div>${html}</div>` }));
}

function group(container: HTMLElement): HTMLElement {
	return container.querySelector('[role="group"]') as HTMLElement;
}

describe("ButtonGroup", () => {
	afterEach(cleanup);

	it("renders a group with the given accessible name", () => {
		const { container } = render(ButtonGroup, {
			props: { label: "View", children: items(["Day", "Week", "Month"]) },
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
			props: { children: items(["Save", "▼"]) },
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
		const source = readFileSync("src/lib/fancy-ui/button-group/ButtonGroup.svelte", "utf8");

		// A child gives up its own border and corners...
		expect(source).toMatch(/\.ft-button-group :global\(> \*\) \{[^}]*border-style:\s*none/);
		expect(source).toMatch(/\.ft-button-group :global\(> \*\) \{[^}]*border-radius:\s*0/);
		// ...the divider runs left-to-right by default...
		expect(source).toMatch(
			/:not\(\[data-orientation="vertical"\]\) :global\(> \* \+ \*\) \{[^}]*border-left/
		);
		// ...and top-to-bottom once the orientation flips.
		expect(source).toMatch(
			/\[data-orientation="vertical"\] :global\(> \* \+ \*\) \{[^}]*border-top/
		);
		// The container's rounded ends are restored on the first and last
		// child only, mirrored for the vertical axis.
		expect(source).toMatch(/:first-child\) \{[^}]*border-top-left-radius:\s*inherit/);
		expect(source).toMatch(/:last-child\) \{[^}]*border-bottom-right-radius:\s*inherit/);
	});

	it("raises a focused child's stacking context so its ring isn't clipped by a neighbour", () => {
		const source = readFileSync("src/lib/fancy-ui/button-group/ButtonGroup.svelte", "utf8");
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
		const { getByTestId } = render(Probe);
		expect(getByTestId("context-orientation").textContent).toBe("none");
	});

	it("binds the root element", () => {
		let ref: HTMLDivElement | null = null;
		const { container } = render(ButtonGroup, {
			props: {
				get ref() {
					return ref;
				},
				set ref(value: HTMLDivElement | null) {
					ref = value;
				},
			},
		});

		expect(ref).toBe(group(container));
	});
});
