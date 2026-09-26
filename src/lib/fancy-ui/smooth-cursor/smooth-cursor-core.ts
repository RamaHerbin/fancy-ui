/**
 * SmoothCursor core — framework-free spring-physics cursor engine.
 *
 * Owns the rAF loop, the spring integration, rotation-from-velocity, the
 * `document`-level pointer listeners and the native-cursor hide/restore.
 * The wrapper owns markup, the cursor snippet, `class`, a11y attributes and
 * the `prefers-reduced-motion` query. The query's *mount* value is forwarded as
 * a creation option (plain assignment, no snap); only a later *change* event is
 * forwarded through `setOptions({ reducedMotion })`, which snaps. That split
 * reproduces the original wrapper's two distinct reduced-motion entry points.
 */

export interface SpringConfig {
	/** Controls how quickly the animation settles (default: 45) */
	damping?: number;
	/** Controls the spring stiffness (default: 400) */
	stiffness?: number;
	/** Controls the virtual mass of the animated object (default: 1) */
	mass?: number;
}

export interface SmoothCursorElements {
	/** The fixed-position element the engine transforms in place. */
	cursor: HTMLElement;
}

export interface SmoothCursorInitOptions {
	/** Called whenever the engine's visibility (pointer on/off screen) changes. */
	onVisibleChange?: (visible: boolean) => void;
}

export interface SmoothCursorLiveOptions {
	/** Spring physics configuration. */
	springConfig?: SpringConfig;
	/**
	 * Wrapper-owned `prefers-reduced-motion` result. Passed at creation it is a
	 * plain initial value; pushed through `setOptions` it additionally stops the
	 * loop and snaps to the pointer (zeroing velocity), matching the original
	 * wrapper's media-query `change` handler.
	 */
	reducedMotion?: boolean;
}

export interface SmoothCursorEngine {
	setOptions(next: Partial<SmoothCursorLiveOptions>): void;
	resize(): void;
	destroy(): void;
}

const DEFAULT_DAMPING = 45;
const DEFAULT_STIFFNESS = 400;
const DEFAULT_MASS = 1;
/** Frame-delta clamp, in seconds — caps the spring step after a long stall. */
const MAX_DT = 0.064;
/** Below this movement (px) the rotation target is not recomputed. */
const MIN_ROTATION_DISTANCE = 0.1;
/** How quickly the rendered rotation eases toward the movement-direction target. */
const ROTATION_EASE = 0.3;

function resolveConfig(springConfig: SpringConfig | undefined): Required<SpringConfig> {
	return {
		damping: springConfig?.damping ?? DEFAULT_DAMPING,
		stiffness: springConfig?.stiffness ?? DEFAULT_STIFFNESS,
		mass: springConfig?.mass ?? DEFAULT_MASS,
	};
}

export function createSmoothCursor(
	el: SmoothCursorElements,
	options: SmoothCursorInitOptions & SmoothCursorLiveOptions
): SmoothCursorEngine {
	const { cursor } = el;
	const onVisibleChange = options.onVisibleChange;

	let springConfig = options.springConfig;
	let reducedMotion = options.reducedMotion ?? false;

	// Spring state
	let posX = 0;
	let posY = 0;
	let velX = 0;
	let velY = 0;
	let targetX = 0;
	let targetY = 0;

	// Rotation state
	let rotation = 0;
	let prevX = 0;
	let prevY = 0;

	let visible = false;
	let rafId: number | null = null;
	let lastTime = 0;
	let destroyed = false;

	function setVisible(next: boolean) {
		if (visible === next) return;
		visible = next;
		onVisibleChange?.(visible);
	}

	function startAnimation() {
		if (rafId === null) {
			lastTime = 0;
			rafId = requestAnimationFrame(animate);
		}
	}

	function stopAnimation() {
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
	}

	function snapToTarget() {
		posX = targetX;
		posY = targetY;
		velX = 0;
		velY = 0;
		cursor.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
	}

	function onMouseMove(e: MouseEvent) {
		targetX = e.clientX;
		targetY = e.clientY;

		if (!visible) {
			posX = targetX;
			posY = targetY;
			prevX = targetX;
			prevY = targetY;
			setVisible(true);
		}

		if (reducedMotion) {
			snapToTarget();
		} else {
			startAnimation();
		}
	}

	function onMouseLeave() {
		setVisible(false);
		stopAnimation();
	}

	function onMouseEnter(e: MouseEvent) {
		targetX = e.clientX;
		targetY = e.clientY;
		posX = targetX;
		posY = targetY;
		prevX = targetX;
		prevY = targetY;
		setVisible(true);

		if (!reducedMotion) {
			startAnimation();
		} else {
			snapToTarget();
		}
	}

	function animate(time: number) {
		if (!visible) {
			rafId = null;
			return;
		}

		rafId = requestAnimationFrame(animate);

		if (lastTime === 0) {
			lastTime = time;
			return;
		}

		const dt = Math.min((time - lastTime) / 1000, MAX_DT);
		lastTime = time;

		const { stiffness, damping, mass } = resolveConfig(springConfig);

		// Spring physics: F = -k * displacement - c * velocity
		const forceX = -stiffness * (posX - targetX) - damping * velX;
		const forceY = -stiffness * (posY - targetY) - damping * velY;

		const accX = forceX / mass;
		const accY = forceY / mass;

		velX += accX * dt;
		velY += accY * dt;

		posX += velX * dt;
		posY += velY * dt;

		// Calculate rotation based on movement direction
		const dx = posX - prevX;
		const dy = posY - prevY;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance > MIN_ROTATION_DISTANCE) {
			const targetRotation = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
			let diff = targetRotation - rotation;
			while (diff > 180) diff -= 360;
			while (diff < -180) diff += 360;
			rotation += diff * ROTATION_EASE;
		}

		prevX = posX;
		prevY = posY;

		cursor.style.transform = `translate3d(${posX}px, ${posY}px, 0) rotate(${rotation}deg)`;
	}

	// Capture the host's own inline cursor so teardown restores it exactly
	// instead of wiping it (e.g. an app-set `crosshair`).
	const previousBodyCursor = document.body.style.cursor;
	document.body.style.cursor = "none";

	document.addEventListener("mousemove", onMouseMove);
	document.documentElement.addEventListener("mouseleave", onMouseLeave);
	document.documentElement.addEventListener("mouseenter", onMouseEnter);

	return {
		setOptions(next) {
			if (destroyed) return;
			if ("springConfig" in next) {
				springConfig = next.springConfig;
			}
			if ("reducedMotion" in next) {
				// Mirrors the original wrapper's `onMotionChange` exactly: the snap
				// is UNCONDITIONAL (it is the only path that zeroes velX/velY), and
				// only the resume is gated on `visible`. The mount-time value is
				// NOT routed here — the wrapper passes it as a creation option, the
				// way the original's plain `reducedMotion = motionQuery.matches`
				// assignment did, so this branch is only ever reached from a real
				// media-query change event.
				reducedMotion = next.reducedMotion ?? false;
				if (reducedMotion) {
					stopAnimation();
					snapToTarget();
				} else if (visible) {
					startAnimation();
				}
			}
		},
		resize() {
			// No geometry to recompute: the cursor tracks raw pointer coordinates.
		},
		destroy() {
			if (destroyed) return;
			destroyed = true;
			document.body.style.cursor = previousBodyCursor;
			document.removeEventListener("mousemove", onMouseMove);
			document.documentElement.removeEventListener("mouseleave", onMouseLeave);
			document.documentElement.removeEventListener("mouseenter", onMouseEnter);
			stopAnimation();
		},
	};
}
