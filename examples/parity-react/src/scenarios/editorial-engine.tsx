// Mirrors src/lib/components/docs/examples/editorial-engine/BasicUsage.svelte.
import { EditorialEngine } from "fancy-ui-react";

export default function Scenario() {
	return (
		<div className="w-full max-w-3xl px-4">
			<div className="h-[420px] w-full overflow-hidden rounded-lg border">
				<EditorialEngine />
			</div>
			<p className="text-muted-foreground mt-3 text-xs">
				Drag an orb — text reflows around it every frame. Click an orb to pause its drift.
			</p>
		</div>
	);
}
