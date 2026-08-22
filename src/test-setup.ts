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
HTMLCanvasElement.prototype.getContext = () => null;

// Mock window.matchMedia (not available in jsdom)
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

// Mock the Web Animations API (not available in jsdom). Svelte 5 runs every
// CSS `transition:` / `in:` / `out:` through `element.animate()`, so without
// this a component that animates on open throws
// "element.animate is not a function" the moment a test toggles it.
//
// The animation finishes on a microtask, never a timer: `onfinish` is assigned
// synchronously right after `animate()` returns, so it must not fire in the
// same tick — and many test files run on fake timers, which a `setTimeout`
// here would strand. `cancel()` suppresses the callback, matching the real
// API, which is what lets an aborted outro stay aborted. `playState` reports
// "finished" because Svelte polls `playState === "running"` in a tick loop.
class FakeAnimation {
	playState = "finished";
	currentTime = 0;
	startTime = 0;
	effect: unknown = null;
	onfinish: (() => void) | null = null;
	oncancel: (() => void) | null = null;
	#cancelled = false;
	constructor() {
		queueMicrotask(() => {
			if (this.#cancelled) return;
			this.onfinish?.();
		});
	}
	cancel() {
		this.#cancelled = true;
	}
	finish() {}
	play() {}
	pause() {}
	reverse() {}
	updatePlaybackRate() {}
	commitStyles() {}
	persist() {}
	addEventListener() {}
	removeEventListener() {}
}

// The DOM lib types declare `animate()` as always present, so the guard's
// negative branch narrows to `never`; cast through `unknown` like the
// getAnimations shim below.
if (!("animate" in Element.prototype)) {
	(Element.prototype as unknown as { animate: () => Animation }).animate = function animate() {
		return new FakeAnimation() as unknown as Animation;
	};
}

if (!("getAnimations" in Element.prototype)) {
	(Element.prototype as unknown as { getAnimations: () => Animation[] }).getAnimations = () => [];
}
