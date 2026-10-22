// @vitest-environment node
import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import LostInSpace from "./LostInSpace.svelte";

describe("LostInSpace (SSR)", () => {
	it("renders the teleport link to the index and no canvas or counter", () => {
		const { body } = render(LostInSpace);
		expect(body).toMatch(/<a data-egg="teleport" href="\/docs\/components"/);
		expect(body).not.toContain("<canvas");
		expect(body).not.toContain("secrets found");
	});
});
