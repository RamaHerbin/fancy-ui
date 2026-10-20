// Mirrors src/lib/components/docs/examples/presence/BasicUsage.svelte.
import { useState } from "react";
import { Checkbox, Presence } from "fancy-ui-react";

export default function Scenario() {
	const [agreed, setAgreed] = useState(false);

	return (
		<div className="flex w-full flex-col gap-2 p-6">
			<Checkbox checked={agreed} onCheckedChange={setAgreed}>
				I agree to the terms and conditions
			</Checkbox>

			<Presence open={!agreed} duration={200} exitDuration={150}>
				<p className="text-destructive text-sm">You must agree before continuing.</p>
			</Presence>
		</div>
	);
}
