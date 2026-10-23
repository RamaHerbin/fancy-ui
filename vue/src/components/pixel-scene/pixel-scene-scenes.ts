/**
 * PixelScene scenes — framework-free, byte-identical in the Svelte, React and
 * Vue trees (see shared-cores.json).
 *
 * Four painters (alpine, meadow, sea, mountains) with complete day and night
 * palettes, the sprites they use and the drawing helpers. A painter fills the
 * whole grid every frame through `put(x, y, colour, inkAlpha, lit, haloCells)`:
 *
 * - `colour` is what the lens shows;
 * - `inkAlpha` is the resting dot outside the lens (0 = none);
 * - `lit`: false = plain, true = shown in colour outside the lens too (HDR
 *   {@link LIT_GLOW}), a number = lit and HDR at that multiple of SDR white;
 * - `haloCells > 0` makes the cell an emitter: `pixelHalos` lights the cells
 *   around it as Bayer-dithered hard squares.
 *
 * Layout is by fractions of COLS / ROWS so a scene fits any box. Everything is
 * a square on the grid: no blur, no gradient between cells.
 *
 * Re-entrancy: the drawing target (`G`, `COLS`, `ROWS`, `NIGHT`) is module
 * state. Painting is synchronous and two instances paint one after the other
 * inside their own animation frames, so this is safe — never add an `await`
 * inside a painter. Per-size caches are keyed on ROWS / NIGHT.
 *
 * Compiles under `noUncheckedIndexedAccess`; the `!` assertions are in bounds
 * by construction.
 */

import {
	bayer,
	clamp,
	createGrid,
	grad,
	hash,
	mixHex,
	noise1,
	parseColour,
	ridge,
	smooth,
	writeCell,
	type Colour,
	type PixelGrid,
	type ScenePainter,
} from "./pixel-scene-core.js";

export type PixelSceneName = "alpine" | "meadow" | "sea" | "mountains";
export const PIXEL_SCENES: readonly PixelSceneName[] = ["alpine", "meadow", "sea", "mountains"];

// --- HDR levels (multiples of SDR white; the core clamps at 4.9) -------------

const G_STAR = 3.5;
const G_MOON = 3.5;
const G_SUN = 4.9;
/** Windows, lantern, pier lamp, groomer headlight, cabin windows: 4.6–4.9 with flicker. */
const G_LAMP = 4.6;
const G_LAMP_FLICKER = 0.3;
const G_SNOWCAP = 1.8;
const G_FLOWER = 1.8;
const G_SPARKLE = 2.2;
const G_DAYLAMP = 1.6;

/**
 * The copy corner every scene keeps open for text (kicker, title, paragraph),
 * as fractions of the grid from the top-left. Lens cells inside it stay at
 * SDR level so the text keeps its contrast; alpine also thins its ink there.
 */
const COPY_W = 0.42;
const COPY_H = 0.52;

// --- drawing target ----------------------------------------------------------

let G: PixelGrid = createGrid(0, 0);
let COLS = 0;
let ROWS = 0;
let NIGHT = false;

const night = () => NIGHT;
const h = parseColour;

function put(x: number, y: number, c: Colour, a = 0, l: boolean | number = false, hl = 0): void {
	writeCell(G, x, y, c, a, l, hl);
}

/** Whether a cell already holds a colour. */
function filled(x: number, y: number): boolean {
	x = Math.round(x);
	y = Math.round(y);
	if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
	return G.color[y * COLS + x]! >= 0;
}

/** Whether a cell is shown in colour outside the lens. */
function isLit(x: number, y: number): boolean {
	x = Math.round(x);
	y = Math.round(y);
	if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
	return G.lit[y * COLS + x]! > 0;
}

/** Calls `fn` for every cell within `r` of `(cx, cy)`. */
function disc(
	cx: number,
	cy: number,
	r: number,
	fn: (x: number, y: number, d: number) => void
): void {
	for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
		for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
			const d = Math.hypot(x - cx, y - cy);
			if (d <= r + 0.001) fn(x, y, d);
		}
}

/** A sprite cell: a colour (dot alpha = the sprite's), or `[colour, inkAlpha, lit, haloCells]`. */
type SpriteCell = Colour | readonly [Colour, number, boolean | number, number?];
type SpriteMap = Record<string, SpriteCell | undefined>;

function sprite(
	rows: readonly string[],
	map: SpriteMap,
	ox: number,
	oy: number,
	a = 0.9,
	flip = false
): void {
	for (let j = 0; j < rows.length; j++) {
		const row = rows[j]!;
		for (let i = 0; i < row.length; i++) {
			const ch = row[i]!;
			if (ch === ".") continue;
			const c = map[ch];
			if (c === undefined) continue;
			const x = ox + (flip ? row.length - 1 - i : i);
			if (typeof c === "string" || typeof c === "number") put(x, oy + j, c, a);
			else put(x, oy + j, c[0], c[1], c[2], c[3] ?? 0);
		}
	}
}

/** Lamp level with a slow per-light flicker in [G_LAMP, G_LAMP + 0.3]. */
function lamp(t: number, seed: number): number {
	return G_LAMP + G_LAMP_FLICKER * (0.5 + 0.5 * Math.sin(t * 0.006 + seed * 2.3));
}

// --- shared palettes ---------------------------------------------------------

const SUN = [h("#f7cf4a"), h("#f6a24e"), h("#ef7a5e"), h("#ea7d9c")] as const;
const SKY = {
	day: [
		[0, h("#79b6f2")],
		[0.55, h("#bcdcf7")],
		[1, h("#f6e6c9")],
	],
	night: [
		[0, h("#17143a")],
		[0.35, h("#3a2a5e")],
		[0.7, h("#8e4a6a")],
		[1, h("#e39a5a")],
	],
} as const satisfies Record<string, readonly (readonly [number, number])[]>;
const GROUND = {
	day: [
		[0, h("#8fbf6e")],
		[1, h("#4e7f45")],
	],
	night: [
		[0, h("#28384a")],
		[1, h("#111a26")],
	],
} as const;
const WATER = { day: [h("#3f86d8"), h("#9ed0f6")], night: [h("#243a73"), h("#7aa9d8")] } as const;
const CLOUD = { day: h("#ffffff"), night: h("#c98ea0") } as const;
const BIRDC = { day: h("#2b2b2b"), night: h("#b89ad8") } as const;
const STAR = h("#fff3c4");
const BLACK = 0x000000;
const WHITE = 0xffffff;

const mode = () => (NIGHT ? "night" : "day");

function skyFill(horizon: number): void {
	const stops = SKY[mode()];
	for (let y = 0; y < horizon; y++) {
		const c = grad(stops, y / horizon);
		for (let x = 0; x < COLS; x++) put(x, y, c, 0);
	}
}

function stars(t: number, horizon: number): void {
	if (!night()) return;
	for (let y = 0; y < horizon * 0.8; y++)
		for (let x = 0; x < COLS; x++)
			if (hash(x, y, 41) > 0.988 && Math.sin(t * 0.003 + hash(x, y, 42) * 30) > 0.2)
				put(x, y, STAR, 0.6, G_STAR);
}

const MOON_A = h("#f4ead0");
const MOON_B = h("#c9b89a");
function sunDisc(sx: number, sy: number, R: number, cut = 1e9): void {
	disc(sx, sy, R, (x, y) => {
		if (y >= cut) return;
		const band = clamp(Math.floor(((y - (sy - R)) / (2 * R)) * 4), 0, 3);
		if (night()) put(x, y, mixHex(MOON_A, MOON_B, band / 3), 0.5, G_MOON, 0.6);
		else put(x, y, SUN[band]!, 0.9, G_SUN, 0.8);
	});
}

function clouds(t: number, list: readonly (readonly [number, number, number])[]): void {
	const c = CLOUD[mode()];
	list.forEach(([ox, cy, w], i) => {
		const cx = ((ox * COLS + t * 0.0011 * (1 + i * 0.3)) % (COLS + 2 * w)) - w;
		for (let y = -2; y <= 2; y++)
			for (let x = -w; x <= w; x++) {
				const e = (x * x) / (w * w) + (y * y) / 4.5;
				if (e < 1 && hash(Math.round(cx) + x, cy + y, 5 + i) > e * 0.8)
					put(cx + x, cy + y, c, 0.22);
			}
	});
}

function bird(x: number, y: number, phase: number, alpha = 0.8): void {
	const c = BIRDC[mode()];
	const f = Math.sin(phase);
	const wing = f > 0.4 ? -1 : f < -0.4 ? 1 : 0;
	put(x, y, c, alpha);
	put(x - 1, y + wing, c, alpha);
	put(x + 1, y + wing, c, alpha);
	put(x - 2, y + wing * 2 || y, c, alpha * 0.8);
	put(x + 2, y + wing * 2 || y, c, alpha * 0.8);
}

function flock(t: number, n: number, baseY: number, speed = 0.009): void {
	for (let i = 0; i < n; i++) {
		const lead = ((t * speed + 40) % (COLS + 60)) - 30;
		bird(
			lead - i * 5 - (i % 2) * 2,
			baseY + Math.abs(i - (n - 1) / 2) * 1.8 + Math.sin(t * 0.0025 + i * 0.8) * 1.2,
			t * 0.011 + i * 0.9
		);
	}
}

// --- sprites -----------------------------------------------------------------

const LANTERN = h("#ffd15c");
const PERSON_MAP = (t: number): SpriteMap => ({
	k: "#2a1c1c",
	s: "#f3cba6",
	r: "#e0433f",
	b: "#2f4b94",
	n: "#6b4a2b",
	w: "#f6f6f6",
	y: [LANTERN, 0.9, lamp(t, 1), 1.6],
	d: "#a3673a",
	D: "#6f4322",
	t: "#e9a0a0",
});
const PERSON = [
	[
		".kkk.",
		".kkk.",
		".sss.",
		"..s..",
		".rrr.",
		"rrrrr",
		"r.r.y",
		".bbb.",
		".b.b.",
		".b.b.",
		".n.n.",
	],
	[
		".kkk.",
		".kkk.",
		".sss.",
		"..s..",
		".rrr.",
		"rrrrr",
		"r.r.y",
		".bbb.",
		".b.b.",
		"b...b",
		"n...n",
	],
] as const;
const DOG = [
	["......dd", "..ddddd.", ".dddddd.", "dd.d..d.", "d..d..d."],
	[".....dd.", "..ddddd.", ".dddddd.", "d..d..d.", "d..dd.d."],
] as const;
const BOAT = [
	"....w....",
	"...ww....",
	"..www....",
	".wwww....",
	"wwwww....",
	"....n....",
	"nnnnnnnnn",
	".nnnnnnn.",
];
const CABIN = ["...n...", "..nnn..", ".nnnnn.", "nnnnnnn", ".DyDDD.", ".DyDDD.", ".DDDDD."];

// --- 0. ALPINE ---------------------------------------------------------------
// A snowy ridge in the top band, wide pistes with a lift on the left, autumn
// tree belts, a chalet village bottom-right, dense forest along the bottom.
// Slow life: cirrus drift, cabins on the cable, chimney smoke, a hawk by day,
// a groomer headlight by night. No sun by day; a moon by night.

interface AlpinePalette {
	sky: readonly (readonly [number, number])[];
	cirrus: number;
	rockLit: number;
	rockShade: number;
	snow: number;
	snowShade: number;
	piste: number;
	fold: number;
	track: number;
	shrub: number;
	conifer: readonly [number, number];
	autumn: readonly [number, number, number, number];
	trunk: number;
	roof: number;
	roofShade: number;
	eave: number;
	wall: number;
	wallD: number;
	win: number;
	lamp: number;
	road: number;
	stone: number;
	pylon: number;
	cable: number;
	forest: readonly [number, number, number, number];
	glint: number;
	groomer: number;
	moon: number;
	moonRim: number;
	star: number;
	hawk: number;
	smoke: number;
	cabin: readonly [number, number];
	cabinLamp: number;
	beam: number;
	beacon: number;
	tracks: number;
}

const ALP: Record<"day" | "night", AlpinePalette> = {
	day: {
		sky: [
			[0, h("#4f93e6")],
			[0.7, h("#86b8ef")],
			[1, h("#a9cdf3")],
		],
		cirrus: h("#ffffff"),
		rockLit: h("#6b7383"),
		rockShade: h("#454a58"),
		snow: h("#f3f6fb"),
		snowShade: h("#c6d4ea"),
		piste: h("#eef3f9"),
		fold: h("#d6e2f1"),
		track: h("#bccde6"),
		shrub: h("#5b5a3e"),
		conifer: [h("#2f5a3a"), h("#1f3f2a")],
		autumn: [h("#d9712a"), h("#b5402a"), h("#e0a33a"), h("#8a9340")],
		trunk: h("#6e665e"),
		roof: h("#f6f8fc"),
		roofShade: h("#cfdbee"),
		eave: h("#2e2622"),
		wall: h("#7a4a2a"),
		wallD: h("#5a3520"),
		win: h("#2b2420"),
		lamp: h("#ffd15c"),
		road: h("#8a8d93"),
		stone: h("#a9a59c"),
		pylon: h("#3a3d44"),
		cable: h("#565a63"),
		forest: [h("#2a4a33"), h("#1f3a28"), h("#8f9a3a"), h("#c9a53a")],
		glint: h("#ffffff"),
		groomer: h("#c0392b"),
		moon: h("#fff4d2"),
		moonRim: h("#d6ccb0"),
		star: h("#fff3c4"),
		hawk: h("#3a2e28"),
		smoke: h("#a3adbd"),
		cabin: [h("#c8402e"), h("#e0a33a")],
		cabinLamp: h("#ffcf7a"),
		beam: h("#e9eeff"),
		beacon: h("#ffa040"),
		tracks: h("#14161f"),
	},
	night: {
		sky: [
			[0, h("#090b26")],
			[0.55, h("#151b4a")],
			[1, h("#2c3772")],
		],
		cirrus: h("#58629a"),
		rockLit: h("#3c4668"),
		rockShade: h("#20263f"),
		snow: h("#cad6f2"),
		snowShade: h("#7484b4"),
		piste: h("#9eacd4"),
		fold: h("#7c8bbb"),
		track: h("#66759f"),
		shrub: h("#1c2030"),
		conifer: [h("#17301f"), h("#0d1f15")],
		autumn: [h("#6e4a3a"), h("#5a3236"), h("#7a6844"), h("#4a5238")],
		trunk: h("#3a3a48"),
		roof: h("#c6d3f1"),
		roofShade: h("#8f9fcc"),
		eave: h("#120f16"),
		wall: h("#3b2a24"),
		wallD: h("#291d19"),
		win: h("#17121a"),
		lamp: h("#ffc650"),
		road: h("#3a3f52"),
		stone: h("#4b5068"),
		pylon: h("#090b14"),
		cable: h("#2a2f45"),
		forest: [h("#0f2018"), h("#0a1711"), h("#2e3a24"), h("#4a4428")],
		glint: h("#e6eeff"),
		groomer: h("#3a2a2a"),
		moon: h("#f1ecd8"),
		moonRim: h("#d6ccb0"),
		star: h("#fff3c4"),
		hawk: h("#b89ad8"),
		smoke: h("#6f78a0"),
		cabin: [h("#4a2a2a"), h("#5a4a2a")],
		cabinLamp: h("#ffcf7a"),
		beam: h("#e9eeff"),
		beacon: h("#ffa040"),
		tracks: h("#14161f"),
	},
};

const ALP_DARK = new Map<number, number>();
function darker(c: number): number {
	let v = ALP_DARK.get(c);
	if (v === undefined) {
		v = mixHex(c, BLACK, 0.28);
		ALP_DARK.set(c, v);
	}
	return v;
}
/** Terrain lines, keyed on the grid size: they depend on neither time nor theme. */
let ALP_TERRAIN: {
	key: string;
	crest: Float32Array;
	rockBase: Float32Array;
	forestTop: Float32Array;
} = {
	key: "",
	crest: new Float32Array(0),
	rockBase: new Float32Array(0),
	forestTop: new Float32Array(0),
};

function alpineTerrain(C: number, R: number): typeof ALP_TERRAIN {
	const key = C + "x" + R;
	if (ALP_TERRAIN.key === key) return ALP_TERRAIN;
	const crest = new Float32Array(C);
	const rockBase = new Float32Array(C);
	const forestTop = new Float32Array(C);
	for (let x = 0; x < C; x++) {
		const u = x / C;
		const base = R * (0.52 - 0.33 * smooth((u - 0.16) / 0.5) + 0.1 * smooth((u - 0.74) / 0.26));
		const peaks =
			R * 0.07 * Math.max(0, 1 - Math.abs(u - 0.64) / 0.05) +
			R * 0.05 * Math.max(0, 1 - Math.abs(u - 0.5) / 0.04) +
			R * 0.04 * Math.max(0, 1 - Math.abs(u - 0.82) / 0.035);
		const cr =
			base -
			peaks +
			(ridge(x, 71, 8, R * 0.06) - R * 0.04) +
			(noise1(x / 1.6, 73) - 0.5) * R * 0.035;
		crest[x] = cr;
		rockBase[x] =
			Math.max(cr + 3, Math.min(R * 0.56, cr + R * (0.17 + noise1(x / 6, 78) * 0.1))) +
			(noise1(x / 7, 77) - 0.5) * R * 0.06;
		// the lower-left edge stays low so the lift slope keeps its snow
		forestTop[x] =
			R * (0.92 - 0.015 * (1 - smooth(u / 0.32)) - 0.15 * smooth((u - 0.86) / 0.14)) -
			noise1(x / 4, 51) * R * 0.04;
	}
	ALP_TERRAIN = { key, crest, rockBase, forestTop };
	return ALP_TERRAIN;
}

/** Sky row colours, keyed on theme and row count (two instances may differ). */
let ALP_SKY: { key: string; rows: Int32Array } = { key: "", rows: new Int32Array(0) };

/** 0..1..0 triangle wave. */
const tri = (v: number) => {
	const f = v - Math.floor(v);
	return 1 - Math.abs(f * 2 - 1);
};

/** Cirrus streaks: `[x origin as a fraction of the span, y as a fraction of ROWS, length]`. */
const CIRRUS = [
	[0.08, 0.1, 30],
	[0.34, 0.2, 22],
	[0.55, 0.06, 34],
	[0.78, 0.16, 26],
	[0.96, 0.27, 18],
] as const;

/** Tree belts: `[u, v, radius u, radius v, weight]`. */
const BELTS = [
	[0.2, 0.7, 0.08, 0.11, 0.95],
	[0.72, 0.62, 0.12, 0.07, 0.95],
	[0.43, 0.65, 0.04, 0.04, 0.75],
	[0.92, 0.63, 0.05, 0.05, 0.7],
	[0.56, 0.6, 0.05, 0.035, 0.65],
	[0.33, 0.78, 0.05, 0.04, 0.6],
] as const;

const VILLAGE_ROWS = [
	[0.745, 0.585, 0.85],
	[0.805, 0.57, 0.86],
	[0.865, 0.6, 0.84],
] as const;

const HAWK_SHAPE = [
	[-3, -1, 2],
	[-2, -1, 1],
	[-1, 0, 0],
	[0, 0, 0],
	[1, 0, 0],
	[2, -1, 1],
	[3, -1, 2],
] as const;

function alpine(t: number): void {
	const N = night();
	const P = ALP[N ? "night" : "day"];
	const C = COLS;
	const R = ROWS;
	// the copy corner (kicker + H1 + paragraph): ink thinned, no snow-cap HDR
	const copyW = C * COPY_W;
	const copyH = R * COPY_H;
	const inCopy = (x: number, y: number) => x < copyW && y < copyH;

	// ---- terrain lines (by fractions of the grid, cached per size) ----
	const { crest, rockBase, forestTop } = alpineTerrain(C, R);
	const rockAt = (x: number) => rockBase[clamp(Math.round(x), 0, C - 1)]!;

	// ---- sky (row colours cached per theme and size) ----
	const skyH = Math.max(1, Math.floor(R * 0.58));
	const key = (N ? "n" : "d") + R;
	if (ALP_SKY.key !== key) {
		const rows = new Int32Array(R);
		for (let y = 0; y < R; y++) rows[y] = grad(P.sky, y / skyH);
		ALP_SKY = { key, rows };
	}
	for (let y = 0; y < R; y++) {
		const c = ALP_SKY.rows[y]!;
		for (let x = 0; x < C; x++) if (y < crest[x]! + 1) put(x, y, c, 0);
	}
	if (N) {
		for (let y = 0; y < skyH; y++)
			for (let x = 0; x < C; x++) {
				if (y >= crest[x]! - 1) continue;
				if (hash(x, y, 41) < (inCopy(x, y) ? 0.995 : 0.986)) continue;
				if (Math.sin(t * 0.003 + hash(x, y, 42) * 30) > 0.15) put(x, y, P.star, 0.55, G_STAR);
			}
		// moon: hard crescent disc, HDR emitter
		const mx = Math.floor(C * 0.9);
		const my = Math.max(4, Math.floor(R * 0.13));
		const mr = 3.2;
		disc(mx, my, mr, (x, y, dd) => {
			if (x - mx > mr * 0.25 && dd > mr * 0.55) return;
			put(x, y, dd > mr * 0.7 ? P.moonRim : P.moon, 0.6, G_MOON, 0.6);
		});
	}

	// ---- cirrus: thin diagonal streaks drifting right very slowly ----
	CIRRUS.forEach(([ox, oy, len], k) => {
		const span = C + 2 * len;
		const x0 = ((ox * span + t * 0.0005 * (1 + k * 0.15)) % span) - len;
		const y0 = R * oy;
		for (let i = 0; i < len; i++) {
			const x = Math.round(x0 + i);
			const y = Math.round(y0 - i * 0.22 + Math.sin(i * 0.25 + k) * 0.6);
			if (x < 0 || x >= C || y < 0 || y >= crest[x]! - 1) continue;
			const edge = Math.min(i, len - 1 - i) / (len * 0.5);
			if (hash(i, k, 520) > edge * 1.4) continue;
			put(x, y, P.cirrus, hash(x, y, 521) > 0.45 ? (N ? 0.12 : 0.2) : 0);
			if (edge > 0.5 && hash(i, k, 522) > 0.6 && x + 1 < C && y - 1 < crest[x + 1]! - 1)
				put(x + 1, y - 1, P.cirrus, 0);
		}
	});

	// ---- ridge: rock and snow in diagonal stripes and couloirs ----
	for (let x = 0; x < C; x++) {
		const top = crest[x]!;
		const bottom = rockBase[x]!;
		const band = bottom - top;
		for (let y = Math.max(0, Math.floor(top)); y < bottom && y < R; y++) {
			const fromTop = y - top;
			const depth = fromTop / band;
			const face = noise1((x - y * 0.6) / 5, 95) > 0.42;
			const stripe = noise1((x + y * 1.4) / 2.6, 91);
			const couloir = noise1(x / 1.7, 93);
			const cap = fromTop < 2 && bayer(x, y) < 0.8 - fromTop * 0.3;
			const snowy = cap || stripe > 0.64 - depth * 0.32 || couloir > 0.8;
			const c = snowy ? (face ? P.snow : P.snowShade) : face ? P.rockLit : P.rockShade;
			let a = 0;
			if (fromTop < 1) a = 0.8;
			else if (!snowy) a = bayer(x, y) < (face ? 0.2 : 0.42) ? (face ? 0.38 : 0.52) : 0;
			else if (!face) a = bayer(x, y) < 0.1 ? 0.22 : 0;
			let l: boolean | number = false;
			if (cap && !inCopy(x, y) && bayer(x, y) < 0.55 - fromTop * 0.25) l = G_SNOWCAP;
			else if (N && snowy && face && hash(x, y, 96) > 0.965) l = true;
			put(x, y, c, a, l);
		}
	}

	// ---- pistes: soft white, pale-blue folds, curving tracks, glints, shrubs ----
	for (let x = 0; x < C; x++) {
		const y0 = Math.ceil(rockBase[x]!);
		const bend = noise1(x / 14, 61) * 12;
		for (let y = y0; y < R; y++) {
			const fold = noise1((x * 0.6 + y * 2.2 + bend) / 6, 63) > 0.7;
			const c = y - y0 < 2 ? P.snowShade : fold ? P.fold : P.piste;
			let a = 0;
			if (y === y0) a = bayer(x, y) < 0.6 ? 0.4 : 0;
			else if (hash(x, y, 64) > 0.984) a = 0.16;
			put(x, y, c, a);
			if (hash(x, y, 68) > 0.994 && y > y0 + 2) put(x, y, P.shrub, 0.45);
		}
	}
	const trackY = (k: number, x: number) =>
		R * (0.63 + k * 0.075) + Math.sin(x * 0.045 + k * 2.1) * R * 0.035;
	for (let k = 0; k < 3; k++)
		for (let x = Math.floor(C * (0.3 + k * 0.05)); x < C * 0.98; x++)
			if (hash(x, k, 65) > 0.22) put(x, trackY(k, x), P.track, 0.2);
	for (let y = 0; y < R; y++)
		for (let x = 0; x < C; x++) {
			if (y <= rockBase[x]! + 1 || hash(x, y, 66) < 0.9965) continue;
			if (Math.sin(t * 0.0035 + hash(x, y, 67) * 40) > 0.9) put(x, y, P.glint, 0.2, G_SPARKLE);
		}

	// ---- lift line (left slope): the corridor through the trees follows it ----
	const L0x = C * 0.05;
	const L0y = R * 0.87;
	const L1x = C * 0.33;
	const L1y = R * 0.58;
	/** In the cut corridor: along the line, from 4 cells below the ground to 11 above it. */
	const inCorridor = (x: number, y: number) => {
		const f = (x - L0x) / (L1x - L0x);
		if (f < -0.04 || f > 1.04) return false;
		const dy = y - (L0y + (L1y - L0y) * clamp(f, 0, 1));
		return dy > -11 && dy < 4;
	};

	// ---- tree belts: conifers and autumn canopies, drawn back to front ----
	const conifer = (x: number, by: number, hgt: number, side: number) => {
		for (let k = 0; k < hgt; k++) {
			const half = Math.floor(k * 0.45);
			for (let dx = -half; dx <= half; dx++)
				put(
					x + dx,
					by - hgt + k,
					dx * side > 0 ? P.conifer[0] : P.conifer[1],
					k === 0 || Math.abs(dx) === half ? 0.8 : 0.6
				);
		}
		put(x, by, P.trunk, 0.55);
	};
	const canopy = (x: number, by: number, r: number, col: number, seed: number) => {
		const cy = by - r - 1;
		disc(x, cy, r, (px, py, dd) => {
			if (hash(px, py, seed) > (dd / r) * 0.55 + 0.05)
				put(px, py, px < x && py > cy - 0.5 ? darker(col) : col, dd > r - 1 ? 0.75 : 0.55);
		});
		put(x, by, P.trunk, 0.6);
		put(x, by - 1, P.trunk, 0.6);
	};
	for (let gy = 0; gy < R; gy += 3)
		for (let gx = 0; gx < C; gx += 3) {
			const x = gx + Math.floor(hash(gx, gy, 101) * 3);
			const y = gy + Math.floor(hash(gx, gy, 102) * 3);
			if (y < rockAt(Math.min(C - 1, x)) + 4 || y > R * 0.86) continue;
			if (inCorridor(x, y)) continue;
			const u = x / C;
			const v = y / R;
			let p = 0.015;
			for (const [bu, bv, ru, rv, w] of BELTS) {
				const e = ((u - bu) / ru) ** 2 + ((v - bv) / rv) ** 2;
				if (e < 1) p = Math.max(p, w * 0.8 * (1 - e * 0.8));
			}
			if (hash(x, y, 103) > p) continue;
			const kind = hash(x, y, 104);
			if (kind < 0.45) conifer(x, y, 4 + Math.floor(hash(x, y, 105) * 4), 1);
			else if (kind < 0.94)
				canopy(x, y, 1.5 + hash(x, y, 106) * 1.5, P.autumn[Math.floor(hash(x, y, 107) * 4)]!, 108);
			else
				for (let k = 0; k < 4; k++) {
					put(x, y - k, P.trunk, 0.5);
					if (k === 2) {
						put(x - 1, y - 3, P.trunk, 0.4);
						put(x + 1, y - 3, P.trunk, 0.4);
					}
				}
		}

	// ---- lift: pylons 1 cell wide, two sagging cables, cabins up and down ----
	const tops: [number, number][] = [];
	for (let k = 0; k <= 5; k++) {
		const s = k / 5;
		const px = Math.round(L0x + (L1x - L0x) * s);
		const gy = Math.round(L0y + (L1y - L0y) * s);
		const hgt = 6 + Math.floor(hash(k, 0, 111) * 4);
		for (let j = 0; j < hgt; j++) put(px, gy - j, P.pylon, 0.75);
		put(px - 1, gy - hgt, P.pylon, 0.75);
		put(px + 1, gy - hgt, P.pylon, 0.75);
		tops.push([px, gy - hgt]);
	}
	const first = tops[0]!;
	const lastTop = tops[tops.length - 1]!;
	const cableAt = (x: number): number | null => {
		for (let k = 0; k < tops.length - 1; k++) {
			const [ax, ay] = tops[k]!;
			const [bx, by] = tops[k + 1]!;
			if (x >= ax && x <= bx) {
				const f = (x - ax) / (bx - ax || 1);
				return ay + (by - ay) * f + Math.sin(Math.PI * f) * 1.2;
			}
		}
		return null;
	};
	for (let x = first[0]; x <= lastTop[0]; x++) {
		const cy = cableAt(x);
		if (cy === null) continue;
		put(x - 1, cy, P.cable, 0.35);
		put(x + 1, cy, P.cable, 0.35);
	}
	// cabins: about 110 s per trip, five per cable, a warm window at night
	for (let k = 0; k < 5; k++)
		for (const dir of [1, -1]) {
			const ph = (t / 110000 + k / 5 + (dir < 0 ? 0.1 : 0)) % 1;
			const s = dir > 0 ? ph : 1 - ph;
			if (s < 0.03 || s > 0.97) continue;
			const off = dir > 0 ? 1 : -1;
			const cxm = Math.round(first[0] + (lastTop[0] - first[0]) * s);
			const cy = cableAt(cxm);
			if (cy === null) continue;
			const x = cxm + off;
			const y = Math.round(cy);
			const col = P.cabin[k % 2]!;
			put(x, y + 1, P.cable, 0.5);
			put(x, y + 2, col, 0.85);
			put(x + 1, y + 2, col, 0.85);
			put(x, y + 3, col, 0.85);
			put(x + 1, y + 3, col, 0.85);
			if (N)
				put(x + (dir > 0 ? 1 : 0), y + 2, P.cabinLamp, 0.9, lamp(t, k * 2 + (dir > 0 ? 0 : 1)));
		}

	// ---- village: snowy gable roofs, timber walls, windows (warm ones are HDR emitters) ----
	const winLit = N ? 0.4 : 0.12;
	const smokers: [number, number][] = [];
	const chalet = (x: number, by: number, w: number, storeys: number, seed: number, row: number) => {
		const rh = (w + 1) >> 1;
		const wallH = storeys * 2;
		const roofY = by - wallH - rh;
		for (let r = 0; r < rh; r++) {
			const a = rh - 1 - r;
			for (let dx = a; dx <= w - 1 - a; dx++) {
				const edge = dx === a || dx === w - 1 - a;
				put(
					x + dx,
					roofY + r,
					dx < w / 2 - 0.5 ? P.roofShade : P.roof,
					edge ? 0.8 : 0,
					edge && N && bayer(x + dx, roofY + r) < 0.5
				);
			}
		}
		for (let dx = -1; dx <= w; dx++) put(x + dx, by - wallH, P.eave, 0.85);
		for (let j = 1; j < wallH; j++)
			for (let dx = 0; dx < w; dx++) {
				const wx = x + dx;
				const wy = by - wallH + j;
				const isWin = dx % 2 === 1 && dx < w - 1 && j % 2 === 1;
				if (isWin) {
					const hw = hash(wx, wy, seed);
					// a few windows switch on and off slowly, the rest are steady
					const breathe = hash(wx, wy, seed + 2) > 0.9 ? Math.sin(t * 0.00031 + hw * 50) > 0 : true;
					if (breathe && hw < winLit) {
						if (N) put(wx, wy, P.lamp, 0.9, lamp(t, wx + wy * 7), 0.9);
						else put(wx, wy, P.lamp, 0.9, G_DAYLAMP);
					} else put(wx, wy, P.win, 0.6);
				} else if (storeys > 1 && j % 2 === 0)
					put(wx, wy, P.eave, 0.7); // balcony line
				else put(wx, wy, dx % 2 ? P.wallD : P.wall, bayer(wx, wy) < 0.3 ? 0.5 : 0);
			}
		for (let dx = 0; dx < w; dx++) put(x + dx, by, P.wallD, 0.6);
		if (row >= 0 && w >= 5 && smokers.length < 6 && hash(x, row, 904) > 0.62)
			smokers.push([x + w - 3, roofY + Math.max(0, rh - 3) - 1]);
	};
	chalet(Math.floor(C * 0.5), Math.floor(R * 0.8), 15, 3, 120, -1); // the big timber residence
	VILLAGE_ROWS.forEach(([v, u0, u1], row) => {
		for (let x = Math.floor(C * u0) + row * 3; x < C * u1; ) {
			const w = [5, 7, 7, 9][Math.floor(hash(x, row, 121) * 4)]!;
			if (hash(x, row, 122) > 0.12)
				chalet(x, Math.floor(R * v) + Math.floor(hash(x, row, 123) * 2), w, 1, 124 + row, row);
			x += w + 2 + Math.floor(hash(x, row, 125) * 3);
		}
	});
	// chimney smoke: puffs rise and lean with the wind, thinning out as they go
	smokers.forEach(([sx, sy], k) => {
		put(sx, sy, P.eave, 0.9);
		put(sx, sy - 1, P.eave, 0.9);
		for (let i = 0; i < 6; i++) {
			const life = (t * 0.00025 + i / 6 + k * 0.29) % 1;
			put(
				sx + life * 5 + Math.sin(life * 6 + i + k) * 0.8,
				sy - 2 - life * 9,
				P.smoke,
				(N ? 0.3 : 0.42) * (1 - life)
			);
		}
	});
	// road curving in from the bottom-left with a low wall
	for (let i = 0; i <= 100; i++) {
		const s = i / 100;
		const x = C * 0.4 + C * 0.12 * s * s + C * 0.02 * s;
		const y = R - R * 0.12 * s - R * 0.02;
		put(x, y, P.road, 0.3);
		put(x + 1, y, P.road, 0.3);
		if (i % 2 === 0) put(x - 1, y, P.stone, 0.5);
	}

	// ---- forest along the bottom: dense conifers with yellowing larches ----
	for (let x = 0; x < C; x++) {
		const top = Math.round(forestTop[x]!);
		for (let y = top; y < R; y++) {
			if (inCorridor(x, y)) continue;
			const hv = hash(x, y, 131);
			const c =
				hv < 0.18 ? P.forest[2] : hv < 0.27 ? P.forest[3] : y - top > 2 ? P.forest[1] : P.forest[0];
			put(x, y, c, y === top ? 0.8 : bayer(x, y) < 0.3 ? 0.45 : 0);
		}
	}
	for (let x = 1; x < C; x += 3 + Math.floor(hash(x, 0, 132) * 2)) {
		const hgt = 3 + Math.floor(hash(x, 1, 133) * 5);
		const by = Math.round(forestTop[x]!);
		if (inCorridor(x, by) || inCorridor(x, by - hgt)) continue;
		const larch = hash(x, 2, 134) < 0.25;
		for (let k = 0; k < hgt; k++) {
			const half = Math.floor(k * 0.4);
			for (let dx = -half; dx <= half; dx++)
				put(
					x + dx,
					by - hgt + k,
					larch ? P.forest[2] : dx > 0 ? P.forest[0] : P.forest[1],
					k === 0 || Math.abs(dx) === half ? 0.8 : 0.6
				);
		}
	}

	// ---- life ----
	if (!N) {
		// a hawk circling slowly over the ridge, gliding, flapping in short bursts
		const a = t * 0.00022;
		const hx = C * 0.62 + Math.cos(a) * 22;
		const hy = R * 0.24 + Math.sin(a) * 4;
		const flap = t % 9000 < 1400 ? Math.sin(t * 0.012) : 0;
		const wy = flap > 0.3 ? -1 : flap < -0.3 ? 1 : 0;
		for (const [dx, dy, wk] of HAWK_SHAPE) put(hx + dx, hy + dy + wy * wk, P.hawk, 0.8);
		put(hx - Math.sign(-Math.sin(a)), hy + 1, P.hawk, 0.6);
	} else {
		// a groomer working a traverse: headlight and a dithered beam (HDR cells), a blinking beacon
		const ph = tri(t * 0.00002);
		const dir = (t * 0.00002) % 1 < 0.5 ? 1 : -1;
		const gx = Math.round(C * 0.45 + ph * C * 0.17);
		const gy = Math.round(Math.max(rockAt(gx) + 3, R * 0.55) + Math.sin(gx * 0.08));
		for (let d = 3; d < 34; d++) {
			const x = gx - dir * d;
			if (hash(x, gy, 950) > 0.15) put(x, gy + 1, (x + gy) % 2 ? P.fold : P.track, 0);
		}
		for (let i = -2; i <= 1; i++) {
			put(gx + i * dir, gy, P.groomer, 0.9);
			put(gx + i * dir, gy + 1, P.tracks, 0.9);
		}
		put(gx - dir, gy - 1, P.groomer, 0.9);
		put(gx - 2 * dir, gy - 1, P.groomer, 0.9);
		if (t % 1600 < 500) put(gx - dir, gy - 2, P.beacon, 0.9, G_STAR, 0.6);
		put(gx + 2 * dir, gy, h("#fff4cf"), 0.9, lamp(t, 9), 1.6);
		for (let d = 2; d < 13; d++) {
			const w = Math.floor(d * 0.35);
			const fall = 1 - d / 13;
			for (let j = -w; j <= w + 1; j++) {
				const x = gx + (2 + d) * dir;
				const y = gy + j;
				if (bayer(x, y) < fall * 0.7) put(x, y, P.beam, 0, 1.6 + 1.0 * fall);
			}
		}
	}

	// ---- the copy corner stays readable: every ink dot behind the text is thinned ----
	const ink = G.inkA;
	for (let y = 0; y < R && y < copyH; y++)
		for (let x = 0; x < C && x < copyW; x++) {
			const i = y * C + x;
			ink[i] = ink[i]! * 0.45;
		}
}

// --- 1. MEADOW ---------------------------------------------------------------
// A person with a lantern and a dog by a pond, a tree, a flock, fireflies.

const MEADOW = {
	day: { hill1: h("#8cc27a"), hill2: h("#78b568"), grass: h("#7fc45a"), lanternGlow: h("#f3d9a0") },
	night: {
		hill1: h("#2f3f63"),
		hill2: h("#273553"),
		grass: h("#4f7a63"),
		lanternGlow: h("#8a6a3a"),
	},
} as const;
const TRUNK_A = h("#5a3a22");
const TRUNK_B = h("#6b4a2b");
const FIREFLY = h("#e7f28a");

function meadow(t: number): void {
	const horizon = Math.floor(ROWS * 0.7);
	const m = mode();
	const M = MEADOW[m];
	skyFill(horizon);
	stars(t, horizon);
	sunDisc(COLS - 30, 13, 8);
	clouds(t, [
		[0.15, 7, 10],
		[0.55, 11, 7],
		[0.82, 5, 12],
	]);
	// soft hills behind
	for (let x = 0; x < COLS; x++) {
		const h1 = ridge(x + 30, 9, 40, 10) + 2;
		const h2 = ridge(x, 19, 24, 7);
		const t1 = Math.floor(horizon - h1);
		const t2 = Math.floor(horizon - h2);
		for (let y = t1; y < horizon; y++) put(x, y, M.hill1, y === t1 ? 0.25 : 0);
		for (let y = t2; y < horizon; y++) put(x, y, M.hill2, y === t2 ? 0.3 : 0);
	}
	// ground
	for (let y = horizon; y < ROWS; y++) {
		const c = grad(GROUND[m], (y - horizon) / (ROWS - horizon));
		for (let x = 0; x < COLS; x++)
			put(
				x,
				y,
				c,
				y === horizon ? 0.75 : y > horizon + 1 && y % 2 === 0 && hash(x, y, 9) > 0.965 ? 0.3 : 0
			);
	}
	// pond
	const px = Math.floor(COLS * 0.3);
	const py = horizon + 5;
	const pw = 22;
	const ph = 4;
	const W = WATER[m];
	for (let y = -ph; y <= ph; y++)
		for (let x = -pw; x <= pw; x++) {
			const e = (x * x) / (pw * pw) + (y * y) / (ph * ph);
			if (e < 1) {
				const flow = Math.floor(t * 0.004 + y * 3);
				const rip = (((x + flow) % 7) + 7) % 7 < 2 && hash(x, y, 4) > 0.3;
				put(
					px + x,
					py + y,
					rip ? W[1] : W[0],
					rip ? 0.3 : 0,
					rip && m === "night" ? G_SPARKLE : false
				);
			}
		}
	// grass tufts + flowers
	for (let x = 0; x < COLS; x += 2) {
		const hh = 1 + Math.floor(hash(x, 1, 21) * 3);
		const sway = Math.sin(t * 0.002 + x * 0.18) * 0.9 + Math.sin(t * 0.0033 + x * 0.05) * 0.5;
		if (Math.abs(x - px) < pw + 2) continue;
		for (let k = 1; k <= hh; k++)
			put(x + Math.round(sway * (k / hh) * 1.6), horizon - k, M.grass, 0.55);
		if (hash(x, 2, 22) > 0.88)
			put(
				x + Math.round(sway * 1.6),
				horizon - hh - 1,
				SUN[Math.floor(hash(x, 3, 23) * 4)]!,
				0.9,
				G_FLOWER
			);
	}
	// tree with an autumn canopy
	const tx = Math.floor(COLS * 0.62);
	const top = horizon - 28;
	for (let y = top + 9; y < horizon; y++) {
		put(tx, y, TRUNK_A, 0.9);
		put(tx + 1, y, TRUNK_B, 0.9);
	}
	for (const [x0, y0, x1, y1] of [
		[tx - 2, top + 13, tx - 4, top + 11],
		[tx + 3, top + 12, tx + 5, top + 10],
	] as const) {
		put(x0, y0, TRUNK_A, 0.8);
		put(x1, y1, TRUNK_A, 0.8);
	}
	const sw = Math.sin(t * 0.0017) * 1.1;
	(
		[
			[tx + 0.5, top + 7, 9.5],
			[tx - 7, top + 11, 6],
			[tx + 9, top + 10, 6],
			[tx + 2, top + 1.5, 5],
		] as const
	).forEach(([cx, cy, r], i) =>
		disc(cx + sw * (1 - i * 0.15), cy, r, (x, y, dd) => {
			const n = hash(x, y, 30 + i);
			const edge = dd / r;
			if (n > edge * 0.5) {
				const band = clamp(Math.floor(((y - top) / 24) * 4), 0, 3);
				const flick = Math.sin(t * 0.004 + x * 0.6 + y * 0.4) > 0.7 && edge > 0.7;
				put(x + (flick ? 1 : 0), y, SUN[band]!, 0.8 - edge * 0.3);
			}
		})
	);
	for (let i = 0; i < 6; i++) {
		const life = (t * 0.00035 + i * 0.17) % 1;
		put(
			tx + 2 + Math.sin(life * 9 + i) * 7 + life * 16,
			top + 6 + life * (horizon - top - 4),
			SUN[1 + (i % 3)]!,
			0.9,
			true
		);
	}
	// person + dog near the pond
	const fr = Math.floor(t / 420) % 2;
	const bob = Math.floor(t / 840) % 2;
	const map = PERSON_MAP(t);
	sprite(PERSON[fr]!, map, px + pw + 6, horizon - 11, 0.9);
	sprite(DOG[bob]!, map, px + pw + 13, horizon - 5, 0.85);
	// lantern glow on the ground around it
	disc(px + pw + 10.5, horizon - 5, 4.5, (x, y, dd) => {
		if (hash(x, y, 50) > dd / 4.5 && filled(x, y) && !isLit(x, y)) put(x, y, M.lanternGlow, 0);
	});
	flock(t, 6, 6);
	// fireflies at night
	if (m === "night")
		for (let i = 0; i < 14; i++) {
			const fx = hash(i, 1, 60) * COLS + Math.sin(t * 0.0007 + i) * 6;
			const fy = horizon - 2 - hash(i, 2, 60) * 14 + Math.sin(t * 0.0011 + i * 2) * 2;
			const pulse = Math.sin(t * 0.004 + i * 1.7);
			if (pulse > 0.3)
				put(fx, fy, FIREFLY, 0.9, 3.0 + ((pulse - 0.3) / 0.7) * 1.9, 0.8 + pulse * 0.6);
		}
}

// --- 2. SEA ------------------------------------------------------------------
// A setting sun with rays, waves, a sailboat, a pier lamp, gulls.

const SEA = {
	day: {
		ray: SUN[1],
		reflect: SUN,
		deep: h("#2c6bc0"),
		boat: h("#fafafa"),
		pierLamp: h("#f0b840"),
	},
	night: {
		ray: h("#d9c89a"),
		reflect: SUN,
		deep: h("#101a33"),
		boat: h("#d8d2c8"),
		pierLamp: h("#ffd15c"),
	},
} as const;
const PIER = h("#5a3a22");
const POLE = h("#4a4a4a");
const MOON_GLINT = h("#e8d9ae");
const LAMP_GLOW = h("#9a7a3a");

function sea(t: number): void {
	const horizon = Math.floor(ROWS * 0.6);
	const m = mode();
	const S = SEA[m];
	const W = WATER[m];
	skyFill(horizon);
	stars(t, horizon);
	const sx = COLS - 44;
	const sy = horizon - 1;
	const R = 15;
	// rays
	for (let r = R + 3; r < R + 22; r++) {
		const n = Math.floor((2 * Math.PI * r) / 2.2);
		for (let i = 0; i < n; i++) {
			const a = (i / n) * Math.PI * 2;
			const x = sx + Math.cos(a) * r;
			const y = sy + Math.sin(a) * r * 0.92;
			if (y > horizon - 1) continue;
			const spoke = 0.5 + 0.5 * Math.cos(a * 24 + t * 0.0009 + r * 0.2);
			const fall = 1 - (r - R - 3) / 19;
			const breath = 0.7 + 0.3 * Math.sin(t * 0.0016 - r * 0.35);
			if (spoke * fall * breath > 0.42 + bayer(Math.round(x), Math.round(y)) * 0.45)
				put(x, y, S.ray, 0.35 * fall + 0.1, m === "day" ? 1.6 + 1.0 * fall * breath : false);
		}
	}
	sunDisc(sx, sy, R, horizon);
	clouds(t, [
		[0.1, 8, 12],
		[0.4, 5, 8],
	]);
	// sea
	for (let y = horizon; y < ROWS; y++) {
		const depth = (y - horizon) / (ROWS - horizon);
		const speed = 0.0018 + depth * 0.003;
		const phase = Math.floor(t * speed + y * 2.3);
		const period = 9 + Math.floor(depth * 5);
		const base = mixHex(W[0], S.deep, depth);
		const band = clamp(Math.floor((1 - depth) * 4), 0, 3);
		const halfW = R * (0.95 - depth * 0.55) + 2 * Math.sin(t * 0.002 + y);
		for (let x = 0; x < COLS; x++) {
			const on = (x + phase) % period < 3 && y % 2 === 0;
			const underSun = Math.abs(x - sx) < halfW;
			if (underSun && on)
				put(
					x,
					y,
					m === "night" ? MOON_GLINT : S.reflect[band]!,
					0.55 - depth * 0.3,
					m === "night" ? 2.2 : 3.0 - depth * 0.8
				);
			else if (on && hash(x, y, 3) > 0.45) put(x, y, W[1], 0.22 + depth * 0.1);
			else put(x, y, base, y === horizon ? 0.6 : 0);
		}
	}
	// sparkles
	for (let y = horizon + 1; y < ROWS; y++)
		for (let x = 0; x < COLS; x++)
			if (hash(x, y, 11) > 0.996 && Math.sin(t * 0.006 + hash(x, y, 12) * 20) > 0.85)
				put(x, y, WHITE, 0.9, G_SPARKLE);
	// sailboat drifting and bobbing
	const bx = Math.floor(COLS * 0.35 + Math.sin(t * 0.00025) * 6);
	const by = horizon + 6 + Math.round(Math.sin(t * 0.0021) * 1);
	sprite(BOAT, { w: S.boat, n: TRUNK_B }, bx, by - 7, 0.9);
	// pier with a lamp on the left
	const pierY = horizon + 2;
	for (let x = 0; x < 22; x++) put(x, pierY, PIER, 0.85);
	for (let x = 2; x < 22; x += 5) {
		put(x, pierY + 1, PIER, 0.7);
		put(x, pierY + 2, PIER, 0.6);
	}
	for (let y = pierY - 7; y < pierY; y++) put(20, y, POLE, 0.8);
	put(
		20,
		pierY - 8,
		S.pierLamp,
		0.9,
		m === "night" ? lamp(t, 3) : G_DAYLAMP,
		m === "night" ? 2 : 0.6
	);
	if (m === "night")
		disc(20, pierY - 8, 3, (x, y, dd) => {
			if (dd > 0.5 && hash(x, y, 70) > dd / 3) put(x, y, LAMP_GLOW, 0);
		});
	for (let i = 0; i < 3; i++)
		bird(
			((t * 0.004 * (0.6 + i * 0.2) + i * 61) % (COLS + 20)) - 10,
			8 + i * 5 + Math.sin(t * 0.002 + i) * 1.5,
			t * 0.012 + i,
			0.5
		);
}

// --- 3. MOUNTAINS ------------------------------------------------------------
// Coloured ridges by depth, a river, a cabin with smoke, pines, a hawk.

const RIDGE_C = {
	day: [h("#b7a9d6"), h("#7f87b8"), h("#3f5f6e")],
	night: [h("#4b3b6e"), h("#2e2c58"), h("#1a2238")],
} as const;
const RIDGES = [
	{ seed: 101, scale: 30, amp: 20, lift: 0.2, alpha: 0.28, speed: 0.25, snow: 5, fade: 5 },
	{ seed: 202, scale: 22, amp: 16, lift: 0.1, alpha: 0.5, speed: 0.55, snow: 3, fade: 5 },
	{ seed: 303, scale: 15, amp: 11, lift: 0.0, alpha: 0.85, speed: 1, snow: 0, fade: 6 },
] as const;
const MTN = {
	day: { snow: h("#f4f6fa"), pine: h("#1f5a3c"), smoke: h("#d8d8d8"), floor: h("#2b3d45") },
	night: { snow: h("#dfe8ff"), pine: h("#0f2a24"), smoke: h("#6f6f7a"), floor: h("#0d131c") },
} as const;
const CABIN_WALL = h("#5a3a22");
const CABIN_DOOR = h("#3b2a1a");

function mountains(t: number): void {
	const base = Math.floor(ROWS * 0.92);
	const m = mode();
	const isNight = m === "night";
	const K = MTN[m];
	const W = WATER[m];
	const pan = t * 0.0009;
	skyFill(base);
	stars(t, base * 0.7);
	sunDisc(Math.floor(COLS * 0.8), Math.floor(ROWS * 0.3), 11);
	const RC = RIDGE_C[m];
	const tops = RIDGES.map(() => new Float32Array(COLS));
	RIDGES.forEach((r, i) => {
		const lit = RC[i]!;
		const shaded = mixHex(RC[i]!, BLACK, 0.25 * 0.6);
		const row = tops[i]!;
		for (let x = 0; x < COLS; x++) {
			const xs = x + pan * r.speed * 40;
			const hgt = ridge(xs, r.seed, r.scale, r.amp);
			const top = base - Math.floor(ROWS * r.lift) - hgt;
			row[x] = top;
			const shade = Math.sin((xs / r.scale) * 2.5) > 0 ? 1 : 0.75;
			for (let y = Math.floor(top); y <= base; y++) {
				const fromTop = y - top;
				const snowy =
					r.snow > 0 &&
					fromTop < r.snow &&
					hash(Math.round(xs), y, r.seed) > (fromTop / r.snow) * 0.9;
				const dens = fromTop < 1 ? 1 : Math.max(0.05, 0.6 - fromTop / r.fade);
				const c = snowy ? K.snow : shade === 1 ? lit : shaded;
				put(
					x,
					y,
					c,
					snowy || bayer(x, y) < dens ? (snowy ? 0.95 : r.alpha * shade) : 0,
					snowy && fromTop < 2 && bayer(x, y) < 0.55 - fromTop * 0.25 ? G_SNOWCAP : false
				);
			}
		}
	});
	const front = tops[2]!;
	// pines on the front ridge
	for (let x = 6; x < COLS; x += 9) {
		const top = front[x]!;
		if (!top) continue;
		const hh = 4 + Math.floor(hash(x, 5, 88) * 3);
		for (let k = 0; k < hh; k++)
			for (let dx = -Math.floor(k / 2); dx <= Math.floor(k / 2); dx++)
				put(x + dx, top - hh + k + 1, K.pine, 0.85);
	}
	// river
	for (let y = base - 10; y < ROWS; y++) {
		const depth = (y - (base - 10)) / (ROWS - base + 10);
		const rx = COLS * 0.6 + Math.sin(y * 0.35 + 1) * 5 + depth * 8;
		const w = 1 + depth * 7;
		const flow = Math.floor(t * 0.006 + y * 0.9);
		for (let x = Math.floor(rx - w); x <= Math.ceil(rx + w); x++) {
			if (x >= 0 && x < COLS && y < front[x]! + 2 && y < base - 2) continue;
			const on = (((x - flow) % 5) + 5) % 5 < 2;
			put(x, y, on ? W[1] : W[0], on ? 0.9 : 0.45, on && isNight ? G_SPARKLE : false);
		}
	}
	// cabin with a lit window and smoke
	const cx = Math.floor(COLS * 0.3);
	const cy = Math.floor(front[clamp(cx, 0, COLS - 1)] ?? base) - 6;
	sprite(
		CABIN,
		{
			n: CABIN_WALL,
			D: CABIN_DOOR,
			y: [LANTERN, 0.9, isNight ? lamp(t, 5) : G_DAYLAMP, isNight ? 1.6 : 0],
		},
		cx,
		cy,
		0.9
	);
	for (let i = 0; i < 5; i++) {
		const life = (t * 0.0005 + i * 0.2) % 1;
		put(cx + 5 + Math.sin(life * 7 + i) * 1.5, cy - 1 - life * 9, K.smoke, 0.4 * (1 - life));
	}
	for (let x = 0; x < COLS; x++) put(x, base + 1, K.floor, 0.6);
	const a = t * 0.0006;
	bird(COLS * 0.5 + Math.cos(a) * 24, ROWS * 0.28 + Math.sin(a) * 6, t * 0.008, 0.7);
}

// --- registry ----------------------------------------------------------------

const SCENES: Record<PixelSceneName, (t: number) => void> = { alpine, meadow, sea, mountains };
const PAINTERS = new Map<PixelSceneName, ScenePainter>();

/** The painter for a scene; an unknown name falls back to alpine. */
export function getScenePainter(name: PixelSceneName): ScenePainter {
	const key: PixelSceneName = Object.prototype.hasOwnProperty.call(SCENES, name) ? name : "alpine";
	let p = PAINTERS.get(key);
	if (!p) {
		const fn = SCENES[key];
		p = (t, g, isNight) => {
			G = g;
			COLS = g.cols;
			ROWS = g.rows;
			NIGHT = isNight;
			g.copyW = COLS * COPY_W;
			g.copyH = ROWS * COPY_H;
			if (COLS > 0 && ROWS > 0) fn(t);
		};
		PAINTERS.set(key, p);
	}
	return p;
}
