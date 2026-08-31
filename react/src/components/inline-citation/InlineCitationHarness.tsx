// Test-only rig for the one thing the main test file cannot set up: the marker
// inside real prose, with punctuation pressed straight up against it. Whether
// the component leaks a whitespace text node of its own is only observable from
// the outside, in the sentence it interrupts. Not itself a `.test.tsx` file, so
// vitest does not collect it as a suite, and not exported from index.ts.
import type { SourceData } from "../../internals/ai-types.js";
import { InlineCitation } from "./InlineCitation.js";

export interface InlineCitationHarnessProps {
	source: SourceData;
	index?: number;
	href?: string;
}

export function InlineCitationHarness({ source, index = 1, href }: InlineCitationHarnessProps) {
	return (
		<p data-testid="prose">
			Worth a read
			<InlineCitation source={source} index={index} href={href} />.
		</p>
	);
}
