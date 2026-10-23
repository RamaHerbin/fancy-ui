import { describe, expect, it } from "vitest";
import { fancyDependencyToAdd, isBelowFloor, majorOf } from "../../src/deps";

describe("fancyDependencyToAdd", () => {
	it("adds the caret range when the project does not declare the package", () => {
		expect(fancyDependencyToAdd(undefined, "0.17.0")).toBe("^0.17.0");
	});

	it.each(["0.18.0", "0.16.2", "file:../fancy-ui-svelte.tgz", "workspace:*", "latest"])(
		"keeps an existing declaration (%s)",
		(declared) => {
			expect(fancyDependencyToAdd(declared, "0.17.0")).toBeNull();
		}
	);
});

describe("version helpers", () => {
	it("majorOf", () => {
		expect(majorOf("5.45.0")).toBe(5);
		expect(majorOf("4.1.17")).toBe(4);
		expect(majorOf(">=3")).toBe(3);
		expect(majorOf("next")).toBeNull();
		expect(majorOf(undefined)).toBeNull();
	});

	it("isBelowFloor", () => {
		expect(isBelowFloor("5.19.3", "^5.20.0")).toBe(true);
		expect(isBelowFloor("^5.0.0", "^5.20.0")).toBe(true);
		expect(isBelowFloor("4.2.0", "^5.20.0")).toBe(true);
		expect(isBelowFloor("5.20.0", "^5.20.0")).toBe(false);
		expect(isBelowFloor("5.45.0", "^5.20.0")).toBe(false);
		expect(isBelowFloor("6.0.0", "^5.20.0")).toBe(false);
		for (const r of [undefined, "catalog:", "workspace:*", "latest", "5"])
			expect(isBelowFloor(r, "^5.20.0")).toBe(false);
	});

	it("the injected peer range is the root package's", () => {
		expect(__SVELTE_PEER__).toMatch(/^\^5\.\d+\.\d+$/);
	});
});
