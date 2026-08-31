import "@testing-library/jest-dom/vitest";

// Fakes for the browser APIs jsdom does not implement. Ported from the Svelte
// package's own test-setup so both suites exercise the same stubs; the additions
// are marked, and every one of them is required by a module in `src/internals/`.

/**
 * The Web Animations API (not available in jsdom). `runTransition` calls exactly
 * the API Svelte's transition runtime calls, so without this every presence /
 * transition test throws "element.animate is not a function" the moment a surface
 * opens.
 *
 * The animation finishes on a MICROTASK, never a timer: `onfinish` is assigned
 * synchronously right after `animate()` returns, so it must not fire in the same
 * tick — and many suites run on fake timers, which a `setTimeout` here would
 * strand. `cancel()` suppresses the callback, matching the real API, which is what
 * lets an aborted outro stay aborted. `playState` reports "finished" because the
 * transition runtime polls `playState === "running"`.
 *
 * Port addition: the constructor arguments are recorded (`target`, `keyframes`,
 * `options`) and every instance is pushed onto `FakeAnimation.instances`, because
 * the transition tests assert on the sampled keyframe list — the Svelte side did
 * that through a `.test.svelte` harness that does not exist here.
 */
export class FakeAnimation {
	/** Every animation created since the current test began. Reset per test, below. */
	static instances: FakeAnimation[] = [];

	readonly target: Element;
	readonly keyframes: Keyframe[] | PropertyIndexedKeyframes | null;
	readonly options: number | KeyframeAnimationOptions | undefined;

	playState = "finished";
	currentTime = 0;
	startTime = 0;
	/** Writable and loosely typed on purpose: `runTransition`'s abort nulls it. */
	effect: unknown = null;
	onfinish: (() => void) | null = null;
	oncancel: (() => void) | null = null;
	#cancelled = false;

	constructor(
		target: Element,
		keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
		options?: number | KeyframeAnimationOptions
	) {
		this.target = target;
		this.keyframes = keyframes;
		this.options = options;
		FakeAnimation.instances.push(this);
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

/**
 * IntersectionObserver (not available in jsdom). `trigger(isIntersecting)` fires the
 * observer's callback for every observed element — port addition, so an in-view test
 * can drive the observer without hand-rolling a stub per file.
 */
export class FakeIntersectionObserver {
	/** Every observer constructed since the current test began. Reset per test, below. */
	static instances: FakeIntersectionObserver[] = [];

	readonly root: Element | Document | null = null;
	readonly rootMargin: string = "0px";
	readonly thresholds: readonly number[] = [0];
	readonly elements = new Set<Element>();
	readonly options: IntersectionObserverInit | undefined;
	readonly callback: IntersectionObserverCallback;

	constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
		this.callback = callback;
		this.options = options;
		FakeIntersectionObserver.instances.push(this);
	}

	observe(target: Element) {
		this.elements.add(target);
	}
	unobserve(target: Element) {
		this.elements.delete(target);
	}
	disconnect() {
		this.elements.clear();
	}
	takeRecords(): IntersectionObserverEntry[] {
		return [];
	}

	/** Report `isIntersecting` for every currently observed element. */
	trigger(isIntersecting: boolean) {
		const entries = [...this.elements].map((target) => ({
			target,
			isIntersecting,
			intersectionRatio: isIntersecting ? 1 : 0,
			boundingClientRect: target.getBoundingClientRect(),
			intersectionRect: target.getBoundingClientRect(),
			rootBounds: null,
			time: 0,
		}));
		this.callback(
			entries as unknown as IntersectionObserverEntry[],
			this as unknown as IntersectionObserver
		);
	}
}

/** ResizeObserver (not available in jsdom). Inert, exactly as on the Svelte side. */
export class FakeResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
}

globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;

// `setupFiles` also runs for `@vitest-environment node` suites (the SSR safety
// net), where none of the following globals exist.
if (typeof window !== "undefined") {
	// HTMLCanvasElement.getContext (not available in jsdom without the canvas package).
	HTMLCanvasElement.prototype.getContext = () => null;

	// matchMedia (not available in jsdom). `configurable` as well as `writable`, so a
	// test can replace it wholesale with `vi.stubGlobal` and have it restored —
	// `useMediaQuery`'s suite drives change events through its own list.
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		configurable: true,
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

	// Installed unconditionally, not behind an `"animate" in Element.prototype`
	// guard: the stub is a hard requirement of the transition sampler, and deferring
	// to a partial host implementation would silently lose the microtask contract
	// above. The DOM lib types declare `animate()` as always present, so the
	// assignment casts through `unknown`, as does the `getAnimations` shim.
	(Element.prototype as unknown as { animate: Element["animate"] }).animate = function animate(
		this: Element,
		keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
		options?: number | KeyframeAnimationOptions
	) {
		return new FakeAnimation(this, keyframes, options) as unknown as Animation;
	};

	if (!("getAnimations" in Element.prototype)) {
		(Element.prototype as unknown as { getAnimations: () => Animation[] }).getAnimations = () => [];
	}

	// `navigator.vibrate` is deliberately NOT installed: jsdom omits it, so
	// `canVibrate()` is false and the unsupported path is what every suite gets by
	// default. The haptics suite installs it per test.
}

// The two recording registries are per-test state, so they are emptied before each
// test rather than accumulating across a file.
beforeEach(() => {
	FakeAnimation.instances.length = 0;
	FakeIntersectionObserver.instances.length = 0;
});
