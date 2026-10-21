import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StoryNode, StoryThread } from "./index.js";
import type { StoryThreadProps } from "./index.js";
import { sound } from "../../sound/sound.js";

function Harness(props: Omit<StoryThreadProps, "children">) {
	return (
		<StoryThread {...props}>
			<section>
				<p>One</p>
				<StoryNode id="one" />
			</section>
			<section>
				<p>Two</p>
				<StoryNode id="two" variant="ring" style={{ top: "40%" }} />
			</section>
		</StoryThread>
	);
}

describe("StoryThread", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("renders a named, focusable region around the story", () => {
		const { container } = render(<Harness ariaLabel="My path" />);
		const root = container.querySelector(".st-root")!;
		expect(root.getAttribute("role")).toBe("region");
		expect(root.getAttribute("aria-label")).toBe("My path");
		expect(root.getAttribute("tabindex")).toBe("0");
		expect(root.textContent).toContain("One");
		expect(root.textContent).toContain("Two");
	});

	it("keeps the thread out of the accessibility tree", () => {
		const { container } = render(<Harness />);
		expect(container.querySelector(".st-svg")!.getAttribute("aria-hidden")).toBe("true");
		container.querySelectorAll("[data-story-node]").forEach((node) => {
			expect(node.getAttribute("aria-hidden")).toBe("true");
		});
	});

	it("draws the thread through the nodes once mounted", () => {
		const { container } = render(<Harness layout="vertical" />);
		const root = container.querySelector<HTMLElement>(".st-root")!;
		expect(root.dataset.layout).toBe("vertical");
		expect(container.querySelectorAll(".st-bright")).toHaveLength(1);
		expect(container.querySelectorAll(".st-head")).toHaveLength(1);
	});

	it("gives every instance its own mask ids", () => {
		const a = render(<Harness layout="vertical" />);
		const b = render(<Harness layout="vertical" />);
		const ids = [a.container, b.container].flatMap((c) =>
			[...c.querySelectorAll("mask")].map((m) => m.id)
		);
		expect(ids).toHaveLength(2);
		expect(new Set(ids).size).toBe(2);
	});

	it("passes node attributes through and tags the variant", () => {
		const { container } = render(<Harness />);
		const two = container.querySelector<HTMLElement>('[data-story-node="two"]')!;
		expect(two.dataset.variant).toBe("ring");
		expect(two.getAttribute("style")).toContain("top: 40%");
	});

	it("is silent by default", () => {
		const play = vi.spyOn(sound, "play");
		render(<Harness layout="vertical" />);
		expect(play).not.toHaveBeenCalled();
	});
});
