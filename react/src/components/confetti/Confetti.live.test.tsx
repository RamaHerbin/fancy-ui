import { createRef, StrictMode } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConfettiHandle } from "./Confetti.js";

/**
 * Wrapper-to-engine contract: the core is mocked so creation, live pushes
 * and teardown are observable.
 */
const mocks = vi.hoisted(() => ({
	create: vi.fn(),
	fire: vi.fn(),
	setOptions: vi.fn(),
	resize: vi.fn(),
	destroy: vi.fn(),
}));

vi.mock("./confetti-core.js", () => ({ createConfetti: mocks.create }));

const { Confetti } = await import("./Confetti.js");

describe("Confetti engine contract", () => {
	beforeEach(() => {
		for (const m of Object.values(mocks)) m.mockReset();
		mocks.create.mockImplementation(() => ({
			fire: mocks.fire,
			setOptions: mocks.setOptions,
			resize: mocks.resize,
			destroy: mocks.destroy,
		}));
	});
	afterEach(cleanup);

	it("creates the engine once with the mount values", () => {
		const options = { particleCount: 5 };
		const globalOptions = { useWorker: false };
		const { rerender } = render(
			<Confetti options={options} globalOptions={globalOptions} manualStart />
		);
		rerender(<Confetti options={{ particleCount: 9 }} globalOptions={{}} />);
		expect(mocks.create).toHaveBeenCalledTimes(1);
		const [elements, init] = mocks.create.mock.calls[0]!;
		expect((elements as { canvas: HTMLCanvasElement }).canvas.tagName).toBe("CANVAS");
		expect(init).toEqual({ globalOptions, manualStart: true, options });
	});

	it("pushes the current options right before each fire, without recreating", () => {
		const ref = createRef<ConfettiHandle>();
		const { rerender } = render(<Confetti ref={ref} options={{ particleCount: 1 }} manualStart />);
		rerender(<Confetti ref={ref} options={{ particleCount: 2 }} manualStart />);
		ref.current!.fire({ spread: 10 });
		expect(mocks.setOptions).toHaveBeenCalledWith({ options: { particleCount: 2 } });
		expect(mocks.fire).toHaveBeenCalledWith({ spread: 10 });
		expect(mocks.setOptions.mock.invocationCallOrder[0]).toBeLessThan(
			mocks.fire.mock.invocationCallOrder[0]!
		);
		expect(mocks.create).toHaveBeenCalledTimes(1);
	});

	it("destroys the engine on unmount and ignores fire afterwards", () => {
		const ref = createRef<ConfettiHandle>();
		const { unmount } = render(<Confetti ref={ref} manualStart />);
		unmount();
		expect(mocks.destroy).toHaveBeenCalledTimes(1);
		mocks.fire.mockClear();
		ref.current?.fire();
		expect(mocks.fire).not.toHaveBeenCalled();
	});

	it("stays inert when the core returns no engine", () => {
		mocks.create.mockImplementation(() => null);
		const ref = createRef<ConfettiHandle>();
		const { unmount } = render(<Confetti ref={ref} />);
		expect(() => ref.current!.fire()).not.toThrow();
		expect(() => unmount()).not.toThrow();
	});

	it("StrictMode: every engine started is destroyed, one survives", () => {
		const { unmount } = render(
			<StrictMode>
				<Confetti manualStart />
			</StrictMode>
		);
		expect(mocks.create).toHaveBeenCalledTimes(2);
		expect(mocks.destroy).toHaveBeenCalledTimes(1);
		unmount();
		expect(mocks.destroy).toHaveBeenCalledTimes(2);
	});
});
