#!/usr/bin/env node
/**
 * Gate for `react/migration-matrix.json`.
 *
 * The matrix is the port's record of truth — every review, every follow-up and
 * every "what did we deliberately change?" question is answered from it — but
 * nothing used to read it, so it drifted: six entries still carried BLOCKING /
 * UNFIXED packaging and barrel gaps that the tree had long since closed.
 *
 * This script is what stops that happening again. It checks, for every entry:
 *
 *   1. the React folder it points at exists;
 *   2. every name in `exports` is actually reachable from `react/src/index.ts`
 *      (following `export * from` through the folder barrels);
 *   2b. every `minors[].file` is a repo-relative path that exists — the field
 *      once held 69 absolute paths into one author's `.claude/worktrees/`
 *      checkout, which published a home directory and resolved nowhere else;
 *   3. no recorded claim — a `divergences` string or a `minors[].problem`,
 *      held to the same rules 3-5, since they are the same kind of sentence
 *      and rot the same way — carries a resolution marker (BLOCKING, BLOCKER,
 *      UNFIXED, OUT OF SCOPE) or orchestration chatter ("I was barred from…",
 *      "the task brief said…", an edit made "outside the assigned" folder) —
 *      the matrix records what the port diverged on, not what one agent could
 *      not reach, nor which agent was allowed to touch which file;
 *   4. no divergence claims a package is undeclared in `react/package.json`
 *      when it is declared;
 *   5. no divergence claims `react/src/index.ts` is missing an `export * from`
 *      line that the barrel now has — whether it quotes that line or only says
 *      in prose that the barrel does not export the component.
 *
 * Plus three README checks, for the other half of the same drift. Every
 * matrix divergence has to be findable under "## Divergences from the Svelte
 * API" — the README promises that list is complete, and two real differences
 * (neon-border's global CSS, the sound family's missing action) were missing
 * from it. Its status
 * paragraph's component count has to match the folder count on both sides of
 * the port, the barrel and the matrix — it once read "a first batch of
 * flagship components" for a finished 144-component package. And its
 * "Divergences from the Svelte API" bullets, which are consumer-facing npm
 * copy, are held to rules 3-5 above: no publish blockers that are unblocked,
 * no barrel gaps that are closed, no notes written to an orchestrator.
 *
 * Run: `pnpm --filter fancy-ui-react run check:matrix` (wired into CI).
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const reactDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(reactDir, "..");

const errors = [];
const fail = (slug, message) => errors.push(`${slug}: ${message}`);

const matrix = JSON.parse(readFileSync(join(reactDir, "migration-matrix.json"), "utf8"));
const pkg = JSON.parse(readFileSync(join(reactDir, "package.json"), "utf8"));
const indexSource = readFileSync(join(reactDir, "src/index.ts"), "utf8");
const readme = readFileSync(join(reactDir, "README.md"), "utf8");

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

function sourceFileFor(specifier, fromFile) {
	if (!specifier.startsWith(".")) return null; // package import: nothing to walk
	const base = resolve(dirname(fromFile), specifier).replace(/\.js$/, "");
	for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
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

const publicExports = exportsOf(join(reactDir, "src/index.ts"));

/* ------------------------------------------------------------------ *
 * Control-character guard.
 *
 * README.md is the file npm publishes and every consumer reads. A prose
 * bullet that means to *name* a separator has to spell it (`\u0000`), never
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
 * The same complaint written in words, with no barrel line to quote. The
 * `minors` half of the matrix phrased it a dozen further ways ("No card-3d
 * export block in the package barrel", "ArtifactCard has no export line",
 * "not reachable from the package entry point"), so those forms count too.
 */
const BARREL_GAP_CLAIM =
	/not (?:yet )?(?:re-)?export|is not (?:re-)?exported|no [^.]*export (?:block|line)|missing|unreachable from|not reachable from/i;

/**
 * The package a sentence claims `react/package.json` does not declare, or
 * undefined when it makes no such claim.
 *
 * Two phrasings put the package in two different places. "`three` is NOT
 * declared in react/package.json" leads with it, and later backticks are
 * context (`@types/three` is what pulls in the genuinely-undeclared
 * `@webgpu/types`, for instance), so only the first is read. "`react/
 * package.json` declares no `three`" inverts it — the leading backtick is the
 * manifest and the package is the object — so that form is matched first and
 * the object is what gets checked.
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
 * about how the port differs from the source, or about what the port left for
 * someone else — and they rot the same way. Only the divergence half used to
 * be read, so `minors` accumulated 47 claims the tree had already closed: the
 * barrel gap ("alert-dialog is not re-exported from the package index") for
 * components src/index.ts now exports, and the packaging gap ("`gsap` is
 * declared in neither dependencies nor peerDependencies") for packages
 * package.json now declares.
 *
 * `label` names the field in the failure message. `barrelSubject` is true when
 * the claim is about the package barrel even though its prose may never name
 * the file — a minor says so in its `file` field instead.
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

	/* "`three` is NOT declared in react/package.json" and friends. */
	for (const sentence of text.split(/(?<=[.;])\s+/)) {
		const subject = undeclaredSubject(sentence);
		if (subject && declaredDeps.has(subject)) {
			fail(
				slug,
				`${label} claims \`${subject}\` is undeclared, but react/package.json declares it`
			);
		}
	}

	const missing = text.match(MISSING_BARREL_LINE);
	if (missing && /missing|absent|not exported|not re-exported|has no|there is no/i.test(text)) {
		const [, specifier] = missing;
		if (indexSource.includes(`from "${specifier}"`)) {
			fail(
				slug,
				`${label} claims react/src/index.ts is missing "${specifier}", but the barrel exports it`
			);
		}
	}

	/*
	 * The same claim in prose ("`react/src/index.ts` does NOT yet export
	 * command-menu"). It quotes no `export * from` line, so the check
	 * above never saw it, and the note outlived the gap it described. The
	 * README half of this gate has always caught that wording; the matrix
	 * half is held to it too, keyed on the entry's own slug.
	 */
	if (
		(barrelSubject || text.includes("react/src/index.ts")) &&
		BARREL_GAP_CLAIM.test(text) &&
		indexSource.includes(`from "./components/${slug}/index.js"`)
	) {
		fail(slug, `${label} says the barrel does not export it, but react/src/index.ts does`);
	}
}

for (const entry of matrix) {
	const slug = entry.slug ?? "<unnamed>";

	if (!entry.reactPath) {
		fail(slug, "no reactPath");
	} else if (!existsSync(join(repoRoot, entry.reactPath))) {
		fail(slug, `reactPath does not exist: ${entry.reactPath}`);
	}

	for (const name of entry.exports ?? []) {
		if (!publicExports.has(name)) {
			fail(slug, `matrix lists export "${name}", but it is not reachable from react/src/index.ts`);
		}
	}

	for (const minor of entry.minors ?? []) {
		if (typeof minor.file !== "string" || minor.file === "") {
			fail(slug, "minor has no `file`");
		} else if (minor.file.startsWith("/") || /^[A-Za-z]:[\\/]/.test(minor.file)) {
			fail(
				slug,
				`minor points at an absolute path: ${minor.file} — write it repo-relative ` +
					"(`react/src/index.ts`), so it resolves on every checkout and publishes nobody's home directory"
			);
		} else if (!existsSync(join(repoRoot, minor.file))) {
			fail(slug, `minor points at a path that does not exist: ${minor.file}`);
		}

		if (typeof minor.problem === "string") {
			checkClaim(slug, minor.problem, {
				label: "minor",
				barrelSubject: minor.file === "react/src/index.ts",
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
 * consumer-facing npm copy, and it drifted the same way the matrix did —
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
				`README.md (${slug}): bullet claims \`${subject}\` is undeclared, but react/package.json declares it`
			);
		}
	}

	if (
		line.includes("react/src/index.ts") &&
		BARREL_GAP_CLAIM.test(line) &&
		indexSource.includes(`from "./components/${slug}/index.js"`)
	) {
		errors.push(
			`README.md (${slug}): bullet says the barrel does not export it, but react/src/index.ts does`
		);
	}
}

/* ------------------------------------------------------------------ *
 * README <-> matrix parity.
 *
 * README.md's opening paragraph promises that "every deliberate difference is
 * listed under Divergences", but nothing held the two lists to each other, and
 * two genuine consumer-visible differences never made the crossing: the
 * `neon-border` global-CSS leak, and the whole `sound` family's missing
 * `use:soundFeedback` action. So every matrix divergence now has to be
 * findable in the README.
 *
 * Bullets are deliberately reworded on the way in (the matrix speaks to
 * porters, the README to consumers), so this is not a string comparison: a
 * bullet for the same slug covers a divergence when it repeats at least half
 * of its significant words. A failure means one of two things — the
 * difference is undocumented and needs a bullet, or the bullet was rewritten
 * so far from the record that a consumer grepping either one would not find
 * the other, and the two should be brought back into the same vocabulary.
 *
 * The one legitimate silence: a divergence the README is forbidden to repeat,
 * because it carries a marker the bullet rules above reject (porting status,
 * ownership notes). Those are exempt here rather than caught in both places.
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
	"react",
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
 * README parity claim. The status paragraph names a component count; it
 * used to say "a first batch of flagship components" long after the port
 * had reached 144. Whatever it claims has to match the tree on both sides.
 * ------------------------------------------------------------------ */

const claim = readme.match(/All (\d+) components of `fancy-ui-svelte`/);

const isComponentDir = (dir) => (name) =>
	!name.startsWith("_") &&
	!name.startsWith(".") &&
	name !== "sound" &&
	statSync(join(dir, name)).isDirectory();

const reactComponentsDir = join(reactDir, "src/components");
const reactComponents = readdirSync(reactComponentsDir).filter(isComponentDir(reactComponentsDir));
const svelteComponentsDir = join(repoRoot, "src/lib/fancy-ui");
const svelteComponents = readdirSync(svelteComponentsDir).filter(
	isComponentDir(svelteComponentsDir)
);
const barrelLines = [...indexSource.matchAll(/export \* from ["']\.\/components\//g)].length;

if (!claim) {
	errors.push(
		'README.md: the status paragraph no longer states "All <n> components of `fancy-ui-svelte`" — keep the parity claim, and keep it true'
	);
} else {
	const claimed = Number(claim[1]);
	for (const [what, actual] of [
		["react/src/components folders", reactComponents.length],
		["src/lib/fancy-ui component folders", svelteComponents.length],
		["export lines in react/src/index.ts", barrelLines],
		[
			"component entries in migration-matrix.json",
			matrix.filter((e) => (e.reactPath ?? "").startsWith("react/src/components/")).length,
		],
	]) {
		if (actual !== claimed) {
			errors.push(`README.md claims ${claimed} components, but there are ${actual} ${what}`);
		}
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
	`migration-matrix.json: ${matrix.length} entries, ${publicExports.size} public exports, ` +
		`${reactComponents.length} components matching the README claim — clean.`
);
