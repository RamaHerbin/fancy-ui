// Mirrors src/lib/components/docs/DemoRenderer.svelte, slug "glare-card":
// <GlareCard> with a centred bold "Glare Card" label.
import { GlareCard } from "fancy-ui-react";

export default function Scenario() {
	return (
		<GlareCard>
			<div className="flex h-full items-center justify-center p-6">
				<p className="text-foreground text-lg font-bold">Glare Card</p>
			</div>
		</GlareCard>
	);
}
