// Mirrors src/lib/components/docs/examples/typing-indicator/BasicUsage.svelte.
import { TypingIndicator } from "fancy-ui-react";

export default function Scenario() {
	return (
		<div className="flex w-full flex-col items-start gap-8 p-6">
			<div className="flex w-full max-w-md flex-col gap-2">
				<div className="bg-primary text-primary-foreground ml-auto rounded-2xl rounded-br-sm px-4 py-2.5">
					<p className="text-sm">Can you summarize the release notes?</p>
				</div>
				<div className="bg-muted text-muted-foreground mr-auto rounded-2xl rounded-bl-sm px-4 py-3.5">
					<TypingIndicator label="Assistant is typing" />
				</div>
			</div>

			<div className="flex items-center gap-3">
				<TypingIndicator size={10} speed={1.6} className="text-muted-foreground" />
				<span className="text-muted-foreground text-sm">Larger and slower, on its own</span>
			</div>
		</div>
	);
}
