import { useEffect, useState } from "react";
import { cn } from "../../utils.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { observeInView } from "../../internals/motion/in-view.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";
import { createNoiseReveal, type NoiseRevealEngine } from "./noise-reveal-core.js";

export interface NoiseRevealProps {
	/** Image URL */
	src: string;
	/** Accessible label for the image */
	alt?: string;
	/** Reveal trigger: "view" = on viewport entry, "manual" = via `revealed` */
	trigger?: "view" | "manual";
	/** Manual reveal state (used with trigger="manual"; also allows re-hiding) */
	revealed?: boolean;
	/** Reveal animation duration in seconds */
	duration?: number;
	/** Delay before reveal in seconds (trigger="view") */
	delay?: number;
	/** Additional CSS classes */
	className?: string;
}

export function NoiseReveal({
	src,
	alt,
	trigger = "view",
	revealed = false,
	duration = 1.5,
	delay = 0,
	className = "",
}: NoiseRevealProps) {
	const [container, containerRef] = useElementRef<HTMLDivElement>();

	// State, not a ref: the trigger effects below must re-run the moment the
	// scene effect publishes its engine, which is exactly what the source's
	// `$state.raw` buys there.
	const [engine, setEngine] = useState<NoiseRevealEngine | null>(null);

	// The source reads `revealed` and the reduced-motion preference through
	// `untrack` when it builds the scene, so a change to either must never
	// rebuild it (that would dispose and re-create the renderer). Live refs
	// reproduce that; the changes themselves reach the running engine through
	// `setOptions` below.
	const revealedRef = useLiveRef(revealed);
	const reducedMotion = useReducedMotion();
	const reducedRef = useLiveRef(reducedMotion);

	// Scene lifecycle. The dissolve itself lives in the framework-free engine
	// shared with the Svelte and Vue packages (`noise-reveal-core.ts`, a
	// byte-identical copy). The dependency array is the set the source's
	// `$effect` reads reactively: the texture, the tween length and the trigger
	// — any of the three changing disposes the old scene and builds a new one.
	useEffect(() => {
		if (!container) return;

		const instance = createNoiseReveal(
			{ container },
			{
				src,
				duration,
				trigger,
				revealed: revealedRef.current,
				reducedMotion: reducedRef.current,
			}
		);
		// No WebGL context: the host stays an empty box, as on the other packages.
		if (!instance) return;
		setEngine(instance);

		// Every frame evaluates the noise twice per fragment at the device pixel
		// ratio, so a canvas that is off screen is pure cost: the engine stops its
		// loop while `visible` is false and picks up where it left off (it handles
		// a background tab by itself). `threshold: 0` — any sliver on screen counts
		// as visible — and `once: false`, because this has to keep reporting both
		// ways. The loop starts before the first observer callback, which lands a
		// task later: a canvas already on screen never holds a blank frame.
		const inViewHandle = observeInView(container, {
			once: false,
			threshold: 0,
			onChange: (intersecting) => instance.setOptions({ visible: intersecting }),
		});

		return () => {
			setEngine(null);
			inViewHandle.destroy();
			instance.destroy();
		};
	}, [container, src, duration, trigger, revealedRef, reducedRef]);

	// Reduced motion: one still frame, the grain freezes, target changes snap.
	useEffect(() => {
		engine?.setOptions({ reducedMotion });
	}, [engine, reducedMotion]);

	// Viewport trigger: reveal once on first intersection
	useEffect(() => {
		if (trigger !== "view" || !container || !engine) return;

		const instance = engine;
		let timeoutId = 0;
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						observer.disconnect();
						timeoutId = window.setTimeout(() => instance.setOptions({ target: 1 }), delay * 1000);
					}
				}
			},
			{ threshold: 0.1 }
		);

		observer.observe(container);

		return () => {
			observer.disconnect();
			clearTimeout(timeoutId);
		};
	}, [trigger, container, engine, delay]);

	// Manual trigger: follow the `revealed` prop both ways
	useEffect(() => {
		if (trigger !== "manual" || !engine) return;
		engine.setOptions({ target: revealed ? 1 : 0 });
	}, [trigger, engine, revealed]);

	return (
		<div
			ref={containerRef}
			className={cn("relative h-[400px] w-full", className)}
			role={alt ? "img" : undefined}
			aria-label={alt}
		/>
	);
}
