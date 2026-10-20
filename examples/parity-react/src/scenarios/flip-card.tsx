// Mirrors src/lib/components/docs/examples/flip-card/BasicUsage.svelte.
import { FlipCard } from "fancy-ui-react";

export default function Scenario() {
	return (
		<FlipCard
			back={
				<div className="flex size-full flex-col items-center justify-center">
					<p className="text-lg font-semibold">Back Side</p>
					<p className="text-muted-foreground mt-2 text-sm">Hover, focus or tap to flip</p>
				</div>
			}
		>
			<div className="flex size-full items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
				<p className="text-2xl font-bold text-white">Front</p>
			</div>
		</FlipCard>
	);
}
