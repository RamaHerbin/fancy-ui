import { render, cleanup } from "@testing-library/vue";
import { h } from "vue";
import { afterEach, describe, it, expect, vi } from "vitest";
import StoryThread from "./StoryThread.vue";
import StoryNode from "./StoryNode.vue";
import { sound } from "../../sound/sound.js";

function story(props: Record<string, unknown> = {}) {
	return render(StoryThread, {
		props,
		slots: {
			default: () => [
				h("section", [h("p", "One"), h(StoryNode, { id: "one" })]),
				h("section", [
					h("p", "Two"),
					h(StoryNode, { id: "two", variant: "ring", style: "top: 40%" }),
				]),
			],
		},
	});
}

describe("StoryThread", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("renders a named, focusable region around the story", () => {
		const { container } = story({ ariaLabel: "My path" });
		const root = container.querySelector(".st-root")!;
		expect(root.getAttribute("role")).toBe("region");
		expect(root.getAttribute("aria-label")).toBe("My path");
		expect(root.getAttribute("tabindex")).toBe("0");
		expect(root.textContent).toContain("One");
		expect(root.textContent).toContain("Two");
	});

	it("keeps the thread out of the accessibility tree", () => {
		const { container } = story();
		expect(container.querySelector(".st-svg")!.getAttribute("aria-hidden")).toBe("true");
		container.querySelectorAll("[data-story-node]").forEach((node) => {
			expect(node.getAttribute("aria-hidden")).toBe("true");
		});
	});

	it("draws the thread through the nodes once mounted", () => {
		const { container } = story({ layout: "vertical" });
		const root = container.querySelector<HTMLElement>(".st-root")!;
		expect(root.dataset.layout).toBe("vertical");
		expect(container.querySelectorAll(".st-bright")).toHaveLength(1);
		expect(container.querySelectorAll(".st-head")).toHaveLength(1);
	});

	it("gives every instance its own mask ids", () => {
		const a = story({ layout: "vertical" });
		const b = story({ layout: "vertical" });
		const ids = [a.container, b.container].flatMap((c) =>
			[...c.querySelectorAll("mask")].map((m) => m.id)
		);
		expect(ids).toHaveLength(2);
		expect(new Set(ids).size).toBe(2);
	});

	it("passes node attributes through and tags the variant", () => {
		const { container } = story();
		const two = container.querySelector<HTMLElement>('[data-story-node="two"]')!;
		expect(two.dataset.variant).toBe("ring");
		expect(two.getAttribute("style")).toContain("top: 40%");
	});

	it("keeps the managed node attributes over colliding ones", () => {
		const { container } = render(StoryNode, {
			props: { id: "real" },
			attrs: { "data-story-node": "fake", "aria-hidden": "false", class: "extra" },
		});
		const node = container.querySelector<HTMLElement>(".st-node")!;
		expect(node.dataset.storyNode).toBe("real");
		expect(node.getAttribute("aria-hidden")).toBe("true");
		expect(node.classList.contains("extra")).toBe(true);
	});

	it("is silent by default", () => {
		const play = vi.spyOn(sound, "play");
		story({ layout: "vertical" });
		expect(play).not.toHaveBeenCalled();
	});
});
