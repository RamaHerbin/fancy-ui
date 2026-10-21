import { describe, expect, it } from "vitest";
import { cardTags } from "./labels.js";
import type { Reference } from "$lib/inspiration/types.js";

function entry(styleTags: string[], interactionTags: string[] = ["hover"]): Reference {
	return { styleTags, interactionTags } as unknown as Reference;
}

describe("cardTags", () => {
	it("shows the first style, then the first interaction", () => {
		expect(cardTags(entry(["glow", "retro"]))).toEqual(["glow", "hover"]);
		expect(cardTags(entry([], []))).toEqual([]);
	});

	it("leads with hdr, then the first other style, wherever hdr is listed", () => {
		expect(cardTags(entry(["glow", "retro", "hdr"]))).toEqual(["hdr", "glow"]);
		expect(cardTags(entry(["hdr"]))).toEqual(["hdr", "hover"]);
	});
});
