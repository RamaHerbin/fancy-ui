/**
 * `sv.dependency()` overwrites a declared range unless it already satisfies the wanted one:
 * `^0.18.0` is not within `^0.17.0` (0.x caret) and a `file:`/`link:`/`workspace:` spec never
 * parses, so it would silently downgrade or unlink an existing install. The add-on therefore
 * only declares the package when the project does not declare it at all.
 *
 * @param declared what `dependencyVersion("fancy-ui-svelte")` returns (dependencies,
 *   devDependencies, or a parent package.json), `undefined` when absent.
 * @returns the range to add, or `null` to leave package.json alone.
 */
export function fancyDependencyToAdd(declared: string | undefined, version: string): string | null {
	return declared === undefined ? `^${version}` : null;
}

/** Major of a declared range as `dependencyVersion` returns it (`5.45.0`, `>=5`, `next`...), or `null`. */
export function majorOf(range: string | undefined): number | null {
	if (!range) return null;
	const m = range.match(/(\d+)/);
	return m ? Number(m[1]) : null;
}

/** `5.19.3` -> true: below the `^5.20.0` peer range of fancy-ui-svelte (best effort, ranges vary). */
export function isBelowSvelte520(range: string | undefined): boolean {
	const m = range?.match(/(\d+)\.(\d+)/);
	return !!m && Number(m[1]) === 5 && Number(m[2]) < 20;
}
