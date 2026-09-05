import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { StarsBackground } from "./StarsBackground.js";

/**
 * Drives the spring loop with a hand-held frame queue so a test can count how
 * many frames the component actually asks for.
 */
function stubFrames() {
	const queue: FrameRequestCallback[] = [];
	vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
		queue.push(cb);
		return queue.length;
	});
	vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});
	return {
		get pending() {
			return queue.length;
		},
		/** Runs queued frames until the queue drains or `max` frames have run. */
		drain(max: number) {
			let ran = 0;
			while (queue.length > 0 && ran < max) {
				const cb = queue.shift();
				ran += 1;
				cb?.(ran * 16);
			}
			return ran;
		},
	};
}

describe("StarsBackground", () => {
	afterEach(cleanup);
	afterEach(() => vi.restoreAllMocks());

	it("renders a container div", () => {
		const { container } = render(<StarsBackground />);
		const div = container.firstElementChild as HTMLElement;
		expect(div).toBeInTheDocument();
	});

	it("has overflow-hidden class", () => {
		const { container } = render(<StarsBackground />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("overflow-hidden");
	});

	it("renders three star layers", () => {
		const { container } = render(<StarsBackground />);
		const layers = container.querySelectorAll(".star-layer");
		expect(layers.length).toBe(3);
	});

	it("renders six star fields (2 per layer)", () => {
		const { container } = render(<StarsBackground />);
		const fields = container.querySelectorAll(".star-field");
		expect(fields.length).toBe(6);
	});

	it("applies custom class names", () => {
		const { container } = render(<StarsBackground className="my-stars" />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("my-stars");
	});

	it("preserves base classes when custom class is added", () => {
		const { container } = render(<StarsBackground className="extra" />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("overflow-hidden");
		expect(div?.className).toContain("size-full");
	});

	it("has radial gradient background class", () => {
		const { container } = render(<StarsBackground />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("bg-[radial-gradient");
	});

	describe("spring loop", () => {
		it("stops re-scheduling frames once the spring is at rest", () => {
			const frames = stubFrames();
			render(<StarsBackground />);

			// With no pointer input the spring is already on its target, so
			// the loop must park instead of asking for 200 more frames.
			const ran = frames.drain(200);

			expect(ran).toBeLessThan(200);
			expect(frames.pending).toBe(0);
		});

		it("wakes on pointer movement and parks again once settled", () => {
			const frames = stubFrames();
			const { container } = render(<StarsBackground />);
			const root = container.firstElementChild as HTMLElement;
			const parallax = container.querySelector(".stars-parallax") as HTMLElement;
			frames.drain(200);
			expect(frames.pending).toBe(0);

			fireEvent.mouseMove(root, { clientX: 0, clientY: 0 });
			expect(frames.pending).toBe(1);

			const ran = frames.drain(2000);
			expect(ran).toBeLessThan(2000);
			expect(frames.pending).toBe(0);

			const centerX = window.innerWidth / 2;
			const centerY = window.innerHeight / 2;
			expect(parallax.style.transform).toBe(
				`translate(${centerX * 0.05}px, ${centerY * 0.05}px)`
			);
		});

		it("does not run frames while the page is hidden, and resumes when it is shown", () => {
			const frames = stubFrames();
			const { container } = render(<StarsBackground />);
			const root = container.firstElementChild as HTMLElement;
			frames.drain(200);

			let hidden = true;
			Object.defineProperty(document, "hidden", {
				configurable: true,
				get: () => hidden,
			});
			try {
				fireEvent(document, new Event("visibilitychange"));
				fireEvent.mouseMove(root, { clientX: 0, clientY: 0 });
				expect(frames.pending).toBe(0);

				hidden = false;
				fireEvent(document, new Event("visibilitychange"));
				expect(frames.pending).toBe(1);
			} finally {
				delete (document as unknown as { hidden?: boolean }).hidden;
			}
		});

		it("removes its visibility listener on unmount", () => {
			const frames = stubFrames();
			const remove = vi.spyOn(document, "removeEventListener");
			const { unmount } = render(<StarsBackground />);
			frames.drain(200);

			unmount();

			expect(remove).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
		});
	});
});
