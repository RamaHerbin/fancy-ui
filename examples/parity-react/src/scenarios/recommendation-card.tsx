// Mirrors src/lib/components/docs/examples/recommendation-card/BasicUsage.svelte.
import { useState } from "react";
import { RecommendationCard } from "fancy-ui-react";
import type { RecommendationState } from "fancy-ui-react";

export default function Scenario() {
	const [indexState, setIndexState] = useState<RecommendationState>("open");
	const [cacheState, setCacheState] = useState<RecommendationState>("open");

	const settled = indexState !== "open" || cacheState !== "open";

	function reset() {
		setIndexState("open");
		setCacheState("open");
	}

	return (
		<div className="flex w-full max-w-xl flex-col gap-3 p-6">
			<RecommendationCard
				sound
				badge="Suggestion"
				title="Add an index on orders.customer_id"
				description="The three slowest queries this week all scanned the whole table."
				confidence={0.87}
				acceptLabel="Apply migration"
				state={indexState}
				onStateChange={setIndexState}
			>
				<code className="bg-foreground/5 text-muted-foreground block rounded-md px-2.5 py-1.5 font-mono text-xs">
					CREATE INDEX orders_customer_id_idx ON orders (customer_id);
				</code>
			</RecommendationCard>

			<RecommendationCard
				sound
				badge="Speculative"
				title="Cache the pricing lookup for 60 seconds"
				description="Prices changed twice last quarter, so staleness is cheap — but the traffic here is modest."
				confidence={0.42}
				acceptLabel="Apply patch"
				dismissLabel="Not now"
				state={cacheState}
				onStateChange={setCacheState}
			/>

			<div className="mt-1 flex items-center justify-between gap-3">
				<p className="text-muted-foreground text-xs">
					The ring and the counter agree on one figure; the band shifts colour at 75% and 50%.
				</p>
				{settled && (
					<button
						type="button"
						className="text-muted-foreground hover:text-foreground hover:bg-foreground/5 flex-none rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
						onClick={reset}
					>
						Reset both
					</button>
				)}
			</div>
		</div>
	);
}
