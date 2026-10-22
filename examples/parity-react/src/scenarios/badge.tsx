// Mirrors src/lib/components/docs/examples/badge/BasicUsage.svelte.
import { Badge } from "fancy-ui-react";

export default function Scenario() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Badge>Default</Badge>
			<Badge variant="secondary">Secondary</Badge>
			<Badge variant="outline">Outline</Badge>
			<Badge variant="destructive">Destructive</Badge>
			<Badge variant="success">Success</Badge>
		</div>
	);
}
