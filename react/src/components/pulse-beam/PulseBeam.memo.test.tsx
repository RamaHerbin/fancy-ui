import { render, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The gradient builder is wrapped rather than replaced: every call still runs
// the real implementation, so the rendered output is untouched and only the
// call COUNT is observed.
vi.mock("./pulse-beam-data.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("./pulse-beam-data.js")>();
	return { ...actual, buildLayerBackgrounds: vi.fn(actual.buildLayerBackgrounds) };
});

import { PulseBeam } from "./PulseBeam.js";
import { buildLayerBackgrounds } from "./pulse-beam-data.js";

const builder = vi.mocked(buildLayerBackgrounds);

describe("PulseBeam background memoisation", () => {
	beforeEach(() => {
		builder.mockClear();
	});

	afterEach(() => {
		cleanup();
	});

	it("does not rebuild the layer gradients on a re-render with unchanged props", () => {
		const { rerender } = render(<PulseBeam />);
		const afterMount = builder.mock.calls.length;
		expect(afterMount).toBeGreaterThan(0);
		rerender(<PulseBeam />);
		rerender(<PulseBeam />);
		expect(builder.mock.calls.length).toBe(afterMount);
	});

	it("keeps the memo effective for an inline `colors` literal", () => {
		const { rerender } = render(<PulseBeam colors={["#f00", "#0f0", "#00f"]} />);
		const afterMount = builder.mock.calls.length;
		rerender(<PulseBeam colors={["#f00", "#0f0", "#00f"]} />);
		expect(builder.mock.calls.length).toBe(afterMount);
	});

	it("rebuilds when the configuration actually changes", () => {
		const { container, rerender } = render(<PulseBeam colors={["#f00"]} />);
		const afterMount = builder.mock.calls.length;
		rerender(<PulseBeam colors={["#00f"]} />);
		expect(builder.mock.calls.length).toBeGreaterThan(afterMount);
		const stroke = container.querySelector(".pulse-beam__stroke") as HTMLDivElement;
		expect(stroke.style.background).toContain("0, 0, 255");
		const changed = builder.mock.calls.length;
		rerender(<PulseBeam colors={["#00f"]} variant="outside" />);
		expect(builder.mock.calls.length).toBeGreaterThan(changed);
	});
});
