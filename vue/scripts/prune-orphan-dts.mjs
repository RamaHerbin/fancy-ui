// Prune orphan declarations under dist/internals/.
//
// `vue-tsc -p tsconfig.build.json` emits a declaration for EVERY module under
// src/, while Vite's library build only emits the modules reachable from the
// two entries. Mid-campaign, an internal module that no ported component
// imports yet ends up with a `.d.ts` and no runtime sibling — a declaration
// that types an import which cannot load. Internals are never a public import
// path (they are not exported from either barrel), so the honest tarball omits
// those declarations until a component pulls the module into the graph.
//
// A declaration survives when it is public (outside dist/internals/), has its
// runtime module, is types-only (ai-types, motion/types — no `.js` is ever
// expected), or is referenced by a survivor: a public type aggregate such as
// motion/types.d.ts re-exports types from modules Rollup tree-shook, and those
// declarations must stay for the reference check in check-dist-shape.mjs.
//
// Scope is deliberately dist/internals/ ONLY: an orphan anywhere else
// (components, sound, cameleon) is a real packaging bug and stays for
// check-dist-shape.mjs to fail on.
import { readdirSync, statSync, existsSync, rmSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const dist = new URL("../dist/", import.meta.url).pathname.replace(/\/$/, "");
const root = join(dist, "internals");
if (!existsSync(root)) {
	console.log("✅ orphan d.ts: no dist/internals/ yet, nothing to prune.");
	process.exit(0);
}

function walk(dir, out = []) {
	for (const name of readdirSync(dir)) {
		const full = join(dir, name);
		if (statSync(full).isDirectory()) walk(full, out);
		else if (name.endsWith(".d.ts")) out.push(full);
	}
	return out;
}

// Same classifier as check-dist-shape.mjs.
const RUNTIME_DECLARATION =
	/export\s+declare\s+(?:const|function|class|let|var)\s|\bdeclare\s+const\s+_default\s*[:=]/;

const all = walk(dist);
const isInternal = (f) => f.startsWith(root + "/");
const typeOnly = (f) => !RUNTIME_DECLARATION.test(readFileSync(f, "utf8"));
const hasRuntime = (f) => existsSync(f.replace(/\.d\.ts$/, ".js"));
const refsOf = (f) => {
	const src = readFileSync(f, "utf8");
	const out = [];
	for (const m of src.matchAll(/(?:from\s*|import\()\s*["'](\.[^"']+)["']/g)) {
		// "./x.js" → x.d.ts ; "./X.vue" → X.vue.d.ts
		out.push(join(f, "..", m[1].replace(/\.js$/, "")) + ".d.ts");
	}
	return out;
};

const survivors = new Set(all.filter((f) => !isInternal(f) || hasRuntime(f) || typeOnly(f)));
let grew = true;
while (grew) {
	grew = false;
	for (const f of [...survivors]) {
		for (const r of refsOf(f)) {
			if (existsSync(r) && !survivors.has(r)) {
				survivors.add(r);
				grew = true;
			}
		}
	}
}

const pruned = [];
for (const dts of all) {
	if (!isInternal(dts) || survivors.has(dts)) continue;
	rmSync(dts);
	pruned.push(relative(dist, dts));
}

console.log(
	pruned.length === 0
		? "✅ orphan d.ts: every dist/internals declaration has its runtime module or a referrer."
		: `✅ orphan d.ts: pruned ${pruned.length} dist/internals declaration(s) whose module is not in the bundle yet (${pruned.join(", ")}).`
);
