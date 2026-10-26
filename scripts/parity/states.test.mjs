/**
 * Unit tests for the interaction-state layer of the parity bench.
 *
 *   node --test scripts/parity/
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
	CLOSE_MOMENTS,
	STATE_NAMES,
	entryStatusForState,
	findStateGaps,
	parseShotName,
	planStateItems,
	resolveStates,
	stateShotName,
	validateStates,
} from "./states.mjs";

const hintsDir = join(dirname(fileURLToPath(import.meta.url)), "hints");
const readHint = (slug) => JSON.parse(readFileSync(join(hintsDir, `${slug}.json`), "utf8"));
const FIVE = ["dialog", "select", "input", "tabs", "tooltip"];

test("the states are open, close, focus, long, plus idle, copied, failed and action", () => {
	assert.deepEqual(STATE_NAMES, [
		"open",
		"close",
		"focus",
		"long",
		"idle",
		"copied",
		"failed",
		"action",
	]);
});

test("a close state is the open steps, a settle and Escape, shot from the first frame", () => {
	const open = {
		steps: [{ click: { role: "button", name: "Go" } }],
		expect: [{ role: "dialog", in: "page" }],
	};
	const states = { open, close: { from: "open", expect: [{ role: "button", name: "Go" }] } };
	validateStates("x", states);
	const { close } = resolveStates("x", states);
	assert.deepEqual(close.steps, [...open.steps, { settle: true }, { press: "Escape" }]);
	assert.deepEqual(close.moments, [0, 50, 100, 150]);
	assert.deepEqual(CLOSE_MOMENTS, close.moments);
	assert.equal(close.noSettle, true);
	assert.deepEqual(close.expect, [{ role: "button", name: "Go" }]);
	const { items, errors } = planStateItems({
		slug: "x",
		hint: { states },
		fws: ["svelte"],
		themes: ["light"],
		wanted: ["close"],
	});
	assert.deepEqual(errors, []);
	assert.equal(items[0].noSettle, true);
	assert.deepEqual(items[0].moments, [0, 50, 100, 150]);
});

test("a close state needs a source state and its own expectation", () => {
	assert.throws(
		() => validateStates("x", { close: { from: "open", expect: [{ css: "a" }] } }),
		/must name another state/
	);
	assert.throws(
		() => validateStates("x", { open: { expect: [{ css: "a" }] }, close: { from: "open" } }),
		/expect/
	);
});

test("dialog, popover, dropdown-menu, tooltip, sheet and drawer define a close state", () => {
	for (const slug of ["dialog", "popover", "dropdown-menu", "tooltip", "sheet", "drawer"]) {
		const hint = readHint(slug);
		validateStates(slug, hint.states);
		const close = resolveStates(slug, hint.states).close;
		assert.ok(close, `${slug} has no close state`);
		assert.deepEqual(close.steps.slice(-2), [{ settle: true }, { press: "Escape" }]);
		assert.deepEqual(close.steps.slice(0, -2), hint.states.open.steps);
	}
});

test("a scroll step validates with a numeric y and an optional target", () => {
	const ok = (scroll) => ({ open: { steps: [{ scroll }], expect: [{ css: "a" }] } });
	validateStates("x", ok({ y: 300 }));
	validateStates("x", ok({ y: -40, target: { css: ".list" } }));
	assert.throws(() => validateStates("x", ok({})), /numeric "y"/);
	assert.throws(() => validateStates("x", ok({ y: "300" })), /numeric "y"/);
	assert.throws(() => validateStates("x", ok({ y: 10, target: {} })), /target/);
});

test("the click-state hints fire the signature move and shoot 0/80/300/600/1200", () => {
	for (const slug of [
		"status-morph",
		"pagination",
		"stepper",
		"datamosh-transition",
		"text-roll",
	]) {
		const hint = readHint(slug);
		validateStates(slug, hint.states);
		const action = hint.states.action;
		assert.ok(
			action.steps.some((s) => s.click),
			`${slug}@action has no click`
		);
		assert.deepEqual(action.moments, [0, 80, 300, 600, 1200]);
		assert.equal(action.noSettle, true);
	}
});

test("a clipboard step validates with ok or denied only", () => {
	const ok = (mode) => ({
		copied: {
			steps: [{ clipboard: mode }, { click: { role: "button", name: "Copy" } }],
			expect: [{ role: "button", name: "Copied" }],
		},
	});
	validateStates("x", ok("ok"));
	validateStates("x", ok("denied"));
	assert.throws(() => validateStates("x", ok("maybe")), /clipboard/);
});

test("copy-button defines idle, copied and failed, each asserting its outcome", () => {
	const hint = readHint("copy-button");
	assert.deepEqual(Object.keys(hint.states).sort(), ["copied", "failed", "idle"]);
	validateStates("copy-button", hint.states);
	const names = Object.fromEntries(
		Object.entries(hint.states).map(([k, v]) => [k, v.expect[0].name])
	);
	assert.deepEqual(names, { idle: "Copy", copied: "Copied", failed: "Copy failed" });
	assert.deepEqual(hint.states.copied.steps[0], { clipboard: "ok" });
	assert.deepEqual(hint.states.failed.steps[0], { clipboard: "denied" });
	for (const name of ["copied", "failed"]) {
		const item = resolveStates("copy-button", hint.states)[name];
		assert.equal(item.noSettle, true, `copy-button@${name} resolves with noSettle`);
		assert.deepEqual(item.moments, [0, 80, 300, 600, 1200]);
	}
});

test("toast defines an action state and a long-description state", () => {
	const hint = readHint("toast");
	assert.deepEqual(Object.keys(hint.states).sort(), ["action", "long"]);
	validateStates("toast", hint.states);
	assert.equal(hint.states.action.variant, "action");
	assert.equal(hint.states.long.variant, "long");
	assert.ok(hint.states.action.expect.some((c) => c.name === "Undo"));
	assert.ok(hint.states.long.expect.some((c) => c.name === "Download"));
});

test("every toast expectation lies inside the stage, so a toast off the shot fails", () => {
	const hint = readHint("toast");
	for (const [name, spec] of Object.entries(hint.states)) {
		assert.ok(spec.expect.length >= 2, `toast@${name} checks the panel and its action`);
		for (const check of spec.expect)
			assert.equal(check.inStage, true, `toast@${name} expects ${JSON.stringify(check)} inStage`);
	}
});

test("state shot names round-trip and stay apart from the rest and hover passes", () => {
	assert.equal(stateShotName("dark", 600, "open"), "dark-600@open.png");
	assert.deepEqual(parseShotName("dark-600@open.png"), { theme: "dark", t: "600", state: "open" });
	assert.deepEqual(parseShotName("light-0-hover.png"), {
		theme: "light",
		t: "0-hover",
		state: null,
	});
	assert.equal(parseShotName("thumb.png"), null);
});

for (const slug of FIVE) {
	test(`${slug} defines open, focus and long states that validate`, () => {
		const hint = readHint(slug);
		assert.ok(hint.states, `${slug} hint has no states`);
		assert.deepEqual(
			Object.keys(hint.states)
				.filter((k) => k !== "close")
				.sort(),
			["focus", "long", "open"]
		);
		validateStates(slug, hint.states);
		assert.equal(hint.states.long.variant, "long", `${slug} long state needs the long variant`);
		for (const [name, spec] of Object.entries(hint.states))
			assert.ok(spec.expect?.length, `${slug}/${name} must assert it reached the state`);
	});

	test(`${slug} plans one item per framework, theme and state`, () => {
		const { items, errors } = planStateItems({
			slug,
			hint: readHint(slug),
			fws: ["svelte", "react", "vue"],
			themes: ["light", "dark"],
			wanted: "all",
		});
		assert.deepEqual(errors, []);
		assert.equal(items.length, 3 * 2 * Object.keys(readHint(slug).states).length);
		for (const item of items) assert.ok(item.moments.length > 0);
	});
}

test("validateStates rejects unknown states, steps and targets", () => {
	assert.throws(
		() => validateStates("x", { hovered: { expect: [{ css: "a" }] } }),
		/unknown state/
	);
	assert.throws(
		() => validateStates("x", { open: { steps: [{ jump: true }], expect: [{ css: "a" }] } }),
		/unknown step/
	);
	assert.throws(
		() => validateStates("x", { open: { steps: [{ click: {} }], expect: [{ css: "a" }] } }),
		/target/
	);
	assert.throws(() => validateStates("x", { open: { steps: [] } }), /expect/);
});

test("an explicitly requested state a slug does not define is an error, not a silent skip", () => {
	const { items, errors } = planStateItems({
		slug: "x",
		hint: { states: { open: { expect: [{ css: "a" }] } } },
		fws: ["svelte"],
		themes: ["light"],
		wanted: ["open", "long"],
	});
	assert.equal(items.length, 1);
	assert.deepEqual(errors, ["x@long: state not defined in hints/x.json"]);
});

test("a slug with no states plans nothing and reports nothing", () => {
	const { items, errors } = planStateItems({
		slug: "meteors",
		hint: { moments: [0] },
		fws: ["svelte"],
		themes: ["light"],
		wanted: "all",
	});
	assert.deepEqual(items, []);
	assert.deepEqual(errors, []);
});

test("a state capture with no scenario counts as an error", () => {
	assert.deepEqual(entryStatusForState({ status: "missing" }, "dialog", "long"), {
		status: "error",
		error: "dialog@long: no scenario on this stage",
	});
	const empty = entryStatusForState({ status: "ok", files: [] }, "dialog", "open");
	assert.equal(empty.status, "error");
	assert.equal(empty.error, "dialog@open: no shot written");
	assert.equal(entryStatusForState({ status: "ok", files: ["a"] }, "dialog", "open").status, "ok");
});

test("findStateGaps names every state shot one framework has and another lacks", () => {
	const shots = {
		svelte: ["dialog/light-600@open.png", "dialog/light-600@long.png", "dialog/light-0.png"],
		react: ["dialog/light-600@open.png"],
		vue: ["dialog/light-600@open.png", "dialog/light-600@long.png", "dialog/light-600@focus.png"],
	};
	assert.deepEqual(
		findStateGaps(shots),
		[
			"react dialog/light-600@long.png (missing)",
			"svelte dialog/light-600@focus.png (missing)",
			"react dialog/light-600@focus.png (missing)",
		].sort()
	);
});
