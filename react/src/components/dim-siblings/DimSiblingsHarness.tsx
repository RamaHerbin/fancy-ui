// Test-only rig: proves real JSX markup with several top-level children
// still lands as direct children of the rendered root. Not exported from
// index.ts, and not collected by Vitest directly (only *.test.tsx bodies
// run) — imported and rendered from DimSiblings.test.tsx.
import { DimSiblings } from "./DimSiblings.js";

export function DimSiblingsHarness() {
	return (
		<DimSiblings>
			<a href="#a">One</a>
			<a href="#b">Two</a>
			<a href="#c">Three</a>
		</DimSiblings>
	);
}
