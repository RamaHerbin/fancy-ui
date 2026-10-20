// Mirrors src/lib/components/docs/examples/link/BasicUsage.svelte.
import { Link } from "fancy-ui-react";

export default function Scenario() {
	return (
		<p className="text-foreground max-w-md text-sm leading-relaxed">
			fancy-ui ships as an npm package, but every component is also{" "}
			<Link sound href="/docs/components/link">
				copy-pasteable
			</Link>{" "}
			straight from the docs — see the{" "}
			<Link sound href="/docs" external>
				full component index
			</Link>{" "}
			for what else is in the box.
		</p>
	);
}
