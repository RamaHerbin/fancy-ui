import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import ImageTrailCursor from "./ImageTrailCursor.svelte";

/**
 * A `matchMedia` whose reduced-motion answer the test controls and can flip
 * mid-session, dispatching `change` to every listener the component attached.
 */
function stubReducedMotion(initial: boolean) {
	let reduce = initial;
	const listeners = new Set<(event: MediaQueryListEvent) => void>();
	const original = window.matchMedia;
	window.matchMedia = ((query: string) => {
		const isReduce = query.includes("prefers-reduced-motion");
		return {
			get matches() {
				return isReduce ? reduce : false;
			},
			media: query,
			onchange: null,
			addEventListener: (_type: string, cb: (event: MediaQueryListEvent) => void) => {
				if (isReduce) listeners.add(cb);
			},
			removeEventListener: (_type: string, cb: (event: MediaQueryListEvent) => void) => {
				listeners.delete(cb);
			},
			dispatchEvent: () => false,
			addListener: () => {},
			removeListener: () => {},
		};
	}) as unknown as typeof window.matchMedia;
	return {
		set(next: boolean) {
			reduce = next;
			for (const cb of [...listeners]) {
				cb({ matches: next, media: "(prefers-reduced-motion: reduce)" } as MediaQueryListEvent);
			}
		},
		get listenerCount() {
			return listeners.size;
		},
		restore() {
			window.matchMedia = original;
		},
	};
}

describe("ImageTrailCursor", () => {
	afterEach(cleanup);

	it("renders a container div", () => {
		const { container } = render(ImageTrailCursor);
		const div = container.firstElementChild as HTMLElement;
		expect(div).toBeInTheDocument();
	});

	it("renders one content__img per image", () => {
		const { container } = render(ImageTrailCursor, {
			props: { images: ["/a.jpg", "/b.jpg", "/c.jpg"] },
		});
		const imgs = container.querySelectorAll(".content__img");
		expect(imgs.length).toBe(3);
	});

	it("renders content__img-inner with background-image", () => {
		const { container } = render(ImageTrailCursor, {
			props: { images: ["/test.jpg"] },
		});
		const inner = container.querySelector(".content__img-inner") as HTMLElement;
		expect(inner).toBeInTheDocument();
		expect(inner?.style.backgroundImage).toContain("/test.jpg");
	});

	it("renders empty when no images provided", () => {
		const { container } = render(ImageTrailCursor, { props: { images: [] } });
		const imgs = container.querySelectorAll(".content__img");
		expect(imgs.length).toBe(0);
	});

	it("applies custom class names", () => {
		const { container } = render(ImageTrailCursor, {
			props: { class: "my-trail" },
		});
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("my-trail");
	});

	it("preserves base classes", () => {
		const { container } = render(ImageTrailCursor, {
			props: { class: "extra" },
		});
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("relative");
	});

	it("sets touch-action: none on the container", () => {
		const { container } = render(ImageTrailCursor);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.getAttribute("style")).toContain("touch-action: none");
	});

	it("uses responsive image classes (mobile-first + sm breakpoint)", () => {
		const { container } = render(ImageTrailCursor, {
			props: { images: ["/a.jpg"] },
		});
		const img = container.querySelector(".content__img") as HTMLElement;
		expect(img?.className).toContain("w-[120px]");
		expect(img?.className).toContain("rounded-[10px]");
		expect(img?.className).toContain("sm:w-[190px]");
		expect(img?.className).toContain("sm:rounded-[15px]");
	});

	it("mounts without throwing when variant is pixelated", () => {
		const { container } = render(ImageTrailCursor, {
			props: { images: ["/a.jpg", "/b.jpg"], variant: "pixelated" },
		});
		const imgs = container.querySelectorAll(".content__img");
		expect(imgs.length).toBe(2);
	});

	it("applies pixelated image-rendering and border on mount for the pixelated variant", () => {
		const { container } = render(ImageTrailCursor, {
			props: { images: ["/a.jpg"], variant: "pixelated" },
		});
		const img = container.querySelector(".content__img") as HTMLElement;
		expect(img.style.imageRendering).toBe("pixelated");
		expect(img.style.borderWidth).toBe("2px");
		expect(img.style.borderStyle).toBe("solid");
		expect(img.style.borderColor).toBe("rgb(25, 19, 8)"); // #191308
	});

	describe("prefers-reduced-motion", () => {
		let media: ReturnType<typeof stubReducedMotion> | undefined;
		afterEach(() => {
			media?.restore();
			media = undefined;
			vi.restoreAllMocks();
		});

		function move(root: HTMLElement) {
			fireEvent.mouseMove(root, { clientX: 0, clientY: 0 });
			fireEvent.mouseMove(root, { clientX: 400, clientY: 400 });
		}

		it("starts no trail and no animation loop when reduced motion is preferred at mount", async () => {
			media = stubReducedMotion(true);
			const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
			const { container } = render(ImageTrailCursor, {
				props: { images: ["/a.jpg", "/b.jpg"], variant: "pixelated" },
			});
			await tick();
			const root = container.firstElementChild as HTMLElement;
			const img = container.querySelector(".content__img") as HTMLElement;

			// No variant was constructed: the pixelated border is never applied.
			expect(img.style.imageRendering).toBe("");
			move(root);
			expect(raf).not.toHaveBeenCalled();
			// The images stay in the markup, hidden.
			expect(container.querySelectorAll(".content__img").length).toBe(2);
		});

		it("starts the trail when the preference flips off and stops it when it flips back, without remount", async () => {
			media = stubReducedMotion(true);
			const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 7);
			const caf = vi.spyOn(window, "cancelAnimationFrame");
			const { container } = render(ImageTrailCursor, {
				props: { images: ["/a.jpg", "/b.jpg"], variant: "pixelated" },
			});
			await tick();
			const root = container.firstElementChild as HTMLElement;
			const img = container.querySelector(".content__img") as HTMLElement;

			media.set(false);
			await tick();
			expect(container.firstElementChild).toBe(root);
			expect(img.style.imageRendering).toBe("pixelated");
			move(root);
			expect(raf).toHaveBeenCalled();

			media.set(true);
			await tick();
			expect(caf).toHaveBeenCalledWith(7);
			// The variant's inline styling is wiped with it.
			expect(img.style.imageRendering).toBe("");
			raf.mockClear();
			move(root);
			expect(raf).not.toHaveBeenCalled();
		});

		it("detaches its media listener on unmount", async () => {
			media = stubReducedMotion(false);
			const { unmount } = render(ImageTrailCursor, { props: { images: ["/a.jpg"] } });
			await tick();
			expect(media.listenerCount).toBe(1);
			unmount();
			expect(media.listenerCount).toBe(0);
		});
	});
});
