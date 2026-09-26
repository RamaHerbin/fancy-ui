import { afterEach, describe, expect, it, vi } from "vitest";
import { canVibrate, HAPTIC_PATTERNS, vibrate } from "./haptics.js";

function stubVibrate(impl: (pattern: number | number[]) => boolean) {
	Object.defineProperty(navigator, "vibrate", {
		value: impl,
		configurable: true,
		writable: true,
	});
}

function removeVibrate() {
	// jsdom's navigator has no `vibrate` at all by default — this restores
	// that baseline between tests.
	Reflect.deleteProperty(navigator, "vibrate");
}

describe("canVibrate", () => {
	afterEach(removeVibrate);

	it("is false when navigator.vibrate is not a function (jsdom's default)", () => {
		expect(canVibrate()).toBe(false);
	});

	it("is true once navigator.vibrate is a function", () => {
		stubVibrate(() => true);
		expect(canVibrate()).toBe(true);
	});
});

describe("vibrate", () => {
	afterEach(removeVibrate);

	it("returns false, without throwing, when unsupported", () => {
		expect(() => vibrate("light")).not.toThrow();
		expect(vibrate("light")).toBe(false);
	});

	it("resolves a named pattern to its numeric/array value", () => {
		const spy = vi.fn(() => true);
		stubVibrate(spy);

		vibrate("light");
		expect(spy).toHaveBeenLastCalledWith(HAPTIC_PATTERNS.light);

		vibrate("success");
		expect(spy).toHaveBeenLastCalledWith([...HAPTIC_PATTERNS.success]);

		vibrate("error");
		expect(spy).toHaveBeenLastCalledWith([...HAPTIC_PATTERNS.error]);
	});

	it("passes a raw number or array straight through", () => {
		const spy = vi.fn(() => true);
		stubVibrate(spy);

		vibrate(42);
		expect(spy).toHaveBeenLastCalledWith(42);

		vibrate([5, 5, 5]);
		expect(spy).toHaveBeenLastCalledWith([5, 5, 5]);
	});

	it("returns navigator.vibrate's own return value", () => {
		stubVibrate(() => false);
		expect(vibrate("light")).toBe(false);

		stubVibrate(() => true);
		expect(vibrate("light")).toBe(true);
	});

	it("coerces a non-boolean-but-truthy-outcome return (e.g. undefined) to true rather than returning it verbatim", () => {
		// lib.dom types `navigator.vibrate` as always returning `boolean`, but
		// nothing in the spec actually guarantees that — a real UA is free to
		// return `undefined` on success. `vibrate()`'s own return type is
		// `boolean`, so it must coerce rather than pass the raw value through.
		stubVibrate(() => undefined as unknown as boolean);
		expect(vibrate("light")).toBe(true);
	});

	it("a throwing navigator.vibrate still returns false and never propagates", () => {
		stubVibrate(() => {
			throw new Error("denied by policy");
		});
		expect(() => vibrate("heavy")).not.toThrow();
		expect(vibrate("heavy")).toBe(false);
	});
});
