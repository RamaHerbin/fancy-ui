import { render, cleanup } from "@testing-library/vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression net for the prop-liveness contract.
 *
 * FluidCursor never declared an effect, but in the Svelte source a
 * destructured prop is a getter: the closures that outlived mount re-read the
 * current value on every call. `generateColor()` (every frame, every splat)
 * read `fluidColor` and `fluidColors`; the rect cache, the pointer mapping,
 * the splat-radius correction and the teardown read `contained`; the teardown
 * read `interactive`; the singleton registration read `allowMultiple`. Moving
 * the engine into a core turned those into snapshots unless the wrapper keeps
 * pushing them, which is what this file holds it to.
 *
 * FluidCursor.test.ts renders against jsdom, where no WebGL context exists, so
 * it can never reach the engine — hence the mocked core here.
 */
const mocks = vi.hoisted(() => ({
	create: vi.fn(),
	setOptions: vi.fn(),
	resize: vi.fn(),
	destroy: vi.fn(),
}));

vi.mock("./fluid-cursor-core.js", () => ({ createFluidCursor: mocks.create }));

const FluidCursor = (await import("./FluidCursor.vue")).default;

/** The live keys, at their public defaults. */
const live = {
	fluidColor: undefined,
	fluidColors: undefined,
	contained: true,
	interactive: true,
	allowMultiple: false,
};

describe("FluidCursor live props", () => {
	beforeEach(() => {
		mocks.create.mockReset();
		mocks.setOptions.mockReset();
		mocks.resize.mockReset();
		mocks.destroy.mockReset();
		mocks.create.mockReturnValue({
			setOptions: mocks.setOptions,
			resize: mocks.resize,
			destroy: mocks.destroy,
		});
	});

	afterEach(cleanup);

	it("creates the engine once, with every option at its mount value", () => {
		render(FluidCursor, { props: { curl: 9, fluidColor: "#ffffff" } });
		expect(mocks.create).toHaveBeenCalledTimes(1);
		const [elements, options] = mocks.create.mock.calls[0]!;
		expect((elements as { canvas: HTMLCanvasElement }).canvas.tagName).toBe("CANVAS");
		expect(options).toMatchObject({ curl: 9, fluidColor: "#ffffff", ...{ contained: true } });
	});

	it("pushes nothing on mount: onMounted owns the initial values", () => {
		render(FluidCursor, { props: { fluidColor: "#ffffff" } });
		expect(mocks.setOptions).not.toHaveBeenCalled();
	});

	it.each([
		["fluidColor", { fluidColor: "#ff0000" }],
		["fluidColors", { fluidColors: ["#ff0000", "#00ff00"] }],
		["contained", { contained: false }],
		["interactive", { interactive: false }],
		["allowMultiple", { allowMultiple: true }],
	])("forwards a %s change into the running engine", async (_name, change) => {
		const { rerender } = render(FluidCursor, { props: {} });
		await rerender(change);
		expect(mocks.setOptions).toHaveBeenCalledWith({ ...live, ...change });
		// Live, not a remount: the simulation keeps its dye and velocity fields.
		expect(mocks.create).toHaveBeenCalledTimes(1);
		expect(mocks.destroy).not.toHaveBeenCalled();
	});

	it("clears a fluidColor override by forwarding undefined", async () => {
		const { rerender } = render(FluidCursor, { props: { fluidColor: "#ff0000" } });
		await rerender({ fluidColor: undefined });
		expect(mocks.setOptions).toHaveBeenCalledWith({ ...live, fluidColor: undefined });
	});

	it("never recreates the engine, and never pushes a stale live value", async () => {
		// A mount-only prop change leaves the live watcher untouched (it tracks
		// the five live props only), so it pushes nothing — and the simulation is
		// never torn down and rebuilt.
		const { rerender } = render(FluidCursor, { props: { curl: 3, contained: false } });
		await rerender({ curl: 9, splatRadius: 0.4, dither: true, contained: false });
		for (const call of mocks.setOptions.mock.calls) {
			expect(call[0]).toEqual({ ...live, contained: false });
		}
		expect(mocks.create).toHaveBeenCalledTimes(1);
		expect(mocks.destroy).not.toHaveBeenCalled();
	});

	it("destroys the engine on unmount", () => {
		const { unmount } = render(FluidCursor, { props: {} });
		unmount();
		expect(mocks.destroy).toHaveBeenCalledTimes(1);
	});
});
