import { render, cleanup } from "@testing-library/vue";
import { defineComponent, effectScope, h, nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTextStream } from "./use-text-stream.js";
import type { UseTextStream, UseTextStreamOptions } from "./use-text-stream.js";

const shape = (stream: UseTextStream) =>
	stream.segments.map((s) => ({ text: s.text, fresh: s.fresh }));

/** Mounts `useTextStream` in a real component scope and hands the state back. */
function mountStream(initial = "", opts: UseTextStreamOptions = {}) {
	let state!: UseTextStream;
	const Harness = defineComponent({
		setup() {
			state = useTextStream(initial, opts);
			return () => h("div", state.segments.map((s) => h("span", { key: s.id }, s.text)));
		},
	});
	const { unmount } = render(Harness);
	return { state, unmount };
}

describe("useTextStream", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("exposes exactly the surface the law specifies", () => {
		const { state } = mountStream("");
		expect(Object.keys(state).sort()).toEqual([
			"done",
			"flush",
			"push",
			"reset",
			"segments",
			"text",
		]);
		// `destroy()` belongs to the composable (D-V12); handing it out would let a
		// consumer cancel the settle timers and strand the last delta as fresh.
		expect("destroy" in state).toBe(false);
	});

	it("lands the initial text already settled, scheduling nothing", () => {
		vi.useFakeTimers();
		const { state } = mountStream("Hello world");

		expect(state.text).toBe("Hello world");
		expect(shape(state)).toEqual([{ text: "Hello world", fresh: false }]);
		expect(state.done).toBe(true);
		expect(vi.getTimerCount()).toBe(0);
	});

	it("marks only the delta fresh, and re-renders the component that reads it", async () => {
		vi.useFakeTimers();
		const { state } = mountStream("Hello", { settleMs: 100 });

		state.push("Hello, world");
		await nextTick();
		expect(shape(state)).toEqual([
			{ text: "Hello", fresh: false },
			{ text: ", world", fresh: true },
		]);
		expect(state.done).toBe(false);

		await vi.advanceTimersByTimeAsync(100);
		expect(shape(state)).toEqual([{ text: "Hello, world", fresh: false }]);
		expect(state.done).toBe(true);
	});

	describe("done", () => {
		it("is true on an empty stream and false only while something animates", async () => {
			vi.useFakeTimers();
			const { state } = mountStream("", { settleMs: 100 });
			expect(state.done).toBe(true);

			state.push("a");
			expect(state.done).toBe(false);
			state.push("ab");
			expect(state.done).toBe(false);

			// Two deltas, two timers: done only flips once the last one has settled.
			await vi.advanceTimersByTimeAsync(99);
			expect(state.done).toBe(false);
			await vi.advanceTimersByTimeAsync(100);
			expect(state.done).toBe(true);
		});

		it("stays true when the animation is switched off entirely", () => {
			vi.useFakeTimers();
			const { state } = mountStream("", { animate: false });

			state.push("Hello");
			expect(state.done).toBe(true);
			expect(shape(state)).toEqual([{ text: "Hello", fresh: false }]);
			expect(vi.getTimerCount()).toBe(0);
		});

		it("is true again after a non-continuation push replaces the text", () => {
			vi.useFakeTimers();
			const { state } = mountStream("Draft", { settleMs: 100 });

			state.push("Draft answer");
			expect(state.done).toBe(false);

			state.push("A different answer");
			expect(state.done).toBe(true);
			expect(shape(state)).toEqual([{ text: "A different answer", fresh: false }]);
		});
	});

	describe("flush", () => {
		it("settles every fresh segment at once and cancels their timers", () => {
			vi.useFakeTimers();
			const { state } = mountStream("Hello", { settleMs: 100 });

			state.push("Hello,");
			state.push("Hello, world");
			expect(vi.getTimerCount()).toBe(2);

			state.flush();

			expect(vi.getTimerCount()).toBe(0);
			expect(state.done).toBe(true);
			// Settled neighbours fold together, exactly as a natural settle does.
			expect(shape(state)).toEqual([{ text: "Hello, world", fresh: false }]);
			expect(state.text).toBe("Hello, world");
		});

		it("re-renders the component that reads the segments", async () => {
			vi.useFakeTimers();
			const { state } = mountStream("Hello", { settleMs: 100 });

			state.push("Hello, world");
			await nextTick();
			state.flush();
			await nextTick();
			expect(shape(state)).toEqual([{ text: "Hello, world", fresh: false }]);
		});

		it("leaves no timer behind to un-settle what it just settled", async () => {
			vi.useFakeTimers();
			const { state } = mountStream("Hello", { settleMs: 100 });

			state.push("Hello, world");
			state.flush();

			await vi.advanceTimersByTimeAsync(500);
			expect(shape(state)).toEqual([{ text: "Hello, world", fresh: false }]);
			expect(state.done).toBe(true);
		});

		it("is a no-op on an already-settled stream", () => {
			vi.useFakeTimers();
			const { state } = mountStream("Hello world");
			const before = state.segments;

			state.flush();

			expect(state.segments).toBe(before);
			expect(state.done).toBe(true);
		});

		it("keeps streaming normally afterwards", async () => {
			vi.useFakeTimers();
			const { state } = mountStream("Hello", { settleMs: 100 });

			state.push("Hello, world");
			state.flush();
			state.push("Hello, world!");

			expect(shape(state)).toEqual([
				{ text: "Hello, world", fresh: false },
				{ text: "!", fresh: true },
			]);

			await vi.advanceTimersByTimeAsync(100);
			expect(shape(state)).toEqual([{ text: "Hello, world!", fresh: false }]);
		});
	});

	it("reads settleMs per push, so a later duration reaches a later chunk", async () => {
		vi.useFakeTimers();
		let settle = 100;
		const { state } = mountStream("a", { settleMs: () => settle });

		state.push("ab");
		settle = 500;
		state.push("abc");

		// The first chunk settles on its 100ms and folds into its settled
		// neighbour; the second is still on the 500ms read at its own push.
		await vi.advanceTimersByTimeAsync(100);
		expect(shape(state)).toEqual([
			{ text: "ab", fresh: false },
			{ text: "c", fresh: true },
		]);

		await vi.advanceTimersByTimeAsync(400);
		expect(state.done).toBe(true);
	});

	it("cancels pending settles when the scope ends", async () => {
		vi.useFakeTimers();
		const { state, unmount } = mountStream("Hello", { settleMs: 100 });

		state.push("Hello, world");
		expect(vi.getTimerCount()).toBe(1);

		unmount();
		expect(vi.getTimerCount()).toBe(0);
		await vi.advanceTimersByTimeAsync(500);
	});

	it("is disposed by a plain effect scope too, not only by a component", () => {
		vi.useFakeTimers();
		const scope = effectScope();
		const state = scope.run(() => useTextStream("Hello", { settleMs: 100 }))!;

		state.push("Hello, world");
		expect(vi.getTimerCount()).toBe(1);

		scope.stop();
		expect(vi.getTimerCount()).toBe(0);
	});
});
