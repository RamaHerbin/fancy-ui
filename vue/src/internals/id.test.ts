import { describe, it, expect, vi, afterEach } from "vitest";
import { uid } from "./id";

describe("uid", () => {
	it("uses the default 'fui' prefix", () => {
		expect(uid()).toMatch(/^fui-\d+$/);
	});

	it("uses a custom prefix", () => {
		expect(uid("tooltip")).toMatch(/^tooltip-\d+$/);
	});

	it("never returns the same id twice", () => {
		const first = uid();
		const second = uid();
		expect(first).not.toBe(second);
	});

	it("keeps incrementing across different prefixes", () => {
		const a = uid("a");
		const b = uid("b");
		const aNumber = Number(a.split("-")[1]);
		const bNumber = Number(b.split("-")[1]);
		expect(bNumber).toBe(aNumber + 1);
	});

	describe("SSR guard", () => {
		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it("throws instead of generating an id when `window` is unavailable", () => {
			vi.stubGlobal("window", undefined);
			expect(() => uid()).toThrow(/client-only/);
		});
	});
});
