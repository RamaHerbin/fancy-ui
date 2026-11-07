// Mirrors src/lib/components/docs/DemoRenderer.svelte, slug "input":
// <Input label="Email" placeholder="name@example.com" />.
import { Input } from "fancy-ui-react";

export default function Scenario() {
	return (
		<div className="w-full max-w-sm px-6">
			<Input label="Email" placeholder="name@example.com" />
		</div>
	);
}
