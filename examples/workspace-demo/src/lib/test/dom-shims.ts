// jsdom has no Web Animations API, and Svelte runs every transition (toasts,
// field messages, the accordion) through `element.animate()`. This stands in
// for it: an animation that finishes on a microtask, never a timer, so tests
// under fake timers do not strand it. Imported by `screen-kit.ts`.
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
			if (!this.#cancelled) this.onfinish?.();
		});
	}

	get finished() {
		return Promise.resolve(this);
	}

	cancel() {
		this.#cancelled = true;
		this.oncancel?.();
	}
	finish() {}
	play() {}
	pause() {}
	reverse() {}
	addEventListener() {}
	removeEventListener() {}
}

const proto = Element.prototype as unknown as {
	animate?: () => unknown;
	getAnimations?: () => unknown[];
};
if (!proto.animate) proto.animate = () => new FakeAnimation();
if (!proto.getAnimations) proto.getAnimations = () => [];
