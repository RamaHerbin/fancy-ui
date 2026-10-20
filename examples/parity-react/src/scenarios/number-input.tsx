// Mirrors the number-input entry of defaultProps in src/lib/components/docs/DemoRenderer.svelte.
import { useState } from "react";
import { NumberInput } from "fancy-ui-react";

export default function Scenario() {
	const [value, setValue] = useState<number | null>(12);

	return <NumberInput label="Quantity" value={value} onValueChange={setValue} min={0} max={99} />;
}
