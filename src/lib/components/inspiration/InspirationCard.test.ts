import { cleanup, fireEvent, render, within } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import InspirationCard from "./InspirationCard.svelte";
import { liveStage } from "./live-stage.svelte.js";
import type { ExternalReference, FancyUIReference } from "$lib/inspiration/types.js";

function fancy(slug: string): FancyUIReference {
	return {
		id: slug,
		slug,
		origin: "fancyui",
		title: `Button — ${slug}`,
		summary: "A button.",
		kind: "interaction",
		creator: "FancyUI",
		sourceUrl: `/docs/components/${slug}`,
		addedAt: "2026-09-26",
		verifiedAt: "2026-10-03",
		status: "published",
		interactionTags: ["hover"],
		styleTags: ["glow"],
		useCaseTags: ["marketing"],
		codeAvailability: "open-source",
		analysis: { why: "w", whenToUse: "u", watch: "x", clues: ["a"] },
		components: [{ slug, relation: "exact" }],
		demo: { module: "does-not-exist" },
	};
}

const poster = { src: "/inspiration/a.webp", width: 720, height: 450, alt: "A — preview" };

function props(entry: FancyUIReference | ExternalReference, over: Record<string, unknown> = {}) {
	return {
		entry,
		index: 0,
		poster,
		frameworks: ["svelte", "react"] as ("svelte" | "react" | "vue")[],
		saved: false,
		onToggleSaved: vi.fn(),
		...over,
	};
}

describe("InspirationCard", () => {
	afterEach(() => {
		cleanup();
		liveStage.release(liveStage.active ?? "");
	});

	it("gives the poster intrinsic dimensions and lazy loading", () => {
		const { container } = render(InspirationCard, props(fancy("magnetic")));
		const img = container.querySelector("img")!;
		expect(img).toHaveAttribute("width", "720");
		expect(img).toHaveAttribute("height", "450");
		expect(img).toHaveAttribute("loading", "lazy");
	});

	it("never nests interactive elements inside the link", () => {
		const { container } = render(InspirationCard, props(fancy("magnetic")));
		expect(container.querySelectorAll("a a, a button, button a, button button")).toHaveLength(0);
		const link = container.querySelector("h3 a")!;
		expect(link).toHaveAttribute("href", "/inspiration/magnetic");
	});

	it("greys absent frameworks instead of hiding them", () => {
		const { container } = render(InspirationCard, props(fancy("magnetic")));
		const badges = container.querySelectorAll(".fws > span[aria-hidden]");
		expect([...badges].map((b) => b.textContent)).toEqual(["R", "S", "V"]);
		expect(badges[2]).not.toHaveAttribute("data-on");
	});

	it("saves without navigating", async () => {
		const onToggleSaved = vi.fn();
		const entry = fancy("magnetic");
		const { getByRole } = render(InspirationCard, props(entry, { onToggleSaved }));
		const save = getByRole("button", { name: "Save Button — magnetic" });
		const click = new MouseEvent("click", { bubbles: true, cancelable: true });
		save.dispatchEvent(click);
		expect(onToggleSaved).toHaveBeenCalledWith(entry);
		expect(click.defaultPrevented).toBe(true);
	});

	it("releases the stage when a playing card unmounts", async () => {
		const card = render(InspirationCard, props(fancy("gone")));
		await fireEvent.click(
			within(card.container).getByRole("button", { name: "Preview Button — gone" })
		);
		expect(liveStage.active).toBe("gone");
		card.unmount();
		expect(liveStage.active).toBeNull();
	});

	it("claims the live stage on Play, and a second card's claim takes it over", async () => {
		const a = within(render(InspirationCard, props(fancy("first"), { eager: true })).container);
		const b = within(
			render(InspirationCard, props(fancy("second"), { eager: true, index: 1 })).container
		);
		const playA = a.getByRole("button", { name: "Preview Button — first" });
		const playB = b.getByRole("button", { name: "Preview Button — second" });
		await fireEvent.click(playA);
		expect(liveStage.active).toBe("first");
		expect(playA).toHaveAttribute("aria-pressed", "true");
		await fireEvent.click(playB);
		expect(liveStage.active).toBe("second");
		expect(playA).toHaveAttribute("aria-pressed", "false");
		expect(playB).toHaveAttribute("aria-pressed", "true");
		await fireEvent.click(playB);
		expect(liveStage.active).toBeNull();
	});

	it("has no play button for an external reference and badges it", () => {
		const external: ExternalReference = {
			...fancy("ext"),
			demo: undefined,
			origin: "external",
			codeAvailability: "paid",
			sourceUrl: "https://example.test",
		};
		const { queryByRole, getByText } = render(
			InspirationCard,
			props(external, { poster: null, frameworks: [] })
		);
		expect(queryByRole("button", { name: /^Preview/ })).toBeNull();
		expect(getByText("EXTERNAL")).toBeInTheDocument();
	});
});
