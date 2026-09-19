#!/usr/bin/env node
/**
 * Gate for `vue/migration-matrix.json`.
 *
 * Sibling of `react/scripts/check-matrix.mjs`, adapted for the Vue port: the
 * matrix is seeded with every row `status: "pending"` before a single
 * component is ported (V1 scaffold), and rows flip to `"ported"` one at a
 * time as the wave pipelines land them. Gates 1-5 below therefore run ONLY
 * against rows whose `status` is `"ported"` — a pending row has no `vuePath`
 * folder yet, no `exports`, and nothing to check; holding it to the same
 * rules as a finished port would just fail the scaffold on day one.
 *
 * For every `"ported"` row this checks:
 *
 *   1. the Vue folder it points at (`vuePath`) exists;
 *   2. every name in `exports` is actually reachable from `vue/src/index.ts`
 *      (following `export * from` through the folder barrels, and named
 *      re-exports — including `export { default as X } from "./X.vue"` —
 *      through `.vue` source files);
 *   2b. every `minors[].file` is a repo-relative path that exists — the React
 *      script's own history is the warning here: the field once held 69
 *      absolute paths into one author's `.claude/worktrees/` checkout, which
 *      published a home directory and resolved nowhere else;
 *   3. no recorded claim — a `divergences` string or a `minors[].problem`,
 *      held to the same rules 3-5, since they are the same kind of sentence
 *      and rot the same way — carries a resolution marker (BLOCKING, BLOCKER,
 *      UNFIXED, OUT OF SCOPE) or orchestration chatter ("I was barred from…",
 *      "the task brief said…", an edit made "outside the assigned" folder) —
 *      the matrix records what the port diverged on, not what one agent could
 *      not reach, nor which agent was allowed to touch which file;
 *   4. no divergence claims a package is undeclared in `vue/package.json`
 *      when it is declared;
 *   5. no divergence claims `vue/src/index.ts` is missing an `export * from`
 *      line that the barrel now has — whether it quotes that line or only
 *      says in prose that the barrel does not export the component.
 *
 * `reactPath` is carried on every row as an informational cross-reference —
 * the porter reads the React transpose for divergence *parity* (seed
 * defaults, D-13/D-14), while the Svelte source stays the behaviour
 * reference — but it is never gated on here: a stale or missing `reactPath`
 * is not this script's problem, and the field existing at all does not imply
 * the row is ported.
 *
 * Plus README checks, for the other half of the same drift. Every matrix
 * divergence on a `"ported"` row has to be findable under "## Divergences
 * from the Svelte API" — the README promises that list is complete. Its
 * status paragraph's component count has to match, on the Vue side: the
 * number of `"ported"` matrix rows, the `vue/src/components` folder count,
 * and the barrel's `export * from` line count. And its "Divergences from the
 * Svelte API" bullets, which are consumer-facing npm copy, are held to rules
 * 3-5 above: no publish blockers that are unblocked, no barrel gaps that are
 * closed, no notes written to an orchestrator.
 *
 * Run: `pnpm --filter fancy-ui-vue run check:matrix` (wired into CI).
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(pkgDir, "..");

const errors = [];
const fail = (slug, message) => errors.push(`${slug}: ${message}`);

const matrix = JSON.parse(readFileSync(join(pkgDir, "migration-matrix.json"), "utf8"));
const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
const indexSource = readFileSync(join(pkgDir, "src/index.ts"), "utf8");
const readme = readFileSync(join(pkgDir, "README.md"), "utf8");

/** The bullets under "## Divergences from the Svelte API". */
function readmeBullets() {
	const section = readme.split("## Divergences from the Svelte API")[1] ?? "";
	return section.split("\n").filter((line) => line.startsWith("- **"));
}

const declaredDeps = new Set([
	...Object.keys(pkg.dependencies ?? {}),
	...Object.keys(pkg.devDependencies ?? {}),
	...Object.keys(pkg.peerDependencies ?? {}),
]);

/* ------------------------------------------------------------------ *
 * Export resolution: walk `export * from` chains, collect named exports.
 * ------------------------------------------------------------------ */

const NAMED_BLOCK = /export\s+(?:type\s+)?\{([^}]*)\}/g;
const DECLARATION =
	/export\s+(?:declare\s+)?(?:const|let|var|function\*?|class|abstract\s+class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g;
const STAR_FROM = /export\s+(?:type\s+)?\*\s+from\s+["']([^"']+)["']/g;

/**
 * Same resolution as the React script, plus `.vue`: a folder's `index.ts`
 * commonly re-exports a component with `export { default as X } from
 * "./X.vue"` (the Vue equivalent of React's `export { X } from "./X.js"`),
 * and any chase through such a specifier has to land on the real file to see
 * inside it.
 */
function sourceFileFor(specifier, fromFile) {
	if (!specifier.startsWith(".")) return null; // package import: nothing to walk
	const base = resolve(dirname(fromFile), specifier).replace(/\.js$/, "");
	for (const candidate of [`${base}.ts`, `${base}.tsx`, `${base}.vue`, join(base, "index.ts")]) {
		if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
	}
	return null;
}

const exportCache = new Map();

function exportsOf(file, seen = new Set()) {
	if (exportCache.has(file)) return exportCache.get(file);
	if (seen.has(file)) return new Set();
	seen.add(file);

	const source = readFileSync(file, "utf8");
	const names = new Set();

	for (const [, block] of source.matchAll(NAMED_BLOCK)) {
		for (const clause of block.split(",")) {
			const name = clause
				.trim()
				.replace(/^type\s+/, "")
				.split(/\s+as\s+/)
				.pop()
				?.trim();
			if (name) names.add(name);
		}
	}
	for (const [, name] of source.matchAll(DECLARATION)) names.add(name);
	for (const [, specifier] of source.matchAll(STAR_FROM)) {
		const target = sourceFileFor(specifier, file);
		if (target) for (const name of exportsOf(target, seen)) names.add(name);
	}

	exportCache.set(file, names);
	return names;
}

const publicExports = exportsOf(join(pkgDir, "src/index.ts"));

/* ------------------------------------------------------------------ *
 * The converse pass: names the package publishes that the matrix does not.
 * ------------------------------------------------------------------ */

/**
 * Every export name any `"ported"` matrix entry claims. Filled as the
 * entries are walked below, and read afterwards by the converse pass.
 *
 * The forward pass ("every name the matrix lists is reachable") is only half
 * a gate: it cannot see an export the package publishes and the record does
 * not mention. It also cannot tell a type from a value — a name satisfied by
 * `export type { X }` passes while a consumer's runtime `import { X }` fails.
 */
const recordedExports = new Set();

/**
 * Deliberate root-barrel names no component row owns.
 *
 * `cn` is the package's own addition (the Svelte barrel keeps it internal),
 * and the sound family ships from `src/sound/` rather than from a component
 * folder.
 */
const UNRECORDED_BY_DESIGN = new Set(["cn"]);
const SOUND_FAMILY = /^(?:sound|toast|dismissToast|SoundToggle|use?Sound|SOUND_|FANCY_SOUND_|DEFAULT_SOUND_|createSoundEngine|getSound|validateSound|attachSoundFeedback)/;

/**
 * The names `dist/index.js` really exports at runtime, or null when the
 * package has not been built.
 *
 * Read from the artifact rather than from a regex over the source: the
 * source scan above folds `export type { X }` in with values, so it cannot
 * answer the question a consumer asks. `--require-dist` turns a missing
 * build into a failure, which is what CI passes so the pass cannot quietly
 * not run.
 */
async function runtimeExports() {
	const entry = join(pkgDir, "dist/index.js");
	if (!existsSync(entry)) {
		if (process.argv.includes("--require-dist")) {
			console.error(
				"❌ check-matrix --require-dist: vue/dist/index.js is missing. " +
					"Run `pnpm --filter fancy-ui-vue run build` first."
			);
			process.exit(1);
		}
		return null;
	}
	return Object.keys(await import(pathToFileURL(entry).href));
}

/* ------------------------------------------------------------------ *
 * Control-character guard.
 *
 * README.md is the file npm publishes and every consumer reads. A prose
 * bullet that means to *name* a separator has to spell it as an escape
 * sequence (`\u0000`), never
 * embed it: one raw NUL made `file README.md` report "data" and made plain
 * `grep` skip the whole file. The matrix strings the bullets are drawn from
 * are held to the same rule, so the byte cannot travel back in.
 * ------------------------------------------------------------------ */

/** Control characters that must never appear literally: anything under U+0020
 *  except tab/newline/carriage return, plus DEL. */
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

const describeControl = (text) => {
	const at = text.search(CONTROL_CHARS);
	if (at === -1) return null;
	const code = text.codePointAt(at).toString(16).padStart(4, "0");
	const line = text.slice(0, at).split("\n").length;
	return { at, code, line };
};

const readmeControl = describeControl(readme);
if (readmeControl) {
	errors.push(
		`README.md: raw control character U+${readmeControl.code.toUpperCase()} at line ${readmeControl.line} ` +
			`(byte offset ${readmeControl.at}) — spell the escape (\\u0000) instead of embedding it; ` +
			"a literal control byte makes the published README a binary file to grep and to npm"
	);
}

/* ------------------------------------------------------------------ *
 * Divergence-text guards.
 * ------------------------------------------------------------------ */

const RESOLUTION_MARKERS = [
	"BLOCKING",
	"BLOCKER",
	"UNFIXED",
	"OUT OF SCOPE",
	"I was barred",
	"I was forbidden",
	"orchestration forbids",
	"my task forbade",
	"task brief",
	"outside the assigned",
	"was not updated",
	"not updated (",
];
const UNDECLARED_CLAIM =
	/(?:is |are |but )?(?:NOT |not )declared|does not declare|do not declare|declared in neither/;
const UNDECLARED_OBJECT = /(?:declares?|lists?|has|have|contains?)\s+no\s+`([^`]+)`/;
const BACKTICKED_ONE = /`([^`]+)`/;
const MISSING_BARREL_LINE = /export \* from ["'](\.\/components\/[^"']+)["']/;
/**
 * The same complaint written in words, with no barrel line to quote.
 */
const BARREL_GAP_CLAIM =
	/not (?:yet )?(?:re-)?export|is not (?:re-)?exported|no [^.]*export (?:block|line)|missing|unreachable from|not reachable from/i;

/**
 * The package a sentence claims `vue/package.json` does not declare, or
 * undefined when it makes no such claim.
 *
 * Two phrasings put the package in two different places. "`three` is NOT
 * declared in vue/package.json" leads with it, and later backticks are
 * context, so only the first is read. "`vue/package.json` declares no
 * `three`" inverts it — the leading backtick is the manifest and the package
 * is the object — so that form is matched first and the object is what gets
 * checked.
 */
function undeclaredSubject(sentence) {
	const object = sentence.match(UNDECLARED_OBJECT)?.[1]?.trim();
	if (object) return object;
	if (!UNDECLARED_CLAIM.test(sentence)) return undefined;
	return sentence.match(BACKTICKED_ONE)?.[1]?.trim();
}

/**
 * The rules every recorded claim is held to, whatever field it sits in.
 *
 * `divergences` and `minors[].problem` are the same kind of sentence — a note
 * about how the port differs from the source, or about what the port left
 * for someone else — and they rot the same way.
 *
 * `label` names the field in the failure message. `barrelSubject` is true
 * when the claim is about the package barrel even though its prose may never
 * name the file — a minor says so in its `file` field instead.
 */
function checkClaim(slug, text, { label, barrelSubject = false }) {
	const control = describeControl(text);
	if (control) {
		fail(
			slug,
			`${label} embeds a raw control character U+${control.code.toUpperCase()} — spell the escape instead:\n    ${text.slice(0, 160)}…`
		);
	}

	for (const marker of RESOLUTION_MARKERS) {
		if (text.includes(marker)) {
			fail(
				slug,
				`${label} carries the resolution marker "${marker}" — record the API difference, or delete the note once it is resolved:\n    ${text.slice(0, 160)}…`
			);
		}
	}

	/* "`three` is NOT declared in vue/package.json" and friends. */
	for (const sentence of text.split(/(?<=[.;])\s+/)) {
		const subject = undeclaredSubject(sentence);
		if (subject && declaredDeps.has(subject)) {
			fail(
				slug,
				`${label} claims \`${subject}\` is undeclared, but vue/package.json declares it`
			);
		}
	}

	const missing = text.match(MISSING_BARREL_LINE);
	if (missing && /missing|absent|not exported|not re-exported|has no|there is no/i.test(text)) {
		const [, specifier] = missing;
		if (indexSource.includes(`from "${specifier}"`)) {
			fail(
				slug,
				`${label} claims vue/src/index.ts is missing "${specifier}", but the barrel exports it`
			);
		}
	}

	/*
	 * The same claim in prose ("`vue/src/index.ts` does NOT yet export
	 * command-menu"). It quotes no `export * from` line, so the check above
	 * never saw it, and the note outlived the gap it described.
	 */
	if (
		(barrelSubject || text.includes("vue/src/index.ts")) &&
		BARREL_GAP_CLAIM.test(text) &&
		indexSource.includes(`from "./components/${slug}/index.js"`)
	) {
		fail(slug, `${label} says the barrel does not export it, but vue/src/index.ts does`);
	}
}

for (const entry of matrix) {
	const slug = entry.slug ?? "<unnamed>";

	// Rows are seeded `"pending"` before a wave ports them. Gates 1-5 apply
	// only once a row is `"ported"` — a pending row has no `vuePath` folder,
	// no `exports`, and nothing yet to hold to these rules.
	if (entry.status !== "ported") continue;

	if (!entry.vuePath) {
		fail(slug, "no vuePath");
	} else if (!existsSync(join(repoRoot, entry.vuePath))) {
		fail(slug, `vuePath does not exist: ${entry.vuePath}`);
	}

	for (const name of entry.exports ?? []) {
		if (!publicExports.has(name)) {
			fail(slug, `matrix lists export "${name}", but it is not reachable from vue/src/index.ts`);
		}
		recordedExports.add(name);
	}

	for (const minor of entry.minors ?? []) {
		if (typeof minor.file !== "string" || minor.file === "") {
			fail(slug, "minor has no `file`");
		} else if (minor.file.startsWith("/") || /^[A-Za-z]:[\\/]/.test(minor.file)) {
			fail(
				slug,
				`minor points at an absolute path: ${minor.file} — write it repo-relative ` +
					"(`vue/src/index.ts`), so it resolves on every checkout and publishes nobody's home directory"
			);
		} else if (!existsSync(join(repoRoot, minor.file))) {
			fail(slug, `minor points at a path that does not exist: ${minor.file}`);
		}

		if (typeof minor.problem === "string") {
			checkClaim(slug, minor.problem, {
				label: "minor",
				barrelSubject: minor.file === "vue/src/index.ts",
			});
		} else {
			fail(slug, "minor has no `problem`");
		}
	}

	for (const divergence of entry.divergences ?? []) {
		checkClaim(slug, divergence, { label: "divergence" });
	}
}

/* ------------------------------------------------------------------ *
 * The README's Divergences section, held to the same standard: it is
 * consumer-facing npm copy, and it drifts the same way the matrix does —
 * publish blockers that were long since unblocked, barrel gaps that were
 * long since closed, and notes one porting agent wrote to its orchestrator.
 * ------------------------------------------------------------------ */

const READMEmarkers = [...RESOLUTION_MARKERS, "not applied, per ownership"];

for (const line of readmeBullets()) {
	const slug = line.match(/^- \*\*([^*]+)\*\*/)?.[1] ?? "README";

	for (const marker of READMEmarkers) {
		if (line.includes(marker)) {
			errors.push(
				`README.md (${slug}): divergence bullet carries "${marker}" — the section documents consumer-visible API differences, not porting status`
			);
		}
	}

	for (const sentence of line.split(/(?<=[.;])\s+/)) {
		const subject = undeclaredSubject(sentence);
		if (subject && declaredDeps.has(subject)) {
			errors.push(
				`README.md (${slug}): bullet claims \`${subject}\` is undeclared, but vue/package.json declares it`
			);
		}
	}

	if (
		line.includes("vue/src/index.ts") &&
		BARREL_GAP_CLAIM.test(line) &&
		indexSource.includes(`from "./components/${slug}/index.js"`)
	) {
		errors.push(
			`README.md (${slug}): bullet says the barrel does not export it, but vue/src/index.ts does`
		);
	}
}

/* ------------------------------------------------------------------ *
 * README <-> matrix parity.
 *
 * README.md's opening paragraph promises that "every deliberate difference is
 * listed under Divergences", but nothing holds the two lists to each other
 * unless this checks it. So every divergence recorded on a `"ported"` row
 * now has to be findable in the README.
 *
 * Bullets are deliberately reworded on the way in (the matrix speaks to
 * porters, the README to consumers), so this is not a string comparison: a
 * bullet for the same slug covers a divergence when it repeats at least half
 * of its significant words. A failure means one of two things — the
 * difference is undocumented and needs a bullet, or the bullet was rewritten
 * so far from the record that a consumer grepping either one would not find
 * the other, and the two should be brought back into the same vocabulary.
 *
 * The one legitimate silence: a divergence the README is forbidden to
 * repeat, because it carries a marker the bullet rules above reject (porting
 * status, ownership notes). Those are exempt here rather than caught in both
 * places.
 * ------------------------------------------------------------------ */

/** Words too common to say anything about which difference a sentence describes. */
const PARITY_NOISE = new Set([
	"that",
	"this",
	"with",
	"from",
	"into",
	"than",
	"same",
	"also",
	"they",
	"them",
	"when",
	"which",
	"instead",
	"props",
	"prop",
	"vue",
	"svelte",
	"source",
	"component",
	"there",
	"their",
	"because",
	"while",
	"every",
]);

/** Half the divergence's vocabulary has to survive into the bullet. */
const COVERAGE = 0.5;

const significantWords = (text) =>
	new Set(
		(text.toLowerCase().match(/[a-z0-9_$.-]{4,}/g) ?? []).filter((word) => !PARITY_NOISE.has(word))
	);

const bulletsBySlug = new Map();
for (const line of readmeBullets()) {
	const match = line.match(/^- \*\*([^*]+)\*\*:?\s*(.*)$/);
	if (!match) continue;
	const [, slug, body] = match;
	if (!bulletsBySlug.has(slug)) bulletsBySlug.set(slug, []);
	bulletsBySlug.get(slug).push(significantWords(body));
}

function readmeCovers(slug, divergence) {
	const words = significantWords(divergence);
	if (words.size === 0) return true;
	for (const bullet of bulletsBySlug.get(slug) ?? []) {
		let shared = 0;
		for (const word of words) if (bullet.has(word)) shared += 1;
		if (shared / words.size >= COVERAGE) return true;
	}
	return false;
}

for (const entry of matrix) {
	if (entry.status !== "ported") continue;
	const slug = entry.slug ?? "<unnamed>";
	for (const divergence of entry.divergences ?? []) {
		/* Not documentable in consumer copy — the bullet rules above reject it. */
		if (READMEmarkers.some((marker) => divergence.includes(marker))) continue;

		if (!readmeCovers(slug, divergence)) {
			fail(
				slug,
				`divergence has no matching bullet under "## Divergences from the Svelte API" — ` +
					`README.md promises every deliberate difference is listed there:\n    ${divergence.slice(0, 160)}…`
			);
		}
	}
}

/* ------------------------------------------------------------------ *
 * README parity claim. The status paragraph names a component count, and the
 * gate makes the README lie loudly rather than quietly.
 *
 * Two wordings are accepted, because the port is a campaign and the honest
 * sentence changes shape exactly once:
 *
 *   - in progress — "<ported> of <total> components of `fancy-ui-svelte`"
 *   - at parity   — "All <n> components of `fancy-ui-svelte`"
 *
 * `<ported>` (or `<n>`) is checked against the three places the port's own
 * progress is recorded: `"ported"` matrix rows, `vue/src/components` folder
 * count, and the barrel's `export * from` line count. NOT `matrix.length` —
 * every row seeds as `"pending"`, so a total-row comparison would fail on
 * day one and stay failing until the last wave, which trains everyone to
 * ignore this gate.
 *
 * `<total>` is checked against the matrix's own component rows — every row
 * except the `foundation` group, which holds the sound family (it ships from
 * `src/sound/`, not a component folder, and `isComponentDir` excludes it on
 * the filesystem side too). That keeps "of 144" from drifting as rows are
 * added, and makes the terminal sentence ("All 144") provably the moment
 * ported === total.
 *
 * The Svelte source tree is not part of this comparison: it is the behaviour
 * reference, not a count the Vue port must match row-for-row at every point
 * in the campaign.
 * ------------------------------------------------------------------ */

const progressClaim = readme.match(/(\d+) of (\d+) components of `fancy-ui-svelte`/);
const parityClaim = readme.match(/All (\d+) components of `fancy-ui-svelte`/);
const claim = progressClaim ?? parityClaim;

const isComponentDir = (dir) => (name) =>
	!name.startsWith("_") &&
	!name.startsWith(".") &&
	name !== "sound" &&
	statSync(join(dir, name)).isDirectory();

const vueComponentsDir = join(pkgDir, "src/components");
const vueComponents = existsSync(vueComponentsDir)
	? readdirSync(vueComponentsDir).filter(isComponentDir(vueComponentsDir))
	: [];
const barrelLines = [...indexSource.matchAll(/export \* from ["']\.\/components\//g)].length;
const portedCount = matrix.filter((e) => e.status === "ported").length;

const componentRows = matrix.filter((e) => e.group !== "foundation").length;

if (!claim) {
	errors.push(
		'README.md: the status paragraph no longer states "<n> of <total> components of `fancy-ui-svelte`" ' +
			'(or "All <n> components of `fancy-ui-svelte`" once the port is at parity) — ' +
			"keep the parity claim, and keep it true"
	);
} else {
	const claimed = Number(claim[1]);
	for (const [what, actual] of [
		["src/components folders", vueComponents.length],
		["export lines in vue/src/index.ts", barrelLines],
		['"ported" entries in migration-matrix.json', portedCount],
	]) {
		if (actual !== claimed) {
			errors.push(`README.md claims ${claimed} components, but there are ${actual} ${what}`);
		}
	}

	if (progressClaim) {
		const total = Number(progressClaim[2]);
		if (total !== componentRows) {
			errors.push(
				`README.md says the Svelte package has ${total} components, but migration-matrix.json ` +
					`records ${componentRows} component rows (every row outside the "foundation" group)`
			);
		}
		if (claimed === total) {
			errors.push(
				`README.md still reads "${claimed} of ${total}" — the port is at parity, so the status ` +
					`paragraph should now read "All ${total} components of \`fancy-ui-svelte\`"`
			);
		}
	} else if (claimed !== componentRows) {
		errors.push(
			`README.md claims parity ("All ${claimed} components"), but migration-matrix.json records ` +
				`${componentRows} component rows — say "<ported> of ${componentRows}" until every one is ported`
		);
	}
}

/* ------------------------------------------------------------------ *
 * Converse pass. Runs last: it needs every entry's `exports` collected.
 * ------------------------------------------------------------------ */

const runtime = await runtimeExports();
if (runtime) {
	for (const name of runtime) {
		if (recordedExports.has(name)) continue;
		if (UNRECORDED_BY_DESIGN.has(name) || SOUND_FAMILY.test(name)) continue;
		errors.push(
			`dist/index.js exports "${name}" at runtime, but no matrix entry records it — ` +
				"add it to the owning slug's `exports`, or stop exporting it."
		);
	}
}

if (errors.length) {
	console.error(
		`migration-matrix.json is out of date with the tree (${errors.length} problem${errors.length === 1 ? "" : "s"}):\n`
	);
	for (const error of errors) console.error(`  - ${error}`);
	console.error("\nFix the tree or the record — whichever is wrong.");
	process.exit(1);
}

console.log(
	`migration-matrix.json: ${matrix.length} entries (${portedCount} ported), ${recordedExports.size} ` +
		`recorded export names, ${vueComponents.length} components matching the README claim — clean.` +
		(runtime
			? ` Converse pass: ${runtime.length} runtime names in dist/index.js, all recorded.`
			: " Converse pass skipped: no dist/ (run `build` first, as CI does).")
);
