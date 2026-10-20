// Mirrors src/lib/components/docs/examples/radio-group/BasicUsage.svelte.
import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "fancy-ui-react";

export default function Scenario() {
	const [plan, setPlan] = useState("a");

	return (
		<RadioGroup sound value={plan} onValueChange={setPlan} label="Plan">
			<RadioGroupItem value="a" label="Option A" />
			<RadioGroupItem value="b" label="Option B" />
			<RadioGroupItem value="c" label="Option C" />
		</RadioGroup>
	);
}
