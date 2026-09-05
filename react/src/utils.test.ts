import { cn } from "./utils.js";

describe("cn", () => {
	it("merges conflicting Tailwind classes, last wins", () => {
		expect(cn("px-2", "px-4")).toBe("px-4");
	});
	it("drops falsy inputs", () => {
		expect(cn("a", false && "b", undefined, "c")).toBe("a c");
	});
});
