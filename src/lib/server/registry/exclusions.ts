/**
 * What never ships in the copy-source registries, named.
 *
 * Two kinds of exclusion:
 *
 * - `*_EXCLUSIONS`: files inside an item's folder that stay out (tests,
 *   harnesses, mocks, READMEs, the scaffolding template, other file kinds).
 *   Each stack's `isExcluded` is exactly "matches one of its list".
 * - `OUTSIDE_ITEMS`: trees no item owns at all (each stack's `groupOf`
 *   returns null for them). Listed here so the docs and reviews can name
 *   them; the stacks' `groupOf` is what enforces it.
 *
 * `dev.ts` is decided by the builder, not here: it ships only when a kept
 * file imports it.
 */

export interface Exclusion {
	/** Short name of the rule, e.g. "unit tests". */
	label: string;
	/** Why the file stays out. */
	reason: string;
	/** True when the path (relative to the stack's source root) is excluded. */
	test(relPath: string): boolean;
}

const fileName = (relPath: string) => relPath.split("/").pop() ?? relPath;
const byFile =
	(pattern: RegExp) =>
	(relPath: string): boolean =>
		pattern.test(fileName(relPath));

const README: Exclusion = {
	label: "READMEs",
	reason: "package documentation, not component code",
	test: byFile(/^README/i),
};
const AUDIO_MOCK: Exclusion = {
	label: "web-audio-mock.ts",
	reason: "test double for the sound engine",
	test: byFile(/^web-audio-mock\.ts$/),
};

/** React (`react/src`). */
export const REACT_EXCLUSIONS: readonly Exclusion[] = Object.freeze([
	{
		label: "other file kinds",
		reason: "only .ts, .tsx and .css ship",
		test: (relPath: string) => !/\.(ts|tsx|css)$/.test(fileName(relPath)),
	},
	{ label: "unit tests", reason: "package test suite", test: byFile(/\.test\.tsx?$/) },
	{ label: "test harnesses", reason: "test-only wrappers", test: byFile(/Harness\.tsx?$/) },
	AUDIO_MOCK,
	README,
]);

/** Svelte (`src/lib/fancy-ui`). */
export const SVELTE_EXCLUSIONS: readonly Exclusion[] = Object.freeze([
	{
		label: "_template/",
		reason: "scaffolding template for new components",
		test: (relPath: string) => /(^|\/)_template\//.test(relPath),
	},
	{
		label: "other file kinds",
		reason: "only .svelte and .ts ship",
		test: (relPath: string) => !/\.(svelte|ts)$/.test(fileName(relPath)),
	},
	{
		label: "unit tests",
		reason: "package test suite",
		test: byFile(/\.test\.(ts|svelte)$/),
	},
	{ label: "test harnesses", reason: "test-only wrappers", test: byFile(/Harness/) },
	AUDIO_MOCK,
	README,
]);

/** Vue (`vue/src`). */
export const VUE_EXCLUSIONS: readonly Exclusion[] = Object.freeze([
	{
		label: "other file kinds",
		reason: "only .vue, .ts and .css ship",
		test: (relPath: string) => !/\.(vue|ts|css)$/.test(fileName(relPath)),
	},
	{ label: "unit tests", reason: "package test suite", test: byFile(/\.test\.ts$/) },
	{ label: "test fixtures", reason: "test-only data", test: byFile(/\.fixtures\.ts$/) },
	{ label: "test-setup.ts", reason: "test runner setup", test: byFile(/^test-setup\.ts$/) },
	AUDIO_MOCK,
	README,
]);

/** Is `relPath` excluded by one of `list`? */
export function excludedBy(list: readonly Exclusion[], relPath: string): boolean {
	return list.some((rule) => rule.test(relPath));
}

/** Trees no item owns, per stack (enforced by each stack's `groupOf`). */
export const OUTSIDE_ITEMS: Readonly<
	Record<"react" | "svelte" | "vue", readonly { path: string; reason: string }[]>
> = Object.freeze({
	react: [
		{ path: "root files but utils.ts", reason: "package entry barrel, test setup, SSR fixtures" },
		{ path: "cameleon/", reason: "skin engine and retro kit, npm only" },
	],
	svelte: [
		{
			path: "root files",
			reason: "package entry barrel, component metadata, the token stylesheet",
		},
		{ path: "_template/", reason: "scaffolding template for new components" },
		{
			path: "src/lib/cameleon/ (outside the source tree)",
			reason: "skin engine and retro kit, npm only",
		},
	],
	vue: [
		{ path: "root files but utils.ts", reason: "package entry barrel, test setup, SSR fixtures" },
		{ path: "cameleon/", reason: "skin engine and retro kit, npm only" },
	],
});

/**
 * Bare specifiers naming one of fancy-ui's own npm packages. Copied code must
 * never import them: the point of the copy is not to depend on the package.
 */
export const OWN_PACKAGE = /^fancy-ui-(svelte|react|vue|cameleon|nuxt)(\/|$)/;
