// Mirrors the password-input entry of defaultProps in src/lib/components/docs/DemoRenderer.svelte.
import { PasswordInput } from "fancy-ui-react";

export default function Scenario() {
	return (
		<div className="w-full max-w-sm px-6">
			<PasswordInput label="Password" showStrength />
		</div>
	);
}
