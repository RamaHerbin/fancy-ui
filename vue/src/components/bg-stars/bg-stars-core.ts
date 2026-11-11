// bg-stars-core.ts — framework-free engine for StarsBackground.
//
// Zero framework imports. No module-scope window/document/navigator access,
// no bundler env reads, no Math.random outside create*/generateStars (both take
// an optional `random` param, default Math.random, so a future seed prop can
// drive them).

/** The DOM handles the engine needs. */
export interface BgStarsElements {
	/** Element that receives the mousemove listener driving the parallax target. */
	host: HTMLElement;
	/** Element the spring-smoothed parallax transform is written to. */
	parallax: HTMLElement;
}

/** Props the Svelte wrapper reads ONLY at mount today. */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface BgStarsInitOptions {}

/** Props the Svelte wrapper reacts to after mount today. */
export interface BgStarsLiveOptions {
	/** Parallax factor for mouse movement (default: 0.05). */
	factor?: number;
	/** Spring stiffness for parallax (default: 50). */
	stiffness?: number;
	/** Spring damping for parallax (default: 20). */
	damping?: number;
	/**
	 * Reduced-motion preference, owned by the wrapper (the core never reads
	 * `matchMedia`). When true the parallax is parked at rest and the loop idles;
	 * a flip back to false resumes it.
	 */
	reducedMotion?: boolean;
}

export interface BgStarsEngine {
	setOptions(next: Partial<BgStarsLiveOptions>): void;
	resize(): void;
	destroy(): void;
}

const DEFAULT_FACTOR = 0.05;
const DEFAULT_STIFFNESS = 50;
const DEFAULT_DAMPING = 20;
/**
 * Sub-pixel: under this the spring neither moves the layer nor sits visibly
 * away from its target, so the loop parks instead of writing the same
 * transform every frame for the page's whole life.
 */
const REST_EPSILON = 0.01;

/**
 * Pure helper that builds a CSS `box-shadow` value describing `count`
 * randomly placed dots of `color`, replicating the star field. Exported so
 * the wrapper can regenerate it whenever `starColor` changes, without
 * needing a live engine (this component has no canvas/rAF drawing beyond
 * the parallax spring).
 */
export function generateStars(
	count: number,
	color: string,
	random: () => number = Math.random
): string {
	const shadows: string[] = [];
	for (let i = 0; i < count; i++) {
		const x = Math.floor(random() * 4000) - 2000;
		const y = Math.floor(random() * 4000) - 2000;
		shadows.push(`${x}px ${y}px ${color}`);
	}
	return shadows.join(", ");
}

/**
 * Creates the parallax-spring engine: a pointer listener on `host` feeds a
 * spring target, a rAF loop integrates it, and the result is written as a
 * CSS transform directly onto `parallax`. The loop only runs while there is
 * something to integrate: it parks once the spring has settled on its target
 * and while the page is in a background tab, and a new pointer target or the
 * tab coming back wakes it. Never returns null today — there
 * is no canvas/WebGL context to fail on — but the signature matches the
 * shared engine contract for consistency with the other cores.
 */
export function createBgStars(
	el: BgStarsElements,
	options: BgStarsInitOptions & BgStarsLiveOptions,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	random: () => number = Math.random
): BgStarsEngine | null {
	let factor = options.factor ?? DEFAULT_FACTOR;
	let stiffness = options.stiffness ?? DEFAULT_STIFFNESS;
	let damping = options.damping ?? DEFAULT_DAMPING;

	let springX = 0;
	let springY = 0;
	let targetX = 0;
	let targetY = 0;
	let velocityX = 0;
	let velocityY = 0;

	let reducedMotion = options.reducedMotion ?? false;
	let rafId: number | null = null;
	let destroyed = false;

	function applyTransform(): void {
		el.parallax.style.transform = `translate(${springX}px, ${springY}px)`;
	}

	function tick(): void {
		rafId = null;
		// Reduced motion: no parallax travel. Snap the spring to rest, write it
		// once, then idle until the preference flips back.
		if (reducedMotion) {
			springX = springY = targetX = targetY = velocityX = velocityY = 0;
			applyTransform();
			return;
		}

		// Simple spring physics — mirrors the original inline implementation exactly.
		const forceX = (targetX - springX) * (stiffness / 1000);
		const forceY = (targetY - springY) * (stiffness / 1000);

		velocityX = velocityX * (1 - damping / 100) + forceX;
		velocityY = velocityY * (1 - damping / 100) + forceY;

		springX += velocityX;
		springY += velocityY;

		const atRest =
			Math.abs(velocityX) < REST_EPSILON &&
			Math.abs(velocityY) < REST_EPSILON &&
			Math.abs(targetX - springX) < REST_EPSILON &&
			Math.abs(targetY - springY) < REST_EPSILON;

		if (atRest) {
			// Land exactly on the target so the parked transform matches the
			// one the loop would have converged to.
			velocityX = velocityY = 0;
			springX = targetX;
			springY = targetY;
		}

		applyTransform();

		if (!atRest) rafId = requestAnimationFrame(tick);
	}

	/**
	 * Wake the loop. Idempotent: a second wake while a frame is already
	 * queued, or while the page is in a background tab, changes nothing. Under
	 * reduced motion the spring never runs.
	 */
	function start(): void {
		if (rafId !== null || destroyed || reducedMotion || document.hidden) return;
		rafId = requestAnimationFrame(tick);
	}

	function stop(): void {
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
	}

	function handleVisibilityChange(): void {
		if (document.hidden) stop();
		else start();
	}

	function handleMouseMove(e: MouseEvent): void {
		if (reducedMotion) return;
		const centerX = window.innerWidth / 2;
		const centerY = window.innerHeight / 2;
		targetX = -(e.clientX - centerX) * factor;
		targetY = -(e.clientY - centerY) * factor;
		start();
	}

	el.host.addEventListener("mousemove", handleMouseMove);
	document.addEventListener("visibilitychange", handleVisibilityChange);
	applyTransform();
	start();

	return {
		setOptions(next) {
			if (destroyed) return;
			if (next.factor !== undefined) factor = next.factor;
			if (next.stiffness !== undefined) stiffness = next.stiffness;
			if (next.damping !== undefined) damping = next.damping;
			if (next.reducedMotion !== undefined && next.reducedMotion !== reducedMotion) {
				reducedMotion = next.reducedMotion;
				if (reducedMotion) {
					// Settle immediately instead of waiting for the next frame.
					stop();
					tick();
				} else {
					start();
				}
			}
		},
		resize() {
			// No layout-dependent state to recompute; kept for contract symmetry.
		},
		destroy() {
			if (destroyed) return;
			destroyed = true;
			el.host.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			stop();
		},
	};
}
