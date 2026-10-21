import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "fancy-ui-react";

export function RadioGroupExample() {
	const [plan, setPlan] = useState("starter");

	return (
		<RadioGroup sound value={plan} onValueChange={setPlan} label="Plan">
			<RadioGroupItem value="starter" label="Starter" />
			<RadioGroupItem value="team" label="Team" />
			<RadioGroupItem value="enterprise" label="Enterprise" />
		</RadioGroup>
	);
}
