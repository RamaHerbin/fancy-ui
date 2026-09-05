#!/usr/bin/env node
/**
 * Removes the side-effect CSS imports tsc copies into the emitted declarations.
 *
 * Every component source begins with `import "./button.css";` — correct there,
 * because Vite reads it and folds the file into the single `dist/styles.css`.
 * `tsc -p tsconfig.build.json` has no such step: it copies the import verbatim
 * into `Button.d.ts`, which then names a file dist does not contain. A consumer
 * whose tsconfig leaves `skipLibCheck` at the compiler default (false) gets one
 * TS2307 per component the moment they import anything from the package, and
 * cannot fix it from their side. Templates that set `skipLibCheck: true` — Next
 * and Vite both do — never see it, which is why the build has been shipping it.
 *
 * Stripping loses nothing: a declaration file has no runtime, so a side-effect
 * import in one carries no type information and no emit. The alternative, empty
 * `.css` stubs beside each declaration, adds 131 files to the tarball to say
 * the same nothing.
 *
 * Runs between `tsc` and the checks in the `build` script;
 * `scripts/check-dist-shape.mjs` then fails the build if any survived.
 */
import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const dist = new URL("../dist/", import.meta.url);

/** A whole line that is a bare side-effect import of a stylesheet. */
const CSS_IMPORT_LINE = /^[ \t]*import\s+["'][^"']+\.css["'];?[ \t]*\r?\n/gm;

/** Every `.d.ts` under dist, depth-first. */
async function declarations(dir) {
	const out = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const child = new URL(entry.name + (entry.isDirectory() ? "/" : ""), dir);
		if (entry.isDirectory()) out.push(...(await declarations(child)));
		else if (entry.name.endsWith(".d.ts")) out.push(child);
	}
	return out;
}

let stripped = 0;
let touched = 0;

for (const file of await declarations(dist)) {
	const before = await readFile(file, "utf8");
	const matches = before.match(CSS_IMPORT_LINE);
	if (!matches) continue;
	await writeFile(file, before.replace(CSS_IMPORT_LINE, ""));
	stripped += matches.length;
	touched += 1;
}

console.log(
	`✅ dist declarations: stripped ${stripped} CSS side-effect import${
		stripped === 1 ? "" : "s"
	} from ${touched} file${touched === 1 ? "" : "s"} (${fileURLToPath(dist)}).`
);
