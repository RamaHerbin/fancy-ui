/**
 * Interaction states for the parity bench: a component photographed open,
 * with keyboard focus on its primary control, or holding content too long for
 * it, on all three stages.
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

export const STATE_NAMES = ["open", "focus", "long"];
export const DEFAULT_STATE_MOMENTS = [0];
/** Fake-clock budget for a state's animations to run out, and the step. */
const SETTLE_MAX_MS = 5000;
const SETTLE_STEP_MS = 50;

const STEP_KINDS = ["click", "hover", "focus", "press", "type", "wait"];
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

/** Throws on a malformed `states` block, naming the slug and state. */
export function validateStates(slug, states) {
	if (!states || typeof states !== "object") throw new Error(`${slug}: "states" must be an object`);
	for (const [name, spec] of Object.entries(states)) {
		const where = `${slug}@${name}`;
		if (!STATE_NAMES.includes(name))
			throw new Error(`${where}: unknown state (${STATE_NAMES.join(", ")})`);
		for (const [i, step] of (spec.steps ?? []).entries()) {
			const kinds = Object.keys(step);
			if (kinds.length !== 1 || !STEP_KINDS.includes(kinds[0]))
				throw new Error(`${where}: unknown step #${i} ${JSON.stringify(step)}`);
			if (TARGET_STEPS.includes(kinds[0])) checkTarget(`${where} step #${i}`, step[kinds[0]]);
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
	const states = hint.states;
	if (!states || hint.skip) return { items, errors };
	try {
		validateStates(slug, states);
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
