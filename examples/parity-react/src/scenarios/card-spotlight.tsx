// Mirrors src/lib/components/docs/DemoRenderer.svelte, slug "card-spotlight":
// <CardSpotlight class="h-64 w-80" gradientColor="#262626"> (non-retro skin).
import { CardSpotlight } from "fancy-ui-react";

export default function Scenario() {
	return (
		<CardSpotlight className="h-64 w-80" gradientColor="#262626">
			<div className="relative z-20 p-6">
				<h3 className="text-foreground text-lg font-bold">Card Spotlight</h3>
				<p className="text-muted-foreground mt-2 text-sm">
					Mouse-following radial gradient effect.
				</p>
			</div>
		</CardSpotlight>
	);
}
