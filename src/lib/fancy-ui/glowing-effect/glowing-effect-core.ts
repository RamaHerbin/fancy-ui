/**
 * GlowingEffect core — framework-free pointer-proximity engine.
 *
 * Owns the two rAF loops (pointer/scroll sampling + angle tween) and the
 * `scroll` / `pointermove` listeners that drive them. The wrapper owns
 * markup, classes, a11y and the `disabled` gate that decides whether to
 * create this engine at all.
 */

export interface GlowingEffectElements {
	/** The element whose CSS custom properties (`--start`, `--active`) are driven by pointer proximity. */
	container: HTMLElement;
}

/**
 * Props the wrapper only reads once, at mount.
 *
 * None today: `disabled` is the only mount-only prop and it never reaches the
 * engine — the wrapper decides whether to create it at all, exactly as the
 * pre-extraction `onMount` did.
 */
export interface GlowingEffectInitOptions {}

/**
 * Props the engine re-reads while it runs.
 *
 * All three were read per-frame before the extraction (Svelte 5 destructured
 * props compile to getters, so every reference inside `handleMove` /
 * `animateAngle` was a fresh read), so they must stay live here.
 */
export interface GlowingEffectLiveOptions {
	/** Radius (as a fraction of min(width, height)) around the center where proximity is ignored. */
	inactiveZone?: number;
	/** Extra margin (px) outside the container's bounds that still counts as "active". */
	proximity?: number;
	/** Inverse speed of the angle tween: higher = slower to catch up. */
	movementDuration?: number;
}

export interface GlowingEffectEngine {
	setOptions(next: Partial<GlowingEffectLiveOptions>): void;
	resize(): void;
	destroy(): void;
}

/** Matches the Svelte wrapper's `$props()` defaults. */
const DEFAULT_INACTIVE_ZONE = 0.7;
const DEFAULT_PROXIMITY = 0;
const DEFAULT_MOVEMENT_DURATION = 2;
/** Base lerp step, divided by `movementDuration` (floored at 0.1). */
const BASE_LERP_SPEED = 0.08;
/** Below this many degrees of remaining travel the tween snaps and stops. */
const ANGLE_EPSILON = 0.1;

/**
 * Creates the pointer-proximity engine for GlowingEffect.
 *
 * Never returns null in practice: unlike the canvas/WebGL cores, this engine
 * only needs a DOM element and `requestAnimationFrame`, both always present
 * wherever the wrapper would call this. Kept nullable in the signature to match
 * the shared engine contract, so a future guard can be added without a
 * breaking change.
 *
 * `random` is accepted for contract symmetry only: this engine is fully
 * deterministic and draws no random numbers.
 */
export function createGlowingEffect(
	el: GlowingEffectElements,
	options: GlowingEffectInitOptions & GlowingEffectLiveOptions,
	random?: () => number
): GlowingEffectEngine | null {
	void random;

	const { container } = el;

	let inactiveZone = options.inactiveZone ?? DEFAULT_INACTIVE_ZONE;
	let proximity = options.proximity ?? DEFAULT_PROXIMITY;
	let movementDuration = options.movementDuration ?? DEFAULT_MOVEMENT_DURATION;

	let lastPosition = { x: 0, y: 0 };
	let animationFrameId = 0;
	let angleAnimationFrameId = 0;
	let currentAngle = 0;
	let targetAngle = 0;
	let animating = false;
	let destroyed = false;

	function handleMove(e?: { x: number; y: number }) {
		if (destroyed) return;

		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
		}

		animationFrameId = requestAnimationFrame(() => {
			if (destroyed) return;

			const { left, top, width, height } = container.getBoundingClientRect();
			const mouseX = e?.x ?? lastPosition.x;
			const mouseY = e?.y ?? lastPosition.y;

			if (e) {
				lastPosition = { x: mouseX, y: mouseY };
			}

			// Literal 2-element array: both indices are always defined.
			const center = [left + width * 0.5, top + height * 0.5];
			const distanceFromCenter = Math.hypot(mouseX - center[0]!, mouseY - center[1]!);
			const inactiveRadius = 0.5 * Math.min(width, height) * inactiveZone;

			if (distanceFromCenter < inactiveRadius) {
				container.style.setProperty("--active", "0");
				return;
			}

			const isActive =
				mouseX > left - proximity &&
				mouseX < left + width + proximity &&
				mouseY > top - proximity &&
				mouseY < top + height + proximity;

			container.style.setProperty("--active", isActive ? "1" : "0");

			if (!isActive) return;

			const rawTarget = (180 * Math.atan2(mouseY - center[1]!, mouseX - center[0]!)) / Math.PI + 90;

			// Shortest-path angle difference
			const angleDiff = ((rawTarget - currentAngle + 180) % 360) - 180;
			targetAngle = currentAngle + angleDiff;

			if (!animating) {
				animating = true;
				animateAngle();
			}
		});
	}

	function animateAngle() {
		// Lerp speed inversely proportional to movementDuration
		const speed = BASE_LERP_SPEED / Math.max(movementDuration, 0.1);
		currentAngle = currentAngle + (targetAngle - currentAngle) * speed;

		container.style.setProperty("--start", String(currentAngle));

		if (Math.abs(targetAngle - currentAngle) > ANGLE_EPSILON) {
			angleAnimationFrameId = requestAnimationFrame(animateAngle);
		} else {
			currentAngle = targetAngle;
			container.style.setProperty("--start", String(currentAngle));
			animating = false;
		}
	}

	function handlePointerMove(e: PointerEvent) {
		handleMove(e);
	}

	function handleScroll() {
		handleMove();
	}

	window.addEventListener("scroll", handleScroll, { passive: true });
	document.body.addEventListener("pointermove", handlePointerMove, { passive: true });

	return {
		setOptions(next) {
			if (destroyed) return;
			// Absent keys keep their current value; the next sampled frame / tween
			// step picks the new ones up, exactly as the per-frame prop reads did.
			if (next.inactiveZone !== undefined) inactiveZone = next.inactiveZone;
			if (next.proximity !== undefined) proximity = next.proximity;
			if (next.movementDuration !== undefined) movementDuration = next.movementDuration;
		},
		resize() {
			// No cached geometry to invalidate: getBoundingClientRect is read fresh
			// on every handleMove tick.
		},
		destroy() {
			if (destroyed) return;
			destroyed = true;
			if (animationFrameId) cancelAnimationFrame(animationFrameId);
			if (angleAnimationFrameId) cancelAnimationFrame(angleAnimationFrameId);
			window.removeEventListener("scroll", handleScroll);
			document.body.removeEventListener("pointermove", handlePointerMove);
		},
	};
}
