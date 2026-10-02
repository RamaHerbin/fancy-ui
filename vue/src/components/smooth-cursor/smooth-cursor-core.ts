/**
 * SmoothCursor core — framework-free spring-physics cursor engine.
 *
 * Owns the rAF loop, the spring integration, rotation-from-velocity, the
 * trailing name label (its own softer spring, tethered to the arrow), the idle
 * timer, the `document`-level pointer listeners and the native-cursor
 * hide/restore. The wrapper owns markup, the cursor snippet, `class`, a11y
 * attributes and the `prefers-reduced-motion` query. The query's *mount* value
 * is forwarded as a creation option (plain assignment, no snap); only a later
 * *change* event is forwarded through `setOptions({ reducedMotion })`, which
 * snaps. That split reproduces the original wrapper's two distinct
 * reduced-motion entry points.
 *
 * The loop sleeps once both springs have settled on the pointer and wakes on
 * the next pointer move; the first frame after a wake is capped to one 60 Hz
 * step so a long rest never turns into a single oversized integration step.
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
	/**
	 * Optional name-label element. It trails the cursor on its own, softer
	 * spring (see `labelSpring`) and is written as
	 * `translate3d(x, y, 0) rotate(<tilt>deg)` — the wrapper adds the visual
	 * offset from the arrow tip with the CSS `translate` property. Can also be
	 * attached or swapped later with `setLabel()`.
	 */
	label?: HTMLElement | null;
}

export interface SmoothCursorInitOptions {
	/** Called whenever the engine's visibility (pointer on/off screen) changes. */
	onVisibleChange?: (visible: boolean) => void;
	/**
	 * Called when the pointer has rested for `idleFade` ms (`true`) and again on
	 * the next movement (`false`). Never called while `idleFade` is 0.
	 */
	onIdleChange?: (idle: boolean) => void;
}

export interface SmoothCursorLiveOptions {
	/** Spring physics configuration. */
	springConfig?: SpringConfig;
	/**
	 * Spring for the label. Every field left out is derived from the resolved
	 * `springConfig`: stiffness × 0.55, damping × 1.1, same mass — a softer,
	 * more damped follow that lags the arrow by a few frames.
	 */
	labelSpring?: SpringConfig;
	/**
	 * Rotate the cursor toward its direction of travel. Defaults to `true` here
	 * (the engine's original behaviour); wrappers that render an upright arrow
	 * pass `false`, which eases any existing rotation back to 0.
	 */
	rotate?: boolean;
	/**
	 * Milliseconds without pointer movement before `onIdleChange(true)` fires.
	 * 0 (the default) disables idle tracking entirely.
	 */
	idleFade?: number;
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
	/** Attach, swap or detach (`null`) the label element after creation. */
	setLabel(label: HTMLElement | null): void;
	resize(): void;
	destroy(): void;
}

const DEFAULT_DAMPING = 45;
const DEFAULT_STIFFNESS = 400;
const DEFAULT_MASS = 1;
/** Label spring = arrow spring scaled by these factors (per missing field). */
const LABEL_STIFFNESS_SCALE = 0.55;
const LABEL_DAMPING_SCALE = 1.1;
/** Frame-delta clamp, in seconds — caps the spring step after a long stall. */
const MAX_DT = 0.064;
/** The first frame after the loop wakes from sleep integrates at most one 60 Hz step. */
const WAKE_DT = 1 / 60;
/** Below this movement (px) the rotation target is not recomputed. */
const MIN_ROTATION_DISTANCE = 0.1;
/** How quickly the rendered rotation eases toward the movement-direction target. */
const ROTATION_EASE = 0.3;
/** Furthest the label may fall behind the arrow (px) — a leash, not a chase. */
const LABEL_TETHER = 24;
/** Label tilt per px/s of its own horizontal velocity, and the tilt cap (deg). */
const LABEL_TILT_PER_VELOCITY = 0.0035;
const LABEL_MAX_TILT = 5;
/** Settle thresholds: position (px), velocity (px/s), rotation (deg). */
const SETTLE_DISTANCE = 0.05;
const SETTLE_VELOCITY = 1;
const SETTLE_ROTATION = 0.05;

export function resolveConfig(springConfig: SpringConfig | undefined): Required<SpringConfig> {
	return {
		damping: springConfig?.damping ?? DEFAULT_DAMPING,
		stiffness: springConfig?.stiffness ?? DEFAULT_STIFFNESS,
		mass: springConfig?.mass ?? DEFAULT_MASS,
	};
}

/** The label's spring: explicit fields win, the rest derive from the arrow's. */
export function resolveLabelConfig(
	labelSpring: SpringConfig | undefined,
	springConfig: SpringConfig | undefined
): Required<SpringConfig> {
	const base = resolveConfig(springConfig);
	return {
		damping: labelSpring?.damping ?? base.damping * LABEL_DAMPING_SCALE,
		stiffness: labelSpring?.stiffness ?? base.stiffness * LABEL_STIFFNESS_SCALE,
		mass: labelSpring?.mass ?? base.mass,
	};
}

export function createSmoothCursor(
	el: SmoothCursorElements,
	options: SmoothCursorInitOptions & SmoothCursorLiveOptions
): SmoothCursorEngine {
	const { cursor } = el;
	let label: HTMLElement | null = el.label ?? null;
	const onVisibleChange = options.onVisibleChange;
	const onIdleChange = options.onIdleChange;

	let springConfig = options.springConfig;
	let labelSpring = options.labelSpring;
	let rotate = options.rotate ?? true;
	let idleFade = Math.max(0, options.idleFade ?? 0);
	let reducedMotion = options.reducedMotion ?? false;

	// Arrow spring state
	let posX = 0;
	let posY = 0;
	let velX = 0;
	let velY = 0;
	let targetX = 0;
	let targetY = 0;

	// Label spring state (targets the arrow's rendered position)
	let labelX = 0;
	let labelY = 0;
	let labelVelX = 0;
	let labelVelY = 0;

	// Rotation state
	let rotation = 0;
	let prevX = 0;
	let prevY = 0;

	let visible = false;
	let idle = false;
	let idleTimer: ReturnType<typeof setTimeout> | null = null;
	let rafId: number | null = null;
	let lastTime = 0;
	/** The loop stopped itself because everything settled (not because it was hidden). */
	let sleeping = false;
	/** Next frame is the first after a sleep: cap its step to WAKE_DT. */
	let waking = false;
	let destroyed = false;

	function setVisible(next: boolean) {
		if (visible === next) return;
		visible = next;
		onVisibleChange?.(visible);
	}

	function setIdle(next: boolean) {
		if (idle === next) return;
		idle = next;
		onIdleChange?.(idle);
	}

	function clearIdleTimer() {
		if (idleTimer !== null) {
			clearTimeout(idleTimer);
			idleTimer = null;
		}
	}

	/** Movement happened: leave the idle state and restart the countdown. */
	function markActive() {
		clearIdleTimer();
		setIdle(false);
		if (idleFade > 0) {
			idleTimer = setTimeout(() => {
				idleTimer = null;
				setIdle(true);
			}, idleFade);
		}
	}

	function startAnimation() {
		if (rafId === null) {
			if (sleeping) {
				// Keep lastTime: the wake frame integrates a real (capped) step
				// instead of burning a frame on the timestamp sentinel.
				waking = true;
			} else {
				lastTime = 0;
			}
			sleeping = false;
			rafId = requestAnimationFrame(animate);
		}
	}

	function stopAnimation() {
		sleeping = false;
		waking = false;
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
	}

	function writeLabel(tilt: number) {
		if (!label) return;
		label.style.transform =
			tilt === 0
				? `translate3d(${labelX}px, ${labelY}px, 0)`
				: `translate3d(${labelX}px, ${labelY}px, 0) rotate(${tilt}deg)`;
	}

	function snapLabel() {
		labelX = posX;
		labelY = posY;
		labelVelX = 0;
		labelVelY = 0;
		writeLabel(0);
	}

	function snapToTarget() {
		posX = targetX;
		posY = targetY;
		velX = 0;
		velY = 0;
		if (!rotate) rotation = 0;
		cursor.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
		snapLabel();
	}

	/** Pointer (re)appears: jump everything to it without a fly-in. */
	function placeAtTarget() {
		posX = targetX;
		posY = targetY;
		prevX = targetX;
		prevY = targetY;
		labelX = targetX;
		labelY = targetY;
		labelVelX = 0;
		labelVelY = 0;
	}

	function onMouseMove(e: MouseEvent) {
		targetX = e.clientX;
		targetY = e.clientY;

		if (!visible) {
			placeAtTarget();
			setVisible(true);
		}

		markActive();

		if (reducedMotion) {
			snapToTarget();
		} else {
			startAnimation();
		}
	}

	function onMouseLeave() {
		setVisible(false);
		clearIdleTimer();
		setIdle(false);
		stopAnimation();
	}

	function onMouseEnter(e: MouseEvent) {
		targetX = e.clientX;
		targetY = e.clientY;
		placeAtTarget();
		setVisible(true);
		markActive();

		if (!reducedMotion) {
			startAnimation();
		} else {
			snapToTarget();
		}
	}

	function animate(time: number) {
		rafId = null;
		if (!visible) return;

		if (lastTime === 0) {
			lastTime = time;
			rafId = requestAnimationFrame(animate);
			return;
		}

		let dt = Math.min((time - lastTime) / 1000, MAX_DT);
		if (waking) {
			dt = Math.min(dt, WAKE_DT);
			waking = false;
		}
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

		if (rotate) {
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
		} else if (rotation !== 0) {
			// Upright mode: ease any leftover angle home.
			rotation += -rotation * ROTATION_EASE;
			if (Math.abs(rotation) < SETTLE_ROTATION) rotation = 0;
		}

		prevX = posX;
		prevY = posY;

		// Label: its own softer spring chasing the arrow, held on a leash.
		let tilt = 0;
		let labelSettled = true;
		if (label) {
			const lc = resolveLabelConfig(labelSpring, springConfig);
			const lfx = -lc.stiffness * (labelX - posX) - lc.damping * labelVelX;
			const lfy = -lc.stiffness * (labelY - posY) - lc.damping * labelVelY;
			labelVelX += (lfx / lc.mass) * dt;
			labelVelY += (lfy / lc.mass) * dt;
			labelX += labelVelX * dt;
			labelY += labelVelY * dt;

			const gapX = labelX - posX;
			const gapY = labelY - posY;
			const gap = Math.sqrt(gapX * gapX + gapY * gapY);
			if (gap > LABEL_TETHER) {
				const k = LABEL_TETHER / gap;
				labelX = posX + gapX * k;
				labelY = posY + gapY * k;
			}

			tilt = Math.max(
				-LABEL_MAX_TILT,
				Math.min(LABEL_MAX_TILT, labelVelX * LABEL_TILT_PER_VELOCITY)
			);
			if (Math.abs(tilt) < 0.01) tilt = 0;

			labelSettled =
				Math.abs(labelX - targetX) < SETTLE_DISTANCE &&
				Math.abs(labelY - targetY) < SETTLE_DISTANCE &&
				Math.abs(labelVelX) < SETTLE_VELOCITY &&
				Math.abs(labelVelY) < SETTLE_VELOCITY;
		}

		const settled =
			labelSettled &&
			Math.abs(posX - targetX) < SETTLE_DISTANCE &&
			Math.abs(posY - targetY) < SETTLE_DISTANCE &&
			Math.abs(velX) < SETTLE_VELOCITY &&
			Math.abs(velY) < SETTLE_VELOCITY &&
			(rotate || rotation === 0);

		if (settled) {
			// Land exactly on the pointer and let the loop sleep until the next move.
			posX = targetX;
			posY = targetY;
			velX = 0;
			velY = 0;
			prevX = posX;
			prevY = posY;
			if (label) {
				labelX = targetX;
				labelY = targetY;
				labelVelX = 0;
				labelVelY = 0;
				tilt = 0;
			}
		}

		cursor.style.transform = `translate3d(${posX}px, ${posY}px, 0) rotate(${rotation}deg)`;
		writeLabel(tilt);

		if (settled) {
			sleeping = true;
			return;
		}

		rafId = requestAnimationFrame(animate);
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
			if ("labelSpring" in next) {
				labelSpring = next.labelSpring;
			}
			if ("rotate" in next) {
				rotate = next.rotate ?? true;
				// Upright again: ease the leftover angle home (or snap it).
				if (!rotate && rotation !== 0) {
					if (reducedMotion) {
						rotation = 0;
						cursor.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
					} else if (visible) {
						startAnimation();
					}
				}
			}
			if ("idleFade" in next) {
				idleFade = Math.max(0, next.idleFade ?? 0);
				clearIdleTimer();
				if (idleFade === 0) {
					setIdle(false);
				} else if (visible && !idle) {
					markActive();
				}
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
		setLabel(next) {
			if (destroyed || next === label) return;
			label = next;
			if (!label) return;
			// A fresh label starts glued to the arrow, then trails from there.
			snapLabel();
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
			clearIdleTimer();
			stopAnimation();
		},
	};
}
