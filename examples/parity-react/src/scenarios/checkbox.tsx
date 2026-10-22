// Mirrors src/lib/components/docs/examples/checkbox/BasicUsage.svelte.
import { useState } from "react";
import { Checkbox } from "fancy-ui-react";

export default function Scenario() {
	const [agreed, setAgreed] = useState(false);
	return (
		<Checkbox sound checked={agreed} onCheckedChange={setAgreed}>
			I agree to the terms and conditions
		</Checkbox>
	);
}
