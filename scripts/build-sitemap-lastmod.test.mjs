import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	SHARED_COMPONENT_SOURCES,
	componentSources,
	isUnder,
	touches,
	newest,
	parsePorcelain,
} from "./build-sitemap-lastmod.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("componentSources includes own folders, ports and the shared template", () => {
	const ports = new Map([["marquee", ["react/src/marquee", "vue/src/marquee"]]]);
	const sources = componentSources("marquee", ports);
	assert.ok(sources.includes("src/lib/fancy-ui/marquee"));
	assert.ok(sources.includes("src/lib/components/docs/examples/marquee"));
	assert.ok(sources.includes("react/src/marquee"));
	assert.ok(sources.includes("vue/src/marquee"));
	assert.ok(sources.includes("src/routes/docs/components/[slug]/+page.svelte"));
	for (const shared of SHARED_COMPONENT_SOURCES) assert.ok(sources.includes(shared));
});

test("componentSources without ports still carries the shared template", () => {
	const sources = componentSources("accordion");
	assert.equal(sources.length, 2 + SHARED_COMPONENT_SOURCES.length);
});

test("every shared component source exists", () => {
	for (const p of SHARED_COMPONENT_SOURCES) assert.ok(existsSync(join(ROOT, p)), p);
});

test("isUnder matches the path itself and descendants, not siblings by prefix", () => {
	assert.ok(isUnder("src/lib/fancy-ui/marquee", "src/lib/fancy-ui/marquee"));
	assert.ok(isUnder("src/lib/fancy-ui/marquee/Marquee.svelte", "src/lib/fancy-ui/marquee/"));
	assert.ok(!isUnder("src/lib/fancy-ui/marquee-3d/index.ts", "src/lib/fancy-ui/marquee"));
	assert.ok(
		isUnder(
			"src/routes/docs/components/[slug]/+page.svelte",
			"src/routes/docs/components/[slug]/+page.svelte"
		)
	);
});

test("touches reports a pending change behind any source", () => {
	const sources = componentSources("marquee");
	assert.ok(touches(sources, ["src/routes/docs/components/[slug]/+page.svelte"]));
	assert.ok(touches(sources, ["src/lib/fancy-ui/marquee/Marquee.svelte"]));
	assert.ok(!touches(sources, ["src/lib/fancy-ui/accordion/Accordion.svelte"]));
	assert.ok(!touches(sources, []));
});

test("newest keeps the later date and tolerates nulls", () => {
	assert.equal(newest("2026-10-10", "2026-10-22"), "2026-10-22");
	assert.equal(newest("2026-10-22", "2026-10-10"), "2026-10-22");
	assert.equal(newest(null, "2026-10-10"), "2026-10-10");
	assert.equal(newest("2026-10-10", null), "2026-10-10");
	assert.equal(newest(null, null), null);
});

test("parsePorcelain reads modified, untracked and renamed entries", () => {
	const raw =
		" M src/routes/+page.svelte\0?? src/lib/components/home/New.svelte\0R  src/new.ts\0src/old.ts\0";
	assert.deepEqual(parsePorcelain(raw), [
		"src/routes/+page.svelte",
		"src/lib/components/home/New.svelte",
		"src/new.ts",
	]);
	assert.deepEqual(parsePorcelain(""), []);
});
