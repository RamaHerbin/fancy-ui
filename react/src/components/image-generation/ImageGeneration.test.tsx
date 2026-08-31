import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { ImageGeneration } from "./ImageGeneration.js";

// A 1x1 transparent GIF: a real, non-empty src that jsdom will never actually
// fetch, so `complete` stays false and the load event is ours to dispatch.
const SRC = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function image(container: HTMLElement): HTMLImageElement | null {
	return container.querySelector("img");
}

function frame(container: HTMLElement): HTMLElement {
	return container.querySelector(".ft-imagegen-frame") as HTMLElement;
}

/**
 * Makes every <img> in the test look already decoded, the way it is when the
 * client hydrates markup the server already painted. A width of `0` is the other
 * shape of "complete": a fetch that failed, or an SVG whose only intrinsic size
 * is a viewBox.
 */
function withCompleteImages(run: () => void, width = 512) {
	const proto = HTMLImageElement.prototype;
	const complete = Object.getOwnPropertyDescriptor(proto, "complete");
	const naturalWidth = Object.getOwnPropertyDescriptor(proto, "naturalWidth");

	Object.defineProperty(proto, "complete", { get: () => true, configurable: true });
	Object.defineProperty(proto, "naturalWidth", { get: () => width, configurable: true });
	try {
		run();
	} finally {
		if (complete) Object.defineProperty(proto, "complete", complete);
		if (naturalWidth) Object.defineProperty(proto, "naturalWidth", naturalWidth);
	}
}

describe("ImageGeneration", () => {
	afterEach(cleanup);

	it("renders an empty dashed frame when idle", () => {
		const { container } = render(<ImageGeneration status="idle" alt="A red barn" />);

		expect(frame(container).className).toContain("ft-imagegen-frame-idle");
		expect(image(container)).toBeFalsy();
		expect(container.querySelector(".ft-imagegen-dots")).toBeFalsy();
		expect(container.querySelector(".ft-imagegen-error")).toBeFalsy();
	});

	it("renders the pixel loader over a dot grid while generating", () => {
		const { container } = render(<ImageGeneration status="generating" alt="A red barn" />);
		const root = container.firstElementChild as HTMLElement;

		expect(container.querySelector(".ft-pixel")).toBeTruthy();
		expect(container.querySelectorAll(".ft-pixel")).toHaveLength(64);
		expect(container.querySelector(".ft-imagegen-dots")).toBeTruthy();
		expect(root.getAttribute("aria-busy")).toBe("true");
		expect(image(container)).toBeFalsy();
	});

	it("leaves the row unbusy outside the generating state", () => {
		const { container } = render(<ImageGeneration status="done" src={SRC} alt="A red barn" />);
		expect((container.firstElementChild as HTMLElement).getAttribute("aria-busy")).toBeNull();
	});

	it("renders the image with its alt text when done", () => {
		const { container } = render(
			<ImageGeneration status="done" src={SRC} alt="A red barn at dusk" />
		);
		const img = image(container) as HTMLImageElement;

		expect(img).toBeTruthy();
		expect(img.getAttribute("src")).toBe(SRC);
		expect(screen.getByAltText("A red barn at dusk")).toBe(img);
	});

	it("holds the empty frame when done arrives without a src", () => {
		const { container } = render(<ImageGeneration status="done" src={null} alt="A red barn" />);

		expect(image(container)).toBeFalsy();
		expect(frame(container)).toBeTruthy();
	});

	it("announces the error text with a retry button", () => {
		const { container } = render(
			<ImageGeneration
				status="error"
				alt="A red barn"
				errorText="The model refused"
				onRetry={() => {}}
			/>
		);

		expect(container.querySelector(".ft-imagegen-error")?.getAttribute("role")).toBe("alert");
		expect(container.querySelector(".ft-imagegen-error-text")?.textContent).toBe(
			"The model refused"
		);
		expect(container.querySelector(".ft-imagegen-retry")?.textContent?.trim()).toBe("Retry");
	});

	it("defaults the error text", () => {
		const { container } = render(<ImageGeneration status="error" alt="A red barn" />);
		expect(container.querySelector(".ft-imagegen-error-text")?.textContent).toBe(
			"Generation failed"
		);
	});

	it("renders no retry button without an onRetry handler", () => {
		const { container } = render(<ImageGeneration status="error" alt="A red barn" />);
		expect(container.querySelector(".ft-imagegen-retry")).toBeFalsy();
	});

	it("calls onRetry when the retry button is pressed", async () => {
		const onRetry = vi.fn();
		const { container } = render(
			<ImageGeneration status="error" alt="A red barn" onRetry={onRetry} />
		);

		await fireEvent.click(container.querySelector(".ft-imagegen-retry") as HTMLButtonElement);
		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it("blurs the image once mounted and sharpens it on load", async () => {
		const { container } = render(<ImageGeneration status="done" src={SRC} alt="A red barn" />);

		const img = image(container) as HTMLImageElement;
		expect(img.className).toContain("ft-imagegen-img-blurred");

		await fireEvent.load(img);
		expect(img.className).not.toContain("ft-imagegen-img-blurred");
	});

	it("calls onLoad once when the image finishes loading", async () => {
		const onLoad = vi.fn();
		const { container } = render(
			<ImageGeneration status="done" src={SRC} alt="A red barn" onLoad={onLoad} />
		);

		const img = image(container) as HTMLImageElement;
		await fireEvent.load(img);
		expect(onLoad).toHaveBeenCalledTimes(1);

		// A second load event for the same src — a re-decode, a cache revalidation
		// — is not a second arrival.
		await fireEvent.load(img);
		expect(onLoad).toHaveBeenCalledTimes(1);
	});

	it("still reports the arrival when a retry of the same src finally loads", async () => {
		// A failure reveals the image, but recording it as a load would make the
		// retry look like something that already arrived.
		const onLoad = vi.fn();
		const { container } = render(
			<ImageGeneration status="done" src={SRC} alt="A red barn" onLoad={onLoad} />
		);

		const img = image(container) as HTMLImageElement;
		await fireEvent.error(img);
		expect(onLoad).not.toHaveBeenCalled();
		expect(img.className).not.toContain("ft-imagegen-img-blurred");

		await fireEvent.load(img);
		expect(onLoad).toHaveBeenCalledTimes(1);
	});

	it("re-arms the reveal when a new src replaces a loaded one", async () => {
		const onLoad = vi.fn();
		const next = SRC.replace("R0lGOD", "R0lGOE");
		const { container, rerender } = render(
			<ImageGeneration status="done" src={SRC} alt="A red barn" onLoad={onLoad} />
		);

		const img = image(container) as HTMLImageElement;
		await fireEvent.load(img);
		expect(img.className).not.toContain("ft-imagegen-img-blurred");

		rerender(<ImageGeneration status="done" src={next} alt="A blue barn" onLoad={onLoad} />);
		expect((image(container) as HTMLImageElement).className).toContain("ft-imagegen-img-blurred");

		await fireEvent.load(image(container) as HTMLImageElement);
		expect(onLoad).toHaveBeenCalledTimes(2);
	});

	it("never blurs an image that was already decoded at mount", async () => {
		const onLoad = vi.fn();
		let container!: HTMLElement;

		withCompleteImages(() => {
			container = render(
				<ImageGeneration status="done" src={SRC} alt="A red barn" onLoad={onLoad} />
			).container;
		});

		// This is the hydration path: the server shipped a sharp <img>, the
		// browser painted it, and arming the reveal afterwards would smear an
		// image the reader can already see.
		expect((image(container) as HTMLImageElement).className).not.toContain(
			"ft-imagegen-img-blurred"
		);
		expect(onLoad).toHaveBeenCalledTimes(1);
	});

	it("never blurs a complete image that reports no intrinsic width", async () => {
		const onLoad = vi.fn();
		let container!: HTMLElement;

		withCompleteImages(() => {
			container = render(
				<ImageGeneration status="done" src={SRC} alt="A red barn" onLoad={onLoad} />
			).container;
		}, 0);

		// Complete with no width is either a fetch that already failed or an SVG
		// sized only by its viewBox. Both settled before this component existed, so
		// no load and no error is coming to lift a blur applied now — which is why
		// being complete at mount settles it either way.
		expect((image(container) as HTMLImageElement).className).not.toContain(
			"ft-imagegen-img-blurred"
		);
		// Nothing was seen arriving, so nothing is announced as having arrived.
		expect(onLoad).not.toHaveBeenCalled();
	});

	it("reveals a broken image instead of leaving it blurred", async () => {
		const onLoad = vi.fn();
		const { container } = render(
			<ImageGeneration status="done" src={SRC} alt="A red barn" onLoad={onLoad} />
		);

		const img = image(container) as HTMLImageElement;
		expect(img.className).toContain("ft-imagegen-img-blurred");

		await fireEvent.error(img);
		expect(img.className).not.toContain("ft-imagegen-img-blurred");
		expect(onLoad).not.toHaveBeenCalled();
	});

	it("applies the default square aspect ratio to the frame", () => {
		const { container } = render(<ImageGeneration status="idle" alt="A red barn" />);
		expect(frame(container).getAttribute("style")).toContain("aspect-ratio: 1 / 1");
	});

	it("applies a custom aspect ratio to the frame", () => {
		const { container } = render(
			<ImageGeneration status="generating" alt="A red barn" aspectRatio="16 / 9" />
		);
		expect(frame(container).getAttribute("style")).toContain("aspect-ratio: 16 / 9");
	});

	it("keeps the frame across every status so the layout never shifts", () => {
		for (const status of ["idle", "generating", "done", "error"] as const) {
			const { container } = render(
				<ImageGeneration status={status} src={SRC} alt="A red barn" aspectRatio="4 / 3" />
			);
			expect(frame(container).getAttribute("style")).toContain("aspect-ratio: 4 / 3");
			cleanup();
		}
	});

	it("renders the prompt as a caption only when one is given", () => {
		const { container } = render(
			<ImageGeneration status="done" src={SRC} alt="A red barn" prompt="a red barn at dusk, 35mm" />
		);
		expect(container.querySelector(".ft-imagegen-prompt")?.textContent).toBe(
			"a red barn at dusk, 35mm"
		);

		cleanup();
		const bare = render(<ImageGeneration status="done" src={SRC} alt="A red barn" />);
		expect(bare.container.querySelector(".ft-imagegen-prompt")).toBeFalsy();
	});

	it("merges custom class names alongside the base classes", () => {
		const { container } = render(
			<ImageGeneration status="idle" alt="A red barn" className="my-frame" />
		);
		const root = container.firstElementChild as HTMLElement;

		expect(root.className).toContain("my-frame");
		expect(root.className).toContain("ft-imagegen");
	});
});
