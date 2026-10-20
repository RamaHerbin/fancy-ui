// Mirrors src/lib/components/docs/examples/thinking-indicator/BasicUsage.svelte.
import { ThinkingIndicator } from "fancy-ui-react";

const startedAt = Date.now();

export default function Scenario() {
	return (
		<div className="flex w-full flex-col items-start gap-6">
			<ThinkingIndicator status="Reading files" since={startedAt} />

			<ThinkingIndicator variant="pill" status="Searching the web" since={startedAt - 8000} />

			<ThinkingIndicator
				status="Reading files"
				running={false}
				showElapsed={false}
				done="Thought for 12s"
			/>
		</div>
	);
}
