import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { SmoothCursor } from "./SmoothCursor.js";

describe("SmoothCursor", () => {
	afterEach(cleanup);

	it("renders hidden (opacity-0) before any pointer movement", () => {
		const { container } = render(<SmoothCursor />);
		const cursor = container.firstElementChild as HTMLElement;
		expect(cursor.className).toContain("opacity-0");
		expect(cursor.className).not.toContain("opacity-100");
	});

	it("applies custom class names", () => {
		const { container } = render(<SmoothCursor className="my-cursor" />);
		const cursor = container.firstElementChild as HTMLElement;
		expect(cursor.className).toContain("my-cursor");
	});

	it("renders the default arrow svg when no cursor node is provided", () => {
		const { container } = render(<SmoothCursor />);
		expect(container.querySelector("svg")).toBeTruthy();
	});

	it("renders a custom cursor node instead of the default arrow", () => {
		const { container } = render(<SmoothCursor cursor={<div data-testid="custom-cursor" />} />);
		expect(container.querySelector("svg")).toBeFalsy();
		expect(container.querySelector("[data-testid='custom-cursor']")).toBeTruthy();
	});

	it("hides the native cursor on mount and restores it on unmount", () => {
		const { unmount } = render(<SmoothCursor />);
		expect(document.body.style.cursor).toBe("none");
		unmount();
		expect(document.body.style.cursor).toBe("");
	});

	it("becomes visible once the pointer moves, and unmount does not throw once the animation loop is running", async () => {
		const { container, unmount } = render(<SmoothCursor />);
		const cursor = container.firstElementChild as HTMLElement;

		await fireEvent.mouseMove(document, { clientX: 120, clientY: 80 });

		expect(cursor.className).toContain("opacity-100");
		expect(() => unmount()).not.toThrow();
	});
});
