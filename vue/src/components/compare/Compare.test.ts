import { render, cleanup, fireEvent } from "@testing-library/vue";
import { afterEach, describe, it, expect, vi } from "vitest";
import { nextTick } from "vue";
import Compare from "./Compare.vue";

describe("Compare", () => {
	afterEach(cleanup);

	it('renders a container with role="slider"', () => {
		const { container } = render(Compare);
		const slider = container.querySelector('[role="slider"]');
		expect(slider).toBeInTheDocument();
	});

	it("has overflow-hidden class", () => {
		const { container } = render(Compare);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("overflow-hidden");
	});

	it("renders image elements when image props are provided", () => {
		const { container } = render(Compare, {
			props: { firstImage: "/a.jpg", secondImage: "/b.jpg" },
		});
		const imgs = container.querySelectorAll("img");
		expect(imgs.length).toBeGreaterThanOrEqual(2);
	});

	it("sets correct src and alt on first image", () => {
		const { container } = render(Compare, {
			props: { firstImage: "/a.jpg", firstImageAlt: "Before" },
		});
		const imgs = container.querySelectorAll("img");
		const firstImg = Array.from(imgs).find((img) => img.getAttribute("alt") === "Before");
		expect(firstImg).toHaveAttribute("src", "/a.jpg");
	});

	it("sets correct src and alt on second image", () => {
		const { container } = render(Compare, {
			props: { secondImage: "/b.jpg", secondImageAlt: "After" },
		});
		const imgs = container.querySelectorAll("img");
		const secondImg = Array.from(imgs).find((img) => img.getAttribute("alt") === "After");
		expect(secondImg).toHaveAttribute("src", "/b.jpg");
	});

	it("applies custom class names", () => {
		const { container } = render(Compare, { props: { class: "my-compare" } });
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("my-compare");
	});

	it("has aria-valuenow set to initial slider percentage", () => {
		const { container } = render(Compare, {
			props: { initialSliderPercentage: 75 },
		});
		const slider = container.querySelector('[role="slider"]');
		expect(slider).toHaveAttribute("aria-valuenow", "75");
	});

	it("has aria-valuemin and aria-valuemax attributes", () => {
		const { container } = render(Compare);
		const slider = container.querySelector('[role="slider"]');
		expect(slider).toHaveAttribute("aria-valuemin", "0");
		expect(slider).toHaveAttribute("aria-valuemax", "100");
	});

	it("calls the lowercase callbacks passed as props; the @-spellings (onDragstart…) never reach them", async () => {
		const names = [
			"onpercentagechange",
			"ondragstart",
			"ondragend",
			"onhoverenter",
			"onhoverleave",
		];
		const lower = Object.fromEntries(names.map((n) => [n, vi.fn()]));
		// `@drag-start` / `@dragstart` compile to `onDragStart` / `onDragstart`: undeclared attrs.
		const camel = Object.fromEntries(
			names.map((n) => ["on" + n[2]!.toUpperCase() + n.slice(3), vi.fn()])
		);
		const { container } = render(Compare, {
			props: { slideMode: "drag", ...lower },
			attrs: camel,
		});
		const slider = container.querySelector('[role="slider"]')!;
		await fireEvent.mouseEnter(slider);
		await fireEvent.mouseDown(slider);
		await fireEvent.mouseUp(slider);
		await fireEvent.mouseLeave(slider);
		for (const n of ["ondragstart", "ondragend", "onhoverenter", "onhoverleave"]) {
			expect(lower[n], n).toHaveBeenCalledTimes(1);
		}
		for (const fn of Object.values(camel)) expect(fn).not.toHaveBeenCalled();
	});

	it("reports the reset percentage through :onpercentagechange on hover leave", async () => {
		const onpercentagechange = vi.fn();
		const { container } = render(Compare, {
			props: { initialSliderPercentage: 30, onpercentagechange },
		});
		const slider = container.querySelector('[role="slider"]')!;
		onpercentagechange.mockClear();
		await fireEvent.mouseEnter(slider);
		await fireEvent.mouseLeave(slider);
		expect(onpercentagechange).toHaveBeenLastCalledWith(30);
	});

	describe("autoplay runs a single frame loop", () => {
		let queue: Map<number, FrameRequestCallback>;
		let nextId: number;

		function flushFrame(): void {
			const pending = [...queue.values()];
			queue.clear();
			for (const cb of pending) cb(performance.now());
		}

		function stubRaf(): void {
			queue = new Map();
			nextId = 1;
			vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
				const id = nextId++;
				queue.set(id, cb);
				return id;
			});
			vi.stubGlobal("cancelAnimationFrame", (id: number) => {
				queue.delete(id);
			});
		}

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it("schedules one frame per tick at mount and reports once per frame", async () => {
			stubRaf();
			const onpercentagechange = vi.fn();
			render(Compare, { props: { autoplay: true, onpercentagechange } });
			await nextTick();
			expect(queue.size).toBe(1);
			onpercentagechange.mockClear();
			flushFrame();
			expect(onpercentagechange).toHaveBeenCalledTimes(1);
			expect(queue.size).toBe(1);
		});

		it("keeps one loop after a hover leave and after a watched prop restarts it", async () => {
			stubRaf();
			const { container, rerender } = render(Compare, {
				props: { autoplay: true, autoplayDuration: 5000 },
			});
			await nextTick();
			const slider = container.querySelector('[role="slider"]')!;
			await fireEvent.mouseEnter(slider);
			expect(queue.size).toBe(0);
			await fireEvent.mouseLeave(slider);
			expect(queue.size).toBe(1);
			await rerender({ autoplay: true, autoplayDuration: 2000 });
			expect(queue.size).toBe(1);
		});

		it("leaves no frame scheduled after unmount", async () => {
			stubRaf();
			const { unmount } = render(Compare, { props: { autoplay: true } });
			await nextTick();
			unmount();
			expect(queue.size).toBe(0);
		});
	});
});
