// bg-stars-core.ts — framework-free engine for StarsBackground.
//
// Zero framework imports. No module-scope window/document/navigator access,
// no import.meta.env, no Math.random outside create*/generateStars (both take
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
 * Pure helper that builds a CSS `box-shadow` value describing `count`
 * randomly placed dots of `color`, replicating the star field. Exported so
 * the wrapper can regenerate it whenever `starColor` changes, without
 * needing a live engine (this component has no canvas/rAF drawing beyond
 * the parallax spring).
 */
export function generateStars(count: number, color: string, random: () => number = Math.random): string {
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
 * CSS transform directly onto `parallax`. Never returns null today — there
 * is no canvas/WebGL context to fail on — but the signature matches the
 * shared engine contract for consistency with the other cores.
 */
export function createBgStars(
	el: BgStarsElements,
	options: BgStarsInitOptions & BgStarsLiveOptions,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	random: () => number = Math.random,
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

	let rafId: number | null = null;
	let destroyed = false;

	function applyTransform(): void {
		el.parallax.style.transform = `translate(${springX}px, ${springY}px)`;
	}

	function tick(): void {
		// Simple spring physics — mirrors the original inline implementation exactly.
		const forceX = (targetX - springX) * (stiffness / 1000);
		const forceY = (targetY - springY) * (stiffness / 1000);

		velocityX = velocityX * (1 - damping / 100) + forceX;
		velocityY = velocityY * (1 - damping / 100) + forceY;

		springX += velocityX;
		springY += velocityY;

		applyTransform();

		rafId = requestAnimationFrame(tick);
	}

	function handleMouseMove(e: MouseEvent): void {
		const centerX = window.innerWidth / 2;
		const centerY = window.innerHeight / 2;
		targetX = -(e.clientX - centerX) * factor;
		targetY = -(e.clientY - centerY) * factor;
	}

	el.host.addEventListener("mousemove", handleMouseMove);
	applyTransform();
	rafId = requestAnimationFrame(tick);

	return {
		setOptions(next) {
			if (destroyed) return;
			if (next.factor !== undefined) factor = next.factor;
			if (next.stiffness !== undefined) stiffness = next.stiffness;
			if (next.damping !== undefined) damping = next.damping;
		},
		resize() {
			// No layout-dependent state to recompute; kept for contract symmetry.
		},
		destroy() {
			if (destroyed) return;
			destroyed = true;
			el.host.removeEventListener("mousemove", handleMouseMove);
			if (rafId !== null) {
				cancelAnimationFrame(rafId);
				rafId = null;
			}
		},
	};
}
