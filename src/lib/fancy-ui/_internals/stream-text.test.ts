import { afterEach, describe, it, expect, vi } from "vitest";
import { createTextStream, type StreamSegment } from "./stream-text.svelte.js";

// Segment ids are an implementation detail everywhere except the merge test,
// which checks them on purpose.
function shape(segments: StreamSegment[]): Array<{ text: string; fresh: boolean }> {
	return segments.map((s) => ({ text: s.text, fresh: s.fresh }));
}

describe("createTextStream", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("holds the initial text as one settled segment and schedules nothing", () => {
		vi.useFakeTimers();
		const stream = createTextStream("ready");

		expect(shape(stream.segments)).toEqual([{ text: "ready", fresh: false }]);
		expect(stream.text).toBe("ready");
		expect(vi.getTimerCount()).toBe(0);
	});

	it("appends one fresh segment per chunk, then merges them all once they settle", async () => {
		vi.useFakeTimers();
		const stream = createTextStream("", { settleMs: 100 });

		stream.push("Hel");
		stream.push("Hello wo");
		expect(shape(stream.segments)).toEqual([
			{ text: "Hel", fresh: true },
			{ text: "lo wo", fresh: true },
		]);
		expect(stream.text).toBe("Hello wo");
		const headId = stream.segments[0].id;

		await vi.advanceTimersByTimeAsync(100);
		expect(shape(stream.segments)).toEqual([{ text: "Hello wo", fresh: false }]);
		// The merged run keeps the first id, so the rendered span survives.
		expect(stream.segments[0].id).toBe(headId);
		expect(vi.getTimerCount()).toBe(0);
	});

	it("splits per chunk, not per word", () => {
		vi.useFakeTimers();
		const stream = createTextStream("", { settleMs: 100 });

		stream.push("two words at once");
		expect(shape(stream.segments)).toEqual([{ text: "two words at once", fresh: true }]);
	});

	it("reads a settleMs getter once per chunk, so a later duration reaches later chunks", async () => {
		vi.useFakeTimers();
		let settleMs = 100;
		const stream = createTextStream("", { settleMs: () => settleMs });

		stream.push("first");
		await vi.advanceTimersByTimeAsync(100);
		expect(shape(stream.segments)).toEqual([{ text: "first", fresh: false }]);

		settleMs = 1000;
		stream.push("first second");
		await vi.advanceTimersByTimeAsync(100);
		// Still animating: the chunk took the duration in force when it arrived,
		// not the one the stream was built with.
		expect(shape(stream.segments)).toEqual([
			{ text: "first", fresh: false },
			{ text: " second", fresh: true },
		]);

		await vi.advanceTimersByTimeAsync(900);
		expect(shape(stream.segments)).toEqual([{ text: "first second", fresh: false }]);
	});

	it("ignores a push of the text it already holds", () => {
		vi.useFakeTimers();
		const stream = createTextStream("", { settleMs: 100 });

		stream.push("same");
		const before = stream.segments;
		stream.push("same");

		expect(stream.segments).toBe(before);
		expect(vi.getTimerCount()).toBe(1);
	});

	it("replaces everything with settled text when a push is not a continuation", async () => {
		vi.useFakeTimers();
		const stream = createTextStream("", { settleMs: 100 });

		stream.push("Hello");
		stream.push("Bye");

		expect(shape(stream.segments)).toEqual([{ text: "Bye", fresh: false }]);
		expect(stream.text).toBe("Bye");
		// The settle timer of the discarded chunk is cancelled, not left to fire.
		expect(vi.getTimerCount()).toBe(0);

		await vi.advanceTimersByTimeAsync(500);
		expect(shape(stream.segments)).toEqual([{ text: "Bye", fresh: false }]);
	});

	it("settles everything immediately when animate is false", async () => {
		vi.useFakeTimers();
		const stream = createTextStream("Hel", { animate: false });

		stream.push("Hello");
		stream.push("Hello world");

		expect(shape(stream.segments)).toEqual([{ text: "Hello world", fresh: false }]);
		expect(vi.getTimerCount()).toBe(0);

		await vi.advanceTimersByTimeAsync(500);
		expect(shape(stream.segments)).toEqual([{ text: "Hello world", fresh: false }]);
	});

	it("drops pending settles on destroy, leaving no timer to fire", async () => {
		vi.useFakeTimers();
		const stream = createTextStream("", { settleMs: 100 });

		stream.push("Hello");
		const before = stream.segments;
		stream.destroy();

		expect(vi.getTimerCount()).toBe(0);

		// Nothing fires, so the chunk stays exactly as it was — same array, even.
		await vi.advanceTimersByTimeAsync(500);
		expect(stream.segments).toBe(before);
	});

	it("starts over from reset, cancelling any pending settle", async () => {
		vi.useFakeTimers();
		const stream = createTextStream("", { settleMs: 100 });

		stream.push("Hello");
		stream.reset("Fresh start");

		expect(shape(stream.segments)).toEqual([{ text: "Fresh start", fresh: false }]);
		expect(stream.text).toBe("Fresh start");
		expect(vi.getTimerCount()).toBe(0);

		stream.reset();
		expect(stream.segments).toEqual([]);
		expect(stream.text).toBe("");

		await vi.advanceTimersByTimeAsync(500);
		expect(stream.segments).toEqual([]);
	});
});
