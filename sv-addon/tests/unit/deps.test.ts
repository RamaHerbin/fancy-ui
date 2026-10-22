import { describe, expect, it } from "vitest";
import { fancyDependencyToAdd, isBelowSvelte520, majorOf } from "../../src/deps";

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

	it("isBelowSvelte520", () => {
		expect(isBelowSvelte520("5.19.3")).toBe(true);
		expect(isBelowSvelte520("5.20.0")).toBe(false);
		expect(isBelowSvelte520("5.45.0")).toBe(false);
		expect(isBelowSvelte520(undefined)).toBe(false);
	});
});
