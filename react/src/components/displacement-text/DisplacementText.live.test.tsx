import { StrictMode } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	mount: vi.fn(),
	setOptions: vi.fn(),
	destroy: vi.fn(),
	onChange: null as null | ((state: { mode: "static" | "webgl"; color: string }) => void),
}));

vi.mock("./displacement-text-core.js", async (importOriginal) => ({
	...(await importOriginal<typeof import("./displacement-text-core.js")>()),
	mountDisplacementText: mocks.mount,
}));

const { DisplacementText } = await import("./DisplacementText.js");

describe("DisplacementText wrapper contract", () => {
	beforeEach(() => {
		mocks.mount.mockReset();
		mocks.setOptions.mockReset();
		mocks.destroy.mockReset();
		mocks.mount.mockImplementation((_els, options) => {
			mocks.onChange = options.onChange;
			options.onChange({ mode: "static", color: "#000000" });
			return { setOptions: mocks.setOptions, resize: vi.fn(), destroy: mocks.destroy };
		});
	});
	afterEach(cleanup);

	it("mounts the controller once with the mount-time options", () => {
		const { container } = render(<DisplacementText text="Hi" fontSize={80} />);
		expect(mocks.mount).toHaveBeenCalledTimes(1);
		const [elements, options] = mocks.mount.mock.calls[0]!;
		expect(elements.container).toBe(container.firstChild);
		expect(options).toMatchObject({ text: "Hi", fontSize: 80, maxDpr: 2 });
	});

	it("forwards prop changes through setOptions without recreating the controller", () => {
		const { rerender } = render(<DisplacementText text="A" />);
		rerender(<DisplacementText text="B" maxDpr={1} />);
		expect(mocks.mount).toHaveBeenCalledTimes(1);
		expect(mocks.setOptions).toHaveBeenLastCalledWith(
			expect.objectContaining({ text: "B", maxDpr: 1 })
		);
		expect(mocks.destroy).not.toHaveBeenCalled();
	});

	it("destroys the controller on unmount", () => {
		const { unmount } = render(<DisplacementText />);
		unmount();
		expect(mocks.destroy).toHaveBeenCalledTimes(1);
	});

	it("under StrictMode every controller started is destroyed and one survives", () => {
		const { unmount } = render(
			<StrictMode>
				<DisplacementText />
			</StrictMode>
		);
		expect(mocks.mount.mock.calls.length - mocks.destroy.mock.calls.length).toBe(1);
		unmount();
		expect(mocks.destroy).toHaveBeenCalledTimes(mocks.mount.mock.calls.length);
	});

	it("drops the static layer when the controller promotes to webgl", () => {
		render(<DisplacementText text="Live" />);
		expect(screen.getByText("Live")).toBeTruthy();
		act(() => mocks.onChange!({ mode: "webgl", color: "#000000" }));
		expect(screen.queryByText("Live")).toBeNull();
	});
});
