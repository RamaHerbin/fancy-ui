import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import confettiModule from "canvas-confetti";
import type {
	GlobalOptions as ConfettiGlobalOptions,
	Options as ConfettiOptions,
	CreateTypes as ConfettiInstance,
} from "canvas-confetti";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { ConfettiReactContext } from "./context.js";
import type { ConfettiContextValue } from "./context.js";

/**
 * The imperative surface the root exposes.
 *
 * The Svelte source declares `export function fire(...)`, which Svelte 5 hangs
 * off the component instance (`bind:this={c}; c.fire()`). React has no instance,
 * so the same method is published through the ref channel. This is the ONE place
 * the port's `forwardRef` is not backed by a `ref = $bindable` declaration: the
 * ref carries the handle, not the DOM node, because there is no bindable node to
 * carry and dropping `fire` would delete a public method.
 */
export interface ConfettiHandle {
	/** Fire the canvas instance. `opts` is merged over the component's `options`. */
	fire: (opts?: ConfettiOptions) => void;
}

export interface ConfettiProps {
	/** Default confetti options, merged under every `fire()` call. */
	options?: ConfettiOptions;
	/** Canvas creation options, read once when the instance is created. */
	globalOptions?: ConfettiGlobalOptions;
	/** Skip the automatic fire on mount. */
	manualStart?: boolean;
	/** Canvas CSS classes. */
	className?: string;
	/** Content rendered next to the canvas — typically the buttons that fire it. */
	children?: ReactNode;
}

/**
 * Canvas wrapper owning one `canvas-confetti` instance and publishing its
 * `fire` through context, so any `ConfettiButton` below it paints onto this
 * canvas rather than the library's own full-page one.
 *
 * Rest props are not spread: the Svelte source reads only these props off
 * `$props()` and has no `...restProps`.
 */
export const Confetti = forwardRef<ConfettiHandle, ConfettiProps>(
	(
		{ options = {}, globalOptions = {}, manualStart = false, className = "", children },
		ref
	) => {
		const canvasRef = useRef<HTMLCanvasElement | null>(null);
		const instanceRef = useRef<ConfettiInstance | null>(null);

		// `fire` closes over the *current* `options` on the Svelte side because
		// `options` is reactive there. Live refs reproduce that without rebuilding
		// the callback — which keeps both the context value and the ref handle
		// identity-stable for the life of the component.
		const optionsRef = useLiveRef(options);
		const globalOptionsRef = useLiveRef(globalOptions);
		const manualStartRef = useLiveRef(manualStart);

		const fire = useCallback((opts: ConfettiOptions = {}) => {
			instanceRef.current?.({ ...optionsRef.current, ...opts });
		}, [optionsRef]);

		useImperativeHandle(ref, () => ({ fire }), [fire]);

		const context = useMemo<ConfettiContextValue>(() => ({ fire }), [fire]);

		// The counterpart of `onMount` + its returned teardown. `fire` is stable,
		// so this runs exactly once; `globalOptions` and `manualStart` are read
		// through their live refs because the Svelte source reads them once, at
		// mount, and never re-creates the instance when they change.
		useEffect(() => {
			const canvas = canvasRef.current;
			if (!canvas) return;

			instanceRef.current = confettiModule.create(canvas, {
				...globalOptionsRef.current,
				resize: true,
			});

			if (!manualStartRef.current) {
				fire();
			}

			return () => {
				if (instanceRef.current) {
					instanceRef.current.reset();
					instanceRef.current = null;
				}
			};
		}, [fire, globalOptionsRef, manualStartRef]);

		return (
			<ConfettiReactContext.Provider value={context}>
				<div>
					<canvas ref={canvasRef} className={className} aria-hidden="true" />
					{children}
				</div>
			</ConfettiReactContext.Provider>
		);
	}
);

Confetti.displayName = "Confetti";
