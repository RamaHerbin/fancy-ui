/**
 * Interaction states for the parity bench: a component photographed open,
 * with keyboard focus on its primary control, holding content too long for
 * it, or in a named outcome (idle, copied, failed, action), on all three
 * stages.
 *
 * A state is declared in scripts/parity/hints/<slug>.json:
 *
 *   "states": {
 *     "open":  { "steps": [...], "expect": [...], "moments"?: [600] },
 *     "focus": { ... },
 *     "long":  { "variant": "long", ... }
 *   }
 *
 * - variant: the stage renders the `<slug>--<variant>` scenario instead of
 *   the base demo (React and Vue: scenarios/<slug>--<variant>.tsx|.vue,
 *   Svelte: src/routes/_parity/[slug]/variants/<slug>--<variant>.svelte).
 * - steps, run in order once the stage is ready, every wait on the frozen
 *   clock:
 *     { "click": target }   pointer onto the centre of the target, 50 ms, click
 *     { "hover": target }   pointer moved onto the centre of the target
 *     { "focus": target }   keyboard focus (focus-visible) on the target
 *     { "press": "Tab" }    one key press
 *     { "type": "text" }    typed text, into whatever has focus
 *     { "wait": 600 }       fake-clock milliseconds
 *     { "clipboard": "ok" | "denied" }  the next clipboard write resolves or
 *                           is rejected (copy-button: idle, copied, failed)
 *     { "scroll": { "y": 300, "target"?: target } }  scroll the stage (or the
 *                           target) by y px, then one 16 ms frame on the fake
 *                           clock so scroll handlers run
 *     { "settle": true }    run the fake clock until every finite animation
 *                           has ended (what a state does after its steps)
 * - close: the exit of a panel, photographed from its first frame. It borrows
 *   another state's steps:
 *     "close": { "from": "open", "expect": [...], "moments"?: [0, 50, 100, 150] }
 *   resolves to the `open` steps, a settle (the entrance must be over) and
 *   { "press": "Escape" }, with moments default 0/50/100/150 counted from the
 *   Escape, and no settling afterwards (the exit is what is being shot).
 *   "expect" is what is still true while it closes (typically the trigger).
 * - expect: what must hold at every shot, or the item fails. Each entry is a
 *   target plus optional checks: "visible" (default true), "focusVisible"
 *   (it is the focused element and matches :focus-visible), "overflow" (its
 *   content is larger than its box on some axis), "inStage" (its box lies
 *   inside the 800×500 stage, so a panel placed off its trigger fails instead
 *   of dropping out of the shot on every stage alike).
 * - target: { "role", "name"?, "selected"? } (accessible role and exact
 *   name) or { "css" }, scoped to the stage box unless "in": "page" (for
 *   panels portalled out of it), with an optional "nth". Without "nth" a
 *   target must match exactly one element.
 * - moments: fake-clock ms after the state settled, default [0]. Settled
 *   means every finite animation has run to its end, checked twice with a
 *   real-time pause between, so a transition the browser starts a frame late
 *   cannot land a shot mid-entrance on one stage and not another. A state
 *   that is still animating after 5 s of fake time is an error.
 *
 * Unlike the rest pass, a state never degrades quietly: a missing scenario, a
 * target that does not resolve, an expectation that does not hold or a shot
 * that was not written is an error, and capture.mjs exits non-zero naming
 * <slug>@<state>.
 */

export const STATE_NAMES = ["open", "close", "focus", "long", "idle", "copied", "failed", "action"];
export const DEFAULT_STATE_MOMENTS = [0];
/** A close state is a start-phase capture of the exit. */
export const CLOSE_MOMENTS = [0, 50, 100, 150];
/** Fake-clock budget for a state's animations to run out, and the step. */
const SETTLE_MAX_MS = 5000;
const SETTLE_STEP_MS = 50;

const STEP_KINDS = [
	"click",
	"hover",
	"focus",
	"press",
	"type",
	"wait",
	"clipboard",
	"scroll",
	"settle",
];
const CLIPBOARD_MODES = ["ok", "denied"];
const TARGET_STEPS = ["click", "hover", "focus"];

/** `<theme>-<t>@<state>.png`: the `@` keeps state shots apart from `-hover` ones. */
export function stateShotName(theme, t, state) {
	return `${theme}-${t}@${state}.png`;
}

/** Inverse of the shot naming, for both rest/hover and state shots. */
export function parseShotName(name) {
	const m = name.match(/^(light|dark)-(.+?)(?:@([a-z-]+))?\.png$/);
	if (!m) return null;
	return { theme: m[1], t: m[2], state: m[3] ?? null };
}

function checkTarget(where, target) {
	if (!target || typeof target !== "object" || (!target.role && !target.css))
		throw new Error(`${where}: a target needs "role" or "css"`);
	if (target.in && !["stage", "page"].includes(target.in))
		throw new Error(`${where}: target "in" must be "stage" or "page"`);
}

/**
 * Expands `"close": { "from": "<state>" }` into a full state: the source
 * state's steps, a settle, Escape; moments 0/50/100/150; `noSettle` so the
 * exit is not run out before the first shot. Other states pass through.
 */
export function resolveStates(slug, states) {
	if (!states || typeof states !== "object" || !states.close?.from) return states;
	const { from, ...rest } = states.close;
	const source = states[from];
	if (!source || source.from)
		throw new Error(`${slug}@close: "from" must name another state of the hint ("${from}")`);
	return {
		...states,
		close: {
			...(source.variant ? { variant: source.variant } : {}),
			steps: [...(source.steps ?? []), { settle: true }, { press: "Escape" }],
			moments: CLOSE_MOMENTS,
			...rest,
			noSettle: true,
		},
	};
}

/** Throws on a malformed `states` block, naming the slug and state. */
export function validateStates(slug, rawStates) {
	if (!rawStates || typeof rawStates !== "object")
		throw new Error(`${slug}: "states" must be an object`);
	const states = resolveStates(slug, rawStates);
	for (const [name, spec] of Object.entries(states)) {
		const where = `${slug}@${name}`;
		if (!STATE_NAMES.includes(name))
			throw new Error(`${where}: unknown state (${STATE_NAMES.join(", ")})`);
		for (const [i, step] of (spec.steps ?? []).entries()) {
			const kinds = Object.keys(step);
			if (kinds.length !== 1 || !STEP_KINDS.includes(kinds[0]))
				throw new Error(`${where}: unknown step #${i} ${JSON.stringify(step)}`);
			if (TARGET_STEPS.includes(kinds[0])) checkTarget(`${where} step #${i}`, step[kinds[0]]);
			if (kinds[0] === "scroll") {
				const { y, target } = step.scroll ?? {};
				if (!Number.isFinite(y)) throw new Error(`${where} step #${i}: scroll needs a numeric "y"`);
				if (target) checkTarget(`${where} step #${i}`, target);
			}
			if (kinds[0] === "clipboard" && !CLIPBOARD_MODES.includes(step.clipboard))
				throw new Error(`${where}: clipboard step must be one of ${CLIPBOARD_MODES.join(", ")}`);
		}
		if (!Array.isArray(spec.expect) || spec.expect.length === 0)
			throw new Error(
				`${where}: "expect" must list at least one check, or a failed interaction would pass`
			);
		for (const [i, check] of spec.expect.entries()) checkTarget(`${where} expect #${i}`, check);
		if (spec.moments && !spec.moments.every((t) => Number.isFinite(t) && t >= 0))
			throw new Error(`${where}: bad moments`);
	}
}

/**
 * The capture items for one slug's states. `wanted` is "all" (every state the
 * hint defines) or a list of names; a listed name the hint lacks is an error.
 */
export function planStateItems({ slug, hint, fws, themes, wanted }) {
	const items = [];
	const errors = [];
	if (!hint.states || hint.skip) return { items, errors };
	let states;
	try {
		validateStates(slug, hint.states);
		states = resolveStates(slug, hint.states);
	} catch (err) {
		return { items, errors: [err.message] };
	}
	const names = wanted === "all" ? Object.keys(states) : wanted;
	for (const state of names) {
		const spec = states[state];
		if (!spec) {
			errors.push(`${slug}@${state}: state not defined in hints/${slug}.json`);
			continue;
		}
		for (const fw of fws)
			for (const theme of themes)
				items.push({
					fw,
					slug,
					theme,
					state,
					spec,
					moments: spec.moments ?? DEFAULT_STATE_MOMENTS,
					noSettle: Boolean(spec.noSettle),
				});
	}
	return { items, errors };
}

/** A state item is never "missing": a scenario that is not there fails. */
export function entryStatusForState(entry, slug, state) {
	if (entry.status === "missing")
		return { ...entry, status: "error", error: `${slug}@${state}: no scenario on this stage` };
	if (entry.status === "ok" && !entry.files?.length)
		return { ...entry, status: "error", error: `${slug}@${state}: no shot written` };
	return entry;
}

/**
 * Every state shot (`<slug>/<theme>-<t>@<state>.png`) that some framework
 * has and another lacks, as "<fw> <path> (missing)" lines.
 * `shots` maps a framework to its shot paths relative to shots/<fw>.
 */
export function findStateGaps(shots) {
	const fws = Object.keys(shots);
	const all = new Set();
	for (const fw of fws)
		for (const rel of shots[fw]) if (parseShotName(rel.split("/").pop())?.state) all.add(rel);
	const gaps = [];
	for (const rel of all)
		for (const fw of fws) if (!shots[fw].includes(rel)) gaps.push(`${fw} ${rel} (missing)`);
	return gaps.sort();
}

// --- browser side (Playwright) ----------------------------------------------

function describe(target) {
	if (target.css) return `css ${target.css}`;
	return `${target.role}${target.name ? ` "${target.name}"` : ""}${target.selected != null ? ` selected=${target.selected}` : ""}`;
}

function locate(page, stage, target) {
	const root = target.in === "page" ? page : stage;
	let loc = target.css
		? root.locator(target.css)
		: root.getByRole(target.role, {
				...(target.name != null ? { name: target.name, exact: true } : {}),
				...(target.selected != null ? { selected: target.selected } : {}),
			});
	if (target.nth != null) loc = loc.nth(target.nth);
	return loc;
}

/** The single element a target names, or an error saying why not. */
async function resolve(page, stage, target, where) {
	const loc = locate(page, stage, target);
	const n = await loc.count();
	if (target.nth == null && n !== 1)
		throw new Error(`${where}: ${describe(target)} matched ${n} element(s), expected 1`);
	if (target.nth != null && n === 0)
		throw new Error(`${where}: ${describe(target)} matched nothing`);
	return target.nth == null ? loc : loc.first();
}

async function centre(loc, where, target) {
	// boundingBox, not locator.click: actionability waits poll on animation
	// frames, which the frozen clock never delivers.
	const box = await loc.boundingBox();
	if (!box || box.width === 0 || box.height === 0)
		throw new Error(`${where}: ${describe(target)} has no box`);
	return [box.x + box.width / 2, box.y + box.height / 2];
}

/** Runs a state's steps. Waits go through the fake clock. */
export async function runSteps(page, stage, slug, state, steps) {
	for (const [i, step] of (steps ?? []).entries()) {
		const where = `${slug}@${state} step #${i}`;
		const [kind] = Object.keys(step);
		const arg = step[kind];
		if (kind === "click") {
			const at = await centre(await resolve(page, stage, arg, where), where, arg);
			await page.mouse.move(...at, { steps: 6 });
			// Vue drops an event whose time is not later than the moment its
			// listener was attached; on a frozen clock both read the same, so
			// the clock moves on before the press, on every stage alike.
			await page.clock.runFor(50);
			await page.mouse.click(...at);
		} else if (kind === "hover") {
			const at = await centre(await resolve(page, stage, arg, where), where, arg);
			await page.mouse.move(...at, { steps: 12 });
		} else if (kind === "focus") {
			const loc = await resolve(page, stage, arg, where);
			// A modifier press marks the last interaction as keyboard, so the
			// browser's focus-visible heuristic treats the focus as a keyboard one.
			await page.keyboard.press("Shift");
			await loc.evaluate((el) => el.focus({ focusVisible: true }));
		} else if (kind === "press") await page.keyboard.press(arg);
		else if (kind === "type") await page.keyboard.type(arg);
		else if (kind === "wait") await page.clock.runFor(arg);
		else if (kind === "settle") await settle(page, slug, state);
		else if (kind === "scroll") {
			const { y, target } = arg;
			const loc = target ? await resolve(page, stage, target, where) : stage;
			// Element.scrollBy on the stage or target; the window as a fallback
			// when nothing in the stage scrolls.
			await loc.evaluate((el, dy) => {
				const before = el.scrollTop;
				el.scrollBy({ top: dy, behavior: "instant" });
				if (el.scrollTop === before) window.scrollBy({ top: dy, behavior: "instant" });
			}, y);
			// One frame on the fake clock: scroll-driven handlers and rAF loops run.
			await page.clock.runFor(16);
		} else if (kind === "clipboard")
			// Headless pages have no reliable clipboard permission: the write
			// is replaced so the outcome is the same on every stage.
			await page.evaluate((mode) => {
				const writeText = () =>
					mode === "ok"
						? Promise.resolve()
						: Promise.reject(new DOMException("denied", "NotAllowedError"));
				Object.defineProperty(navigator, "clipboard", {
					value: { writeText },
					configurable: true,
				});
			}, arg);
	}
}

/**
 * Moves the fake clock until no finite animation is left running. Two quiet
 * checks in a row, a real pause apart: style changes made by the steps can
 * create their transitions on the browser's next real frame.
 */
export async function settle(page, slug, state) {
	let quiet = 0;
	for (let spent = 0; spent <= SETTLE_MAX_MS; spent += SETTLE_STEP_MS) {
		await new Promise((r) => setTimeout(r, 30));
		const pending = await page.evaluate(() => window.__parityPending());
		quiet = pending === 0 ? quiet + 1 : 0;
		if (quiet >= 2) return spent;
		await page.clock.runFor(SETTLE_STEP_MS);
	}
	throw new Error(`${slug}@${state}: still animating after ${SETTLE_MAX_MS} ms`);
}

/** Throws unless every expectation of the state holds right now. */
export async function checkExpect(page, stage, slug, state, expect) {
	for (const [i, check] of expect.entries()) {
		const where = `${slug}@${state} expect #${i}`;
		const loc = await resolve(page, stage, check, where);
		if (check.visible !== false) await centre(loc, where, check);
		if (check.inStage) {
			const [box, frame] = [await loc.boundingBox(), await stage.boundingBox()];
			const inside =
				box &&
				frame &&
				box.x >= frame.x - 0.5 &&
				box.y >= frame.y - 0.5 &&
				box.x + box.width <= frame.x + frame.width + 0.5 &&
				box.y + box.height <= frame.y + frame.height + 0.5;
			if (!inside) throw new Error(`${where}: ${describe(check)} lies outside the stage box`);
		}
		if (check.focusVisible) {
			const ok = await loc.evaluate(
				(el) => el === document.activeElement && el.matches(":focus-visible")
			);
			if (!ok) throw new Error(`${where}: ${describe(check)} is not focus-visible`);
		}
		if (check.overflow) {
			const ok = await loc.evaluate(
				(el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1
			);
			if (!ok) throw new Error(`${where}: ${describe(check)} does not overflow`);
		}
	}
}
