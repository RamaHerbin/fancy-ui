// Mirrors src/lib/components/docs/examples/compare/BasicUsage.svelte.
import { Compare } from "fancy-ui-react";

export default function Scenario() {
	return (
		<div className="flex justify-center">
			<Compare
				firstImage="https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=800&q=80"
				secondImage="https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80"
				firstImageAlt="Forest in autumn"
				secondImageAlt="Mountains at sunrise"
				className="rounded-lg"
			/>
		</div>
	);
}
