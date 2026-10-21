import { FormField, Input } from "fancy-ui-react";

export function FormFieldExample() {
	return (
		<FormField label="Email" description="We'll only use this to send your receipt.">
			<Input type="email" placeholder="you@example.com" />
		</FormField>
	);
}
