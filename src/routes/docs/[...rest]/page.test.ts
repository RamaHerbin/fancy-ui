import { describe, expect, it } from "vitest";
import { load } from "./+page.js";

describe("docs catch-all", () => {
	it("throws a 404 so unmatched /docs/* URLs render docs/+error inside the chrome", () => {
		let thrown: unknown;
		try {
			(load as () => void)();
		} catch (e) {
			thrown = e;
		}
		expect(thrown).toMatchObject({ status: 404 });
	});
});
