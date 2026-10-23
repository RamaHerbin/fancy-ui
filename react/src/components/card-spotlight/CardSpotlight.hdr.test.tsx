import { act, render, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CardSpotlight } from "./CardSpotlight.js";

function stubHdrCapable() {
	vi.stubGlobal("navigator", { ...navigator, gpu: {} });
	vi.stubGlobal(
		"matchMedia",
		vi.fn((q: string) => ({
			matches: q.includes("dynamic-range: high"),
			media: q,
			addEventListener() {},
			removeEventListener() {},
		}))
	);
}

function stubSwitchableDisplay() {
	let high = false;
	const listeners = new Set<(e: { matches: boolean }) => void>();
	vi.stubGlobal("navigator", { ...navigator, gpu: {} });
	vi.stubGlobal("matchMedia", (query: string) => ({
		get matches() {
			return query === "(dynamic-range: high)" && high;
		},
		media: query,
		addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.add(fn),
		removeEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.delete(fn),
		addListener: () => {},
		removeListener: () => {},
	}));
	return (next: boolean) => {
		high = next;
		listeners.forEach((fn) => fn({ matches: next }));
	};
}

describe("CardSpotlight HDR layer", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("renders no canvas by default in an environment without WebGPU", () => {
		const { container } = render(<CardSpotlight />);
		expect(container.querySelector("canvas")).toBeNull();
		expect(container.querySelector("[data-hdr]")).toBeNull();
	});

	it("renders the overlay canvas on a WebGPU, HDR-capable device", () => {
		stubHdrCapable();
		const { container } = render(<CardSpotlight hdr />);
		const canvas = container.querySelector("canvas");
		expect(canvas).not.toBeNull();
		expect(canvas?.getAttribute("aria-hidden")).toBe("true");
	});

	it("keeps HDR off by default, and never renders a canvas with hdr={false}", () => {
		stubHdrCapable();
		const byDefault = render(<CardSpotlight />);
		expect(byDefault.container.querySelector("canvas")).toBeNull();
		cleanup();
		const { container } = render(<CardSpotlight hdr={false} />);
		expect(container.querySelector("canvas")).toBeNull();
	});

	it("adds and drops the canvas as the window moves between SDR and HDR displays", () => {
		const setHdr = stubSwitchableDisplay();
		const { container } = render(<CardSpotlight hdr />);
		expect(container.querySelector("canvas")).toBeNull();
		act(() => setHdr(true));
		expect(container.querySelector("canvas")).not.toBeNull();
		act(() => setHdr(false));
		expect(container.querySelector("canvas")).toBeNull();
	});
});
