// confetti-core.ts — framework-free engine wrapping the canvas-confetti instance.
//
// canvas-confetti owns its own animation loop and its own window resize
// listener (via the `resize: true` creation option), so this core has no
// rAF loop or resize wiring of its own to manage — `resize()` exists only
// to satisfy the shared engine contract and is a documented no-op.
//
// No `random` parameter: this component contains no randomness of its own,
// canvas-confetti generates the particle spread internally and exposes no
// seed hook, so a seed parameter would be dead weight.

import confettiModule from "canvas-confetti";
import type {
	GlobalOptions as ConfettiGlobalOptions,
	Options as ConfettiOptions,
	CreateTypes as ConfettiInstance,
} from "canvas-confetti";

export interface ConfettiElements {
	canvas: HTMLCanvasElement;
}

export interface ConfettiInitOptions {
	/** Options passed to canvas-confetti's `create()` call. Read once at mount. */
	globalOptions?: ConfettiGlobalOptions;
	/** Skip the automatic burst that otherwise fires as soon as the instance exists. */
	manualStart?: boolean;
}

export interface ConfettiLiveOptions {
	/**
	 * Default options merged under whatever is passed to `fire()`. The wrapper
	 * pushes the current prop value through `setOptions` immediately before
	 * every `fire()` call, matching the original read-at-call-time semantics.
	 */
	options?: ConfettiOptions;
}

export interface ConfettiEngine {
	/** Fires a burst, merging the current live `options` under `opts`. */
	fire(opts?: ConfettiOptions): void;
	setOptions(next: Partial<ConfettiLiveOptions>): void;
	resize(): void;
	destroy(): void;
}

export function createConfetti(
	elements: ConfettiElements,
	options: ConfettiInitOptions & ConfettiLiveOptions
): ConfettiEngine | null {
	// Deliberately unguarded, exactly as the wrapper called it before the
	// extraction: a throw here propagates to the caller's mount effect.
	let instance: ConfettiInstance | null = confettiModule.create(elements.canvas, {
		...options.globalOptions,
		resize: true,
	});

	// Contract's fail-quiet clause. Before the extraction a falsy instance left
	// the component inert (`instance?.(…)`), which is what a null engine does.
	if (!instance) {
		return null;
	}

	let live: ConfettiLiveOptions = { options: options.options ?? {} };
	let destroyed = false;

	const fire: ConfettiEngine["fire"] = (opts = {}) => {
		if (destroyed) return;
		instance?.({ ...live.options, ...opts });
	};

	if (!options.manualStart) {
		fire();
	}

	return {
		fire,
		setOptions(next) {
			if (destroyed) return;
			live = { ...live, ...next };
		},
		resize() {
			// canvas-confetti was created with `resize: true` and manages its own
			// window resize listener internally — nothing to do here.
		},
		destroy() {
			if (destroyed) return;
			destroyed = true;
			instance?.reset();
			instance = null;
		},
	};
}
