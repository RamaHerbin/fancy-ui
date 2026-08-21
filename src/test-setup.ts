import "@testing-library/jest-dom/vitest";

// Mock ResizeObserver (not available in jsdom)
global.ResizeObserver = class ResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
};

// Mock IntersectionObserver (not available in jsdom)
global.IntersectionObserver = class IntersectionObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof IntersectionObserver;

// Mock HTMLCanvasElement.getContext (not available in jsdom without canvas package)
// and window.matchMedia (not available in jsdom). Guarded: `setupFiles` also runs
// for `@vitest-environment node` suites (the SSR safety net), where neither
// global exists.
if (typeof window !== "undefined") {
	HTMLCanvasElement.prototype.getContext = () => null;

	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: (query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
			addListener: () => {},
			removeListener: () => {},
		}),
	});
}
