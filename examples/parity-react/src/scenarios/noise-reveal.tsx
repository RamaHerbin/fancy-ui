// Mirrors src/lib/components/docs/examples/noise-reveal/BasicUsage.svelte.
import { useState } from "react";
import { NoiseReveal } from "fancy-ui-react";

export default function Scenario() {
	const [revealed, setRevealed] = useState(true);

	return (
		<div className="flex w-full flex-col items-center gap-4">
			<NoiseReveal
				src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80"
				alt="Mountain peak above the clouds"
				trigger="manual"
				revealed={revealed}
				className="h-[300px] max-w-md"
			/>
			<button
				onClick={() => setRevealed(!revealed)}
				className="bg-foreground text-background rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
			>
				{revealed ? "Hide" : "Reveal"} image
			</button>
		</div>
	);
}
