// Test-only composition rig (not itself a `.test.tsx` file, so vitest does not
// collect it as its own suite). The parts get exercised through real markup
// here, which is the only way to prove they read the context the root actually
// publishes rather than one the test invented. The round-tripped `open` is
// echoed into the DOM so a test can watch the state write outwards — the React
// counterpart of the Svelte harness's `bind:open`. Not exported from index.ts.
import { useState } from "react";
import type { SourceData } from "../../internals/ai-types.js";
import { Sources } from "./Sources.js";
import { SourcesTrigger } from "./SourcesTrigger.js";
import { SourcesList } from "./SourcesList.js";

export interface SourcesHarnessProps {
	sources: SourceData[];
	/** Seeds the harness's own state, as the Svelte harness's `$bindable(false)` does. */
	open?: boolean;
	label?: string;
	onToggle?: (open: boolean) => void;
	/** Swaps the default card for the local `row` renderer below. */
	customItem?: boolean;
}

export function SourcesHarness({
	sources,
	open: initialOpen = false,
	label,
	onToggle,
	customItem = false,
}: SourcesHarnessProps) {
	const [open, setOpen] = useState(initialOpen);

	const row = (source: SourceData, index: number) => (
		<span data-testid="custom-item">
			{index}:{source.title}
		</span>
	);

	return (
		<>
			<Sources
				sources={sources}
				open={open}
				onToggle={(next) => {
					setOpen(next);
					onToggle?.(next);
				}}
			>
				<SourcesTrigger label={label} />
				<SourcesList item={customItem ? row : undefined} />
			</Sources>

			<span data-testid="bound-open">{String(open)}</span>
		</>
	);
}
