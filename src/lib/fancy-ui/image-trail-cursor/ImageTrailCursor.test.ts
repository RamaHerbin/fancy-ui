import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import ImageTrailCursor from "./ImageTrailCursor.svelte";

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
});
