// Mirrors src/lib/components/docs/examples/pixel-loader/BasicUsage.svelte.
import { PixelLoader } from "fancy-ui-react";

export default function Scenario() {
	return (
		<div className="flex w-full flex-col items-center justify-center gap-10 rounded-lg border bg-zinc-950 p-10">
			<div className="flex items-center gap-3 text-zinc-400">
				<PixelLoader />
				<span className="text-sm">Thinking…</span>
			</div>

			<PixelLoader
				cols={8}
				rows={8}
				cellSize={8}
				gap={3}
				color="#22d3ee"
				speed={2.2}
				label="Working"
			/>
		</div>
	);
}
