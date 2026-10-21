/**
 * TickNav engine — framework-free, byte-identical in the Svelte, React and Vue
 * trees (see shared-cores.json).
 *
 * The component renders the markup; this module drives everything that moves:
 *
 * - a width spring per row (resting length → hover length),
 * - a proximity spring per row and per tick group, fed by a smoothstep of the
 *   distance, in rows, to the hovered row,
 * - a one-shot "pluck": a wave packet that runs along a line and leaves it
 *   flat again. Every line plucks — rows and ticks alike — the moment the
 *   pointer crosses it, so a sweep strums the ruler like strings,
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
 *       .tn-tick-path              one <path> per tick (pluck target)
 * A line's <svg> may also hold a `.tn-beam` path: it gets the same `d` as the
 * line during a pluck, and the <svg> gets `data-plucking` plus `--tn-p`, the
 * eased progress 0..1 of the wave's head, so CSS can ride a highlight on it.
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
	/**
	 * Called each time a mouse or pen plucks a line: `kind` says whether it is
	 * an item's line or a tick, `row` is the item it belongs to (a tick belongs
	 * to the item above it). The place to play a sound.
	 */
	onPluck?: (kind: "row" | "tick", row: number) => void;
	/**
	 * Called after every painted frame with each line's state, for a renderer
	 * that draws extra light on top (the HDR layer). Positions are CSS px
	 * relative to `root`.
	 */
	onFrame?: (lines: TickNavLineState[]) => void;
}

export interface TickNavLineState {
	kind: "row" | "tick";
	row: number;
	/** Left end and vertical centre of the line, relative to `root`. */
	x: number;
	y: number;
	/** Current drawn length, px. */
	length: number;
	/** Proximity 0..1. */
	near: number;
	/** Eased progress of a running pluck's wave head, or null. */
	progress: number | null;
	current: boolean;
}

export interface TickNavCore {
	update(options: Partial<TickNavCoreOptions>): void;
	/** Re-reads the rows after the item list changed. */
	refresh(): void;
	/** Re-measures line positions after a layout change (resize). */
	measure(): void;
	destroy(): void;
}

/** Tick lengths; the component's CSS uses the same numbers. */
export const TICK_NAV_TICK_REST = 24;
export const TICK_NAV_TICK_GROW = 16;

export const TICK_NAV_DEFAULTS = Object.freeze({
	reach: 4,
	restLength: 32,
	activeLength: 55,
	proximityLength: 16,
});

/** The flat line the pluck starts from and returns to, in the 54×8 viewBox. */
export const TICK_NAV_FLAT_PATH = "M0 4L54 4";

const PLUCK_MS = 500;
/** A row entered without crossing its line still plucks, unless it just did. */
const REPLUCK_MS = 120;
const RESTRIKE_MS = 60;
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
 * `amplitude` scales the swing (ticks swing less than rows).
 */
export function pluckPath(p: number, amplitude = 1): string {
	const head = 54 * p;
	const fade = Math.max(0, 1 - (head / 54) * 0.3);
	let d = "";
	for (let x = 0; x <= 54; x += 1) {
		const envelope = Math.max(0, 1 - Math.abs(head - x) / 20);
		const y = 4 + 3.5 * amplitude * Math.sin((x - 0.5 * head) * 0.8) * envelope * fade;
		d += `${x === 0 ? "M" : "L"}${x} ${y.toFixed(2)}`;
	}
	return d;
}

interface Line {
	path: SVGPathElement;
	beam: SVGPathElement | null;
	svg: SVGSVGElement | null;
	kind: "row" | "tick";
	row: number;
	/** Centre, list-local px; read once per pointer visit. */
	y: number;
	/** Left end and centre relative to `root`, for `onFrame`. */
	rootX: number;
	rootY: number;
	progress: number | null;
	pluckStart: number | null;
	lastPluck: number;
}

interface Row {
	el: HTMLElement;
	line: Line | null;
	length: Spring;
	near: Spring;
	tickNear: Spring;
}

const TICK_AMPLITUDE = 0.7;

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
	let lines: Line[] = [];
	let hovered = -1;
	let lastY: number | null = null;
	const preview = spring(0);
	let frame = 0;
	let lastT = 0;
	let destroyed = false;

	function readRows(): void {
		const previous = rows;
		// Keep each surviving line's state (a running pluck above all): a refresh
		// mid-pluck must not orphan a wave on its path.
		const known = new Map(lines.map((line) => [line.path, line]));
		lines = [];
		rows = Array.from(list.querySelectorAll<HTMLElement>(":scope > .tn-item")).map((el, i) => {
			const old = previous[i];
			const rest = i === options.current ? options.activeLength : options.restLength;
			const path = el.querySelector<SVGPathElement>(".tn-path");
			const line: Line | null = path ? reuse(known, path, "row", i) : null;
			if (line) lines.push(line);
			el.querySelectorAll<SVGPathElement>(".tn-tick-path").forEach((tick) => {
				lines.push(reuse(known, tick, "tick", i));
			});
			return {
				el,
				line,
				length: old?.length ?? spring(rest),
				near: old?.near ?? spring(0),
				tickNear: old?.tickNear ?? spring(0),
			};
		});
	}

	function reuse(
		known: Map<SVGPathElement, Line>,
		path: SVGPathElement,
		kind: "row" | "tick",
		row: number
	): Line {
		const line = known.get(path);
		if (!line) return makeLine(path, kind, row);
		line.kind = kind;
		line.row = row;
		line.beam = line.svg?.querySelector<SVGPathElement>(".tn-beam") ?? null;
		return line;
	}

	function makeLine(path: SVGPathElement, kind: "row" | "tick", row: number): Line {
		const svg = path.ownerSVGElement;
		return {
			path,
			beam: svg?.querySelector<SVGPathElement>(".tn-beam") ?? null,
			svg,
			kind,
			row,
			y: 0,
			rootX: 0,
			rootY: 0,
			progress: null,
			pluckStart: null,
			lastPluck: -Infinity,
		};
	}

	function setShape(line: Line, d: string, progress: number | null): void {
		line.progress = progress;
		line.path.setAttribute("d", d);
		line.beam?.setAttribute("d", d);
		if (!line.svg) return;
		if (progress === null) {
			line.svg.removeAttribute("data-plucking");
			line.svg.style.removeProperty("--tn-p");
		} else {
			line.svg.setAttribute("data-plucking", "");
			line.svg.style.setProperty("--tn-p", progress.toFixed(4));
		}
	}

	function measureLines(): void {
		const top = list.getBoundingClientRect().top;
		const rootBox = root.getBoundingClientRect();
		for (const line of lines) {
			const box = line.path.getBoundingClientRect();
			const centre = box.top + box.height / 2;
			line.y = centre - top;
			line.rootX = (line.svg ?? line.path).getBoundingClientRect().left - rootBox.left;
			line.rootY = centre - rootBox.top;
		}
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
		if (options.onFrame) {
			// An extra renderer must never stop the motion: drop it on failure.
			try {
				options.onFrame(frameState());
			} catch (error) {
				options.onFrame = undefined;
				console.warn("[TickNav] light layer disabled:", error);
			}
		}
	}

	function frameState(): TickNavLineState[] {
		return lines.map((line) => {
			const row = rows[line.row];
			const near = line.kind === "row" ? (row?.near.x ?? 0) : (row?.tickNear.x ?? 0);
			const length =
				line.kind === "row"
					? (row?.length.x ?? 0) + options.proximityLength * near
					: TICK_NAV_TICK_REST + TICK_NAV_TICK_GROW * near;
			return {
				kind: line.kind,
				row: line.row,
				x: line.rootX,
				y: line.rootY,
				length,
				near,
				progress: line.progress,
				current: line.kind === "row" && line.row === options.current,
			};
		});
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

	function step(): void {
		frame = 0;
		if (destroyed) return;
		// One clock for springs and plucks: pluck start times come from
		// performance.now(), which can run ahead of the rAF timestamp.
		const t = performance.now();
		const dt = lastT ? Math.min(1 / 30, (t - lastT) / 1000) : 1 / 60;
		lastT = t;
		let moving = false;
		for (const row of rows) {
			if (stepSpring(row.length, LENGTH_SPRING, dt, 0.05)) moving = true;
			if (stepSpring(row.near, PROXIMITY_SPRING, dt, 0.001)) moving = true;
			if (stepSpring(row.tickNear, PROXIMITY_SPRING, dt, 0.001)) moving = true;
		}
		for (const line of lines) {
			if (line.pluckStart === null) continue;
			const p = Math.min((t - line.pluckStart) / PLUCK_MS, 1);
			if (p < 1) {
				const amplitude = line.kind === "tick" ? TICK_AMPLITUDE : 1;
				const eased = 1 - Math.pow(1 - p, 3);
				setShape(line, pluckPath(eased, amplitude), eased);
				moving = true;
			} else {
				setShape(line, TICK_NAV_FLAT_PATH, null);
				line.pluckStart = null;
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

	function stopPluck(line: Line): void {
		line.pluckStart = null;
		setShape(line, TICK_NAV_FLAT_PATH, null);
	}

	/** Restarts the line's pluck (a new strike interrupts a running one). */
	function pluck(line: Line, pointer: boolean, now: number): void {
		line.lastPluck = now;
		if (!options.reducedMotion) {
			line.pluckStart = now;
			kick();
		}
		if (pointer && !isDisabled(line.row)) options.onPluck?.(line.kind, line.row);
	}

	/**
	 * `pluckRow`: a keyboard focus, or a pointer arriving from outside the list,
	 * crosses no line, so the row plucks on entry. Otherwise the crossing does it
	 * (the hit area is entered a few px before the line is reached).
	 */
	function setHovered(index: number, pointer: boolean, pluckRow = !pointer): void {
		if (index === hovered) return;
		hovered = index;
		const line = rows[index]?.line;
		const now = performance.now();
		if (line && pluckRow && now - line.lastPluck > REPLUCK_MS) pluck(line, pointer, now);
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

	/** The row holding visible keyboard focus, or -1. */
	function focusedIndex(): number {
		const el = list.ownerDocument.activeElement;
		if (!el || !list.contains(el) || !el.matches(":focus-visible")) return -1;
		const index = rowIndexOf(el);
		return isDisabled(index) ? -1 : index;
	}

	/** Anchors the card beside a row, for when there is no pointer to follow. */
	function anchorTo(index: number): void {
		const row = rows[index];
		if (!row) return;
		const box = root.getBoundingClientRect();
		const rowBox = row.el.getBoundingClientRect();
		root.style.setProperty("--tn-px", `${(rowBox.right - box.left + PREVIEW_OFFSET).toFixed(1)}px`);
		root.style.setProperty("--tn-py", `${(rowBox.top - box.top + PREVIEW_OFFSET).toFixed(1)}px`);
	}

	/**
	 * The pointer no longer designates a row: hand the active row back to the
	 * keyboard-focused one if there is one, otherwise clear it. No pluck.
	 */
	function releasePointer(): void {
		const focused = focusedIndex();
		if (focused >= 0) anchorTo(focused);
		setHovered(focused, false, false);
	}

	// Hover is per row (the link's hit area), like `mouseenter`: entering a row
	// activates it, leaving the list releases it. Moving between rows never
	// passes through "nothing hovered", so the card does not flicker.
	function onPointerOver(event: PointerEvent): void {
		if (event.pointerType === "touch") return;
		const link = event.target instanceof Element ? event.target.closest(".tn-link") : null;
		if (!link) return;
		const index = rowIndexOf(link);
		if (index < 0) return;
		// A disabled row never activates, and must not leave the previous row lit.
		if (isDisabled(index)) {
			if (hovered >= 0) releasePointer();
			return;
		}
		setHovered(index, true, lastY === null);
	}

	// Every line whose centre lies between the previous and the current pointer
	// position was crossed: pluck each one, in crossing order.
	function strum(event: PointerEvent): void {
		const y = event.clientY - list.getBoundingClientRect().top;
		if (lastY === null) {
			measureLines();
			lastY = y;
			return;
		}
		const from = lastY;
		lastY = y;
		if (from === y) return;
		const down = y > from;
		const lo = Math.min(from, y);
		const hi = Math.max(from, y);
		const crossed = lines.filter((line) => line.y > lo && line.y <= hi);
		crossed.sort((a, b) => (down ? a.y - b.y : b.y - a.y));
		const now = performance.now();
		for (const line of crossed) {
			// The same line struck twice within a frame or two is one strike.
			if (now - line.lastPluck < RESTRIKE_MS) continue;
			pluck(line, true, now);
		}
	}

	function onPointerMove(event: PointerEvent): void {
		if (event.pointerType === "touch") return;
		if (list.contains(event.target as Node)) strum(event);
		const box = root.getBoundingClientRect();
		root.style.setProperty(
			"--tn-px",
			`${(event.clientX - box.left + PREVIEW_OFFSET).toFixed(1)}px`
		);
		root.style.setProperty("--tn-py", `${(event.clientY - box.top + PREVIEW_OFFSET).toFixed(1)}px`);
	}

	function onPointerLeave(event: PointerEvent): void {
		if (event.pointerType === "touch") return;
		lastY = null;
		releasePointer();
	}

	function onFocusIn(event: FocusEvent): void {
		const el = event.target as Element | null;
		if (!el || !(el as HTMLElement).matches?.(":focus-visible")) return;
		const index = rowIndexOf(el);
		if (!rows[index]) return;
		// Anchor the card beside the focused row, since there is no pointer.
		anchorTo(index);
		setHovered(index, false);
	}

	function onFocusOut(event: FocusEvent): void {
		const next = event.relatedTarget as Node | null;
		if (next && list.contains(next)) return;
		setHovered(-1, false);
	}

	readRows();
	measureLines();
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
				for (const line of lines) stopPluck(line);
			}
			retarget();
			kick();
		},
		refresh() {
			readRows();
			measureLines();
			lastY = null;
			if (hovered >= rows.length) hovered = -1;
			retarget();
			kick();
			paint();
		},
		measure() {
			// Width changes as lines grow; the strum's last position stays valid.
			measureLines();
			if (options.onFrame) paint();
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
