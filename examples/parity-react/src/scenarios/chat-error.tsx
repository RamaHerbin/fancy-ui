// Mirrors src/lib/components/docs/examples/chat-error/BasicUsage.svelte.
import { useEffect, useRef, useState } from "react";
import { ChatError } from "fancy-ui-react";

/** How long the pretend request takes before it comes back green. */
const RETRY_MS = 1500;

export default function Scenario() {
	const [phase, setPhase] = useState<"failed" | "retrying" | "recovered">("failed");
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	function retry() {
		setPhase("retrying");
		timer.current = setTimeout(() => {
			timer.current = undefined;
			setPhase("recovered");
		}, RETRY_MS);
	}

	function replay() {
		clearTimeout(timer.current);
		timer.current = undefined;
		setPhase("failed");
	}

	useEffect(() => () => clearTimeout(timer.current), []);

	return (
		<div className="flex w-full max-w-md flex-col gap-3 p-6">
			<div className="bg-primary text-primary-foreground ml-auto rounded-2xl rounded-br-sm px-4 py-2.5">
				<p className="text-sm">What changed in yesterday's deploy?</p>
			</div>

			{phase === "recovered" ? (
				<>
					<div className="bg-muted mr-auto rounded-2xl rounded-bl-sm px-4 py-2.5">
						<p className="text-sm leading-relaxed">
							Three commits landed: a cache fix, the new export endpoint, and a dependency bump.
						</p>
					</div>
					<button
						type="button"
						className="text-muted-foreground hover:text-foreground self-start text-xs underline underline-offset-4"
						onClick={replay}
					>
						Replay the failure
					</button>
				</>
			) : (
				<ChatError
					sound
					message="The assistant couldn't finish that reply"
					detail="network_error · request 8f21c0"
					onRetry={retry}
					retrying={phase === "retrying"}
				/>
			)}
		</div>
	);
}
