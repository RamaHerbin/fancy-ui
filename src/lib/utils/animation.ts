/**
 * Animation Utilities
 *
 * Helpers for creating smooth animations, spring physics, and easing functions.
 * Used across many FancyUI components for consistent animation behavior.
 */

// =============================================================================
// Types
// =============================================================================

export interface SpringConfig {
	/** Stiffness of the spring (default: 100) */
	stiffness: number;
	/** Damping ratio (default: 10) */
	damping: number;
	/** Mass of the object (default: 1) */
	mass: number;
}

export interface AnimationOptions {
	/** Duration in milliseconds */
	duration: number;
	/** Easing function */
	easing?: (t: number) => number;
	/** Delay before starting in milliseconds */
	delay?: number;
}

// =============================================================================
// Spring Presets
// =============================================================================

/**
 * Pre-configured spring settings for common use cases
 */
export const springPresets: Record<string, SpringConfig> = {
	/** Default balanced spring */
	default: { stiffness: 100, damping: 10, mass: 1 },
	/** Gentle, slow spring */
	gentle: { stiffness: 50, damping: 14, mass: 1 },
	/** Wobbly, bouncy spring */
	wobbly: { stiffness: 180, damping: 12, mass: 1 },
	/** Stiff, snappy spring */
	stiff: { stiffness: 210, damping: 20, mass: 1 },
	/** Very slow, heavy spring */
	slow: { stiffness: 50, damping: 20, mass: 1 },
	/** Quick, responsive spring */
	quick: { stiffness: 300, damping: 25, mass: 1 },
};

// =============================================================================
// Easing Functions
// =============================================================================

/**
 * Linear easing (no easing)
 */
export function linear(t: number): number {
	return t;
}

/**
 * Ease in (accelerating)
 */
export function easeIn(t: number): number {
	return t * t;
}

/**
 * Ease out (decelerating)
 */
export function easeOut(t: number): number {
	return t * (2 - t);
}

/**
 * Ease in-out (accelerate then decelerate)
 */
export function easeInOut(t: number): number {
	return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/**
 * Cubic ease in
 */
export function easeInCubic(t: number): number {
	return t * t * t;
}

/**
 * Cubic ease out
 */
export function easeOutCubic(t: number): number {
	return 1 - Math.pow(1 - t, 3);
}

/**
 * Cubic ease in-out
 */
export function easeInOutCubic(t: number): number {
	return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Bounce ease out
 */
export function easeOutBounce(t: number): number {
	const n1 = 7.5625;
	const d1 = 2.75;

	if (t < 1 / d1) {
		return n1 * t * t;
	} else if (t < 2 / d1) {
		return n1 * (t -= 1.5 / d1) * t + 0.75;
	} else if (t < 2.5 / d1) {
		return n1 * (t -= 2.25 / d1) * t + 0.9375;
	} else {
		return n1 * (t -= 2.625 / d1) * t + 0.984375;
	}
}

/**
 * Elastic ease out
 */
export function easeOutElastic(t: number): number {
	const c4 = (2 * Math.PI) / 3;

	return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

/**
 * Back ease out (overshoots then settles)
 */
export function easeOutBack(t: number): number {
	const c1 = 1.70158;
	const c3 = c1 + 1;

	return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// =============================================================================
// Animation Helpers
// =============================================================================

/**
 * Interpolate between two values
 */
export function lerp(start: number, end: number, t: number): number {
	return start + (end - start) * t;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/**
 * Map a value from one range to another
 */
export function mapRange(
	value: number,
	inMin: number,
	inMax: number,
	outMin: number,
	outMax: number
): number {
	return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Calculate spring physics for a single step
 */
export function springStep(
	current: number,
	target: number,
	velocity: number,
	config: SpringConfig,
	deltaTime: number
): { position: number; velocity: number } {
	const { stiffness, damping, mass } = config;

	// Spring force: F = -kx - cv
	const springForce = -stiffness * (current - target);
	const dampingForce = -damping * velocity;
	const acceleration = (springForce + dampingForce) / mass;

	const newVelocity = velocity + acceleration * deltaTime;
	const newPosition = current + newVelocity * deltaTime;

	return { position: newPosition, velocity: newVelocity };
}

/**
 * Check if a spring animation is at rest
 */
export function isSpringAtRest(
	current: number,
	target: number,
	velocity: number,
	threshold: number = 0.001
): boolean {
	return Math.abs(current - target) < threshold && Math.abs(velocity) < threshold;
}

/**
 * Create a staggered delay for list animations
 */
export function staggerDelay(index: number, baseDelay: number = 50): number {
	return index * baseDelay;
}

/**
 * Calculate animation progress based on elapsed time
 */
export function getProgress(elapsed: number, duration: number): number {
	return clamp(elapsed / duration, 0, 1);
}

/**
 * Get duration value from CSS custom property or fallback
 */
export function getDurationFromCSS(
	property: "--animation-fast" | "--animation-normal" | "--animation-slow" | "--animation-slower",
	fallback: number = 300
): number {
	if (typeof window === "undefined") return fallback;

	const value = getComputedStyle(document.documentElement).getPropertyValue(property).trim();
	const parsed = parseInt(value, 10);

	return isNaN(parsed) ? fallback : parsed;
}

/**
 * Debounce an animation frame callback
 */
export function rafDebounce<T extends (...args: unknown[]) => void>(fn: T): T {
	let frameId: number | null = null;

	return ((...args: unknown[]) => {
		if (frameId !== null) {
			cancelAnimationFrame(frameId);
		}
		frameId = requestAnimationFrame(() => {
			fn(...args);
			frameId = null;
		});
	}) as T;
}

/**
 * Throttle function calls to animation frames
 */
export function rafThrottle<T extends (...args: unknown[]) => void>(fn: T): T {
	let frameId: number | null = null;
	let lastArgs: unknown[] | null = null;

	return ((...args: unknown[]) => {
		lastArgs = args;
		if (frameId === null) {
			frameId = requestAnimationFrame(() => {
				fn(...(lastArgs as unknown[]));
				frameId = null;
			});
		}
	}) as T;
}
