import { render, cleanup, fireEvent } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, it, expect, vi } from "vitest";
import { ImageTrailCursor } from "./ImageTrailCursor.js";
import { variantMap, ImageTrailVariantPixelated, type VariantType } from "./trail-variants.js";

describe("ImageTrailCursor", () => {
	afterEach(cleanup);
	afterEach(() => vi.restoreAllMocks());

	it("renders a container div", () => {
		const { container } = render(<ImageTrailCursor />);
		const div = container.firstElementChild as HTMLElement;
		expect(div).toBeInTheDocument();
	});

	it("renders one content__img per image", () => {
		const { container } = render(<ImageTrailCursor images={["/a.jpg", "/b.jpg", "/c.jpg"]} />);
		const imgs = container.querySelectorAll(".content__img");
		expect(imgs.length).toBe(3);
	});

	it("renders content__img-inner with background-image", () => {
		const { container } = render(<ImageTrailCursor images={["/test.jpg"]} />);
		const inner = container.querySelector(".content__img-inner") as HTMLElement;
		expect(inner).toBeInTheDocument();
		expect(inner?.style.backgroundImage).toContain("/test.jpg");
	});

	it("renders empty when no images provided", () => {
		const { container } = render(<ImageTrailCursor images={[]} />);
		const imgs = container.querySelectorAll(".content__img");
		expect(imgs.length).toBe(0);
	});

	// `images` defaults to `[]`, and the variant instance is only rebuilt on a
	// `variant` change, so an empty trail is a state a pointer can reach. The
	// animation loop must stay off rather than index an empty image list.
	it("survives pointer movement with no images", () => {
		const frames: FrameRequestCallback[] = [];
		vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
			frames.push(cb);
			return frames.length;
		});

		const { container } = render(<ImageTrailCursor images={[]} />);
		const root = container.firstElementChild as HTMLElement;
		fireEvent.mouseMove(root, { clientX: 0, clientY: 0 });
		fireEvent.mouseMove(root, { clientX: 500, clientY: 500 });

		// Bounded drain: a running loop re-arms itself every frame.
		const drain = () => {
			for (let i = 0; i < 3 && frames.length > 0; i++) frames.shift()!(0);
		};
		expect(drain).not.toThrow();
	});

	it("applies custom class names", () => {
		const { container } = render(<ImageTrailCursor className="my-trail" />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("my-trail");
	});

	it("preserves base classes", () => {
		const { container } = render(<ImageTrailCursor className="extra" />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("relative");
	});

	// Same fact as the Svelte assertion — the container declares
	// `touch-action: none` — read off the rendered markup instead of the live
	// node. Svelte emits the style attribute as a literal string, so jsdom
	// keeps it verbatim; React writes inline styles through the CSSOM, and
	// jsdom's `cssstyle` does not implement `touch-action`, so it swallows the
	// value before it can reach the attribute. Real browsers keep it, and the
	// server markup below is what they receive.
	it("sets touch-action: none on the container", () => {
		const html = renderToStaticMarkup(<ImageTrailCursor />);
		expect(html).toContain('style="touch-action:none"');
	});

	it("uses responsive image classes (mobile-first + sm breakpoint)", () => {
		const { container } = render(<ImageTrailCursor images={["/a.jpg"]} />);
		const img = container.querySelector(".content__img") as HTMLElement;
		expect(img?.className).toContain("w-[120px]");
		expect(img?.className).toContain("rounded-[10px]");
		expect(img?.className).toContain("sm:w-[190px]");
		expect(img?.className).toContain("sm:rounded-[15px]");
	});

	it("mounts without throwing when variant is pixelated", () => {
		const { container } = render(
			<ImageTrailCursor images={["/a.jpg", "/b.jpg"]} variant="pixelated" />
		);
		const imgs = container.querySelectorAll(".content__img");
		expect(imgs.length).toBe(2);
	});

	it("applies pixelated image-rendering and border on mount for the pixelated variant", () => {
		const { container } = render(<ImageTrailCursor images={["/a.jpg"]} variant="pixelated" />);
		const img = container.querySelector(".content__img") as HTMLElement;
		expect(img.style.imageRendering).toBe("pixelated");
		expect(img.style.borderWidth).toBe("2px");
		expect(img.style.borderStyle).toBe("solid");
		expect(img.style.borderColor).toBe("rgb(25, 19, 8)"); // #191308
	});

	// Port addition. The Svelte source re-runs its variant effect on a changed
	// `variant` and resets the inline styles first; the React port folds both
	// into one `[variant]`-keyed effect, so the switch is worth an assertion
	// the Svelte suite never needed (its runes made the wiring implicit).
	it("re-initialises the variant when the variant prop changes", () => {
		const { container, rerender } = render(
			<ImageTrailCursor images={["/a.jpg"]} variant="type1" />
		);
		expect((container.querySelector(".content__img") as HTMLElement).style.imageRendering).toBe("");

		rerender(<ImageTrailCursor images={["/a.jpg"]} variant="pixelated" />);
		expect((container.querySelector(".content__img") as HTMLElement).style.imageRendering).toBe(
			"pixelated"
		);

		rerender(<ImageTrailCursor images={["/a.jpg"]} variant="type1" />);
		expect((container.querySelector(".content__img") as HTMLElement).style.imageRendering).toBe("");
	});
});

describe("trail-variants pixelated", () => {
	it("accepts pixelated as a VariantType", () => {
		const variant: VariantType = "pixelated";
		expect(variant).toBe("pixelated");
	});

	it("has a pixelated entry in variantMap pointing at ImageTrailVariantPixelated", () => {
		expect(variantMap.pixelated).toBe(ImageTrailVariantPixelated);
	});

	it("keeps all 9 variant keys in variantMap", () => {
		expect(Object.keys(variantMap).sort()).toEqual(
			["type1", "type2", "type3", "type4", "type5", "type6", "type7", "type8", "pixelated"].sort()
		);
	});
});
