// Mirrors src/lib/components/docs/examples/context-ring/BasicUsage.svelte.
import { ContextRing } from "fancy-ui-react";

const comfortable = { used: 12_400, max: 200_000 };
const warning = { used: 164_000, max: 200_000 };
const critical = { used: 192_500, max: 200_000 };

const detailed = {
	used: 84_300,
	max: 200_000,
	breakdown: [
		{ label: "System prompt", tokens: 1850 },
		{ label: "Transcript", tokens: 61_200 },
		{ label: "Tool results", tokens: 18_400 },
		{ label: "Attachments", tokens: 2850 },
	],
};

export default function Scenario() {
	return (
		<div className="flex w-full max-w-xl flex-col gap-6 p-6">
			<div className="flex flex-wrap items-center gap-8">
				<ContextRing usage={comfortable} />
				<ContextRing usage={warning} />
				<ContextRing usage={critical} />
			</div>

			<p className="text-muted-foreground text-xs">
				The band shifts at 75% and again at 90%, using the same run-status colours as the rest of
				the AI family. The arc's length says the same thing as its hue, so neither is load-bearing
				on its own.
			</p>

			<div className="border-border flex items-center gap-3 border-t pt-6">
				<ContextRing sound usage={detailed} size={34} strokeWidth={4} expandable />
				<span className="text-muted-foreground text-xs">
					Press the ring for the breakdown. Escape closes it.
				</span>
			</div>
		</div>
	);
}
