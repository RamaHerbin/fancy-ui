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

/** First `major.minor` of a range (`^5.19.3` -> [5, 19]), or `null` when it has none. */
function majorMinor(range: string | undefined): [number, number] | null {
	const m = range?.match(/(\d+)\.(\d+)/);
	return m ? [Number(m[1]), Number(m[2])] : null;
}

/**
 * Whether a declared range starts below the floor of a peer range: `5.19.3` or `^5.0.0` against
 * `^5.20.0` -> true. A range without a readable `major.minor` (`catalog:`, `workspace:*`,
 * `latest`, `5`) is never below: it only skips the check.
 */
export function isBelowFloor(range: string | undefined, peer: string): boolean {
	const have = majorMinor(range);
	const floor = majorMinor(peer);
	if (!have || !floor) return false;
	return have[0] < floor[0] || (have[0] === floor[0] && have[1] < floor[1]);
}
