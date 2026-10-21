import { useState } from "react";
import { ThinkingIndicator } from "fancy-ui-react";

export function ThinkingIndicatorExample() {
	const [startedAt] = useState(() => Date.now());

	return (
		<div className="flex w-full flex-col items-start gap-6">
			<ThinkingIndicator status="Reading files" since={startedAt} />

			<ThinkingIndicator variant="pill" status="Searching the web" since={startedAt - 8000} />

			{/* Finished: the shimmer stops and `done` takes over the label. */}
			<ThinkingIndicator
				status="Reading files"
				running={false}
				showElapsed={false}
				done="Thought for 12s"
			/>
		</div>
	);
}
