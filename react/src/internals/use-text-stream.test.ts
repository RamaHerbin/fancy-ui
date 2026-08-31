import { StrictMode, useEffect } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { renderHook, cleanup, act } from "@testing-library/react";
import { createTextStream, useTextStream } from "./use-text-stream.js";
import type { StreamSegment } from "./use-text-stream.js";

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
		const headId = stream.segments[0]?.id;

		await vi.advanceTimersByTimeAsync(100);
		expect(shape(stream.segments)).toEqual([{ text: "Hello wo", fresh: false }]);
		// The merged run keeps the first id, so the rendered span survives.
		expect(stream.segments[0]?.id).toBe(headId);
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
		// Still animating: the chunk took the duration in force when it
		// arrived, not the one the stream was built with.
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
		// The settle timer of the discarded chunk is cancelled, not left to
		// fire.
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

		// Nothing fires, so the chunk stays exactly as it was — same array,
		// even.
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

	// `resume` is the React-only half of `destroy`: an effect that is torn
	// down and replayed without an unmount has to be able to put back what
	// the teardown cancelled.
	it("resume re-arms a settle that destroy cancelled", async () => {
		vi.useFakeTimers();
		const stream = createTextStream("", { settleMs: 100 });

		stream.push("Hello");
		stream.destroy();
		expect(vi.getTimerCount()).toBe(0);

		stream.resume();
		expect(vi.getTimerCount()).toBe(1);
		expect(shape(stream.segments)).toEqual([{ text: "Hello", fresh: true }]);

		await vi.advanceTimersByTimeAsync(100);
		expect(shape(stream.segments)).toEqual([{ text: "Hello", fresh: false }]);
	});

	it("resume leaves a stream with timers still in flight alone", () => {
		vi.useFakeTimers();
		const stream = createTextStream("", { settleMs: 100 });

		stream.push("Hel");
		stream.push("Hello");
		expect(vi.getTimerCount()).toBe(2);

		stream.resume();
		// No second timer per segment: a live stream is not a cancelled one.
		expect(vi.getTimerCount()).toBe(2);
	});

	it("resume is a no-op with nothing fresh, and when animation is off", () => {
		vi.useFakeTimers();
		const idle = createTextStream("ready", { settleMs: 100 });
		idle.resume();
		expect(vi.getTimerCount()).toBe(0);

		const unanimated = createTextStream("", { animate: false });
		unanimated.push("Hello");
		unanimated.resume();
		expect(vi.getTimerCount()).toBe(0);
	});

	it("flush settles every fresh segment immediately and cancels their timers", () => {
		vi.useFakeTimers();
		const stream = createTextStream("", { settleMs: 100 });

		stream.push("Hel");
		stream.push("Hello");
		expect(vi.getTimerCount()).toBe(2);

		stream.flush();
		expect(shape(stream.segments)).toEqual([{ text: "Hello", fresh: false }]);
		expect(vi.getTimerCount()).toBe(0);
	});
});

/*
 * Hook layer. `useTextStream` builds one `createTextStream` per component
 * instance and subscribes to it; `destroy()` moves to the hook's own
 * cleanup (D-5).
 */

describe("useTextStream", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("renders the initial text as one settled segment", () => {
		const { result } = renderHook(() => useTextStream("ready"));

		expect(shape(result.current.segments)).toEqual([{ text: "ready", fresh: false }]);
		expect(result.current.text).toBe("ready");
		expect(result.current.done).toBe(true);
	});

	it("re-renders with a fresh segment on push, then settles and reports done", async () => {
		vi.useFakeTimers();
		const { result } = renderHook(() => useTextStream("", { settleMs: 100 }));

		act(() => {
			result.current.push("Hello");
		});
		expect(shape(result.current.segments)).toEqual([{ text: "Hello", fresh: true }]);
		expect(result.current.done).toBe(false);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(100);
		});
		expect(shape(result.current.segments)).toEqual([{ text: "Hello", fresh: false }]);
		expect(result.current.done).toBe(true);
	});

	it("flush settles immediately and reports done without waiting", () => {
		vi.useFakeTimers();
		const { result } = renderHook(() => useTextStream("", { settleMs: 100 }));

		act(() => {
			result.current.push("Hello");
		});
		expect(result.current.done).toBe(false);

		act(() => {
			result.current.flush();
		});
		expect(result.current.done).toBe(true);
		expect(shape(result.current.segments)).toEqual([{ text: "Hello", fresh: false }]);
	});

	/*
	 * The shape every consumer of this hook has: the text arrives from a
	 * mount effect. StrictMode rehearses that as mount / cleanup / mount, and
	 * the hook's own cleanup cancels the settle timer in between. The
	 * replayed push is a no-op — the full text is already stored — so unless
	 * the second mount re-arms the settle, the chunk stays `fresh` for ever,
	 * `done` never turns true and the enter animation never ends.
	 */
	it("still settles a chunk pushed from a mount effect under StrictMode", async () => {
		vi.useFakeTimers();
		const { result } = renderHook(
			() => {
				const stream = useTextStream("", { settleMs: 100 });
				useEffect(() => {
					stream.push("Hello");
					// The push is deliberately mount-only: re-pushing on every
					// render would hide the bug this pins.
					// eslint-disable-next-line react-hooks/exhaustive-deps
				}, []);
				return stream;
			},
			{ wrapper: StrictMode }
		);

		expect(shape(result.current.segments)).toEqual([{ text: "Hello", fresh: true }]);
		expect(result.current.done).toBe(false);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(100);
		});
		expect(shape(result.current.segments)).toEqual([{ text: "Hello", fresh: false }]);
		expect(result.current.done).toBe(true);
	});

	it("destroys the stream on unmount, cancelling a pending settle", () => {
		vi.useFakeTimers();
		const { result, unmount } = renderHook(() => useTextStream("", { settleMs: 100 }));

		act(() => {
			result.current.push("Hello");
		});
		expect(vi.getTimerCount()).toBe(1);

		unmount();
		expect(vi.getTimerCount()).toBe(0);
	});
});
