// Mirrors src/lib/components/docs/examples/direction-aware-hover/BasicUsage.svelte.
import { DirectionAwareHover } from "fancy-ui-react";

export default function Scenario() {
	return (
		<DirectionAwareHover imageUrl="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80">
			<p className="text-xl font-bold">Mountain Peak</p>
			<p className="text-sm font-normal">Swiss Alps, Switzerland</p>
		</DirectionAwareHover>
	);
}
