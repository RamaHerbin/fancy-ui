// Mirrors the password-input entry of defaultProps in src/lib/components/docs/DemoRenderer.svelte.
import { PasswordInput } from "fancy-ui-react";

export default function Scenario() {
	return <PasswordInput label="Password" showStrength />;
}
