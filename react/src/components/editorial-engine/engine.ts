// Editorial layout engine driven by a cached-metrics text layout library.
//
// Every frame: orb physics → obstacle intersection per text line → slot
// carving → line layout with cursor handoff across columns → DOM writes only
// (left/top/textContent). No DOM measurement anywhere in the render loop.
//
// Framework-free on purpose: the React component owns nothing but mount,
// teardown and the fallback markup.

import {
	prepareWithSegments,
	layoutWithLines,
	layoutNextLine,
	walkLineRanges,
	type LayoutCursor,
	type PreparedTextWithSegments,
} from "@chenglou/pretext";

// ============================================================================
// Geometry
// ============================================================================

interface Interval {
	left: number;
	right: number;
}

interface CircleObstacle {
	cx: number;
	cy: number;
	r: number;
	hPad: number;
	vPad: number;
}

interface RectObstacle {
	x: number;
	y: number;
	w: number;
	h: number;
}

interface PositionedLine {
	x: number;
	y: number;
	text: string;
	width: number;
}

const MIN_SLOT_WIDTH = 50;

/** Subtract blocked intervals from a base interval, keeping viable slots. */
function carveTextLineSlots(base: Interval, blocked: Interval[]): Interval[] {
	let slots: Interval[] = [base];
	for (const interval of blocked) {
		const next: Interval[] = [];
		for (const slot of slots) {
			if (interval.right <= slot.left || interval.left >= slot.right) {
				next.push(slot);
				continue;
			}
			if (interval.left > slot.left) next.push({ left: slot.left, right: interval.left });
			if (interval.right < slot.right) next.push({ left: interval.right, right: slot.right });
		}
		slots = next;
	}
	return slots.filter((slot) => slot.right - slot.left >= MIN_SLOT_WIDTH);
}

/** Horizontal interval blocked by a circle within a vertical band, or null. */
function circleIntervalForBand(
	cx: number,
	cy: number,
	r: number,
	bandTop: number,
	bandBottom: number,
	hPad: number,
	vPad: number
): Interval | null {
	const top = bandTop - vPad;
	const bottom = bandBottom + vPad;
	if (top >= cy + r || bottom <= cy - r) return null;
	const minDy = cy >= top && cy <= bottom ? 0 : cy < top ? top - cy : cy - bottom;
	if (minDy >= r) return null;
	const maxDx = Math.sqrt(r * r - minDy * minDy);
	return { left: cx - maxDx - hPad, right: cx + maxDx + hPad };
}

// ============================================================================
// Text layout
// ============================================================================

/**
 * Flow text into a rectangular region, line by line, skipping circle and rect
 * obstacles. Returns positioned lines plus the cursor where the text stopped,
 * so the next column can pick up exactly where this one ended.
 */
function layoutColumn(
	prepared: PreparedTextWithSegments,
	startCursor: LayoutCursor,
	regionX: number,
	regionY: number,
	regionW: number,
	regionH: number,
	lineHeight: number,
	circleObstacles: CircleObstacle[],
	rectObstacles: RectObstacle[],
	singleSlotOnly: boolean
): { lines: PositionedLine[]; cursor: LayoutCursor } {
	let cursor = startCursor;
	let lineTop = regionY;
	const lines: PositionedLine[] = [];
	let textExhausted = false;

	while (lineTop + lineHeight <= regionY + regionH && !textExhausted) {
		const bandTop = lineTop;
		const bandBottom = lineTop + lineHeight;
		const blocked: Interval[] = [];

		for (const obstacle of circleObstacles) {
			const interval = circleIntervalForBand(
				obstacle.cx,
				obstacle.cy,
				obstacle.r,
				bandTop,
				bandBottom,
				obstacle.hPad,
				obstacle.vPad
			);
			if (interval !== null) blocked.push(interval);
		}
		for (const rect of rectObstacles) {
			if (bandBottom <= rect.y || bandTop >= rect.y + rect.h) continue;
			blocked.push({ left: rect.x, right: rect.x + rect.w });
		}

		const slots = carveTextLineSlots({ left: regionX, right: regionX + regionW }, blocked);
		if (slots.length === 0) {
			lineTop += lineHeight;
			continue;
		}

		// Narrow screens: fill only the widest slot per band to stay readable.
		const orderedSlots = singleSlotOnly
			? [
					slots.reduce((best, slot) =>
						slot.right - slot.left > best.right - best.left ? slot : best
					),
				]
			: [...slots].sort((a, b) => a.left - b.left);

		for (const slot of orderedSlots) {
			const line = layoutNextLine(prepared, cursor, slot.right - slot.left);
			if (line === null) {
				textExhausted = true;
				break;
			}
			lines.push({
				x: Math.round(slot.left),
				y: Math.round(lineTop),
				text: line.text,
				width: line.width,
			});
			cursor = line.end;
		}
		lineTop += lineHeight;
	}
	return { lines, cursor };
}

// ============================================================================
// Engine
// ============================================================================

export interface EditorialEngineOptions {
	headline: string;
	body: string;
	pullquotes: string[];
	fontFamily: string;
}

interface OrbDef {
	fx: number;
	fy: number;
	r: number;
	vx: number;
	vy: number;
	color: [number, number, number];
}

const ORB_DEFS: OrbDef[] = [
	{ fx: 0.52, fy: 0.22, r: 110, vx: 24, vy: 16, color: [196, 163, 90] },
	{ fx: 0.18, fy: 0.48, r: 85, vx: -19, vy: 26, color: [100, 140, 255] },
	{ fx: 0.74, fy: 0.58, r: 95, vx: 16, vy: -21, color: [232, 100, 130] },
	{ fx: 0.38, fy: 0.72, r: 75, vx: -26, vy: -14, color: [80, 200, 140] },
	{ fx: 0.86, fy: 0.18, r: 65, vx: -13, vy: 19, color: [150, 100, 220] },
];

const BODY_FONT_SIZE = 18;
const BODY_LINE_HEIGHT = 30;
const GUTTER = 48;
const COL_GAP = 40;
const BOTTOM_GAP = 20;
const DROP_CAP_LINES = 3;
const PQ_LINE_HEIGHT = 27;
const NARROW_BREAKPOINT = 760;
const NARROW_GUTTER = 20;
const NARROW_COL_GAP = 20;
const NARROW_BOTTOM_GAP = 16;
const NARROW_ORB_SCALE = 0.58;
const NARROW_ACTIVE_ORBS = 3;

interface Orb {
	x: number;
	y: number;
	r: number;
	vx: number;
	vy: number;
	paused: boolean;
}

interface Drag {
	orbIndex: number;
	startPointerX: number;
	startPointerY: number;
	startOrbX: number;
	startOrbY: number;
}

interface PullquoteRect extends RectObstacle {
	lines: PositionedLine[];
	colIdx: number;
}

/**
 * A pullquote slot that survived the "was a pullquote actually supplied?"
 * filter. Declared so the filter can carry a type predicate: this package
 * compiles under `noUncheckedIndexedAccess`, where `pullquotes[1]` is
 * `PreparedTextWithSegments | undefined` and a plain `.filter()` does not
 * narrow it away.
 */
interface PullquoteSpec {
	prepared: PreparedTextWithSegments;
	colIdx: number;
	yFrac: number;
	wFrac: number;
	side: string;
}

function hitTestOrbs(
	orbs: Orb[],
	px: number,
	py: number,
	activeCount: number,
	radiusScale: number
): number {
	for (let index = activeCount - 1; index >= 0; index--) {
		const orb = orbs[index]!;
		const radius = orb.r * radiusScale;
		const dx = px - orb.x;
		const dy = py - orb.y;
		if (dx * dx + dy * dy <= radius * radius) return index;
	}
	return -1;
}

function positionedLinesEqual(a: PositionedLine[], b: PositionedLine[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i]!.x !== b[i]!.x || a[i]!.y !== b[i]!.y || a[i]!.text !== b[i]!.text) return false;
	}
	return true;
}

export function createEditorialEngine(
	stage: HTMLDivElement,
	options: EditorialEngineOptions
): () => void {
	const { headline, body, pullquotes, fontFamily } = options;
	const bodyFont = `${BODY_FONT_SIZE}px ${fontFamily}`;
	const pullquoteFont = `italic 19px ${fontFamily}`;

	let destroyed = false;
	let stageW = stage.clientWidth;
	let stageH = stage.clientHeight;

	// --- DOM pools (write-only after creation) ---
	const bodyLinePool: HTMLSpanElement[] = [];
	const headlinePool: HTMLSpanElement[] = [];
	const pullquoteLinePool: HTMLSpanElement[] = [];
	const pullquoteBoxPool: HTMLDivElement[] = [];

	function syncPool<T extends HTMLElement>(pool: T[], count: number, create: () => T): void {
		while (pool.length < count) {
			const element = create();
			stage.appendChild(element);
			pool.push(element);
		}
		for (let index = 0; index < pool.length; index++) {
			pool[index]!.style.display = index < count ? "" : "none";
		}
	}

	function makeLineEl(className: string): HTMLSpanElement {
		const element = document.createElement("span");
		element.className = className;
		return element;
	}

	const orbEls = ORB_DEFS.map((def) => {
		const element = document.createElement("div");
		element.className = "ee-orb";
		const [r, g, b] = def.color;
		element.style.background = `radial-gradient(circle at 35% 35%, rgba(${r},${g},${b},0.35), rgba(${r},${g},${b},0.12) 55%, transparent 72%)`;
		element.style.boxShadow = `0 0 60px 15px rgba(${r},${g},${b},0.18), 0 0 120px 40px rgba(${r},${g},${b},0.07)`;
		stage.appendChild(element);
		return element;
	});

	const dropCapEl = document.createElement("div");
	dropCapEl.className = "ee-drop-cap";
	stage.appendChild(dropCapEl);

	// --- Prepared text (one-time measurement, cached) ---
	// pre-wrap keeps the blank-line paragraph breaks the `body` prop advertises.
	const preparedBody = prepareWithSegments(body, bodyFont, { whiteSpace: "pre-wrap" });
	const preparedPullquotes = pullquotes.map((text) => prepareWithSegments(text, pullquoteFont));
	const pullquoteSpecs = [
		{ prepared: preparedPullquotes[0], colIdx: 0, yFrac: 0.48, wFrac: 0.52, side: "right" },
		{ prepared: preparedPullquotes[1], colIdx: 1, yFrac: 0.32, wFrac: 0.5, side: "left" },
	].filter((spec): spec is PullquoteSpec => spec.prepared !== undefined);

	const DROP_CAP_SIZE = BODY_LINE_HEIGHT * DROP_CAP_LINES - 4;
	const dropCapFont = `700 ${DROP_CAP_SIZE}px ${fontFamily}`;
	// Empty body: no drop cap, render (nothing) from the very first grapheme.
	const dropCapText = body.length > 0 ? body[0]! : "";
	let dropCapTotalW = 0;
	if (dropCapText !== "") {
		const preparedDropCap = prepareWithSegments(dropCapText, dropCapFont);
		let dropCapWidth = 0;
		walkLineRanges(preparedDropCap, 9999, (line) => {
			dropCapWidth = line.width;
		});
		dropCapTotalW = Math.ceil(dropCapWidth) + 10;
		dropCapEl.textContent = dropCapText;
		dropCapEl.style.font = dropCapFont;
		dropCapEl.style.lineHeight = `${DROP_CAP_SIZE}px`;
	} else {
		dropCapEl.style.display = "none";
	}

	// --- Headline auto-fit: binary search over font sizes, rejecting any size
	// that breaks a word mid-line. Each probe is pure arithmetic.
	let cachedKey = "";
	let cachedFit = { fontSize: 24, lines: [] as PositionedLine[] };
	function fitHeadline(maxWidth: number, maxHeight: number, maxSize: number) {
		const key = `${maxWidth}|${maxHeight}|${maxSize}`;
		if (key === cachedKey) return cachedFit;
		let lo = 20;
		let hi = maxSize;
		let best = lo;
		let bestLines: PositionedLine[] = [];
		while (lo <= hi) {
			const size = Math.floor((lo + hi) / 2);
			const lineHeight = Math.round(size * 0.93);
			const prepared = prepareWithSegments(headline, `700 ${size}px ${fontFamily}`);
			let breaksWord = false;
			let lineCount = 0;
			walkLineRanges(prepared, maxWidth, (line) => {
				lineCount++;
				if (line.end.graphemeIndex !== 0) breaksWord = true;
			});
			if (!breaksWord && lineCount * lineHeight <= maxHeight) {
				best = size;
				bestLines = layoutWithLines(prepared, maxWidth, lineHeight).lines.map((line, i) => ({
					x: 0,
					y: i * lineHeight,
					text: line.text,
					width: line.width,
				}));
				lo = size + 1;
			} else {
				hi = size - 1;
			}
		}
		// No size fit (overlong word or tiny stage): fall back to the minimum
		// size with word breaks allowed rather than dropping the headline.
		if (bestLines.length === 0 && headline.length > 0) {
			best = 20;
			const lineHeight = Math.round(best * 0.93);
			const prepared = prepareWithSegments(headline, `700 ${best}px ${fontFamily}`);
			bestLines = layoutWithLines(prepared, maxWidth, lineHeight).lines.map((line, i) => ({
				x: 0,
				y: i * lineHeight,
				text: line.text,
				width: line.width,
			}));
		}
		cachedKey = key;
		cachedFit = { fontSize: best, lines: bestLines };
		return cachedFit;
	}

	// --- Interaction state ---
	const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	const orbs: Orb[] = ORB_DEFS.map((def) => ({
		x: def.fx * stageW,
		y: def.fy * stageH,
		r: def.r,
		vx: def.vx,
		vy: def.vy,
		paused: reducedMotion,
	}));
	let pointer = { x: -9999, y: -9999 };
	let drag: Drag | null = null;
	let selectionActive = false;
	let lastFrameTime: number | null = null;
	let committedLines: {
		headline: PositionedLine[];
		body: PositionedLine[];
		pullquote: PositionedLine[];
		headlineFont: string;
	} | null = null;

	function stagePoint(event: PointerEvent): { x: number; y: number } {
		const rect = stage.getBoundingClientRect();
		return { x: event.clientX - rect.left, y: event.clientY - rect.top };
	}

	// --- Render loop ---
	let scheduledRaf: number | null = null;
	function scheduleRender(): void {
		if (scheduledRaf !== null || destroyed) return;
		scheduledRaf = requestAnimationFrame((now) => {
			scheduledRaf = null;
			if (render(now)) scheduleRender();
		});
	}

	function render(now: number): boolean {
		// Re-laying lines out would destroy an active text selection.
		if (selectionActive && drag === null) return false;

		const isNarrow = stageW < NARROW_BREAKPOINT;
		const gutter = isNarrow ? NARROW_GUTTER : GUTTER;
		const colGap = isNarrow ? NARROW_COL_GAP : COL_GAP;
		const bottomGap = isNarrow ? NARROW_BOTTOM_GAP : BOTTOM_GAP;
		const orbRadiusScale = isNarrow ? NARROW_ORB_SCALE : 1;
		const activeOrbCount = isNarrow ? Math.min(NARROW_ACTIVE_ORBS, orbs.length) : orbs.length;

		// Orb physics: integrate velocity, bounce on walls, soft repulsion.
		const dt = Math.min((now - (lastFrameTime ?? now)) / 1000, 0.05);
		const draggedOrbIndex = drag?.orbIndex ?? -1;
		let stillAnimating = false;
		for (let index = 0; index < activeOrbCount; index++) {
			const orb = orbs[index]!;
			const radius = orb.r * orbRadiusScale;
			if (orb.paused || index === draggedOrbIndex) continue;
			stillAnimating = true;
			orb.x += orb.vx * dt;
			orb.y += orb.vy * dt;
			if (orb.x - radius < 0) {
				orb.x = radius;
				orb.vx = Math.abs(orb.vx);
			}
			if (orb.x + radius > stageW) {
				orb.x = stageW - radius;
				orb.vx = -Math.abs(orb.vx);
			}
			if (orb.y - radius < gutter * 0.5) {
				orb.y = radius + gutter * 0.5;
				orb.vy = Math.abs(orb.vy);
			}
			if (orb.y + radius > stageH - bottomGap) {
				orb.y = stageH - bottomGap - radius;
				orb.vy = -Math.abs(orb.vy);
			}
		}
		for (let i = 0; i < activeOrbCount; i++) {
			const a = orbs[i]!;
			for (let j = i + 1; j < activeOrbCount; j++) {
				const b = orbs[j]!;
				const dx = b.x - a.x;
				const dy = b.y - a.y;
				const dist = Math.sqrt(dx * dx + dy * dy);
				const minDist = a.r * orbRadiusScale + b.r * orbRadiusScale + (isNarrow ? 12 : 20);
				if (dist >= minDist || dist <= 0.1) continue;
				const force = (minDist - dist) * 0.8;
				const nx = dx / dist;
				const ny = dy / dist;
				if (!a.paused && i !== draggedOrbIndex) {
					a.vx -= nx * force * dt;
					a.vy -= ny * force * dt;
				}
				if (!b.paused && j !== draggedOrbIndex) {
					b.vx += nx * force * dt;
					b.vy += ny * force * dt;
				}
			}
		}

		const circleObstacles: CircleObstacle[] = [];
		for (let index = 0; index < activeOrbCount; index++) {
			const orb = orbs[index]!;
			circleObstacles.push({
				cx: orb.x,
				cy: orb.y,
				r: orb.r * orbRadiusScale,
				hPad: isNarrow ? 10 : 14,
				vPad: isNarrow ? 2 : 4,
			});
		}

		// Headline
		const headlineWidth = Math.min(stageW - gutter * 2 - (isNarrow ? 12 : 0), 1000);
		const maxHeadlineHeight = Math.floor(stageH * (isNarrow ? 0.2 : 0.24));
		const { fontSize: headlineSize, lines: headlineLines } = fitHeadline(
			headlineWidth,
			maxHeadlineHeight,
			isNarrow ? 38 : 92
		);
		const headlineLineHeight = Math.round(headlineSize * 0.93);
		const headlineFont = `700 ${headlineSize}px ${fontFamily}`;

		// Columns
		const bodyTop = gutter + headlineLines.length * headlineLineHeight + (isNarrow ? 14 : 20);
		const bodyHeight = stageH - bodyTop - bottomGap;
		const columnCount = stageW > 1000 ? 3 : stageW > 640 ? 2 : 1;
		const totalGutter = gutter * 2 + colGap * (columnCount - 1);
		const maxContentWidth = Math.min(stageW, 1500);
		const columnWidth = Math.floor((maxContentWidth - totalGutter) / columnCount);
		const contentLeft = Math.round(
			(stageW - (columnCount * columnWidth + (columnCount - 1) * colGap)) / 2
		);

		const dropCapRect: RectObstacle = {
			x: contentLeft - 2,
			y: bodyTop - 2,
			w: dropCapTotalW,
			h: DROP_CAP_LINES * BODY_LINE_HEIGHT + 2,
		};

		// Pullquotes occupy fixed rects the body text must flow around.
		const pullquoteRects: PullquoteRect[] = [];
		if (!isNarrow) {
			for (const spec of pullquoteSpecs) {
				if (spec.colIdx >= columnCount) continue;
				const pqWidth = Math.round(columnWidth * spec.wFrac);
				const pqLines = layoutWithLines(spec.prepared, pqWidth - 20, PQ_LINE_HEIGHT).lines;
				const pqHeight = pqLines.length * PQ_LINE_HEIGHT + 16;
				const columnX = contentLeft + spec.colIdx * (columnWidth + colGap);
				const pqX = spec.side === "right" ? columnX + columnWidth - pqWidth : columnX;
				const pqY = Math.round(bodyTop + bodyHeight * spec.yFrac);
				pullquoteRects.push({
					x: pqX,
					y: pqY,
					w: pqWidth,
					h: pqHeight,
					colIdx: spec.colIdx,
					lines: pqLines.map((line, lineIndex) => ({
						x: pqX + 20,
						y: pqY + 8 + lineIndex * PQ_LINE_HEIGHT,
						text: line.text,
						width: line.width,
					})),
				});
			}
		}

		// Body flow with cursor handoff between columns. Cursor starts past the
		// first grapheme — the drop cap renders it.
		const allBodyLines: PositionedLine[] = [];
		let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: dropCapText === "" ? 0 : 1 };
		for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
			const columnX = contentLeft + columnIndex * (columnWidth + colGap);
			const rects: RectObstacle[] = [];
			if (columnIndex === 0 && dropCapTotalW > 0) rects.push(dropCapRect);
			for (const pq of pullquoteRects) {
				if (pq.colIdx === columnIndex) rects.push(pq);
			}
			const result = layoutColumn(
				preparedBody,
				cursor,
				columnX,
				bodyTop,
				columnWidth,
				bodyHeight,
				BODY_LINE_HEIGHT,
				circleObstacles,
				rects,
				isNarrow
			);
			allBodyLines.push(...result.lines);
			cursor = result.cursor;
		}

		const pullquoteLines = pullquoteRects.flatMap((pq) => pq.lines);

		// --- DOM writes (only when the projection changed) ---
		const changed =
			committedLines === null ||
			committedLines.headlineFont !== headlineFont ||
			!positionedLinesEqual(committedLines.headline, headlineLines) ||
			!positionedLinesEqual(committedLines.body, allBodyLines) ||
			!positionedLinesEqual(committedLines.pullquote, pullquoteLines);

		if (changed) {
			syncPool(headlinePool, headlineLines.length, () => makeLineEl("ee-headline-line"));
			for (let i = 0; i < headlineLines.length; i++) {
				const el = headlinePool[i]!;
				const line = headlineLines[i]!;
				el.textContent = line.text;
				el.style.left = `${gutter + line.x}px`;
				el.style.top = `${gutter + line.y}px`;
				el.style.font = headlineFont;
				el.style.lineHeight = `${headlineLineHeight}px`;
			}
			syncPool(bodyLinePool, allBodyLines.length, () => makeLineEl("ee-line"));
			for (let i = 0; i < allBodyLines.length; i++) {
				const el = bodyLinePool[i]!;
				const line = allBodyLines[i]!;
				el.textContent = line.text;
				el.style.left = `${line.x}px`;
				el.style.top = `${line.y}px`;
				el.style.font = bodyFont;
				el.style.lineHeight = `${BODY_LINE_HEIGHT}px`;
			}
			syncPool(pullquoteLinePool, pullquoteLines.length, () => makeLineEl("ee-pullquote-line"));
			for (let i = 0; i < pullquoteLines.length; i++) {
				const el = pullquoteLinePool[i]!;
				const line = pullquoteLines[i]!;
				el.textContent = line.text;
				el.style.left = `${line.x}px`;
				el.style.top = `${line.y}px`;
				el.style.font = pullquoteFont;
				el.style.lineHeight = `${PQ_LINE_HEIGHT}px`;
			}
			committedLines = {
				headline: headlineLines,
				body: allBodyLines,
				pullquote: pullquoteLines,
				headlineFont,
			};
		}

		dropCapEl.style.left = `${contentLeft}px`;
		dropCapEl.style.top = `${bodyTop}px`;

		syncPool(pullquoteBoxPool, pullquoteRects.length, () => {
			const element = document.createElement("div");
			element.className = "ee-pullquote-box";
			return element;
		});
		for (let i = 0; i < pullquoteRects.length; i++) {
			const pq = pullquoteRects[i]!;
			const el = pullquoteBoxPool[i]!;
			el.style.left = `${pq.x}px`;
			el.style.top = `${pq.y}px`;
			el.style.width = `${pq.w}px`;
			el.style.height = `${pq.h}px`;
		}

		for (let index = 0; index < orbs.length; index++) {
			const orb = orbs[index]!;
			const element = orbEls[index]!;
			if (index >= activeOrbCount) {
				element.style.display = "none";
				continue;
			}
			const radius = orb.r * orbRadiusScale;
			element.style.display = "";
			element.style.left = `${orb.x - radius}px`;
			element.style.top = `${orb.y - radius}px`;
			element.style.width = `${radius * 2}px`;
			element.style.height = `${radius * 2}px`;
			element.style.opacity = orb.paused ? "0.45" : "1";
		}

		const hoveredOrbIndex = hitTestOrbs(orbs, pointer.x, pointer.y, activeOrbCount, orbRadiusScale);
		stage.style.cursor = drag !== null ? "grabbing" : hoveredOrbIndex !== -1 ? "grab" : "";
		lastFrameTime = stillAnimating ? now : null;
		return stillAnimating;
	}

	// --- Events ---
	function onPointerDown(event: PointerEvent): void {
		const point = stagePoint(event);
		const isNarrow = stageW < NARROW_BREAKPOINT;
		const activeOrbCount = isNarrow ? NARROW_ACTIVE_ORBS : orbs.length;
		const radiusScale = isNarrow ? NARROW_ORB_SCALE : 1;
		const orbIndex = hitTestOrbs(orbs, point.x, point.y, activeOrbCount, radiusScale);
		if (orbIndex !== -1) {
			event.preventDefault();
			const orb = orbs[orbIndex]!;
			drag = {
				orbIndex,
				startPointerX: point.x,
				startPointerY: point.y,
				startOrbX: orb.x,
				startOrbY: orb.y,
			};
		}
		pointer = point;
		scheduleRender();
	}

	function onPointerMove(event: PointerEvent): void {
		const point = stagePoint(event);
		pointer = point;
		if (drag !== null) {
			const orb = orbs[drag.orbIndex]!;
			orb.x = drag.startOrbX + (point.x - drag.startPointerX);
			orb.y = drag.startOrbY + (point.y - drag.startPointerY);
		}
		scheduleRender();
	}

	function onPointerUp(event: PointerEvent): void {
		const point = stagePoint(event);
		pointer = point;
		if (drag !== null) {
			const dx = point.x - drag.startPointerX;
			const dy = point.y - drag.startPointerY;
			// A motionless press toggles pause instead of dragging.
			if (dx * dx + dy * dy < 16) {
				orbs[drag.orbIndex]!.paused = !orbs[drag.orbIndex]!.paused;
			}
			drag = null;
		}
		scheduleRender();
	}

	function onSelectionChange(): void {
		const selection = window.getSelection();
		selectionActive = selection !== null && !selection.isCollapsed && selection.rangeCount > 0;
		scheduleRender();
	}

	stage.addEventListener("pointerdown", onPointerDown);
	window.addEventListener("pointermove", onPointerMove);
	window.addEventListener("pointerup", onPointerUp);
	window.addEventListener("pointercancel", onPointerUp);
	document.addEventListener("selectionchange", onSelectionChange);

	const resizeObserver = new ResizeObserver((entries) => {
		for (const entry of entries) {
			stageW = entry.contentRect.width;
			stageH = entry.contentRect.height;
		}
		scheduleRender();
	});
	resizeObserver.observe(stage);

	scheduleRender();

	return () => {
		destroyed = true;
		if (scheduledRaf !== null) cancelAnimationFrame(scheduledRaf);
		resizeObserver.disconnect();
		stage.removeEventListener("pointerdown", onPointerDown);
		window.removeEventListener("pointermove", onPointerMove);
		window.removeEventListener("pointerup", onPointerUp);
		window.removeEventListener("pointercancel", onPointerUp);
		document.removeEventListener("selectionchange", onSelectionChange);
		stage.replaceChildren();
	};
}
