// Mirrors src/lib/components/docs/examples/presence/BasicUsage.svelte.
import { useState } from "react";
import { Button, Checkbox, Presence } from "fancy-ui-react";

export default function Scenario() {
	const [agreed, setAgreed] = useState(false);
	// Remounting (via key) puts the demo back in its first state, so the enter
	// motion plays again from scratch.
	const [replayKey, setReplayKey] = useState(0);

	return (
		<div className="flex w-full flex-col gap-4 p-6">
			<div className="flex justify-end">
				<Button
					variant="outline"
					size="sm"
					onClick={() => {
						setAgreed(false);
						setReplayKey((k) => k + 1);
					}}
				>
					Replay
				</Button>
			</div>

			<div key={replayKey} className="flex flex-col gap-2">
				<Checkbox checked={agreed} onCheckedChange={setAgreed}>
					I agree to the terms and conditions
				</Checkbox>

				<Presence open={!agreed} duration={200} exitDuration={150}>
					<p className="text-destructive text-sm">You must agree before continuing.</p>
				</Presence>
			</div>
		</div>
	);
}
