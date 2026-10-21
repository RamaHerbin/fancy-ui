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
	STATE_NAMES,
	entryStatusForState,
	findStateGaps,
	parseShotName,
	planStateItems,
	stateShotName,
	validateStates,
} from "./states.mjs";

const hintsDir = join(dirname(fileURLToPath(import.meta.url)), "hints");
const readHint = (slug) => JSON.parse(readFileSync(join(hintsDir, `${slug}.json`), "utf8"));
const FIVE = ["dialog", "select", "input", "tabs", "tooltip"];

test("the three states are open, focus and long", () => {
	assert.deepEqual(STATE_NAMES, ["open", "focus", "long"]);
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
		assert.deepEqual(Object.keys(hint.states).sort(), [...STATE_NAMES].sort());
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
		assert.equal(items.length, 3 * 2 * 3);
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
