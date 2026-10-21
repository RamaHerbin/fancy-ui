import { useState } from "react";
import { Checkbox } from "fancy-ui-react";

export function CheckboxExample() {
	const [agreed, setAgreed] = useState(false);

	return (
		<Checkbox sound checked={agreed} onCheckedChange={setAgreed}>
			I agree to the terms and conditions
		</Checkbox>
	);
}
