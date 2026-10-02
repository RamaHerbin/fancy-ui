import { render, cleanup } from "@testing-library/vue";
import { afterEach, describe, it, expect, vi } from "vitest";
import { nextTick } from "vue";
import Focus from "./Focus.vue";

describe("Focus", () => {
	afterEach(cleanup);

	it("renders the component", () => {
		const { container } = render(Focus);
		const wrapper = container.querySelector(".focus-container");
		expect(wrapper).toBeInTheDocument();
	});

	it("splits sentence into words", () => {
		const { container } = render(Focus, {
			props: { sentence: "Hello World Test" },
		});
		const words = container.querySelectorAll(".focus-word");
		expect(words.length).toBe(3);
	});

	it("renders default sentence", () => {
		const { container } = render(Focus);
		const words = container.querySelectorAll(".focus-word");
		expect(words.length).toBe(2); // "Fancy" "Focus"
	});

	it("renders focus frame with corners", () => {
		const { container } = render(Focus);
		const frame = container.querySelector(".focus-frame");
		expect(frame).toBeInTheDocument();
		const corners = container.querySelectorAll(".corner");
		expect(corners.length).toBe(4);
	});

	it("applies custom border color", () => {
		const { container } = render(Focus, { props: { borderColor: "red" } });
		const word = container.querySelector(".focus-word") as HTMLElement;
		expect(word.style.getPropertyValue("--border-color")).toBe("red");
	});

	it("applies custom class", () => {
		const { container } = render(Focus, { props: { class: "my-focus" } });
		const wrapper = container.querySelector(".focus-container");
		expect(wrapper?.className).toContain("my-focus");
	});

	it("blurs non-active words", () => {
		const { container } = render(Focus, {
			props: { sentence: "A B", blurAmount: 8 },
		});
		const words = container.querySelectorAll(".focus-word");
		// Second word should be blurred
		expect((words[1] as HTMLElement).style.filter).toBe("blur(8px)");
	});

	// Upstream fix (PR #262 review): toggling manualMode after mount starts or
	// stops the auto-cycle instead of keeping the mount-time decision.
	describe("manualMode changes after mount", () => {
		afterEach(() => {
			vi.useRealTimers();
		});

		const blurOf = (container: Element, i: number) =>
			(container.querySelectorAll(".focus-word")[i] as HTMLElement).style.filter;

		it("stops cycling when switched to manual mode", async () => {
			vi.useFakeTimers();
			const { container, rerender } = render(Focus, {
				props: { sentence: "A B C", animationDuration: 0.5, pauseBetweenAnimations: 0.5 },
			});
			await vi.advanceTimersByTimeAsync(1000);
			expect(blurOf(container, 1)).toBe("blur(0px)");

			await rerender({ sentence: "A B C", manualMode: true });
			await nextTick();
			expect(blurOf(container, 0)).toBe("blur(0px)");
			expect(vi.getTimerCount()).toBe(0);

			await vi.advanceTimersByTimeAsync(3000);
			expect(blurOf(container, 0)).toBe("blur(0px)");
		});

		it("starts cycling when switched from manual to automatic mode", async () => {
			vi.useFakeTimers();
			const { container, rerender } = render(Focus, {
				props: {
					sentence: "A B C",
					manualMode: true,
					animationDuration: 0.5,
					pauseBetweenAnimations: 0.5,
				},
			});
			await vi.advanceTimersByTimeAsync(2000);
			expect(blurOf(container, 0)).toBe("blur(0px)");

			await rerender({
				sentence: "A B C",
				manualMode: false,
				animationDuration: 0.5,
				pauseBetweenAnimations: 0.5,
			});
			await vi.advanceTimersByTimeAsync(1000);
			expect(blurOf(container, 1)).toBe("blur(0px)");
		});
	});
});
