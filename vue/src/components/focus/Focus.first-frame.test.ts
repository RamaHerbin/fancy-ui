import { render, cleanup } from "@testing-library/vue";
import { afterEach, describe, it, expect, vi } from "vitest";
import { nextTick } from "vue";
import Focus from "./Focus.vue";

describe("Focus first frame", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("places the frame without a transition, then switches transitions on one frame later", async () => {
		vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "setInterval"] });
		const { container } = render(Focus, { props: { sentence: "A B" } });
		const frame = container.querySelector(".focus-frame") as HTMLElement;
		// Not the flying-in-from-the-corner state: no transition on the first paint.
		expect(frame.style.transition).toBe("none");
		vi.advanceTimersByTime(32);
		await nextTick();
		expect(frame.style.transition).toBe("");
	});
});
