/**
 * Regression tests for the artifact gates' own logic. Run with
 * `node --test scripts/dist-gates.test.mjs` from `vue/` (vitest's include is `src/**` only).
 * The dist-reading cases skip when `dist/` has not been built.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { HOLLOW, componentEntries, isComponent, sweep } from "./dist-sweep.mjs";
import { declaredExports } from "./declared-exports.mjs";

const root = new URL("../", import.meta.url);
const built = existsSync(new URL("dist/index.js", root));
const vue = { createSSRApp, h, renderToString };

test("isComponent rejects capitalised data exports and keeps components", () => {
	const SOUND_CUES = { tap: { freq: 440 }, pop: { freq: 880 } };
	assert.equal(isComponent(SOUND_CUES), false);
	assert.equal(isComponent(Symbol("KEY")), false);
	assert.equal(isComponent(null), false);
	assert.equal(isComponent(defineComponent({ render: () => h("i") })), true);
	assert.equal(isComponent({ setup: () => () => h("i") }), true);
	assert.equal(
		isComponent(() => h("i")),
		true
	);
});

test("componentEntries keeps both halves of a name the two barrels share", () => {
	const rootButton = defineComponent({ render: () => h("button", "root") });
	const camButton = defineComponent({ render: () => h("button", "cam") });
	const entries = componentEntries({
		root: { Button: rootButton, SOUND_CUES: {}, cn: () => "" },
		cameleon: { Button: camButton },
	});
	assert.deepEqual(
		entries.map(([key]) => key),
		["root:Button", "cameleon:Button"]
	);
	assert.equal(entries[0][1], rootButton);
	assert.equal(entries[1][1], camButton);
});

test("sweep counts a hollow render as not rendered", async () => {
	const ok = defineComponent({ render: () => h("span", "ok") });
	const result = await sweep(
		[
			["root:Ok", ok],
			["root:DATA", { some: "table" }],
			[
				"root:Throws",
				defineComponent({
					setup: () => {
						throw new Error("needs props");
					},
				}),
			],
		],
		vue
	);
	assert.deepEqual(result.rendered, ["root:Ok"]);
	assert.deepEqual(result.hollow, ["root:DATA"]);
	assert.deepEqual(result.threw, ["root:Throws"]);
	assert.ok(HOLLOW.test("Component is missing template or render function"));
});

test("declaredExports follows export-star chains in the built barrel", { skip: !built }, () => {
	const names = declaredExports(fileURLToPath(new URL("dist/index.d.ts", root)));
	assert.ok(names.includes("cn"));
	// Both reach the entry only through `export * from "./components/marquee/index.js"`.
	assert.ok(names.includes("Marquee"));
	assert.ok(names.includes("MarqueeProps"));
	const cam = declaredExports(fileURLToPath(new URL("dist/cameleon/index.d.ts", root)));
	assert.ok(cam.includes("Button"));
});

test("the dist-names sentinel is live once Marquee is ported", { skip: !built }, () => {
	const out = execFileSync("node", ["scripts/check-dist-names.mjs"], {
		cwd: fileURLToPath(root),
		encoding: "utf8",
	});
	assert.doesNotMatch(out, /sentinel pending/);
	assert.match(out, /sentinel Marquee ships verbatim/);
});
