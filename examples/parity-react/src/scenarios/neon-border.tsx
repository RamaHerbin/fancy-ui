// Mirrors the neon-border branch of src/lib/components/docs/DemoRenderer.svelte (defaultProps {} + child).
import { NeonBorder } from "fancy-ui-react";

export default function Scenario() {
	return (
		<NeonBorder>
			<div className="rounded-xl p-8 text-center">
				<p className="text-foreground font-semibold">Neon Border</p>
			</div>
		</NeonBorder>
	);
}
