import { readFileSync } from "node:fs";
import { useContext } from "react";
import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { ButtonGroup } from "./ButtonGroup.js";
import { BUTTON_GROUP_CONTEXT_KEY } from "./types.js";
import type { ButtonGroupOrientation } from "./types.js";

// Plain `<button>`s stand in for real actions here so this suite never
// depends on the Button component, which is built by a different builder in
// parallel and may not exist yet.
function items(labels: string[]) {
	return labels.map((label) => (
		<button type="button" key={label}>
			{label}
		</button>
	));
}

function group(container: HTMLElement): HTMLElement {
	return container.querySelector('[role="group"]') as HTMLElement;
}

// The Svelte suite needs two `*.test.svelte` rigs to prove the context is
// published, because `getContext` only resolves inside a component's own
// initialization. React declares both inline.
function ContextProbe() {
	const context = useContext(BUTTON_GROUP_CONTEXT_KEY);
	return <span data-testid="context-orientation">{context?.orientation ?? "none"}</span>;
}

function Harness({ orientation }: { orientation?: ButtonGroupOrientation }) {
	return (
		<ButtonGroup orientation={orientation} label="Probed group">
			<ContextProbe />
		</ButtonGroup>
	);
}

// The seam's CSS half lives in the colocated stylesheet, which jsdom does
// not apply; the source assertions below read it from disk. Path relative to
// the package root, as the Svelte suite reads its own source — Vitest runs
// from `react/`.
function stylesheet(): string {
	return readFileSync("src/components/button-group/button-group.css", "utf8");
}

describe("ButtonGroup", () => {
	afterEach(cleanup);

	it("renders a group with the given accessible name", () => {
		const { container } = render(
			<ButtonGroup label="View">{items(["Day", "Week", "Month"])}</ButtonGroup>
		);

		const root = group(container);
		expect(root).toBeTruthy();
		expect(root.getAttribute("aria-label")).toBe("View");
		expect(root.querySelectorAll("button")).toHaveLength(3);
	});

	it("omits aria-label when no label is given", () => {
		const { container } = render(<ButtonGroup />);
		expect(group(container).hasAttribute("aria-label")).toBe(false);
	});

	it("defaults to horizontal", () => {
		const { container } = render(<ButtonGroup />);
		const root = group(container);

		expect(root.dataset.orientation).toBe("horizontal");
		expect(root.className).toContain("flex-row");
		expect(root.className).not.toContain("flex-col");
	});

	it("switches to vertical, on the root and in the layout class", () => {
		const { container } = render(<ButtonGroup orientation="vertical" />);
		const root = group(container);

		expect(root.dataset.orientation).toBe("vertical");
		expect(root.className).toContain("flex-col");
		expect(root.className).not.toContain("flex-row");
	});

	it("renders the given children inside the group, in order", () => {
		const { container } = render(<ButtonGroup>{items(["Save", "▼"])}</ButtonGroup>);

		const labels = [...group(container).querySelectorAll("button")].map((b) => b.textContent);
		expect(labels).toEqual(["Save", "▼"]);
	});

	it("renders with no children at all", () => {
		const { container } = render(<ButtonGroup />);
		expect(group(container).children).toHaveLength(0);
	});

	it("merges a custom class onto the root", () => {
		const { container } = render(<ButtonGroup className="my-group" />);
		const root = group(container);

		expect(root.className).toContain("my-group");
		expect(root.className).toContain("ft-button-group");
	});

	it("declares the container border and radius that the seam depends on", () => {
		const { container } = render(<ButtonGroup />);
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

	// jsdom does not apply the colocated stylesheet, so the DOM half of the
	// seam contract (the root carries the border/radius, checked above, and
	// `data-orientation` flips, checked above) is verified through rendered
	// markup, and the CSS half — that a child gives up its own border and
	// corners, that the divider and the restored radius land on the
	// first/last child, and that the divider axis follows `data-orientation`
	// — is checked directly against the stylesheet below.
	it("declares a divider and a stripped radius for the first/last child, both orientations", () => {
		const source = stylesheet();

		// A child gives up its own border and corners...
		expect(source).toMatch(/\.ft-button-group > \* \{[^}]*border-style:\s*none/);
		expect(source).toMatch(/\.ft-button-group > \* \{[^}]*border-radius:\s*0/);
		// ...the divider runs left-to-right by default...
		expect(source).toMatch(/:not\(\[data-orientation="vertical"\]\) > \* \+ \* \{[^}]*border-left/);
		// ...and top-to-bottom once the orientation flips.
		expect(source).toMatch(/\[data-orientation="vertical"\] > \* \+ \* \{[^}]*border-top/);
		// The container's rounded ends are restored on the first and last
		// child only, mirrored for the vertical axis.
		expect(source).toMatch(/:first-child \{[^}]*border-top-left-radius:\s*inherit/);
		expect(source).toMatch(/:last-child \{[^}]*border-bottom-right-radius:\s*inherit/);
	});

	it("raises a focused child's stacking context so its ring isn't clipped by a neighbour", () => {
		expect(stylesheet()).toMatch(/:focus-visible \{[^}]*z-index:\s*1/);
	});

	it("publishes the orientation through context, live, for nested controls to read", () => {
		// One instance, re-rendered with a new prop — not two separate mounts —
		// so this only passes if the published context tracks the root's own
		// `orientation`. A frozen snapshot taken at mount would still read
		// "horizontal" here, since nothing about it is rebuilt.
		const { getByTestId, rerender } = render(<Harness />);
		expect(getByTestId("context-orientation").textContent).toBe("horizontal");

		rerender(<Harness orientation="vertical" />);
		expect(getByTestId("context-orientation").textContent).toBe("vertical");
	});

	it("degrades instead of throwing when read outside a group", () => {
		const { getByTestId } = render(<ContextProbe />);
		expect(getByTestId("context-orientation").textContent).toBe("none");
	});

	it("binds the root element", () => {
		let ref: HTMLDivElement | null = null;
		const { container } = render(
			<ButtonGroup
				ref={(node) => {
					ref = node;
				}}
			/>
		);

		expect(ref).toBe(group(container));
	});
});
