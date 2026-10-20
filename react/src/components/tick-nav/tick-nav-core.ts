/**
 * TickNav engine — framework-free, byte-identical in the Svelte, React and Vue
 * trees (see shared-cores.json).
 *
 * The component renders the markup; this module drives everything that moves:
 *
 * - a width spring per row (resting length → hover length),
 * - a proximity spring per row and per tick group, fed by a smoothstep of the
 *   distance, in rows, to the hovered row,
 * - a one-shot "pluck" on hover: a wave packet that runs along the row's line
 *   and leaves it flat again,
 * - the preview card's position (it follows the pointer) and its fade-in.
 *
 * All output goes to CSS custom properties and to the pluck path's `d`, never
 * through framework state, so nothing re-renders per frame. The loop sleeps as
 * soon as every spring has settled.
 *
 * Expected markup, inside `list`:
 *   li.tn-item                     one per item, in order
 *     .tn-path                     the row's <path> (pluck target)
 *     .tn-ticks                    optional tick group after the row
 * and, inside `root`, an optional `.tn-preview` that reads `--tn-px`,
 * `--tn-py` and `--tn-po`.
 *
 * No browser global is touched at import time.
 */

export interface TickNavCoreOptions {
	/** Rows over which proximity falls to zero. */
	reach: number;
	/** Resting line length, px. */
	restLength: number;
	/** Line length of the hovered and the current row, px. */
	activeLength: number;
	/** Extra length, px, that proximity adds to lines and ticks. */
	proximityLength: number;
	/** Index of the current item, or -1. */
	current: number;
	/** Snap instead of animating; no pluck. */
	reducedMotion: boolean;
	/**
	 * Called when the hovered (or keyboard-focused) row changes. `index` is -1
	 * when nothing is hovered. `pointer` is true for a mouse or pen.
	 */
	onActiveChange?: (index: number, pointer: boolean) => void;
}

export interface TickNavCore {
	update(options: Partial<TickNavCoreOptions>): void;
	/** Re-reads the rows after the item list changed. */
	refresh(): void;
	destroy(): void;
}

export const TICK_NAV_DEFAULTS = Object.freeze({
	reach: 4,
	restLength: 32,
	activeLength: 55,
	proximityLength: 16,
});

/** The flat line the pluck starts from and returns to, in the 54×8 viewBox. */
export const TICK_NAV_FLAT_PATH = "M0 4L54 4";

const PLUCK_MS = 500;
const PREVIEW_OFFSET = 14;

interface SpringConfig {
	stiffness: number;
	damping: number;
	mass: number;
}

const LENGTH_SPRING: SpringConfig = { stiffness: 250, damping: 30, mass: 1 };
const PROXIMITY_SPRING: SpringConfig = { stiffness: 400, damping: 30, mass: 0.6 };
const PREVIEW_SPRING: SpringConfig = { stiffness: 400, damping: 30, mass: 1 };

interface Spring {
	x: number;
	v: number;
	target: number;
}

function spring(x: number): Spring {
	return { x, v: 0, target: x };
}

/** Semi-implicit Euler in fixed substeps; returns true while still moving. */
function stepSpring(s: Spring, config: SpringConfig, dt: number, rest: number): boolean {
	const h = 1 / 240;
	let left = dt;
	while (left > 0) {
		const d = Math.min(h, left);
		const a = (-config.stiffness * (s.x - s.target) - config.damping * s.v) / config.mass;
		s.v += a * d;
		s.x += s.v * d;
		left -= d;
	}
	if (Math.abs(s.x - s.target) < rest && Math.abs(s.v) < rest * 10) {
		s.x = s.target;
		s.v = 0;
		return false;
	}
	return true;
}

function smoothstep(x: number): number {
	const t = Math.min(1, Math.max(0, x));
	return t * t * (3 - 2 * t);
}

/**
 * The pluck at progress `p` (0..1, already eased): a packet centred on
 * `54 * p`, 20 units wide, whose amplitude fades by 30% over the run.
 */
export function pluckPath(p: number): string {
	const head = 54 * p;
	const fade = Math.max(0, 1 - (head / 54) * 0.3);
	let d = "";
	for (let x = 0; x <= 54; x += 1) {
		const envelope = Math.max(0, 1 - Math.abs(head - x) / 20);
		const y = 4 + 3.5 * Math.sin((x - 0.5 * head) * 0.8) * envelope * fade;
		d += `${x === 0 ? "M" : "L"}${x} ${y.toFixed(2)}`;
	}
	return d;
}

interface Row {
	el: HTMLElement;
	path: SVGPathElement | null;
	length: Spring;
	near: Spring;
	tickNear: Spring;
	pluckStart: number | null;
}

export function createTickNavCore(
	root: HTMLElement,
	list: HTMLElement,
	initial: Partial<TickNavCoreOptions> = {}
): TickNavCore {
	const options: TickNavCoreOptions = {
		reach: TICK_NAV_DEFAULTS.reach,
		restLength: TICK_NAV_DEFAULTS.restLength,
		activeLength: TICK_NAV_DEFAULTS.activeLength,
		proximityLength: TICK_NAV_DEFAULTS.proximityLength,
		current: -1,
		reducedMotion: false,
		...initial,
	};

	let rows: Row[] = [];
	let hovered = -1;
	const preview = spring(0);
	let frame = 0;
	let lastT = 0;
	let destroyed = false;

	function readRows(): void {
		const previous = rows;
		rows = Array.from(list.querySelectorAll<HTMLElement>(":scope > .tn-item")).map((el, i) => {
			const old = previous[i];
			const rest = i === options.current ? options.activeLength : options.restLength;
			return {
				el,
				path: el.querySelector<SVGPathElement>(".tn-path"),
				length: old?.length ?? spring(rest),
				near: old?.near ?? spring(0),
				tickNear: old?.tickNear ?? spring(0),
				pluckStart: null,
			};
		});
	}

	function retarget(): void {
		const reach = Math.max(0.5, options.reach);
		rows.forEach((row, i) => {
			row.length.target =
				i === hovered || i === options.current ? options.activeLength : options.restLength;
			const off = hovered < 0 || options.reducedMotion;
			row.near.target = off ? 0 : smoothstep(1 - Math.abs(i - hovered) / reach);
			row.tickNear.target = off ? 0 : smoothstep(1 - Math.abs(i + 0.5 - hovered) / reach);
		});
		preview.target = hovered >= 0 ? 1 : 0;
		if (hovered < 0) {
			// The card unmounts with the hover; the next one fades in from 0.
			preview.x = 0;
			preview.v = 0;
		}
	}

	function paint(): void {
		for (const row of rows) {
			const width = row.length.x + options.proximityLength * row.near.x;
			row.el.style.setProperty("--tn-len", `${width.toFixed(2)}px`);
			row.el.style.setProperty("--tn-near", row.near.x.toFixed(4));
			row.el.style.setProperty("--tn-tick-near", row.tickNear.x.toFixed(4));
		}
		root.style.setProperty("--tn-po", preview.x.toFixed(4));
	}

	function snapAll(): void {
		for (const row of rows) {
			for (const s of [row.length, row.near, row.tickNear]) {
				s.x = s.target;
				s.v = 0;
			}
		}
		preview.x = preview.target;
		preview.v = 0;
	}

	function step(t: number): void {
		frame = 0;
		if (destroyed) return;
		const dt = lastT ? Math.min(1 / 30, (t - lastT) / 1000) : 1 / 60;
		lastT = t;
		let moving = false;
		for (const row of rows) {
			if (stepSpring(row.length, LENGTH_SPRING, dt, 0.05)) moving = true;
			if (stepSpring(row.near, PROXIMITY_SPRING, dt, 0.001)) moving = true;
			if (stepSpring(row.tickNear, PROXIMITY_SPRING, dt, 0.001)) moving = true;
			if (row.pluckStart !== null && row.path) {
				const p = Math.min((t - row.pluckStart) / PLUCK_MS, 1);
				if (p < 1) {
					row.path.setAttribute("d", pluckPath(1 - Math.pow(1 - p, 3)));
					moving = true;
				} else {
					row.path.setAttribute("d", TICK_NAV_FLAT_PATH);
					row.pluckStart = null;
				}
			}
		}
		if (stepSpring(preview, PREVIEW_SPRING, dt, 0.001)) moving = true;
		paint();
		if (moving) frame = requestAnimationFrame(step);
		else lastT = 0;
	}

	function kick(): void {
		if (options.reducedMotion) {
			snapAll();
			paint();
			return;
		}
		if (!frame) frame = requestAnimationFrame(step);
	}

	function stopPluck(row: Row | undefined): void {
		if (!row) return;
		row.pluckStart = null;
		row.path?.setAttribute("d", TICK_NAV_FLAT_PATH);
	}

	function setHovered(index: number, pointer: boolean): void {
		if (index === hovered) return;
		stopPluck(rows[hovered]);
		hovered = index;
		const row = rows[index];
		if (row && !options.reducedMotion && row.path) {
			row.pluckStart = performance.now();
		}
		retarget();
		kick();
		options.onActiveChange?.(index, pointer);
	}

	function rowIndexOf(target: EventTarget | null): number {
		const el = target instanceof Element ? target.closest(".tn-item") : null;
		return el ? rows.findIndex((r) => r.el === el) : -1;
	}

	function isDisabled(index: number): boolean {
		return rows[index]?.el.hasAttribute("data-disabled") ?? false;
	}

	// Hover is per row (the link's hit area), like `mouseenter`: entering a row
	// activates it, leaving the list clears it. Moving between rows never
	// passes through "nothing hovered", so the card does not flicker.
	function onPointerOver(event: PointerEvent): void {
		if (event.pointerType === "touch") return;
		const link = event.target instanceof Element ? event.target.closest(".tn-link") : null;
		if (!link) return;
		const index = rowIndexOf(link);
		if (index < 0 || isDisabled(index)) return;
		setHovered(index, true);
	}

	function onPointerMove(event: PointerEvent): void {
		if (event.pointerType === "touch") return;
		const box = root.getBoundingClientRect();
		root.style.setProperty(
			"--tn-px",
			`${(event.clientX - box.left + PREVIEW_OFFSET).toFixed(1)}px`
		);
		root.style.setProperty("--tn-py", `${(event.clientY - box.top + PREVIEW_OFFSET).toFixed(1)}px`);
	}

	function onPointerLeave(event: PointerEvent): void {
		if (event.pointerType === "touch") return;
		setHovered(-1, false);
	}

	function onFocusIn(event: FocusEvent): void {
		const el = event.target as Element | null;
		if (!el || !(el as HTMLElement).matches?.(":focus-visible")) return;
		const index = rowIndexOf(el);
		if (index < 0) return;
		// Anchor the card beside the focused row, since there is no pointer.
		const box = root.getBoundingClientRect();
		const rowBox = rows[index].el.getBoundingClientRect();
		root.style.setProperty("--tn-px", `${(rowBox.right - box.left + PREVIEW_OFFSET).toFixed(1)}px`);
		root.style.setProperty("--tn-py", `${(rowBox.top - box.top + PREVIEW_OFFSET).toFixed(1)}px`);
		setHovered(index, false);
	}

	function onFocusOut(event: FocusEvent): void {
		const next = event.relatedTarget as Node | null;
		if (next && list.contains(next)) return;
		setHovered(-1, false);
	}

	readRows();
	retarget();
	snapAll();
	paint();

	list.addEventListener("pointerover", onPointerOver);
	root.addEventListener("pointermove", onPointerMove);
	list.addEventListener("pointerleave", onPointerLeave);
	list.addEventListener("focusin", onFocusIn);
	list.addEventListener("focusout", onFocusOut);

	return {
		update(next) {
			const reducedBefore = options.reducedMotion;
			Object.assign(options, next);
			if (options.reducedMotion && !reducedBefore) {
				for (const row of rows) stopPluck(row);
			}
			retarget();
			kick();
		},
		refresh() {
			readRows();
			if (hovered >= rows.length) hovered = -1;
			retarget();
			kick();
			paint();
		},
		destroy() {
			destroyed = true;
			if (frame) cancelAnimationFrame(frame);
			frame = 0;
			list.removeEventListener("pointerover", onPointerOver);
			root.removeEventListener("pointermove", onPointerMove);
			list.removeEventListener("pointerleave", onPointerLeave);
			list.removeEventListener("focusin", onFocusIn);
			list.removeEventListener("focusout", onFocusOut);
		},
	};
}
