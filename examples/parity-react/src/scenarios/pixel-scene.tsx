// Mirrors src/lib/components/docs/examples/pixel-scene/BasicUsage.svelte.
import { useState } from "react";
import { PixelScene } from "fancy-ui-react";

export default function Scenario() {
	// The component never changes `night`: the page owns it.
	const [night, setNight] = useState(false);

	return (
		<PixelScene
			scene="alpine"
			night={night}
			onClick={() => setNight(!night)}
			className="border-foreground/10 text-foreground h-[340px] w-full cursor-pointer rounded-2xl border"
		>
			<div className="pointer-events-none absolute top-5 left-5 max-w-[460px] pr-5 sm:top-9 sm:left-9">
				<p className="text-muted-foreground font-mono text-[11px] tracking-[0.2em] uppercase">
					Season notes · {night ? "After dark" : "Morning"}
				</p>
				<h3 className="mt-2 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
					First snow on the ridge
				</h3>
				<p className="text-muted-foreground mt-3 hidden max-w-sm text-sm leading-relaxed sm:block">
					Move across the picture to see it through the lens. Click anywhere to let the night fall.
				</p>
				<button
					type="button"
					aria-pressed={night}
					className="border-foreground/20 bg-background/70 hover:bg-background focus-visible:ring-ring pointer-events-auto mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
					onClick={(event) => {
						event.stopPropagation();
						setNight(!night);
					}}
				>
					<span
						className={`size-2 rounded-full ${night ? "bg-[#ffd15c]" : "bg-foreground/30"}`}
						aria-hidden="true"
					></span>
					Night
				</button>
			</div>
		</PixelScene>
	);
}
