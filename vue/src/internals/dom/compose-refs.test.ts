import { ref } from "vue";
import { describe, it, expect, vi } from "vitest";
import { composeRefs } from "./compose-refs.js";

describe("composeRefs", () => {
	it("calls a function ref with the node", () => {
		const fn = vi.fn();
		const node = document.createElement("div");

		composeRefs(fn)(node);
		expect(fn).toHaveBeenCalledWith(node);
	});

	it("writes a node onto a ref sink", () => {
		const sink = ref<HTMLElement | null>(null);
		const node = document.createElement("div");

		composeRefs(sink)(node);
		expect(sink.value).toBe(node);

		composeRefs(sink)(null);
		expect(sink.value).toBeNull();
	});

	it("skips nullish entries", () => {
		const node = document.createElement("div");
		expect(() => composeRefs(null, undefined)(node)).not.toThrow();
	});

	it("publishes the node to every sink, and null on detach", () => {
		const fn = vi.fn();
		const sink = ref<HTMLElement | null>(null);
		const composed = composeRefs(fn, sink, null, undefined);
		const node = document.createElement("div");

		composed(node);
		expect(fn).toHaveBeenCalledWith(node);
		expect(sink.value).toBe(node);

		composed(null);
		expect(fn).toHaveBeenLastCalledWith(null);
		expect(sink.value).toBeNull();
	});

	it("calls sinks in argument order", () => {
		const order: string[] = [];
		const a = vi.fn(() => order.push("a"));
		const b = vi.fn(() => order.push("b"));
		const node = document.createElement("div");

		composeRefs(a, b)(node);
		expect(order).toEqual(["a", "b"]);
	});
});
