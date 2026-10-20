// Mirrors src/lib/components/docs/examples/form-field/BasicUsage.svelte.
import { FormField } from "fancy-ui-react";

export default function Scenario() {
	return (
		<FormField
			id="signup-email"
			label="Email"
			description="We'll only use this to send your receipt."
		>
			<input
				id="signup-email"
				type="email"
				placeholder="you@example.com"
				aria-describedby="signup-email-description"
				className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring/50 focus-visible:border-ring w-full rounded-lg border px-3 py-[9px] text-[13px] outline-none focus-visible:ring-2"
			/>
		</FormField>
	);
}
